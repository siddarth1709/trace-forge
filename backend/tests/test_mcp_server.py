import pytest
import mcp_server as srv

try:
    import tf_core as core
    core.db.list_graphs()
    DB_UP = True
except Exception:
    DB_UP = False

pytestmark = pytest.mark.skipif(not DB_UP, reason="FalkorDB not reachable")


def test_mcp_get_incident():
    res = srv.get_incident()
    assert "error" not in res
    assert "incident" in res


def test_mcp_validation_empty_sources():
    res = srv.trace_attack_paths([], "Critical Server")
    assert "error" in res
    assert res["error"] == "Invalid input."


def test_mcp_validation_duplicate_sources():
    res = srv.trace_attack_paths(["Workstation A", "Workstation A"], "Critical Server")
    assert "error" in res
    assert res["error"] == "Invalid input."


def test_mcp_validation_invalid_timestamp():
    res_neg = srv.trace_attack_paths(["Workstation A"], "Critical Server", as_of=-10)
    assert "error" in res_neg
    assert res_neg["error"] == "Invalid input."

    res_bool = srv.trace_attack_paths(["Workstation A"], "Critical Server", as_of=True)
    assert "error" in res_bool
    assert res_bool["error"] == "Invalid input."

    # Float timestamp must be rejected, not silently truncated
    res_float = srv.trace_attack_paths(["Workstation A"], "Critical Server", as_of=100.5)
    assert "error" in res_float
    assert res_float["error"] == "Invalid input."


def test_mcp_validation_remove_edge_missing_fields():
    res = srv.simulate_containment([{"type": "remove_edge", "src": "Workstation A"}], ["Workstation A"], "Critical Server")
    assert "error" in res
    assert res["error"] == "Invalid input."


def test_mcp_validation_remove_edge_extra_keys_rejected():
    # Extra unexpected key must be rejected by allowlist
    res = srv.simulate_containment(
        [{"type": "remove_edge", "src": "Workstation A", "dst": "Server", "unknown_key": "bad"}],
        ["Workstation A"],
        "Critical Server",
    )
    assert "error" in res
    assert res["error"] == "Invalid input."

    # Node in remove_edge must be rejected
    res_node = srv.simulate_containment(
        [{"type": "remove_edge", "src": "Workstation A", "dst": "Server", "node": "Workstation A"}],
        ["Workstation A"],
        "Critical Server",
    )
    assert "error" in res_node
    assert res_node["error"] == "Invalid input."


def test_mcp_validation_remove_edge_benign_load_bounds():
    # Negative load
    res_neg = srv.simulate_containment(
        [{"type": "remove_edge", "src": "Workstation A", "dst": "Server", "benign_load": -1}],
        ["Workstation A"],
        "Critical Server",
    )
    assert "error" in res_neg
    assert res_neg["error"] == "Invalid input."

    # Excessive load
    res_huge = srv.simulate_containment(
        [{"type": "remove_edge", "src": "Workstation A", "dst": "Server", "benign_load": 999999999}],
        ["Workstation A"],
        "Critical Server",
    )
    assert "error" in res_huge
    assert res_huge["error"] == "Invalid input."

    # Boolean or float load
    res_bool = srv.simulate_containment(
        [{"type": "remove_edge", "src": "Workstation A", "dst": "Server", "benign_load": True}],
        ["Workstation A"],
        "Critical Server",
    )
    assert "error" in res_bool
    assert res_bool["error"] == "Invalid input."


def test_mcp_validation_isolate_node_extra_keys():
    # Extra unexpected key
    res = srv.simulate_containment(
        [{"type": "isolate_node", "node": "Workstation A", "extra_bad": 123}],
        ["Workstation A"],
        "Critical Server",
    )
    assert "error" in res
    assert res["error"] == "Invalid input."

    # src/dst in isolate_node
    res_src = srv.simulate_containment(
        [{"type": "isolate_node", "node": "Workstation A", "src": "Workstation A"}],
        ["Workstation A"],
        "Critical Server",
    )
    assert "error" in res_src
    assert res_src["error"] == "Invalid input."


def test_mcp_drop_sandbox_blocks_production():
    res = srv.drop_sandbox("traceforge")
    assert "error" in res
    assert res["error"] == "Operation rejected by policy."
    assert res.get("policy") is True


def test_mcp_score_risk_with_as_of():
    res = srv.score_risk(["Workstation A"], "Critical Server", as_of=0)
    assert "error" not in res
    assert "score" in res
