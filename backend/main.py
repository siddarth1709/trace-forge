"""TRACEFORGE FastAPI application.

Exposes REST API endpoints for graph investigation, temporal path tracing,
containment planning, sandbox simulation, independent verification, and case approval.

Security & Safety Boundary:
- Response actions are strictly executed in isolated sandbox graphs.
- Production graph is never modified.
- Internal exception details are logged securely and never leaked to API clients.
- All endpoints validate inputs with bounded constraints.
"""
import json
import logging
import os
from typing import Any, List, Literal, Optional, Union

from fastapi import FastAPI, HTTPException, Path as PathParam, Query as QueryParam
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, model_validator


import tf_core as core
import tf_intel as intel
import tf_advanced as advanced
import tf_ingest as ingest

from agent import executor, llm
from scenarios.catalog import SCENARIOS

logger = logging.getLogger("traceforge.api")
logging.basicConfig(level=logging.INFO)

BUSINESS_IMPACT_POLICY = os.path.join(
    os.path.dirname(os.path.abspath(__file__)),
    "policies",
    "business_impact.json",
)


def load_business_impact_policy():
    """Load explicit business-impact assumptions; fail safely if invalid."""
    try:
        with open(BUSINESS_IMPACT_POLICY, "r", encoding="utf-8") as policy_file:
            policy = json.load(policy_file)

        if not isinstance(policy, dict):
            raise ValueError("Policy must be a JSON object")

        if not isinstance(policy.get("relationships", {}), dict):
            raise ValueError("'relationships' must be a JSON object")

        if not isinstance(policy.get("assets", {}), dict):
            raise ValueError("'assets' must be a JSON object")

        return policy

    except (OSError, json.JSONDecodeError, ValueError) as exc:
        logger.error("Business-impact policy could not be loaded: %s", exc)
        raise HTTPException(
            status_code=500,
            detail="Business-impact policy is missing or invalid",
        ) from exc

app = FastAPI(
    title="TRACEFORGE API",
    description="Graph-powered cybersecurity incident response and simulation simulator",
    version="0.3.0",
)

# CORS configuration supporting local development and cloud deployments (Vercel, custom domains)
_cors_origins_env = os.getenv("CORS_ORIGINS", "")
_allowed_origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
]
if _cors_origins_env:
    for _o in _cors_origins_env.split(","):
        if _o.strip():
            _allowed_origins.append(_o.strip())

_allow_all = os.getenv("CORS_ALLOW_ALL", "0").lower() in ("1", "true", "yes")
if _allow_all or "*" in _allowed_origins:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=False,
        allow_methods=["*"],
        allow_headers=["*"],
    )
else:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=_allowed_origins,
        allow_origin_regex=os.getenv("CORS_ORIGIN_REGEX", r"https://.*\.vercel\.app"),
        allow_credentials=True,
        allow_methods=["GET", "POST", "DELETE", "OPTIONS"],
        allow_headers=["*"],
    )

BENCH_FILE = os.path.join(
    os.path.dirname(os.path.abspath(__file__)),
    "eval",
    "results",
    "benchmark.json",
)


# ---- Request / Response Models with Strict Validation
class Query(BaseModel):
    sources: List[str] = Field(
        min_length=1,
        max_length=20,
        description="Starting entities (workstations, footholds, accounts)",
    )
    target: str = Field(
        min_length=1,
        max_length=64,
        description="Critical target asset entity name",
    )
    graph: Optional[str] = Field(
        default=None,
        description="Optional graph identifier (defaults to active graph)",
    )


class TraceRequest(Query):
    as_of: Optional[int] = Field(
        default=None,
        ge=0,
        description="Optional upper timestamp bound for time-travel investigation",
    )



class EvidenceRequest(BaseModel):
    ids: List[str] = Field(
        min_length=1,
        max_length=50,
        description="List of evidence IDs to fetch",
    )
    graph: str = Field(
        default="traceforge",
        description="Graph to read evidence from",
    )



class Action(BaseModel):
    type: Literal["remove_edge", "isolate_node"]
    src: Optional[str] = Field(default=None, min_length=1, max_length=64)
    dst: Optional[str] = Field(default=None, min_length=1, max_length=64)
    rel: Optional[str] = Field(default=None, min_length=1, max_length=40)
    node: Optional[str] = Field(default=None, min_length=1, max_length=64)

    @model_validator(mode="after")
    def validate_action_fields(self):
        if self.type == "remove_edge":
            if not self.src or not self.dst:
                raise ValueError("remove_edge requires both 'src' and 'dst'")
        elif self.type == "isolate_node":
            if not self.node:
                raise ValueError("isolate_node requires 'node'")
        return self


