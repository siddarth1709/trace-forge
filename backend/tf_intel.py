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
         + (
             "WHERE all(e IN rs WHERE e.observed_at IS NOT NULL AND e.observed_at <= $t) "
             "AND all(i IN range(0, size(rs) - 2) WHERE rs[i].observed_at <= rs[i + 1].observed_at) "
             if as_of is not None else
             "WHERE true "
         )
         + f"RETURN [n IN nodes(p) | n.{k}], [e IN rs | type(e)], [e IN rs | e.observed_at], "
         "[e IN rs | e.evidence_id], [e IN rs | e.confidence]")

    rows = _ro(graph, q, {"sources": list(sources), "target": target, "t": t})
    rows = sorted(rows, key=lambda r: (len(r[1]), [str(x) for x in r[0]]))
    paths = [{"id": f"P{i + 1}", "nodes": r[0], "rels": r[1], "times": r[2], "evidence": r[3], "confidence": r[4]}
             for i, r in enumerate(rows)]
    return {"graph": graph, "as_of": as_of, "count": len(paths), "paths": paths}



def get_evidence(ids, graph=PROD):
    """Fetch evidence records by ID from the selected graph (read-only)."""
    ids = [_name(i) for i in ids]
    rows = _ro(
        graph,
        f"MATCH (e) WHERE e.{NAME_KEY} IN $ids AND e.type = 'evidence' RETURN e",
        {"ids": ids},
    )
    evidence_records = []

    for row in rows:
        record = dict(row[0].properties)

        is_untrusted = record.get("untrusted") is True

        record["trust_status"] = "untrusted" if is_untrusted else "unspecified"
        record["handling"] = "data_only_never_instructions"

        evidence_records.append(record)

    return {"evidence": evidence_records}


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
    """Persist the investigation as a graph using parameterized queries."""
    name = CASE_PREFIX + case["id"]
    if not re.match(r"^tf-case-[a-f0-9]{10}$", name):
        raise core.PolicyError("bad case id")
    g = core.db.select_graph(name)

    g.query(
        "CREATE (:Case {name: $name, status: $status, target: $target})",
        {"name": case["id"], "status": case["status"], "target": case["target"]},
    )
    for h in case.get("hypotheses", []):
        g.query(
            "CREATE (:Hypothesis {name: $name, text: $text, p: $p, log_odds: $log_odds})",
            {
                "name": h["id"],
                "text": str(h.get("text", ""))[:200],
                "p": float(h.get("p", 0.0)),
                "log_odds": float(h.get("log_odds", 0.0)),
            },
        )
        g.query(
            "MATCH (c:Case {name: $cid}), (h:Hypothesis {name: $hid}) CREATE (c)-[:HAS_HYPOTHESIS]->(h)",
            {"cid": case["id"], "hid": h["id"]},
        )
        for ev in h.get("evidence", []):
            rel = "SUPPORTS" if ev.get("relation") == "supports" else "REFUTES"
            weight = abs(float(ev.get("weight", 0.0)))
            eid = str(ev.get("evidence", ""))
            g.query("MERGE (:Evidence {name: $eid})", {"eid": eid})
            g.query(
                f"MATCH (e:Evidence {{name: $eid}}), (h:Hypothesis {{name: $hid}}) "
                f"CREATE (e)-[:{rel} {{weight: $weight}}]->(h)",
                {"eid": eid, "hid": h["id"], "weight": weight},
            )
    g.query(
        "CREATE (:Decision {name: 'D1', outcome: $outcome})",
        {"outcome": case["status"]},
    )
    g.query(
        "MATCH (c:Case {name: $cid}), (d:Decision {name: 'D1'}) CREATE (c)-[:DECIDED]->(d)",
        {"cid": case["id"]},
    )
    return {"case_graph": name}


