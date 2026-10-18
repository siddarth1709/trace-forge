import React, { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { graphApi, dataApi } from '../../api/index.ts'
import { AttackGraphView } from '../../components/graph/AttackGraphView.tsx'
import { GraphLegend } from '../../components/graph/GraphLegend.tsx'
import { NodeDetailDrawer } from '../../components/graph/NodeDetailDrawer.tsx'
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card.tsx'
import { Button } from '../../components/ui/Button.tsx'
import { Badge } from '../../components/ui/Badge.tsx'
import { Input } from '../../components/ui/Input.tsx'
import { ImportReportModal } from '../../components/onboarding/ImportReportModal.tsx'
import { useToast } from '../../components/ui/Toast.tsx'
import { DEFAULT_ATTACK_SOURCES, DEFAULT_ATTACK_TARGET } from '../../lib/constants.ts'
import { cn } from '../../lib/utils.ts'
import type { GNode, GEdge, IngestResponse } from '../../api/types.ts'
import {
  Network,
  SearchCheck,
  Layers,
  Info,
  Upload,
  Sparkles,
  Server,
  Cloud,
  ShieldAlert,
  RotateCcw,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export const AttackGraphPage: React.FC = () => {
  const navigate = useNavigate()
  const toast = useToast()
  const queryClient = useQueryClient()
  const [activeGraph, setActiveGraph] = useState<string>('traceforge')
  const [sources, setSources] = useState<string[]>(DEFAULT_ATTACK_SOURCES)
  const [target, setTarget] = useState<string>(DEFAULT_ATTACK_TARGET)
  const [selectedNode, setSelectedNode] = useState<GNode | null>(null)
  const [selectedEdge, setSelectedEdge] = useState<GEdge | null>(null)
  const [showLegend, setShowLegend] = useState(true)
  const [importModalOpen, setImportModalOpen] = useState(false)
  const [isQuickIngesting, setIsQuickIngesting] = useState(false)

  // Fetch full graph topology (with 3-second cyber preloader scan)
  const {
    data: graphData,
    isLoading: isGraphLoading,
    isFetching: isGraphFetching,
  } = useQuery({
    queryKey: ['graph-view', activeGraph],
    queryFn: async () => {
      const [res] = await Promise.all([
        graphApi.getGraph(activeGraph),
        new Promise(resolve => setTimeout(resolve, 3000)),
      ])
      return res
    },
  })

  // Fetch active attack paths
  const {
    data: pathsData,
    isLoading: isPathsLoading,
    refetch: refetchPaths,
  } = useQuery({
    queryKey: ['paths', sources, target, activeGraph],
    queryFn: () => graphApi.findPaths({ sources, target, graph: activeGraph }),
    enabled: sources.length > 0 && !!target,
  })

  const [isManualReloading, setIsManualReloading] = useState(false)

  // Compulsorily refetch graph and active paths from FalkorDB with 3sec preloader
  const handleRefetchGraph = async () => {
    setIsManualReloading(true)
    setSelectedNode(null)
    setSelectedEdge(null)
    // 1. Everything goes: remove cached queries
    queryClient.removeQueries({ queryKey: ['graph-view', activeGraph] })
    queryClient.removeQueries({ queryKey: ['paths', sources, target, activeGraph] })

    try {
      // 2. Query FalkorDB live while displaying preloader for 3 seconds
      const [freshGraph] = await Promise.all([
        graphApi.getGraph(activeGraph),
        new Promise(resolve => setTimeout(resolve, 3000)),
      ])
      queryClient.setQueryData(['graph-view', activeGraph], freshGraph)
      if (sources.length > 0 && target) {
        const freshPaths = await graphApi.findPaths({ sources, target, graph: activeGraph })
        queryClient.setQueryData(['paths', sources, target, activeGraph], freshPaths)
      }
      toast.success(
        `FalkorDB Synced: Refetched ${freshGraph.nodes.length} nodes & ${freshGraph.edges.length} edges from graph '${freshGraph.graph}'.`
      )
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to reload graph'
      toast.error(msg)
    } finally {
      setIsManualReloading(false)
    }
  }

  const highlightedPaths = pathsData?.paths ? pathsData.paths.map(p => p.nodes) : []

  // Auto-focus source and target from ingested endpoints
  const handleImportSuccess = (resp: IngestResponse) => {
    setActiveGraph(resp.graph || 'tf-sim-live')
    if (resp.nodes && resp.nodes.length > 0) {
      // Find candidate foothold (first workstation or laptop or first node)
      const foothold =
        resp.nodes.find(n => /laptop|workstation|foothold|client|phished/i.test(n.name)) ||
        resp.nodes[0]

      // Find candidate critical target (last node or server/database)
      const criticalTarget =
        resp.nodes.slice().reverse().find(n => /swift|database|db|server|controller|dc|critical/i.test(n.name)) ||
        resp.nodes[resp.nodes.length - 1]

      if (foothold && criticalTarget && foothold.name !== criticalTarget.name) {
        setSources([foothold.name])
        setTarget(criticalTarget.name)
        toast.info(`Target updated: Tracing from ${foothold.name} to ${criticalTarget.name}`)
      }
    }
  }

  // Quick 1-click real enterprise dataset loader
  const handleQuickLoadScenario = async (scenario: 'ad' | 'cloud' | 'kev') => {
    setIsQuickIngesting(true)
    try {
      const samplesRes = await dataApi.getSampleDatasets()
      const targetSample = samplesRes.samples.find(s => {
        if (scenario === 'ad') return s.filename.includes('ad_breach')
        if (scenario === 'cloud') return s.filename.includes('guardduty')
        return s.filename.includes('known_exploited') || s.filename.includes('cisa')
      })

      if (!targetSample) {
        toast.error('Sample dataset not found on server')
        return
      }

      const targetGraph = 'tf-sim-live'
      const resp = await dataApi.ingestData({
        graph: targetGraph,
        content: targetSample.content,
        format: targetSample.format,
        replace: true, // Clean sandbox replacement for scenario clarity
      })

      setActiveGraph(targetGraph)

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['graph-view'] }),
        queryClient.invalidateQueries({ queryKey: ['schema'] }),
        queryClient.invalidateQueries({ queryKey: ['paths'] }),
        queryClient.invalidateQueries({ queryKey: ['health'] }),
      ])

      handleImportSuccess(resp)

      const scenarioName =
        scenario === 'ad'
          ? 'AD Domain Breach'
          : scenario === 'cloud'
            ? 'Cloud Lateral Movement'
            : 'CISA KEV Exploits'

      toast.success(
        `Loaded ${scenarioName}: ${resp.endpoints_added} endpoints & ${resp.connections_added} autoread connections!`
      )
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load scenario'
      toast.error(msg)
    } finally {
      setIsQuickIngesting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="cyan" size="sm">FalkorDB Graph Topology</Badge>
            <span className="text-xs font-mono text-slate-400">
              Active Graph: {graphData?.graph || activeGraph}
            </span>
            {activeGraph !== 'traceforge' && (
              <button
                type="button"
                onClick={() => setActiveGraph('traceforge')}
                className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 hover:text-white border border-slate-700 hover:border-slate-500 transition-colors"
                title="Switch back to baseline scenario"
              >
                Reset to Baseline (traceforge)
              </button>
            )}
          </div>
          <h1 className="text-xl sm:text-2xl font-bold font-mono text-slate-100 tracking-tight mt-1 flex items-center gap-2">
            <Network className="w-6 h-6 text-emerald-400" />
            Attack Graph Explorer
          </h1>
          <p className="text-xs text-slate-400 font-sans mt-0.5">
            Visualize connected endpoints, credentials, and movement hops. Discovered multi-hop paths are dynamically highlighted.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={isGraphLoading || isGraphFetching || isManualReloading}
            onClick={handleRefetchGraph}
          >
            <RotateCcw
              className={cn(
                'w-4 h-4 mr-1.5',
                (isGraphLoading || isGraphFetching || isManualReloading) && 'animate-spin'
              )}
            />
            {isGraphLoading || isGraphFetching || isManualReloading
              ? 'Refetching...'
              : 'Refetch Graph'}
          </Button>
          <Button
            variant="neon"
            size="sm"
            onClick={() => setImportModalOpen(true)}
          >
            <Upload className="w-4 h-4 mr-1.5" />
            Ingest Real Data
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowLegend(!showLegend)}
          >
            <Layers className="w-4 h-4 mr-1.5" />
            {showLegend ? 'Hide Legend' : 'Show Legend'}
          </Button>
          <Button
            variant="cyan"
            size="sm"
            onClick={() => navigate('/investigations')}
          >
            <SearchCheck className="w-4 h-4 mr-1.5" />
            Open Investigation
          </Button>
        </div>
      </div>

      {/* Real Data Scenario Quick Switcher */}
      <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-cyan-400 shrink-0" />
          <div>
            <span className="text-xs font-bold text-slate-200">Real Incident Datasets</span>
            <span className="text-[11px] text-slate-400 block font-sans">
              Autoread connection descriptions and populate live endpoints into FalkorDB
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="ghost"
            size="sm"
            disabled={isQuickIngesting}
            onClick={() => handleQuickLoadScenario('ad')}
            className="text-xs border border-purple-500/30 hover:bg-purple-950/20 text-purple-300"
          >
            <Server className="w-3.5 h-3.5 mr-1.5 text-purple-400" />
            Active Directory Breach (JSON)
          </Button>
          <Button
            variant="ghost"
            size="sm"
            disabled={isQuickIngesting}
            onClick={() => handleQuickLoadScenario('cloud')}
            className="text-xs border border-emerald-500/30 hover:bg-emerald-950/20 text-emerald-300"
          >
            <Cloud className="w-3.5 h-3.5 mr-1.5 text-emerald-400" />
            AWS Cloud Lateral (CSV)
          </Button>
          <Button
            variant="ghost"
            size="sm"
            disabled={isQuickIngesting}
            onClick={() => handleQuickLoadScenario('kev')}
            className="text-xs border border-amber-500/30 hover:bg-amber-950/20 text-amber-300"
          >
            <ShieldAlert className="w-3.5 h-3.5 mr-1.5 text-amber-400" />
            CISA KEV Exploits (CSV)
          </Button>
        </div>
      </div>

      {/* Query Bar */}
      <Card>
        <CardContent className="p-4 flex flex-col md:flex-row items-center gap-4">
          <div className="flex-1 w-full flex flex-col sm:flex-row items-center gap-3">
            <div className="w-full sm:w-1/2">
              <label className="text-[10px] uppercase font-mono text-slate-400 block mb-1">
                Starting Foothold Sources (comma-separated)
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
                placeholder="Workstation A, Phished-Laptop-HR04"
              />
            </div>

            <div className="w-full sm:w-1/2">
              <label className="text-[10px] uppercase font-mono text-slate-400 block mb-1">
                Critical Target Asset
              </label>
              <Input
                value={target}
                onChange={e => setTarget(e.target.value.trim())}
                placeholder="Critical Server, SWIFT-Financial-Database"
              />
            </div>
          </div>

          <div className="shrink-0 flex items-center gap-2 w-full md:w-auto mt-2 md:mt-0">
            <Button
              variant="cyan"
              size="md"
              className="w-full md:w-auto"
              onClick={() => refetchPaths()}
              isLoading={isPathsLoading}
            >
              Trace Paths ({highlightedPaths.length})
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Graph Visualizer Area */}
      <div className="relative">
        <AttackGraphView
          nodes={graphData?.nodes || []}
          edges={graphData?.edges || []}
          highlightedPaths={highlightedPaths}
          onSelectNode={setSelectedNode}
          onSelectEdge={setSelectedEdge}
          isLoading={isGraphLoading || isGraphFetching || isManualReloading}
          graphName={graphData?.graph || activeGraph}
          onRefresh={handleRefetchGraph}
        />

        {showLegend && (
          <div className="absolute bottom-4 left-4 z-10 hidden sm:block">
            <GraphLegend />
          </div>
        )}
      </div>

      {/* Discovered Paths Summary List */}
      {pathsData?.paths && pathsData.paths.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>
              <Info className="w-4 h-4 text-cyan-400" />
              Active Routes Between Selected Footholds and Target
            </CardTitle>
            <Badge variant="cyan">{pathsData.paths.length} Paths Discovered</Badge>
          </CardHeader>
          <CardContent className="space-y-3 font-mono text-xs">
            {pathsData.paths.map((p, idx) => (
              <div
                key={idx}
                className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <Badge variant="emerald" size="sm">Path #{idx + 1}</Badge>
                  <span className="text-slate-300">
                    {p.nodes.join(' → ')}
                  </span>
                </div>
                <span className="text-slate-500 text-[11px]">
                  Relationships: {p.rels.join(', ')}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Node/Edge Detail Slide-out Drawer */}
      <NodeDetailDrawer
        selectedNode={selectedNode}
        selectedEdge={selectedEdge}
        allNodes={graphData?.nodes || []}
        allEdges={graphData?.edges || []}
        onClose={() => {
          setSelectedNode(null)
          setSelectedEdge(null)
        }}
        onSetSource={name => setSources(prev => Array.from(new Set([...prev, name])))}
        onSetTarget={name => setTarget(name)}
      />

      {/* Safe Data Ingestion Modal */}
      <ImportReportModal
        isOpen={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        onImportSuccess={handleImportSuccess}
      />
    </div>
  )
}
