
import tf_intel as intel


def test_explanation_is_advisory_and_exposes_uncertainty(monkeypatch):
    # Isolate the test from the real outcome-memory database.
    monkeypatch.setattr(
        intel,
        "summarize_outcomes",
        lambda: {
            "total": 0,
            "successful": 0,
            "unsuccessful": 0,
            "inconclusive": 0,
            "verified": 0,
            "unverified": 0,
        },
    )

    paths = [
        {
            "id": "synthetic-path-1",
            "nodes": ["Synthetic Source", "Synthetic Service", "Synthetic Target"],
            "times": [100, 200, 300],
            "confidence": [0.9, 0.8, 0.95],
            "rels": ["CONNECTS_TO", "USES"],
        },
        {
            "id": "synthetic-path-2",
            "nodes": ["Synthetic Source", "Synthetic Target"],
            "times": [150, 250],
            "confidence": [0.7, 0.8],
            "rels": ["REACHES"],
        },
    ]

    result = intel.explain_recommendations(paths, "Synthetic Target")

    assert result["target"] == "Synthetic Target"
    assert 0 < result["risk"]["score"] <= 1
    assert len(result["risk"]["per_path"]) == 2
    assert result["recommendations"][0]["title"] == (
        "Review the highest-scoring attack path"
    )
    assert "not a probability" in result["recommendations"][0]["uncertainty"]
    assert result["memory_scope"] == "advisory_only"
    assert result["automatic_actions_enabled"] is False
    assert result["production_modified"] is False


def test_no_paths_recommends_gathering_evidence(monkeypatch):
    monkeypatch.setattr(
        intel,
        "summarize_outcomes",
        lambda: {"total": 0},
    )

    result = intel.explain_recommendations([], "Synthetic Target")

    assert result["risk"]["score"] == 0.0
    assert result["recommendations"][0]["priority"] == (
        "insufficient_path_evidence"
    )
    assert result["recommendations"][0]["title"] == "Gather more evidence"
    assert result["automatic_actions_enabled"] is False
    assert result["production_modified"] is False
