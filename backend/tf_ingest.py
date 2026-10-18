"""TRACEFORGE Data Ingestion & Connection Autoreader Engine.

Ingests real-world security data files (JSON, CSV, NDJSON, threat reports) into FalkorDB.
Autoreads natural language or structured connection descriptions to determine canonical
relationship verbs (AUTHENTICATES_TO, USES, ACCESSES, REACHES) and extracts telemetry
metadata (timestamps, benign load, evidence IDs, ports, protocols).
"""
import csv
import io
import json
import logging
import os
import re
import time
from typing import Any, Dict, List, Optional, Tuple, Union

from falkordb import FalkorDB
import tf_core as core

logger = logging.getLogger("traceforge.ingest")

NAME_KEY = core.NAME_KEY
NAME_RE = core.NAME_RE
IDENT_RE = core.IDENT_RE

# Canonical attack relationships recognized by FalkorDB graph engine
CANONICAL_RELS = {"USES", "AUTHENTICATES_TO", "ACCESSES", "REACHES"}


def sanitize_name(name: str) -> str:
    """Sanitize entity name to conform strictly with core.NAME_RE (^[A-Za-z0-9 ._:-]{1,64}$)."""
    if not isinstance(name, str):
        return ""
    cleaned = re.sub(r"[^A-Za-z0-9 ._:-]", "-", name).strip(" -")
    cleaned = re.sub(r"-+", "-", cleaned)
    return cleaned[:64].strip()


def infer_endpoint_type(name: str) -> Tuple[str, str]:
    """Infer graph label and type attribute from endpoint name heuristics."""
    n = name.lower()
    if re.search(r"(workstation|laptop|pc|desktop|endpoint|foothold|client|dev-laptop|host)", n):
        return "Workstation", "workstation"
    if re.search(r"(credential|cred|hash|password|secret|token|key|ticket|ntlm|kerberos)", n):
        return "Credential", "credential"
    if re.search(r"(service.?account|svc|admin.?account|user|identity|role)", n):
        return "Account", "service_account"
    if re.search(r"(database|db|sql|postgres|mysql|oracle|aurora|redis|mongo)", n):
        return "Server", "database"
    if re.search(r"(server|srv|dc|controller|gateway|bastion|proxy|api|router|firewall|cluster)", n):
        return "Server", "server"
    if re.search(r"(cve|vuln|exploit|bug)", n):
        return "Vulnerability", "vulnerability"
    if re.search(r"(alert|incident|detection)", n):
        return "Alert", "alert"
    return "Asset", "asset"


def autoread_connection(
    description: str,
    explicit_rel: Optional[str] = None,
    default_load: int = 0,
) -> Tuple[str, Dict[str, Any]]:
    """Autoread a connection description string into a canonical relationship verb and metadata.

    Analyzes descriptive security phrases such as:
    - "Pass-the-hash authentication to Active Directory Domain Controller" -> AUTHENTICATES_TO
    - "LSASS memory dump extracted domain admin credential" -> USES
    - "Accessed SQL database port 1433 via RPC" -> ACCESSES (port=1433)
    - "Compromised VPN session routed inbound to Finance laptop" -> REACHES
    """
    props: Dict[str, Any] = {
        "kind": "observed",
        "confidence": 0.95,
        "source": "ingested_file",
        "description": description.strip(),
    }

    # Extract port if present (e.g. "port 445", ":3389", "port 1433")
    port_match = re.search(r"(?:port\s+|:)(\d{2,5})\b", description, re.IGNORECASE)
    if port_match:
        try:
            props["port"] = int(port_match.group(1))
        except ValueError:
            pass

    # Extract protocol if present
    proto_match = re.search(r"\b(ssh|rdp|smb|rpc|kerberos|ntlm|http|https|tgs|tms|tls)\b", description, re.IGNORECASE)
    if proto_match:
        props["protocol"] = proto_match.group(1).upper()

    # Extract load if present in text (e.g. "load: 12", "load=8")
    load_match = re.search(r"\bload[=:\s]+(\d+)\b", description, re.IGNORECASE)
    if load_match:
        props["benign_load"] = int(load_match.group(1))
    else:
        props["benign_load"] = default_load

    # Extract evidence ID if present (e.g. "EV-1", "EV-AWS-01", "ALERT-12")
    ev_match = re.search(r"\b(EV-[A-Za-z0-9_-]+|ALERT-[A-Za-z0-9_-]+)\b", description)
    if ev_match:
        props["evidence_id"] = ev_match.group(1)

    # If an explicit valid Cypher relationship is provided, respect it
    if explicit_rel and explicit_rel.upper() in CANONICAL_RELS:
        return explicit_rel.upper(), props

    desc_lower = description.lower()

    # 1. Credential use / dumping / stealing
    if any(k in desc_lower for k in [
        "uses", "used", "using", "dump", "mimikatz", "extract", "stole",
        "harvest", "cached credential", "credential use", "stolen token"
    ]):
        return "USES", props

    # 2. Authentication / logon / sign-in
    if any(k in desc_lower for k in [
        "auth", "login", "logon", "sign in", "signed in", "sign-in", "signing in",
        "kerberos", "tgs", "tgt", "credential auth", "ntlm", "token auth",
        "ssh session", "rdp session", "pass-the-hash", "session established"
    ]):
        return "AUTHENTICATES_TO", props

    # 3. Accessing services, databases, shares, files, queries
    if any(k in desc_lower for k in [
        "access", "database", "query", "sql", "smb", "rpc", "port", "share",
        "file session", "mount", "read file", "table", "data session", "opened session"
    ]):
        return "ACCESSES", props

    # 4. Network reachability, routing, beacons, scans
    if any(k in desc_lower for k in [
        "reach", "connect", "network", "traffic", "beacon", "ping", "scan",
        "inbound", "outbound", "routed", "vpn", "tunnel", "ingress", "egress"
    ]):
        return "REACHES", props

    # Default fallback
    return "REACHES", props


