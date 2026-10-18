import React, { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import {
  investigationsApi,
  casesApi,
  graphApi,
  type FullCase,
  type IncidentReconstruction,
  type EvidenceProvenanceReport,
} from '../../api/index.ts'
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '../../components/ui/Card.tsx'
import { Button } from '../../components/ui/Button.tsx'
import { Badge } from '../../components/ui/Badge.tsx'
import { Input } from '../../components/ui/Input.tsx'
import { Tabs } from '../../components/ui/Tabs.tsx'
import { PathTimelineChart } from '../../components/charts/PathTimelineChart.tsx'
import { useToast } from '../../components/ui/Toast.tsx'
import { DEFAULT_ATTACK_SOURCES, DEFAULT_ATTACK_TARGET } from '../../lib/constants.ts'
import {
  SearchCheck,
  Clock,
  FileCheck,
  Cpu,
  Terminal,
  ShieldAlert,
  Sparkles,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ShieldCheck,
  History,
  Lock,
  Scale,
  Eye,
  ChevronRight,
  ChevronDown,
  X,
  ExternalLink,
} from 'lucide-react'
import { cn } from '../../lib/utils.ts'

export const InvestigationsPage: React.FC = () => {
  const toast = useToast()
  const [sources, setSources] = useState<string[]>(DEFAULT_ATTACK_SOURCES)
  const [target, setTarget] = useState<string>(DEFAULT_ATTACK_TARGET)
  const [asOf, setAsOf] = useState<number | null>(null)
  const [activeTab, setActiveTab] = useState<'agent' | 'trace' | 'reconstruct' | 'provenance'>('agent')
  const [activeCase, setActiveCase] = useState<FullCase | null>(null)
  const [expandedStep, setExpandedStep] = useState<number | null>(null)
  const [showAuditModal, setShowAuditModal] = useState<boolean>(false)
  const [evidenceTab, setEvidenceTab] = useState<'facts' | 'assumptions' | 'risk'>('facts')

  // Run autonomous investigation mutation
  const investigateMutation = useMutation({
    mutationFn: () => investigationsApi.runAutonomousInvestigation({ sources, target }),
    onSuccess: (data) => {
      setActiveCase(data)
      toast.success('Investigation Complete', 'Autonomous agent produced evidence-grounded hypotheses.')
    },
    onError: (err: Error) => {
      toast.error('Investigation Failed', err.message)
    },
  })

  // Approve / reject mutation
  const approveMutation = useMutation({
    mutationFn: ({ approve, actions }: { approve: boolean; actions?: any[] }) =>
      casesApi.approveCase(activeCase!.id, {
        approve,
        approver: 'analyst',
        actions,
      }),
    onSuccess: updatedCase => {
      setActiveCase(updatedCase)
      if (updatedCase.status === 'verified') {
        toast.success(
          'Intervention Verified',
          'Sandbox simulation confirmed 0 remaining attack paths.'
        )
      } else if (updatedCase.status === 'rejected') {
        toast.info(
          'Intervention Rejected',
          'Analyst rejected proposed action. No changes were simulated.'
        )
      } else {
        toast.warning(
          'Residual Risk Detected',
          `Simulation detected ${updatedCase.verification?.after ?? 'remaining'} residual path(s).`
        )
      }
    },
    onError: (err: Error) => toast.error('Approval Action Failed', err.message),
  })

  // Run reconstruction
  const reconstructMutation = useMutation({
    mutationFn: () => investigationsApi.reconstruct({ sources, target, as_of: asOf }),
    onSuccess: () => toast.success('Reconstruction Updated', 'Chronology and evidence gaps evaluated.'),
    onError: (err: Error) => toast.error('Reconstruction Error', err.message),
  })

  // Run provenance
  const provenanceMutation = useMutation({
    mutationFn: () => investigationsApi.provenance({ sources, target, as_of: asOf }),
    onSuccess: () => toast.success('Provenance Generated', 'Evidence traceability verified.'),
    onError: (err: Error) => toast.error('Provenance Error', err.message),
  })

  // Fetch temporal trace
  const { data: traceData, isLoading: isTraceLoading, refetch: refetchTrace } = useQuery({
    queryKey: ['trace', sources, target, asOf],
    queryFn: () => graphApi.tracePaths({ sources, target, as_of: asOf }),
    enabled: sources.length > 0 && !!target,
  })

  const tabs = [
    { id: 'agent', label: 'Autonomous Agent Investigation', icon: <Cpu className="w-3.5 h-3.5" /> },
    { id: 'trace', label: 'Temporal Path Tracing', icon: <Clock className="w-3.5 h-3.5" />, badge: traceData?.count },
    { id: 'reconstruct', label: 'Incident Reconstruction', icon: <SearchCheck className="w-3.5 h-3.5" /> },
    { id: 'provenance', label: 'Evidence Provenance', icon: <FileCheck className="w-3.5 h-3.5" /> },
  ]

  const agentResult: FullCase | undefined = activeCase || investigateMutation.data
  const reconstructResult: IncidentReconstruction | undefined = reconstructMutation.data
  const provenanceResult: EvidenceProvenanceReport | undefined = provenanceMutation.data

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="amber" size="sm">Incident Investigation Engine</Badge>
            <span className="text-xs font-mono text-slate-400">Strict Non-Hallucination Guardrails</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold font-mono text-slate-100 tracking-tight mt-1 flex items-center gap-2">
            <SearchCheck className="w-6 h-6 text-amber-400" />
            Security Investigation Workspace
          </h1>
          <p className="text-xs text-slate-400 font-sans mt-0.5">
            Execute autonomous multi-step reasoning, trace temporal progression, and verify evidence provenance.
          </p>
        </div>

        <Button
          variant="neon"
          size="md"
          onClick={() => investigateMutation.mutate()}
          isLoading={investigateMutation.isPending}
        >
          <Sparkles className="w-4 h-4 mr-2" />
          Run Autonomous Agent
        </Button>
      </div>

      {/* Target & Time-Travel Controls */}
      <Card>
        <CardContent className="p-4 flex flex-col md:flex-row items-center gap-4">
          <div className="flex-1 w-full grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-[10px] uppercase font-mono text-slate-400 block mb-1">
                Starting Foothold Sources
              </label>
              <Input
                value={sources.join(', ')}
                onChange={e =>
                  setSources(
                    e.target.value
                      .split(',')
                      .map(s => s.trim())
                      .filter(Boolean)
                  )
                }
                placeholder="Workstation A, Secondary Foothold"
              />
            </div>

            <div>
              <label className="text-[10px] uppercase font-mono text-slate-400 block mb-1">
                Target Asset
              </label>
              <Input
                value={target}
                onChange={e => setTarget(e.target.value.trim())}
                placeholder="Critical Server"
              />
            </div>

            <div>
              <label className="text-[10px] uppercase font-mono text-slate-400 block mb-1">
                Time-Travel Upper Bound (as_of)
              </label>
              <Input
                type="number"
                value={asOf ?? ''}
                onChange={e => setAsOf(e.target.value ? parseInt(e.target.value, 10) : null)}
                placeholder="e.g. 250 (leave empty for current)"
              />
            </div>
          </div>

          <div className="shrink-0 flex items-center gap-2 w-full md:w-auto mt-2 md:mt-0">
            <Button
              variant="outline"
              size="md"
              className="w-full md:w-auto"
              onClick={() => {
                refetchTrace()
                reconstructMutation.mutate()
                provenanceMutation.mutate()
              }}
              isLoading={isTraceLoading}
            >
              Update Queries
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Navigation Tabs */}
      <Tabs
        tabs={tabs}
        activeTab={activeTab}
        onChange={tabId => {
          setActiveTab(tabId as typeof activeTab)
          if (tabId === 'reconstruct' && !reconstructResult) {
            reconstructMutation.mutate()
          }
          if (tabId === 'provenance' && !provenanceResult) {
            provenanceMutation.mutate()
          }
        }}
      />

      {/* TAB 1: Autonomous Agent Investigation */}
      {activeTab === 'agent' && (
        <div className="space-y-6">
          {!agentResult ? (
            <div className="p-12 text-center border border-dashed border-slate-800 rounded-xl bg-slate-950/20 font-mono">
              <Cpu className="w-10 h-10 text-emerald-400 mx-auto mb-3 opacity-80" />
              <h3 className="text-base font-semibold text-slate-200">Autonomous Agent Idle</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto mt-1 font-sans">
                Click &quot;Run Autonomous Agent&quot; above to inspect the topology, query temporal evidence, evaluate hypotheses, and propose verified containment.
              </p>
              <Button
                variant="neon"
                size="sm"
                className="mt-4"
                onClick={() => investigateMutation.mutate()}
                isLoading={investigateMutation.isPending}
              >
                Launch Investigation
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Executive Pipeline Stepper */}
              <div className="p-4 rounded-2xl bg-[#121519]/80 border border-[#1F242C] shadow-lg">
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 font-mono text-[11px]">
                  {/* 1. Evidence Grounding */}
                  <div className="p-2.5 rounded-xl bg-[#0B0D0F] border border-[#1F242C] flex items-center gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-emerald-950/80 border border-emerald-500/40 text-emerald-400 font-bold flex items-center justify-center text-[10px] shrink-0">1</span>
                    <div className="min-w-0">
                      <div className="text-slate-500 text-[9px] uppercase tracking-wider font-sans font-semibold">Evidence</div>
                      <div className="text-slate-200 font-semibold truncate">{agentResult.paths?.length || 0} Attack Routes</div>
                    </div>
                  </div>

                  {/* 2. Reasoning */}
                  <div className="p-2.5 rounded-xl bg-[#0B0D0F] border border-[#1F242C] flex items-center gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-emerald-950/80 border border-emerald-500/40 text-emerald-400 font-bold flex items-center justify-center text-[10px] shrink-0">2</span>
                    <div className="min-w-0">
                      <div className="text-slate-500 text-[9px] uppercase tracking-wider font-sans font-semibold">Reasoning</div>
                      <div className="text-slate-200 font-semibold truncate">Minimum Cut</div>
                    </div>
                  </div>

                  {/* 3. Defense Proposal */}
                  <div className="p-2.5 rounded-xl bg-[#0B0D0F] border border-[#1F242C] flex items-center gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-amber-950/80 border border-amber-500/40 text-amber-400 font-bold flex items-center justify-center text-[10px] shrink-0">3</span>
                    <div className="min-w-0">
                      <div className="text-slate-500 text-[9px] uppercase tracking-wider font-sans font-semibold">Proposed Cut</div>
                      <div className="text-slate-200 font-semibold truncate">{agentResult.proposal?.size || 0} Actions</div>
                    </div>
                  </div>

                  {/* 4. Analyst Decision */}
                  <div className="p-2.5 rounded-xl bg-[#0B0D0F] border border-[#1F242C] flex items-center gap-2.5">
                    <span className={cn(
                      'w-5 h-5 rounded-full font-bold flex items-center justify-center text-[10px] shrink-0',
                      agentResult.status === 'verified' || agentResult.status === 'residual_risk'
                        ? 'bg-emerald-950/80 border border-emerald-500/40 text-emerald-400'
                        : agentResult.status === 'rejected'
                          ? 'bg-rose-950/80 border border-rose-500/40 text-rose-400'
                          : 'bg-amber-950/80 border border-amber-500/40 text-amber-400 animate-pulse'
                    )}>4</span>
                    <div className="min-w-0">
                      <div className="text-slate-500 text-[9px] uppercase tracking-wider font-sans font-semibold">Analyst</div>
                      <div className="text-slate-200 font-semibold truncate">
                        {agentResult.status === 'awaiting_approval' ? 'Decision Pending' : agentResult.status.toUpperCase()}
                      </div>
                    </div>
                  </div>

                  {/* 5. Verification */}
                  <div className="p-2.5 rounded-xl bg-[#0B0D0F] border border-[#1F242C] flex items-center gap-2.5 col-span-2 sm:col-span-1">
                    <span className={cn(
                      'w-5 h-5 rounded-full font-bold flex items-center justify-center text-[10px] shrink-0',
                      agentResult.contained
                        ? 'bg-emerald-950/80 border border-emerald-500/40 text-emerald-400'
                        : agentResult.status === 'rejected'
                          ? 'bg-slate-900 border border-slate-700 text-slate-500'
                          : agentResult.status === 'residual_risk'
                            ? 'bg-amber-950/80 border border-amber-500/40 text-amber-400'
                            : 'bg-slate-900 border border-slate-700 text-slate-500'
                    )}>5</span>
                    <div className="min-w-0">
                      <div className="text-slate-500 text-[9px] uppercase tracking-wider font-sans font-semibold">Verification</div>
                      <div className={cn(
                        'font-semibold truncate',
                        agentResult.contained ? 'text-emerald-400' : agentResult.status === 'residual_risk' ? 'text-amber-400' : 'text-slate-400'
                      )}>
                        {agentResult.contained ? 'Verified (0 Paths)' : agentResult.status === 'residual_risk' ? 'Residual Risk' : 'Awaiting Sim'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Case Bar */}
              <div className="p-4 rounded-xl bg-[#121519] border border-[#1F242C] flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex flex-wrap items-center gap-2.5">
                  <Badge variant="emerald" size="sm">Case #{agentResult.id}</Badge>
                  <span className="font-mono text-slate-400">Target: <strong className="text-slate-200">{agentResult.target}</strong></span>
                  <Badge variant="cyan" size="sm">Mode: {agentResult.mode}</Badge>
                  <span className="text-slate-500 font-mono text-[11px] hidden sm:inline">
                    • Sources: {agentResult.sources.join(', ')}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <Badge
                    variant={
                      agentResult.status === 'verified'
                        ? 'emerald'
                        : agentResult.status === 'rejected'
                          ? 'red'
                          : 'amber'
                    }
                  >
                    STATUS: {agentResult.status.toUpperCase()}
                  </Badge>

                  {agentResult.audit_record && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowAuditModal(true)}
                    >
                      <Eye className="w-3.5 h-3.5 mr-1 text-cyan-400" />
                      Audit Trail
                    </Button>
                  )}
                </div>
              </div>

              {/* Two-Column Cyber Cockpit Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* LEFT COLUMN: Command & Containment (7 cols) */}
                <div className="lg:col-span-7 space-y-6">
                  {/* Recommended Defensive Intervention Card */}
                  {agentResult.proposal && (
                    <Card glow={agentResult.status === 'awaiting_approval' ? 'amber' : 'none'}>
                      <CardHeader className="flex flex-row items-center justify-between border-b border-[#1F242C] pb-3">
                        <div className="flex items-center gap-2">
                          <ShieldAlert className="w-4 h-4 text-amber-400" />
                          <CardTitle className="text-sm font-bold font-mono">
                            Recommended Containment Plan
                          </CardTitle>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="amber" size="sm">
                            {agentResult.proposal.size} Cut Actions
                          </Badge>
                          <Badge variant="cyan" size="sm">
                            Disruption: {agentResult.proposal.disruption}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4 pt-4">
                        {/* Intervention Action List */}
                        <div className="space-y-2">
                          {agentResult.proposal.cut.map((action, aIdx) => (
                            <div
                              key={aIdx}
                              className="p-3 rounded-xl bg-[#0B0D0F] border border-[#1F242C] hover:border-[#2E3642] flex items-center justify-between transition-colors"
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <span className="w-5 h-5 rounded-md bg-rose-950/80 border border-rose-500/40 text-rose-400 text-[10px] font-mono font-bold flex items-center justify-center shrink-0">
                                  {aIdx + 1}
                                </span>
                                <div className="min-w-0">
                                  <div className="text-xs font-mono font-bold text-slate-200 flex items-center gap-1.5 flex-wrap">
                                    <span>{action.src}</span>
                                    <span className="text-[#FF8559] font-sans font-bold">→</span>
                                    <span>{action.dst}</span>
                                    <Badge variant="cyan" size="sm">:{action.rel}</Badge>
                                  </div>
                                </div>
                              </div>
                              <span className="text-[11px] font-mono text-slate-500 shrink-0 ml-2">
                                Benign Load: <strong className="text-slate-300">{action.benign_load ?? 0}</strong>
                              </span>
                            </div>
                          ))}
                        </div>

                        {/* Human Analyst Decision Center */}
                        {agentResult.status === 'awaiting_approval' ? (
                          <div className="p-4 rounded-xl bg-[#161B22] border border-amber-500/40 space-y-3 shadow-inner">
                            <div className="flex items-center justify-between">
                              <div className="font-mono font-bold text-amber-300 text-xs flex items-center gap-2">
                                <Lock className="w-3.5 h-3.5 text-amber-400" />
                                Human Analyst Decision Required
                              </div>
                              <span className="text-[10px] font-mono text-amber-400 uppercase tracking-wider">
                                Safety Gated
                              </span>
                            </div>
                            <p className="text-slate-300 font-sans text-xs leading-relaxed">
                              Proposed actions remain inactive until analyst review. Choose an authorized action to execute within an isolated sandbox.
                            </p>
                            <div className="flex flex-wrap items-center gap-2.5 pt-1">
                              <Button
                                variant="neon"
                                size="sm"
                                onClick={() => approveMutation.mutate({ approve: true })}
                                isLoading={approveMutation.isPending}
                              >
                                <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                                Authorize Full Containment
                              </Button>

                              {agentResult.proposal.cut.length > 1 && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => approveMutation.mutate({ approve: true, actions: agentResult.proposal!.cut.slice(0, 1) })}
                                  isLoading={approveMutation.isPending}
                                  title="Demonstrates detection of residual risk when intervention is incomplete"
                                >
                                  <AlertTriangle className="w-3.5 h-3.5 mr-1.5 text-amber-400" />
                                  Simulate Partial Cut
                                </Button>
                              )}

                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => approveMutation.mutate({ approve: false })}
                                isLoading={approveMutation.isPending}
                              >
                                <XCircle className="w-3.5 h-3.5 mr-1.5" />
                                Reject Proposal
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="p-3 rounded-xl bg-[#0B0D0F] border border-[#1F242C] flex items-center justify-between text-xs font-mono">
                            <span className="text-slate-400">Analyst Authorization:</span>
                            <span className={agentResult.status === 'rejected' ? 'text-rose-400 font-bold' : 'text-emerald-400 font-bold'}>
                              {agentResult.status === 'rejected' ? 'PROPOSAL REJECTED' : 'AUTHORIZED BY ANALYST'}
                            </span>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}

                  {/* Isolated Sandbox Simulation & Independent Verification Card */}
                  {(agentResult.verification || agentResult.status === 'verified' || agentResult.status === 'residual_risk' || agentResult.status === 'rejected') && (
                    <Card glow={agentResult.contained ? 'emerald' : agentResult.status === 'rejected' ? 'none' : 'amber'}>
                      <CardHeader className="flex flex-row items-center justify-between border-b border-[#1F242C] pb-3">
                        <div className="flex items-center gap-2">
                          <ShieldCheck className={cn('w-4 h-4', agentResult.contained ? 'text-emerald-400' : 'text-amber-400')} />
                          <CardTitle className="text-sm font-bold font-mono">
                            Sandbox Simulation & Independent Verification
                          </CardTitle>
                        </div>
                        <Badge
                          variant={agentResult.contained ? 'emerald' : agentResult.status === 'rejected' ? 'slate' : 'amber'}
                        >
                          {agentResult.verification_status || agentResult.status.toUpperCase()}
                        </Badge>
                      </CardHeader>
                      <CardContent className="space-y-4 pt-4">
                        {/* Status Alert Banner */}
                        {agentResult.contained ? (
                          <div className="p-3.5 rounded-xl bg-emerald-950/30 border border-emerald-500/40 text-emerald-200 text-xs flex items-center gap-2.5">
                            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                            <span className="font-sans leading-relaxed">
                              <strong>Verification Passed:</strong> Independent post-action path query confirmed <strong>0 reachable attack routes</strong> remain. Production graph was never modified.
                            </span>
                          </div>
                        ) : agentResult.status === 'rejected' ? (
                          <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-300 text-xs flex items-center gap-2.5">
                            <XCircle className="w-4 h-4 text-slate-400 shrink-0" />
                            <span className="font-sans">
                              Simulation skipped: Analyst rejected the proposed containment action.
                            </span>
                          </div>
                        ) : (
                          <div className="p-3.5 rounded-xl bg-amber-950/40 border border-amber-500/50 text-amber-200 text-xs space-y-2">
                            <div className="flex items-center gap-2 font-bold font-mono">
                              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                              <span>Residual Risk Detected ({agentResult.verification?.after} Route Remaining)</span>
                            </div>
                            <p className="font-sans text-[11px] leading-relaxed text-amber-100">
                              Partial cut was insufficient to fully contain attack surface. Active routes detected:
                            </p>
                            {agentResult.verification?.remaining_paths && (
                              <div className="space-y-1 pt-1 font-mono text-[10px]">
                                {agentResult.verification.remaining_paths.map((rp, rpIdx) => (
                                  <div key={rpIdx} className="p-1.5 rounded bg-black/50 border border-amber-500/20 text-amber-200">
                                    {rp.nodes.join(' → ')} ({rp.rels.join(', ')})
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Telemetry Metric Cards */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                          <div className="p-3 rounded-xl bg-[#0B0D0F] border border-[#1F242C]">
                            <div className="text-[10px] uppercase font-mono text-slate-500">Sandbox Graph</div>
                            <div className="font-mono font-bold text-xs text-cyan-300 mt-1 truncate" title={agentResult.simulation?.sim_id}>
                              {agentResult.simulation?.sim_id ? agentResult.simulation.sim_id.slice(0, 16) : 'N/A'}
                            </div>
                          </div>

                          <div className="p-3 rounded-xl bg-[#0B0D0F] border border-[#1F242C]">
                            <div className="text-[10px] uppercase font-mono text-slate-500">Production Graph</div>
                            <div className="font-mono font-bold text-xs text-emerald-400 mt-1 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                              <span>0 Writes</span>
                            </div>
                          </div>

                          <div className="p-3 rounded-xl bg-[#0B0D0F] border border-[#1F242C]">
                            <div className="text-[10px] uppercase font-mono text-slate-500">Before Cut</div>
                            <div className="font-mono font-bold text-xs text-slate-200 mt-1">
                              {agentResult.verification?.before ?? agentResult.paths?.length ?? 0} Path(s)
                            </div>
                          </div>

                          <div className="p-3 rounded-xl bg-[#0B0D0F] border border-[#1F242C]">
                            <div className="text-[10px] uppercase font-mono text-slate-500">After Cut</div>
                            <div className={cn('font-mono font-bold text-xs mt-1', agentResult.contained ? 'text-emerald-400' : 'text-amber-400')}>
                              {agentResult.verification?.after ?? 0} Path(s)
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Hypotheses List */}
                  {agentResult.hypotheses && agentResult.hypotheses.length > 0 && (
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between border-b border-[#1F242C] pb-3">
                        <div className="flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-cyan-400" />
                          <CardTitle className="text-sm font-bold font-mono">
                            Bayesian Lateral Movement Hypotheses
                          </CardTitle>
                        </div>
                        <Badge variant="cyan" size="sm">{agentResult.hypotheses.length} Hypotheses</Badge>
                      </CardHeader>
                      <CardContent className="space-y-3 pt-4">
                        {agentResult.hypotheses.map(hyp => (
                          <div
                            key={hyp.id}
                            className="p-3.5 rounded-xl bg-[#0B0D0F] border border-[#1F242C] space-y-2"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-mono font-bold text-slate-200 text-xs">{hyp.id}</span>
                              <Badge variant="cyan" size="sm">
                                P = {Math.round(hyp.p * 100)}% (Log Odds: {hyp.log_odds.toFixed(2)})
                              </Badge>
                            </div>
                            <p className="text-xs text-slate-300 font-sans leading-relaxed">{hyp.text}</p>
                            {hyp.evidence && (
                              <div className="flex flex-wrap gap-1.5 pt-1">
                                {hyp.evidence.map((ev, eIdx) => (
                                  <span
                                    key={eIdx}
                                    className="px-2 py-0.5 rounded-md bg-[#161B22] text-[10px] font-mono text-slate-300 border border-[#2A3038]"
                                  >
                                    {ev.evidence}: {ev.relation} (wt: {ev.weight})
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  )}
                </div>

                {/* RIGHT COLUMN: Evidence Intelligence & Telemetry (5 cols) */}
                <div className="lg:col-span-5 space-y-6">
                  {/* Evidence-Grounded Reasoning (Facts vs Assumptions) */}
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between border-b border-[#1F242C] pb-3">
                      <div className="flex items-center gap-2">
                        <Scale className="w-4 h-4 text-emerald-400" />
                        <CardTitle className="text-sm font-bold font-mono">
                          Evidence Grounding
                        </CardTitle>
                      </div>
                      <div className="flex items-center gap-1 bg-[#0B0D0F] p-1 rounded-lg border border-[#1F242C]">
                        <button
                          type="button"
                          onClick={() => setEvidenceTab('facts')}
                          className={cn(
                            'px-2 py-1 rounded text-[10px] font-mono font-medium transition-colors',
                            evidenceTab === 'facts' ? 'bg-[#1F242C] text-emerald-400' : 'text-slate-400 hover:text-slate-200'
                          )}
                        >
                          Facts
                        </button>
                        <button
                          type="button"
                          onClick={() => setEvidenceTab('assumptions')}
                          className={cn(
                            'px-2 py-1 rounded text-[10px] font-mono font-medium transition-colors',
                            evidenceTab === 'assumptions' ? 'bg-[#1F242C] text-amber-400' : 'text-slate-400 hover:text-slate-200'
                          )}
                        >
                          Assumptions
                        </button>
                        <button
                          type="button"
                          onClick={() => setEvidenceTab('risk')}
                          className={cn(
                            'px-2 py-1 rounded text-[10px] font-mono font-medium transition-colors',
                            evidenceTab === 'risk' ? 'bg-[#1F242C] text-cyan-400' : 'text-slate-400 hover:text-slate-200'
                          )}
                        >
                          Rationale
                        </button>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-4">
                      {evidenceTab === 'facts' && (
                        <div className="space-y-2.5">
                          <div className="text-[11px] font-mono uppercase tracking-wider text-emerald-400 flex items-center gap-1.5 font-bold">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                            Observed Facts (From FalkorDB)
                          </div>
                          <ul className="space-y-2 text-xs text-slate-300 font-sans">
                            {(agentResult.finding?.observed_facts || agentResult.proposal?.observed_facts || [
                              `Graph topology identifies ${agentResult.paths?.length || 0} reachable attack path(s) to target '${agentResult.target}'.`
                            ]).map((fact, fIdx) => (
                              <li key={fIdx} className="flex items-start gap-2 p-2 rounded-lg bg-[#0B0D0F] border border-[#1F242C]">
                                <span className="text-emerald-400 font-bold shrink-0">•</span>
                                <span className="leading-relaxed">{fact}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {evidenceTab === 'assumptions' && (
                        <div className="space-y-2.5">
                          <div className="text-[11px] font-mono uppercase tracking-wider text-amber-400 flex items-center gap-1.5 font-bold">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                            Explicit Assumptions (Non-Observed)
                          </div>
                          <ul className="space-y-2 text-xs text-slate-300 font-sans">
                            {(agentResult.finding?.assumptions || agentResult.proposal?.assumptions || [
                              "Adversary retains operational control of identified foothold sources.",
                              "Graph relationships represent traversable attack primitives.",
                              "Severing cut edges disrupts traversal without unmodeled out-of-band channels.",
                            ]).map((assump, aIdx) => (
                              <li key={aIdx} className="flex items-start gap-2 p-2 rounded-lg bg-[#0B0D0F] border border-[#1F242C]">
                                <span className="text-amber-400 font-bold shrink-0">•</span>
                                <span className="leading-relaxed">{assump}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {evidenceTab === 'risk' && (
                        <div className="space-y-2.5">
                          <div className="text-[11px] font-mono uppercase tracking-wider text-cyan-400 flex items-center gap-1.5 font-bold">
                            <ShieldAlert className="w-3.5 h-3.5 text-cyan-400" />
                            Grounded Risk Rationale
                          </div>
                          <div className="p-3 rounded-lg bg-[#0B0D0F] border border-[#1F242C] text-xs text-slate-300 font-sans leading-relaxed">
                            {agentResult.finding?.risk_explanation || agentResult.proposal?.rationale ||
                              `Reachable attack paths create an active lateral movement vector from footholds (${agentResult.sources.join(', ')}) to '${agentResult.target}'. Disconnecting cut edges severs all paths with minimal benign disruption.`}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Agent Reasoning & Execution Trail */}
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between border-b border-[#1F242C] pb-3">
                      <div className="flex items-center gap-2">
                        <Terminal className="w-4 h-4 text-emerald-400" />
                        <CardTitle className="text-sm font-bold font-mono">
                          Agent Tool Trail
                        </CardTitle>
                      </div>
                      <Badge variant="cyan" size="sm">{agentResult.steps?.length || 0} Invocations</Badge>
                    </CardHeader>
                    <CardContent className="space-y-2 pt-4">
                      {agentResult.steps?.map((step, idx) => {
                        const isExpanded = expandedStep === idx
                        return (
                          <div
                            key={idx}
                            className="rounded-xl bg-[#0B0D0F] border border-[#1F242C] overflow-hidden text-xs font-mono"
                          >
                            <button
                              type="button"
                              onClick={() => setExpandedStep(isExpanded ? null : idx)}
                              className="w-full p-2.5 flex items-center justify-between text-left hover:bg-[#121519] transition-colors"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="text-slate-500 font-bold shrink-0">#{step.n}</span>
                                <span className="text-emerald-400 font-bold truncate">{step.tool}</span>
                                <span className="text-slate-500 text-[10px] hidden sm:inline">({step.ms}ms)</span>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <Badge variant={step.ok ? 'emerald' : 'red'} size="sm">
                                  {step.ok ? 'OK' : 'ERR'}
                                </Badge>
                                {isExpanded ? (
                                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                                ) : (
                                  <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                                )}
                              </div>
                            </button>

                            {isExpanded && (
                              <div className="p-3 border-t border-[#1F242C] bg-[#121519]/70 space-y-2">
                                <div className="text-slate-400 font-sans text-xs">
                                  {step.reason}
                                </div>
                                {step.result && (
                                  <pre className="p-2 rounded bg-black/60 border border-[#2A3038] text-[10px] text-slate-300 max-h-36 overflow-y-auto font-mono">
                                    {JSON.stringify(step.result, null, 2)}
                                  </pre>
                                )}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* Security Audit Modal Dialog */}
              {showAuditModal && agentResult.audit_record && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
                  <div
                    className="w-full max-w-2xl p-5 rounded-2xl bg-[#121519] border border-[#2A3038] shadow-2xl space-y-4"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center justify-between border-b border-[#1F242C] pb-3">
                      <div className="flex items-center gap-2">
                        <History className="w-4 h-4 text-cyan-400" />
                        <h3 className="text-sm font-mono font-bold text-slate-100">
                          Structured Security Audit Record (audit.db)
                        </h3>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowAuditModal(false)}
                        className="p-1 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-[#1F242C] transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <pre className="p-3.5 rounded-xl bg-black/80 border border-[#1F242C] text-[11px] text-slate-300 max-h-96 overflow-y-auto font-mono">
                      {JSON.stringify(agentResult.audit_record, null, 2)}
                    </pre>

                    <div className="flex items-center justify-between pt-2 border-t border-[#1F242C] text-xs font-mono text-slate-400">
                      <span>Event Type: <code>{agentResult.audit_record.event || 'workflow_audit'}</code></span>
                      <Button variant="outline" size="sm" onClick={() => setShowAuditModal(false)}>
                        Close Inspector
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Temporal Path Tracing */}
      {activeTab === 'trace' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div>
                <CardTitle>
                  <Clock className="w-4 h-4 text-cyan-400" />
                  Time-Ordered Progression Along Discovered Paths
                </CardTitle>
                <CardDescription>
                  Shows sequential hops with observed timestamps and evidence IDs
                </CardDescription>
              </div>
              <Badge variant="cyan">{traceData?.paths?.length || 0} Paths Active</Badge>
            </CardHeader>
            <CardContent>
              {traceData?.paths && traceData.paths.length > 0 ? (
                <PathTimelineChart paths={traceData.paths} />
              ) : (
                <div className="p-8 text-center text-xs text-slate-500 font-mono">
                  No time-travel paths found within the specified timestamp boundary (as_of: {asOf ?? 'latest'}).
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB 3: Incident Reconstruction */}
      {activeTab === 'reconstruct' && (
        <div className="space-y-6">
          {reconstructMutation.isPending ? (
            <div className="p-12 text-center text-xs text-slate-400 font-mono">
              Reconstructing incident chronology and matching evidence records...
            </div>
          ) : reconstructResult ? (
            <div className="space-y-6 font-mono text-xs">
              {/* Verification Badges */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card className="p-4 flex items-center justify-between">
                  <div>
                    <div className="text-slate-400 text-[11px]">Chronology Order</div>
                    <div className="font-bold text-sm text-slate-100 mt-1">
                      {reconstructResult.chronology_verified ? 'VERIFIED' : 'GAPS DETECTED'}
                    </div>
                  </div>
                  <Badge variant={reconstructResult.chronology_verified ? 'emerald' : 'amber'}>
                    {reconstructResult.chronology_verified ? 'Strictly Monotonic' : 'Missing TS'}
                  </Badge>
                </Card>

                <Card className="p-4 flex items-center justify-between">
                  <div>
                    <div className="text-slate-400 text-[11px]">Evidence Completeness</div>
                    <div className="font-bold text-sm text-slate-100 mt-1">
                      {reconstructResult.evidence_complete ? 'COMPLETE' : 'PARTIAL'}
                    </div>
                  </div>
                  <Badge variant={reconstructResult.evidence_complete ? 'emerald' : 'cyan'}>
                    {reconstructResult.evidence_complete ? '100% Linked' : 'Partial'}
                  </Badge>
                </Card>

                <Card className="p-4 flex items-center justify-between">
                  <div>
                    <div className="text-slate-400 text-[11px]">Reconstructed Paths</div>
                    <div className="font-bold text-sm text-slate-100 mt-1">
                      {reconstructResult.path_count} Paths
                    </div>
                  </div>
                  <Badge variant="cyan">Active</Badge>
                </Card>
              </div>

              {/* Reconstructed Path Detail Cards */}
              <div className="space-y-4">
                {reconstructResult.paths.map(path => (
                  <Card key={path.id}>
                    <CardHeader>
                      <div className="flex items-center gap-2">
                        <Badge variant="cyan">{path.id}</Badge>
                        <span className="font-bold text-slate-200">
                          {path.nodes[0]} → {path.nodes[path.nodes.length - 1]}
                        </span>
                      </div>
                      <Badge variant={path.timeline_status === 'timestamped' ? 'emerald' : 'amber'}>
                        {path.timeline_status.toUpperCase()}
                      </Badge>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {path.events.map((event, eIdx) => (
                        <div
                          key={eIdx}
                          className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 flex items-center justify-between gap-4"
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-slate-500 font-bold">#{eIdx + 1}</span>
                            <div>
                              <div className="text-slate-200 font-semibold">
                                {event.source} -[{event.relationship}]-&gt; {event.target}
                              </div>
                              {event.evidence?.text && (
                                <div className="text-[11px] text-slate-400 font-sans mt-0.5 italic">
                                  &ldquo;{event.evidence.text}&rdquo;
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            {event.evidence_id && (
                              <Badge variant="cyan" size="sm">{event.evidence_id}</Badge>
                            )}
                            <div className="text-[10px] text-slate-500 mt-1">
                              {event.observed_at ? `T+${event.observed_at}s` : 'No timestamp'}
                            </div>
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ) : (
            <div className="p-8 text-center text-xs text-slate-500 font-mono">
              Click &quot;Update Queries&quot; to compute incident reconstruction.
            </div>
          )}
        </div>
      )}

      {/* TAB 4: Evidence Provenance */}
      {activeTab === 'provenance' && (
        <div className="space-y-6">
          {provenanceMutation.isPending ? (
            <div className="p-12 text-center text-xs text-slate-400 font-mono">
              Generating evidence provenance audit report...
            </div>
          ) : provenanceResult ? (
            <div className="space-y-6 font-mono text-xs">
              {/* Coverage KPIs */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <Card className="p-4">
                  <div className="text-slate-400 text-[11px]">Total Events</div>
                  <div className="font-bold text-lg text-slate-100 mt-1">
                    {provenanceResult.event_count}
                  </div>
                </Card>

                <Card className="p-4">
                  <div className="text-slate-400 text-[11px]">Evidence Coverage</div>
                  <div className="font-bold text-lg text-emerald-400 mt-1">
                    {Math.round(provenanceResult.evidence_coverage * 100)}%
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    {provenanceResult.events_with_linked_evidence} / {provenanceResult.event_count} linked
                  </div>
                </Card>

                <Card className="p-4">
                  <div className="text-slate-400 text-[11px]">Timestamp Coverage</div>
                  <div className="font-bold text-lg text-cyan-400 mt-1">
                    {Math.round(provenanceResult.timestamp_coverage * 100)}%
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    {provenanceResult.events_with_timestamps} / {provenanceResult.event_count} timestamped
                  </div>
                </Card>

                <Card className="p-4">
                  <div className="text-slate-400 text-[11px]">Audit Attribution</div>
                  <div className="font-bold text-lg text-slate-100 mt-1">
                    Read-Only
                  </div>
                  <Badge variant="emerald" size="sm" className="mt-1">ADVISORY</Badge>
                </Card>
              </div>

              {/* Provenance Event Paths */}
              <div className="space-y-4">
                {provenanceResult.paths.map(path => (
                  <Card key={path.path_id}>
                    <CardHeader>
                      <CardTitle>
                        <FileCheck className="w-4 h-4 text-emerald-400" />
                        Audit Verification for {path.path_id}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {path.events.map((ev, idx) => (
                        <div
                          key={idx}
                          className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 flex items-center justify-between"
                        >
                          <div className="flex items-center gap-3">
                            <Badge
                              variant={ev.claim_status === 'supported_by_linked_evidence' ? 'emerald' : 'amber'}
                              size="sm"
                            >
                              {ev.claim_status === 'supported_by_linked_evidence' ? 'SUPPORTED' : 'UNVERIFIED'}
                            </Badge>
                            <span className="text-slate-200">
                              {ev.source} → {ev.target} ({ev.relationship})
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            {ev.evidence_id && <Badge variant="cyan" size="sm">{ev.evidence_id}</Badge>}
                            <span className="text-[10px] text-slate-500">
                              {ev.timestamp ? `T+${ev.timestamp}s` : 'No TS'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ) : (
            <div className="p-8 text-center text-xs text-slate-500 font-mono">
              Click &quot;Update Queries&quot; to generate evidence provenance report.
            </div>
          )}
        </div>
      )}
    </div>
  )
}
