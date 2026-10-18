import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { intelApi } from '../../api/index.ts'
import { Card, CardContent } from '../../components/ui/Card.tsx'
import { Badge } from '../../components/ui/Badge.tsx'
import { formatTimestamp } from '../../lib/utils.ts'
import {
  FileCheck,
  AlertTriangle,
  Search,
  Filter,
  Lock,
} from 'lucide-react'

export const EvidenceProvenancePage: React.FC = () => {
  const [search, setSearch] = useState('')
  const [sourceFilter, setSourceFilter] = useState('ALL')

  // Fetch all known benchmark evidence records
  const evidenceIds = ['EV-1', 'EV-2', 'EV-3', 'EV-4', 'EV-5', 'EV-6', 'EV-7', 'EV-INJ']

  const { data: evidenceData, isLoading } = useQuery({
    queryKey: ['evidence-records', evidenceIds],
    queryFn: () => intelApi.getEvidence(evidenceIds, 'traceforge'),
  })

  const records = evidenceData?.evidence || []

  const filteredRecords = records.filter(r => {
    const text = (r.text || r.summary || '').toLowerCase()
    const id = (r.name || r.id || '').toLowerCase()
    const matchesSearch = !search || text.includes(search.toLowerCase()) || id.includes(search.toLowerCase())
    const matchesSource = sourceFilter === 'ALL' || r.evidence_source === sourceFilter
    return matchesSearch && matchesSource
  })

  const sourcesList = ['ALL', 'edr', 'auth-log', 'file-audit', 'net-flow', 'ticket-comment']

  return (
    <div className="space-y-6 font-mono text-xs">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="cyan" size="sm">Evidence Provenance Audit</Badge>
            <Badge variant="slate" size="sm">7 Attack Edges + 1 Hostile Injection</Badge>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold font-mono text-slate-100 tracking-tight mt-1 flex items-center gap-2">
            <FileCheck className="w-6 h-6 text-cyan-400" />
            Evidence & Provenance Vault
          </h1>
          <p className="text-xs text-slate-400 font-sans mt-0.5">
            Inspect raw forensic telemetry records. Every attack hop is bound to verifiable telemetry evidence.
          </p>
        </div>
      </div>

      {/* Safety Notice: Data Only, Never Instructions */}
      <div className="p-4 rounded-xl bg-cyan-950/20 border border-cyan-500/30 flex items-start gap-3 text-cyan-300">
        <Lock className="w-4 h-4 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <div className="font-bold text-[11px] uppercase tracking-wider">
            Handling Rule: DATA_ONLY_NEVER_INSTRUCTIONS
          </div>
          <p className="text-slate-300 font-sans text-xs">
            Forensic logs may contain adversary-controlled strings or prompt injections (e.g. ticket comments).
            TRACEFORGE parses evidence strictly as untrusted data and will never execute evidence text as LLM instructions.
          </p>
        </div>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative w-full sm:w-72">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-3 pointer-events-none" />
            <input
              type="text"
              placeholder="Search evidence text or ID..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-[#070a0f] border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Filter className="w-3.5 h-3.5 text-slate-500" />
            <select
              value={sourceFilter}
              onChange={e => setSourceFilter(e.target.value)}
              className="bg-[#070a0f] border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 w-full sm:w-auto"
            >
              {sourcesList.map(s => (
                <option key={s} value={s}>
                  Source: {s}
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Evidence Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {isLoading ? (
          <div className="col-span-2 p-12 text-center text-slate-500">
            Loading evidence records from graph...
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="col-span-2 p-12 text-center text-slate-500">
            No matching evidence records found.
          </div>
        ) : (
          filteredRecords.map(rec => {
            const isUntrusted = rec.untrusted === true || rec.trust_status === 'untrusted'
            const recId = rec.name || rec.id || 'EV'

            return (
              <Card
                key={recId}
                glow={isUntrusted ? 'red' : 'cyan'}
                className="p-5 space-y-4"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant={isUntrusted ? 'red' : 'cyan'}>{recId}</Badge>
                    <span className="text-[11px] text-slate-400">
                      Source: <span className="text-slate-200 font-semibold">{rec.evidence_source || 'edr'}</span>
                    </span>
                  </div>
                  <Badge variant={isUntrusted ? 'red' : 'emerald'} size="sm">
                    {isUntrusted ? 'HOSTILE INJECTION' : 'VERIFIED DATA'}
                  </Badge>
                </div>

                <div className="p-3.5 rounded-lg bg-black/40 border border-slate-800/80 text-xs text-slate-200 font-sans leading-relaxed">
                  &ldquo;{rec.text || rec.summary}&rdquo;
                </div>

                {isUntrusted && (
                  <div className="p-2.5 rounded bg-red-950/40 border border-red-500/30 text-red-300 text-[11px] flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>Hostile text contained. Instructions neutralized by safety parser.</span>
                  </div>
                )}

                <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-500">
                  <span>Observed: {rec.observed_at ? formatTimestamp(rec.observed_at) : 'N/A'}</span>
                  <span>Handling: {rec.handling || 'data_only'}</span>
                </div>
              </Card>
            )
          })
        )}
      </div>
    </div>
  )
}
