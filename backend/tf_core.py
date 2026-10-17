import json
import os
import re
import sqlite3
import time
import uuid

import networkx as nx 
from falkordb import FalkorDB

PROD = os.getenv("TF_GRAPH", "traceforge")
SIM_PREFIX = "tf-sim-"
NAME_KEY = os.getenv("TF_NAME_KEY", "name")
MAX_HOPS = 8
MAX_SIMS = 20

NAME_RE = re.compile(r"^[A-Za-z0-9 ._:-]{1,64}$")
IDENT_RE = re.compile(r"^[A-Za-z_][A-Za-z0-9_]{0,40}$")
AUDIT_DB = os.path.join(os.path.dirname(os.path.abspath(__file__)), "audit.db")

if not IDENT_RE.match(NAME_KEY):
    raise SystemExit(f"TF_NAME is not a valid property name: {NAME_KEY!r}")

BIG = 10**7
ATTACK_RELS = [r.strip() for r in os.getenv("TF_ATTACK_RELS", "USES,AUTHENTICATES_TO,ACCESSES").split(",")
               if IDENT_RE.match(r.strip())]
REL_FILTER = (":" + "|".join(ATTACK_RELS)) if ATTACK_RELS else ""

db = FalkorDB(host = os.getenv("FALKOR_HOST", "localhost"), port = int(os.getenv("FALKOR_PORT", "6379")))

class PolicyError(Exception):
    """An action was refused by policy (not an infrastructure error)."""

def _audit_init():
    with sqlite3.connect(AUDIT_DB) as c:
        c.execute("CREATE TABLE IF NOT EXISTS audit (ts REAL, tool TEXT, args TEXT, summary TEXT)")

def audit(tool, args, summary):
    with sqlite3.connect(AUDIT_DB) as c:
        c.execute("INSERT INTO audit VALUES (?, ?, ?, ?)", (time.time(), tool, json.dumps(args, default=str), json.dumps(summary, default=str)))


def audit_log(limit = 50):
    with sqlite3.connect(AUDIT_DB) as c:
        rows = c.execute("SELECT ts, tool, args, summary FROM audit ORDER BY ts DESC LIMIT ?", (int(limit),)).fetchall()
        return [{"ts": ts, "tool": t, "args": json.loads(a), "summary": json.loads(s)} for ts, t, a, s in rows]


_audit_init()


def _name(x):
    if not isinstance(x, str) or not NAME_RE.match(x):
        raise ValueError(f"Invalid name: {x!r}")
    return x

def _ro(graph, query, params = None):
    return db.select_graph(graph).ro_query(query, params or {}).result_set

def _sim_only(name):
    if not (isinstance(name, str) and name.startswith(SIM_PREFIX) and re.match(r"^[A-Za-z0-9_-]+$", name)):
        raise PolicyError("writes are allowed only on sandbox graphs")
    return name

def schema(graph = PROD):
    return {
        "graph": graph,
        "name_key": NAME_KEY,
        "labels": [r[0] for r in _ro(graph, "CALL db.labels()")],
        "relationship_types": [r[0] for r in _ro(graph, "CALL db.relationshipTypes()")],
        "property_keys": [r[0] for r in _ro(graph, "CALL db.propertyKeys()")],
        "node_count": _ro(graph, "MATCH (n) RETURN count(n)")[0][0],
        "edge_count": _ro(graph, "MATCH ()-[r]->() RETURN count(r)")[0][0],
    }
    
def graph_view(graph=PROD):
    nodes = [{"id": i, "labels": ls, "props": n.properties}
             for i, ls, n in _ro(graph, "MATCH (n) RETURN ID(n), labels(n), n")]

    edges = [{"src": a, "rel": rel, "dst": b, "props": r.properties}
            for a, rel, b, r in _ro(graph, "MATCH (a)-[r]->(b) RETURN ID(a), type(r), ID(b), r")]

    return {"graph": graph, "nodes": nodes, "edges": edges}

def find_paths(sources, target, graph = PROD):
    for s in sources:
        _name(s)
    _name(target)
    k = NAME_KEY
    q =  (f"MATCH p=(s)-[{REL_FILTER}*1..{MAX_HOPS}]->(t) WHERE s.{k} IN $sources AND t.{k} = $target "
         f"RETURN [n IN nodes(p) | n.{k}], [r IN relationships(p) | type(r)]")
    rows = _ro(graph, q, {"sources": list(sources), "target": target})
    return {"graph": graph, "count": len(rows),
            "paths": [{"nodes": n, "rels": r} for n, r in rows]}

def _edge_map(graph):
    k = NAME_KEY
    edges = {}
    q = f"MATCH (a)-[r{REL_FILTER}]->(b) RETURN a.{k}, type(r), b.{k}, coalesce(r.benign_load, 0)"
    for a, rel, b, load in _ro(graph, q):
        edges.setdefault((a, b), []).append((rel, min(int(load), 999)))
    return edges

