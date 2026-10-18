# TRACEFORGE — Production Cybersecurity SaaS Frontend

A modern, responsive, cyber-themed cybersecurity investigation and defensive simulation frontend for **TRACEFORGE**, built with React 19, Vite, TypeScript, Tailwind CSS, TanStack Query, React Flow, Recharts, and Lucide React.

---

## 1. Quick Start & Development

### Prerequisites
- Node.js >= 20.11 or Node.js 22/24
- Python 3.11 with virtual environment (`.venv`)
- FalkorDB instance running on port 6379

### 1. Start the Backend API
From the project root:
```bash
# In terminal 1:
source .venv/bin/activate
cd backend
python -m uvicorn main:app --host 127.0.0.1 --port 8000
```
Verify the API is running at: `http://127.0.0.1:8000/health`

### 2. Configure Frontend Environment
```bash
cd frontend
cp .env.example .env
```
Default `.env` configuration:
```env
VITE_API_BASE_URL=http://127.0.0.1:8000
```

### 3. Install Dependencies & Launch Dev Server
```bash
# In terminal 2:
cd frontend
npm install
npm run dev
```
Open your browser at `http://localhost:5173`.

### 4. Build for Production & Run Tests
```bash
# Run unit & component test suite
npm run test

# Type-check and build production bundle
npm run build

# Preview production build locally
npm run preview
```

---

## 2. Platform Architecture & Modules

```text
frontend/
├── src/
│   ├── api/
│   │   ├── client.ts              # Robust API client with timeout, error normalization & AbortController
│   │   ├── types.ts               # Complete TypeScript types mirroring FastAPI Pydantic schemas
│   │   └── endpoints/             # Modular API endpoints matching main.py
│   │       ├── health.ts          # /health, /mode, /schema, /benchmark
│   │       ├── graph.ts           # /graph, /paths, /trace
│   │       ├── investigations.ts  # /investigate, /reconstruct, /provenance, /incident
│   │       ├── containment.ts     # /containment/cut, /containment/simulate, /containment/verify, /sim/{id}
│   │       ├── simulations.ts     # /digital-twin/simulate, /defense/plan, /counterfactual, /mutation-lab
│   │       ├── risk.ts            # /risk, /risk/uncertainty, /recommendations/explain
│   │       ├── intel.ts           # /threat-intel/map, /investigate/causal, /arena/score, /evidence
│   │       ├── cases.ts           # /cases, /cases/{id}, /cases/{id}/approve
│   │       ├── outcomes.ts        # /outcomes, /outcomes/summary
│   │       └── audit.ts           # /audit
│   ├── app/
│   │   ├── App.tsx                # React Query, Auth, Workspace, and Toast providers
│   │   └── router.tsx             # React Router v7 route hierarchy
│   ├── components/
│   │   ├── layout/                # AppShell, TopNav, Sidebar, CommandPalette (Cmd+K)
│   │   ├── ui/                    # Cyber design system: Badge, Button, Card, Input, Modal, Drawer, Table, Tabs, Toast, StatCard
│   │   ├── charts/                # RiskRadar, PathTimelineChart, BenchmarkBarChart, SensitivityChart
│   │   └── graph/                 # AttackGraphView (React Flow), GraphLegend, NodeDetailDrawer
│   ├── features/
│   │   ├── overview/              # Executive SecOps KPI dashboard
│   │   ├── attack-graph/          # Interactive FalkorDB topology explorer
│   │   ├── investigations/        # Autonomous agent replay, temporal tracing, and provenance
│   │   ├── defense-lab/           # Min-cut containment, sandbox cloning, residual risk, mutation lab
│   │   ├── threat-mapping/        # MITRE ATT&CK mapping, causal hypotheses, adversary arena
│   │   ├── risk-analysis/         # Multi-factor risk radar, sensitivity bounds, recommendations
│   │   ├── evidence/              # Forensic evidence inspector & prompt-injection neutralization
│   │   ├── cases/                 # Case review, human analyst authorization, and outcome memory
│   │   ├── audit/                 # Tamper-evident security audit trail
│   │   ├── settings/              # System guardrails, tenant switcher, and active connections
│   │   └── auth/                  # SOC analyst role authentication
│   └── test/                      # Vitest and React Testing Library test suites
```

---

## 3. Implemented Features vs Features Requiring Backend Work

