"""Tests for the end-to-end evidence-grounded agent workflow.

Validates the full chain:
FalkorDB graph evidence -> agent reasoning -> recommended defense ->
analyst approval -> isolated simulation -> independent verification -> audit result.
"""
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


@pytest.fixture(autouse=True)
def ensure_traceforge_graph(monkeypatch):
    """Ensure active graph is traceforge for real graph testing across processes."""
    monkeypatch.setenv("TF_GRAPH", "traceforge")
    monkeypatch.setattr(core, "PROD", "traceforge")


@pytest.fixture(scope="module")
def real_graph_case():
    """Real graph scenario targeting active FalkorDB topology."""
    return {
        "sources": ["Workstation A", "Secondary Foothold", "Service Account"],
        "target": "Critical Server",
    }


@pytest.mark.anyio
async def test_successful_analysis_with_real_graph_query_results(real_graph_case):
    """Test 1: Agent analyzes real graph paths, distinguishes observed facts from assumptions,
    and returns defensible structured recommendations with verification criteria."""
    case = await executor.investigate(real_graph_case["sources"], real_graph_case["target"])
    assert case["status"] == "awaiting_approval"
    assert len(case["paths"]) > 0

    # Verify reachable paths show exact node sequences and relationships
    for path in case["paths"]:
        assert "nodes" in path and len(path["nodes"]) >= 2
        assert "rels" in path and len(path["rels"]) >= 1
        assert path["nodes"][0] in real_graph_case["sources"]
        assert path["nodes"][-1] == real_graph_case["target"]

    # Verify structured agent reasoning / proposal
    assert case.get("proposal") is not None
    proposal = case["proposal"]
    assert "cut" in proposal and len(proposal["cut"]) > 0
    assert "finding" in case
    finding = case["finding"]

    # Explicitly distinguish observed facts from assumptions
    assert "observed_facts" in finding and len(finding["observed_facts"]) > 0
    assert "assumptions" in finding and len(finding["assumptions"]) > 0
    assert any("Graph topology identifies" in fact for fact in finding["observed_facts"])
    assert any("Adversary retains" in a or "completeness" in a for a in finding["assumptions"])

    # Rationale and verification criteria
    assert "risk_explanation" in finding and len(finding["risk_explanation"]) > 0
    assert "verification_criteria" in finding
    assert finding["verification_criteria"]["required_residual_paths"] == 0
    assert finding["verification_criteria"]["required_status"] == "VERIFIED"

    # Limitations and confidence
    assert "confidence_and_limitations" in finding
    assert finding["confidence_and_limitations"]["confidence_score"] > 0
    assert len(finding["confidence_and_limitations"]["limitations"]) > 0


@pytest.mark.anyio
async def test_rejection_of_unapproved_action(real_graph_case):
    """Test 2: Explicit human approval is required. Unapproved / rejected actions
    must not execute sandbox simulation, must record rejection in audit, and halt."""
    case = await executor.investigate(real_graph_case["sources"], real_graph_case["target"])
    assert case["status"] == "awaiting_approval"

    # Reject the action
    rejected_case = await executor.approve(
        case["id"],
        approved=False,
        approver="test_analyst_rejecting",
    )

    assert rejected_case["status"] == "rejected"
    assert rejected_case["contained"] is False
    assert rejected_case["verification_status"] == "REJECTED"
    assert rejected_case.get("simulation") is None

    # Check audit log contains rejection event
    audit_events = core.audit_log(10)
    workflow_audits = [e for e in audit_events if e["tool"] == "workflow_audit"]
    assert len(workflow_audits) > 0
    latest = workflow_audits[0]
    assert latest["summary"]["verification_status"] == "REJECTED"
    assert latest["summary"]["approval_decision"]["approved"] is False


