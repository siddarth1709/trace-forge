
import pytest

import tf_intel as intel


FEATURES = [
    {
        "path": "path-A",
        "features": {
            "criticality": 0.9,
            "exposure": 0.4,
            "confidence": 0.95,
            "recency": 0.8,
            "exploit": 1.0,
        },
    },
    {
        "path": "path-B",
        "features": {
            "criticality": 0.6,
            "exposure": 1.0,
            "confidence": 0.6,
            "recency": 0.5,
            "exploit": 0.0,
        },
    },
]


def test_default_scenarios_are_advisory_and_complete():
    result = intel.analyze_risk_sensitivity(FEATURES)

    assert result["model_version"] == intel.RISK_VERSION
    assert len(result["scenarios"]) == 3
    assert result["advisory_only"] is True
    assert result["automatic_actions_enabled"] is False
    assert result["production_modified"] is False
    assert all(s["top_path"] in {"path-A", "path-B"} for s in result["scenarios"])


def test_custom_weights_can_change_ranking():
    scenarios = {
        "favor-A": {
            "criticality": 1, "exposure": 0, "confidence": 0,
            "recency": 0, "exploit": 0,
        },
        "favor-B": {
            "criticality": 0, "exposure": 1, "confidence": 0,
            "recency": 0, "exploit": 0,
        },
    }

    result = intel.analyze_risk_sensitivity(FEATURES, scenarios)
    rankings = {s["scenario"]: s["top_path"] for s in result["scenarios"]}

    assert rankings["favor-A"] == "path-A"
    assert rankings["favor-B"] == "path-B"


def test_invalid_feature_values_are_rejected():
    bad = [
        {
            "path": "path-A",
            "features": {
                "criticality": 1.5, "exposure": 0.4, "confidence": 0.9,
                "recency": 0.8, "exploit": 1.0,
            },
        }
    ]

    with pytest.raises(ValueError):
        intel.analyze_risk_sensitivity(bad)


def test_negative_weights_are_rejected():
    bad_weights = {
        "criticality": -1, "exposure": 1, "confidence": 1,
        "recency": 1, "exploit": 1,
    }

    with pytest.raises(ValueError):
        intel.analyze_risk_sensitivity(FEATURES, {"bad": bad_weights})


def test_global_risk_weights_are_not_modified():
    original = dict(intel.RISK_WEIGHTS)

    intel.analyze_risk_sensitivity(FEATURES)

    assert intel.RISK_WEIGHTS == original
