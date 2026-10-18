import pytest
import tf_core as core
import tf_ingest as ingest


def test_autoread_connection_heuristics():
    # USES heuristic (credentials/dump/lsass)
    rel, props = ingest.autoread_connection(
        "Mimikatz memory dump extracted cached domain credentials from LSASS process memory",
        default_load=5,
    )
    assert rel == "USES"
    assert props["benign_load"] == 5

    # AUTHENTICATES_TO heuristic (kerberos/rdp/session)
    rel, props = ingest.autoread_connection(
        "Kerberos authenticated sign-in session established to IT Jump Host via RDP on port 3389 [EV-AUTH-102]",
        default_load=2,
    )
    assert rel == "AUTHENTICATES_TO"
    assert props["port"] == 3389
    assert props["protocol"] == "KERBEROS"
    assert props["evidence_id"] == "EV-AUTH-102"
    assert props["benign_load"] == 2

    # ACCESSES heuristic (sql/database/postgres/port)
    rel, props = ingest.autoread_connection(
        "Domain Administrator session opened to SQL financial database port 1433 with load=42",
    )
    assert rel == "ACCESSES"
    assert props["port"] == 1433
    assert props["benign_load"] == 42

    # REACHES heuristic (network/route/tunnel)
    rel, props = ingest.autoread_connection(
        "Network tunnel routed traffic from gateway to web cluster",
        default_load=10,
    )
    assert rel == "REACHES"
    assert props["benign_load"] == 10


def test_infer_endpoint_type():
    assert ingest.infer_endpoint_type("Phished-Laptop-HR04") == ("Workstation", "workstation")
    assert ingest.infer_endpoint_type("DC-CORP-PRIMARY") == ("Server", "server")
    assert ingest.infer_endpoint_type("Cached-Domain-Creds") == ("Credential", "credential")
    assert ingest.infer_endpoint_type("AD-Sync-Service-Account") == ("Account", "service_account")


def test_parse_json_and_csv():
    raw_json = """
    {
      "nodes": [{"name": "Host-A", "type": "workstation"}],
      "edges": [
        {
          "src": "Host-A",
          "dst": "Server-B",
          "description": "Kerberos ticket requested for host connection on port 88",
          "load": 3,
          "evidence_id": "EV-999"
        }
      ]
    }
    """
    nodes, edges = ingest.parse_data_content(raw_json, "json")
    assert len(nodes) == 2  # Host-A and auto-registered Server-B
    assert len(edges) == 1
    assert edges[0]["rel"] == "AUTHENTICATES_TO"
    assert edges[0]["props"]["port"] == 88
    assert edges[0]["props"]["evidence_id"] == "EV-999"

    raw_csv = """src,dst,description,load,evidence_id
Laptop-X,Token-Y,"Mimikatz lsass dump extracted auth token",1,EV-CSV-1
Token-Y,Database-Z,"SQL query session opened on port 5432",15,EV-CSV-2
"""
    nodes_csv, edges_csv = ingest.parse_data_content(raw_csv, "csv")
    assert len(nodes_csv) == 3
    assert len(edges_csv) == 2
    assert edges_csv[0]["rel"] == "USES"
    assert edges_csv[1]["rel"] == "ACCESSES"
    assert edges_csv[1]["props"]["port"] == 5432


def test_ingest_into_falkordb_live():
    test_graph = "tf-sim-test-ingest-temp"
    raw_json = """
    {
      "nodes": [
        {"name": "Laptop-Alpha", "type": "workstation"},
        {"name": "DB-Beta", "type": "database"}
      ],
      "edges": [
        {
          "src": "Laptop-Alpha",
          "dst": "DB-Beta",
          "description": "SQL query connection opened to customer postgres database on port 5432 with load=7",
          "evidence_id": "EV-TEST-1"
        }
      ]
    }
    """
    nodes, edges = ingest.parse_data_content(raw_json, "json")
    result = ingest.ingest_into_falkordb(test_graph, nodes, edges, replace=True)

    assert result["status"] == "ok"
    assert result["endpoints_added"] == 2
    assert result["connections_added"] == 1

    # Verify directly via Cypher query
    g = core.db.select_graph(test_graph)
    node_res = g.query("MATCH (n) RETURN count(n)").result_set
    assert node_res[0][0] == 2

    edge_res = g.query("MATCH (a)-[r:ACCESSES]->(b) RETURN a.name, b.name, r.port, r.evidence_id").result_set
    assert len(edge_res) == 1
    assert edge_res[0][0] == "Laptop-Alpha"
    assert edge_res[0][1] == "DB-Beta"
    assert edge_res[0][2] == 5432
    assert edge_res[0][3] == "EV-TEST-1"

    # Cleanup test graph
    try:
        g.delete()
    except Exception:
        pass