def reconstruct_incident(trace_data, evidence_data):
    """Build an evidence-aware incident reconstruction without inventing facts."""
    evidence_records = evidence_data.get("evidence", []) if isinstance(evidence_data, dict) else []
    evidence_by_id = {
        str(record.get(NAME_KEY)): record
        for record in evidence_records
        if isinstance(record, dict) and record.get(NAME_KEY) is not None
    }

    reconstructed_paths = []
    all_timestamps_present = True
    all_evidence_linked = True

    for path in trace_data.get("paths", []):
        nodes = path.get("nodes", [])
        relationships = path.get("rels", [])
        times = path.get("times", [])
        evidence_ids = path.get("evidence", [])
        confidences = path.get("confidence", [])
        events = []

        for index, relationship in enumerate(relationships):
            source = nodes[index] if index < len(nodes) else None
            target = nodes[index + 1] if index + 1 < len(nodes) else None
            timestamp = times[index] if index < len(times) else None
            evidence_id = evidence_ids[index] if index < len(evidence_ids) else None
            confidence = confidences[index] if index < len(confidences) else None
            linked_evidence = evidence_by_id.get(str(evidence_id)) if evidence_id is not None else None

            if timestamp is None:
                all_timestamps_present = False
            if linked_evidence is None:
                all_evidence_linked = False

            events.append({
                "source": source,
                "relationship": relationship,
                "target": target,
                "observed_at": timestamp,
                "confidence": confidence,
                "evidence_id": evidence_id,
                "evidence_status": "linked" if linked_evidence is not None else "missing",
                "evidence": linked_evidence,
                "event_status": "path_observed",
            })

        reconstructed_paths.append({
            "id": path.get("id"),
            "nodes": nodes,
            "events": events,
            "timeline_status": (
                "timestamped"
                if events and all(event["observed_at"] is not None for event in events)
                else "unverified"
            ),
        })

    return {
        "graph": trace_data.get("graph"),
        "as_of": trace_data.get("as_of"),
        "path_count": len(reconstructed_paths),
        "chronology_verified": bool(reconstructed_paths) and all_timestamps_present,
        "evidence_complete": bool(reconstructed_paths) and all_evidence_linked,
        "paths": reconstructed_paths,
        "limitations": [
            "A discovered graph path does not by itself prove that an incident occurred.",
            "Missing timestamps cannot establish chronological order.",
            "Evidence is linked only when an exact evidence ID matches a returned record.",
        ],
    }
# ---- Outcome-based decision memory (separate from cases and audit)
def _outcome_memory_init():
    """Create the outcome memory table without changing existing tables."""
    with sqlite3.connect(core.AUDIT_DB) as c:
        c.execute("""
            CREATE TABLE IF NOT EXISTS outcome_memory (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                ts REAL NOT NULL,
                case_id TEXT NOT NULL,
                decision TEXT NOT NULL,
                outcome TEXT NOT NULL,
                verified INTEGER NOT NULL DEFAULT 0,
                notes TEXT NOT NULL DEFAULT ''
            )
        """)


def record_outcome(case_id, decision, outcome, verified=False, notes=""):
    """Record an analyst-reported outcome; never execute a response action."""
    case_id = str(case_id).strip()
    decision = str(decision).strip()
    outcome = str(outcome).strip().lower()
    notes = str(notes).strip()[:1000]

    if not re.fullmatch(r"[a-f0-9]{10}", case_id):
        raise core.PolicyError("invalid case ID")
    if not decision or len(decision) > 300:
        raise core.PolicyError("decision must contain 1–300 characters")
    if outcome not in {"successful", "unsuccessful", "inconclusive"}:
        raise core.PolicyError(
            "outcome must be successful, unsuccessful, or inconclusive"
        )

    _outcome_memory_init()
    with sqlite3.connect(core.AUDIT_DB) as c:
        c.execute(
            """INSERT INTO outcome_memory
               (ts, case_id, decision, outcome, verified, notes)
               VALUES (?, ?, ?, ?, ?, ?)""",
            (
                time.time(),
                case_id,
                decision,
                outcome,
                1 if verified else 0,
                notes,
            ),
        )

    return {
        "recorded": True,
        "case_id": case_id,
        "decision": decision,
        "outcome": outcome,
        "verified": bool(verified),
        "memory_scope": "advisory_only",
        "automatic_actions_enabled": False,
    }

def list_outcomes(limit=50):
    """Retrieve recent outcome records without changing them."""
    limit = max(1, min(int(limit), 500))
    _outcome_memory_init()

    with sqlite3.connect(core.AUDIT_DB) as c:
        rows = c.execute(
            """SELECT id, ts, case_id, decision, outcome, verified, notes
               FROM outcome_memory
               ORDER BY ts DESC, id DESC
               LIMIT ?""",
            (limit,),
        ).fetchall()

    return [
        {
            "id": row[0],
            "ts": row[1],
            "case_id": row[2],
            "decision": row[3],
            "outcome": row[4],
            "verified": bool(row[5]),
            "notes": row[6],
        }
        for row in rows
    ]

