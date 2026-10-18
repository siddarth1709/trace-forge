import React, { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import {
  riskApi,
  type RiskUncertaintyResponse,
} from '../../api/index.ts'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../../components/ui/Card.tsx'
import { Button } from '../../components/ui/Button.tsx'
import { Badge } from '../../components/ui/Badge.tsx'
import { Input } from '../../components/ui/Input.tsx'
import { RiskRadar } from '../../components/charts/RiskRadar.tsx'
import { SensitivityChart } from '../../components/charts/SensitivityChart.tsx'
import { useToast } from '../../components/ui/Toast.tsx'
import { DEFAULT_ATTACK_SOURCES, DEFAULT_ATTACK_TARGET, DISCLAIMERS } from '../../lib/constants.ts'
import {
  TrendingUp,
  Sliders,
  Sparkles,
  AlertTriangle,
  Info,
  Play,
} from 'lucide-react'

export const RiskAnalysisPage: React.FC = () => {
  const toast = useToast()
  const [sources, setSources] = useState<string[]>(DEFAULT_ATTACK_SOURCES)
  const [target, setTarget] = useState<string>(DEFAULT_ATTACK_TARGET)

  // 1. Calculate deterministic risk score
  const { data: riskData, isLoading: isRiskLoading, refetch: refetchRisk } = useQuery({
    queryKey: ['risk-score', sources, target],
    queryFn: () => riskApi.calculateRisk({ sources, target }),
    enabled: sources.length > 0 && !!target,
  })

  // 2. Recommendations & explainability
  const { data: explainData, refetch: refetchExplain } = useQuery({
    queryKey: ['explain-recommendations', sources, target],
    queryFn: () => riskApi.explainRecommendations({ sources, target }),
    enabled: sources.length > 0 && !!target,
  })

  // 3. Uncertainty & sensitivity analysis mutation
  const uncertaintyMutation = useMutation({
    mutationFn: () =>
      riskApi.analyzeUncertainty({
        features: {
          criticality: 0.9,
          exposure: 0.7,
          confidence: 0.95,
          recency: 0.8,
          exploit: 1.0,
        },
        uncertainty: {
          exposure: 0.2,
          confidence: 0.1,
        },
      }),
    onSuccess: () => toast.success('Sensitivity Analyzed', 'Calculated sensitivity bounds across weight scenarios.'),
    onError: (err: Error) => toast.error('Analysis Error', err.message),
  })

  const sensitivityData: RiskUncertaintyResponse | undefined = uncertaintyMutation.data

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="purple" size="sm">5-Axis Risk Engine</Badge>
            <span className="text-xs font-mono text-slate-400">
              Model: {riskData?.version || 'tf-risk-v1'}
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold font-mono text-slate-100 tracking-tight mt-1 flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-purple-400" />
            Risk Posture & Sensitivity Analysis
          </h1>
          <p className="text-xs text-slate-400 font-sans mt-0.5">
            Deterministic risk scoring based on active attack paths, vulnerability exploitation, and weight sensitivity scenarios.
          </p>
        </div>

        <Button
          variant="cyan"
          size="sm"
          onClick={() => {
            refetchRisk()
            refetchExplain()
            uncertaintyMutation.mutate()
          }}
          isLoading={isRiskLoading}
        >
          <Play className="w-3.5 h-3.5 mr-1" />
          Recalculate All
        </Button>
      </div>

      {/* Advisory Notice */}
      <div className="p-3.5 rounded-xl bg-purple-950/20 border border-purple-500/30 flex items-start gap-3 font-mono text-xs text-purple-300">
        <Info className="w-4 h-4 shrink-0 mt-0.5 text-purple-400" />
        <div>
          <div className="font-bold text-[11px] uppercase tracking-wider">Advisory Risk Metric</div>
          <p className="text-slate-300 font-sans text-xs mt-0.5">
            {DISCLAIMERS.ADVISORY_ONLY}
          </p>
        </div>
      </div>

      {/* Target Parameters Bar */}
      <Card>
        <CardContent className="p-4 flex flex-col md:flex-row items-center gap-4">
          <div className="flex-1 w-full grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] uppercase font-mono text-slate-400 block mb-1">
                Foothold Sources
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
                Critical Target Asset
              </label>
              <Input
                value={target}
                onChange={e => setTarget(e.target.value.trim())}
                placeholder="Critical Server"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Top 2 Columns: Score Radar + Path Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Overall Risk Radar */}
        <Card glow="purple">
          <CardHeader>
            <div>
              <CardTitle>
                <TrendingUp className="w-4 h-4 text-purple-400" />
                Target Composite Score
              </CardTitle>
              <CardDescription>
                Calculated over {riskData?.per_path?.length || 0} active paths
              </CardDescription>
            </div>
            {riskData && (
              <Badge variant={riskData.score > 0.7 ? 'red' : 'amber'}>
                {riskData.score.toFixed(3)} / 1.000
              </Badge>
            )}
          </CardHeader>
          <CardContent>
            <RiskRadar
              features={
                riskData?.per_path?.[0]?.features || {
                  criticality: 0.95,
                  exposure: 0.7,
                  confidence: 0.9,
                  recency: 0.85,
                  exploit: 1.0,
                }
              }
            />
            {riskData?.exploited && riskData.exploited.length > 0 && (
              <div className="mt-3 p-3 rounded-lg bg-red-950/30 border border-red-500/30 text-xs font-mono text-red-300">
                <div className="font-bold flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Known Exploited Vulnerabilities:
                </div>
                <div className="text-[11px] text-red-200 mt-1">
                  {riskData.exploited.join(', ')} (CVSS 9.8 Critical)
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right 2 Columns: Sensitivity Analysis */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <div>
                <CardTitle>
                  <Sliders className="w-4 h-4 text-cyan-400" />
                  Weight Sensitivity & Uncertainty Analysis (/risk/uncertainty)
                </CardTitle>
                <CardDescription>
                  Tests score robustness under alternative prioritization scenarios (Baseline, Exposure, Evidence)
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => uncertaintyMutation.mutate()}
                isLoading={uncertaintyMutation.isPending}
              >
                Run Scenarios
              </Button>
            </CardHeader>
            <CardContent>
              {sensitivityData ? (
                <div className="space-y-4 font-mono text-xs">
                  <SensitivityChart scenarios={sensitivityData.scenarios} />
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                    {sensitivityData.scenarios.map(s => (
                      <div
                        key={s.scenario}
                        className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 space-y-1"
                      >
                        <div className="font-semibold text-slate-200 uppercase text-[11px]">
                          {s.scenario.replace(/_/g, ' ')}
                        </div>
                        <div className="text-lg font-bold text-cyan-400">
                          {s.score.toFixed(3)}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          Range: [{s.lower_bound.toFixed(2)} - {s.upper_bound.toFixed(2)}]
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center text-xs text-slate-500 font-mono">
                  Click &quot;Run Scenarios&quot; to test weight sensitivity.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Defensive Recommendations Section */}
      {explainData?.recommendations && explainData.recommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>
              <Sparkles className="w-4 h-4 text-emerald-400" />
              Explainable Defensive Recommendations
            </CardTitle>
            <Badge variant="emerald">Advisory Guidance</Badge>
          </CardHeader>
          <CardContent className="space-y-4 font-mono text-xs">
            {explainData.recommendations.map((rec, idx) => (
              <div
                key={idx}
                className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-100 text-sm">{rec.title}</span>
                  <Badge variant={rec.priority === 'high' ? 'red' : 'amber'}>
                    PRIORITY: {rec.priority.toUpperCase()}
                  </Badge>
                </div>
                <p className="text-xs text-slate-300 font-sans">{rec.reason}</p>
                <div className="p-2.5 rounded bg-black/40 border border-slate-800/80 text-[11px] text-slate-400 font-sans">
                  <span className="font-bold font-mono text-amber-400">Uncertainty Note:</span> {rec.uncertainty}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
