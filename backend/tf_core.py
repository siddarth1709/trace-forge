"""TRACEFORGE core graph engine and safety boundary.

Provides deterministic attack-path discovery, minimum-cut containment planning,
isolated sandbox cloning, simulation of response actions, and before/after verification.

Security guarantees:
1. Production graph is strictly read-only; writes are refused via PolicyError.
2. Sandboxes use the designated prefix and are isolated from production.
3. Containment actions are simulated in disposable sandbox graphs and never executed on live systems.
4. Containment is verified only when an independent post-action path query confirms zero remaining paths.
"""
import json
import os
import re
import sqlite3
import time
import uuid
from typing import Any, Dict, List, Optional, Set, Tuple

import networkx as nx
from falkordb import FalkorDB

PROD = os.getenv("TF_GRAPH", "traceforge")
SIM_PREFIX = "tf-sim-"
NAME_KEY = os.getenv("TF_NAME_KEY", "name")
MAX_HOPS = int(os.getenv("TF_MAX_HOPS", "8"))
MAX_SIMS = int(os.getenv("TF_MAX_SIMS", "20"))
BIG = 10**7

NAME_RE = re.compile(r"^[A-Za-z0-9 ._:-]{1,64}$")
IDENT_RE = re.compile(r"^[A-Za-z_][A-Za-z0-9_]{0,40}$")
AUDIT_DB = os.path.join(os.path.dirname(os.path.abspath(__file__)), "audit.db")

if not IDENT_RE.match(NAME_KEY):
    raise SystemExit(f"TF_NAME_KEY is not a valid property name: {NAME_KEY!r}")

ATTACK_RELS = [
    r.strip()
    for r in os.getenv("TF_ATTACK_RELS", "USES,AUTHENTICATES_TO,ACCESSES,REACHES").split(",")
    if IDENT_RE.match(r.strip())
]
REL_FILTER = (":" + "|".join(ATTACK_RELS)) if ATTACK_RELS else ""

def _init_db() -> FalkorDB:
    url = os.getenv("FALKOR_URL") or os.getenv("FALKORDB_URL") or os.getenv("REDIS_URL")
    if url:
        return FalkorDB.from_url(url)
    password = os.getenv("FALKOR_PASSWORD") or None
    username = os.getenv("FALKOR_USERNAME") or None
    ssl = os.getenv("FALKOR_SSL", "0").lower() in ("1", "true", "yes")
    return FalkorDB(
        host=os.getenv("FALKOR_HOST", "localhost"),
        port=int(os.getenv("FALKOR_PORT", "6379")),
        password=password,
        username=username,
        ssl=ssl,
    )

db = _init_db()


class PolicyError(Exception):
    """An action was refused by safety policy (not an infrastructure error)."""


# ---- Audit trail initialization and logging
def _audit_init():
    try:
        with sqlite3.connect(AUDIT_DB) as c:
            c.execute(
                "CREATE TABLE IF NOT EXISTS audit (ts REAL, tool TEXT, args TEXT, summary TEXT)"
            )
    except Exception:
        pass


def audit(tool: str, args: Any, summary: Any) -> None:
    try:
        with sqlite3.connect(AUDIT_DB) as c:
            c.execute(
                "INSERT INTO audit VALUES (?, ?, ?, ?)",
                (time.time(), tool, json.dumps(args, default=str), json.dumps(summary, default=str)),
            )
    except Exception:
        # Non-fatal: do not crash active investigation if audit write fails
        pass


def audit_log(limit: int = 50) -> List[Dict[str, Any]]:
    with sqlite3.connect(AUDIT_DB) as c:
        rows = c.execute(
            "SELECT ts, tool, args, summary FROM audit ORDER BY ts DESC LIMIT ?",
            (int(limit),),
        ).fetchall()
        return [
            {"ts": ts, "tool": t, "args": json.loads(a), "summary": json.loads(s)}
            for ts, t, a, s in rows
        ]


_audit_init()


# ---- Input validation and security helpers
def _name(x: Any) -> str:
    """Validate and sanitize an entity name."""
    if not isinstance(x, str) or not NAME_RE.match(x.strip()):
        raise ValueError(f"Invalid entity name: {x!r}")
    return x.strip()


def _ident(x: Any) -> str:
    """Validate a Cypher relationship type or property key."""
    if not isinstance(x, str) or not IDENT_RE.match(x.strip()):
        raise ValueError(f"Invalid Cypher identifier: {x!r}")
    return x.strip()


