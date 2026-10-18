import React from 'react'
import type { PathRec } from '../../api/types.ts'
import { Badge } from '../ui/Badge.tsx'
import { Clock, ArrowRight } from 'lucide-react'

export interface PathTimelineChartProps {
  paths: PathRec[]
}

export const PathTimelineChart: React.FC<PathTimelineChartProps> = ({ paths }) => {
  if (!paths || paths.length === 0) {
    return (
      <div className="p-8 text-center text-xs text-slate-500 font-mono">
        No attack paths to render timeline for.
      </div>
    )
  }

  return (
    <div className="space-y-4 font-mono">
      {paths.map((p, pIdx) => (
        <div key={p.id || pIdx} className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center gap-2">
              <Badge variant="cyan" size="sm">{p.id || `Path ${pIdx + 1}`}</Badge>
              <span className="text-xs text-slate-300 font-semibold">
                {p.nodes[0]} → {p.nodes[p.nodes.length - 1]}
              </span>
            </div>
            <span className="text-[11px] text-slate-400">
              {p.nodes.length - 1} Hops
            </span>
          </div>

          {/* Horizontal progression chain */}
          <div className="flex items-center gap-2 overflow-x-auto py-2 no-scrollbar">
            {p.nodes.map((nodeName, nIdx) => {
              const rel = p.rels[nIdx]
              const time = p.times[nIdx]
              const evidence = p.evidence[nIdx]
              const confidence = p.confidence[nIdx]

              return (
                <React.Fragment key={nodeName + nIdx}>
                  <div className="shrink-0 flex flex-col items-center">
                    <div className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs font-semibold text-slate-200 shadow-sm">
                      {nodeName}
                    </div>
                  </div>

                  {rel && (
                    <div className="shrink-0 flex flex-col items-center px-1">
                      <div className="flex items-center gap-1 text-[10px] text-emerald-400 font-semibold">
                        <span>{rel}</span>
                        <ArrowRight className="w-3 h-3" />
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5 text-[9px] text-slate-500">
                        {time !== null && time !== undefined && (
                          <span className="flex items-center gap-0.5">
                            <Clock className="w-2.5 h-2.5" />
                            T+{time}s
                          </span>
                        )}
                        {evidence && (
                          <span className="px-1 rounded bg-cyan-950/60 text-cyan-300 border border-cyan-800/40">
                            {evidence}
                          </span>
                        )}
                        {confidence !== null && confidence !== undefined && (
                          <span className="text-slate-400 font-mono">
                            {Math.round(confidence * 100)}%
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </React.Fragment>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
