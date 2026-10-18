import React, { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import {
  investigationsApi,
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
} from 'lucide-react'

export const InvestigationsPage: React.FC = () => {
  const toast = useToast()
  const [sources, setSources] = useState<string[]>(DEFAULT_ATTACK_SOURCES)
  const [target, setTarget] = useState<string>(DEFAULT_ATTACK_TARGET)
  const [asOf, setAsOf] = useState<number | null>(null)
  const [activeTab, setActiveTab] = useState<'agent' | 'trace' | 'reconstruct' | 'provenance'>('agent')

  // Run autonomous investigation mutation
  const investigateMutation = useMutation({
    mutationFn: () => investigationsApi.runAutonomousInvestigation({ sources, target }),
    onSuccess: () => {
      toast.success('Investigation Complete', 'Autonomous agent produced evidence-grounded hypotheses.')
    },
    onError: (err: Error) => {
      toast.error('Investigation Failed', err.message)
    },
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

  const agentResult: FullCase | undefined = investigateMutation.data
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
            <div className="space-y-6 font-mono text-xs">
              {/* Agent Case Header */}
              <div className="p-4 rounded-xl bg-[#0b0f17] border border-slate-800 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <Badge variant="emerald" size="sm">Case #{agentResult.id}</Badge>
                  <span className="text-slate-300 font-bold">
                    Target: {agentResult.target}
                  </span>
                  <Badge variant="cyan" size="sm">Mode: {agentResult.mode}</Badge>
                </div>

                <Badge
                  variant={agentResult.status === 'needs_analyst' ? 'amber' : 'emerald'}
                >
                  STATUS: {agentResult.status.toUpperCase()}
                </Badge>
              </div>

              {/* Step-by-Step Agent Tool Executions */}
              <Card>
                <CardHeader>
                  <CardTitle>
                    <Terminal className="w-4 h-4 text-emerald-400" />
                    Agent Reasoning & Tool Execution Trail ({agentResult.steps?.length || 0} Steps)
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2.5">
                  {agentResult.steps?.map((step, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-lg bg-slate-900/60 border border-slate-800/80 flex items-start justify-between gap-4"
                    >
                      <div className="flex items-start gap-3">
                        <span className="text-slate-500 font-bold shrink-0 mt-0.5">
                          #{step.n}
                        </span>
                        <div>
                          <div className="font-semibold text-emerald-400">
                            {step.tool}
                          </div>
                          <div className="text-slate-400 font-sans text-xs mt-0.5">
                            {step.reason}
                          </div>
                          {step.result && (
                            <pre className="mt-1 text-[10px] text-slate-500 bg-black/40 p-1.5 rounded max-h-24 overflow-y-auto">
                              {JSON.stringify(step.result, null, 2)}
                            </pre>
                          )}
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <Badge variant={step.ok ? 'emerald' : 'red'} size="sm">
                          {step.ok ? 'OK' : 'ERR'}
                        </Badge>
                        <div className="text-[10px] text-slate-500 mt-1">
                          {step.ms}ms
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Hypotheses & Evidence Graph */}
              {agentResult.hypotheses && agentResult.hypotheses.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>
                      <Sparkles className="w-4 h-4 text-amber-400" />
                      Evaluated Hypotheses & Probability
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {agentResult.hypotheses.map(hyp => (
                      <div
                        key={hyp.id}
                        className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-200">{hyp.id}</span>
                          <Badge variant="cyan" size="sm">
                            P = {Math.round(hyp.p * 100)}% (Log Odds: {hyp.log_odds.toFixed(2)})
                          </Badge>
                        </div>
                        <p className="text-xs text-slate-300 font-sans">{hyp.text}</p>
                        {hyp.evidence && (
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {hyp.evidence.map((ev, eIdx) => (
                              <span
                                key={eIdx}
                                className="px-2 py-0.5 rounded bg-slate-800 text-[10px] text-slate-300 border border-slate-700"
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

              {/* Proposed Containment Plan */}
              {agentResult.proposal && (
                <Card glow="amber">
                  <CardHeader>
                    <CardTitle>
                      <ShieldAlert className="w-4 h-4 text-amber-400" />
                      Proposed Containment Strategy (Awaiting Approval)
                    </CardTitle>
                    <Badge variant="amber">Size: {agentResult.proposal.size} Actions</Badge>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="p-3 rounded-lg bg-amber-950/20 border border-amber-500/30 text-amber-200 text-xs">
                      Disruption Cost: <span className="font-bold">{agentResult.proposal.disruption}</span> • Eliminates {agentResult.proposal.paths_before} Attack Routes.
                    </div>
                    <div className="space-y-2">
                      {agentResult.proposal.cut.map((action, aIdx) => (
                        <div
                          key={aIdx}
                          className="p-3 rounded-lg bg-slate-900/80 border border-slate-800 flex items-center justify-between"
                        >
                          <div className="flex items-center gap-2">
                            <Badge variant="red" size="sm">{action.type}</Badge>
                            <span className="text-slate-200">
                              {action.src} → {action.dst} ({action.rel})
                            </span>
                          </div>
                          <span className="text-slate-400 text-[11px]">
                            Benign Load: {action.benign_load ?? 0}
                          </span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                  <CardFooter>
                    <span>Actions must be approved by an analyst before simulation deployment.</span>
                    <Button
                      variant="neon"
                      size="sm"
                      onClick={() => toast.info('Navigating to Case Review', 'Opening case approval screen')}
                    >
                      Review & Approve
                    </Button>
                  </CardFooter>
                </Card>
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
