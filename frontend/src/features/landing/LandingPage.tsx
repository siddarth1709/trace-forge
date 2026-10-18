import React from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ShieldCheck,
  ShieldAlert,
  Network,
  Database,
  ArrowRight,
  Play,
  Activity,
  GitBranch,
  FolderArchive,
  Layers,
  Cpu,
  Workflow,
  SearchCheck,
  Lock,
  Target,
  FileCheck,
  TrendingUp,
} from 'lucide-react'
import { Button } from '../../components/ui/Button.tsx'
import { Card } from '../../components/ui/Card.tsx'
import { HeroThreatNetwork } from './components/HeroThreatNetwork.tsx'
import { AttackPathTracer } from './components/AttackPathTracer.tsx'
import { ContainmentSimulator } from './components/ContainmentSimulator.tsx'
import { AnimatedSecurityMetrics } from './components/AnimatedSecurityMetrics.tsx'
import { EvidenceInvestigationTimeline } from './components/EvidenceInvestigationTimeline.tsx'

export const LandingPage: React.FC = () => {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-[#0B0D0F] text-[#F5F5F5] font-sans selection:bg-[#321E17] selection:text-[#FF8559]">
      {/* ========================================================================= */}
      {/* 1. EDITORIAL HEADER & NAVIGATION WITH NEW LOGO */}
      {/* ========================================================================= */}
      <header className="border-b border-[#2A3038] bg-[#0B0D0F]/90 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg overflow-hidden flex items-center justify-center shadow-[0_0_12px_rgba(6,182,212,0.3)] border border-[#2A3038] bg-[#0B0D0F] shrink-0">
              <img src="/logo.png" alt="TRACEFORGE Logo" className="w-7 h-7 object-contain" />
            </div>
            <div>
              <div className="font-mono font-bold text-sm tracking-wider text-[#F5F5F5] flex items-center gap-2">
                <span>TRACEFORGE</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#191D22] text-[#B0B7C3] border border-[#2A3038] font-mono">
                  v2.4
                </span>
              </div>
              <span className="text-[10px] text-[#858E9B] font-mono block leading-tight">
                Graph Theoretic Disruption Engine
              </span>
            </div>
          </div>

          <nav className="hidden lg:flex items-center gap-6 text-xs font-mono text-[#858E9B]">
            <a href="#threat-network" className="hover:text-[#F5F5F5] transition-colors duration-180">
              Threat Network
            </a>
            <a href="#attack-tracing" className="hover:text-[#F5F5F5] transition-colors duration-180">
              Attack Tracing
            </a>
            <a href="#simulator" className="hover:text-[#F5F5F5] transition-colors duration-180">
              Simulator
            </a>
            <a href="#metrics" className="hover:text-[#F5F5F5] transition-colors duration-180">
              Live Metrics
            </a>
            <a href="#timeline" className="hover:text-[#F5F5F5] transition-colors duration-180">
              Investigation
            </a>
            <a href="#pillars" className="hover:text-[#F5F5F5] transition-colors duration-180">
              Pillars
            </a>
          </nav>

          <div className="flex items-center gap-3 font-mono text-xs">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/graph')}
              className="hidden sm:inline-flex"
            >
              <Network className="w-3.5 h-3.5 mr-1.5 text-[#60A5FA]" />
              Graph Explorer
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => navigate('/dashboard')}
            >
              Launch Console
              <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 space-y-24">
        {/* ========================================================================= */}
        {/* 2. HERO SECTION & INTERACTIVE THREAT NETWORK */}
        {/* ========================================================================= */}
        <section id="threat-network" className="space-y-8">
          <div className="space-y-4 max-w-4xl text-center sm:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#191D22] border border-[#2A3038] text-xs font-mono text-[#B0B7C3]">
              <span className="w-2 h-2 rounded-full bg-[#FF6B35]" />
              <span>Autonomous Investigation & Disruption Simulation Platform</span>
            </div>

            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold font-mono tracking-tight text-[#F5F5F5] leading-tight">
              Deterministic Attack Disruption Powered by FalkorDB
            </h1>
            <p className="text-[#B0B7C3] text-base sm:text-lg leading-relaxed font-sans max-w-3xl">
              When multi-hop intrusions penetrate initial footholds, traditional SIEMs dump thousands of disconnected flat alerts into analyst queues. TRACEFORGE projects identity structures, network connectivity, and CVE exposure into a unified directed property graph—calculating mathematically proven <strong>minimum-cuts</strong> that sever all attacker pathways with <strong>zero benign business disruption</strong>.
            </p>

            <div className="pt-2 flex flex-wrap items-center gap-3.5 font-mono text-xs justify-center sm:justify-start">
              <Button variant="primary" size="lg" onClick={() => navigate('/dashboard')}>
                <Play className="w-4 h-4 mr-2 fill-current" />
                Launch Console Dashboard (/dashboard)
              </Button>
              <Button variant="outline" size="lg" onClick={() => navigate('/graph')}>
                <Network className="w-4 h-4 mr-2 text-[#60A5FA]" />
                Explore Attack Graph (/graph)
              </Button>
              <Button variant="outline" size="lg" onClick={() => navigate('/investigations')}>
                <SearchCheck className="w-4 h-4 mr-2 text-[#FBBF24]" />
                Autonomous Agent (/investigations)
              </Button>
            </div>
          </div>

          {/* Interactive Hero Threat Network Centerpiece */}
          <div className="pt-4">
            <HeroThreatNetwork />
          </div>

          {/* Safety Invariant Callout */}
          <div className="p-4 rounded-xl bg-[#121519] border border-[#2A3038] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs font-mono">
            <div className="flex items-center gap-2.5 text-[#34D399]">
              <ShieldCheck className="w-4 h-4 shrink-0" />
              <span>Safety Guarantee: 100% Production Isolation (Strict Read-Only Production Graph)</span>
            </div>
            <span className="text-[#858E9B] font-sans text-[11px]">
              Mutations execute exclusively in disposable <code className="text-[#B0B7C3] font-mono">tf-sim-*</code> sandbox graphs.
            </span>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* 3. SEQUENTIAL ATTACK-PATH TRACING VISUALIZATION */}
        {/* ========================================================================= */}
        <section id="attack-tracing" className="space-y-6">
          <AttackPathTracer />
        </section>

        {/* ========================================================================= */}
        {/* 4. INTERACTIVE DISRUPTION SIMULATOR (Sandbox Before & After) */}
        {/* ========================================================================= */}
        <section id="simulator" className="space-y-6">
          <ContainmentSimulator />
        </section>

        {/* ========================================================================= */}
        {/* 5. ANIMATED SECURITY METRICS & CHARTS */}
        {/* ========================================================================= */}
        <section id="metrics" className="space-y-6">
          <AnimatedSecurityMetrics />
        </section>

        {/* ========================================================================= */}
        {/* 6. EVIDENCE & INVESTIGATION TIMELINE */}
        {/* ========================================================================= */}
        <section id="timeline" className="space-y-6">
          <EvidenceInvestigationTimeline />
        </section>

        {/* ========================================================================= */}
        {/* 7. THE FOUR PILLARS OF TRACEFORGE */}
        {/* ========================================================================= */}
        <section id="pillars" className="space-y-6">
          <div className="border-b border-[#2A3038] pb-4">
            <div className="flex items-center gap-2 text-xs font-mono text-[#FF8559] uppercase tracking-wider mb-1">
              <Layers className="w-4 h-4" />
              <span>Core Architectural Foundations</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold font-mono text-[#F5F5F5]">
              The Four Pillars of TRACEFORGE
            </h2>
            <p className="text-xs text-[#858E9B] mt-1 font-sans">
              Designed from first principles to replace slow, manual alert triage with deterministic graph algorithms.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card surface="primary" className="p-6 space-y-4">
              <div className="w-10 h-10 rounded-xl bg-[#321E17] border border-[#FF6B35]/40 flex items-center justify-center text-[#FF8559]">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold font-mono text-[#F5F5F5]">
                  1. FalkorDB Graph Theoretic Core
                </h3>
                <p className="text-xs text-[#858E9B] font-sans mt-2 leading-relaxed">
                  Stores enterprise identities, cloud permissions, firewall rules, and known vulnerabilities as a directed property graph. Leverages sparse GraphBLAS linear algebra matrices for sub-5 millisecond multi-hop path traversal.
                </p>
              </div>
              <div className="pt-2 border-t border-[#2A3038] text-[11px] font-mono text-[#B0B7C3] flex items-center justify-between">
                <span>Index Engine: Sparse Matrix GraphBLAS</span>
                <span className="text-[#34D399] font-bold">&lt;5ms Traverse</span>
              </div>
            </Card>

            <Card surface="primary" className="p-6 space-y-4">
              <div className="w-10 h-10 rounded-xl bg-[#321E17] border border-[#FF6B35]/40 flex items-center justify-center text-[#FF8559]">
                <Workflow className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold font-mono text-[#F5F5F5]">
                  2. Minimum-Cut Containment Engine
                </h3>
                <p className="text-xs text-[#858E9B] font-sans mt-2 leading-relaxed">
                  Instead of panicking and isolating an entire production subnet, TRACEFORGE computes the exact min-cut capacity. It severs only the minimal edges required to starve the attack, preserving normal business operations.
                </p>
              </div>
              <div className="pt-2 border-t border-[#2A3038] text-[11px] font-mono text-[#B0B7C3] flex items-center justify-between">
                <span>Theorem: Edmonds-Karp / Max-Flow Min-Cut</span>
                <span className="text-[#34D399] font-bold">0% Collateral Outage</span>
              </div>
            </Card>

            <Card surface="primary" className="p-6 space-y-4">
              <div className="w-10 h-10 rounded-xl bg-[#321E17] border border-[#FF6B35]/40 flex items-center justify-center text-[#FF8559]">
                <Cpu className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold font-mono text-[#F5F5F5]">
                  3. Model Context Protocol (MCP) Multi-Agent
                </h3>
                <p className="text-xs text-[#858E9B] font-sans mt-2 leading-relaxed">
                  Nine native MCP security tools orchestrate autonomous reasoning. LLMs and forensic agents invoke standardized schema endpoints without hallucinating attack routes or bypassing security policy guardrails.
                </p>
              </div>
              <div className="pt-2 border-t border-[#2A3038] text-[11px] font-mono text-[#B0B7C3] flex items-center justify-between">
                <span>Standard: Anthropic Model Context Protocol</span>
                <span className="text-[#60A5FA] font-bold">9 Native Tools</span>
              </div>
            </Card>

            <Card surface="primary" className="p-6 space-y-4">
              <div className="w-10 h-10 rounded-xl bg-[#321E17] border border-[#FF6B35]/40 flex items-center justify-center text-[#FF8559]">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold font-mono text-[#F5F5F5]">
                  4. 100% Production Isolation (Read-Only Prod)
                </h3>
                <p className="text-xs text-[#858E9B] font-sans mt-2 leading-relaxed">
                  Production topology is strictly read-only. Containment hypotheses and firewall mutations run inside ephemeral simulation sandboxes (<code className="text-[#B0B7C3] font-mono">tf-sim-*</code>). No policy changes touch live infra without explicit SOC analyst authorization.
                </p>
              </div>
              <div className="pt-2 border-t border-[#2A3038] text-[11px] font-mono text-[#B0B7C3] flex items-center justify-between">
                <span>Guardrail: Ephemeral Sandbox Forking</span>
                <span className="text-[#34D399] font-bold">HITL Gated</span>
              </div>
            </Card>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* 8. HOW TRACEFORGE WORKS IN 5 STAGES */}
        {/* ========================================================================= */}
        <section id="pipeline" className="space-y-6">
          <div className="border-b border-[#2A3038] pb-4">
            <div className="flex items-center gap-2 text-xs font-mono text-[#FF8559] uppercase tracking-wider mb-1">
              <GitBranch className="w-4 h-4" />
              <span>End-to-End Operational Workflow</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold font-mono text-[#F5F5F5]">
              How TRACEFORGE Works in 5 Stages
            </h2>
            <p className="text-xs text-[#858E9B] mt-1 font-sans">
              The continuous pipeline from multi-cloud telemetry ingestion to verified human-in-the-loop containment.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {[
              {
                step: '01',
                title: 'Ingestion & Topology',
                desc: 'Consolidates AWS, Azure, Active Directory, and CrowdStrike EDR telemetry into FalkorDB property graph.',
                badge: 'Live Sync',
              },
              {
                step: '02',
                title: 'Path Discovery',
                desc: 'Traverses multi-hop lateral routes across credentials, SSH keys, and unpatched KEV vulnerabilities.',
                badge: '<5ms Cypher',
              },
              {
                step: '03',
                title: 'Min-Cut Math',
                desc: 'Applies Edmonds-Karp maximum-flow/minimum-cut theorem to compute the optimal edge cut set.',
                badge: 'Zero Outage',
              },
              {
                step: '04',
                title: 'Sandbox Simulation',
                desc: 'Forks a disposable tf-sim-* sandbox graph to test severed edges and prove attacker containment.',
                badge: 'Read-Only Prod',
              },
              {
                step: '05',
                title: 'HITL Authorization',
                desc: 'SecOps analyst reviews structured containment proposals, business impact scores, and authorizes action.',
                badge: 'Analyst Gate',
              },
            ].map(stage => (
              <div
                key={stage.step}
                className="p-5 rounded-xl bg-[#121519] border border-[#2A3038] space-y-3 flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-[#FF8559]">{stage.step}</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#191D22] text-[#B0B7C3] border border-[#2A3038]">
                      {stage.badge}
                    </span>
                  </div>
                  <h4 className="text-xs font-bold font-mono text-[#F5F5F5]">{stage.title}</h4>
                  <p className="text-[11px] text-[#858E9B] font-sans leading-relaxed">{stage.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ========================================================================= */}
        {/* 9. BUILT ON MODEL CONTEXT PROTOCOL (MCP) */}
        {/* ========================================================================= */}
        <section id="mcp" className="space-y-6">
          <div className="border-b border-[#2A3038] pb-4">
            <div className="flex items-center gap-2 text-xs font-mono text-[#FF8559] uppercase tracking-wider mb-1">
              <Cpu className="w-4 h-4" />
              <span>Tool Specification</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold font-mono text-[#F5F5F5]">
              Built on Model Context Protocol (MCP)
            </h2>
            <p className="text-xs text-[#858E9B] mt-1 font-sans">
              Nine native MCP security tools enable autonomous agents to reason over graph topology, discover attack paths, and verify containment safety.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              {
                name: 'inspect_graph',
                desc: 'Queries node counts, relationship schemas, and entity properties across the active FalkorDB instance.',
                type: 'Topology Discovery',
              },
              {
                name: 'find_paths',
                desc: 'Calculates all shortest and multi-hop lateral movement routes between footholds and critical servers.',
                type: 'Lateral Analysis',
              },
              {
                name: 'simulate_containment',
                desc: 'Executes Edmonds-Karp min-cut algorithms in a disposable tf-sim-* sandbox graph to test disruption.',
                type: 'Disruption Math',
              },
              {
                name: 'run_query',
                desc: 'Executes read-only Cypher queries against the enterprise topology with strict schema guardrails.',
                type: 'Cypher Querying',
              },
              {
                name: 'reconstruct_incident',
                desc: 'Synthesizes chronological evidence items, telemetry hops, and attack progressions into an incident case.',
                type: 'Forensics',
              },
              {
                name: 'explain_recommendation',
                desc: 'Generates detailed audit rationale, proving why the proposed min-cut minimizes business disruption.',
                type: 'HITL Rationale',
              },
              {
                name: 'analyze_risk_sensitivity',
                desc: 'Models asset criticality score fluctuations when intermediate jump boxes or credentials are breached.',
                type: 'Risk Modeling',
              },
              {
                name: 'verify_evidence_integrity',
                desc: 'Classifies telemetry evidence items, distinguishing trusted host telemetry from hostile payload injection.',
                type: 'Evidence Triage',
              },
              {
                name: 'record_outcome_memory',
                desc: 'Persists post-incident containment resolutions into long-term organizational defense memory.',
                type: 'Adaptive Learning',
              },
            ].map(tool => (
              <div
                key={tool.name}
                className="p-4 rounded-xl bg-[#121519] border border-[#2A3038] space-y-2 font-mono text-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[#FF8559] font-bold">{tool.name}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#191D22] text-[#858E9B] border border-[#2A3038]">
                    {tool.type}
                  </span>
                </div>
                <p className="text-[11px] text-[#858E9B] font-sans leading-relaxed">{tool.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ========================================================================= */}
        {/* 10. ARCHITECTURAL COMPARISON MATRIX */}
        {/* ========================================================================= */}
        <section id="comparison" className="space-y-6">
          <div className="border-b border-[#2A3038] pb-4">
            <div className="flex items-center gap-2 text-xs font-mono text-[#FF8559] uppercase tracking-wider mb-1">
              <ShieldAlert className="w-4 h-4" />
              <span>Technical Benchmark</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold font-mono text-[#F5F5F5]">
              Architectural Comparison Matrix
            </h2>
            <p className="text-xs text-[#858E9B] mt-1 font-sans">
              How TRACEFORGE compares against traditional SecOps paradigms.
            </p>
          </div>

          <div className="w-full overflow-x-auto rounded-xl border border-[#2A3038] bg-[#121519]">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-[#191D22] text-[#B0B7C3] uppercase tracking-wider border-b border-[#2A3038]">
                <tr>
                  <th className="px-4 py-3.5">Capability</th>
                  <th className="px-4 py-3.5 text-[#FF8559]">TRACEFORGE</th>
                  <th className="px-4 py-3.5 text-[#858E9B]">Legacy SIEM</th>
                  <th className="px-4 py-3.5 text-[#858E9B]">SOAR Playbooks</th>
                  <th className="px-4 py-3.5 text-[#858E9B]">Black-Box AI</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2A3038]">
                <tr>
                  <td className="px-4 py-3 text-[#F5F5F5] font-semibold">Core Topology Representation</td>
                  <td className="px-4 py-3 text-[#34D399]">Directed Property Graph (FalkorDB)</td>
                  <td className="px-4 py-3 text-[#858E9B]">Flat Relational Logs</td>
                  <td className="px-4 py-3 text-[#858E9B]">Hardcoded Script Variables</td>
                  <td className="px-4 py-3 text-[#858E9B]">Unstructured Prompts</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 text-[#F5F5F5] font-semibold">Lateral Path Traversal</td>
                  <td className="px-4 py-3 text-[#34D399]">&lt;5ms GraphBLAS Cypher</td>
                  <td className="px-4 py-3 text-[#FB7185]">Manual Analyst Queries (Hours)</td>
                  <td className="px-4 py-3 text-[#FB7185]">Brittle 1-Hop Webhooks</td>
                  <td className="px-4 py-3 text-[#FBBF24]">Hallucinated Routes</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 text-[#F5F5F5] font-semibold">Containment Action Selection</td>
                  <td className="px-4 py-3 text-[#34D399]">Edmonds-Karp Minimum-Cut</td>
                  <td className="px-4 py-3 text-[#FB7185]">None (Alert Only)</td>
                  <td className="px-4 py-3 text-[#FBBF24]">Disconnect Entire Subnet</td>
                  <td className="px-4 py-3 text-[#FB7185]">Unverified Mutations</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 text-[#F5F5F5] font-semibold">Production Safety Policy</td>
                  <td className="px-4 py-3 text-[#34D399]">Strict Read-Only + Sandbox Fork</td>
                  <td className="px-4 py-3 text-[#858E9B]">Passive Read-Only</td>
                  <td className="px-4 py-3 text-[#FB7185]">Mutates Live Production Directly</td>
                  <td className="px-4 py-3 text-[#FB7185]">Unpredictable Live Execution</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 text-[#F5F5F5] font-semibold">Human In The Loop (HITL)</td>
                  <td className="px-4 py-3 text-[#34D399]">Formal Approval Gate with Proposal Diff</td>
                  <td className="px-4 py-3 text-[#858E9B]">Manual Execution Required</td>
                  <td className="px-4 py-3 text-[#FBBF24]">Post-Action Alert Only</td>
                  <td className="px-4 py-3 text-[#FB7185]">No Gate (Auto-Executes)</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* 11. ENTERPRISE PLATFORM MODULES */}
        {/* ========================================================================= */}
        <section className="space-y-6">
          <div className="border-b border-[#2A3038] pb-4">
            <h2 className="text-xl sm:text-2xl font-bold font-mono text-[#F5F5F5]">
              Console Platform Modules
            </h2>
            <p className="text-xs text-[#858E9B] mt-1 font-sans">
              Direct access to all security engineering workspaces.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                title: 'SecOps Command',
                path: '/dashboard',
                icon: <Activity className="w-5 h-5 text-[#FF8559]" />,
                desc: 'Real-time telemetry overview, active attack paths, and recent cases.',
              },
              {
                title: 'Attack Graph',
                path: '/graph',
                icon: <Network className="w-5 h-5 text-[#60A5FA]" />,
                desc: 'Interactive 2D force-directed topology visualizer with Cypher querying.',
              },
              {
                title: 'Investigations',
                path: '/investigations',
                icon: <SearchCheck className="w-5 h-5 text-[#FBBF24]" />,
                desc: 'Autonomous MCP multi-agent incident reconstruction and analysis.',
              },
              {
                title: 'Defense Lab',
                path: '/defense-lab',
                icon: <ShieldAlert className="w-5 h-5 text-[#34D399]" />,
                desc: 'Disposable sandbox simulation for dry-running containment actions.',
              },
              {
                title: 'Threat Mapping',
                path: '/threat-mapping',
                icon: <Target className="w-5 h-5 text-[#FB7185]" />,
                desc: 'MITRE ATT&CK technique matrix mapped directly to graph hops.',
              },
              {
                title: 'Risk Analysis',
                path: '/risk-analysis',
                icon: <TrendingUp className="w-5 h-5 text-[#C084FC]" />,
                desc: 'Asset criticality curves and vulnerability sensitivity metrics.',
              },
              {
                title: 'Evidence Audit',
                path: '/evidence',
                icon: <FileCheck className="w-5 h-5 text-[#60A5FA]" />,
                desc: 'Hostile injection classification and provenance verification.',
              },
              {
                title: 'Case Management',
                path: '/cases',
                icon: <FolderArchive className="w-5 h-5 text-[#FBBF24]" />,
                desc: 'Analyst triage queues and human-in-the-loop containment approvals.',
              },
            ].map(mod => (
              <div
                key={mod.title}
                onClick={() => navigate(mod.path)}
                className="p-5 rounded-xl bg-[#121519] border border-[#2A3038] hover:border-[#FF6B35]/50 transition-all duration-180 cursor-pointer space-y-3 group"
              >
                <div className="p-2.5 rounded-lg bg-[#191D22] border border-[#2A3038] inline-flex">
                  {mod.icon}
                </div>
                <h4 className="text-sm font-bold font-mono text-[#F5F5F5] group-hover:text-[#FF8559] transition-colors">
                  {mod.title}
                </h4>
                <p className="text-xs text-[#858E9B] font-sans leading-relaxed">{mod.desc}</p>
                <div className="pt-2 text-[11px] font-mono text-[#858E9B] group-hover:text-[#FF8559] flex items-center gap-1 transition-colors">
                  <span>Enter workspace</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ========================================================================= */}
        {/* 12. CONVERSION CALL TO ACTION */}
        {/* ========================================================================= */}
        <section className="p-8 sm:p-12 rounded-2xl bg-[#121519] border border-[#2A3038] text-center space-y-6 relative overflow-hidden">
          <div className="max-w-2xl mx-auto space-y-3">
            <h2 className="text-2xl sm:text-4xl font-extrabold font-mono text-[#F5F5F5] tracking-tight">
              Ready to eliminate lateral attack paths in your enterprise?
            </h2>
            <p className="text-sm text-[#858E9B] font-sans leading-relaxed">
              Launch the production dashboard to inspect your topology, verify active attack paths, or simulate minimum-cut containment in a disposable sandbox.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 font-mono text-xs">
            <Button variant="primary" size="lg" onClick={() => navigate('/dashboard')}>
              <Play className="w-4 h-4 mr-2 fill-current" />
              Launch Console Dashboard (/dashboard)
            </Button>
            <Button variant="outline" size="lg" onClick={() => navigate('/login')}>
              <Lock className="w-4 h-4 mr-2 text-[#FF8559]" />
              Switch Analyst Role (/login)
            </Button>
          </div>
        </section>
      </main>

      {/* ========================================================================= */}
      {/* 13. EDITORIAL FOOTER WITH LOGO */}
      {/* ========================================================================= */}
      <footer className="border-t border-[#2A3038] bg-[#0B0D0F] py-12 text-xs font-mono text-[#858E9B]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg overflow-hidden flex items-center justify-center border border-[#2A3038] bg-[#0B0D0F] shadow-[0_0_12px_rgba(6,182,212,0.25)] shrink-0">
              <img src="/logo.png" alt="TRACEFORGE Logo" className="w-6 h-6 object-contain" />
            </div>
            <div>
              <span className="font-bold text-[#F5F5F5] tracking-wider">TRACEFORGE</span>
              <span className="text-[10px] text-[#858E9B] block">
                Graph Theoretic Disruption Engine
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-6 text-[11px] text-[#858E9B]">
            <span>FalkorDB Graph Engine Active</span>
            <span className="hidden sm:inline">|</span>
            <span>Edmonds-Karp Min-Cut Disruption</span>
            <span className="hidden sm:inline">|</span>
            <span>100% Production Isolation</span>
          </div>

          <div className="text-[11px] text-[#858E9B]">
            © {new Date().getFullYear()} TRACEFORGE Cyber Defense. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  )
}
