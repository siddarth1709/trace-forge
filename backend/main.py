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
from typing import List, Literal, Optional

from fastapi import FastAPI, HTTPException, Path as PathParam, Query as QueryParam
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, model_validator

import tf_core as core
import tf_intel as intel
from agent import executor, llm
from scenarios.catalog import SCENARIOS

logger = logging.getLogger("traceforge.api")
logging.basicConfig(level=logging.INFO)

app = FastAPI(
    title="TRACEFORGE API",
    description="Graph-powered cybersecurity incident response and simulation simulator",
    version="0.3.0",
)

# CORS configuration for local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
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
def get_schema():
    """Inspect active graph labels, relationship types, and node/edge counts."""
    return _run(core.schema)


@app.get("/graph")
def get_graph():
    """Retrieve full graph view for interactive topology rendering."""
    return _run(core.graph_view)


@app.get("/incident")
def incident():
    """Retrieve alerted entities, incident context, and associated evidence IDs."""
    return _run(intel.get_incident)


@app.post("/paths")
def paths(q: Query):
    """Find all time-ordered attack paths between sources and target."""
    return _run(core.find_paths, q.sources, q.target)


@app.post("/trace")
def trace(q: TraceRequest):
    """Find attack paths with timestamps and confidence, supporting temporal travel."""
    return _run(intel.trace_paths, q.sources, q.target, q.as_of)


@app.post("/evidence")
def evidence(r: EvidenceRequest):
    """Fetch raw evidence records by their identifiers."""
    return _run(intel.get_evidence, r.ids)


@app.post("/risk")
def risk(q: TraceRequest):
    """Calculate deterministic, versioned risk score based on active attack paths."""
    def compute_risk():
        trace_data = intel.trace_paths(q.sources, q.target, q.as_of)
        return intel.risk_score(trace_data["paths"], q.target)

    return _run(compute_risk)


@app.post("/containment/cut")
def cut(q: Query):
    """Calculate minimum-cut containment plan with lowest disruption."""
    return _run(core.min_cut, q.sources, q.target)


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
        contained = (ver.get("after") == 0)
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