def _sim_only(name: Any) -> str:
    """Enforce that write operations are permitted strictly on sandbox graphs."""
    if not isinstance(name, str):
        raise PolicyError("Graph name must be a string")
    if name == PROD or name == os.getenv("TF_GRAPH", "traceforge"):
        raise PolicyError(f"Direct modification of production graph {name!r} is strictly prohibited")
    if not (name.startswith(SIM_PREFIX) and re.match(r"^[A-Za-z0-9_-]+$", name)):
        raise PolicyError(
            f"Write operations are permitted only on sandbox graphs starting with {SIM_PREFIX!r}"
        )
    return name


def _ro(graph: str, query: str, params: Optional[Dict[str, Any]] = None) -> List[Any]:
    """Execute a read-only query against FalkorDB."""
    return db.select_graph(graph).ro_query(query, params or {}).result_set


# ---- Graph inspection
def schema(graph: str = PROD) -> Dict[str, Any]:
    """Inspect labels, relationship types, and size of a graph."""
    return {
        "graph": graph,
        "name_key": NAME_KEY,
        "labels": [r[0] for r in _ro(graph, "CALL db.labels()")],
        "relationship_types": [r[0] for r in _ro(graph, "CALL db.relationshipTypes()")],
        "property_keys": [r[0] for r in _ro(graph, "CALL db.propertyKeys()")],
        "node_count": _ro(graph, "MATCH (n) RETURN count(n)")[0][0],
        "edge_count": _ro(graph, "MATCH ()-[r]->() RETURN count(r)")[0][0],
    }


def graph_view(graph: str = PROD) -> Dict[str, Any]:
    """Return nodes and edges formatted for visualizers and graph inspectors."""
    nodes = [
        {"id": i, "labels": ls, "props": n.properties}
        for i, ls, n in _ro(graph, "MATCH (n) RETURN ID(n), labels(n), n")
    ]
    edges = [
        {"src": a, "rel": rel, "dst": b, "props": r.properties}
        for a, rel, b, r in _ro(graph, "MATCH (a)-[r]->(b) RETURN ID(a), type(r), ID(b), r")
    ]
    return {"graph": graph, "nodes": nodes, "edges": edges}


# ---- Attack path discovery
def find_paths(sources: List[str], target: str, graph: str = PROD) -> Dict[str, Any]:
    """Find all time-ordered attack paths from any source entity to target asset."""
    if not sources:
        return {"graph": graph, "count": 0, "paths": []}

    cleaned_sources = [_name(s) for s in sources]
    cleaned_target = _name(target)

    if cleaned_target in cleaned_sources:
        return {"graph": graph, "count": 0, "paths": []}

    k = NAME_KEY
    q = (
        f"MATCH p=(s)-[{REL_FILTER}*1..{MAX_HOPS}]->(t) "
        f"WHERE s.{k} IN $sources AND t.{k} = $target "
        f"RETURN [n IN nodes(p) | n.{k}], [r IN relationships(p) | type(r)]"
    )
    rows = _ro(graph, q, {"sources": cleaned_sources, "target": cleaned_target})

    # Deduplicate while preserving order
    seen = set()
    paths = []
    for n, r in rows:
        key = (tuple(n), tuple(r))
        if key not in seen:
            seen.add(key)
            paths.append({"nodes": n, "rels": r})

    return {"graph": graph, "count": len(paths), "paths": paths}


# ---- Edge mapping and minimum-cut containment planning
def _edge_map(graph: str) -> Dict[Tuple[str, str], List[Tuple[str, int]]]:
    k = NAME_KEY
    edges: Dict[Tuple[str, str], List[Tuple[str, int]]] = {}
    q = f"MATCH (a)-[r{REL_FILTER}]->(b) RETURN a.{k}, type(r), b.{k}, coalesce(r.benign_load, 0)"
    for a, rel, b, load in _ro(graph, q):
        if a and b:
            edges.setdefault((str(a), str(b)), []).append((str(rel), min(int(load), 999)))
    return edges


