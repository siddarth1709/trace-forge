from . import llm, verifier

_SYSTEM = ("Write a 3 sentence plain-language summary using ONLY the facts given. Do not add facts. "
           'Return {"summary": str}.')


def build(case):
    paths = case.get("paths", [])
    ver = case.get("verification")
    prop = case.get("proposal")
    claims = [{"text": f"{len(paths)} time-ordered attack path(s) reach {case['target']} from "
                       f"{', '.join(case['sources'])}.", "cites": [p["id"] for p in paths]}]
    for p in paths:
        claims.append({"text": f"{p['id']}: " + " -> ".join(str(n) for n in p["nodes"]) + ".",
                       "cites": [p["id"]] + [e for e in p["evidence"] if e]})
    for h in case.get("hypotheses", []):
        if h["evidence"]:
            claims.append({"text": f"{h['id']} ({h['text']}) scored p={h['p']}.",
                           "cites": sorted({x["evidence"] for x in h["evidence"]})})
    if prop:
        edges = ", ".join(f"{c['src']} -> {c['dst']}" for c in prop["cut"])
        claims.append({"text": f"The minimum containment removes {prop['size']} relationship(s): {edges}. "
                               f"Estimated benign disruption: {prop['disruption']}.", "cites": ["cut"]})
    if ver:
        claims.append({"text": f"After the simulated action, {ver['after']} of {ver['before']} attack path(s) remain "
                               f"({ver['verdict']}).", "cites": [ver["sim_id"]]})
    for e in case.get("evidence", []):
        if e.get("quarantined"):
            claims.append({"text": f"Evidence {e['id']} contained untrusted or instruction-like text. It was withheld "
                                   "and had no influence on any action.", "cites": [e["id"]]})
    known = {e["id"] for e in case.get("evidence", [])} | {p["id"] for p in paths} | {"cut"}
    if ver:
        known.add(ver["sim_id"])
    checked = verifier.verify_claims(claims, known)
    facts = [c["text"] for c in checked["verified"]]
    data = llm.complete_json("summarize", {"facts": facts}, _SYSTEM)
    if isinstance(data, dict) and isinstance(data.get("summary"), str):
        summary, source = data["summary"][:600], "llm (unverified narrative)"
    else:
        summary, source = " ".join(facts[:3]), "templated from verified claims"
    if ver and ver["after"] == 0:
        rec = f"Containment verified: no attack path to {case['target']} remains in the sandbox."
    elif ver:
        rec = "Residual risk remains. Review the remaining paths and propose a follow-up action."
    else:
        rec = "No containment has been simulated yet."
    return {"summary": summary, "summary_source": source, "claims": checked["verified"],
            "rejected": checked["rejected"], "unsupported_rate": checked["unsupported_rate"],
            "residual": ver["remaining_paths"] if ver else None, "recommendation": rec}