import sqlite3

import pytest

import tf_core as core
import tf_intel as intel


@pytest.fixture
def isolated_outcome_db(tmp_path, monkeypatch):
    db_path = str(tmp_path / "outcome_test.db")
    monkeypatch.setattr(core, "AUDIT_DB", db_path)
    return db_path


def test_record_and_list_outcome(isolated_outcome_db):
    result = intel.record_outcome(
        "28cf495cd0",
        "Test decision",
        "inconclusive",
        verified=False,
        notes="Test only",
    )

    records = intel.list_outcomes()

    assert result["recorded"] is True
    assert result["memory_scope"] == "advisory_only"
    assert result["automatic_actions_enabled"] is False
    assert len(records) == 1
    assert records[0]["case_id"] == "28cf495cd0"
    assert records[0]["outcome"] == "inconclusive"
    assert records[0]["verified"] is False


def test_summary_counts_verified_and_unverified(isolated_outcome_db):
    intel.record_outcome("28cf495cd0", "Decision A", "successful", True)
    intel.record_outcome("8686347b0f", "Decision B", "unsuccessful", False)
    intel.record_outcome("b17b34b9ad", "Decision C", "inconclusive", False)

    summary = intel.summarize_outcomes()

    assert summary["total_records"] == 3
    assert summary["outcomes"]["successful"]["verified"] == 1
    assert summary["outcomes"]["unsuccessful"]["unverified"] == 1
    assert summary["outcomes"]["inconclusive"]["unverified"] == 1
    assert summary["memory_scope"] == "advisory_only"
    assert summary["automatic_actions_enabled"] is False


def test_invalid_case_id_is_rejected(isolated_outcome_db):
    with pytest.raises(core.PolicyError):
        intel.record_outcome("not-a-case", "Test", "inconclusive")


def test_invalid_outcome_is_rejected(isolated_outcome_db):
    with pytest.raises(core.PolicyError):
        intel.record_outcome("28cf495cd0", "Test", "maybe")


def test_outcome_memory_uses_separate_table(isolated_outcome_db):
    intel.record_outcome("28cf495cd0", "Test", "inconclusive")

    with sqlite3.connect(isolated_outcome_db) as conn:
        tables = {
            row[0]
            for row in conn.execute(
                "SELECT name FROM sqlite_master WHERE type = 'table'"
            )
        }

    assert "outcome_memory" in tables
    assert "audit" not in tables
    assert "cases" not in tables