def min_cut(sources: List[str], target: str, graph: str = PROD) -> Dict[str, Any]:
    """Calculate a minimum-cut containment plan separating sources from target.

    Objective:
      1. Minimum number of relationship cuts (primary).
      2. Minimum benign load disruption (secondary).
      3. Closer to source footholds (tertiary tie-breaker).
    """
    if not sources:
        raise ValueError("At least one source entity is required")
    if not target or not isinstance(target, str):
        raise ValueError("A target asset is required")

    cleaned_sources = list(dict.fromkeys(_name(s) for s in sources))
    cleaned_target = _name(target)

    if cleaned_target in cleaned_sources:
        raise PolicyError("Target asset cannot be one of the source entities")

    edges = _edge_map(graph)
    live = [s for s in cleaned_sources if any(a == s for a, _ in edges)]

    if not live or cleaned_target not in {b for _, b in edges}:
        result = {"size": 0, "disruption": 0, "cut": []}
        audit("min_cut", {"sources": sources, "target": target, "graph": graph}, result)
        return result

    topo = nx.DiGraph(list(edges.keys()))
    depth: Dict[str, int] = {}
    for s in live:
        if s in topo:
            for n, d in nx.single_source_shortest_path_length(topo, s).items():
                depth[n] = min(depth.get(n, d), d)

    G = nx.DiGraph()
    for (a, b), items in edges.items():
        # BIG dominates cut size; load * 100 minimizes disruption; depth breaks ties near source
        cap = sum(BIG + load * 100 + depth.get(a, 0) for _, load in items)
        G.add_edge(a, b, capacity=cap)

    if cleaned_target not in G:
        result = {"size": 0, "disruption": 0, "cut": []}
        audit("min_cut", {"sources": sources, "target": target, "graph": graph}, result)
        return result

    for s in live:
        if s in G:
            G.add_edge("__SRC__", s, capacity=BIG * 1000)

    try:
        _, (reach, rest) = nx.minimum_cut(G, "__SRC__", cleaned_target)
    except nx.NetworkXUnbounded:
        raise PolicyError("Unable to compute cut: source connects directly with unbounded capacity")

    cut = [
        {
            "type": "remove_edge",
            "src": a,
            "dst": b,
            "rel": rel,
            "benign_load": load,
        }
        for (a, b), items in edges.items()
        if a in reach and b in rest
        for rel, load in items
    ]

    # Validate that proposed cut actually breaks connectivity in NetworkX
    H = G.copy()
    for c in cut:
        if H.has_edge(c["src"], c["dst"]):
            H.remove_edge(c["src"], c["dst"])

    still_connected = any(
        nx.has_path(H, s, cleaned_target) for s in live if s in H and cleaned_target in H
    )
    if still_connected:
        raise PolicyError("Calculated cut failed to fully disconnect sources from target")

    result = {
        "size": len(cut),
        "disruption": sum(c["benign_load"] for c in cut),
        "cut": cut,
    }
    audit("min_cut", {"sources": sources, "target": target, "graph": graph}, result)
    return result


# ---- Sandbox Graph Cloning
def _clone(src: str, dst: str) -> str:
    """Clone source graph into an isolated sandbox graph.

    Fails safely if cloning cannot be completed, ensuring production is never written to.
    """
    _sim_only(dst)

    existing = db.list_graphs()
    if src not in existing:
        raise LookupError(f"Source graph {src!r} does not exist in FalkorDB")

    src_node_count = _ro(src, "MATCH (n) RETURN count(n)")[0][0]
    if src_node_count == 0:
        raise RuntimeError(f"Source graph {src!r} has 0 nodes; refusing to clone empty graph")

    # If destination already exists, delete it first to ensure clean state
    if dst in existing:
        try:
            db.select_graph(dst).delete()
        except Exception:
            pass

    method = "manual"
    try:
        db.connection.execute_command("GRAPH.COPY", src, dst)
        method = "GRAPH.COPY"
    except Exception:
        # Fallback to deterministic manual node-and-edge copy
        g = db.select_graph(dst)
        idmap = {}
        for nid, labels, node in _ro(src, "MATCH (n) RETURN ID(n), labels(n), n"):
            valid_labels = [l for l in labels if IDENT_RE.match(l)]
            label_str = ":" + ":".join(valid_labels) if valid_labels else ""
            res = g.query(
                f"CREATE (x{label_str}) SET x = $p RETURN ID(x)",
                {"p": node.properties},
            )
            idmap[nid] = res.result_set[0][0]

        for a, rel, b, edge in _ro(src, "MATCH (a)-[r]->(b) RETURN ID(a), type(r), ID(b), r"):
            if IDENT_RE.match(rel) and a in idmap and b in idmap:
                g.query(
                    f"MATCH (x),(y) WHERE ID(x) = $a AND ID(y) = $b CREATE (x)-[r:{rel}]->(y) SET r = $p",
                    {"a": idmap[a], "b": idmap[b], "p": edge.properties},
                )

    # Integrity verification of cloned sandbox
    dst_nodes = _ro(dst, "MATCH (n) RETURN count(n)")[0][0]
    if dst_nodes != src_node_count:
        try:
            db.select_graph(dst).delete()
        except Exception:
            pass
        raise RuntimeError(
            f"Graph cloning integrity check failed: source has {src_node_count} nodes, "
            f"clone has {dst_nodes} nodes"
        )

    return method


