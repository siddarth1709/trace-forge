# TRACEFORGE

> **AI-Powered Cybersecurity Incident Response Agent on Connected Data**  
> *FalkorDB Graph Hacks 2026 — Track 01: Agents That Act on Connected Data*

---

## 1. Executive Summary

**TRACEFORGE** is an autonomous incident response agent that leverages **FalkorDB** graph knowledge to investigate security alerts, trace multi-hop attack paths, evaluate competing hypotheses against corroborating evidence, calculate minimal-disruption containment plans, and prove containment in an isolated sandbox graph before human approval.

Rather than treating cybersecurity logs as flat unstructured text, TRACEFORGE utilizes the graph topology:
1. **Time-Ordered Attack Paths:** Cypher-based pathfinding queries that enforce causality, timestamp progression, and relationship filters.
2. **Deterministic Min-Cut Containment:** Computes graph cuts separating compromised footholds from critical crown-jewel assets while minimizing business disruption.
3. **Isolated Sandbox Verification:** Clones the active topology to an isolated sandbox graph (`tf-sim-*`), applies containment actions, and independently validates that residual paths are strictly zero.
4. **Safe MCP Boundary:** Exposes 10 typed tools via the Model Context Protocol (FastMCP) with bounded parameters, input allowlists, and error masking to protect internal topologies.

---

## 2. Core Workflow & Architecture

```
Alert Detection  ──▶  Attack Path Tracing  ──▶  Bayesian Hypothesis Scoring
(get_incident)        (trace_attack_paths)       (score_hypotheses)
                              │
                              ▼
Sandboxed Verification ◀── Min-Cut Containment Plan
(simulate & verify)        (calculate_containment_cut)
```

1. **Detect (`get_incident`):** Ingests active security incidents, alerted entities, and telemetry evidence.
2. **Traverse (`trace_attack_paths`, `analyze_connectivity`):** Queries FalkorDB for time-respecting directed paths from foothold entities to target assets.
3. **Assess (`score_risk`, `score_hypotheses`):** Uses weighted evidence correlation (prioritizing high-fidelity telemetry like EDR over synthetic sources) to calculate risk and decide whether intervention is warranted.
4. **Plan (`calculate_containment_cut`):** Calculates an optimal minimum cut separating attacker nodes from targets while penalizing benign operational disruption.
5. **Simulate (`simulate_containment`):** Copies topology into an isolated sandbox graph (`tf-sim-<id>`) and tests containment. Production data is protected by strict write guards.
6. **Verify (`verify_containment`):** Re-traverses the sandbox to verify that 0 attack paths remain. Cases with remaining paths surface as `residual_risk`.

---

## 3. Operational Guarantees & Clarifications

### MCP Daemon vs. Local Testing Fallback
- **Daemon Mode (`mcp_daemon`):** When the Python `mcp` SDK is installed (Python >= 3.10), the agent communicates with `backend/mcp_server.py` over an asynchronous `stdio` client session.
- **Local Fallback (`local_testing_fallback`):** In environments lacking the MCP SDK or running Python < 3.10, the executor falls back to an in-process tool runner (`LocalMcpSession`).
- **Transparency:** The agent records `mcp_mode` in every case audit record, and the UI displays `[MCP Daemon]` or `[Local Fallback]` on every investigation.

### Simulation vs. Real-World Enforcement
- Containment plans are **simulated and verified entirely inside FalkorDB sandbox graphs**.
- TRACEFORGE does not issue real-world firewall, EDR, or network ACL changes.

---

## 4. Quickstart

### Prerequisites
- Docker & Docker Compose
- *Or* Local Python 3.10+ and Node.js 18+

### Running with Docker Compose

1. **Launch Containers:**
   ```bash
   docker compose up --build -d
   ```
   *Note: Containers launch FalkorDB (port 6379, 3000), backend API (port 8000), and frontend (port 5173).*

2. **Seed Initial Incident Graph:**
   The database container starts with an empty volume. Populate the demonstration scenario by running the seed script:
   ```bash
   docker compose exec backend python backend/seed_traceforge.py
   # Or locally:
   python backend/seed_traceforge.py
   ```

3. **Open the Web UI:**
   Navigate to [http://localhost:5173](http://localhost:5173) in your browser.

> **Compose Notes:**
> - `docker-compose.yml` uses the `falkordb/falkordb:latest` image and checks readiness using `redis-cli ping`.
> - If `redis-cli` is absent in future base images, test connection directly on port 6379.

---

## 5. Local Development & Testing

### Backend Setup
```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt
```

### Run Test Suite
The repository includes a comprehensive 44-test automated suite verifying graph traversal, containment planning, production isolation, MCP input validation, and agent execution:
```bash
pytest backend/tests/ -v
```

### Run Benchmark Evaluation
To benchmark the graph-native min-cut agent against a flat-log heuristic baseline across 20 randomized scenario variants:
```bash
python backend/eval/run_benchmark.py
```
*Results will display containment percentage, disruption, execution latency, and comparison with NetworkX ground truth.*

---

## 6. Project Structure

```
├── backend/
│   ├── agent/                 # Agent executor, planner, hypotheses, report generation
│   ├── eval/                  # 20-scenario benchmark suite & baseline agent
│   ├── scenarios/             # Scenario generator & graph topologies
│   ├── tests/                 # 44 automated pytest security & unit tests
│   ├── main.py                # FastAPI REST service
│   ├── mcp_server.py          # FastMCP server with 10 safe graph tools
│   ├── seed_traceforge.py     # Graph initialization script
│   ├── tf_core.py             # FalkorDB graph layer, min-cut, sandboxing, audit
│   └── tf_intel.py            # Attack paths, Bayesian hypothesis scoring, case store
├── frontend/
│   ├── src/
│   │   ├── api.ts             # REST client
│   │   ├── App.tsx            # Main application UI & investigation dashboard
│   │   ├── GraphView.tsx      # SVG interactive graph topology visualization
│   │   ├── Panels.tsx         # Evidence, hypothesis, and containment panels
│   │   └── types.ts           # Shared TypeScript interfaces
│   └── package.json
└── docker-compose.yml         # Container configuration
```
