def verify_claims(claims, known_ids):
    verified, rejected = [], []
    for c in claims:
        cites = c.get("cites") or []
        ok = bool(cites) and all(x in known_ids for x in cites)
        (verified if ok else rejected).append(c)
    total = len(claims) or 1
    return {"verified": verified, "rejected": rejected, "unsupported_rate": round(len(rejected) / total, 3)}
 