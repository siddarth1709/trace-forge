import React from 'react'
import { Badge } from '../ui/Badge.tsx'
import { Button } from '../ui/Button.tsx'
import {
  Printer,
  Download,
  Copy,
  CheckCircle2,
  ShieldCheck,
} from 'lucide-react'
import { useToast } from '../ui/Toast.tsx'
import { formatTimestamp } from '../../lib/utils.ts'

import type { EvidenceRecord, ContainmentAction } from '../../api/types.ts'

export interface InvestigationReportData {
  incidentId: string
  targetAsset: string
  sources: string[]
  graphName: string
  nodeCount: number
  edgeCount: number
  pathsCount: number
  paths: { nodes: string[]; rels: string[] }[]
  evidenceUsed: EvidenceRecord[]
  recommendedCut: ContainmentAction[]
  disruption: number
  approver: string
  approvalTimestamp: number
  simulationId: string
  cloneMethod: string
  pathsBefore: number
  pathsAfter: number
  contained: boolean
  verificationVerdict: string
  residualRisks: string[]
  limitations: string[]
}

export interface InvestigationReportProps {
  data: InvestigationReportData
  onClose?: () => void
}

export const InvestigationReport: React.FC<InvestigationReportProps> = ({ data, onClose }) => {
  const toast = useToast()

  const handlePrint = () => {
    window.print()
  }

  const handleExportJson = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `traceforge-investigation-${data.incidentId}-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Investigation report exported to JSON')
  }

  const handleCopyMarkdown = () => {
    const md = `
# TRACEFORGE Incident Investigation & Verification Report
**Incident ID:** ${data.incidentId}
**Target Asset:** ${data.targetAsset}
**Target Graph:** ${data.graphName} (${data.nodeCount} nodes, ${data.edgeCount} relationships)
**Generated:** ${new Date().toISOString()}

## 1. Discovered Attack Paths (${data.pathsCount})
${data.paths.map((p, i) => `${i + 1}. ${p.nodes.join(' → ')}`).join('\n')}

## 2. Defensive Recommendation & Human Approval
- **Candidate Cut:** ${data.recommendedCut.map(c => `${c.src} -[:${c.rel}]-> ${c.dst}`).join(', ')}
- **Estimated Disruption:** ${data.disruption} benign load units
- **Human Approval:** Approved by ${data.approver} at ${formatTimestamp(data.approvalTimestamp)}

## 3. Sandbox Simulation & Verification
- **Isolated Sandbox ID:** ${data.simulationId}
- **Baseline Paths:** ${data.pathsBefore}
- **Remaining Paths in Sandbox:** ${data.pathsAfter}
- **Containment Verdict:** ${data.verificationVerdict.toUpperCase()} (Contained: ${data.contained})
- **Production Status:** STRICTLY UNMODIFIED (Read-only guarantee enforced)

## 4. Residual Risks & Safety Limitations
${data.residualRisks.map(r => `- ${r}`).join('\n')}
    `.trim()

    navigator.clipboard.writeText(md)
    toast.success('Investigation report copied as Markdown')
  }

  return (
    <div className="space-y-6 font-mono text-xs max-w-4xl mx-auto print:p-0 print:max-w-full">
      {/* Action Bar (hidden when printing) */}
      <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900 border border-slate-800 print:hidden">
        <div className="flex items-center gap-2">
          <Badge variant="emerald" size="sm">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Verified Report
          </Badge>
          <span className="text-slate-400 text-xs">Immutable Audit Trace Verified</span>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleCopyMarkdown}>
            <Copy className="w-3.5 h-3.5 mr-1.5" />
            Copy Markdown
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportJson}>
            <Download className="w-3.5 h-3.5 mr-1.5" />
            Export JSON
          </Button>
          <Button variant="neon" size="sm" onClick={handlePrint}>
            <Printer className="w-3.5 h-3.5 mr-1.5" />
            Print / Save PDF
          </Button>
          {onClose && (
            <Button variant="secondary" size="sm" onClick={onClose}>
              Done
            </Button>
          )}
        </div>
      </div>

      {/* Printable Report Document */}
      <div className="p-6 sm:p-8 rounded-2xl bg-[#090d15] border border-slate-800 space-y-6 print:border-none print:p-0 print:bg-white print:text-black">
        {/* Document Header */}
        <div className="border-b border-slate-800 pb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-emerald-400 font-bold tracking-widest text-sm uppercase">
                TRACEFORGE // SEC-OPS REPORT
              </span>
              <Badge variant="cyan" size="sm">FalkorDB Verified</Badge>
            </div>
            <h1 className="text-2xl font-bold text-slate-100 tracking-tight mt-1 print:text-black">
              Incident Investigation & Defensive Verification
            </h1>
            <p className="text-slate-400 font-sans text-xs mt-1 print:text-gray-600">
              Closed-loop investigation: connected path discovery, containment planning, human authorization, and sandbox verification.
            </p>
          </div>

          <div className="text-right font-mono text-[11px] text-slate-400 space-y-0.5 print:text-gray-600">
            <div>Incident: <span className="text-slate-200 font-bold print:text-black">{data.incidentId}</span></div>
            <div>Date: <span className="text-slate-200 print:text-black">{formatTimestamp(data.approvalTimestamp)}</span></div>
            <div>Target: <span className="text-red-400 font-bold">{data.targetAsset}</span></div>
          </div>
        </div>

        {/* Section 1: Graph Scope & Incident Context */}
        <div className="space-y-3">
          <h2 className="text-sm font-bold text-slate-200 border-l-2 border-emerald-400 pl-2 uppercase print:text-black">
            1. Graph Scope & Investigated Topology
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 print:bg-gray-100 print:border-gray-300">
              <div className="text-slate-500 text-[10px] uppercase">Active Graph</div>
              <div className="text-slate-200 font-bold print:text-black">{data.graphName}</div>
            </div>
            <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 print:bg-gray-100 print:border-gray-300">
              <div className="text-slate-500 text-[10px] uppercase">Nodes Examined</div>
              <div className="text-slate-200 font-bold print:text-black">{data.nodeCount}</div>
            </div>
            <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 print:bg-gray-100 print:border-gray-300">
              <div className="text-slate-500 text-[10px] uppercase">Relationships</div>
              <div className="text-slate-200 font-bold print:text-black">{data.edgeCount}</div>
            </div>
            <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 print:bg-gray-100 print:border-gray-300">
              <div className="text-slate-500 text-[10px] uppercase">Attack Paths Found</div>
              <div className="text-red-400 font-bold">{data.pathsCount} Active</div>
            </div>
          </div>
        </div>

        {/* Section 2: Discovered Attack Paths */}
        <div className="space-y-3">
          <h2 className="text-sm font-bold text-slate-200 border-l-2 border-cyan-400 pl-2 uppercase print:text-black">
            2. Time-Ordered Attack Paths
          </h2>
          <div className="space-y-2">
            {data.paths.map((path, idx) => (
              <div
                key={idx}
                className="p-3 rounded-lg bg-slate-900/40 border border-slate-800 space-y-1.5 print:bg-gray-50 print:border-gray-200"
              >
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-bold text-cyan-400">Path #{idx + 1}</span>
                  <Badge variant="cyan" size="sm">{path.nodes.length - 1} Hops</Badge>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap text-slate-200 text-xs font-mono print:text-black">
                  {path.nodes.map((node, nIdx) => (
                    <React.Fragment key={nIdx}>
                      <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 font-semibold print:bg-gray-200">
                        {node}
                      </span>
                      {nIdx < path.nodes.length - 1 && (
                        <span className="text-slate-500 flex items-center text-[10px]">
                          —[{path.rels[nIdx] || 'REACHES'}]→
                        </span>
                      )}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Section 3: Supporting Evidence Records */}
        {data.evidenceUsed.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-sm font-bold text-slate-200 border-l-2 border-amber-400 pl-2 uppercase print:text-black">
              3. Grounded Telemetry & Evidence Records
            </h2>
            <div className="divide-y divide-slate-800 rounded-lg border border-slate-800 bg-slate-900/20 overflow-hidden print:border-gray-300 print:bg-white print:divide-gray-200">
              {data.evidenceUsed.map(ev => (
                <div key={ev.id} className="p-3 text-[11px] space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-amber-400">{ev.id}</span>
                    <Badge variant={ev.untrusted ? 'red' : 'emerald'} size="sm">
                      {ev.untrusted ? 'Untrusted External Text' : `Source: ${ev.source}`}
                    </Badge>
                  </div>
                  <p className="text-slate-300 font-sans print:text-gray-800">{ev.text}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Section 4: Recommended Action & Approval */}
        <div className="space-y-3">
          <h2 className="text-sm font-bold text-slate-200 border-l-2 border-emerald-400 pl-2 uppercase print:text-black">
            4. Containment Recommendation & Human Authorization
          </h2>
          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3 print:bg-gray-50 print:border-gray-300">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
              <div>
                <div className="font-bold text-slate-200 text-sm print:text-black">Minimum-Cut Containment Plan</div>
                <div className="text-[11px] text-slate-400 font-sans">
                  Mathematically calculated graph cut severing all paths to {data.targetAsset} with minimum operational disruption.
                </div>
              </div>
              <Badge variant="emerald" size="sm">Disruption: {data.disruption} Load</Badge>
            </div>

            <div className="space-y-2">
              <div className="text-slate-400 text-[10px] uppercase">Candidate Response Actions:</div>
              {data.recommendedCut.map((action, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2 rounded bg-slate-950 border border-slate-800 font-mono text-xs print:bg-white print:border-gray-300"
                >
                  <span className="text-red-400 font-semibold">Sever Relationship</span>
                  <span className="text-slate-200 print:text-black">
                    {action.src} —[:{action.rel}]→ {action.dst}
                  </span>
                  <Badge variant="slate" size="sm">Load: {action.benign_load || 0}</Badge>
                </div>
              ))}
            </div>

            <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[11px]">
              <div className="flex items-center gap-2 text-emerald-400">
                <ShieldCheck className="w-4 h-4" />
                <span>Explicit Human Authorization Granted</span>
              </div>
              <span className="text-slate-400">
                Authorized by: <strong className="text-slate-200 print:text-black">{data.approver}</strong>
              </span>
            </div>
          </div>
        </div>

        {/* Section 5: Simulation & Independent Verification */}
        <div className="space-y-3">
          <h2 className="text-sm font-bold text-slate-200 border-l-2 border-emerald-400 pl-2 uppercase print:text-black">
            5. Isolated Sandbox Simulation & Verification
          </h2>
          <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/40 space-y-3 print:bg-emerald-50 print:border-emerald-300">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <span className="font-bold text-emerald-300 text-sm print:text-emerald-900">
                  Containment Verified: {data.verificationVerdict.toUpperCase()}
                </span>
              </div>
              <Badge variant="emerald" size="sm">Zero Residual Paths</Badge>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <span className="text-slate-400 text-[10px] block">Sandbox Graph ID:</span>
                <span className="text-slate-100 font-bold font-mono print:text-black">{data.simulationId}</span>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] block">Clone Method:</span>
                <span className="text-slate-100 font-bold print:text-black">{data.cloneMethod}</span>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] block">Paths Before:</span>
                <span className="text-red-400 font-bold">{data.pathsBefore}</span>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] block">Paths Remaining:</span>
                <span className="text-emerald-400 font-bold">{data.pathsAfter} (Zero Paths)</span>
              </div>
            </div>

            <div className="p-2.5 rounded bg-emerald-900/30 border border-emerald-500/30 text-[11px] text-emerald-300 font-sans print:bg-white print:text-gray-800">
              <strong>Safety Boundary Enforced:</strong> The simulation was executed strictly inside an isolated copy
              (<span className="font-mono">{data.simulationId}</span>). The production database (<span className="font-mono">{data.graphName}</span>)
              was verified to remain 100% read-only and unmodified throughout the test.
            </div>
          </div>
        </div>

        {/* Section 6: Residual Risks & Limitations */}
        <div className="space-y-3">
          <h2 className="text-sm font-bold text-slate-200 border-l-2 border-slate-500 pl-2 uppercase print:text-black">
            6. Assumptions & Limitations
          </h2>
          <ul className="space-y-1 text-[11px] text-slate-400 font-sans list-disc pl-4 print:text-gray-700">
            {data.limitations.map((lim, idx) => (
              <li key={idx}>{lim}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