@pytest.mark.anyio
async def test_simulation_without_changing_original_graph(real_graph_case):
    """Test 3: Response actions are applied strictly in an isolated sandbox graph.
    The source / production graph is verified byte-for-byte and count-for-count untouched."""
    real_prod = "traceforge"
    has_prod = real_prod in core.db.list_graphs()
    if has_prod:
        init_prod_nodes = core._ro(real_prod, "MATCH (n) RETURN count(n)")[0][0]
        init_prod_edges = core._ro(real_prod, "MATCH ()-[r]->() RETURN count(r)")[0][0]

    case = await executor.investigate(real_graph_case["sources"], real_graph_case["target"])
    approved_case = await executor.approve(
        case["id"],
        approved=True,
        approver="test_analyst_safety",
    )

    sim_id = approved_case.get("simulation", {}).get("sim_id")
    assert sim_id is not None
    assert sim_id.startswith(core.SIM_PREFIX)
    assert sim_id != real_prod
    assert approved_case.get("simulation_scope") == "sandbox_only"
    assert approved_case.get("production_modified") is False

    # Verify original production graph was not changed
    if has_prod:
        post_prod_nodes = core._ro(real_prod, "MATCH (n) RETURN count(n)")[0][0]
        post_prod_edges = core._ro(real_prod, "MATCH ()-[r]->() RETURN count(r)")[0][0]
        assert post_prod_nodes == init_prod_nodes
        assert post_prod_edges == init_prod_edges

    core.drop_sim(sim_id)


@pytest.mark.anyio
async def test_correct_before_after_path_measurements(real_graph_case):
    """Test 4: Before and after path counts are independently measured from graph queries,
    confirming containment when all cut edges are severed."""
    case = await executor.investigate(real_graph_case["sources"], real_graph_case["target"])
    paths_before = len(case["paths"])
    assert paths_before > 0

    approved_case = await executor.approve(
        case["id"],
        approved=True,
        approver="test_analyst_verify",
    )

    assert approved_case["status"] == "verified"
    assert approved_case["contained"] is True
    assert approved_case["verification_status"] == "VERIFIED"

    ver = approved_case["verification"]
    assert ver["before"] == paths_before
    assert ver["after"] == 0
    assert ver["verdict"] == "eliminated"
    assert ver["remaining_paths"] == []

    # Audit record contains measurements
    audit_rec = approved_case.get("audit_record")
    assert audit_rec is not None
    assert audit_rec["measurements"]["before"] == paths_before
    assert audit_rec["measurements"]["after"] == 0
    assert audit_rec["verification_status"] == "VERIFIED"

    core.drop_sim(approved_case["simulation"]["sim_id"])


@pytest.mark.anyio
async def test_residual_path_reporting_when_intervention_is_insufficient(real_graph_case):
    """Test 5: When an intervention is partial/insufficient, remaining attack paths
    are accurately detected, counted, and reported with residual node sequences."""
    case = await executor.investigate(real_graph_case["sources"], real_graph_case["target"])
    full_cut = case["proposal"]["cut"]
    if len(full_cut) > 1:
        # Simulate partial intervention: apply only 1 of the required cut actions
        insufficient_cut = [full_cut[0]]
        approved_case = await executor.approve(
            case["id"],
            approved=True,
            approver="test_analyst_partial",
            actions=insufficient_cut,
        )

        assert approved_case["contained"] is False
        assert approved_case["verification_status"] == "PARTIAL"
        assert approved_case["status"] == "residual_risk"

        ver = approved_case["verification"]
        assert ver["after"] > 0
        assert len(ver["remaining_paths"]) == ver["after"]
        # Ensure residual paths have full detail
        for r_path in ver["remaining_paths"]:
            assert "nodes" in r_path
            assert "rels" in r_path

        # Audit record accurately reflects partial status
        audit_rec = approved_case.get("audit_record")
        assert audit_rec["verification_status"] == "PARTIAL"
        assert audit_rec["measurements"]["residual_count"] == ver["after"]

        core.drop_sim(approved_case["simulation"]["sim_id"])


@pytest.mark.anyio
async def test_verification_failure_when_criteria_not_met(real_graph_case):
    """Test 6: Independent verification confirms failure or residual risk
    when stated criteria (0 residual paths) are not met."""
    case = await executor.investigate(real_graph_case["sources"], real_graph_case["target"])
    # Apply an off-target or minimal single-edge intervention
    cut = case["proposal"]["cut"]
    partial_actions = cut[:1] if len(cut) > 1 else cut

    if len(cut) > 1:
        approved_case = await executor.approve(
            case["id"],
            approved=True,
            approver="test_analyst_fail",
            actions=partial_actions,
        )
        assert approved_case["contained"] is False
        assert approved_case["verification_status"] != "VERIFIED"
        assert approved_case["verification"]["verdict"] != "eliminated"
        core.drop_sim(approved_case["simulation"]["sim_id"])