| Module / Feature | Frontend Status | Backend Status | Scope & Guarantees |
| :--- | :--- | :--- | :--- |
| **Attack Graph Explorer** | ✅ Complete | ✅ Connected (`GET /graph`, `POST /paths`) | Real FalkorDB nodes and edges rendered with custom cyber styling. |
| **Autonomous Investigations** | ✅ Complete | ✅ Connected (`POST /investigate`, `POST /trace`) | Agent execution replay with step-by-step reasoning and temporal bounds. |
| **Incident Reconstruction** | ✅ Complete | ✅ Connected (`POST /reconstruct`) | Reports chronological ordering and evidence completeness. |
| **Evidence Provenance Audit** | ✅ Complete | ✅ Connected (`POST /provenance`, `POST /evidence`) | Verifies event-to-evidence coverage and timestamp completeness. |
| **Defense Lab & Min-Cut** | ✅ Complete | ✅ Connected (`POST /containment/cut`, `POST /containment/simulate`) | NetworkX min-cut disruption calculation; simulation restricted to `tf-sim-*`. |
| **Verification & Residual Risk** | ✅ Complete | ✅ Connected (`POST /containment/verify`, `POST /containment/residual-risk`) | Independent post-action query confirming 0 remaining paths in sandbox. |
| **Mutation Lab** | ✅ Complete | ✅ Connected (`POST /mutation-lab`) | Explores hypothetical attack relations exclusively in disposable sandboxes. |
| **MITRE ATT&CK Mapping** | ✅ Complete | ✅ Connected (`POST /threat-intel/map`) | Conservative mapping requiring matching evidence types (T1003, T1078, T1021). |
| **Causal Hypotheses & Arena** | ✅ Complete | ✅ Connected (`POST /investigate/causal`, `POST /arena/score`) | Bounded event chain linkages and residual path ranking. |
| **Multi-Axis Risk Scoring** | ✅ Complete | ✅ Connected (`POST /risk`, `POST /risk/uncertainty`) | Deterministic risk score and weight sensitivity scenario bounds. |
| **Case Review & Approvals** | ✅ Complete | ✅ Connected (`GET /cases`, `POST /cases/{id}/approve`) | Human analyst authorization gate before containment deployment. |
| **Decision Outcome Memory** | ✅ Complete | ✅ Connected (`POST /outcomes`, `GET /outcomes/summary`) | Advisory outcome recording without triggering automated live actions. |
| **Immutable Audit Trail** | ✅ Complete | ✅ Connected (`GET /audit`) | Searchable, filterable view of SQLite `audit.db` operations. |
| **Multi-Tenant Workspace Switching** | ⚠️ Demo UI | 🛠️ *Requires Backend Tenant IAM* | Frontend provides workspace toggle with clear disclaimer. Live multi-tenancy requires backend tenant isolation. |
| **Production Authentication** | ⚠️ Simulated | 🛠️ *Requires Backend OAuth/JWT* | Client session storage implemented with role switching. Production hosting requires backend HttpOnly session cookies. |

---

## 4. Security & Safety Guarantees

1. **Production Read-Only Boundary**:
   The production graph (`traceforge`) is strictly protected against write or delete operations. Any mutation attempt triggers a `PolicyError` (HTTP 403).
2. **Disposable Sandbox Isolation**:
   All containment simulations and attack mutations are performed exclusively in isolated sandbox graphs prefixed with `tf-sim-*`. Sandboxes can be inspected and deleted via `DELETE /sim/{sim_id}`.
3. **Prompt Injection & Untrusted Data Neutralization**:
   Evidence records originating from untrusted sources (such as ticket comments or user inputs) are flagged and handled strictly with `data_only_never_instructions`, preventing adversary instruction hijacking.
4. **No Hallucinated Actions**:
   Containment is never credited until an independent post-action graph query confirms zero remaining paths (`verdict: eliminated`).

---

## 5. Deployment Guide: HTTPS Hosting & Secure API Proxy

For production hosting:

### A. Nginx Reverse Proxy Configuration
```nginx
server {
    listen 443 ssl http2;
    server_name secops.yourcompany.com;

    ssl_certificate /etc/ssl/certs/traceforge.crt;
    ssl_certificate_key /etc/ssl/private/traceforge.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # Security Headers
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Content-Security-Policy "default-src 'self'; connect-src 'self' https://api.yourcompany.com; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self';" always;

    # Frontend Static Bundle
    location / {
        root /var/www/traceforge/frontend/dist;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    # Backend API Reverse Proxy
    location /api/ {
        proxy_pass http://127.0.0.1:8000/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
    }
}
```

### B. Production Environment Variables
Set in production build environment:
```env
VITE_API_BASE_URL=https://secops.yourcompany.com/api
```
Run `npm run build` to generate the optimized production assets in `dist/`.
