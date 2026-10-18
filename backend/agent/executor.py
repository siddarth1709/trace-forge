"""TRACEFORGE investigation executor.

All response actions are simulated in a sandbox graph.
A case is marked verified only when a fresh verification result
confirms that no attack paths remain.
"""

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
    ClientSession = None
    StdioServerParameters = None
    stdio_client = None

import mcp_server
import tf_core as core
import tf_intel as intel

from . import extractor, hypotheses, llm, planner, report


import logging

logger = logging.getLogger("traceforge.executor")

SERVER = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "mcp_server.py",
)
MAX_STEPS = 12


class LocalMcpSession:
    """In-process tool executor used strictly for testing or when MCP SDK is unavailable.

    Explicitly marks all executed operations as running in test fallback mode.
    """
    mode = "local_testing_fallback"
    is_fallback = True

    async def call_tool(self, tool, arguments=None):
        arguments = arguments or {}
        fn = getattr(mcp_server, tool, None)
        if fn is None:
            return {"error": f"Tool '{tool}' not found on MCP server."}
        try:
            return fn(**arguments)
        except Exception as exc:
            logger.exception("In-process tool call '%s' raised exception", tool)
            return {"error": f"Tool execution failed: {type(exc).__name__}: {exc}"}


@asynccontextmanager
async def mcp_session():
    """Start the local MCP server and open a client session, or fallback to in-process execution."""
    if (
        ClientSession is not None
        and StdioServerParameters is not None
        and stdio_client is not None
        and os.path.isfile(SERVER)
        and os.getenv("TF_USE_LOCAL_MCP") != "1"
    ):
        started = False
        try:
            params = StdioServerParameters(
                command=sys.executable,
                args=[SERVER],
                env=dict(os.environ),
            )
            async with stdio_client(params) as (read, write):
                async with ClientSession(read, write) as session:
                    session.mode = "mcp_daemon"
                    session.is_fallback = False
                    await session.initialize()
                    started = True
                    yield session
                    return
        except Exception as exc:
            if started:
                # The error came from the caller's body, not from starting the daemon.
                # Re-raise it. Yielding a second session here would mask it with
                # "generator didn't stop after athrow()".
                raise
            logger.warning(
                "MCP stdio session initialization failed: %s; falling back to local runner",
                exc,
            )

    logger.warning("Operating in LocalMcpSession fallback mode (testing only; MCP daemon not active).")
    yield LocalMcpSession()


def _unwrap(result):
    """Convert MCP tool output into a Python dictionary."""
    if isinstance(result, dict):
        return result
    if getattr(result, "isError", False):
        messages = [
            item.text
            for item in (getattr(result, "content", None) or [])
            if getattr(item, "type", None) == "text"
        ]
        return {
            "error": "; ".join(messages) or "MCP tool returned an error"
        }

    data = getattr(result, "structuredContent", None)

    if isinstance(data, dict):
        # Some MCP SDK versions wrap structured output in {"result": ...}.
        if (
            set(data) == {"result"}
            and isinstance(data.get("result"), dict)
        ):
            data = data["result"]

        return data

    messages = [
        item.text
        for item in (getattr(result, "content", None) or [])
        if getattr(item, "type", None) == "text"
    ]

    if not messages:
        return {}

    text = "\n".join(messages)

    try:
        data = json.loads(text)
    except (json.JSONDecodeError, TypeError):
        return {"error": text[:1000]}

    if isinstance(data, dict):
        if (
            set(data) == {"result"}
            and isinstance(data.get("result"), dict)
        ):
            return data["result"]
        return data

    return {"error": "MCP tool returned an unexpected response format"}


async def _call(session, tool, arguments):
    """Call an MCP tool and normalize its response."""
    try:
        result = await session.call_tool(tool, arguments)
        return _unwrap(result)
    except Exception as exc:
        return {
            "error": f"{tool} failed: {type(exc).__name__}: {exc}"
        }


def _brief(tool, result):
    """Keep the investigation trace compact and JSON-friendly."""
    if tool == "get_incident":
        return {
            "incident": result.get("incident"),
            "alerted": (
                result.get("alerted_entities")
                or result.get("altered_entities")
                or []
            ),
        }

    if tool == "trace_attack_paths":
        return {"paths": result.get("count", 0)}

    if tool == "get_evidence":
        return {
            "evidence": len(result.get("evidence") or [])
        }

    if tool == "analyze_connectivity":
        return {
            "reachable": result.get("reachable"),
            "min_hops": result.get("min_hops"),
        }

    if tool == "score_risk":
        return {
            "score": result.get("score"),
            "version": result.get("version"),
        }

    if tool == "score_hypotheses":
        return {
            "top": [
                (item.get("id"), item.get("p"))
                for item in (result.get("scored") or [])[:3]
            ],
            "act": (result.get("decision") or {}).get("act"),
        }

    if tool == "calculate_containment_cut":
        return {
            "size": result.get("size"),
            "disruption": result.get("disruption"),
        }

    return {}


