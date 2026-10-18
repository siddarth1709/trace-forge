# TRACEFORGE

> **Autonomous Cybersecurity Incident Response Agent on Connected Data**  
> *FalkorDB Graph Hacks 2026 — Track 01: Agents That Act on Connected Data*  
> **Repository:** [https://github.com/siddarth1709/trace-forge](https://github.com/siddarth1709/trace-forge)

---

## 1. Executive Summary

**TRACEFORGE** is an autonomous incident response agent that leverages **FalkorDB's connected graph knowledge** to investigate security alerts, trace multi-hop attack paths, evaluate competing hypotheses against corroborating evidence, calculate minimal-disruption containment plans, and prove containment in an isolated sandbox graph before human approval.

Rather than treating cybersecurity logs as flat unstructured text, TRACEFORGE utilizes the graph topology:
1. **Time-Ordered Attack Paths:** Cypher-based pathfinding queries that enforce causality, timestamp progression, and relationship filters.
2. **Deterministic Min-Cut Containment:** Computes graph cuts separating compromised footholds from critical crown-jewel assets while minimizing business disruption.
3. **Isolated Sandbox Verification:** Clones the active topology to an isolated sandbox graph (`tf-sim-*`), applies containment actions, and independently validates that residual paths are strictly zero.
4. **Safe Model Context Protocol (FastMCP) Boundary:** Exposes 10 typed tools via the Model Context Protocol (FastMCP) with bounded parameters, input allowlists, and error masking to protect internal topologies.

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
- Docker & Docker Compose *or* Local Python 3.10+ and Node.js 18+
- Active FalkorDB instance (Local Docker or FalkorDB Cloud)

### Option A: Connect to FalkorDB Cloud & Run Locally
```bash
# 1. Verify connection to your FalkorDB instance
python backend/test_falkor_connection.py

# 2. Start Backend API (FastAPI)
cd backend && ../.venv/bin/python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload

# 3. Start Frontend Dashboard (Vite + React)
cd frontend && npm run dev
```
Navigate to [http://localhost:5173](http://localhost:5173).

### Option B: Running with Docker Compose
```bash
docker compose up --build -d
```
*Launches FalkorDB (port 6379, 3000), backend API (port 8000), and frontend (port 5173).*

---

## 5. Automated Verification & Test Suite

The repository includes a comprehensive **93-test automated suite** (77 backend pytest tests + 16 frontend Vitest tests) verifying graph traversal, containment planning, production isolation, MCP input validation, and agent execution:

```bash
# Backend pytest suite (77 tests passed in 1.84s)
pytest backend/tests/ -v

# Frontend vitest suite (16 tests passed in 0.72s)
cd frontend && npm test

# Production build validation
cd frontend && npm run build
```

---

## 6. Project Structure

```
├── backend/
│   ├── agent/                 # Agent executor, planner, hypotheses, report generation
│   ├── data/                  # Sample security datasets (AD breach, GuardDuty, CISA KEV)
│   ├── eval/                  # 20-scenario benchmark suite & baseline agent
│   ├── policies/              # Business impact policies & critical asset definitions
│   ├── scenarios/             # Scenario generator & graph topologies
│   ├── tests/                 # 77 automated pytest security, isolation & unit tests
│   ├── main.py                # FastAPI REST service & CORS handler
│   ├── mcp_server.py          # FastMCP server with 10 safe graph tools
│   ├── seed_traceforge.py     # Graph initialization & S1 benchmark seeding
│   ├── test_falkor_connection.py # Interactive FalkorDB connection & latency tester
│   ├── tf_advanced.py         # Advisory risk uncertainty & MITRE ATT&CK mapper
│   ├── tf_core.py             # FalkorDB graph layer, min-cut, sandboxing, audit
│   ├── tf_discovery.py        # Endpoint discovery & auth relationship detector
│   ├── tf_ingest.py           # Natural language connection autoreader & parser
│   └── tf_intel.py            # Temporal paths, Bayesian hypothesis scoring, case store
├── frontend/
│   ├── src/
│   │   ├── api/               # Typed REST API endpoints
│   │   ├── app/               # Root App & React Router definition
│   │   ├── assets/            # Brand assets & cyber cube logo
│   │   ├── components/        # Obsidian Studio UI components, charts & preloader
│   │   ├── features/          # Feature views: landing, overview, graph, cases, lab
│   │   ├── hooks/             # Custom React hooks (auth, workspace, health)
│   │   ├── styles/            # Obsidian design tokens & global CSS
│   │   └── test/              # 16 automated Vitest component & API unit tests
│   ├── vercel.json            # Vercel SPA routing configuration
│   └── package.json
├── docker-compose.yml         # Container configuration for full stack
├── railway.json               # Railway deployment manifest
├── render.yaml                # Render Blueprint deployment manifest
└── SUBMISSION.md              # Official FalkorDB Hackathon Track 01 submission document
```