def parse_data_content(
    raw_content: Union[str, bytes, dict, list],
    format_hint: str = "auto",
) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
    """Parse raw file content (JSON or CSV) into structured endpoints (nodes) and connections (edges).

    Connection descriptions are automatically parsed and mapped into canonical relationships.
    """
    text = raw_content.decode("utf-8", errors="replace") if isinstance(raw_content, bytes) else str(raw_content)

    nodes_dict: Dict[str, Dict[str, Any]] = {}
    edges_list: List[Dict[str, Any]] = []

    # Determine format
    is_json = False
    if isinstance(raw_content, (dict, list)):
        is_json = True
    elif format_hint == "json" or text.strip().startswith(("{", "[")):
        is_json = True

    if is_json:
        data = raw_content if isinstance(raw_content, (dict, list)) else json.loads(text)

        # Structure A: Standard Graph Object with 'nodes' and 'edges'
        if isinstance(data, dict):
            raw_nodes = data.get("nodes", [])
            raw_edges = data.get("edges", []) or data.get("connections", [])

            for n in raw_nodes:
                if isinstance(n, dict):
                    name = str(n.get("name") or n.get("id") or "").strip()
                    if name:
                        label, inferred_type = infer_endpoint_type(name)
                        node_label = n.get("label") or n.get("labels") or label
                        if isinstance(node_label, list):
                            node_label = node_label[0] if node_label else label
                        nodes_dict[name] = {
                            "name": name,
                            "label": str(node_label),
                            "type": n.get("type", inferred_type),
                            "criticality": n.get("criticality", "medium"),
                            **{k: v for k, v in n.items() if k not in ("name", "label", "labels")},
                        }

            for e in raw_edges:
                if isinstance(e, dict):
                    src = str(e.get("src") or e.get("source") or "").strip()
                    dst = str(e.get("dst") or e.get("target") or e.get("destination") or "").strip()
                    desc = str(e.get("description") or e.get("connection_description") or e.get("details") or e.get("summary") or "").strip()
                    explicit_rel = e.get("rel") or e.get("relationship") or e.get("type")
                    load = int(e.get("load") or e.get("benign_load") or 0)

                    if src and dst:
                        if not desc:
                            desc = f"{src} {explicit_rel or 'connects to'} {dst}"
                        rel, props = autoread_connection(desc, explicit_rel, default_load=load)
                        if "observed_at" not in props:
                            props["observed_at"] = e.get("observed_at") or e.get("timestamp") or int(time.time())
                        if e.get("evidence_id"):
                            props["evidence_id"] = e.get("evidence_id")

                        edges_list.append({
                            "src": src,
                            "dst": dst,
                            "rel": rel,
                            "description": desc,
                            "props": props,
                        })

                        # Auto-register endpoints if not already in nodes_dict
                        if src not in nodes_dict:
                            lbl, typ = infer_endpoint_type(src)
                            nodes_dict[src] = {"name": src, "label": lbl, "type": typ}
                        if dst not in nodes_dict:
                            lbl, typ = infer_endpoint_type(dst)
                            nodes_dict[dst] = {"name": dst, "label": lbl, "type": typ}

        # Structure B: Flat list of connection records / events
        elif isinstance(data, list):
            for item in data:
                if isinstance(item, dict):
                    src = str(item.get("source") or item.get("src") or item.get("source_asset") or "").strip()
                    dst = str(item.get("target") or item.get("dst") or item.get("target_asset") or item.get("destination") or "").strip()
                    desc = str(item.get("description") or item.get("connection_description") or item.get("activity") or item.get("details") or "").strip()
                    explicit_rel = item.get("rel") or item.get("relationship")
                    load = int(item.get("load") or item.get("benign_load") or 0)

                    if src and dst:
                        if not desc:
                            desc = f"{src} connected to {dst}"
                        rel, props = autoread_connection(desc, explicit_rel, default_load=load)
                        props["observed_at"] = item.get("observed_at") or item.get("timestamp") or int(time.time())
                        if item.get("evidence_id"):
                            props["evidence_id"] = item.get("evidence_id")

                        edges_list.append({
                            "src": src,
                            "dst": dst,
                            "rel": rel,
                            "description": desc,
                            "props": props,
                        })

                        if src not in nodes_dict:
                            lbl, typ = infer_endpoint_type(src)
                            nodes_dict[src] = {"name": src, "label": lbl, "type": typ}
                        if dst not in nodes_dict:
                            lbl, typ = infer_endpoint_type(dst)
                            nodes_dict[dst] = {"name": dst, "label": lbl, "type": typ}

    else:
        # CSV parsing
        reader = csv.DictReader(io.StringIO(text))
        for row in reader:
            # Find source and destination keys flexibly (supports network telemetry and KEV catalogs)
            src = ""
            dst = ""
            desc = ""
            explicit_rel = ""
            load = 0
            ev_id = None
            vendor = ""
            product = ""

            for k, v in row.items():
                if not k or not v:
                    continue
                k_norm = k.strip().lower().replace("_", "").replace("-", "")
                val = v.strip()
                if k_norm in ("src", "source", "sourceasset", "from", "origin"):
                    src = val
                elif k_norm in ("cveid", "cve", "vulnerabilityid", "vulnerability", "vulnid"):
                    src = val
                elif k_norm in ("dst", "target", "destination", "targetasset", "to"):
                    dst = val
                elif k_norm in ("product", "affectedproduct"):
                    product = val
                elif k_norm in ("vendorproject", "vendor", "project"):
                    vendor = val
                elif k_norm in ("description", "connectiondescription", "shortdescription", "details", "summary", "activity", "action", "vulnerabilityname"):
                    if not desc or k_norm == "shortdescription":
                        desc = val
                elif k_norm in ("rel", "relationship", "type"):
                    explicit_rel = val
                elif k_norm in ("load", "benignload", "trafficload"):
                    try:
                        load = int(val)
                    except ValueError:
                        pass
                elif k_norm in ("evidence", "evidenceid", "ev"):
                    ev_id = val

            # If this is a vulnerability catalog row (e.g. CISA KEV) with product/vendor
            if not dst and (product or vendor):
                if product and product.lower() not in ("multiple products", "various"):
                    dst = f"{vendor} {product}".strip() if vendor else product
                else:
                    dst = vendor or product

            if src:
                src = sanitize_name(src)
            if dst:
                dst = sanitize_name(dst)

            if src and dst:
                if not desc:
                    desc = f"{src} {explicit_rel or 'connects to'} {dst}"
                rel, props = autoread_connection(desc, explicit_rel, default_load=load)
                props["observed_at"] = int(time.time())
                if ev_id:
                    props["evidence_id"] = ev_id

                edges_list.append({
                    "src": src,
                    "dst": dst,
                    "rel": rel,
                    "description": desc,
                    "props": props,
                })

                if src not in nodes_dict:
                    lbl, typ = infer_endpoint_type(src)
                    node_entry = {"name": src, "label": lbl, "type": typ}
                    if typ == "vulnerability" or src.upper().startswith("CVE-"):
                        node_entry["kev"] = True
                    nodes_dict[src] = node_entry
                if dst not in nodes_dict:
                    lbl, typ = infer_endpoint_type(dst)
                    nodes_dict[dst] = {"name": dst, "label": lbl, "type": typ}

    return list(nodes_dict.values()), edges_list