def _normalize_evidence(item, index):
    """Give every evidence item a stable ID and safe default fields."""
    raw_id = (
        item.get("id")
        or item.get("evidence_id")
        or item.get("name")
        or f"EV-{index:03d}"
    )

    evidence_id = str(raw_id).strip()[:128]
    if not evidence_id:
        evidence_id = f"EV-{index:03d}"

    raw_text = item.get("text") or item.get("summary") or ""
    extracted = extractor.extract(str(raw_text))

    quarantined = (
        bool(extracted.get("quarantined"))
        or bool(extracted.get("flagged"))
        or bool(item.get("untrusted"))
        or bool(item.get("quarantined"))
    )

    # evidence_source (edr, auth-log, ...) drives reliability weighting. The generic
    # "source" property is 'synthetic' on every seeded node, so it must come second.
    source = (
        item.get("evidence_source")
        or item.get("source")
        or "unknown"
    )

    # Do not expose the original untrusted text to hypothesis labeling.
    summary = (
        "[withheld: untrusted evidence]"
        if quarantined
        else extracted.get("summary", "")
    )

    return {
        "id": evidence_id,
        "source": str(source)[:100],
        "observed_at": item.get("observed_at"),
        "summary": summary,
        "entities": [] if quarantined else extracted.get("entities", []),
        "quarantined": quarantined,
        "flagged": bool(extracted.get("flagged")),
    }


def _after(tool, result, state, case):
    """Apply successful tool results to the investigation state."""
    if tool == "get_incident":
        case["incident"] = result

    elif tool == "trace_attack_paths":
        paths = result.get("paths")
        if not isinstance(paths, list):
            raise ValueError(
                "trace_attack_paths did not return a paths list"
            )

        state["paths"] = paths
        case["paths"] = paths

    elif tool == "get_evidence":
        raw_evidence = result.get("evidence") or []
        if not isinstance(raw_evidence, list):
            raise ValueError("get_evidence returned an invalid evidence list")

        evidence = [
            _normalize_evidence(item, index)
            for index, item in enumerate(raw_evidence, start=1)
            if isinstance(item, dict)
        ]

        # Make IDs unique, even if the source contains duplicates.
        seen = set()
        for item in evidence:
            original = item["id"]
            candidate = original
            suffix = 2
            while candidate in seen:
                candidate = f"{original}-{suffix}"
                suffix += 1
            item["id"] = candidate
            seen.add(candidate)

        state["evidence"] = evidence
        case["evidence"] = evidence

        # Only non-quarantined evidence may influence hypotheses.
        safe_evidence = [
            {
                "id": item["id"],
                "source": item["source"],
                "summary": item["summary"],
            }
            for item in evidence
            if not item["quarantined"]
        ]

        state["hypotheses"] = hypotheses.generate(
            {
                "paths": len(state.get("paths", [])),
                "evidence": safe_evidence,
            }
        )

        state["labels"] = hypotheses.label(
            state["hypotheses"],
            evidence,
        )

    elif tool == "score_risk":
        case["risk"] = result

    elif tool == "score_hypotheses":
        scored = result.get("scored")
        decision = result.get("decision")

        if not isinstance(scored, list) or not isinstance(decision, dict):
            raise ValueError(
                "score_hypotheses returned an invalid result"
            )

        case["hypotheses"] = scored
        case["decision"] = decision

    elif tool == "calculate_containment_cut":
        case["cut"] = result


async def investigate(sources, target):
    """Run an investigation and return an analyst-approval proposal."""
    if isinstance(sources, str):
        raise ValueError("sources must be a list of entity names")

    sources = list(dict.fromkeys(sources or []))
    if not sources:
        raise ValueError("At least one source entity is required")

    if not isinstance(target, str) or not target.strip():
        raise ValueError("A target entity is required")

    target = target.strip()

    case = {
        "id": uuid.uuid4().hex[:10],
        "ts": time.time(),
        "status": "running",
        "mode": llm.mode(),
        "sources": sources,
        "target": target,
        "steps": [],
        "paths": [],
        "evidence": [],
        "hypotheses": [],
        "decision": None,
        "proposal": None,
    }

    state = {
        "sources": sources,
        "target": target,
        "done": [],
        "data": {},
        "evidence": [],
        "hypotheses": None,
        "labels": [],
        "paths": [],
    }

    try:
        async with mcp_session() as session:
            case["mcp_mode"] = getattr(session, "mode", "mcp_daemon")
            for _ in range(MAX_STEPS):
                step = planner.next_step(state)
                tool = step.get("tool")

                if tool == "propose":
                    break

                if not isinstance(tool, str) or not tool:
                    raise ValueError("Planner returned an invalid tool name")

                arguments = planner.args_for(tool, state)
                started = time.time()
                result = await _call(session, tool, arguments)

                ok = "error" not in result
                case["steps"].append(
                    {
                        "n": len(case["steps"]) + 1,
                        "tool": tool,
                        "reason": str(step.get("reason", ""))[:200],
                        "ms": int((time.time() - started) * 1000),
                        "ok": ok,
                        "result": _brief(tool, result),
                    }
                )

                if not ok:
                    case["status"] = "error"
                    case["error"] = result["error"]
                    break

                _after(tool, result, state, case)
                state["done"].append(tool)
                state["data"][tool] = result

        if case["status"] == "running":
            cut_result = state["data"].get(
                "calculate_containment_cut", {}
            )
            decision = case.get("decision") or {}
            cut = cut_result.get("cut") or []

            # A cut is a proposal, not proof of containment.
            if decision.get("act") is True and cut:
                case["proposal"] = {
                    "cut": cut,
                    "size": len(cut),
                    "disruption": cut_result.get("disruption", 0),
                    "paths_before": len(case.get("paths", [])),
                }
                case["status"] = "awaiting_approval"
            else:
                case["status"] = "needs_analyst"

    except Exception as exc:
        case["status"] = "error"
        case["error"] = f"{type(exc).__name__}: {exc}"

    try:
        core.audit(
            "investigate",
            {
                "case": case["id"],
                "sources": sources,
                "target": target,
            },
            {
                "status": case["status"],
                "steps": len(case["steps"]),
            },
        )
    except Exception:
        # Do not hide the original investigation result if auditing fails.
        case["audit_warning"] = "Investigation audit write failed."

    return intel.save_case(case)


