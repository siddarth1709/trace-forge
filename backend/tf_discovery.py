
"""
TRACEFORGE endpoint discovery and relationship detection.

Accepts inventory records and observed authentication events.
Does not scan networks or invent authentication relationships.
"""

from datetime import datetime, timezone
from ipaddress import ip_address
from typing import Any
import re


def normalize_endpoint(record: dict[str, Any]) -> dict[str, Any]:
    """Validate and normalize an endpoint inventory record."""
    hostname = str(record.get("hostname", "")).strip()
    endpoint_id = str(record.get("endpoint_id", "")).strip()

    if not hostname or not endpoint_id:
        raise ValueError("hostname and endpoint_id are required")

    # Keep graph identifiers predictable and avoid unsafe characters.
    if not re.fullmatch(r"[A-Za-z0-9._:-]{1,128}", endpoint_id):
        raise ValueError("Invalid endpoint_id")

    ip = record.get("ip_address")
    if ip:
        ip = str(ip_address(str(ip)))

    return {
        "id": endpoint_id,
        "name": hostname,
        "ip_address": ip or "",
        "os": str(record.get("os", "unknown"))[:100],
        "domain": str(record.get("domain", ""))[:255],
        "source": str(record.get("source", "authorized_inventory"))[:100],
        "observed_at": datetime.now(timezone.utc).isoformat(),
    }


def normalize_auth_event(event: dict[str, Any]) -> dict[str, Any]:
    """
    Normalize an authentication event from an authorized log source.

    source_endpoint_id: endpoint initiating the authentication
    target_endpoint_id: endpoint receiving the authentication
    account: identity used in the event
    """
    source_id = str(event.get("source_endpoint_id", "")).strip()
    target_id = str(event.get("target_endpoint_id", "")).strip()
    account = str(event.get("account", "")).strip()

    if not source_id or not target_id or not account:
        raise ValueError(
            "source_endpoint_id, target_endpoint_id, and account are required"
        )

    if source_id == target_id:
        raise ValueError("Self-authentication relationships are not accepted")

    return {
        "source_id": source_id,
        "target_id": target_id,
        "account": account[:255],
        "event_id": str(event.get("event_id", ""))[:128],
        "event_type": str(event.get("event_type", "authentication"))[:100],
        "result": str(event.get("result", "unknown"))[:50],
        "source": str(event.get("source", "authorized_auth_log"))[:100],
        "observed_at": str(
            event.get("observed_at")
            or datetime.now(timezone.utc).isoformat()
        )[:100],
    }


def build_relationship_candidate(
    event: dict[str, Any],
    known_endpoint_ids: set[str],
) -> dict[str, Any]:
    """
    Return an evidence-backed candidate; do not write to the graph here.
    """
    normalized = normalize_auth_event(event)

    missing = [
        endpoint_id
        for endpoint_id in (
            normalized["source_id"],
            normalized["target_id"],
        )
        if endpoint_id not in known_endpoint_ids
    ]

    return {
        "relationship": "AUTHENTICATES_TO",
        "source_endpoint_id": normalized["source_id"],
        "target_endpoint_id": normalized["target_id"],
        "account": normalized["account"],
        "evidence": {
            "event_id": normalized["event_id"],
            "event_type": normalized["event_type"],
            "result": normalized["result"],
            "source": normalized["source"],
            "observed_at": normalized["observed_at"],
        },
        "status": "needs_endpoint_mapping" if missing else "candidate",
        "missing_endpoint_ids": missing,
        "note": (
            "A candidate derived from a supplied event; validate event "
            "semantics before treating it as a confirmed relationship."
        ),
    }
