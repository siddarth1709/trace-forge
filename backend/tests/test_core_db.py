import pytest

try:
    import tf_core as core
    import tf_intel as intel
    from scenarios.variants import build_variant

    core.db.list_graphs()
    DB_UP = True
except Exception:
    DB_UP = False

pytestmark = pytest.mark.skipif(not DB_UP, reason="FalkorDB not reachable")


@pytest.fixture(scope="module")
def spec():
    return build_variant(core.db, "tf-test", seed=7, footholds=4, chain=2, apps=1)


def test_graph_paths_match_ground_truth(spec):
    assert core.find_paths(spec["sources"], spec["target"])["count"] == spec["truth"]["path_count"]


def test_time_ordered_paths_have_evidence_fields(spec):
    r = intel.trace_paths(spec["sources"], spec["target"])
    assert r["count"] == spec["truth"]["path_count"] and all(len(p["times"]) == len(p["rels"]) for p in r["paths"])


def test_time_travel_hides_later_hops(spec):
    assert intel.trace_paths(spec["sources"], spec["target"], as_of=0)["count"] == 0


def test_min_cut_matches_truth_and_contains(spec):
    plan = core.min_cut(spec["sources"], spec["target"])
    assert plan["size"] == spec["truth"]["min_cut_size"]
    sim = core.simulate(plan["cut"], spec["sources"], spec["target"])
    try:
        v = core.verify(sim["sim_id"], spec["sources"], spec["target"])
        assert v["after"] == 0 and v["before"] == spec["truth"]["path_count"]
    finally:
        core.drop_sim(sim["sim_id"])


def test_production_is_unchanged_after_simulation(spec):
    before = core.find_paths(spec["sources"], spec["target"])["count"]
    plan = core.min_cut(spec["sources"], spec["target"])
    sim = core.simulate(plan["cut"], spec["sources"], spec["target"])
    core.drop_sim(sim["sim_id"])
    assert core.find_paths(spec["sources"], spec["target"])["count"] == before


def test_off_path_action_is_refused(spec):
    with pytest.raises(core.PolicyError):
        core.simulate([{"type": "isolate_node", "node": "Printer"}], spec["sources"], spec["target"])


def test_writes_to_production_are_blocked():
    with pytest.raises(core.PolicyError):
        core.drop_sim(core.PROD)


def test_injection_style_names_are_rejected(spec):
    with pytest.raises(ValueError):
        core.find_paths(["x') MATCH (n) DETACH DELETE n //"], spec["target"])


def test_risk_score_is_deterministic(spec):
    paths = intel.trace_paths(spec["sources"], spec["target"])["paths"]
    a, b = intel.risk_score(paths, spec["target"]), intel.risk_score(paths, spec["target"])
    assert a == b and 0 < a["score"] <= 1


def test_verify_nonexistent_sandbox_raises_lookuperror(spec):
    with pytest.raises(LookupError):
        core.verify("tf-sim-nonexistent", spec["sources"], spec["target"])


def test_drop_nonexistent_sandbox_raises_lookuperror():
    with pytest.raises(LookupError):
        core.drop_sim("tf-sim-nonexistent")


def test_simulate_empty_actions_refused(spec):
    with pytest.raises(core.PolicyError):
        core.simulate([], spec["sources"], spec["target"])


def test_verify_detects_residual_risk_on_incomplete_containment(spec):
    plan = core.min_cut(spec["sources"], spec["target"])
    if len(plan["cut"]) > 1:
        # Apply only a partial cut (first edge only)
        partial_cut = [plan["cut"][0]]
        sim = core.simulate(partial_cut, spec["sources"], spec["target"])
        try:
            v = core.verify(sim["sim_id"], spec["sources"], spec["target"])
            assert v["after"] > 0
            assert v["contained"] is False
            assert v["verdict"] == "residual_risk"
        finally:
            core.drop_sim(sim["sim_id"])