def summarize_outcomes():
    """Summarize recorded outcomes; advisory only, with no automatic actions."""
    _outcome_memory_init()

    with sqlite3.connect(core.AUDIT_DB) as c:
        rows = c.execute("""
            SELECT outcome, verified, COUNT(*)
            FROM outcome_memory
            GROUP BY outcome, verified
            ORDER BY outcome, verified
        """).fetchall()

        total = c.execute(
            "SELECT COUNT(*) FROM outcome_memory"
        ).fetchone()[0]

    counts = {
        "successful": {"total": 0, "verified": 0, "unverified": 0},
        "unsuccessful": {"total": 0, "verified": 0, "unverified": 0},
        "inconclusive": {"total": 0, "verified": 0, "unverified": 0},
    }

    for outcome, verified, count in rows:
        counts[outcome]["total"] += count
        key = "verified" if verified else "unverified"
        counts[outcome][key] += count

    return {
        "total_records": total,
        "outcomes": counts,
        "interpretation": (
            "Historical analyst-reported records only; counts do not prove "
            "causation or guarantee future success."
        ),
        "memory_scope": "advisory_only",
        "automatic_actions_enabled": False,
    }

# ---- Explainable decision recommendations (advisory only)

def explain_recommendations(paths, target):
    """Explain risk prioritization using existing scores and cautious history."""
    risk = risk_score(paths, target)
    history = summarize_outcomes()

    recommendations = []

    if not paths:
        recommendations.append({
            "priority": "insufficient_path_evidence",
            "title": "Gather more evidence",
            "reason": "No attack paths were returned for the supplied sources and target.",
            "supporting_evidence": [],
            "uncertainty": "No path was found; this does not prove the target is safe.",
        })
    else:
        score = risk["score"]
        if score >= 0.75:
            priority = "high"
        elif score >= 0.45:
            priority = "medium"
        else:
            priority = "review"

        features = sorted(
            risk["per_path"],
            key=lambda item: item["score"],
            reverse=True,
        )

        top_path = features[0]
        strongest_features = sorted(
            top_path["features"].items(),
            key=lambda item: item[1],
            reverse=True,
        )[:3]

        recommendations.append({
            "priority": priority,
            "title": "Review the highest-scoring attack path",
            "reason": (
                f"The current risk model returned score {score:.3f} "
                f"using {risk['version']}."
            ),
            "supporting_evidence": [{
                "path_id": top_path["path"],
                "path_score": top_path["score"],
                "leading_features": [
                    {"feature": name, "value": value}
                    for name, value in strongest_features
                ],
                "known_exploit_matches": risk["exploited"],
            }],
            "uncertainty": (
                "Risk weights are unvalidated defaults. A score is not a "
                "probability that an attack will occur."
            ),
        })

    return {
        "target": target,
        "risk": risk,
        "recommendations": recommendations,
        "historical_outcomes": history,
        "historical_outcomes_usage": (
            "Displayed as context only; historical counts do not rank "
            "recommendations or prove that a decision caused an outcome."
        ),
        "limitations": [
            "Graph paths alone do not prove that an incident occurred.",
            "Missing or incomplete evidence may change prioritization.",
            "Historical outcomes may be sparse, unverified, or unrelated.",
            "Business impact is not inferred from risk scores.",
        ],
        "memory_scope": "advisory_only",
        "automatic_actions_enabled": False,
        "production_modified": False,
    }

# ---- Risk sensitivity analysis (pure calculation; advisory only)