# ---- Sandbox deletion
def drop_sim(sim_id: str) -> Dict[str, Any]:
    """Delete an isolated sandbox graph. Fails if target is not a sandbox."""
    sim_name = _sim_only(sim_id)
    if sim_name not in db.list_graphs():
        raise LookupError(f"sandbox graph does not exist: {sim_id}")

    db.select_graph(sim_name).delete()
    audit("drop_sim", {"sim_id": sim_id}, {"dropped": True})
    return {"dropped": sim_id}


# ---- Simulated containment execution
def simulate(
    actions: List[Dict[str, Any]],
    sources: List[str],
    target: str,
    graph: Optional[str] = None,
) -> Dict[str, Any]:
    """Simulate proposed containment actions in a fresh, isolated sandbox graph.

    Preconditions:
      - Actions must be non-empty.
      - At least one attack path must currently exist in the source graph.
      - Every proposed action must target an edge or node on an active attack path.
    """
    if not actions:
        raise PolicyError("Simulation requires at least one containment action")

    src_graph = graph or PROD
    paths_data = find_paths(sources, target, graph=src_graph)
    paths = paths_data["paths"]

    if not paths:
        raise PolicyError("No active attack paths found to contain in source graph")

    on_nodes: Set[str] = {n for p in paths for n in p["nodes"]}
    on_edges: Set[Tuple[str, str]] = {
        (p["nodes"][i], p["nodes"][i + 1])
        for p in paths
        for i in range(len(p["nodes"]) - 1)
    }

    # Validate all actions against active attack paths before touching any graph
    for a in actions:
        if not isinstance(a, dict):
            raise PolicyError(f"Invalid action payload: expected dict, got {type(a).__name__}")
        kind = a.get("type")
        if kind == "remove_edge":
            src = _name(a.get("src"))
            dst = _name(a.get("dst"))
            rel = a.get("rel")
            if rel is not None and (
                not isinstance(rel, str) or rel not in ATTACK_RELS
            ):
                raise PolicyError(
                    f"Relationship type must be one of ATTACK_RELS: {ATTACK_RELS}"
                )
            if (src, dst) not in on_edges:
                raise PolicyError(
                    f"Precondition failed: {src} -> {dst} is not on a current attack path"
                )
        elif kind == "isolate_node":
            node = _name(a.get("node"))
            if node not in on_nodes:
                raise PolicyError(
                    f"Precondition failed: {node} is not on a current attack path"
                )
        else:
            raise PolicyError(f"Unknown containment action type: {kind!r}")

    # Enforce maximum concurrent sandbox limit
    existing_sandboxes = [n for n in db.list_graphs() if n.startswith(SIM_PREFIX)]
    if len(existing_sandboxes) >= MAX_SIMS:
        raise PolicyError(
            f"Sandbox limit exceeded ({len(existing_sandboxes)}/{MAX_SIMS}). Delete older sandboxes first."
        )

    sim = SIM_PREFIX + uuid.uuid4().hex[:8]
    method = _clone(src_graph, sim)
    g = db.select_graph(_sim_only(sim))
    k = NAME_KEY

    # Apply actions exclusively inside sandbox graph
    for a in actions:
        if a["type"] == "remove_edge":
            src = a["src"]
            dst = a["dst"]
            rel = a.get("rel")
            if rel and IDENT_RE.match(rel):
                g.query(
                    f"MATCH (a {{{k}:$s}})-[r:{rel}]->(b {{{k}:$d}}) DELETE r",
                    {"s": src, "d": dst},
                )
            else:
                # Protect non-attack edges: delete only attack relationships
                g.query(
                    f"MATCH (a {{{k}:$s}})-[r{REL_FILTER}]->(b {{{k}:$d}}) DELETE r",
                    {"s": src, "d": dst},
                )

            # Confirm relationship was deleted
            remaining = _ro(
                sim,
                f"MATCH (a {{{k}:$s}})-[r{REL_FILTER}]->(b {{{k}:$d}}) RETURN count(r)",
                {"s": src, "d": dst},
            )[0][0]
            if remaining > 0:
                raise PolicyError(f"Failed to remove relationship: {src} -> {dst}")

        elif a["type"] == "isolate_node":
            node = a["node"]
            g.query(f"MATCH (n {{{k}:$n}}) DETACH DELETE n", {"n": node})
            remaining = _ro(sim, f"MATCH (n {{{k}:$n}}) RETURN count(n)", {"n": node})[0][0]
            if remaining > 0:
                raise PolicyError(f"Failed to isolate node: {node}")

    result = {
        "sim_id": sim,
        "src_graph": src_graph,
        "clone_method": method,
        "applied": len(actions),
        "actions": actions,
        "status": "simulated_unverified",
        "simulation_scope": "sandbox_only",
        "note": "Containment simulated in an isolated sandbox graph. Production was not modified.",
    }
    audit("simulate", {"actions": actions, "sources": sources, "target": target}, result)
    return result