class SimulateRequest(Query):
    actions: List[Action] = Field(
        min_length=1,
        max_length=10,
        description="List of containment actions to simulate in an isolated sandbox",
    )


class VerifyRequest(Query):
    sim_id: str = Field(
        min_length=1,
        max_length=64,
        description="Sandbox graph ID (e.g. tf-sim-xxxxxxxx)",
    )

class MutationRequest(Query):
    mutation_src: str = Field(
        min_length=1,
        max_length=64,
        description="Source entity for the hypothetical attack-pattern mutation",
    )
    mutation_dst: str = Field(
        min_length=1,
        max_length=64,
        description="Destination entity for the hypothetical attack-pattern mutation",
    )
    mutation_rel: str = Field(
        min_length=1,
        max_length=40,
        description="Allowed attack relationship type to add in the sandbox",
    )

class ApproveRequest(BaseModel):
    approve: bool = Field(description="True to approve simulation, False to reject")
    approver: str = Field(
        default="analyst",
        min_length=1,
        max_length=100,
        description="Identifier of the human approving the containment action",
    )


# ---- Safe Execution Wrappers
def _run(fn, *args, **kwargs):
    """Execute synchronous functions with standardized, safe error translation."""
    try:
        return fn(*args, **kwargs)
    except HTTPException:
        raise
    except core.PolicyError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except LookupError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        logger.exception("Unexpected error in API handler: %s", e)
        raise HTTPException(status_code=500, detail="Internal server error")


async def _arun(fn, *args, **kwargs):
    """Execute asynchronous functions with standardized, safe error translation."""
    try:
        return await fn(*args, **kwargs)
    except HTTPException:
        raise
    except core.PolicyError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except LookupError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        logger.exception("Unexpected error in async API handler: %s", e)
        raise HTTPException(status_code=500, detail="Internal server error")


class RiskUncertaintyRequest(BaseModel):
    features: dict = Field(
        description="Risk features with values between 0 and 1"
    )
    uncertainty: dict = Field(
        default_factory=dict,
        description="Optional uncertainty ranges for risk features"
    )
    scenarios: Optional[List[dict]] = Field(
        default=None,
        description="Optional alternative risk-weight scenarios"
    )


class OutcomeMemoryRequest(BaseModel):
    case_id: str = Field(min_length=1, max_length=64)
    decision: str = Field(min_length=1, max_length=300)
    outcome: Literal["successful", "unsuccessful", "inconclusive"]
    verified: bool = False
    notes: str = Field(default="", max_length=1000)


class IngestRequest(BaseModel):
    graph: str = Field(
        default="tf-sim-live",
        min_length=1,
        max_length=64,
        description="Target graph name to ingest endpoints and connections into",
    )
    content: Any = Field(
        description="Raw JSON or CSV content string, or structured object/list"
    )
    format: str = Field(
        default="auto",
        description="Format hint: auto, json, or csv",
    )
    replace: bool = Field(
        default=False,
        description="True to clear and replace graph, False to merge",
    )


# ---- API Endpoints
@app.get("/health")
def health():
    """Health check validating connection to FalkorDB and active graph."""
    def check():
        core.db.select_graph(core.PROD).ro_query("RETURN 1")
        return {
            "status": "ok",
            "graph": core.PROD,
            "name_key": core.NAME_KEY,
            "attack_relationships": core.ATTACK_RELS or "all",
        }

    return _run(check)


@app.get("/mode")
def mode():
    """Check AI agent operation mode (live with LLM or deterministic replay)."""
    return {"mode": llm.mode(), "model": llm.MODEL}


@app.get("/scenarios")
def scenarios():
    """List canned attack scenarios and validation benchmarks."""
    return SCENARIOS


@app.get("/schema")
def get_schema(graph: Optional[str] = None):
    """Inspect active graph labels, relationship types, and node/edge counts."""
    target_graph = graph or core.PROD
    return _run(core.schema, target_graph)


@app.get("/graph")
def get_graph(graph: Optional[str] = None):
    """Retrieve full graph view for interactive topology rendering."""
    target_graph = graph or core.PROD
    return _run(core.graph_view, target_graph)


@app.get("/incident")
def incident():
    """Retrieve alerted entities, incident context, and associated evidence IDs."""
    return _run(intel.get_incident)


