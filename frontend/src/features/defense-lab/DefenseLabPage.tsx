import React, { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import {
  containmentApi,
  simulationsApi,
  type CutPlan,
  type SimulationResult,
  type VerificationResult,
  type ResidualRiskResult,
  type MutationLabResult,
} from '../../api/index.ts'
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '../../components/ui/Card.tsx'
import { Button } from '../../components/ui/Button.tsx'
import { Badge } from '../../components/ui/Badge.tsx'
import { Input, Select } from '../../components/ui/Input.tsx'
import { Tabs } from '../../components/ui/Tabs.tsx'
import { Modal } from '../../components/ui/Modal.tsx'
import { useToast } from '../../components/ui/Toast.tsx'
import { DEFAULT_ATTACK_SOURCES, DEFAULT_ATTACK_TARGET, DISCLAIMERS } from '../../lib/constants.ts'
import {
  ShieldAlert,
  ShieldCheck,
  Zap,
  Sliders,
  Dna,
  AlertTriangle,
  Play,
  Trash2,
} from 'lucide-react'

export const DefenseLabPage: React.FC = () => {
  const toast = useToast()
  const [sources, setSources] = useState<string[]>(DEFAULT_ATTACK_SOURCES)
  const [target, setTarget] = useState<string>(DEFAULT_ATTACK_TARGET)
  const [activeTab, setActiveTab] = useState<'mincut' | 'auto' | 'mutation' | 'counterfactual'>('mincut')

  // Mutation Lab parameters
  const [mutationSrc, setMutationSrc] = useState('Workstation A')
  const [mutationRel, setMutationRel] = useState('REACHES')
  const [mutationDst, setMutationDst] = useState('Printer')

  // Active Sandbox session state
  const [activeSandbox, setActiveSandbox] = useState<{
    simId: string
    plan: CutPlan | null
    simulation: SimulationResult | null
    verification: VerificationResult | null
    residual: ResidualRiskResult | null
  } | null>(null)

  const [confirmModalOpen, setConfirmModalOpen] = useState(false)

  // 1. Min Cut Query
  const { data: cutPlan, isLoading: isCutLoading, refetch: refetchCut } = useQuery({
    queryKey: ['min-cut', sources, target],
    queryFn: () => containmentApi.getMinCut({ sources, target }),
    enabled: sources.length > 0 && !!target,
  })

  // 2. Business-impact optimized containment query
  const { data: optimizedPlan } = useQuery({
    queryKey: ['optimized-containment', sources, target],
    queryFn: () => containmentApi.optimizeContainment({ sources, target }),
    enabled: sources.length > 0 && !!target,
  })

  // 3. Simulate mutation
  const simulateMutation = useMutation({
    mutationFn: () => {
      if (!cutPlan?.cut || cutPlan.cut.length === 0) {
        throw new Error('No cut actions calculated to simulate.')
      }
      return containmentApi.simulate({
        sources,
        target,
        actions: cutPlan.cut,
      })
    },
    onSuccess: simData => {
      setActiveSandbox({
        simId: simData.sim_id,
        plan: cutPlan || null,
        simulation: simData,
        verification: null,
        residual: null,
      })
      toast.success('Sandbox Cloned', `Containment actions simulated in isolated sandbox ${simData.sim_id}.`)
      // Automatically verify containment
      verifyMutation.mutate(simData.sim_id)
    },
    onError: (err: Error) => {
      toast.error('Simulation Refused', err.message)
    },
  })

  // 4. Verify mutation
  const verifyMutation = useMutation({
    mutationFn: (simId: string) => containmentApi.verify({ sim_id: simId, sources, target }),
    onSuccess: verData => {
      setActiveSandbox(prev => (prev ? { ...prev, verification: verData } : null))
      if (verData.contained) {
        toast.success('Containment Verified', 'Independent query confirmed 0 paths remain in sandbox.')
      } else {
        toast.warning('Residual Risk', `${verData.after} paths remain in sandbox.`)
      }
    },
    onError: (err: Error) => {
      toast.error('Verification Error', err.message)
    },
  })

  // 5. Automated convenience pipeline (min cut + simulate + verify)
  const autoPipelineMutation = useMutation({
    mutationFn: () => containmentApi.autoPipeline({ sources, target }),
    onSuccess: data => {
      if (data.simulation) {
        setActiveSandbox({
          simId: data.simulation.sim_id,
          plan: data.plan,
          simulation: data.simulation,
          verification: data.verification,
          residual: null,
        })
      }
      toast.success('Automated Defense Complete', data.note)
    },
    onError: (err: Error) => {
      toast.error('Automated Pipeline Failed', err.message)
    },
  })

  // 6. Mutation Lab execution
  const mutationLabMutation = useMutation({
    mutationFn: () =>
      simulationsApi.mutationLab({
        sources,
        target,
        mutation_src: mutationSrc,
        mutation_rel: mutationRel,
        mutation_dst: mutationDst,
      }),
    onSuccess: (res: MutationLabResult) => {
      toast.success(
        'Attack Pattern Mutated',
        `Added hypothetical [${res.mutation.rel}] edge in sandbox ${res.sim_id}. Found ${res.new_path_count} new paths.`
      )
    },
    onError: (err: Error) => {
      toast.error('Mutation Refused', err.message)
    },
  })

  // 7. Drop sandbox
  const dropSimMutation = useMutation({
    mutationFn: (simId: string) => containmentApi.deleteSim(simId),
    onSuccess: () => {
      setActiveSandbox(null)
      toast.success('Sandbox Dropped', 'Isolated sandbox graph successfully deleted.')
    },
    onError: (err: Error) => {
      toast.error('Drop Failed', err.message)
    },
  })

  const tabs = [
    { id: 'mincut', label: 'Minimum-Cut Containment', icon: <ShieldAlert className="w-3.5 h-3.5" /> },
    { id: 'auto', label: 'Closed-Loop Auto Pipeline', icon: <Zap className="w-3.5 h-3.5" /> },
    { id: 'mutation', label: 'Attack-Pattern Mutation Lab', icon: <Dna className="w-3.5 h-3.5" /> },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="emerald" size="sm">Defensive Simulation Lab</Badge>
            <Badge variant="slate" size="sm">Sandbox Prefix: tf-sim-*</Badge>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold font-mono text-slate-100 tracking-tight mt-1 flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-emerald-400" />
            Defensive Simulation & Containment Lab
          </h1>
          <p className="text-xs text-slate-400 font-sans mt-0.5">
            Evaluate minimum disruption cut strategies, simulate containment in isolated sandboxes, and verify elimination of attack routes.
          </p>
        </div>

        {activeSandbox && (
          <div className="flex items-center gap-2">
            <Badge variant="cyan" size="md">Sandbox: {activeSandbox.simId}</Badge>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => dropSimMutation.mutate(activeSandbox.simId)}
              isLoading={dropSimMutation.isPending}
            >
              <Trash2 className="w-3.5 h-3.5 mr-1" />
              Drop Sandbox
            </Button>
          </div>
        )}
      </div>

      {/* Strict Safety Disclaimer Banner */}
      <div className="p-3.5 rounded-xl bg-emerald-950/20 border border-emerald-500/30 flex items-start gap-3 font-mono text-xs text-emerald-400">
        <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <div className="font-bold uppercase tracking-wider text-[11px]">Strict Production Protection Enforced</div>
          <p className="text-slate-300 font-sans text-xs">
            {DISCLAIMERS.SANDBOX_ONLY} Containment proposals are evaluated exclusively within disposable clones.
          </p>
        </div>
      </div>

      {/* Target Parameters Bar */}
      <Card>
        <CardContent className="p-4 flex flex-col md:flex-row items-center gap-4">
          <div className="flex-1 w-full grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] uppercase font-mono text-slate-400 block mb-1">
                Active Attack Footholds
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
          </div>

          <div className="shrink-0 flex items-center gap-2 w-full md:w-auto mt-2 md:mt-0">
            <Button
              variant="outline"
              size="md"
              className="w-full md:w-auto"
              onClick={() => refetchCut()}
              isLoading={isCutLoading}
            >
              Recompute Plan
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs
        tabs={tabs}
        activeTab={activeTab}
        onChange={tabId => setActiveTab(tabId as typeof activeTab)}
      />

      {/* TAB 1: Minimum-Cut Containment Plan */}
      {activeTab === 'mincut' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Cut Plan Details */}
            <div className="lg:col-span-2 space-y-6">
              <Card glow="emerald">
                <CardHeader>
                  <div>
                    <CardTitle>
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                      Calculated Minimum-Cut Strategy
                    </CardTitle>
                    <CardDescription>
                      NetworkX min-cut algorithm weighted by benign load disruption
                    </CardDescription>
                  </div>
                  {cutPlan && (
                    <div className="flex items-center gap-2">
                      <Badge variant="cyan">Cut Size: {cutPlan.size}</Badge>
                      <Badge variant="emerald">Total Disruption: {cutPlan.disruption}</Badge>
                    </div>
                  )}
                </CardHeader>
                <CardContent className="space-y-4 font-mono text-xs">
                  {cutPlan?.cut && cutPlan.cut.length > 0 ? (
                    <div className="space-y-3">
                      {cutPlan.cut.map((action, idx) => (
                        <div
                          key={idx}
                          className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between"
                        >
                          <div className="flex items-center gap-3">
                            <Badge variant="red" size="sm">ACTION #{idx + 1}</Badge>
                            <div>
                              <div className="font-semibold text-slate-100">
                                Remove Edge: {action.src} → {action.dst}
                              </div>
                              <div className="text-[11px] text-slate-400 font-sans mt-0.5">
                                Relationship: <span className="font-mono text-cyan-400">{action.rel}</span>
                              </div>
                            </div>
                          </div>

                          <div className="text-right">
                            <span className="text-amber-400 font-bold">
                              {action.benign_load} benign load
                            </span>
                            <div className="text-[10px] text-slate-500">
                              Disruption cost
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-8 text-center text-slate-500">
                      No attack paths detected between sources and target. No containment cut required.
                    </div>
                  )}

                  {optimizedPlan && (
                    <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 space-y-2">
                      <div className="flex items-center justify-between text-[11px] text-slate-400">
                        <span>Business Impact Policy:</span>
                        <span className="text-slate-200">v{optimizedPlan.business_impact_policy_version}</span>
                      </div>
                      <div className="text-[11px] text-slate-400">
                        Status: <Badge variant="slate" size="sm">{optimizedPlan.business_impact_status}</Badge>
                      </div>
                      <p className="text-[10px] text-slate-500 font-sans">
                        {optimizedPlan.note}
                      </p>
                    </div>
                  )}
                </CardContent>
                <CardFooter>
                  <span>Precondition: Actions must disconnect all active attack routes.</span>
                  <Button
                    variant="neon"
                    size="sm"
                    disabled={!cutPlan?.cut || cutPlan.cut.length === 0}
                    onClick={() => setConfirmModalOpen(true)}
                  >
                    <Play className="w-3.5 h-3.5 mr-1" />
                    Simulate Cut in Sandbox
                  </Button>
                </CardFooter>
              </Card>
            </div>

            {/* Verification and Residual Risk Box */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>
                    <Sliders className="w-4 h-4 text-cyan-400" />
                    Sandbox Verification State
                  </CardTitle>
                </CardHeader>
                <CardContent className="font-mono text-xs space-y-4">
                  {!activeSandbox ? (
                    <div className="p-8 text-center text-slate-500">
                      No active simulation sandbox. Click &quot;Simulate Cut in Sandbox&quot; to clone production into an isolated graph.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">Sandbox ID:</span>
                          <span className="font-bold text-cyan-400">{activeSandbox.simId}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">Clone Method:</span>
                          <span className="text-slate-200">{activeSandbox.simulation?.clone_method || 'manual'}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">Actions Applied:</span>
                          <span className="text-emerald-400">{activeSandbox.simulation?.applied || 0}</span>
                        </div>
                      </div>

                      {activeSandbox.verification && (
                        <div className="p-4 rounded-xl bg-[#070a0f] border border-slate-800 space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-slate-400">Paths Before:</span>
                            <span className="text-red-400 font-bold">{activeSandbox.verification.before}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-400">Paths After:</span>
                            <span className="text-emerald-400 font-bold">{activeSandbox.verification.after}</span>
                          </div>
                          <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                            <span className="text-slate-300 font-bold">Containment Verdict:</span>
                            <Badge
                              variant={activeSandbox.verification.contained ? 'emerald' : 'red'}
                            >
                              {activeSandbox.verification.verdict.toUpperCase()}
                            </Badge>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Closed-Loop Auto Pipeline */}
      {activeTab === 'auto' && (
        <Card>
          <CardHeader>
            <div>
              <CardTitle>
                <Zap className="w-4 h-4 text-emerald-400" />
                Convenience Closed-Loop Pipeline (/containment/auto)
              </CardTitle>
              <CardDescription>
                Calculates min-cut, automatically clones isolated sandbox, executes containment, and independently confirms zero remaining paths.
              </CardDescription>
            </div>
            <Button
              variant="neon"
              size="md"
              onClick={() => autoPipelineMutation.mutate()}
              isLoading={autoPipelineMutation.isPending}
            >
              <Play className="w-4 h-4 mr-1.5" />
              Execute Pipeline
            </Button>
          </CardHeader>
          <CardContent className="font-mono text-xs space-y-4">
            {autoPipelineMutation.data ? (
              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-slate-300 font-bold">Execution Status</span>
                  <Badge variant={autoPipelineMutation.data.contained ? 'emerald' : 'amber'}>
                    {autoPipelineMutation.data.status.toUpperCase()}
                  </Badge>
                </div>
                <div className="text-slate-400 font-sans">
                  {autoPipelineMutation.data.note}
                </div>
                {autoPipelineMutation.data.simulation && (
                  <div className="p-3 rounded-lg bg-black/40 border border-slate-800/80">
                    <div>Sandbox Graph: <span className="text-cyan-400">{autoPipelineMutation.data.simulation.sim_id}</span></div>
                    <div>Remaining Paths: <span className="text-emerald-400 font-bold">{autoPipelineMutation.data.verification?.after ?? 0}</span></div>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-8 text-center text-slate-500">
                Click &quot;Execute Pipeline&quot; to run the automated containment evaluation.
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* TAB 3: Mutation Lab */}
      {activeTab === 'mutation' && (
        <Card>
          <CardHeader>
            <div>
              <CardTitle>
                <Dna className="w-4 h-4 text-purple-400" />
                Hypothetical Attack-Pattern Mutation Lab
              </CardTitle>
              <CardDescription>
                Inject a hypothetical attack relationship exclusively in a disposable sandbox to discover new exposure routes.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-6 font-mono text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-[10px] uppercase font-mono text-slate-400 block mb-1">
                  Mutation Source Entity
                </label>
                <Input
                  value={mutationSrc}
                  onChange={e => setMutationSrc(e.target.value.trim())}
                  placeholder="e.g. Workstation A"
                />
              </div>

              <div>
                <label className="text-[10px] uppercase font-mono text-slate-400 block mb-1">
                  Attack Relationship Type
                </label>
                <Select
                  value={mutationRel}
                  onChange={e => setMutationRel(e.target.value)}
                >
                  <option value="USES">USES</option>
                  <option value="AUTHENTICATES_TO">AUTHENTICATES_TO</option>
                  <option value="ACCESSES">ACCESSES</option>
                  <option value="REACHES">REACHES</option>
                </Select>
              </div>

              <div>
                <label className="text-[10px] uppercase font-mono text-slate-400 block mb-1">
                  Mutation Destination Entity
                </label>
                <Input
                  value={mutationDst}
                  onChange={e => setMutationDst(e.target.value.trim())}
                  placeholder="e.g. Application Server"
                />
              </div>
            </div>

            <Button
              variant="cyan"
              size="md"
              onClick={() => mutationLabMutation.mutate()}
              isLoading={mutationLabMutation.isPending}
            >
              <Dna className="w-4 h-4 mr-1.5" />
              Simulate Mutation in Sandbox
            </Button>

            {mutationLabMutation.data && (
              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-200">
                    Mutation Sandbox: {mutationLabMutation.data.sim_id}
                  </span>
                  <Badge variant={mutationLabMutation.data.new_path_count > 0 ? 'red' : 'emerald'}>
                    +{mutationLabMutation.data.new_path_count} New Routes
                  </Badge>
                </div>
                <div className="text-slate-400">
                  Baseline Paths: {mutationLabMutation.data.baseline_count} → Mutated Paths: {mutationLabMutation.data.mutated_count}
                </div>

                {mutationLabMutation.data.new_paths.length > 0 && (
                  <div className="space-y-1.5 pt-2">
                    <div className="text-slate-400 text-[11px] font-semibold">New Exposure Routes:</div>
                    {mutationLabMutation.data.new_paths.map((p, idx) => (
                      <div key={idx} className="p-2 rounded bg-slate-950 border border-slate-800 text-red-300">
                        {p.nodes.join(' → ')}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Confirmation Modal Before Launching Sandbox Simulation */}
      <Modal
        isOpen={confirmModalOpen}
        onClose={() => setConfirmModalOpen(false)}
        title="Confirm Defensive Sandbox Simulation"
        description="Verify simulation parameters before cloning isolated graph."
        maxWidth="md"
      >
        <div className="space-y-4 font-mono text-xs">
          <div className="p-3 rounded-lg bg-amber-950/20 border border-amber-500/30 text-amber-300">
            <div className="flex items-center gap-1.5 font-bold mb-1">
              <AlertTriangle className="w-4 h-4" />
              <span>Sandbox Cloned Scope</span>
            </div>
            <p className="font-sans text-xs text-amber-200">
              This action creates an isolated graph clone (<span className="font-mono">tf-sim-xxxxxxxx</span>). No changes are made to production.
            </p>
          </div>

          <div className="space-y-2">
            <div className="text-slate-400 font-semibold">Actions to be simulated:</div>
            {cutPlan?.cut?.map((c, i) => (
              <div key={i} className="p-2 rounded bg-slate-900 border border-slate-800 text-slate-200">
                {c.src} → {c.dst} ({c.rel})
              </div>
            ))}
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-800">
            <Button variant="ghost" size="sm" onClick={() => setConfirmModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="neon"
              size="sm"
              onClick={() => {
                setConfirmModalOpen(false)
                simulateMutation.mutate()
              }}
              isLoading={simulateMutation.isPending}
            >
              Confirm & Simulate
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
