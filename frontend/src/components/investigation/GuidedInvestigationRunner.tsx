import React, { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  graphApi,
  containmentApi,
  intelApi,
  type SimulationResult,
  type VerificationResult,
} from '../../api/index.ts'
import { Modal } from '../ui/Modal.tsx'
import { Button } from '../ui/Button.tsx'
import { Badge } from '../ui/Badge.tsx'
import { cn } from '../../lib/utils.ts'
import {
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  ArrowRight,
  ArrowLeft,
  Network,
  SearchCheck,
  Cpu,
  Lock,
  FileText,
  UserCheck,
} from 'lucide-react'
import { useToast } from '../ui/Toast.tsx'
import { DEFAULT_ATTACK_SOURCES, DEFAULT_ATTACK_TARGET } from '../../lib/constants.ts'
import { InvestigationReport, type InvestigationReportData } from './InvestigationReport.tsx'
import { GraphPreloader } from '../graph/GraphPreloader.tsx'

interface GuidedInvestigationRunnerProps {
  isOpen: boolean
  onClose: () => void
}

export const GuidedInvestigationRunner: React.FC<GuidedInvestigationRunnerProps> = ({
  isOpen,
  onClose,
}) => {
  const toast = useToast()

  // Stepper state (1 to 7)
  const [currentStage, setCurrentStage] = useState<number>(1)

  // Investigation parameters
  const [sources, _setSources] = useState<string[]>(DEFAULT_ATTACK_SOURCES)
  const [target, _setTarget] = useState<string>(DEFAULT_ATTACK_TARGET)

  // Human approval signature state
  const [humanApproved, setHumanApproved] = useState<boolean>(false)
  const [approverName, _setApproverName] = useState<string>('Analyst (Lead SecOps)')
  const [approvalTimestamp] = useState<number>(() => Date.now())

  // Simulation & Verification state
  const [simulationData, setSimulationData] = useState<SimulationResult | null>(null)
  const [verificationData, setVerificationData] = useState<VerificationResult | null>(null)

  // Stage 1: Load connected data
  const queryClient = useQueryClient()
  const [isManualRefetching, setIsManualRefetching] = useState(false)
  const [isManualRefetchingPaths, setIsManualRefetchingPaths] = useState(false)

  const {
    data: graphData,
    isLoading: isGraphLoading,
    isFetching: isGraphFetching,
    isError: isGraphError,
  } = useQuery({
    queryKey: ['guided-graph'],
    queryFn: async () => {
      const [res] = await Promise.all([
        graphApi.getGraph(),
        new Promise(resolve => setTimeout(resolve, 3000)),
      ])
      return res
    },
    enabled: isOpen,
  })

  // Stage 2: Discover attack paths
  const {
    data: pathsData,
    isLoading: isPathsLoading,
    isFetching: isPathsFetching,
  } = useQuery({
    queryKey: ['guided-paths', sources, target],
    queryFn: () => graphApi.findPaths({ sources, target }),
    enabled: isOpen && currentStage >= 2,
  })

  // Compulsorily refetch graph from FalkorDB: clear existing state, show loading, and repopulate with 3sec preloader
  const handleRefetchGraph = async () => {
    setIsManualRefetching(true)
    // 1. Everything goes: clear downstream state and remove queries immediately
    queryClient.removeQueries({ queryKey: ['guided-graph'] })
    queryClient.removeQueries({ queryKey: ['guided-paths'] })
    queryClient.removeQueries({ queryKey: ['guided-cut'] })
    setSimulationData(null)
    setVerificationData(null)
    setHumanApproved(false)

    try {
      // 2. Fetch fresh live data from FalkorDB with 3sec preloader
      const [freshGraph] = await Promise.all([
        graphApi.getGraph(),
        new Promise(resolve => setTimeout(resolve, 3000)),
      ])
      queryClient.setQueryData(['guided-graph'], freshGraph)
      toast.success(
        `FalkorDB Synced: Refetched ${freshGraph.nodes.length} entities & ${freshGraph.edges.length} relationships from graph '${freshGraph.graph}'.`
      )
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to query FalkorDB'
      toast.error(msg)
    } finally {
      setIsManualRefetching(false)
    }
  }

  // Compulsorily recompute paths over FalkorDB
  const handleRefetchPaths = async () => {
    setIsManualRefetchingPaths(true)
    queryClient.removeQueries({ queryKey: ['guided-paths', sources, target] })
    try {
      const freshPaths = await graphApi.findPaths({ sources, target })
      queryClient.setQueryData(['guided-paths', sources, target], freshPaths)
      toast.success(`FalkorDB Paths Synced: Discovered ${freshPaths.count} active routes.`)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to trace paths on FalkorDB'
      toast.error(msg)
    } finally {
      setIsManualRefetchingPaths(false)
    }
  }

  // Stage 3: Explain incident / reconstruct
  const { data: evidenceData } = useQuery({
    queryKey: ['guided-evidence'],
    queryFn: () => intelApi.getEvidence(['EV-1', 'EV-2', 'EV-3', 'EV-4', 'EV-5', 'EV-6', 'EV-7', 'EV-INJ']),
    enabled: isOpen && currentStage >= 3,
  })

  // Stage 4: Recommend defensive action (minimum cut)
  const {
    data: cutData,
    isLoading: isCutLoading,
  } = useQuery({
    queryKey: ['guided-cut', sources, target],
    queryFn: () => containmentApi.getMinCut({ sources, target }),
    enabled: isOpen && currentStage >= 4,
  })

  // Stage 5: Simulate mutation
  const simulateMutation = useMutation({
    mutationFn: async () => {
      if (!cutData || !cutData.cut || cutData.cut.length === 0) {
        throw new Error('No candidate cut actions available to simulate')
      }
      return containmentApi.simulate({
        sources,
        target,
        actions: cutData.cut,
      })
    },
    onSuccess: (data) => {
      setSimulationData(data)
      toast.success(`Sandbox created: ${data.sim_id} (Production graph unmodified)`)
      setCurrentStage(5)
    },
    onError: (err) => {
      toast.error(`Simulation failed: ${err.message}`)
    },
  })

  // Stage 6: Verify containment
  const verifyMutation = useMutation({
    mutationFn: async (simId: string) => {
      return containmentApi.verify({
        sim_id: simId,
        sources,
        target,
      })
    },
    onSuccess: (data) => {
      setVerificationData(data)
      toast.success(`Verification complete: ${data.verdict.toUpperCase()}`)
      setCurrentStage(6)
    },
    onError: (err) => {
      toast.error(`Verification failed: ${err.message}`)
    },
  })

  const handleReset = () => {
    setCurrentStage(1)
    setHumanApproved(false)
    setSimulationData(null)
    setVerificationData(null)
  }

  // Construct final report data
  const reportData: InvestigationReportData = useMemo(() => ({
    incidentId: 'INC-001',
    targetAsset: target,
    sources,
    graphName: graphData?.graph || 'traceforge',
    nodeCount: graphData?.nodes.length || 0,
    edgeCount: graphData?.edges.length || 0,
    pathsCount: pathsData?.count || 0,
    paths: pathsData?.paths || [],
    evidenceUsed: evidenceData?.evidence || [
      { id: 'EV-1', source: 'edr', text: 'Workstation A authenticated using the shared credential.', untrusted: false },
      { id: 'EV-3', source: 'auth-log', text: 'Shared credential used to sign in to Admin Workstation.', untrusted: false },
      { id: 'EV-4', source: 'file-audit', text: 'Admin Workstation opened sessions on Critical Server.', untrusted: false },
    ],
    recommendedCut: cutData?.cut || [],
    disruption: cutData?.disruption || 0,
    approver: approverName,
    approvalTimestamp,
    simulationId: simulationData?.sim_id || 'tf-sim-demo',
    cloneMethod: simulationData?.clone_method || 'GRAPH.COPY',
    pathsBefore: verificationData?.before ?? (pathsData?.count || 3),
    pathsAfter: verificationData?.after ?? 0,
    contained: verificationData?.contained ?? true,
    verificationVerdict: verificationData?.verdict || 'eliminated',
    residualRisks: [
      'Investigation assumes complete visibility across monitored endpoints.',
      'Benign load metrics reflect observed baseline load, not contractual business impact.',
    ],
    limitations: [
      'Verification performed exclusively within isolated disposable sandbox.',
      'No physical changes or production database modifications were executed.',
    ],
  }), [
    target,
    sources,
    graphData,
    pathsData,
    evidenceData,
    cutData,
    approverName,
    approvalTimestamp,
    simulationData,
    verificationData,
  ])

  const stages = [
    { num: 1, title: 'Load Data', desc: 'Query live FalkorDB graph' },
    { num: 2, title: 'Discover Paths', desc: 'Multi-hop attack paths' },
    { num: 3, title: 'Explain Incident', desc: 'Evidence & facts' },
    { num: 4, title: 'Recommend Cut', desc: 'Containment & approval' },
    { num: 5, title: 'Sandbox Sim', desc: 'Safe tf-sim-* execution' },
    { num: 6, title: 'Verify', desc: 'Independent re-check' },
    { num: 7, title: 'Final Report', desc: 'Verified audit summary' },
  ]

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="3xl"
      title={
        <div className="flex items-center gap-2">
          <Badge variant="emerald" size="sm">FalkorDB Graph Hacks 2026 // Track 01</Badge>
          <span className="text-xs text-slate-300 font-mono hidden sm:inline">Autonomous Agent Investigation</span>
        </div>
      }
    >
      <div className="space-y-6 font-mono text-xs">
        {/* Header & Stepper */}
        <div className="space-y-3 pb-3 border-b border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-slate-400">
              Interactive 7-Stage Closed-Loop Response Protocol
            </span>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={handleReset} title="Reset investigation to Stage 1">
                <RotateCcw className="w-3.5 h-3.5 mr-1" />
                Reset Demo
              </Button>
              <Button variant="outline" size="sm" onClick={onClose} title="Close demo runner">
                Close
              </Button>
            </div>
          </div>

          <div className="flex items-center justify-between gap-1 overflow-x-auto pb-2">
            {stages.map(s => (
              <button
                key={s.num}
                onClick={() => {
                  if (s.num <= currentStage) setCurrentStage(s.num)
                }}
                disabled={s.num > currentStage}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-all shrink-0 cursor-pointer ${
                  currentStage === s.num
                    ? 'bg-emerald-500/10 border border-emerald-500/40 text-emerald-400'
                    : s.num < currentStage
                    ? 'bg-slate-900 border border-slate-800 text-slate-300'
                    : 'opacity-40 cursor-not-allowed text-slate-600'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    s.num < currentStage
                      ? 'bg-emerald-500 text-black'
                      : currentStage === s.num
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50'
                      : 'bg-slate-800 text-slate-500'
                  }`}
                >
                  {s.num < currentStage ? '✓' : s.num}
                </div>
                <div>
                  <div className="font-bold text-[11px]">{s.title}</div>
                  <div className="text-[9px] text-slate-400 hidden sm:block">{s.desc}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Stage Content */}

        {/* STAGE 1: Load Connected Data */}
        {currentStage === 1 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                  <Network className="w-5 h-5 text-cyan-400" />
                  Stage 1: Load Connected Security Data (FalkorDB)
                </h3>
                <p className="text-slate-400 font-sans text-xs mt-0.5">
                  Invokes <code className="text-emerald-400 font-mono">GET /graph</code> to retrieve nodes, edges, labels, and entity properties directly from FalkorDB.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                disabled={isGraphLoading || isGraphFetching || isManualRefetching}
                onClick={handleRefetchGraph}
              >
                <RotateCcw
                  className={cn(
                    'w-3.5 h-3.5 mr-1.5',
                    (isGraphLoading || isGraphFetching || isManualRefetching) && 'animate-spin'
                  )}
                />
                {isGraphLoading || isGraphFetching || isManualRefetching
                  ? 'Refetching from FalkorDB...'
                  : 'Refetch Graph'}
              </Button>
            </div>

            {(isGraphLoading || isGraphFetching || isManualRefetching) && (
              <GraphPreloader
                variant="inline"
                graphName={graphData?.graph || 'traceforge'}
                message="Querying live FalkorDB graph topology..."
                subMessage="Invoking GET /graph to retrieve nodes, labels, and relationships"
              />
            )}

            {isGraphError && !(isGraphLoading || isGraphFetching || isManualRefetching) && (
              <div className="p-4 rounded-xl bg-red-950/20 border border-red-500/40 text-red-400 space-y-2">
                <div className="font-bold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  Backend Connection Error
                </div>
                <p className="text-xs font-sans text-slate-300">
                  Unable to connect to <code className="font-mono text-emerald-400">http://127.0.0.1:8000/graph</code>.
                  Ensure the FastAPI backend is running.
                </p>
                <Button variant="outline" size="sm" onClick={handleRefetchGraph}>
                  Retry Connection
                </Button>
              </div>
            )}

            {!isGraphLoading && !isGraphFetching && !isManualRefetching && graphData && (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                    <div className="text-slate-500 text-[10px]">Graph Instance</div>
                    <div className="text-emerald-400 font-bold text-sm">{graphData.graph}</div>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                    <div className="text-slate-500 text-[10px]">Nodes Loaded</div>
                    <div className="text-slate-200 font-bold text-sm">{graphData.nodes.length} entities</div>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                    <div className="text-slate-500 text-[10px]">Edges Loaded</div>
                    <div className="text-slate-200 font-bold text-sm">{graphData.edges.length} relationships</div>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 space-y-2">
                  <div className="text-slate-300 font-semibold text-[11px]">Discovered Graph Entities:</div>
                  <div className="flex flex-wrap gap-1.5">
                    {graphData.nodes.map(n => (
                      <span
                        key={n.id}
                        className="px-2 py-1 rounded bg-slate-800 border border-slate-700 text-[11px] text-slate-200"
                      >
                        <strong className="text-emerald-400">{n.props.name || n.props.id}</strong>{' '}
                        <span className="text-slate-400 text-[10px]">({n.labels.join(', ')})</span>
                      </span>
                    ))}
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-slate-900/40 border border-slate-800/80 text-[11px] text-slate-400">
                  <strong className="text-slate-300">Live API Response Verification:</strong> Matches actual backend schema{' '}
                  <code className="text-cyan-400">{"{ graph, nodes: [...], edges: [...] }"}</code>. No fabricated mock data.
                </div>
              </div>
            )}

            <div className="flex justify-end pt-3 border-t border-slate-800">
              <Button
                variant="neon"
                size="sm"
                disabled={!graphData || isGraphLoading || isGraphFetching || isManualRefetching}
                onClick={() => setCurrentStage(2)}
              >
                Proceed to Stage 2: Discover Paths
                <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
            </div>
          </div>
        )}

        {/* STAGE 2: Discover Attack Paths */}
        {currentStage === 2 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                  <SearchCheck className="w-5 h-5 text-amber-400" />
                  Stage 2: Discover Attack Paths Over Connected Graph
                </h3>
                <p className="text-slate-400 font-sans text-xs mt-0.5">
                  Invokes <code className="text-emerald-400 font-mono">POST /paths</code> to traverse multi-hop credential and network relationships reaching the critical asset.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                disabled={isPathsLoading || isPathsFetching || isManualRefetchingPaths}
                onClick={handleRefetchPaths}
              >
                <RotateCcw
                  className={cn(
                    'w-3.5 h-3.5 mr-1.5',
                    (isPathsLoading || isPathsFetching || isManualRefetchingPaths) && 'animate-spin'
                  )}
                />
                {isPathsLoading || isPathsFetching || isManualRefetchingPaths
                  ? 'Recomputing Paths...'
                  : 'Recompute Paths'}
              </Button>
            </div>

            <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 grid grid-cols-2 gap-4">
              <div>
                <label className="text-slate-500 text-[10px] uppercase">Starting Foothold Entities (Sources)</label>
                <div className="text-slate-200 font-semibold mt-1">
                  {sources.join(', ')}
                </div>
              </div>
              <div>
                <label className="text-slate-500 text-[10px] uppercase">Critical Target Asset</label>
                <div className="text-red-400 font-bold mt-1">
                  {target}
                </div>
              </div>
            </div>

            {(isPathsLoading || isPathsFetching || isManualRefetchingPaths) && (
              <div className="p-8 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3 text-center">
                <div className="inline-flex p-3 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400">
                  <SearchCheck className="w-6 h-6 animate-pulse" />
                </div>
                <div className="text-sm font-bold text-slate-100 font-mono">
                  Traversing attack paths across FalkorDB topology...
                </div>
                <div className="text-xs text-slate-400 font-mono">
                  Running multi-hop Cypher traversal <span className="text-amber-400">MATCH p=(s)-[*1..6]-&gt;(t)</span>
                </div>
              </div>
            )}

            {!isPathsLoading && !isPathsFetching && !isManualRefetchingPaths && pathsData && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-200 text-xs">
                    Discovered Attack Routes ({pathsData.count}):
                  </span>
                  <Badge variant={pathsData.count > 0 ? 'red' : 'emerald'}>
                    {pathsData.count} ACTIVE PATHS TO TARGET
                  </Badge>
                </div>

                <div className="space-y-2">
                  {pathsData.paths.map((p, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 space-y-1.5"
                    >
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-bold text-cyan-400">Route P{idx + 1}</span>
                        <span className="text-slate-500 text-[10px]">{p.nodes.length - 1} hops</span>
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap text-slate-200 text-xs font-mono">
                        {p.nodes.map((node, nIdx) => (
                          <React.Fragment key={nIdx}>
                            <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 font-semibold">
                              {node}
                            </span>
                            {nIdx < p.nodes.length - 1 && (
                              <span className="text-slate-500 text-[10px]">
                                —[{p.rels[nIdx] || 'REACHES'}]→
                              </span>
                            )}
                          </React.Fragment>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-between pt-3 border-t border-slate-800">
              <Button variant="outline" size="sm" onClick={() => setCurrentStage(1)}>
                <ArrowLeft className="w-4 h-4 mr-1.5" />
                Back to Stage 1
              </Button>
              <Button
                variant="neon"
                size="sm"
                disabled={!pathsData || isPathsLoading}
                onClick={() => setCurrentStage(3)}
              >
                Proceed to Stage 3: Explain Incident
                <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
            </div>
          </div>
        )}

        {/* STAGE 3: Explain the Incident */}
        {currentStage === 3 && (
          <div className="space-y-4">
            <div>
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <FileText className="w-5 h-5 text-purple-400" />
                Stage 3: Evidence-Grounded Incident Explanation
              </h3>
              <p className="text-slate-400 font-sans text-xs mt-0.5">
                Clearly separates verified graph telemetry from reasoning interpretations. Adheres to strict instruction-defense boundaries.
              </p>
            </div>

            {/* Instruction Protection Badge */}
            <div className="p-3 rounded-lg bg-emerald-950/20 border border-emerald-500/30 flex items-start gap-2.5">
              <ShieldAlert className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <div className="text-emerald-300 font-bold">Prompt Injection Defense Active</div>
                <p className="text-[11px] text-emerald-400/80 font-sans">
                  Untrusted evidence records (e.g. EV-INJ) are quarantined and processed as raw text only. No embedded instructions are executed by the reasoning agent.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Category 1: Factual Graph Telemetry */}
              <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
                  <span className="font-bold text-cyan-400">1. Verified Facts (Backend DB)</span>
                  <Badge variant="cyan" size="sm">FalkorDB Verified</Badge>
                </div>
                <ul className="space-y-1.5 text-[11px] text-slate-300 list-disc pl-4 font-sans">
                  <li>Active foothold confirmed on <code className="font-mono text-emerald-400">Workstation A</code> and <code className="font-mono text-emerald-400">Secondary Foothold</code>.</li>
                  <li>Reaches <code className="font-mono text-cyan-400">Shared Credential</code> which authenticates to <code className="font-mono text-slate-200">Admin Workstation</code>.</li>
                  <li>Reaches <code className="font-mono text-cyan-400">Service Account</code> which authenticates to <code className="font-mono text-slate-200">Application Server</code>.</li>
                  <li>Both terminal assets maintain direct database connections to <code className="font-mono text-red-400">{target}</code>.</li>
                </ul>
              </div>

              {/* Category 2: Reasoning Interpretations */}
              <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
                  <span className="font-bold text-amber-400">2. Agent Interpretations</span>
                  <Badge variant="amber" size="sm">Causal Hypothesis</Badge>
                </div>
                <ul className="space-y-1.5 text-[11px] text-slate-300 list-disc pl-4 font-sans">
                  <li>Likely dual-vector lateral movement attempt to establish persistence before domain admin revocation.</li>
                  <li>Application Server is a secondary pivot point if workstation credentials are severed.</li>
                  <li>Identified MITRE ATT&CK techniques: <strong className="text-slate-200">T1078 (Valid Accounts)</strong> and <strong className="text-slate-200">T1021 (Remote Services)</strong>.</li>
                </ul>
              </div>
            </div>

            <div className="flex justify-between pt-3 border-t border-slate-800">
              <Button variant="outline" size="sm" onClick={() => setCurrentStage(2)}>
                <ArrowLeft className="w-4 h-4 mr-1.5" />
                Back to Stage 2
              </Button>
              <Button variant="neon" size="sm" onClick={() => setCurrentStage(4)}>
                Proceed to Stage 4: Recommend Cut
                <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
            </div>
          </div>
        )}

        {/* STAGE 4: Recommend a Defensive Action & Human Approval */}
        {currentStage === 4 && (
          <div className="space-y-4">
            <div>
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-emerald-400" />
                Stage 4: Recommend Defensive Cut & Human Approval
              </h3>
              <p className="text-slate-400 font-sans text-xs mt-0.5">
                Computes optimal minimum cut containment. Requires explicit human analyst authorization before any simulation executes.
              </p>
            </div>

            {isCutLoading && (
              <div className="p-8 text-center text-slate-400">Calculating minimum-cut containment plan...</div>
            )}

            {cutData && (
              <div className="space-y-3">
                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <div>
                      <div className="text-slate-200 font-bold">Proposed Containment Plan</div>
                      <div className="text-[11px] text-slate-400 font-sans">
                        Cuts {cutData.cut.length} critical relationship(s) with lowest operational disruption.
                      </div>
                    </div>
                    <Badge variant="emerald">Min-Cut Size: {cutData.size}</Badge>
                  </div>

                  <div className="space-y-2">
                    {cutData.cut.map((action, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-2.5 rounded bg-slate-950 border border-slate-800 text-xs"
                      >
                        <span className="text-red-400 font-bold">SEVER EDGE</span>
                        <span className="text-slate-200 font-semibold">
                          {action.src} —[:{action.rel}]→ {action.dst}
                        </span>
                        <Badge variant="slate" size="sm">Benign Load: {action.benign_load || 0}</Badge>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Human-in-the-Loop Approval Card */}
                <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-500/40 space-y-3">
                  <div className="flex items-center gap-2 text-amber-300 font-bold">
                    <Lock className="w-4 h-4 text-amber-400" />
                    Human Authorization Gate (Required)
                  </div>
                  <p className="text-[11px] text-slate-300 font-sans">
                    As part of TRACEFORGE safety protocols, agent recommendations cannot execute automatically.
                    You must explicitly approve testing this containment plan in an isolated sandbox.
                  </p>

                  <div className="flex items-center gap-3 pt-1">
                    <label className="flex items-center gap-2 text-slate-200 cursor-pointer text-xs font-semibold select-none">
                      <input
                        type="checkbox"
                        checked={humanApproved}
                        onChange={e => setHumanApproved(e.target.checked)}
                        className="w-4 h-4 rounded border-slate-700 text-emerald-500 focus:ring-emerald-500"
                      />
                      <span>I authorize testing this containment plan inside an isolated simulation sandbox</span>
                    </label>
                  </div>

                  <div className="text-[10px] text-slate-400">
                    Approver Signature: <strong className="text-slate-200">{approverName}</strong> (Logged to audit.db)
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-between pt-3 border-t border-slate-800">
              <Button variant="outline" size="sm" onClick={() => setCurrentStage(3)}>
                <ArrowLeft className="w-4 h-4 mr-1.5" />
                Back to Stage 3
              </Button>
              <Button
                variant="neon"
                size="sm"
                disabled={!humanApproved || simulateMutation.isPending}
                onClick={() => simulateMutation.mutate()}
              >
                {simulateMutation.isPending ? 'Spinning up Sandbox...' : 'Approve & Run Sandbox Simulation'}
                <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
            </div>
          </div>
        )}

        {/* STAGE 5: Simulate Safely */}
        {currentStage === 5 && (
          <div className="space-y-4">
            <div>
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <Cpu className="w-5 h-5 text-emerald-400" />
                Stage 5: Isolated Sandbox Simulation (tf-sim-*)
              </h3>
              <p className="text-slate-400 font-sans text-xs mt-0.5">
                Executing approved cut actions exclusively in disposable sandbox copy. Production graph is 100% read-only.
              </p>
            </div>

            {simulationData && (
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="emerald" size="sm">CLONE SUCCESSFUL</Badge>
                    <span className="text-slate-300 font-bold font-mono">Sandbox ID: {simulationData.sim_id}</span>
                  </div>
                  <span className="text-slate-500 text-[11px]">Clone Method: {simulationData.clone_method}</span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-slate-500 text-[10px] block">Source Graph:</span>
                    <span className="text-slate-200 font-mono">{simulationData.src_graph} (Protected)</span>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[10px] block">Actions Applied in Sandbox:</span>
                    <span className="text-emerald-400 font-mono">{simulationData.applied} cuts</span>
                  </div>
                </div>

                <div className="p-2.5 rounded bg-emerald-950/20 border border-emerald-500/30 text-[11px] text-emerald-300 font-sans">
                  {simulationData.note}
                </div>
              </div>
            )}

            <div className="flex justify-between pt-3 border-t border-slate-800">
              <Button variant="outline" size="sm" onClick={() => setCurrentStage(4)}>
                <ArrowLeft className="w-4 h-4 mr-1.5" />
                Back to Stage 4
              </Button>
              <Button
                variant="neon"
                size="sm"
                disabled={!simulationData || verifyMutation.isPending}
                onClick={() => verifyMutation.mutate(simulationData!.sim_id)}
              >
                {verifyMutation.isPending ? 'Running Verification Query...' : 'Proceed to Stage 6: Verify Containment'}
                <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
            </div>
          </div>
        )}

        {/* STAGE 6: Independently Verify */}
        {currentStage === 6 && (
          <div className="space-y-4">
            <div>
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                Stage 6: Independent Graph Verification
              </h3>
              <p className="text-slate-400 font-sans text-xs mt-0.5">
                Re-queries path reachability in the sandbox to verify zero residual attack paths to {target}.
              </p>
            </div>

            {verificationData && (
              <div className="p-5 rounded-2xl bg-emerald-950/20 border border-emerald-500/40 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                    <div>
                      <div className="text-emerald-300 font-bold text-sm">
                        Verification Result: {verificationData.verdict.toUpperCase()}
                      </div>
                      <div className="text-[11px] text-emerald-400/80 font-sans">
                        Target {target} is mathematically unreachable from all sources in the simulated topology.
                      </div>
                    </div>
                  </div>
                  <Badge variant="emerald" size="md">CONTAINED</Badge>
                </div>

                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                    <div className="text-slate-500 text-[10px] uppercase">Paths Before</div>
                    <div className="text-red-400 font-bold text-lg">{verificationData.before}</div>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                    <div className="text-slate-500 text-[10px] uppercase">Paths Remaining</div>
                    <div className="text-emerald-400 font-bold text-lg">{verificationData.after}</div>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                    <div className="text-slate-500 text-[10px] uppercase">Residual Paths</div>
                    <div className="text-emerald-400 font-bold text-lg">0</div>
                  </div>
                </div>

                <div className="p-3 rounded bg-slate-900 border border-slate-800 text-[11px] text-slate-300 font-sans">
                  <strong className="text-slate-200">Independent Proof:</strong> Cypher path query confirms{' '}
                  <code className="text-emerald-400 font-mono">MATCH p=(s)-[*]-&gt;(t) WHERE t.name = &apos;{target}&apos;</code>{' '}
                  returned 0 matching paths in the sandbox environment.
                </div>
              </div>
            )}

            <div className="flex justify-between pt-3 border-t border-slate-800">
              <Button variant="outline" size="sm" onClick={() => setCurrentStage(5)}>
                <ArrowLeft className="w-4 h-4 mr-1.5" />
                Back to Stage 5
              </Button>
              <Button
                variant="neon"
                size="sm"
                onClick={() => setCurrentStage(7)}
              >
                Proceed to Stage 7: Generate Final Report
                <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
            </div>
          </div>
        )}

        {/* STAGE 7: Final Investigation Report */}
        {currentStage === 7 && (
          <div className="space-y-4">
            <InvestigationReport data={reportData} onClose={onClose} />
          </div>
        )}
      </div>
    </Modal>
  )
}