@app.post("/paths")
def paths(q: Query):
    """Find all time-ordered attack paths between sources and target."""
    target_graph = q.graph or core.PROD
    return _run(core.find_paths, q.sources, q.target, target_graph)


@app.post("/trace")
def trace(q: TraceRequest):
    """Find attack paths with timestamps and confidence, supporting temporal travel."""
    target_graph = q.graph or core.PROD
    return _run(intel.trace_paths, q.sources, q.target, q.as_of, target_graph)



@app.post("/reconstruct")
def reconstruct(q: TraceRequest):
    """Reconstruct attack paths while explicitly reporting evidence and timeline gaps."""
    target_graph = q.graph or core.PROD
    trace_data = _run(intel.trace_paths, q.sources, q.target, q.as_of, target_graph)

    evidence_ids = sorted({
        evidence_id
        for path in trace_data.get("paths", [])
        for evidence_id in path.get("evidence", [])
        if isinstance(evidence_id, str) and evidence_id.strip()
    })

    evidence_data = (
        _run(intel.get_evidence, evidence_ids, target_graph)
        if evidence_ids
        else {"evidence": []}
    )

    return _run(intel.reconstruct_incident, trace_data, evidence_data)

@app.post("/provenance")
def provenance(q: TraceRequest):
    """Return evidence provenance and traceability for attack paths."""
    target_graph = q.graph or core.PROD
    trace_data = _run(intel.trace_paths, q.sources, q.target, q.as_of, target_graph)

    evidence_ids = sorted({
        evidence_id
        for path in trace_data.get("paths", [])
        for evidence_id in path.get("evidence", [])
        if isinstance(evidence_id, str) and evidence_id.strip()
    })

    evidence_data = (
        _run(intel.get_evidence, evidence_ids, target_graph)
        if evidence_ids
        else {"evidence": []}
    )

    reconstruction = _run(
        intel.reconstruct_incident,
        trace_data,
        evidence_data,
    )

    return _run(intel.build_evidence_provenance, reconstruction)





@app.post("/evidence")
def evidence(r: EvidenceRequest):
    """Fetch evidence records from an explicitly allowed graph."""
    allowed_graphs = {"traceforge", "tf-seed-test"}

    if r.graph not in allowed_graphs:
        raise HTTPException(
            status_code=400,
            detail="Graph is not allowed for evidence retrieval",
        )

    return _run(intel.get_evidence, r.ids, r.graph)



@app.post("/risk")
def risk(q: TraceRequest):
    """Calculate deterministic, versioned risk score based on active attack paths."""
    def compute_risk():
        trace_data = intel.trace_paths(q.sources, q.target, q.as_of)
        return intel.risk_score(trace_data["paths"], q.target)

    return _run(compute_risk)


@app.post("/risk/uncertainty")
def risk_uncertainty(r: RiskUncertaintyRequest):
    """Analyze risk ranges under alternative assumptions; advisory only."""
    return _run(
        advanced.analyze_risk_uncertainty,
        r.features,
        uncertainty=r.uncertainty,
        scenarios=r.scenarios,
    )


class TechniqueMappingRequest(BaseModel):
    observations: List[dict] = Field(
        min_length=1,
        max_length=100,
        description="Observed behaviors with evidence_types fields"
    )


@app.post("/threat-intel/map")
def map_threat_techniques(r: TechniqueMappingRequest):
    """Map evidence-supported observations to candidate ATT&CK techniques."""
    return _run(advanced.map_attack_techniques, r.observations)


class CausalInvestigationRequest(BaseModel):
    events: List[dict] = Field(
        min_length=1,
        max_length=500,
        description="Events with event_id, timestamp, and optional entities"
    )
    max_gap_seconds: int = Field(
        default=3600,
        ge=1,
        le=86400,
        description="Maximum time gap between candidate linked events"
    )


@app.post("/investigate/causal")
def investigate_causality(r: CausalInvestigationRequest):
    """Generate candidate event chains without asserting verified causation."""
    return _run(
        advanced.build_causal_hypotheses,
        r.events,
        max_gap_seconds=r.max_gap_seconds,
    )


class AdversaryArenaRequest(BaseModel):
    scenarios: List[dict] = Field(
        min_length=1,
        max_length=100,
        description="Synthetic scenarios with name, paths_before, and paths_after"
    )


@app.post("/arena/score")
def score_adversary_arena(r: AdversaryArenaRequest):
    """Rank synthetic attack-defense scenarios by residual paths."""
    return _run(advanced.score_adversary_arena, r.scenarios)