def min_cut(sources, target, graph = PROD):
    for s in sources:
        _name(s)
    _name(target)
    edges = _edge_map(graph)
    live = [s for s in sources if any(a==s for a, _ in edges)]
    topo = nx.DiGraph(list(edges))
    depth = {}
    for s in live:
        for n, d in nx.single_source_shortest_path_length(topo, s).items():
            depth[n] = min(depth.get(n, d), d)
    G = nx.DiGraph()
    for (a,b), items in edges.items():
        G.add_edge(a, b, capacity=sum(BIG + load * 100 + depth.get(a, 0) for _, load in items))
        
    if target not in G or not live: 
        return {"size": 0, "cut": []}
    for s in live:
        G.add_edge("__SRC__", s, capacity = BIG * 1000)
    _, (reach, rest) = nx.minimum_cut(G, "__SRC__", target)
    cut = [{"type": "remove_edge", "src": a, "dst": b, "rel": rel, "benign_load": load} for (a, b), items in edges.items() if a in reach and b in rest for rel, load in items]
    result = {"size": len(cut), "disruption": sum(c["benign_load"] for c in cut), "cut": cut}
    audit("min_cut", {"sources": sources, "target": target}, result)
    return result

def _clone(src, dst):
    try:
        db.connection.execute_command("GRAPH.COPY", src, dst)
        return "GRAPH.COPY"
    except Exception:
        pass
    g = db.select_graph(_sim_only(dst))
    idmap = {}
    for nid, labels, node in _ro(src, "MATCH (n) RETURN ID(n), labels(n), n"):
        ls = ":".join(l for l in labels if IDENT_RE.match(l))
        res = g.query(f"CREATE (x{':' + ls if ls else ''}) SET x = $p RETURN ID(x)", {"p": node.properties})
        idmap[nid] = res.result_set[0][0]
    for a, rel, b, edge in _ro(src, "MATCH (a)-[r]->(b) RETURN ID(a), type(r), ID(b), r"):
        if IDENT_RE.match(rel):
            g.query(f"MATCH (x),(y) WHERE ID(x) = $a AND ID(y) = $b CREATE (x)-[r:{rel}]->(y) SET r = $p",
                    {"a": idmap[a], "b": idmap[b], "p": edge.properties})
    return "manual"
 
 
def drop_sim(sim_id):
    sim_name = _sim_only(sim_id)
    if sim_name not in db.list_graphs():
        raise LookupError(f"sandbox graph does not exist: {sim_id}")
    db.select_graph(sim_name).delete()
    audit("drop_sim", {"sim_id": sim_id}, {"dropped": True})
    return {"dropped": sim_id}
 
 
def simulate(actions, sources, target):
    if not actions:
        raise PolicyError("simulation requires at least one action")
    paths = find_paths(sources, target)["paths"]
    if not paths:
        raise PolicyError("no attack paths found to contain")
    on_nodes = {n for p in paths for n in p["nodes"]}
    on_edges = {(p["nodes"][i], p["nodes"][i + 1]) for p in paths for i in range(len(p["nodes"]) - 1)}
    for a in actions:
        kind = a.get("type")
        if kind == "remove_edge":
            if (_name(a.get("src")), _name(a.get("dst"))) not in on_edges:
                raise PolicyError(f"precondition failed: {a.get('src')} -> {a.get('dst')} is not on a current attack path")
        elif kind == "isolate_node":
            if _name(a.get("node")) not in on_nodes:
                raise PolicyError(f"precondition failed: {a.get('node')} is not on a current attack path")
        else:
            raise PolicyError(f"unknown action type: {kind!r}")
    if len([n for n in db.list_graphs() if n.startswith(SIM_PREFIX)]) >= MAX_SIMS:
        raise PolicyError("too many sandboxes; delete some first")
    sim = SIM_PREFIX + uuid.uuid4().hex[:8]
    method = _clone(PROD, sim)
    g = db.select_graph(_sim_only(sim))
    k = NAME_KEY
    for a in actions:
        if a["type"] == "remove_edge":
            g.query(f"MATCH (a {{{k}:$s}})-[r]->(b {{{k}:$d}}) DELETE r", {"s": a["src"], "d": a["dst"]})
        else:
            g.query(f"MATCH (n {{{k}:$n}}) DETACH DELETE n", {"n": a["node"]})
    result = {"sim_id": sim, "clone_method": method, "applied": len(actions), "status": "simulated_unverified"}
    audit("simulate", {"actions": actions, "sources": sources, "target": target}, result)
    return result
 
 
def verify(sim_id, sources, target):
    sim_name = _sim_only(sim_id)
    if sim_name not in db.list_graphs():
        raise LookupError(f"sandbox graph does not exist: {sim_id}")
    before = find_paths(sources, target)
    after = find_paths(sources, target, graph=sim_name)
    contained = (after["count"] == 0)
    result = {"sim_id": sim_id, "before": before["count"], "after": after["count"],
              "contained": contained,
              "remaining_paths": after["paths"],
              "verdict": "eliminated" if contained else "residual_risk"}
    audit("verify", {"sim_id": sim_id, "sources": sources, "target": target},
          {k: v for k, v in result.items() if k != "remaining_paths"})
    return result