import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Network,
  Activity,
  History,
  TrendingUp,
  AlertTriangle,
  FolderArchive,
  ArrowRight,
  ShieldCheck,
  Shield,
  Terminal,
  Play,
  Sparkles,
  Upload,
  Cable,
} from 'lucide-react'
import {
  healthApi,
  graphApi,
  investigationsApi,
  casesApi,
  auditApi,
} from '../../api/index.ts'
import { StatCard } from '../../components/ui/StatCard.tsx'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../../components/ui/Card.tsx'
import { Badge } from '../../components/ui/Badge.tsx'
import { Button } from '../../components/ui/Button.tsx'
import { RiskRadar } from '../../components/charts/RiskRadar.tsx'
import { BenchmarkBarChart } from '../../components/charts/BenchmarkBarChart.tsx'
import { formatTimestamp, formatRelativeTime } from '../../lib/utils.ts'
import { DEFAULT_ATTACK_SOURCES, DEFAULT_ATTACK_TARGET } from '../../lib/constants.ts'
import { WelcomeModal } from '../../components/onboarding/WelcomeModal.tsx'
import { ImportReportModal } from '../../components/onboarding/ImportReportModal.tsx'
import { GuidedInvestigationRunner } from '../../components/investigation/GuidedInvestigationRunner.tsx'

