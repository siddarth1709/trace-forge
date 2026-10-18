
import pytest

from tf_advanced import (
    analyze_risk_uncertainty,
    build_causal_hypotheses,
    map_attack_techniques,
    score_adversary_arena,
)


def test_risk_is_bounded_and_advisory():
    result = analyze_risk_uncertainty(
        {
            "criticality": 0.9,
            "exposure": 0.8,
            "confidence": 0.7,
            "recency": 0.6,
            "exploit": 0.5,
        },
        uncertainty={"exposure": 0.2, "confidence": 0.1},
    )
    assert 0 <= result["score_range"]["minimum"] <= 1
    assert 0 <= result["score_range"]["maximum"] <= 1
    assert result["advisory_only"] is True
    assert result["automatic_actions_enabled"] is False
    assert result["production_modified"] is False


def test_risk_rejects_zero_weight_scenario():
    with pytest.raises(ValueError):
        analyze_risk_uncertainty(
            {"criticality": 1},
            scenarios=[{"name": "invalid", "weights": {}}],
        )


def test_attack_mapping_requires_matching_evidence():
    result = map_attack_techniques([
        {"evidence_types": ["account_authentication"]},
        {"evidence_types": ["unknown_signal"]},
    ])
    assert len(result["mappings"]) == 1
    assert result["mappings"][0]["technique_id"] == "T1078"
    assert result["unmapped_observations"] == [1]
    assert result["production_modified"] is False


def test_causal_hypotheses_need_a_link():
    result = build_causal_hypotheses([
        {"event_id": "a", "timestamp": 100, "entities": ["host-1"]},
        {"event_id": "b", "timestamp": 150, "entities": ["host-1"]},
        {"event_id": "c", "timestamp": 160, "entities": ["host-2"]},
    ])
    assert len(result["candidate_chains"]) == 1
    assert result["candidate_chains"][0]["causation_verified"] is False


def test_arena_ranks_fewer_residual_paths_first():
    result = score_adversary_arena([
        {"name": "partial", "paths_before": 4, "paths_after": 1},
        {"name": "contained", "paths_before": 4, "paths_after": 0},
    ])
    assert result["ranked_scenarios"][0]["scenario"] == "contained"
    assert result["ranked_scenarios"][0]["contained_in_simulation"] is True


def test_arena_rejects_impossible_path_counts():
    with pytest.raises(ValueError):
        score_adversary_arena([
            {"name": "invalid", "paths_before": 2, "paths_after": 3},
        ])
