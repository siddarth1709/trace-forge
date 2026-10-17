import os
import pytest
import tf_core as core
from eval import run_benchmark as bench
from scenarios.variants import build_variant

try:
    core.db.list_graphs()
    DB_UP = True
except Exception:
    DB_UP = False

pytestmark = pytest.mark.skipif(not DB_UP, reason="FalkorDB not reachable")


def test_production_immutability_throughout_lifecycles():
    """Prove that real production graph cannot be modified or dropped during simulation, verification, or benchmark."""
    real_prod = "traceforge"
    has_prod = real_prod in core.db.list_graphs()

    # 1. Record baseline production state if graph exists
    if has_prod:
        initial_nodes = core._ro(real_prod, "MATCH (n) RETURN count(n)")[0][0]
        initial_edges = core._ro(real_prod, "MATCH ()-[r]->() RETURN count(r)")[0][0]

    # 2. Forged/Malicious simulation ID attempts to delete production
    with pytest.raises(core.PolicyError):
        core.drop_sim(real_prod)

    with pytest.raises(core.PolicyError):
        core.drop_sim(f"../{real_prod}")

    with pytest.raises(core.PolicyError):
        core.drop_sim(f"{core.SIM_PREFIX}test; DROP GRAPH {real_prod}")

    # 3. Forged simulation destination attempts to write to production
    with pytest.raises(core.PolicyError):
        core._sim_only(real_prod)

    with pytest.raises(core.PolicyError):
        core._clone("tf-test", real_prod)

    # 4. Run dedicated test graph variant simulation and verification
    spec = build_variant(core.db, "tf-test", seed=42, footholds=3, chain=2, apps=1)
    plan = core.min_cut(spec["sources"], spec["target"], graph="tf-test")
    assert plan["size"] > 0

    sim = core.simulate(plan["cut"], spec["sources"], spec["target"], graph="tf-test")
    assert sim["sim_id"].startswith(core.SIM_PREFIX)
    assert sim["sim_id"] != real_prod

    ver = core.verify(sim["sim_id"], spec["sources"], spec["target"], src_graph="tf-test")
    assert ver["contained"] is True
    assert ver["after"] == 0

    core.drop_sim(sim["sim_id"])

    # 5. Run a benchmark iteration on dedicated benchmark graph
    bench_row = bench.run_one(seed=1)
    assert bench_row["graph"]["remaining"] == 0

    # 6. Verify production graph is 100% byte-for-byte, count-for-count untouched
    if has_prod:
        current_nodes = core._ro(real_prod, "MATCH (n) RETURN count(n)")[0][0]
        current_edges = core._ro(real_prod, "MATCH ()-[r]->() RETURN count(r)")[0][0]

        assert current_nodes == initial_nodes, f"Production nodes changed! was {initial_nodes}, now {current_nodes}"
        assert current_edges == initial_edges, f"Production edges changed! was {initial_edges}, now {current_edges}"
