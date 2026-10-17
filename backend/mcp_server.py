"""TRACEFORGE MCP Server.

Exposes bounded, safe MCP tools for investigation, attack-path discovery,
hypothesis evaluation, minimum-cut planning, sandbox simulation, and independent verification.

Safety guarantees:
- All tool inputs are strictly bounded and validated.
- Entity IDs with spaces, hyphens, and common punctuation are supported.
- Unhandled internal errors and policy rejections return generic messages without leaking internal details.
- Containment actions use strict allowlists and bounded numerical values.
- Production graph modification is blocked at both MCP and core layers.
"""
import functools
import logging
import re
from typing import Any, Dict, List, Optional

try:
    from mcp.server.fastmcp import FastMCP
    mcp = FastMCP("traceforge")
except ImportError:
    # Fallback for environments without MCP SDK installed
    class DummyFastMCP:
        def __init__(self, *args, **kwargs):
            pass

        def tool(self):
            return lambda fn: fn

        def run(self):
            raise RuntimeError(
                "Cannot run standalone MCP server: 'mcp' SDK is not installed in this Python environment. "
                "Install backend requirements using Python >= 3.10 to run as an MCP server daemon."
            )

    mcp = DummyFastMCP()

import tf_core as core
import tf_intel as intel
from agent import hypotheses as hyp

logger = logging.getLogger("traceforge.mcp")

# Keep limits bounded so a malformed request cannot trigger an
# unexpectedly expensive graph operation.
MAX_ENTITIES = 50
MAX_EVIDENCE_IDS = 50
MAX_HYPOTHESES = 100
MAX_LABELS = 100
MAX_ACTIONS = 10
MAX_ID_LENGTH = 256
MAX_BENIGN_LOAD = 100000

# Accept ordinary graph/entity identifiers (including spaces, e.g. "Workstation A", "Critical Server")
_ID_PATTERN = re.compile(r"^[A-Za-z0-9 ._:@/-]{1,256}$")


def _error(message: str, *, policy: bool = False) -> Dict[str, Any]:
    """Format standardized safe error responses for MCP tools."""
    result: Dict[str, Any] = {"error": message}
    if policy:
        result["policy"] = True
    return result


def _safe(fn):
    """Prevent internal exception details from leaking through MCP.
    
    Logs technical exceptions server-side and returns generic client-facing errors.
    """
    @functools.wraps(fn)
    def inner(*args, **kwargs):
        try:
            return fn(*args, **kwargs)
        except core.PolicyError as exc:
            logger.warning("MCP policy check rejected tool %s: %s", fn.__name__, exc)
            return _error("Operation rejected by policy.", policy=True)
        except (ValueError, TypeError) as exc:
            logger.info("Invalid input for MCP tool %s: %s: %s", fn.__name__, type(exc).__name__, exc)
            return _error("Invalid input.")
        except LookupError as exc:
            logger.info("Requested resource unavailable in MCP tool %s: %s: %s", fn.__name__, type(exc).__name__, exc)
            return _error("Requested resource was not found.")
        except Exception:
            logger.exception("Unexpected error in MCP tool %s", fn.__name__)
            return _error("Internal tool error occurred while processing graph operation.")

    return inner


def _validate_id(value: Any, field: str) -> str:
    """Validate a single entity, evidence, or sandbox identifier."""
    if not isinstance(value, str):
        raise ValueError(f"{field} must be a string.")

    cleaned = value.strip()
    if (
        not cleaned
        or len(cleaned) > MAX_ID_LENGTH
        or not _ID_PATTERN.fullmatch(cleaned)
    ):
        raise ValueError(f"{field} is invalid or exceeds {MAX_ID_LENGTH} characters.")

    return cleaned


def _validate_ids(
    values: Any,
    field: str,
    *,
    maximum: int = MAX_ENTITIES,
) -> List[str]:
    """Validate a non-empty list of unique identifiers."""
    if not isinstance(values, list):
        raise ValueError(f"{field} must be a list of identifiers.")

    if not values or len(values) > maximum:
        raise ValueError(f"{field} must contain between 1 and {maximum} items.")

    validated = [_validate_id(v, field) for v in values]

    if len(set(validated)) != len(validated):
        raise ValueError(f"{field} must not contain duplicate items.")

    return validated


def _validate_time(as_of: Any) -> Optional[int]:
    """Validate optional timestamp filter. Strictly accepts non-negative integers (rejects floats/bools)."""
    if as_of is None:
        return None

    # In Python, bool is a subclass of int, so reject it explicitly. Reject floats to avoid silent truncation.
    if isinstance(as_of, bool) or not isinstance(as_of, int) or as_of < 0:
        raise ValueError("as_of must be a non-negative integer timestamp.")

    return as_of