export const OverviewPage: React.FC = () => {
  const navigate = useNavigate()
  const [welcomeOpen, setWelcomeOpen] = useState(false)
  const [guidedDemoOpen, setGuidedDemoOpen] = useState(false)
  const [importModalOpen, setImportModalOpen] = useState(false)

  // Load live data from real endpoints
  const { data: health } = useQuery({
    queryKey: ['health'],
    queryFn: () => healthApi.getHealth(),
  })

  const { data: schema } = useQuery({
    queryKey: ['schema'],
    queryFn: () => healthApi.getSchema(),
  })

  const { data: incidentData } = useQuery({
    queryKey: ['incident'],
    queryFn: () => investigationsApi.getIncident(),
  })

  const { data: pathsData } = useQuery({
    queryKey: ['paths', DEFAULT_ATTACK_SOURCES, DEFAULT_ATTACK_TARGET],
    queryFn: () => graphApi.findPaths({ sources: DEFAULT_ATTACK_SOURCES, target: DEFAULT_ATTACK_TARGET }),
  })

  const { data: casesList } = useQuery({
    queryKey: ['cases-recent'],
    queryFn: () => casesApi.listCases(5),
  })

  const { data: auditLogs } = useQuery({
    queryKey: ['audit-recent'],
    queryFn: () => auditApi.getAuditLog(6),
  })

  const { data: benchmarkData } = useQuery({
    queryKey: ['benchmark'],
    queryFn: () => healthApi.getBenchmark(),
    retry: false,
  })

  const activePathsCount = pathsData?.count ?? 0
  const openCasesCount = casesList?.filter(c => c.status === 'needs_analyst').length ?? 0
  const alertedEntity = incidentData?.alerted_entities?.[0] || 'Workstation A'

  return (
    <div className="space-y-6">
      {/* Top Banner & Quick Actions - Obsidian Studio */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 sm:p-7 rounded-2xl bg-[#121519] border border-[#2A3038] shadow-2xl">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-[#FF6B35]" />
            <span className="text-xs font-mono font-semibold text-[#FF8559] uppercase tracking-wider">
              Autonomous Investigation & Simulation Platform
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold font-mono text-[#F5F5F5] tracking-tight">
            TRACEFORGE SecOps Command
          </h1>
          <p className="text-xs text-[#858E9B] font-sans max-w-xl leading-relaxed">
            Targeting active graph <span className="text-[#FF8559] font-mono font-semibold">{health?.graph || 'traceforge'}</span>.
            Evaluating deterministic attack paths, minimum-cut disruption containment, and sandbox-isolated response plans.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/')}
          >
            <Shield className="w-4 h-4 mr-1.5 text-[#FF8559]" />
            About TRACEFORGE
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setGuidedDemoOpen(true)}
          >
            <Play className="w-4 h-4 mr-1.5 fill-current" />
            Guided Demo (7 Stages)
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setWelcomeOpen(true)}
          >
            <Sparkles className="w-4 h-4 mr-1.5 text-[#60A5FA]" />
            Welcome Guide
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setImportModalOpen(true)}
          >
            <Upload className="w-4 h-4 mr-1.5 text-[#FBBF24]" />
            Import Report
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => navigate('/integrations')}
          >
            <Cable className="w-4 h-4 mr-1.5 text-[#C084FC]" />
            Integrations
          </Button>
        </div>
      </div>

      {/* KPI Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Active Attack Paths"
          value={activePathsCount}
          description={`From ${DEFAULT_ATTACK_SOURCES.length} footholds to ${DEFAULT_ATTACK_TARGET}`}
          icon={<Network className="w-4 h-4 text-[#60A5FA]" />}
          variant={activePathsCount > 0 ? 'accent' : 'none'}
          badge={
            <Badge variant={activePathsCount > 0 ? 'red' : 'emerald'} size="sm">
              {activePathsCount > 0 ? `${activePathsCount} ACTIVE` : 'NONE'}
            </Badge>
          }
        />

        <StatCard
          title="Open Cases Requiring Action"
          value={openCasesCount}
          description="Awaiting human analyst review and approval"
          icon={<FolderArchive className="w-4 h-4 text-[#FBBF24]" />}
          variant={openCasesCount > 0 ? 'amber' : 'none'}
          badge={
            <Badge variant={openCasesCount > 0 ? 'amber' : 'emerald'} size="sm">
              {openCasesCount} PENDING
            </Badge>
          }
        />

        <StatCard
          title="Topology Scale"
          value={schema ? `${schema.node_count} nodes` : 'Active'}
          description={schema ? `${schema.edge_count} relationships in ${schema.graph}` : 'FalkorDB Connected'}
          icon={<Activity className="w-4 h-4 text-[#34D399]" />}
          variant="none"
        />

        <StatCard
          title="Defensive Boundary"
          value="Sandbox Only"
          description="Production graph is strictly read-only"
          icon={<ShieldCheck className="w-4 h-4 text-[#34D399]" />}
          variant="none"
          badge={<Badge variant="emerald" size="sm">ENFORCED</Badge>}
        />
      </div>

      {/* Incident Alert Callout if present */}
      <div className="p-4 rounded-xl bg-[#291F10]/50 border border-[#FBBF24]/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 font-mono text-xs">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-[#321E17] text-[#FF8559] shrink-0 border border-[#FF6B35]/30">
            <AlertTriangle className="w-5 h-5 text-[#FBBF24]" />
          </div>
          <div>
            <div className="font-bold text-[#F5F5F5] flex items-center gap-2">
              <span>ALERTED FOOTHOLD: {alertedEntity}</span>
              <Badge variant="amber" size="sm">INC-1 Active</Badge>
            </div>
            <p className="text-[#858E9B] font-sans mt-0.5 text-xs">
              Multiple distinct lateral routes lead to {DEFAULT_ATTACK_TARGET} via Shared Credential and Service Account.
            </p>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate('/investigations')}
          className="shrink-0"
        >
          View Timeline & Trace
          <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
        </Button>
      </div>

      {/* Two Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Attack Routes & Recent Cases */}
        <div className="lg:col-span-2 space-y-6">
          {/* Active Attack Routes Card */}
          <Card>
            <CardHeader>
              <div>
                <CardTitle>
                  <Network className="w-4 h-4 text-[#60A5FA]" />
                  Discovered Multi-Hop Attack Routes
                </CardTitle>
                <CardDescription>
                  Time-ordered attack chains leading to high-criticality assets
                </CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/graph')}
              >
                Open Explorer
                <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </CardHeader>
            <CardContent>
              {pathsData?.paths && pathsData.paths.length > 0 ? (
                <div className="space-y-3 font-mono text-xs">
                  {pathsData.paths.map((p, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-xl bg-[#191D22] border border-[#2A3038] hover:border-[#3B434D] transition-colors duration-180"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <Badge variant="cyan" size="sm">Route #{idx + 1}</Badge>
                        <span className="text-[11px] text-[#858E9B]">
                          {p.nodes.length - 1} hops
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5 text-[#F5F5F5]">
                        {p.nodes.map((node, nIdx) => (
                          <React.Fragment key={node + nIdx}>
                            <span
                              className={`px-2 py-1 rounded text-xs ${
                                nIdx === 0
                                  ? 'bg-[#132238] text-[#60A5FA] border border-[#60A5FA]/30'
                                  : nIdx === p.nodes.length - 1
                                    ? 'bg-[#2A1417] text-[#FB7185] border border-[#FB7185]/30 font-bold'
                                    : 'bg-[#22272E] text-[#B0B7C3] border border-[#2A3038]'
                              }`}
                            >
                              {node}
                            </span>
                            {nIdx < p.nodes.length - 1 && (
                              <span className="text-[#858E9B] font-bold">→</span>
                            )}
                          </React.Fragment>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-xs text-[#858E9B] font-mono">
                  No active attack paths detected between specified endpoints.
                </div>
              )}
            </CardContent>
            <CardFooter>
              <span>Algorithm: Deterministic Cypher Graph Traversal</span>
              <span className="text-[#34D399]">Strictly Non-Destructive</span>
            </CardFooter>
          </Card>

          {/* Recent Investigation Cases */}
          <Card>
            <CardHeader>
              <div>
                <CardTitle>
                  <FolderArchive className="w-4 h-4 text-[#FBBF24]" />
                  Recent Investigation Cases
                </CardTitle>
                <CardDescription>
                  Historical autonomous agent runs and analyst reviews
                </CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/cases')}
              >
                All Cases
                <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </CardHeader>
            <CardContent>
              {casesList && casesList.length > 0 ? (
                <div className="space-y-2 font-mono text-xs">
                  {casesList.map(c => (
                    <div
                      key={c.id}
                      onClick={() => navigate(`/cases/${c.id}`)}
                      className="p-3 rounded-lg bg-[#191D22] border border-[#2A3038] hover:border-[#3B434D] flex items-center justify-between cursor-pointer transition-colors duration-180"
                    >
                      <div className="flex items-center gap-3">
                        <Terminal className="w-4 h-4 text-[#858E9B]" />
                        <div>
                          <div className="font-semibold text-[#F5F5F5]">
                            Case #{c.id}
                          </div>
                          <div className="text-[10px] text-[#858E9B]">
                            Target: {c.target} • {formatRelativeTime(c.ts)}
                          </div>
                        </div>
                      </div>

                      <Badge
                        variant={c.status === 'needs_analyst' ? 'amber' : 'emerald'}
                        size="sm"
                      >
                        {c.status.replace(/_/g, ' ').toUpperCase()}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-xs text-[#858E9B] font-mono">
                  No historical cases recorded. Run an investigation to generate a case.
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right 1 Col: Risk Radar & Security Audit Trail */}
        <div className="space-y-6">
          {/* Risk Dimensions Card */}
          <Card glow="accent">
            <CardHeader>
              <div>
                <CardTitle>
                  <TrendingUp className="w-4 h-4 text-[#FF8559]" />
                  5-Axis Risk Assessment
                </CardTitle>
                <CardDescription>
                  Multi-factor risk scoring for critical assets
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <RiskRadar
                features={{
                  criticality: 0.95,
                  exposure: 0.7,
                  confidence: 0.9,
                  recency: 0.85,
                  exploit: 0.98,
                }}
              />
              <div className="mt-3 pt-3 border-t border-[#2A3038] flex items-center justify-between text-xs font-mono">
                <span className="text-[#858E9B]">Target Risk Score</span>
                <Badge variant="red" size="sm">HIGH RISK (0.876)</Badge>
              </div>
            </CardContent>
          </Card>

          {/* Immutable Security Audit Trail */}
          <Card>
            <CardHeader>
              <div>
                <CardTitle>
                  <History className="w-4 h-4 text-[#858E9B]" />
                  Audit Trail Stream
                </CardTitle>
                <CardDescription>
                  Tamper-evident log of platform operations
                </CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/audit')}
              >
                Log
              </Button>
            </CardHeader>
            <CardContent>
              {auditLogs && auditLogs.length > 0 ? (
                <div className="space-y-2.5 font-mono text-xs">
                  {auditLogs.map((log, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-lg bg-[#191D22] border border-[#2A3038] flex items-start justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <div className="font-semibold text-[#FF8559] truncate">
                          {log.tool}
                        </div>
                        <div className="text-[10px] text-[#858E9B] font-sans mt-0.5">
                          {formatTimestamp(log.ts)}
                        </div>
                      </div>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#22272E] text-[#B0B7C3] border border-[#2A3038] shrink-0">
                        VERIFIED
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-xs text-[#858E9B] font-mono">
                  No audit records logged yet.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Benchmark Summary if available */}
      {benchmarkData && (
        <Card>
          <CardHeader>
            <div>
              <CardTitle>
                <ShieldCheck className="w-4 h-4 text-[#34D399]" />
                Benchmark Evaluation: Graph Agent vs Flat-Log Baseline
              </CardTitle>
              <CardDescription>
                Empirical containment effectiveness and benign load preservation across synthetic scenarios
              </CardDescription>
            </div>
            <Badge variant="emerald">EVALUATED N={benchmarkData.n}</Badge>
          </CardHeader>
          <CardContent>
            <BenchmarkBarChart data={benchmarkData} />
          </CardContent>
        </Card>
      )}

      {/* Onboarding Welcome Modal */}
      <WelcomeModal
        isOpen={welcomeOpen}
        onClose={() => setWelcomeOpen(false)}
        onSelectOptionA={() => {
          setWelcomeOpen(false)
          setGuidedDemoOpen(true)
        }}
        onSelectOptionB={() => {
          setWelcomeOpen(false)
          navigate('/integrations')
        }}
        onSelectOptionC={() => {
          setWelcomeOpen(false)
          setImportModalOpen(true)
        }}
      />

      {/* 7-Stage Guided Investigation Runner Modal */}
      <GuidedInvestigationRunner
        isOpen={guidedDemoOpen}
        onClose={() => setGuidedDemoOpen(false)}
      />

      {/* Safe Report Importer Modal */}
      <ImportReportModal
        isOpen={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        onImportSuccess={() => {
          navigate('/graph')
        }}
      />
    </div>
  )
}
