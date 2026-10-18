
"""Advanced, deterministic, advisory-only TRACEFORGE analysis helpers.

No database access, graph mutation, or real-world security actions occur here.
"""
from __future__ import annotations
from datetime import datetime
from collections import defaultdict
from typing import Any, Dict, Iterable, List, Mapping, Optional, Sequence, Tuple


MODULE_VERSION = "tf-advanced-v1"
SUPPORTED_TECHNIQUES = {
    "credential_access": {
        "technique_id": "T1003",
        "name": "OS Credential Dumping",
        "requires_evidence": ["credential_dumping"],
    },
    "valid_accounts": {
        "technique_id": "T1078",
        "name": "Valid Accounts",
        "requires_evidence": ["account_authentication"],
    },
    "lateral_movement": {
        "technique_id": "T1021",
        "name": "Remote Services",
        "requires_evidence": ["remote_service"],
    },
}


def _number(value: Any, default: Optional[float] = None) -> Optional[float]:
    """Return a finite float, or default for invalid/missing values."""
    try:
        result = float(value)
    except (TypeError, ValueError):
        return default
    if result != result or result in (float("inf"), float("-inf")):
        return default
    return result


def _clamp(value: float, low: float = 0.0, high: float = 1.0) -> float:
    return max(low, min(high, value))


def analyze_risk_uncertainty(
    features: Mapping[str, Any],
    *,
    uncertainty: Optional[Mapping[str, Any]] = None,
    scenarios: Optional[Sequence[Mapping[str, Any]]] = None,
) -> Dict[str, Any]:
    """Calculate a bounded risk estimate and sensitivity range.

    Feature values are normalized to [0, 1]. Uncertainty widths represent
    analyst-supplied uncertainty, not statistically calibrated confidence.
    """
    names = ("criticality", "exposure", "confidence", "recency", "exploit")
    weights = {
        "criticality": 0.30,
        "exposure": 0.25,
        "confidence": 0.20,
        "recency": 0.15,
        "exploit": 0.10,
    }
    values = {key: _clamp(_number(features.get(key), 0.0) or 0.0) for key in names}
    widths = {
        key: _clamp(_number((uncertainty or {}).get(key), 0.0) or 0.0)
        for key in names
    }

    scenario_list = list(scenarios or [
        {"name": "baseline", "weights": weights},
        {"name": "exposure_emphasis", "weights": {
            **weights, "exposure": 0.40, "criticality": 0.20,
            "confidence": 0.15, "recency": 0.15, "exploit": 0.10,
        }},
        {"name": "evidence_emphasis", "weights": {
            **weights, "confidence": 0.35, "criticality": 0.25,
            "exposure": 0.20, "recency": 0.10, "exploit": 0.10,
        }},
    ])

    results = []
    for scenario in scenario_list:
        raw_weights = scenario.get("weights", weights)
        clean_weights = {
            key: max(0.0, _number(raw_weights.get(key), 0.0) or 0.0)
            for key in names
        }
        total = sum(clean_weights.values())
        if total <= 0:
            raise ValueError("Each scenario must have positive total weight")
        clean_weights = {k: v / total for k, v in clean_weights.items()}

        score = sum(values[k] * clean_weights[k] for k in names)
        margin = sum(widths[k] * clean_weights[k] for k in names)
        results.append({
            "scenario": str(scenario.get("name", "unnamed")),
            "score": round(score, 4),
            "lower_bound": round(_clamp(score - margin), 4),
            "upper_bound": round(_clamp(score + margin), 4),
            "weights": {k: round(v, 4) for k, v in clean_weights.items()},
        })

    scores = [r["score"] for r in results]
    return {
        "model_version": MODULE_VERSION,
        "features": values,
        "uncertainty_widths": widths,
        "scenarios": results,
        "score_range": {
            "minimum": min(scores),
            "maximum": max(scores),
        },
        "limitations": [
            "Scores are heuristic, not calibrated probabilities.",
            "Uncertainty widths are analyst inputs, not statistical intervals.",
            "Missing feature values default to zero and must be reviewed.",
        ],
        "advisory_only": True,
        "automatic_actions_enabled": False,
        "production_modified": False,
    }