# ---- Verification
def verify(
    sim_id: str,
    sources: List[str],
    target: str,
    src_graph: Optional[str] = None,
) -> Dict[str, Any]:
    """Verify whether simulated containment eliminated all relevant attack paths.

    Never equates a proposed action with successful containment.
    Requires an independent graph query on the sandbox confirming 0 paths remain.
    """
    sim_name = _sim_only(sim_id)
    if sim_name not in db.list_graphs():
        raise LookupError(f"sandbox graph does not exist: {sim_id}")

    origin = src_graph or PROD
    before = find_paths(sources, target, graph=origin)
    after = find_paths(sources, target, graph=sim_name)

    # Initial state must have had active paths for containment to be credited
    if before["count"] == 0:
        contained = False
        verdict = "no_paths_initial"
    elif after["count"] == 0:
        contained = True
        verdict = "eliminated"
    else:
        contained = False
        verdict = "residual_risk"

    result = {
        "sim_id": sim_id,
        "src_graph": origin,
        "before": before["count"],
        "after": after["count"],
        "contained": contained,
        "remaining_paths": after["paths"],
        "verdict": verdict,
        "simulation_scope": "sandbox_only",
        "note": (
            "Verification performed in isolated sandbox graph. "
            "Real-world credentials and infrastructure were not modified."
        ),
    }
    audit(
        "verify",
        {"sim_id": sim_id, "sources": sources, "target": target},
        {k: v for k, v in result.items() if k != "remaining_paths"},
    )
    return result

