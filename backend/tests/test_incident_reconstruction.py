"""Database-independent tests for evidence-backed incident reconstruction."""


def test_reconstruction_must_not_claim_verified_timeline_without_timestamps():
    trace = {
        "graph": "traceforge",
        "as_of": None,
        "count": 1,
        "paths": [
            {
                "id": "P1",
                "nodes": [
                    "Workstation A",
                    "Shared Credential",
                    "Critical Server",
                ],
                "rels": ["REACHES", "AUTHENTICATES_TO"],
                "times": [None, None],
                "evidence": [None, None],
                "confidence": [None, None],
            }
        ],
    }

    # Required reporting contract for the reconstruction function.
    from tf_intel import reconstruct_incident

    result = reconstruct_incident(trace, {"evidence": []})

    assert result["chronology_verified"] is False
    assert result["evidence_complete"] is False
    assert result["paths"][0]["timeline_status"] == "unverified"
    assert all(
        event["evidence_status"] == "missing"
        for event in result["paths"][0]["events"]
    )


def test_partial_evidence_does_not_claim_complete_reconstruction():
    from tf_intel import reconstruct_incident

    trace = {
        "graph": "traceforge",
        "as_of": None,
        "count": 1,
        "paths": [
            {
                "id": "P1",
                "nodes": ["Workstation A", "Shared Credential", "Critical Server"],
                "rels": ["REACHES", "REACHES"],
                "times": [100, 200],
                "evidence": ["EV-1", None],
                "confidence": [0.9, None],
            }
        ],
    }
    evidence = {
        "evidence": [
            {"name": "EV-1", "text": "Synthetic test evidence"}
        ]
    }

    result = reconstruct_incident(trace, evidence)

    assert result["chronology_verified"] is True
    assert result["evidence_complete"] is False
    assert result["paths"][0]["events"][0]["evidence_status"] == "linked"
    assert result["paths"][0]["events"][1]["evidence_status"] == "missing"
