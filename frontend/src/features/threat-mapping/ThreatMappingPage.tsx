import React, { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import {
  intelApi,
  type ThreatMappingResponse,
  type CausalHypothesisResponse,
  type AdversaryArenaResponse,
} from '../../api/index.ts'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../../components/ui/Card.tsx'
import { Button } from '../../components/ui/Button.tsx'
import { Badge } from '../../components/ui/Badge.tsx'
import { Tabs } from '../../components/ui/Tabs.tsx'
import { useToast } from '../../components/ui/Toast.tsx'
import {
  Target,
  GitBranch,
  Swords,
  Play,
} from 'lucide-react'

export const ThreatMappingPage: React.FC = () => {
  const toast = useToast()
  const [activeTab, setActiveTab] = useState<'matrix' | 'causal' | 'arena'>('matrix')

  // Sample observations for MITRE ATT&CK mapping
  const observations = [
    { name: 'Obs 1: EDR Credential Use', evidence_types: ['account_authentication'] },
    { name: 'Obs 2: Memory Access Pattern', evidence_types: ['credential_dumping'] },
    { name: 'Obs 3: Admin Workstation Session', evidence_types: ['remote_service'] },
    { name: 'Obs 4: Unknown Network Beacon', evidence_types: ['unknown_signal'] },
  ]

  // Mutation for technique mapping
  const mapMutation = useMutation({
    mutationFn: () => intelApi.mapTechniques(observations),
    onSuccess: () => toast.success('Techniques Mapped', 'Evidence-supported ATT&CK candidates identified.'),
    onError: (err: Error) => toast.error('Mapping Error', err.message),
  })

  // Sample events for Causal Hypotheses
  const [causalEvents] = useState([
    { event_id: 'EV-1', timestamp: 100, entities: ['Workstation A', 'Shared Credential'] },
    { event_id: 'EV-3', timestamp: 200, entities: ['Shared Credential', 'Admin Workstation'] },
    { event_id: 'EV-4', timestamp: 300, entities: ['Admin Workstation', 'Critical Server'] },
    { event_id: 'EV-INJ', timestamp: 105, entities: ['ALERT-1'] },
  ])

  // Mutation for causal hypotheses
  const causalMutation = useMutation({
    mutationFn: () => intelApi.investigateCausality(causalEvents, 3600),
    onSuccess: () => toast.success('Causal Chains Evaluated', 'Candidate event linkages generated.'),
    onError: (err: Error) => toast.error('Causal Analysis Error', err.message),
  })

  // Sample scenarios for Adversary Arena
  const [arenaScenarios] = useState([
    { name: 'Containment Plan S1 (Isolated)', paths_before: 3, paths_after: 0 },
    { name: 'Partial Cut (Admin Workstation only)', paths_before: 3, paths_after: 1 },
    { name: 'Baseline No-Action Defense', paths_before: 3, paths_after: 3 },
  ])

  // Mutation for Adversary Arena scoring
  const arenaMutation = useMutation({
    mutationFn: () => intelApi.scoreArena(arenaScenarios),
    onSuccess: () => toast.success('Arena Scored', 'Scenarios ranked by residual paths.'),
    onError: (err: Error) => toast.error('Arena Scoring Error', err.message),
  })

  const tabs = [
    { id: 'matrix', label: 'MITRE ATT&CK Mapping', icon: <Target className="w-3.5 h-3.5" /> },
    { id: 'causal', label: 'Causal Chain Hypotheses', icon: <GitBranch className="w-3.5 h-3.5" /> },
    { id: 'arena', label: 'Adversary Arena Scoring', icon: <Swords className="w-3.5 h-3.5" /> },
  ]

  const mappingData: ThreatMappingResponse | undefined = mapMutation.data
  const causalData: CausalHypothesisResponse | undefined = causalMutation.data
  const arenaData: AdversaryArenaResponse | undefined = arenaMutation.data

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="red" size="sm">Adversary Tactics & Threat Intelligence</Badge>
            <span className="text-xs font-mono text-slate-400">Conservative Evidence Binding</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold font-mono text-slate-100 tracking-tight mt-1 flex items-center gap-2">
            <Target className="w-6 h-6 text-red-400" />
            Threat Mapping & Adversary Intelligence
          </h1>
          <p className="text-xs text-slate-400 font-sans mt-0.5">
            Correlate observed telemetry with candidate MITRE ATT&CK techniques without inventing attribution.
          </p>
        </div>
      </div>

      <Tabs
        tabs={tabs}
        activeTab={activeTab}
        onChange={tabId => setActiveTab(tabId as typeof activeTab)}
      />

      {/* TAB 1: MITRE ATT&CK Mapping */}
      {activeTab === 'matrix' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div>
                <CardTitle>
                  <Target className="w-4 h-4 text-red-400" />
                  Evidence-Grounded ATT&CK Mapping Engine
                </CardTitle>
                <CardDescription>
                  Requires declared evidence types. Techniques are never asserted on unverified claims.
                </CardDescription>
              </div>
              <Button
                variant="neon"
                size="sm"
                onClick={() => mapMutation.mutate()}
                isLoading={mapMutation.isPending}
              >
                <Play className="w-3.5 h-3.5 mr-1" />
                Run Mapping
              </Button>
            </CardHeader>
            <CardContent className="space-y-4 font-mono text-xs">
              <div className="space-y-2">
                <div className="text-slate-400 font-semibold text-[11px] uppercase">
                  Input Telemetry Observations ({observations.length})
                </div>
                {observations.map((obs, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 flex items-center justify-between"
                  >
                    <span className="text-slate-200">{obs.name}</span>
                    <div className="flex gap-1">
                      {obs.evidence_types.map(t => (
                        <Badge key={t} variant="cyan" size="sm">
                          {t}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {mappingData && (
                <div className="pt-4 border-t border-slate-800 space-y-4">
                  <div className="text-slate-200 font-bold text-sm flex items-center justify-between">
                    <span>Matched ATT&CK Candidate Techniques ({mappingData.mappings.length})</span>
                    <Badge variant="emerald">Advisory Only</Badge>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {mappingData.mappings.map((m, idx) => (
                      <div
                        key={idx}
                        className="p-4 rounded-xl bg-slate-900/80 border border-red-500/30 space-y-2 shadow-lg"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-red-400 text-sm">{m.technique_id}</span>
                          <Badge variant="red" size="sm">{m.technique_name}</Badge>
                        </div>
                        <div className="text-slate-300 font-sans text-xs">
                          Observation #{m.observation_index + 1}: Supported by required evidence.
                        </div>
                        <div className="flex flex-wrap gap-1 pt-1">
                          {m.matched_evidence_types.map(t => (
                            <span
                              key={t}
                              className="px-2 py-0.5 rounded bg-red-950/40 text-[10px] text-red-300 border border-red-800/40"
                            >
                              Evidence: {t}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  {mappingData.unmapped_observations.length > 0 && (
                    <div className="p-3 rounded-lg bg-slate-900/40 border border-slate-800 text-slate-400 text-[11px]">
                      Unmapped Observations: #{mappingData.unmapped_observations.map(i => i + 1).join(', ')} (no matching evidence type)
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB 2: Causal Chain Hypotheses */}
      {activeTab === 'causal' && (
        <Card>
          <CardHeader>
            <div>
              <CardTitle>
                <GitBranch className="w-4 h-4 text-cyan-400" />
                Causal Investigation Hypotheses (/investigate/causal)
              </CardTitle>
              <CardDescription>
                Orders events chronologically and links candidates via shared entities or explicit cause IDs.
              </CardDescription>
            </div>
            <Button
              variant="cyan"
              size="sm"
              onClick={() => causalMutation.mutate()}
              isLoading={causalMutation.isPending}
            >
              <Play className="w-3.5 h-3.5 mr-1" />
              Evaluate Causal Links
            </Button>
          </CardHeader>
          <CardContent className="font-mono text-xs space-y-4">
            {causalData ? (
              <div className="space-y-4">
                <div className="text-slate-200 font-bold">
                  Candidate Linkages Found: {causalData.candidate_chains.length}
                </div>
                <div className="space-y-2">
                  {causalData.candidate_chains.map((chain, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between"
                    >
                      <div>
                        <div className="text-slate-200 font-semibold">
                          Event #{chain.event_indices[0] + 1} → Event #{chain.event_indices[1] + 1}
                        </div>
                        <div className="text-slate-400 text-[11px] font-sans mt-0.5">
                          Shared Entity: <span className="text-cyan-400 font-mono">{chain.shared_entities.join(', ')}</span>
                        </div>
                      </div>
                      <Badge variant="cyan" size="sm">
                        {chain.classification.replace(/_/g, ' ')}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="p-8 text-center text-slate-500">
                Click &quot;Evaluate Causal Links&quot; to test candidate event chains.
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* TAB 3: Adversary Arena */}
      {activeTab === 'arena' && (
        <Card>
          <CardHeader>
            <div>
              <CardTitle>
                <Swords className="w-4 h-4 text-amber-400" />
                Adversary Arena: Strategy Benchmarking
              </CardTitle>
              <CardDescription>
                Scores defensive simulation proposals strictly by residual attack paths.
              </CardDescription>
            </div>
            <Button
              variant="neon"
              size="sm"
              onClick={() => arenaMutation.mutate()}
              isLoading={arenaMutation.isPending}
            >
              <Play className="w-3.5 h-3.5 mr-1" />
              Score Scenarios
            </Button>
          </CardHeader>
          <CardContent className="font-mono text-xs space-y-4">
            {arenaData ? (
              <div className="space-y-3">
                {arenaData.ranked_scenarios.map((scen, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-slate-400">#{idx + 1}</span>
                      <div>
                        <div className="font-semibold text-slate-100">{scen.scenario}</div>
                        <div className="text-slate-400 text-[11px] font-sans mt-0.5">
                          Paths: {scen.paths_before} → {scen.paths_after} ({Math.round(scen.path_reduction_fraction * 100)}% reduction)
                        </div>
                      </div>
                    </div>
                    <Badge variant={scen.contained_in_simulation ? 'emerald' : 'amber'}>
                      {scen.contained_in_simulation ? 'FULLY CONTAINED' : 'RESIDUAL RISK'}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-slate-500">
                Click &quot;Score Scenarios&quot; to rank defensive responses.
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