# ---- Attack-pattern mutation lab (sandbox only)
def mutate_pattern(
    mutation_src: str,
    mutation_rel: str,
    mutation_dst: str,
    sources: List[str],
    target: str,
    graph: Optional[str] = None,
) -> Dict[str, Any]:
    """Add a hypothetical attack relationship in an isolated sandbox and compare paths."""
    src = _name(mutation_src)
    dst = _name(mutation_dst)
    sources = [_name(s) for s in sources]
    target = _name(target)

    if not isinstance(mutation_rel, str) or not IDENT_RE.fullmatch(mutation_rel):
        raise PolicyError(
            f"Relationship type must be one of the allowed attack types: {ATTACK_RELS}"
        )

    if mutation_rel not in ATTACK_RELS:
        raise PolicyError(
            f"Relationship type must be one of the allowed attack types: {ATTACK_RELS}"
        )

    src_graph = graph or PROD

    if not isinstance(src_graph, str):
        raise PolicyError("Source graph name must be a string")

    if src_graph.startswith(SIM_PREFIX):
        raise PolicyError("Mutation source must not be an existing simulation sandbox")

    # Confirm both nodes exist in the source graph before cloning.
    k = NAME_KEY

    for node_name in (src, dst):
        rows = _ro(
            src_graph,
            f"MATCH (n {{{k}:$name}}) RETURN count(n)",
            {"name": node_name},
        )

        if not rows or rows[0][0] == 0:
            raise LookupError(
                f"Node {node_name!r} does not exist in graph {src_graph!r}"
            )

    # Refuse duplicate mutation of an already-existing relationship.
    rows = _ro(
        src_graph,
        f"MATCH (a {{{k}:$src}})-[r:{mutation_rel}]->(b {{{k}:$dst}}) "
        "RETURN count(r)",
        {"src": src, "dst": dst},
    )

    if rows and rows[0][0]:
        raise PolicyError(
            f"Relationship {src!r} -[{mutation_rel}]-> {dst!r} already exists"
        )

    # Calculate the baseline before creating any sandbox.
    baseline = find_paths(sources, target, graph=src_graph)

    # Enforce the concurrent sandbox limit.
    existing_sandboxes = [
        name for name in db.list_graphs()
        if name.startswith(SIM_PREFIX)
    ]

    if len(existing_sandboxes) >= MAX_SIMS:
        raise PolicyError(
            f"Sandbox limit exceeded ({len(existing_sandboxes)}/{MAX_SIMS}). "
            "Delete older sandboxes first."
        )

    sim = SIM_PREFIX + uuid.uuid4().hex[:8]

    # If cloning itself fails, _clone() remains responsible for its own
    # integrity checks. Cleanup below covers operations after successful clone.
    method = _clone(src_graph, sim)

    try:
        # Revalidate the sandbox name immediately before writing.
        sandbox = _sim_only(sim)
        sandbox_graph = db.select_graph(sandbox)

        # Create the hypothetical relationship only in the sandbox.
        sandbox_graph.query(
            f"MATCH (a {{{k}:$src}}), (b {{{k}:$dst}}) "
            f"CREATE (a)-[r:{mutation_rel}]->(b)",
            {"src": src, "dst": dst},
        )

        # Verify that the new relationship exists in the sandbox.
        rows = _ro(
            sandbox,
            f"MATCH (a {{{k}:$src}})-[r:{mutation_rel}]->(b {{{k}:$dst}}) "
            "RETURN count(r)",
            {"src": src, "dst": dst},
        )

        if not rows or rows[0][0] == 0:
            raise RuntimeError(
                "Mutation verification failed in sandbox"
            )

        # Recompute paths against the mutated sandbox.
        mutated = find_paths(sources, target, graph=sandbox)

        def path_key(
            path: Dict[str, Any],
        ) -> Tuple[Tuple[str, ...], Tuple[str, ...]]:
            return (
                tuple(path.get("nodes", [])),
                tuple(path.get("rels", [])),
            )

        baseline_keys = {
            path_key(path)
            for path in baseline.get("paths", [])
        }

        new_paths = [
            path
            for path in mutated.get("paths", [])
            if path_key(path) not in baseline_keys
        ]

        result = {
            "analysis": "attack_pattern_mutation",
            "sim_id": sim,
            "src_graph": src_graph,
            "clone_method": method,
            "mutation": {
                "src": src,
                "rel": mutation_rel,
                "dst": dst,
            },
            "baseline_count": baseline.get("count", 0),
            "mutated_count": mutated.get("count", 0),
            "new_path_count": len(new_paths),
            "new_paths": new_paths,
            "baseline_paths": baseline.get("paths", []),
            "mutated_paths": mutated.get("paths", []),
            "simulation_scope": "sandbox_only",
            "production_modified": False,
            "limitations": [
                "This is a graph-based hypothetical analysis, not proof of a real attack.",
                "Results depend on the accuracy and completeness of the source graph.",
                "The sandbox is retained for inspection and counts toward the sandbox limit.",
            ],
        }

        audit(
            "mutate_pattern",
            {
                "mutation": result["mutation"],
                "sources": sources,
                "target": target,
                "src_graph": src_graph,
            },
            {
                "sim_id": sim,
                "new_path_count": len(new_paths),
                "production_modified": False,
            },
        )

        return result

    except Exception as original_error:
        # Delete only the sandbox created by this invocation.
        # Never attempt cleanup against the source graph.
        try:
            cleanup_graph = _sim_only(sim)

            if cleanup_graph in db.list_graphs():
                db.select_graph(cleanup_graph).delete()

        except Exception as cleanup_error:
            warning = (
                f"Sandbox cleanup failed for {sim!r}; "
                f"the sandbox may still exist. "
                f"Cleanup error: {cleanup_error!r}"
            )

            # Preserve the original exception rather than masking the
            # mutation/verification failure with a cleanup failure.
            if hasattr(original_error, "add_note"):
                original_error.add_note(warning)

        raise