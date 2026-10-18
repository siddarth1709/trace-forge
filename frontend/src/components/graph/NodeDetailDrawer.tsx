import React from 'react'
import { Drawer } from '../ui/Drawer.tsx'
import { Badge } from '../ui/Badge.tsx'
import { Button } from '../ui/Button.tsx'
import { getNodeVisualProps, formatTimestamp } from '../../lib/utils.ts'
import type { GNode, GEdge } from '../../api/types.ts'
import { ShieldAlert, Activity, AlertTriangle } from 'lucide-react'

export interface NodeDetailDrawerProps {
  selectedNode: GNode | null
  selectedEdge: GEdge | null
  allNodes: GNode[]
  allEdges: GEdge[]
  onClose: () => void
  onSetSource?: (nodeName: string) => void
  onSetTarget?: (nodeName: string) => void
  onSimulateCut?: (src: string, rel: string, dst: string) => void
}

export const NodeDetailDrawer: React.FC<NodeDetailDrawerProps> = ({
  selectedNode,
  selectedEdge,
  allNodes,
  allEdges,
  onClose,
  onSetSource,
  onSetTarget,
  onSimulateCut,
}) => {
  const isOpen = !!selectedNode || !!selectedEdge

  if (selectedEdge) {
    const srcNode = allNodes.find(n => n.id === selectedEdge.src)
    const dstNode = allNodes.find(n => n.id === selectedEdge.dst)
    const srcName = srcNode?.props?.name || `Node ${selectedEdge.src}`
    const dstName = dstNode?.props?.name || `Node ${selectedEdge.dst}`

    return (
      <Drawer
        isOpen={isOpen}
        onClose={onClose}
        title={`Relationship: ${selectedEdge.rel}`}
        subtitle={`${srcName} → ${dstName}`}
      >
        <div className="space-y-6 font-mono text-xs">
          {/* Edge summary */}
          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between text-slate-300">
              <span className="text-slate-500">Source Asset</span>
              <span className="font-semibold text-slate-100">{srcName}</span>
            </div>
            <div className="flex items-center justify-between text-slate-300">
              <span className="text-slate-500">Relationship Type</span>
              <Badge variant="cyan">{selectedEdge.rel}</Badge>
            </div>
            <div className="flex items-center justify-between text-slate-300">
              <span className="text-slate-500">Destination Asset</span>
              <span className="font-semibold text-slate-100">{dstName}</span>
            </div>
          </div>

          {/* Properties */}
          <div>
            <div className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold mb-2">
              Edge Metadata & Telemetry
            </div>
            <div className="rounded-xl border border-slate-800 bg-[#070a0f] divide-y divide-slate-800/60 overflow-hidden">
              {Object.entries(selectedEdge.props || {}).map(([key, val]) => (
                <div key={key} className="p-3 flex items-center justify-between">
                  <span className="text-slate-400">{key}</span>
                  <span className="text-slate-200 font-medium max-w-[200px] truncate">
                    {key === 'observed_at' ? formatTimestamp(val as number) : String(val)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          {onSimulateCut && (
            <div className="pt-2">
              <Button
                variant="destructive"
                className="w-full"
                onClick={() => {
                  onSimulateCut(srcName, selectedEdge.rel, dstName)
                  onClose()
                }}
              >
                <ShieldAlert className="w-4 h-4 mr-2" />
                Simulate Cut in Sandbox
              </Button>
              <p className="text-[10px] text-slate-500 mt-2 text-center">
                Action will be simulated only in an isolated sandbox graph.
              </p>
            </div>
          )}
        </div>
      </Drawer>
    )
  }

  if (!selectedNode) return null

  const nodeName = selectedNode.props?.name || `Node #${selectedNode.id}`
  const visual = getNodeVisualProps(selectedNode.labels, selectedNode.props)
  const isCritical = selectedNode.props?.criticality === 'critical' || nodeName === 'Critical Server'

  // Incoming and outgoing edges
  const incoming = allEdges
    .filter(e => e.dst === selectedNode.id)
    .map(e => ({
      edge: e,
      from: allNodes.find(n => n.id === e.src)?.props?.name || `Node ${e.src}`,
    }))

  const outgoing = allEdges
    .filter(e => e.src === selectedNode.id)
    .map(e => ({
      edge: e,
      to: allNodes.find(n => n.id === e.dst)?.props?.name || `Node ${e.dst}`,
    }))

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title={nodeName}
      subtitle={visual.category}
    >
      <div className="space-y-6 font-mono text-xs">
        {/* Entity Header Card */}
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 text-[11px]">Classification</span>
            <div className="flex gap-1">
              {selectedNode.labels.map(l => (
                <Badge key={l} variant={isCritical ? 'red' : 'emerald'}>
                  {l}
                </Badge>
              ))}
            </div>
          </div>
          {selectedNode.props?.criticality && (
            <div className="flex items-center justify-between">
              <span className="text-slate-400 text-[11px]">Criticality</span>
              <Badge variant={isCritical ? 'red' : 'amber'}>
                {String(selectedNode.props.criticality).toUpperCase()}
              </Badge>
            </div>
          )}
          {selectedNode.props?.untrusted === true && (
            <div className="p-2.5 rounded-lg bg-red-950/40 border border-red-500/40 text-red-300 text-[11px]">
              <div className="flex items-center gap-1.5 font-bold">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Untrusted Data / Prompt Injection</span>
              </div>
              <div className="font-sans text-[10px] mt-1 text-red-200">
                This record contains hostile injected text. Handled strictly as data; never executed as instructions.
              </div>
            </div>
          )}
        </div>

        {/* Quick action buttons */}
        <div className="grid grid-cols-2 gap-2">
          {onSetSource && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                onSetSource(nodeName)
                onClose()
              }}
            >
              <Activity className="w-3.5 h-3.5 mr-1 text-cyan-400" />
              Set as Source
            </Button>
          )}
          {onSetTarget && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                onSetTarget(nodeName)
                onClose()
              }}
            >
              <ShieldAlert className="w-3.5 h-3.5 mr-1 text-red-400" />
              Set as Target
            </Button>
          )}
        </div>

        {/* Node Properties */}
        <div>
          <div className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold mb-2">
            Properties & Attributes
          </div>
          <div className="rounded-xl border border-slate-800 bg-[#070a0f] divide-y divide-slate-800/60 overflow-hidden">
            {Object.entries(selectedNode.props || {}).map(([key, val]) => (
              <div key={key} className="p-3 flex items-start justify-between gap-4">
                <span className="text-slate-400 shrink-0">{key}</span>
                <span className="text-slate-200 font-medium text-right break-all">
                  {key === 'observed_at' ? formatTimestamp(val as number) : String(val)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Adjacent attack movement */}
        <div className="space-y-4">
          <div>
            <div className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold mb-2">
              Incoming Attack Hops ({incoming.length})
            </div>
            {incoming.length === 0 ? (
              <p className="text-slate-500 text-[11px]">No incoming connections (entry foothold)</p>
            ) : (
              <div className="space-y-1.5">
                {incoming.map(({ edge, from }) => (
                  <div
                    key={edge.rel + from}
                    className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800 flex items-center justify-between text-[11px]"
                  >
                    <span className="text-slate-300 font-semibold">{from}</span>
                    <div className="flex items-center gap-1.5 text-slate-500">
                      <span className="text-[10px] text-cyan-400 font-mono">-[{edge.rel}]-&gt;</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <div className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold mb-2">
              Outgoing Attack Hops ({outgoing.length})
            </div>
            {outgoing.length === 0 ? (
              <p className="text-slate-500 text-[11px]">No outgoing connections (target sink / dead end)</p>
            ) : (
              <div className="space-y-1.5">
                {outgoing.map(({ edge, to }) => (
                  <div
                    key={edge.rel + to}
                    className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800 flex items-center justify-between text-[11px]"
                  >
                    <span className="text-[10px] text-cyan-400 font-mono">-[{edge.rel}]-&gt;</span>
                    <span className="text-slate-300 font-semibold">{to}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </Drawer>
  )
}