@app.post("/recommendations/explain")
def explain_recommendations(q: TraceRequest):
    """Explain risk prioritization and uncertainty; advisory only."""
    def compute_recommendations():
        trace_data = intel.trace_paths(q.sources, q.target, q.as_of)
        return intel.explain_recommendations(
            trace_data["paths"],
            q.target,
        )

    return _run(compute_recommendations)



@app.post("/containment/cut")
def cut(q: Query):
    """Calculate minimum-cut containment plan with lowest disruption."""
    return _run(core.min_cut, q.sources, q.target)


@app.post("/containment/optimize")
def optimize_containment(q: Query):
    """Recommend a containment plan with explicit uncertainty about business impact."""
    plan = _run(core.min_cut, q.sources, q.target)

    if not isinstance(plan, dict):
        raise HTTPException(
            status_code=500,
            detail="Containment optimizer received an unexpected plan",
        )

    cut = plan.get("cut", [])
    policy = load_business_impact_policy()
    policy_version = policy.get("version", "unknown")
    policy_default_status = policy.get("default_status", "unknown")

    recommendations = []
    for action in cut:
        recommendations.append({
            "action": action,
            "security_role": "candidate_attack_path_disruption",
            "business_impact": "unknown",
            "business_impact_reason": (
                "Reliable business-impact metadata has not been established."
            ),
            "automatic_execution": False,
        })

    return {
        "sources": q.sources,
        "target": q.target,
        "candidate_count": len(recommendations),
        "minimum_cut_size": plan.get("size", len(cut)),
        "reported_disruption": plan.get("disruption"),
        "business_impact_status": "unknown_not_verified",
        "business_impact_policy_version": policy_version,
        "business_impact_policy_default_status": policy_default_status,
        "recommendations": recommendations,
        "simulation_required": bool(cut),
        "production_modified": False,
        "note": (
            "Advisory plan only. Reported disruption is based on existing "
            "benign_load values and is not a verified business-impact estimate."
        ),
    }


@app.post("/digital-twin/simulate")
def digital_twin_simulate(r: SimulateRequest):
    """Compare proposed changes against a sandbox copy of the current graph."""
    actions = [a.model_dump(exclude_none=True) for a in r.actions]

    before = _run(core.find_paths, r.sources, r.target)
    simulation = _run(core.simulate, actions, r.sources, r.target)
    sim_id = simulation.get("sim_id")

    if not sim_id:
        raise HTTPException(
            status_code=500,
            detail="Digital Twin simulation did not return a sandbox ID",
        )

    verification = _run(core.verify, sim_id, r.sources, r.target)

    return {
        "feature": "digital_twin",
        "simulation": simulation,
        "baseline_path_count": before.get("count", 0),
        "remaining_path_count": verification.get("after", 0),
        "remaining_paths": verification.get("remaining_paths", []),
        "contained_in_sandbox": verification.get("contained", False),
        "simulation_scope": "sandbox_only",
        "production_modified": False,
        "limitations": [
            "This is a graph-based simulation, not a live network replica.",
            "Results depend on graph completeness and the modeled actions.",
            "No real-world changes are executed.",
        ],
    }


@app.post("/defense/plan")
def defense_plan(q: Query):
    """Propose and verify a defense plan in an isolated sandbox."""
    plan = _run(core.min_cut, q.sources, q.target)
    actions = plan.get("cut", [])

    if not actions:
        return {
            "feature": "closed_loop_defense_planner",
            "plan": plan,
            "simulation": None,
            "verification": None,
            "approval_required": True,
            "automatic_execution": False,
            "production_modified": False,
            "note": "No candidate cut was returned; no simulation was created.",
        }

    simulation = _run(core.simulate, actions, q.sources, q.target)
    sim_id = simulation.get("sim_id")

    if not sim_id:
        raise HTTPException(
            status_code=500,
            detail="Defense-plan simulation did not return a sandbox ID",
        )

    verification = _run(core.verify, sim_id, q.sources, q.target)

    return {
        "feature": "closed_loop_defense_planner",
        "plan": plan,
        "simulation": simulation,
        "verification": verification,
        "approval_required": True,
        "automatic_execution": False,
        "simulation_scope": "sandbox_only",
        "production_modified": False,
        "note": "Human review is required. Sandbox verification does not authorize live changes.",
    }


