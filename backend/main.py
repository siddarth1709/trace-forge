import json
import os
from typing import List, Literal, Optional
 
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
 
import tf_core as core
import tf_intel as intel
from agent import executor, llm
from scenarios.catalog import SCENARIOS
 
app = FastAPI(title="TRACEFORGE API", version="0.2.0")
app.add_middleware(CORSMiddleware, allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
                   allow_methods=["*"], allow_headers=["*"])
 
BENCH_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "eval", "results", "benchmark.json")
 
 
class Query(BaseModel):
    sources: List[str] = Field(min_length=1, max_length=20)
    target: str
 
 
class TraceRequest(Query):
    as_of: Optional[int] = None

class EvidenceRequest(BaseModel):
    ids: List[str] = Field(min_length=1, max_length=50)

class Action(BaseModel):
    type: Literal["remove_edge", "isolate_node"]
    src: Optional[str] = None
    dst: Optional[str] = None
    node: Optional[str] = None

class SimulateRequest(Query):
    actions: List[Action] = Field(min_length=1, max_length = 10)

class VerifyRequest(Query):
    sim_id: str

class ApproveRequest(BaseModel):
    approve: bool
    approver: str = "analyst"


def _run(fn, *args, **kwargs):
    try:
        return fn(*args, **kwargs)
    except core.PolicyError as e:
        raise HTTPException(status_code = 403, detail = str(e))
    except LookupError as e:
        raise HTTPException(status_code = 404, detail = str(e))
    except ValueError as e:
        raise HTTPException(status_code = 422, detail = str(e))
    except Exception as e:
        raise HTTPException(status_code = 500, detail = f"{type(e).__name__}: {e}")
    
async def _arun(fn, *args, **kwargs):
    try:
        return await fn(*args, **kwargs)
    except core.PolicyError as e:
        raise HTTPException(status_code = 403, detail = str(e))
    except LookupError as e:
        raise HTTPException(status_code = 404, detail = str(e))
    except ValueError as e:
        raise HTTPException(status_code = 422, detail = str(e))
    except Exception as e:
        raise HTTPException(status_code = 500, detail = f"{type(e).__name__}: {e}")
    

@app.get("/health")
def health():
    def check():
        core.db.select_graph(core.PROD).ro_query("RETURN 1")
        return {"status": "ok", "graph": core.PROD, "name_key": core.NAME_KEY,
                "attack_relationships": core.ATTACK_RELS or "all"}

    return _run(check)

        
@app.get("/mode")
def mode():
    return {"mode": llm.mode(), "model": llm.MODEL}

@app.get("/scenarios")
def scenarios():
    return SCENARIOS

@app.get("/schema")
def get_schema():
    return _run(core.schema)

@app.get("/graph")
def get_graph():
    return _run(core.graph_view)


@app.get("/incident")
def incident():
    return _run(intel.get_incident)

@app.post("/paths")
def paths(q: Query):
    return _run(core.find_paths, q.sources, q.target)

@app.post("/trace")
def trace(q: TraceRequest):
    return _run(intel.trace_paths, q.sources, q.target, q.as_of)

@app.post("/evidence")
def evidence(r: EvidenceRequest):
    return _run(intel.get_evidence, r.ids)

@app.post("/risk")
def risk(q: TraceRequest):
    return _run(lambda: intel.risk_score(intel.trace_paths(q.sources, q.target, q.as_of)["paths"], q.target))
    
@app.post("/containment/cut")
def cut(q: Query):
    return _run(core.min_cut, q.sources, q.target)

@app.post("/containment/simulate")
def simulate(r: SimulateRequest):
    actions = [a.model_dump(exclude_none = True) for a in r.actions]
    return _run(core.simulate, actions, r.sources, r.target)

@app.post("/containment/verify")
def verify(r: VerifyRequest):
    return _run(core.verify, r.sim_id, r.sources, r.target)

@app.post("/containment/auto")
def auto(q: Query):
    def go():
        plan = core.min_cut(q.sources, q.target)
        if not plan["cut"]:
            return {"plan": plan, "note": "no attack path to cut"}
        sim = core.simulate(plan["cut"], q.sources, q.target)
        return {"plan": plan, "simulation": sim, "verification": core.verify(sim["sim_id"], q.sources, q.target)}
    return _run(go)

@app.delete("/sim/{sim_id}")
def delete_sim(sim_id: str):
    return _run(core.drop_sim, sim_id)

@app.post("/investigate")
async def investigate(q: Query):
    return await _arun(executor.investigate, q.sources, q.target) 

@app.post("/cases/{case_id}/approve")
async def approve(case_id: str, r: ApproveRequest):
    return await _arun(executor.approve, case_id, r.approve, r.approver)

@app.get("/cases")
def cases(limit: int = 50):
    return _run(intel.list_cases, limit)

@app.get("/cases/{case_id}")
def case(case_id: str):
    def get():
        c = intel.load_case(case_id)
        if not c:
            raise LookupError(f"no such case: {case_id}")
        return c
    return _run(get)    

@app.get("/audit")
def get_audit(limit: int = 50):
    return _run(core.audit_log, limit)

@app.get("/benchmark")
def benchmark():
    def read():
        try:
            with open(BENCH_FILE) as f:
                return json.load(f)
        except OSError:
            raise LookupError("no benchmark results yet: run python -m eval.run_benchmark first")
    return _run(read)