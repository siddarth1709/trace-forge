import json
import re
import sqlite3
import time

import tf_core as core
from tf_core import MAX_HOPS, NAME_KEY, PROD, REL_FILTER, _name, _ro 

RISK_VERSION = "risk-v1"
RISK_WEIGHTS = {"criticality": 0.30, "exposure": 0.25, "confidence": 0.20, "recency": 0.15, "exploit": 0.10}
CRITICALITY = {"critical": 1.0, "high": 0.75, "medium": 0.5}
CASE_PREFIX = "tf-case-"

def trace_paths(sources, target, as_of = None, graph = PROD):
    for s in sources:
        _name(s)
    _name(target)
    k = NAME_KEY
    t = int(as_of) if as_of is not None else 10**12
    q = (f"MATCH p=(s)-[{REL_FILTER}*1..{MAX_HOPS}]->(x) "
         f"WHERE s.{k} IN $sources AND x.{k} = $target "
         "WITH p, relationships(p) AS rs "
         "WHERE all(e IN rs WHERE coalesce(e.observed_at, 0) <= $t) "
         "AND all(i IN range(0, size(rs) - 2) WHERE coalesce(rs[i].observed_at, 0) <= coalesce(rs[i + 1].observed_at, 0)) "
         f"RETURN [n IN nodes(p) | n.{k}], [e IN rs | type(e)], [e IN rs | e.observed_at], "
         "[e IN rs | e.evidence_id], [e IN rs | e.confidence]")
    rows = _ro(graph, q, {"sources": list(sources), "target": target, "t": t})
    rows = sorted(rows, key=lambda r: (len(r[1]), [str(x) for x in r[0]]))
    paths = [{"id": f"P{i + 1}", "nodes": r[0], "rels": r[1], "times": r[2], "evidence": r[3], "confidence": r[4]}
             for i, r in enumerate(rows)]
    return {"graph": graph, "as_of": as_of, "count": len(paths), "paths": paths}
 
 
def get_evidence(ids):
    ids = [_name(i) for i in ids]
    rows = _ro(PROD, f"MATCH (e) WHERE e.{NAME_KEY} IN $ids AND e.type = 'evidence' RETURN e", {"ids": ids})
    return {"evidence": [dict(r[0].properties) for r in rows]}
 
 
def get_incident():
    k = NAME_KEY
    rows = _ro(PROD, f"MATCH (i)-[:INCLUDES]->(a)-[:INVOLVES]->(n) WHERE i.type = 'incident' "
                     f"RETURN i.{k}, i.severity, a.{k}, a.rule, n.{k}")
    ev = _ro(PROD, f"MATCH (e)-[:ABOUT]->(a) WHERE e.type = 'evidence' AND a.type = 'alert' RETURN e.{k}")
    evidence_ids = sorted({r[0] for r in ev})
    if not rows:
        return {"incident": None, "alerts": [], "alerted_entities": [], "evidence_ids": evidence_ids}
    return {"incident": rows[0][0], "severity": rows[0][1],
            "alerts": sorted({(r[2], r[3]) for r in rows}),
            "alerted_entities": sorted({r[4] for r in rows}),
            "evidence_ids": evidence_ids}
 
 
def connectivity(source, target):
    p = core.find_paths([_name(source)], _name(target))["paths"]
    return {"source": source, "target": target, "reachable": bool(p), "path_count": len(p),
            "min_hops": min((len(x["rels"]) for x in p), default=None)}
 
 
def node_facts(names):
    rows = _ro(PROD, f"MATCH (n) WHERE n.{NAME_KEY} IN $names RETURN n", {"names": list(names)})
    return {r[0].properties.get(NAME_KEY): dict(r[0].properties) for r in rows}
 
 
def exploit_hits(names):
    k = NAME_KEY
    rows = _ro(PROD, f"MATCH (v)-[:AFFECTS]->(n) WHERE v.kev = true AND n.{k} IN $names RETURN v.{k}, n.{k}",
               {"names": list(names)})
    return [{"vulnerability": r[0], "affects": r[1]} for r in rows]
 
 
