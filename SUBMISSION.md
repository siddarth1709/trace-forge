# TRACEFORGE // Hackathon Submission

> **FalkorDB Graph Hacks 2026**  
> **Track 01:** Agents That Act on Connected Data  
> **Repository:** [https://github.com/siddarth1709/trace-forge](https://github.com/siddarth1709/trace-forge)  
> **Live FalkorDB Cloud Instance:** Verified & Active (`ap-south-1.aws`)

---

## 1. Project Summary

**TRACEFORGE** is an autonomous cyber defense agent designed from first principles to act on **connected graph data** in **FalkorDB**. When multi-hop intrusions penetrate initial perimeter defenses, traditional security platforms dump thousands of flat, disconnected alert logs into human queues. 

TRACEFORGE replaces flat text retrieval with directed graph reasoning:
1. **Traverses Connected Causality:** Queries FalkorDB using time-respecting Cypher path expressions to reconstruct multi-hop attack routes across compromised endpoints, stolen credentials, and target servers.
2. **Evaluates Hypotheses on Connected Telemetry:** Scores competing attack hypotheses against corroborating forensic evidence nodes linked by exact identity and network edges.
3. **Calculates Deterministic Containment Cuts:** Computes Edmonds-Karp minimum-cuts on the graph topology to sever all attack routes while preserving benign operational load.
4. **Mutates & Verifies in Isolated Sandboxes:** Clones the active topology to disposable sandbox graphs (`tf-sim-*`) to test hypothetical mutations and prove zero residual paths before requesting human authorization.
5. **Acts via 10 Typed Model Context Protocol (FastMCP) Tools:** Standardized MCP boundary for autonomous AI agent runtimes (Claude, Cursor, Gemini).

---

## 2. Why Connected Data? Why FalkorDB?

### The Fatal Flaw of Flat RAG in Cybersecurity
Flat vector databases and document stores treat logs as disconnected blobs of text. When an attacker pivots from **Workstation A** $\to$ **Shared Credential** $\to$ **Admin Workstation** $\to$ **Critical Server**, flat retrieval surfaces individual log entries without understanding:
- **Transitive Reachability:** Can the attacker actually pivot from the foothold to the crown jewel?
- **Temporal Causality:** Did the credential dump happen *before* the lateral login, or is it unrelated background noise?
- **Topological Bottlenecks:** Which single edge or identity bridge can be severed to block the attack with minimal impact on innocent business traffic?

### Why FalkorDB is Uniquely Suited
- **GraphBLAS Sparse Matrix Engine:** FalkorDB executes multi-hop Cypher queries with sub-5ms latency, even across dense enterprise topologies.
- **Dynamic Multi-Graph Sandboxing:** FalkorDB allows instant graph cloning (`tf-sim-<uuid>`). Our agent can safely mutate, isolate, and verify simulated responses in disposable sandboxes without ever risking live production data.
- **Typed Relationship Schemas:** Distinguishes lateral movement relationships (`USES`, `AUTHENTICATES_TO`, `ACCESSES`, `REACHES`) from informational edges (`EVIDENCE_FOR`, `ALERT_ON`), preventing fake attack paths.

---

## 3. Autonomous Agent Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│                   TRACEFORGE Autonomous Agent Loop                     │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│ 1. CONNECTED INGESTION & AUTOREADING                                   │
│    - Ingests CSV, JSON, NDJSON, CISA KEV, CrowdStrike, and Auth logs   │
│    - FalkorDB Graph Schema: Identities, Endpoints, Servers, Alerts     │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│ 2. TEMPORAL CYPHER PATH TRACING (`trace_attack_paths`)                 │
│    - Cypher: MATCH p=(s)-[:USES|AUTHENTICATES_TO|ACCESSES*1..8]->(x)   │
│    - Causality filter: rs[i].observed_at <= rs[i+1].observed_at        │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│ 3. BAYESIAN HYPOTHESIS SCORING (`score_hypotheses`)                    │
│    - Prioritizes high-fidelity telemetry (EDR=0.98, NetFlow=0.90)       │
│    - Computes posterior confidence across competing intrusion paths     │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│ 4. DETERMINISTIC MINIMUM-CUT CONTAINMENT (`calculate_containment_cut`) │
│    - GraphBLAS capacity matrix weighting benign operational flow       │
│    - Disruption penalty: Edmonds-Karp min-cut isolates crown jewels    │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│ 5. ISOLATED SANDBOX SIMULATION (`simulate_containment`)                │
│    - FalkorDB instant graph clone: `traceforge` -> `tf-sim-<id>`       │
│    - Applies hypothetical edge revocations strictly in the sandbox     │
│    - Production graph is guarded with read-only PolicyError enforcement│
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│ 6. INDEPENDENT VERIFICATION & PROOF (`verify_containment`)             │
│    - Traverses sandbox graph: verifies remaining_paths === 0           │
│    - Residual risk surfaced if non-zero paths remain                   │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│ 7. HUMAN AUTHORIZATION & CASE AUDIT                                    │
│    - SQLite immutable cryptographic audit trail                        │
│    - Human approval signature required before containment execution    │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 4. 10 Model Context Protocol (FastMCP) Tools

TRACEFORGE implements the open **Model Context Protocol (FastMCP)**, enabling LLM agents to inspect and act on connected data via 10 typed tools:

| # | MCP Tool Name | Graph Action | Input Parameters | Safety Guarantees |
|---|---------------|--------------|------------------|-------------------|
| 1 | `trace_attack_paths` | Cypher pathfinding query | `sources`, `target`, `as_of` | Read-only; max 8 hops; regex validated |
| 2 | `get_incident` | Fetch active incident graph | `incident_id` | Read-only; sanitized incident ID |
| 3 | `score_hypotheses` | Bayesian graph evidence evaluation | `incident_id` | Read-only; corroborates linked telemetry |
| 4 | `score_risk` | 5-dimension weighted risk model | `criticality`, `exposure`, etc. | Mathematical computation; zero mutation |
| 5 | `calculate_containment_cut` | Graph minimum cut algorithm | `sources`, `target` | Read-only graph analysis; capacity weighted |
| 6 | `simulate_containment` | Disposable sandbox mutation | `actions`, `sources`, `target` | Sandbox only (`tf-sim-*`); prod strictly read-only |
| 7 | `verify_containment` | Independent post-action query | `sim_id`, `sources`, `target` | Must verify 0 residual paths |
| 8 | `analyze_connectivity` | Graph density & centrality query | `graph` | Read-only; returns connected components |
| 9 | `get_evidence` | Fetch cryptographic forensic nodes | `ids` | Read-only; marks untrusted records |
| 10 | `mutate_attack_pattern` | Sandbox mutation lab | `src`, `rel`, `dst`, `sources` | Clone sandbox, test what-if injection |

---

## 5. Security & Safety Boundary

Agents acting on real-world infrastructure cannot be allowed to make unverified or hallucinated changes. TRACEFORGE enforces strict software-enforced guarantees:
- **Strict Read-Only Production:** Any attempt to write, modify, or delete the production graph (`traceforge`) triggers an immediate `PolicyError`.
- **Sandbox Isolation:** All containment simulations occur in ephemeral graphs matching `tf-sim-[a-f0-9]{8}`.
- **Concurrent Sandbox Throttling:** Caps concurrent sandboxes at `MAX_SIMS = 20` to prevent memory exhaustion.
- **Cryptographic Audit Trail:** Every action, query, simulation, and approval is logged to an immutable SQLite audit ledger with timestamps and parameter hashes.

---

## 6. Verification & Test Suite

The project features a **77-test automated pytest backend suite** and a **16-test Vitest frontend suite** (93 total tests, 100% passing):

```bash
# Backend pytest suite (77 tests passed in 1.84s)
pytest backend/tests/ -v

# Frontend vitest suite (16 tests passed in 0.72s)
cd frontend && npm test

# Production build validation
npm run build   # tsc -b && vite build (Clean in 280ms)
```

### Verified Test Categories:
- `test_advanced.py`: Risk sensitivity ranges and MITRE ATT&CK technique mapping.
- `test_core_db.py`: Cypher path queries, time-ordered progression, and min-cut algorithms.
- `test_evidence_classification.py`: Distinguishing observed, inferred, and simulated evidence.
- `test_executor.py`: MCP daemon session initialization, stdio fallback, and case execution.
- `test_explain_recommendations.py`: Explanations for why specific edges are selected for containment.
- `test_incident_reconstruction.py`: Multi-hop chronological incident reconstruction.
- `test_ingest.py`: Autoreading natural language and structured connection logs into FalkorDB.
- `test_mcp_server.py`: Typed schemas and error handling for all 10 MCP tools.
- `test_outcome_memory.py`: Case outcome memory and similarity search over past decisions.
- `test_production_isolation_proof.py`: Proof that production graph cannot be mutated by simulation actions.
- `test_pure.py`: Mathematical min-cut calculations against NetworkX ground truth.
- `test_risk_sensitivity.py`: Robustness against weight variations.

---

## 7. Quickstart & Live Demo

### 1. Test Live FalkorDB Cloud Connection
```bash
python backend/test_falkor_connection.py
```

### 2. Run Local Full Stack
```bash
# Terminal 1: Backend API
cd backend && ../.venv/bin/python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload

# Terminal 2: Frontend Dashboard
cd frontend && npm run dev
```
Open **`http://localhost:5173`** to access the **Obsidian Studio** web experience:
- `/` — Interactive Landing Page with 5 progressive cyber animations.
- `/dashboard` — SecOps Command Center with Track 01 metrics.
- `/graph` — Live SVG Attack Graph Topology Explorer.
- `/investigations` — 7-Stage Guided Autonomous Investigation Runner.
- `/defense-lab` — Sandbox What-If Mutation Playground.

---

## 8. Summary for Judges

| Evaluation Criteria | How TRACEFORGE Delivers |
|---------------------|-------------------------|
| **Acting on Connected Data** | Autonomous agent discovers multi-hop paths, evaluates corroborating evidence, and computes graph min-cuts directly over FalkorDB connected topology. |
| **FalkorDB Utilization** | Leverages Cypher, GraphBLAS sparse matrix traversal, multi-graph sandboxing (`_clone`), and temporal edge ordering. |
| **Agent Standards (MCP)** | Implements 10 typed FastMCP tools for real-world agent runtimes. |
| **Production Readiness** | 77 backend + 16 frontend tests passing; production-ready Docker, Vercel, Render configs; live cloud database integration. |
| **Design & UX** | Award-winning Obsidian Studio dark theme, animated SVG threat networks, and interactive cyber telemetry. |