@app.post("/counterfactual")
def counterfactual(r: SimulateRequest):
    """Compare baseline attack paths with paths after hypothetical sandbox actions."""
    actions = [a.model_dump(exclude_none=True) for a in r.actions]

    # Capture the baseline before creating the sandbox.
    before = _run(core.find_paths, r.sources, r.target)

    # Apply proposed actions only to an isolated simulation graph.
    simulation = _run(core.simulate, actions, r.sources, r.target)
    sim_id = simulation.get("sim_id")

    if not sim_id:
        raise HTTPException(
            status_code=500,
            detail="Counterfactual simulation did not return a sandbox ID",
        )

    # Independently query the sandbox to determine which paths remain.
    verification = _run(core.verify, sim_id, r.sources, r.target)

    return {
        "analysis": "counterfactual",
        "question": "What attack paths remain if the proposed actions are applied?",
        "baseline_paths": before.get("paths", []),
        "baseline_count": before.get("count", 0),
        "hypothetical_actions": actions,
        "simulation": simulation,
        "remaining_paths": verification.get("remaining_paths", []),
        "remaining_count": verification.get("after", 0),
        "verdict": verification.get("verdict"),
        "contained_in_sandbox": verification.get("contained", False),
        "simulation_scope": "sandbox_only",
        "production_modified": False,
        "limitations": [
            "This is a graph-based counterfactual, not proof of real-world containment.",
            "Results depend on the completeness and accuracy of the graph.",
            "The simulation sandbox is retained for inspection.",
        ],
    }

@app.post("/mutation-lab")
def mutation_lab(r: MutationRequest):
    """Explore a hypothetical attack-pattern mutation in an isolated sandbox."""
    return _run(
        core.mutate_pattern,
        r.mutation_src,
        r.mutation_rel,
        r.mutation_dst,
        r.sources,
        r.target,
    )

@app.post("/containment/simulate")
def simulate(r: SimulateRequest):
    """Simulate proposed containment actions in an isolated sandbox graph.

    Production graph is never modified. Returns simulation metadata.
    Does NOT claim containment until verified.
    """
    actions = [a.model_dump(exclude_none=True) for a in r.actions]
    return _run(core.simulate, actions, r.sources, r.target)


@app.post("/containment/verify")
def verify(r: VerifyRequest):
    """Verify in the sandbox whether simulated actions eliminated all attack paths."""
    return _run(core.verify, r.sim_id, r.sources, r.target)

@app.post("/containment/residual-risk")
def residual_risk(r: VerifyRequest):
    """Report remaining attack paths after containment in an isolated sandbox."""
    result = _run(core.verify, r.sim_id, r.sources, r.target)

    if not isinstance(result, dict):
        raise HTTPException(
            status_code=500,
            detail="Residual-risk analysis returned an unexpected result",
        )

    remaining_paths = result.get("remaining_paths", [])

    return {
        "sim_id": result.get("sim_id"),
        "src_graph": result.get("src_graph"),
        "simulation_scope": "sandbox_only",
        "paths_before": result.get("before"),
        "paths_remaining": len(remaining_paths),
        "contained": result.get("contained"),
        "verdict": result.get("verdict"),
        "remaining_paths": remaining_paths,
        "note": (
            "Residual-risk analysis uses the isolated sandbox. "
            "Production graph was not modified."
        ),
    }


@app.post("/containment/auto")
def auto(q: Query):
    """Convenience pipeline: compute min cut, simulate in sandbox, and verify containment.

    Explicitly confirms whether containment succeeded in the sandbox.
    """
    def go():
        plan = core.min_cut(q.sources, q.target)
        if not plan["cut"]:
            return {
                "plan": plan,
                "simulation": None,
                "verification": None,
                "contained": False,
                "note": "no attack path to cut",
                "simulation_scope": "sandbox_only",
            }
        sim = core.simulate(plan["cut"], q.sources, q.target)
        ver = core.verify(sim["sim_id"], q.sources, q.target)
        contained = (
            isinstance(ver, dict)
            and ver.get("contained") is True
            and ver.get("after") == 0
            and ver.get("verdict") == "eliminated"
        )
        return {
            "plan": plan,
            "simulation": sim,
            "verification": ver,
            "contained": contained,
            "status": "verified" if contained else "residual_risk",
            "simulation_scope": "sandbox_only",
            "note": "Containment evaluated in disposable sandbox graph. Production systems are not modified.",
        }

    return _run(go)


@app.delete("/sim/{sim_id}")
def delete_sim(
    sim_id: str = PathParam(
        min_length=1,
        max_length=64,
        description="Sandbox graph ID to delete",
    )
):
    """Drop an isolated sandbox graph after simulation."""
    return _run(core.drop_sim, sim_id)