def risk_score(paths, target):
    """Weighted features, versioned and reproducible. Weights are tunable defaults, not validated."""
    if not paths:
        return {"score": 0.0, "version": RISK_VERSION, "weights": RISK_WEIGHTS, "per_path": [], "exploited": []}
    crit = CRITICALITY.get(node_facts([target]).get(target, {}).get("criticality"), 0.25)
    names = sorted({n for p in paths for n in p["nodes"] if n})
    hits = exploit_hits(names)
    all_t = [t for p in paths for t in p["times"] if t is not None]
    tmax = max(all_t) if all_t else 0
    per = []
    for p in paths:
        conf = min([c for c in p["confidence"] if c is not None] or [0.5])
        last = max([t for t in p["times"] if t is not None] or [0])
        feats = {"criticality": crit, "exposure": 1.0 / max(len(p["rels"]), 1), "confidence": conf,
                 "recency": (last / tmax) if tmax else 1.0, "exploit": 1.0 if hits else 0.0}
        score = sum(RISK_WEIGHTS[k] * v for k, v in feats.items())
        per.append({"path": p["id"], "score": round(score, 3), "features": {k: round(v, 3) for k, v in feats.items()}})
    return {"score": max(x["score"] for x in per), "version": RISK_VERSION, "weights": RISK_WEIGHTS,
            "per_path": per, "exploited": hits}
 
 
def _cases_db():
    c = sqlite3.connect(core.AUDIT_DB)
    c.execute("CREATE TABLE IF NOT EXISTS cases (id TEXT PRIMARY KEY, ts REAL, status TEXT, data TEXT)")
    return c
 
 
def save_case(case):
    with _cases_db() as c:
        c.execute("INSERT OR REPLACE INTO cases VALUES (?,?,?,?)",
                  (case["id"], case.get("ts", time.time()), case["status"], json.dumps(case, default=str)))
    return case
 
 
def load_case(case_id):
    with _cases_db() as c:
        row = c.execute("SELECT data FROM cases WHERE id = ?", (case_id,)).fetchone()
    return json.loads(row[0]) if row else None
 
 
def list_cases(limit=50):
    with _cases_db() as c:
        rows = c.execute("SELECT id, ts, status, data FROM cases ORDER BY ts DESC LIMIT ?", (int(limit),)).fetchall()
    return [{"id": i, "ts": ts, "status": st, "target": json.loads(d).get("target")} for i, ts, st, d in rows]
 
 
def _fmt(v):
    if isinstance(v, bool):
        return "true" if v else "false"
    if isinstance(v, (int, float)):
        return repr(v)
    return json.dumps(str(v))
 
 
def _lit(d):
    return "{" + ", ".join(f"{k}: {_fmt(v)}" for k, v in d.items()) + "}"
 
 
def write_case_graph(case):
    """Persist the investigation as a graph: Case, Hypothesis, Evidence, Decision."""
    name = CASE_PREFIX + case["id"]
    if not re.match(r"^tf-case-[a-f0-9]{10}$", name):
        raise core.PolicyError("bad case id")
    g = core.db.select_graph(name)
    cid = _fmt(case["id"])
    g.query(f"CREATE (:Case {_lit({'name': case['id'], 'status': case['status'], 'target': case['target']})})")
    for h in case.get("hypotheses", []):
        hid = _fmt(h["id"])
        g.query(f"CREATE (:Hypothesis {_lit({'name': h['id'], 'text': h['text'], 'p': h['p'], 'log_odds': h['log_odds']})})")
        g.query(f"MATCH (c:Case {{name: {cid}}}), (h:Hypothesis {{name: {hid}}}) CREATE (c)-[:HAS_HYPOTHESIS]->(h)")
        for ev in h.get("evidence", []):
            eid = _fmt(ev["evidence"])
            rel = "SUPPORTS" if ev["relation"] == "supports" else "REFUTES"
            g.query(f"MERGE (:Evidence {{name: {eid}}})")
            g.query(f"MATCH (e:Evidence {{name: {eid}}}), (h:Hypothesis {{name: {hid}}}) "
                    f"CREATE (e)-[:{rel} {{weight: {abs(ev['weight'])}}}]->(h)")
    g.query(f"CREATE (:Decision {_lit({'name': 'D1', 'outcome': case['status']})})")
    g.query(f"MATCH (c:Case {{name: {cid}}}), (d:Decision {{name: 'D1'}}) CREATE (c)-[:DECIDED]->(d)")
    return {"case_graph": name}
 