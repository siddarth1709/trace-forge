"""Smoke test. Start the API first, then run this file.
Defaults match your graph. Override with environment variables if your names differ:
  TF_SOURCES="Workstation A,Secondary Foothold,Service Account"  TF_TARGET="Critical Server"
"""
import json
import os
import urllib.error
import urllib.request

BASE = os.getenv("TF_API", "http://127.0.0.1:8000")
SOURCES = [s.strip() for s in os.getenv("TF_SOURCES", "Workstation A,Secondary Foothold,Service Account").split(",")]
TARGET = os.getenv("TF_TARGET", "Critical Server")


def call(method, path, body=None):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(BASE + path, data=data, method=method,
                                 headers={"Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req) as r:
            return r.status, json.loads(r.read())
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read() or b"{}")


def check(label, ok, detail=""):
    print(("PASS " if ok else "FAIL ") + label, detail)
    return ok


q = {"sources": SOURCES, "target": TARGET}

s, h = call("GET", "/health")
check("health", s == 200, h)

s, sc = call("GET", "/schema")
check("schema", s == 200 and sc.get("node_count", 0) >= 7 and sc.get("edge_count", 0) >= 6,
      {k: sc.get(k) for k in ("labels", "relationship_types", "property_keys", "node_count", "edge_count")})

s, p = call("POST", "/paths", q)
check("baseline: 3 attack paths", s == 200 and p.get("count") == 3, p.get("count"))

s, c = call("POST", "/containment/cut", q)
check("min cut found", s == 200 and c.get("size", 0) >= 1, [(e["src"], e["dst"]) for e in c.get("cut", [])])
check("cheapest cut chosen (disruption 32; applies to the seeded graph only)", c.get("disruption") == 32, c.get("disruption"))

s, a = call("POST", "/containment/auto", q)
v = a.get("verification", {})
check("auto: cut applied in sandbox, 0 paths remain", s == 200 and v.get("after") == 0, v.get("verdict"))

s, p2 = call("POST", "/paths", q)
check("production unchanged (still 3 paths)", s == 200 and p2.get("count") == 3, p2.get("count"))

s, bad = call("POST", "/containment/simulate",
              {**q, "actions": [{"type": "isolate_node", "node": "Not On Any Path"}]})
check("off-path action refused (403)", s == 403, bad.get("detail"))

s, bad = call("POST", "/paths", {"sources": ["x') MATCH (n) DETACH DELETE n //"], "target": TARGET})
check("injection-style name rejected (422)", s == 422, bad.get("detail"))

sim = a.get("simulation", {}).get("sim_id")
if sim:
    s, d = call("DELETE", f"/sim/{sim}")
    check("sandbox deleted", s == 200, d)

s, log = call("GET", "/audit?limit=5")
check("audit log records actions", s == 200 and len(log) > 0, f"{len(log)} recent entries")