def ingest_into_falkordb(
    graph_name: str,
    nodes: List[Dict[str, Any]],
    edges: List[Dict[str, Any]],
    replace: bool = False,
) -> Dict[str, Any]:
    """Ingest parsed endpoints and connection edges directly into the target FalkorDB graph.

    - Validates names and identifiers.
    - If replace is True, clears existing graph data before inserting.
    - Uses Cypher MERGE to prevent duplicate nodes.
    - Connects endpoints with the autoread relationship verbs and properties.
    - Records an immutable audit log entry.
    """
    if not graph_name or not re.match(r"^[A-Za-z0-9_-]+$", graph_name):
        raise ValueError(f"Invalid graph identifier: {graph_name!r}")

    if graph_name == core.PROD:
        core._sim_only(graph_name)

    if replace:
        core._sim_only(graph_name)

    # Validate all node identifiers ahead of database access / deletion
    for node in nodes:
        name = str(node.get("name", "")).strip()
        core._name(name)

    # Validate all edge endpoints and relationship types ahead of database access / deletion
    for edge in edges:
        src = str(edge.get("src", "")).strip()
        dst = str(edge.get("dst", "")).strip()
        core._name(src)
        core._name(dst)
        rel = str(edge.get("rel", "REACHES")).strip().upper()
        if rel not in CANONICAL_RELS:
            raise ValueError(f"Unsupported relationship type: {rel!r}")

    g = core.db.select_graph(graph_name)

    if replace:
        try:
            g.delete()
        except Exception:
            pass
        g = core.db.select_graph(graph_name)

    endpoints_added = 0
    connections_added = 0

    # 1. Ingest Nodes (Endpoints)
    for node in nodes:
        name = str(node.get("name", "")).strip()
        label = str(node.get("label", "Asset")).strip()
        if not core.IDENT_RE.match(label):
            label = "Asset"

        props = {
            "name": name,
            "type": node.get("type", "asset"),
            "source": "ingested_file",
        }
        if "criticality" in node:
            props["criticality"] = node["criticality"]

        # Cypher MERGE node
        q = f"MERGE (n:{label} {{{NAME_KEY}: $name}}) SET n += $props"
        g.query(q, {"name": name, "props": props})
        endpoints_added += 1

    # 2. Ingest Edges (Autoread Connections)
    for edge in edges:
        src = str(edge.get("src", "")).strip()
        dst = str(edge.get("dst", "")).strip()
        rel = str(edge.get("rel", "REACHES")).strip().upper()

        edge_props = edge.get("props", {})
        if "description" not in edge_props and edge.get("description"):
            edge_props["description"] = edge.get("description")

        # Cypher MATCH endpoints and MERGE relationship
        q = (
            f"MATCH (a {{{NAME_KEY}: $src}}), (b {{{NAME_KEY}: $dst}}) "
            f"MERGE (a)-[r:{rel}]->(b) "
            f"SET r += $props"
        )
        g.query(q, {"src": src, "dst": dst, "props": edge_props})
        connections_added += 1

    # 3. Audit trail
    core.audit(
        "ingest_data_file",
        {
            "graph": graph_name,
            "endpoints_count": endpoints_added,
            "connections_count": connections_added,
            "replace": replace,
        },
        {"status": "ok", "endpoints": endpoints_added, "connections": connections_added},
    )

    return {
        "status": "ok",
        "graph": graph_name,
        "endpoints_added": endpoints_added,
        "connections_added": connections_added,
        "nodes": nodes,
        "connections": edges,
        "message": (
            f"Successfully ingested {endpoints_added} endpoints and {connections_added} "
            f"autoread connections into graph '{graph_name}'."
        ),
    }
