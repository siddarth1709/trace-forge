import React, { useMemo, useState, useCallback } from 'react'
import {
  ReactFlow,
  Controls,
  Background,
  MiniMap,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  BackgroundVariant,
} from '@xyflow/react'
import type { GNode, GEdge } from '../../api/types.ts'
import { getNodeVisualProps } from '../../lib/utils.ts'
import { Search, Filter, RefreshCw, Eye, Network } from 'lucide-react'
import { Button } from '../ui/Button.tsx'
import { GraphPreloader } from './GraphPreloader.tsx'

export interface AttackGraphViewProps {
  nodes: GNode[]
  edges: GEdge[]
  highlightedPaths?: string[][] // Array of node names in paths
  onSelectNode: (node: GNode | null) => void
  onSelectEdge: (edge: GEdge | null) => void
  isLoading?: boolean
  graphName?: string
  onRefresh?: () => void
}

export const AttackGraphView: React.FC<AttackGraphViewProps> = ({
  nodes,
  edges,
  highlightedPaths = [],
  onSelectNode,
  onSelectEdge,
  isLoading,
  graphName,
  onRefresh,
}) => {
  const [searchQuery, setSearchQuery] = useState('')
  const [filterLabel, setFilterLabel] = useState<string>('ALL')

  // Calculate layout coordinates deterministically
  const initialNodes: Node[] = useMemo(() => {
    if (!nodes || nodes.length === 0) return []

    // Group nodes into logical tiers
    // Footholds (Workstation A, Secondary Foothold) -> Credentials/Accounts -> Intermediate Servers -> Critical Server
    const tiers: Record<string, number> = {
      'Workstation A': 0,
      'Secondary Foothold': 0,
      'Shared Credential': 1,
      'Service Account': 1,
      'Admin Workstation': 2,
      'Application Server': 2,
      'Critical Server': 3,
    }

    // Assign x, y positions
    const tierCounts: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0 }

    return nodes.map((n, index) => {
      const name = n.props?.name || `Node ${n.id}`
      const visual = getNodeVisualProps(n.labels, n.props)
      const tier = tiers[name] !== undefined ? tiers[name] : (n.labels.includes('Evidence') ? 4 : (index % 3) + 1)
      const yIndex = tierCounts[tier] || 0
      tierCounts[tier] = yIndex + 1

      const x = 120 + tier * 280
      const y = 80 + yIndex * 130

      const isCritical = n.props?.criticality === 'critical' || name === 'Critical Server'

      return {
        id: String(n.id),
        position: { x, y },
        data: {
          label: (
            <div className="text-left font-mono">
              <div className="flex items-center justify-between gap-1 mb-1">
                <span className="text-[9px] uppercase px-1 rounded bg-black/40 text-slate-400 font-semibold">
                  {n.labels[0] || 'Entity'}
                </span>
                {isCritical && (
                  <span className="text-[9px] uppercase px-1 rounded bg-red-500/20 text-red-400 font-bold border border-red-500/30 animate-pulse">
                    TARGET
                  </span>
                )}
              </div>
              <div className="font-bold text-xs text-slate-100 truncate max-w-[170px]">
                {name}
              </div>
              {n.props?.type && (
                <div className="text-[10px] text-slate-400 mt-0.5 capitalize">
                  {String(n.props.type)}
                </div>
              )}
            </div>
          ),
          rawNode: n,
        },
        style: {
          background: visual.bg,
          border: `1.5px solid ${visual.border}`,
          borderRadius: '10px',
          padding: '10px 12px',
          width: 200,
          color: '#f8fafc',
          boxShadow: isCritical ? '0 0 25px rgba(239, 68, 68, 0.35)' : `0 0 15px ${visual.color}15`,
        },
      }
    })
  }, [nodes])

  // Build edges
  const initialEdges: Edge[] = useMemo(() => {
    if (!edges || edges.length === 0) return []

    // Collect pairs of nodes on highlighted paths
    const highlightedPairs = new Set<string>()
    highlightedPaths.forEach(path => {
      for (let i = 0; i < path.length - 1; i++) {
        highlightedPairs.add(`${path[i]}->${path[i + 1]}`)
      }
    })

    return edges.map((e, index) => {
      const srcNode = nodes.find(n => n.id === e.src)
      const dstNode = nodes.find(n => n.id === e.dst)
      const srcName = srcNode?.props?.name || `Node ${e.src}`
      const dstName = dstNode?.props?.name || `Node ${e.dst}`
      const pairKey = `${srcName}->${dstName}`
      const isHighlighted = highlightedPairs.has(pairKey)

      const isUses = e.rel === 'USES'
      const isAuth = e.rel === 'AUTHENTICATES_TO'
      const isAccess = e.rel === 'ACCESSES' || e.rel === 'REACHES'

      let strokeColor = '#475569'
      if (isHighlighted) {
        strokeColor = '#00ff88'
      } else if (isAccess) {
        strokeColor = '#ef4444'
      } else if (isAuth) {
        strokeColor = '#06b6d4'
      } else if (isUses) {
        strokeColor = '#a855f7'
      }

      return {
        id: `e-${e.src}-${e.dst}-${index}`,
        source: String(e.src),
        target: String(e.dst),
        label: e.rel,
        animated: isHighlighted,
        style: {
          stroke: strokeColor,
          strokeWidth: isHighlighted ? 3 : 1.5,
          strokeDasharray: isHighlighted ? '5 5' : undefined,
        },
        labelStyle: {
          fill: isHighlighted ? '#00ff88' : '#94a3b8',
          fontFamily: 'monospace',
          fontSize: 10,
          fontWeight: isHighlighted ? 700 : 500,
        },
        labelBgStyle: {
          fill: '#080b11',
          fillOpacity: 0.9,
          rx: 4,
          ry: 4,
        },
        data: { rawEdge: e },
      }
    })
  }, [edges, nodes, highlightedPaths])

  const [flowNodes, setFlowNodes, onNodesChange] = useNodesState(initialNodes)
  const [flowEdges, setFlowEdges, onEdgesChange] = useEdgesState(initialEdges)

  // Sync when initialNodes or initialEdges change
  React.useEffect(() => {
    setFlowNodes(initialNodes)
  }, [initialNodes, setFlowNodes])

  React.useEffect(() => {
    setFlowEdges(initialEdges)
  }, [initialEdges, setFlowEdges])

  // Filter nodes based on search and label filter
  const filteredNodes = useMemo(() => {
    return flowNodes.map(node => {
      const raw = (node.data as { rawNode?: GNode })?.rawNode
      const name = raw?.props?.name || ''
      const labels = raw?.labels || []
      const matchesSearch = !searchQuery || name.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesFilter = filterLabel === 'ALL' || labels.includes(filterLabel)
      const isVisible = matchesSearch && matchesFilter

      return {
        ...node,
        hidden: !isVisible,
      }
    })
  }, [flowNodes, searchQuery, filterLabel])

  const handleNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      const raw = (node.data as { rawNode?: GNode })?.rawNode
      if (raw) {
        onSelectNode(raw)
        onSelectEdge(null)
      }
    },
    [onSelectNode, onSelectEdge]
  )

  const handleEdgeClick = useCallback(
    (_: React.MouseEvent, edge: Edge) => {
      const raw = (edge.data as { rawEdge?: GEdge })?.rawEdge
      if (raw) {
        onSelectEdge(raw)
        onSelectNode(null)
      }
    },
    [onSelectEdge, onSelectNode]
  )

  const uniqueLabels = useMemo(() => {
    const s = new Set<string>()
    nodes.forEach(n => n.labels.forEach(l => s.add(l)))
    return ['ALL', ...Array.from(s)]
  }, [nodes])

  return (
    <div className="relative w-full h-[680px] bg-[#06090e] border border-slate-800 rounded-xl overflow-hidden flex flex-col shadow-2xl">
      {/* Top Filter and Search Bar */}
      <div className="absolute top-4 left-4 right-4 z-10 flex flex-wrap items-center justify-between gap-3 pointer-events-none">
        <div className="flex items-center gap-2 pointer-events-auto bg-[#0b0f17]/90 p-1.5 rounded-lg border border-slate-800 shadow-xl backdrop-blur-md">
          <div className="relative flex items-center">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 pointer-events-none" />
            <input
              type="text"
              placeholder="Search assets..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded-md pl-8 pr-3 py-1 text-xs font-mono text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 w-44"
            />
          </div>

          <div className="flex items-center gap-1">
            <Filter className="w-3.5 h-3.5 text-slate-500 ml-1" />
            <select
              value={filterLabel}
              onChange={e => setFilterLabel(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded-md px-2 py-1 text-xs font-mono text-slate-300 focus:outline-none focus:border-emerald-500"
            >
              {uniqueLabels.map(l => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2 pointer-events-auto bg-[#0b0f17]/90 p-1.5 rounded-lg border border-slate-800 shadow-xl backdrop-blur-md">
          {highlightedPaths.length > 0 && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono text-xs">
              <Eye className="w-3.5 h-3.5" />
              <span>{highlightedPaths.length} Active Path(s) Highlighted</span>
            </div>
          )}
          {onRefresh && (
            <Button variant="ghost" size="sm" onClick={onRefresh} isLoading={isLoading}>
              <RefreshCw className="w-3.5 h-3.5 mr-1" />
              Reload
            </Button>
          )}
        </div>
      </div>

      {/* Main Flow Canvas */}
      <div className="flex-1 w-full h-full relative">
        {/* Preloader overlay when fetching/refetching graph */}
        {isLoading && (
          <GraphPreloader
            variant="overlay"
            graphName={graphName}
          />
        )}

        {/* Empty state when not loading and no nodes present */}
        {nodes.length === 0 && !isLoading && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-[#06090e]/95 p-6 text-center">
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 text-slate-400 mb-3">
              <Network className="w-8 h-8 text-cyan-400" />
            </div>
            <h4 className="text-sm font-bold font-mono text-slate-200">No Graph Entities Loaded</h4>
            <p className="text-xs text-slate-400 max-w-sm mt-1 mb-4">
              No active nodes or relationships were found in the current graph instance. Click Fetch to retrieve data or ingest real incident datasets.
            </p>
            {onRefresh && (
              <Button variant="neon" size="sm" onClick={onRefresh}>
                <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                Fetch Graph Topology
              </Button>
            )}
          </div>
        )}

        <ReactFlow
          nodes={filteredNodes}
          edges={flowEdges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={handleNodeClick}
          onEdgeClick={handleEdgeClick}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          minZoom={0.2}
          maxZoom={2.5}
        >
          <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#1e293b" />
          <Controls position="bottom-left" showInteractive={false} />
          <MiniMap
            position="bottom-right"
            nodeColor={node => {
              const raw = (node.data as { rawNode?: GNode })?.rawNode
              return getNodeVisualProps(raw?.labels, raw?.props).color
            }}
            maskColor="rgba(6, 9, 14, 0.7)"
          />
        </ReactFlow>
      </div>
    </div>
  )
}