def test_ingest_rejects_production_graph_before_database_access(monkeypatch):
    def fail_if_accessed(_graph_name):
        pytest.fail("Database must not be accessed for production ingestion")

    monkeypatch.setattr(core.db, "select_graph", fail_if_accessed)

    with pytest.raises(core.PolicyError):
        ingest.ingest_into_falkordb(core.PROD, [], [])


def test_replace_rejects_non_sandbox_graph_before_database_access(monkeypatch):
    def fail_if_accessed(_graph_name):
        pytest.fail("Database must not be accessed for an invalid replacement")

    monkeypatch.setattr(core.db, "select_graph", fail_if_accessed)

    with pytest.raises(core.PolicyError):
        ingest.ingest_into_falkordb(
            "test_ingest_temp", [], [], replace=True
        )


def test_ingest_rejects_unsupported_relationship(monkeypatch):
    class FakeGraph:
        def query(self, *_args, **_kwargs):
            pytest.fail("No query should run for an unsupported relationship")

    monkeypatch.setattr(core.db, "select_graph", lambda _name: FakeGraph())

    with pytest.raises(ValueError, match="Unsupported relationship type"):
        ingest.ingest_into_falkordb(
            "tf-sim-unit-test",
            [],
            [{"src": "Host-A", "dst": "Host-B", "rel": "DELETES"}],
        )


def test_invalid_relationship_rejected_before_database_access(monkeypatch):
    def fail_if_accessed(_graph_name):
        pytest.fail("Database must not be accessed for invalid input")

    monkeypatch.setattr(core.db, "select_graph", fail_if_accessed)

    with pytest.raises(ValueError, match="Unsupported relationship type"):
        ingest.ingest_into_falkordb(
            "tf-sim-unit-test",
            [],
            [{"src": "Host-A", "dst": "Host-B", "rel": "DELETES"}],
            replace=True,
        )


def test_invalid_node_identifier_rejected_before_database_access(monkeypatch):
    def fail_if_accessed(_graph_name):
        pytest.fail("Database must not be accessed for invalid node identifier")

    monkeypatch.setattr(core.db, "select_graph", fail_if_accessed)

    with pytest.raises(ValueError, match="Invalid entity name"):
        ingest.ingest_into_falkordb(
            "tf-sim-unit-test",
            [{"name": "Invalid;Node;Name!"}],
            [],
            replace=True,
        )


def test_invalid_edge_endpoint_rejected_before_database_access(monkeypatch):
    def fail_if_accessed(_graph_name):
        pytest.fail("Database must not be accessed for invalid edge endpoint")

    monkeypatch.setattr(core.db, "select_graph", fail_if_accessed)

    with pytest.raises(ValueError, match="Invalid entity name"):
        ingest.ingest_into_falkordb(
            "tf-sim-unit-test",
            [],
            [{"src": "Invalid;Endpoint;", "dst": "Valid-Host", "rel": "REACHES"}],
            replace=True,
        )


def test_replace_preserves_data_on_validation_failure(monkeypatch):
    def fail_if_accessed(_graph_name):
        pytest.fail(
            "Database must not be accessed for invalid replacement input"
        )

    monkeypatch.setattr(core.db, "select_graph", fail_if_accessed)

    with pytest.raises(ValueError, match="Unsupported relationship type"):
        ingest.ingest_into_falkordb(
            "tf-sim-test-preserve-on-fail",
            [{"name": "New-Node"}],
            [
                {
                    "src": "New-Node",
                    "dst": "Other-Node",
                    "rel": "FORBIDDEN",
                }
            ],
            replace=True,
        )