def analyze_risk_sensitivity(feature_sets, weight_scenarios=None):
    """Compare synthetic or supplied feature values under alternative weights.

    This function does not query graphs, mutate global risk weights,
    access outcome memory, or trigger response actions.
    """
    required = {"criticality", "exposure", "confidence", "recency", "exploit"}

    if not isinstance(feature_sets, list):
        raise ValueError("feature_sets must be a list")

    for item in feature_sets:
        if not isinstance(item, dict) or "path" not in item:
            raise ValueError("each feature set must include a path identifier")
        features = item.get("features")
        if not isinstance(features, dict) or set(features) != required:
            raise ValueError("each path must provide exactly the five risk features")
        for name, value in features.items():
            if isinstance(value, bool) or not isinstance(value, (int, float)):
                raise ValueError(f"{name} must be numeric")
            if not 0.0 <= value <= 1.0:
                raise ValueError(f"{name} must be between 0 and 1")

    if weight_scenarios is None:
        weight_scenarios = {
            "baseline": dict(RISK_WEIGHTS),
            "confidence_emphasis": {
                "criticality": 0.20,
                "exposure": 0.20,
                "confidence": 0.40,
                "recency": 0.10,
                "exploit": 0.10,
            },
            "exposure_emphasis": {
                "criticality": 0.20,
                "exposure": 0.40,
                "confidence": 0.15,
                "recency": 0.10,
                "exploit": 0.15,
            },
        }

    if not isinstance(weight_scenarios, dict) or not weight_scenarios:
        raise ValueError("weight_scenarios must be a non-empty dictionary")

    results = []
    for scenario, weights in weight_scenarios.items():
        if not isinstance(weights, dict) or set(weights) != required:
            raise ValueError(f"{scenario}: weights must contain exactly the five risk features")
        if any(
            isinstance(v, bool) or not isinstance(v, (int, float)) or v < 0
            for v in weights.values()
        ):
            raise ValueError(f"{scenario}: weights must be non-negative numbers")

        total_weight = sum(weights.values())
        if total_weight <= 0:
            raise ValueError(f"{scenario}: weight sum must be greater than zero")

        scores = []
        for item in feature_sets:
            score = sum(
                (weights[name] / total_weight) * item["features"][name]
                for name in required
            )
            scores.append({
                "path": item["path"],
                "score": round(score, 3),
            })

        ranked = sorted(scores, key=lambda x: (-x["score"], x["path"]))
        results.append({
            "scenario": scenario,
            "normalized_weights": {
                name: round(value / total_weight, 4)
                for name, value in weights.items()
            },
            "ranked_paths": ranked,
            "top_path": ranked[0]["path"] if ranked else None,
        })

    return {
        "model_version": RISK_VERSION,
        "analysis_type": "weight_sensitivity",
        "scenarios": results,
        "limitations": [
            "Results depend on supplied feature values and hypothetical weights.",
            "This analysis does not validate the risk model or prove attack likelihood.",
            "It does not query or modify any graph or production configuration.",
        ],
        "advisory_only": True,
        "automatic_actions_enabled": False,
        "production_modified": False,
    }
def build_evidence_provenance(reconstruction):
    """Build a read-only audit report from an incident reconstruction."""
    paths = reconstruction.get("paths", [])
    provenance_paths = []
    total_events = 0
    linked_events = 0
    timestamped_events = 0

    for path in paths:
        provenance_events = []

        for event in path.get("events", []):
            total_events += 1
            evidence_id = event.get("evidence_id")
            evidence_linked = event.get("evidence_status") == "linked"
            timestamp = event.get("observed_at")

            if evidence_linked:
                linked_events += 1
            if timestamp is not None:
                timestamped_events += 1

            provenance_events.append({
                "source": event.get("source"),
                "relationship": event.get("relationship"),
                "target": event.get("target"),
                "evidence_id": evidence_id,
                "evidence_status": (
                    "linked" if evidence_linked else "missing"
                ),
                "timestamp": timestamp,
                "timestamp_status": (
                    "available" if timestamp is not None else "missing"
                ),
                "confidence": event.get("confidence"),
                "claim_status": (
                    "supported_by_linked_evidence"
                    if evidence_linked
                    else "unverified_missing_evidence"
                ),
            })

        provenance_paths.append({
            "path_id": path.get("id"),
            "timeline_status": path.get("timeline_status", "unverified"),
            "events": provenance_events,
        })

    return {
        "graph": reconstruction.get("graph"),
        "as_of": reconstruction.get("as_of"),
        "path_count": len(provenance_paths),
        "event_count": total_events,
        "events_with_linked_evidence": linked_events,
        "events_with_timestamps": timestamped_events,
        "evidence_coverage": (
            linked_events / total_events if total_events else 0.0
        ),
        "timestamp_coverage": (
            timestamped_events / total_events if total_events else 0.0
        ),
        "paths": provenance_paths,
        "limitations": [
            "An evidence ID match does not establish that the evidence is authentic.",
            "Linked evidence does not by itself prove that an event occurred.",
            "Available timestamps do not independently establish a verified timeline.",
            "Coverage percentages measure field availability, not factual accuracy.",
        ],
        "advisory_only": True,
        "automatic_actions_enabled": False,
        "production_modified": False,
    }