@app.post("/investigate")
async def investigate(q: Query):
    """Run autonomous investigation agent over MCP to inspect, evaluate, and propose containment."""
    return await _arun(executor.investigate, q.sources, q.target)


@app.post("/cases/{case_id}/approve")
async def approve(
    case_id: str = PathParam(min_length=1, max_length=64),
    r: ApproveRequest = ...,
):
    """Approve or reject a case's containment proposal with human analyst authorization."""
    return await _arun(executor.approve, case_id, r.approve, r.approver)


@app.get("/cases")
def cases(
    limit: int = QueryParam(
        default=50,
        ge=1,
        le=500,
        description="Maximum number of historical cases to retrieve",
    )
):
    """List historical investigation cases."""
    return _run(intel.list_cases, limit)


@app.get("/cases/{case_id}")
def case(case_id: str = PathParam(min_length=1, max_length=64)):
    """Retrieve complete investigation case details including proposal, simulation, and report."""
    def get():
        c = intel.load_case(case_id)
        if not c:
            raise LookupError(f"no such case: {case_id}")
        return c

    return _run(get)

@app.post("/outcomes")
def record_outcome(r: OutcomeMemoryRequest):
    """Record an investigation decision outcome for future advisory learning."""
    return _run(
        intel.record_outcome,
        r.case_id,
        r.decision,
        r.outcome,
        r.verified,
        r.notes,
    )

@app.get("/outcomes")
def get_outcomes(
    limit: int = QueryParam(
        default=50,
        ge=1,
        le=500,
        description="Maximum number of outcome records to retrieve",
    )
):
    """Retrieve recent outcome-memory records."""
    return _run(intel.list_outcomes, limit)

@app.get("/outcomes/summary")
def get_outcome_summary():
    """Summarize recorded outcomes for advisory use only."""
    return _run(intel.summarize_outcomes)

@app.get("/audit")
def get_audit(
    limit: int = QueryParam(
        default=50,
        ge=1,
        le=500,
        description="Maximum number of audit events to retrieve",
    )
):
    """Retrieve immutable security audit trail."""
    return _run(core.audit_log, limit)


@app.get("/benchmark")
def benchmark():
    """Retrieve evaluated benchmark comparing graph agent against flat-log baseline."""
    def read():
        if not os.path.isfile(BENCH_FILE):
            raise LookupError("no benchmark results yet: run python -m eval.run_benchmark first")
        try:
            with open(BENCH_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except (json.JSONDecodeError, UnicodeDecodeError) as e:
            logger.error("Malformed benchmark file at %s: %s", BENCH_FILE, e)
            raise HTTPException(
                status_code=502,
                detail="Benchmark results file is corrupted. Re-run eval.run_benchmark.",
            )
        except OSError as e:
            logger.error("Failed to read benchmark file at %s: %s", BENCH_FILE, e)
            raise HTTPException(status_code=500, detail="Unable to read benchmark results")

    return _run(read)


@app.post("/data/ingest")
def ingest_data(r: IngestRequest):
    """Ingest real security data files (JSON, CSV, logs) into FalkorDB.

    Autoreads connection descriptions into canonical graph relationships (AUTHENTICATES_TO, USES, ACCESSES, REACHES)
    and merges/creates endpoints into the active topology database.
    """
    def do_ingest():
        nodes, edges = ingest.parse_data_content(r.content, format_hint=r.format)
        if not nodes and not edges:
            raise ValueError("No valid endpoints or connections could be parsed from the provided data")
        return ingest.ingest_into_falkordb(r.graph, nodes, edges, replace=r.replace)

    return _run(do_ingest)


@app.get("/data/samples")
def get_sample_datasets():
    """List available realistic security datasets for instant real-data demonstration."""
    data_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data")
    samples = []
    if os.path.isdir(data_dir):
        for fname in sorted(os.listdir(data_dir)):
            if fname.endswith((".json", ".csv")):
                fpath = os.path.join(data_dir, fname)
                try:
                    with open(fpath, "r", encoding="utf-8") as f:
                        raw = f.read()
                    samples.append({
                        "filename": fname,
                        "format": "json" if fname.endswith(".json") else "csv",
                        "size_bytes": os.path.getsize(fpath),
                        "content": raw,
                    })
                except Exception as e:
                    logger.warning("Failed to read sample dataset %s: %s", fname, e)
    return {"samples": samples}