def map_attack_techniques(
    observations: Iterable[Mapping[str, Any]],
) -> Dict[str, Any]:
    """Map explicitly supplied observations to conservative technique candidates.

    Each observation must supply evidence_types. A technique is not asserted
    unless its required evidence type is present.
    """
    results = []
    for index, observation in enumerate(observations):
        evidence_types = {
            str(item).strip().lower()
            for item in observation.get("evidence_types", [])
            if isinstance(item, str) and item.strip()
        }
        for key, technique in SUPPORTED_TECHNIQUES.items():
            required = set(technique["requires_evidence"])
            if required.intersection(evidence_types):
                results.append({
                    "observation_index": index,
                    "technique_id": technique["technique_id"],
                    "technique_name": technique["name"],
                    "matched_evidence_types": sorted(required.intersection(evidence_types)),
                    "mapping_status": "candidate_supported_by_declared_evidence",
                    "limitations": [
                        "Mapping depends on the accuracy of caller-supplied evidence types.",
                        "This candidate is not proof of adversary attribution.",
                    ],
                })

    return {
        "mappings": results,
        "unmapped_observations": [
            i for i, obs in enumerate(observations)
            if not any(m["observation_index"] == i for m in results)
        ] if isinstance(observations, Sequence) else [],
        "advisory_only": True,
        "production_modified": False,
    }


def build_causal_hypotheses(
    events: Sequence[Mapping[str, Any]],
    *,
    max_gap_seconds: float = 3600,
) -> Dict[str, Any]:
    """Create candidate event chains without claiming causation.

    Events are ordered by timestamp. Only events with explicit entity links
    or a shared non-empty entity are joined; time proximity alone is not proof.
    """
    if max_gap_seconds < 0:
        raise ValueError("max_gap_seconds must be non-negative")

    def event_time(event: Mapping[str, Any]) -> Optional[float]:
        value = event.get("timestamp")
        numeric = _number(value)
        if numeric is not None:
            return numeric
        if isinstance(value, str):
            try:
                return datetime.fromisoformat(
                value.replace("Z", "+00:00")
            ).timestamp()
            except ValueError:
                return None
        return None

    ordered = sorted(
        enumerate(events),
        key=lambda pair: (
            event_time(pair[1]) is None,
            event_time(pair[1]) if event_time(pair[1]) is not None else 0,
            pair[0],
        ),
    )

    chains = []
    for (idx_a, a), (idx_b, b) in zip(ordered, ordered[1:]):
        ta, tb = event_time(a), event_time(b)
        if ta is None or tb is None or tb - ta > max_gap_seconds:
            continue
        a_entities = {str(x) for x in a.get("entities", []) if x}
        b_entities = {str(x) for x in b.get("entities", []) if x}
        shared = sorted(a_entities & b_entities)
        explicit = (
            a.get("event_id") in b.get("caused_by", [])
            if a.get("event_id") is not None else False
        )
        if shared or explicit:
            chains.append({
                "event_indices": [idx_a, idx_b],
                "shared_entities": shared,
                "explicit_link": bool(explicit),
                "classification": (
                    "explicitly_linked_candidate"
                    if explicit else "shared_entity_candidate"
                ),
                "causation_verified": False,
            })

    return {
        "candidate_chains": chains,
        "events_received": len(events),
        "events_with_timestamps": sum(event_time(e) is not None for e in events),
        "limitations": [
            "Temporal order and shared entities do not establish causation.",
            "No causal chain is verified by this function.",
            "Missing timestamps can prevent candidate linkage.",
        ],
        "advisory_only": True,
        "production_modified": False,
    }


def score_adversary_arena(
    scenarios: Sequence[Mapping[str, Any]],
) -> Dict[str, Any]:
    """Rank synthetic scenario results by residual attack paths.

    This scores supplied results; it does not execute attacks or defenses.
    """
    ranked = []
    for index, item in enumerate(scenarios):
        try:
            before = int(item["paths_before"])
            after = int(item["paths_after"])
        except (KeyError, TypeError, ValueError):
            raise ValueError("Each scenario needs integer paths_before and paths_after")
        if before < 0 or after < 0 or after > before:
            raise ValueError("Path counts must satisfy 0 <= paths_after <= paths_before")
        reduction = 0.0 if before == 0 else (before - after) / before
        ranked.append({
            "scenario": str(item.get("name", f"scenario-{index + 1}")),
            "paths_before": before,
            "paths_after": after,
            "path_reduction_fraction": round(reduction, 4),
            "contained_in_simulation": before > 0 and after == 0,
        })
    ranked.sort(key=lambda item: (
        item["paths_after"],
        -item["path_reduction_fraction"],
        item["scenario"],
    ))
    return {
        "ranked_scenarios": ranked,
        "note": "Ranks supplied synthetic results; it does not execute attacks.",
        "advisory_only": True,
        "production_modified": False,
    }
