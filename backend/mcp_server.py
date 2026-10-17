import functools
from typing import Any, Dict, List, Optional

from mcp.server.fastmcp import FastMCP

import tf_core as core
import tf_intel as intel
from agent import hypotheses as hyp

mcp = FastMCP("traceforge")


def _safe(fn):
    @functools.wraps(fn)
    def inner(*a, **kw):
        try:
            return fn(*a, **kw)
        except core.PolicyError as e:
            return {"error": str(e), "policy": True}
        except ValueError as e:
            return {"error": str(e)}
        except Exception as e:
            return {"error": f"{type(e).__name__}: {e}"}
    return inner


@mcp.tool()
@_safe
def get_incident() -> dict:
    return intel.get_incident()


@mcp.tool()
@_safe
def trace_attack_paths(sources: List[str], target: str, as_of: Optional[int] = None) -> dict:
    return intel.trace_paths(sources, target, as_of)


@mcp.tool()
@_safe
def get_evidence(ids: List[str]) -> dict:
    return intel.get_evidence(ids)


@mcp.tool()
@_safe
def analyze_connectivity(source: str, target: str) -> dict:
    return intel.connectivity(source, target)


@mcp.tool()
@_safe
def score_risk(sources: List[str], target: str) -> dict:
    return intel.risk_score(intel.trace_paths(sources, target)["paths"], target)


@mcp.tool()
@_safe
def score_hypotheses(hypotheses: List[Dict[str, Any]], labels: List[Dict[str, Any]]) -> dict:
    scored = hyp.score(hypotheses, labels)
    return {"scored": scored, "decision": hyp.decision(scored)}


@mcp.tool()
@_safe
def calculate_containment_cut(sources: List[str], target: str) -> dict:
    return core.min_cut(sources, target)


@mcp.tool()
@_safe
def simulate_containment(actions: List[Dict[str, Any]], sources: List[str], target: str) -> dict:
    return core.simulate(actions, sources, target)


@mcp.tool()
@_safe
def verify_containment(sim_id: str, sources: List[str], target: str) -> dict:
    return core.verify(sim_id, sources, target)


@mcp.tool()
@_safe
def drop_sandbox(sim_id: str) -> dict:
    return core.drop_sim(sim_id)


if __name__ == "__main__":
    mcp.run()