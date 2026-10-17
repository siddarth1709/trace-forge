from contextlib import asynccontextmanager
import json
import os
import sys
import time
import uuid

try:
    from mcp import ClientSession, StdioServerParameters
    from mcp.client.stdio import stdio_client
except ImportError:
    ClientSession = StdioServerParameters = stdio_client = None

import tf_core as core
import tf_intel as intel

from . import extractor, hypotheses, llm, planner, report

SERVER = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "mcp_server.py")
MAX_STEPS = 12

@asynccontextmanager
async def mcp_session():
    if ClientSession is None or stdio_client is None:
        raise RuntimeError("MCP Python SDK is not installed. Install 'mcp' in Python >= 3.10.")
    params = StdioServerParameters(command=sys.executable, args=[SERVER], env=dict(os.environ))
    async with stdio_client(params) as (read, write):
        async with ClientSession(read, write) as session:
            await session.initialize()
            yield session

def _unwrap(res):
    data = getattr(res, "structuredContent", None)
    if isinstance(data, dict) and set(data) == {"result"} and isinstance(data["result"], dict):
        data = data["result"]
    if not isinstance(data, dict):
        text = "".join(c.text for c in res.content if getattr(c, "type", "") == "text")
        data = json.loads(text) if text else {}
    return data

async def _call(session, tool, args):
    return _unwrap(await session.call_tool(tool, args))

def _breif(tool, r):
    if tool == "get_incident":
        return {"incident": r.get("incident"), "alerted": r.get("alerted_entities") or r.get("altered_entities")}
    if tool == "trace_attack_paths":
        return {"paths": r.get("count")}
    if tool == "get_evidence":
        return {"evidence": len(r.get("evidence", []))}
    if tool == "analyze_connectivity":
        return {"reachable": r.get("reachable"), "min_hops": r.get("min_hops")}
    if tool == "score_risk":
        return {"score": r.get("score"), "version": r.get("version")}
    if tool == "score_hypotheses":
        return {"top": [(h["id"], h["p"]) for h in r.get("scored", [])[:3]], "act": r.get("decision", {}).get("act")}
    if tool == "calculate_containment_cut":
        return {"size": r.get("size"), "disruption": r.get("disruption")}
    return {}

def _after(tool, r, state, case):
    if tool == "get_incident":
        case["incident"] = r
    elif tool == "trace_attack_paths":
        state["paths"] = case["paths"] = r["paths"]
    elif tool == "get_evidence":
        evs = []
        for e in r.get("evidence", []):
            x = extractor.extract(e.get("text", ""))
            quarantined = x["quarantined"] or bool(e.get("untrusted"))
            evs.append({"id": e.get("name"), "source": e.get("evidence_source"), "observed_at": e.get("observed_at"),
            **x, "quarantined": quarantined})
        state["evidence"] = case["evidence"] = evs
        safe = [{"id": e.get("id"), "source": e["source"], "summary": e["summary"]} for e in evs if not e["quarantined"]] 
        state["hypotheses"] = hypotheses.generate({"paths": len(state.get("paths", [])), "evidence": safe})
        state["labels"] = hypotheses.label(state["hypotheses"], evs)
    elif tool == "score_risk":
        case["risk"] = r
    elif tool == "score_hypotheses":
        case["hypotheses"], case["decision"] = r["scored"], r["decision"]
    elif tool == "calculate_containment_cut":
        case["cut"] = r

async def investigate(sources, target):
    case = {"id": uuid.uuid4().hex[:10], "ts": time.time(), "status": "running", "mode": llm.mode(),
                "sources": sources, "target": target, "steps": [], "evidence": [], "hypotheses": [],
                "decision": None, "proposal": None}
    state = {"sources": sources, "target": target, "done": [], "data": {}, "evidence": [], "hypotheses": None, "labels": [], "paths": []}
    async with mcp_session() as session:
        for _ in range(MAX_STEPS):
            step = planner.next_step(state)
            if step["tool"] == "propose":
                break
            tool, args, t0 = step["tool"], planner.args_for(step["tool"], state), time.time()
            result = await _call(session, tool, args)
            ok = "error" not in result
            case["steps"].append({"n": len(case["steps"]) + 1, "tool": tool, "reason": step.get("reason", ""), 
                        "ms": int((time.time() - t0) * 1000), "ok": ok, "result": _breif(tool, result)})
            if not ok:
                case["status"], case["error"] = "error", result["error"]
                break
            state["done"].append(tool)
            state["data"][tool] = result
            _after(tool, result, state, case)
    if case["status"] == "running":
        cut = state["data"].get("calculate_containment_cut", {})
        if (case.get("decision") or {}).get("act") and cut.get("cut"):
            case["proposal"] = {"cut": cut["cut"], "size": cut["size"], "disruption": cut.get("disruption", 0),
                                "paths_before": len(case.get("paths", []))}
            case["status"] = "awaiting_approval"
        else:
            case["status"] = "needs_analyst"
    core.audit("investigate", {"case": case["id"], "sources": sources, "target": target},
        {"status": case["status"], "steps": len(case["steps"])})
    return intel.save_case(case)

async def approve(case_id, approved, approver="analyst"):
    case = intel.load_case(case_id)
    if not case:
        raise LookupError(f"no such case: {case_id}")
    if case["status"] != "awaiting_approval":
        raise core.PolicyError("case is not awaiting approval")
    core.audit("approval", {"case": case_id, "approved": approved, "approver": approver}, {})
    if not approved:
        case["status"] = "rejected"
        return intel.save_case(case)
    args = {"sources": case["sources"], "target": case["target"]}
    async with mcp_session() as session:
        sim = await _call(session, "simulate_containment", {"actions": case["proposal"]["cut"], **args})
        if "error" in sim:
            raise core.PolicyError(sim["error"])
        ver = await _call(session, "verify_containment", {"sim_id": sim["sim_id"], **args})
        if "error" in ver:
            raise core.PolicyError(ver["error"])
    case["simulation"], case["verification"] = sim, ver 
    case["contained"] = (ver.get("after") == 0)
    case["status"] = "verified" if case["contained"] else "residual_risk"
    case["report"] = report.build(case)
    try:
        case["case_graph"] = intel.write_case_graph(case)["case_graph"]
    except Exception as e:
        case["case_graph_error"] = f"{type(e).__name__}: {e}"
    return intel.save_case(case)


    

    