def _validate_actions(actions: Any) -> List[Dict[str, Any]]:
    """Validate containment actions against strict key allowlists and bounded values."""
    if not isinstance(actions, list) or not (1 <= len(actions) <= MAX_ACTIONS):
        raise ValueError(f"actions must contain between 1 and {MAX_ACTIONS} items.")

    validated = []
    for action in actions:
        if not isinstance(action, dict):
            raise ValueError("Each action must be a dictionary object.")

        action_type = action.get("type")
        if action_type == "remove_edge":
            allowed_keys = {"type", "src", "dst", "rel", "benign_load"}
            extra = set(action) - allowed_keys
            if extra:
                raise ValueError(f"remove_edge contains unexpected fields: {sorted(extra)}")

            if not action.get("src") or not action.get("dst"):
                raise ValueError("remove_edge requires both 'src' and 'dst'.")

            item: Dict[str, Any] = {
                "type": "remove_edge",
                "src": _validate_id(action["src"], "src"),
                "dst": _validate_id(action["dst"], "dst"),
            }
            if "rel" in action and action["rel"] is not None:
                item["rel"] = _validate_id(action["rel"], "rel")

            if "benign_load" in action and action["benign_load"] is not None:
                load = action["benign_load"]
                if isinstance(load, bool) or not isinstance(load, int) or not (0 <= load <= MAX_BENIGN_LOAD):
                    raise ValueError(f"benign_load must be an integer between 0 and {MAX_BENIGN_LOAD}.")
                item["benign_load"] = load

            validated.append(item)

        elif action_type == "isolate_node":
            allowed_keys = {"type", "node"}
            extra = set(action) - allowed_keys
            if extra:
                raise ValueError(f"isolate_node contains unexpected fields: {sorted(extra)}")

            if not action.get("node"):
                raise ValueError("isolate_node requires 'node'.")

            validated.append({
                "type": "isolate_node",
                "node": _validate_id(action["node"], "node"),
            })
        else:
            raise ValueError(f"Unsupported containment action type: {action_type!r}")

    return validated


@mcp.tool()
@_safe
def get_incident() -> dict:
    """Retrieve the current active security incident, severity, alerted entities, and evidence IDs."""
    return intel.get_incident()


@mcp.tool()
@_safe
def trace_attack_paths(
    sources: List[str],
    target: str,
    as_of: Optional[int] = None,
) -> dict:
    """Trace all time-ordered attack paths from starting sources to the target asset. Supports as_of time-travel."""
    sources = _validate_ids(sources, "sources")
    target = _validate_id(target, "target")
    as_of = _validate_time(as_of)

    return intel.trace_paths(sources, target, as_of)


@mcp.tool()
@_safe
def get_evidence(ids: List[str]) -> dict:
    """Retrieve evidence records by evidence IDs, including source telemetry and observed text."""
    if not isinstance(ids, list):
        raise ValueError("ids must be a list of identifiers.")
    if not ids:
        return {"evidence": []}
    ids = _validate_ids(ids, "ids", maximum=MAX_EVIDENCE_IDS)
    return intel.get_evidence(ids)


@mcp.tool()
@_safe
def analyze_connectivity(source: str, target: str) -> dict:
    """Analyze topological graph connectivity, reachability, path count, and minimum hops between two entities."""
    source = _validate_id(source, "source")
    target = _validate_id(target, "target")

    return intel.connectivity(source, target)


@mcp.tool()
@_safe
def score_risk(
    sources: List[str],
    target: str,
    as_of: Optional[int] = None,
) -> dict:
    """Calculate deterministic, versioned risk score based on attack paths traced from sources to target."""
    sources = _validate_ids(sources, "sources")
    target = _validate_id(target, "target")
    as_of = _validate_time(as_of)

    traced = intel.trace_paths(sources, target, as_of)
    paths = traced.get("paths")
    if not isinstance(paths, list):
        raise ValueError("Path tracing returned an invalid result.")

    return intel.risk_score(paths, target)


@mcp.tool()
@_safe
def score_hypotheses(
    hypotheses: List[Dict[str, Any]],
    labels: List[Dict[str, Any]],
) -> dict:
    """Score competing hypotheses against evidence labels using Bayesian updates and determine whether to act."""
    if not isinstance(hypotheses, list) or not (1 <= len(hypotheses) <= MAX_HYPOTHESES):
        raise ValueError(f"hypotheses must contain between 1 and {MAX_HYPOTHESES} items.")

    if not isinstance(labels, list) or len(labels) > MAX_LABELS:
        raise ValueError(f"labels must contain at most {MAX_LABELS} items.")

    if not all(isinstance(item, dict) for item in hypotheses):
        raise ValueError("Each hypothesis must be a dictionary object.")

    if not all(isinstance(item, dict) for item in labels):
        raise ValueError("Each label must be a dictionary object.")

    scored = hyp.score(hypotheses, labels)
    return {
        "scored": scored,
        "decision": hyp.decision(scored),
    }


@mcp.tool()
@_safe
def calculate_containment_cut(
    sources: List[str],
    target: str,
) -> dict:
    """Calculate proposed minimum-cut containment plan to disrupt attack paths. Does not execute containment."""
    sources = _validate_ids(sources, "sources")
    target = _validate_id(target, "target")

    return core.min_cut(sources, target)


@mcp.tool()
@_safe
def simulate_containment(
    actions: List[Dict[str, Any]],
    sources: List[str],
    target: str,
) -> dict:
    """Simulate proposed containment actions in an isolated sandbox graph. Production graph is never modified."""
    actions = _validate_actions(actions)
    sources = _validate_ids(sources, "sources")
    target = _validate_id(target, "target")

    return core.simulate(actions, sources, target)


@mcp.tool()
@_safe
def verify_containment(
    sim_id: str,
    sources: List[str],
    target: str,
) -> dict:
    """Independently verify whether simulated containment in a sandbox graph eliminated all attack paths."""
    sim_id = _validate_id(sim_id, "sim_id")
    sources = _validate_ids(sources, "sources")
    target = _validate_id(target, "target")

    return core.verify(sim_id, sources, target)


@mcp.tool()
@_safe
def drop_sandbox(sim_id: str) -> dict:
    """Delete an isolated simulation sandbox graph after verification. Protected by policy checks."""
    sim_id = _validate_id(sim_id, "sim_id")
    return core.drop_sim(sim_id)


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    mcp.run()