async def approve(case_id, approved, approver="analyst"):
    """Approve or reject a proposal; approved actions remain sandbox-only."""
    case = intel.load_case(case_id)

    if not case:
        raise LookupError(f"No such case: {case_id}")

    if case.get("status") != "awaiting_approval":
        raise core.PolicyError("Case is not awaiting approval")

    if not isinstance(approved, bool):
        raise ValueError("approved must be a boolean")

    core.audit(
        "approval",
        {
            "case": case_id,
            "approved": approved,
            "approver": approver,
        },
        {},
    )

    if not approved:
        case["status"] = "rejected"
        case["contained"] = False
        return intel.save_case(case)

    proposal = case.get("proposal") or {}
    actions = proposal.get("cut") or []

    if not actions:
        raise core.PolicyError("Cannot approve an empty containment proposal")

    arguments = {
        "sources": case["sources"],
        "target": case["target"],
    }

    try:
        async with mcp_session() as session:
            case["mcp_mode"] = getattr(session, "mode", "mcp_daemon")
            simulation = await _call(
                session,
                "simulate_containment",
                {"actions": actions, **arguments},
            )

            if "error" in simulation:
                raise core.PolicyError(simulation["error"])

            sim_id = simulation.get("sim_id")
            if not isinstance(sim_id, str) or not sim_id:
                raise core.PolicyError(
                    "Simulation did not return a valid sandbox ID"
                )

            verification = await _call(
                session,
                "verify_containment",
                {"sim_id": sim_id, **arguments},
            )

            if "error" in verification:
                raise core.PolicyError(verification["error"])

        # Defense-in-depth: verification must match the intended sandbox ID
        if verification.get("sim_id") != sim_id:
            raise core.PolicyError(
                "Verification result does not match the simulated sandbox ID"
            )

        # Require explicit, internally consistent verification fields.
        before = verification.get("before")
        after = verification.get("after")
        remaining = verification.get("remaining_paths")

        valid_counts = (
            isinstance(before, int)
            and not isinstance(before, bool)
            and isinstance(after, int)
            and not isinstance(after, bool)
            and before >= 0
            and after >= 0
        )

        if not valid_counts or not isinstance(remaining, list):
            raise core.PolicyError(
                "Verification returned incomplete or invalid results"
            )

        if len(remaining) != after:
            raise core.PolicyError(
                "Verification count does not match the returned remaining paths"
            )

        if after == 0 and before == 0:
            raise core.PolicyError(
                "No initial attack paths were found; containment cannot be credited"
            )

        contained = after == 0 and before > 0

        case["simulation"] = simulation
        case["verification"] = verification
        case["contained"] = contained
        case["status"] = "verified" if contained else "residual_risk"
        case["report"] = report.build(case)

        try:
            graph_result = intel.write_case_graph(case)
            case["case_graph"] = graph_result.get("case_graph")
        except Exception as exc:
            case["case_graph_error"] = (
                f"{type(exc).__name__}: {exc}"
            )

        return intel.save_case(case)

    except core.PolicyError as exc:
        logger.warning("Approval policy check failed for case %s: %s", case_id, exc)
        case["status"] = "approval_failed"
        case["error"] = f"Approval policy check failed: {exc}"
        intel.save_case(case)
        raise
    except LookupError as exc:
        logger.warning("Approval resource lookup failed for case %s: %s", case_id, exc)
        case["status"] = "approval_failed"
        case["error"] = "Required simulation resource was not found."
        intel.save_case(case)
        raise
    except ValueError as exc:
        logger.warning("Approval validation failed for case %s: %s", case_id, exc)
        case["status"] = "approval_failed"
        case["error"] = "Invalid approval input."
        intel.save_case(case)
        raise
    except Exception as exc:
        logger.exception("Unexpected error during approval for case %s", case_id)
        case["status"] = "approval_failed"
        case["error"] = "Internal error occurred during containment simulation."
        intel.save_case(case)
        raise
