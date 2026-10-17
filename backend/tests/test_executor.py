import pytest
import tf_core as core
import tf_intel as intel
from agent import executor
from scenarios.variants import build_variant

try:
    core.db.list_graphs()
    DB_UP = True
except Exception:
    DB_UP = False

pytestmark = pytest.mark.skipif(not DB_UP, reason="FalkorDB not reachable")


@pytest.fixture(scope="module")
def seeded_case():
    spec = build_variant(core.db, "tf-test", seed=7, footholds=4, chain=2, apps=1)
    return spec


@pytest.mark.anyio
async def test_investigate_validates_inputs():
    with pytest.raises(ValueError):
        await executor.investigate([], "Critical Server")

    with pytest.raises(ValueError):
        await executor.investigate(["Workstation A"], None)


@pytest.mark.anyio
async def test_investigate_and_approve_lifecycle(seeded_case):
    # Run autonomous investigation
    case = await executor.investigate(seeded_case["sources"], seeded_case["target"])
    assert case["status"] in ("awaiting_approval", "needs_analyst")
    assert len(case["steps"]) > 0
    assert all("ok" in step for step in case["steps"])

    # If case has a proposal, test approve lifecycle
    if case["status"] == "awaiting_approval":
        assert case["proposal"] is not None
        assert len(case["proposal"]["cut"]) > 0

        # Test rejection path first with a temporary clone
        case_copy = intel.load_case(case["id"])
        rejected = await executor.approve(case["id"], approved=False, approver="test_analyst")
        assert rejected["status"] == "rejected"

        # Re-save as awaiting_approval to test approval path
        intel.save_case(case_copy)
        verified = await executor.approve(case["id"], approved=True, approver="test_analyst")
        assert verified["status"] == "verified"
        assert verified["contained"] is True
        assert verified["verification"]["after"] == 0
        assert verified["report"]["recommendation"] is not None
        assert "sandbox" in verified["report"]["recommendation"]

        # Clean up sandbox
        if verified.get("simulation", {}).get("sim_id"):
            core.drop_sim(verified["simulation"]["sim_id"])


@pytest.mark.anyio
async def test_approve_failure_persists_status(seeded_case):
    case = await executor.investigate(seeded_case["sources"], seeded_case["target"])
    if case["status"] == "awaiting_approval":
        # Introduce an invalid action (off-path edge) that will fail simulation policy
        case["proposal"]["cut"] = [{"type": "remove_edge", "src": "FakeNodeA", "dst": "FakeNodeB"}]
        intel.save_case(case)

        # Approving must fail with PolicyError
        with pytest.raises(core.PolicyError):
            await executor.approve(case["id"], approved=True, approver="test_analyst")

        # The case in the database MUST NOT remain stuck in awaiting_approval
        reloaded = intel.load_case(case["id"])
        assert reloaded["status"] == "approval_failed"
        assert "error" in reloaded
        assert "PolicyError" in reloaded["error"]
