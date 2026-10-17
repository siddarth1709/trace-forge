import json
import re

_IDENT = re.compile(r"^[A-Za-z_][A-Za-z0-9_]{0,40}$")


def fmt(v):
    if isinstance(v, bool):
        return "true" if v else "false"
    if isinstance(v, (int, float)):
        return repr(v)
    return json.dumps(str(v))


def lit(d):
    for k in d:
        if not _IDENT.match(k):
            raise ValueError(f"bad property key: {k!r}")
    return "{" + ", ".join(f"{k}: {fmt(v)}" for k, v in d.items()) + "}"


def add_node(g, label, name, **props):
    if not _IDENT.match(label):
        raise ValueError(f"bad label: {label!r}")
    g.query(f"CREATE (:{label} {lit({'name': name, 'source': 'synthetic', **props})})")


def add_edge(g, src, rel, dst, t, load=0, ev=None, conf=0.9):
    if not _IDENT.match(rel):
        raise ValueError(f"bad relationship type: {rel!r}")
    p = {"kind": "observed", "observed_at": t, "benign_load": load, "confidence": conf, "source": "synthetic"}
    if ev:
        p["evidence_id"] = ev
    g.query(f"MATCH (a {{name: {fmt(src)}}}), (b {{name: {fmt(dst)}}}) CREATE (a)-[:{rel} {lit(p)}]->(b)")