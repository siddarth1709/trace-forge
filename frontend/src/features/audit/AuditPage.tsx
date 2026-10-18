import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { auditApi } from '../../api/index.ts'
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card.tsx'
import { Button } from '../../components/ui/Button.tsx'
import { Badge } from '../../components/ui/Badge.tsx'
import { formatTimestamp } from '../../lib/utils.ts'
import {
  History,
  Search,
  Filter,
  Download,
  RotateCw,
  ShieldCheck,
  ChevronDown,
  ChevronRight,
} from 'lucide-react'

export const AuditPage: React.FC = () => {
  const [search, setSearch] = useState('')
  const [toolFilter, setToolFilter] = useState('ALL')
  const [expandedIndices, setExpandedIndices] = useState<Set<number>>(new Set())

  // Fetch audit log
  const { data: auditLogs, isLoading, refetch } = useQuery({
    queryKey: ['audit-full'],
    queryFn: () => auditApi.getAuditLog(200),
  })

  const toggleExpand = (idx: number) => {
    setExpandedIndices(prev => {
      const next = new Set(prev)
      if (next.has(idx)) next.delete(idx)
      else next.add(idx)
      return next
    })
  }

  const logs = auditLogs || []

  const uniqueTools = Array.from(new Set(logs.map(l => l.tool)))

  const filteredLogs = logs.filter(l => {
    const matchesTool = toolFilter === 'ALL' || l.tool === toolFilter
    const rawArgs = JSON.stringify(l.args || {}).toLowerCase()
    const rawSummary = JSON.stringify(l.summary || {}).toLowerCase()
    const q = search.toLowerCase()
    const matchesSearch = !search || l.tool.toLowerCase().includes(q) || rawArgs.includes(q) || rawSummary.includes(q)
    return matchesTool && matchesSearch
  })

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(filteredLogs, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `traceforge-audit-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6 font-mono text-xs">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="emerald" size="sm">Immutable Security Audit Trail</Badge>
            <span className="text-xs font-mono text-slate-400">SQLite audit.db</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold font-mono text-slate-100 tracking-tight mt-1 flex items-center gap-2">
            <History className="w-6 h-6 text-slate-400" />
            Security Operations Audit Trail
          </h1>
          <p className="text-xs text-slate-400 font-sans mt-0.5">
            Tamper-evident log of all graph queries, containment simulations, verification checks, and response actions.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()} title="Refresh audit events">
            <RotateCw className="w-4 h-4 mr-1.5" />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="w-4 h-4 mr-1.5" />
            Export JSON
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative w-full sm:w-72">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-3 pointer-events-none" />
            <input
              type="text"
              placeholder="Search tool name or payload..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-[#070a0f] border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Filter className="w-3.5 h-3.5 text-slate-500" />
            <select
              value={toolFilter}
              onChange={e => setToolFilter(e.target.value)}
              className="bg-[#070a0f] border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 w-full sm:w-auto"
            >
              <option value="ALL">All Tools</option>
              {uniqueTools.map(t => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Audit Log Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            Event Records ({filteredLogs.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {isLoading ? (
            <div className="p-8 text-center text-slate-500">Loading audit records...</div>
          ) : filteredLogs.length === 0 ? (
            <div className="p-8 text-center text-slate-500">No matching audit events logged.</div>
          ) : (
            filteredLogs.map((log, idx) => {
              const isExpanded = expandedIndices.has(idx)
              return (
                <div
                  key={idx}
                  className="rounded-xl bg-slate-900/60 border border-slate-800/80 overflow-hidden"
                >
                  <div
                    onClick={() => toggleExpand(idx)}
                    className="p-3.5 flex items-center justify-between gap-4 cursor-pointer hover:bg-slate-800/30 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <button className="text-slate-400">
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <ChevronRight className="w-4 h-4" />
                        )}
                      </button>
                      <Badge variant="emerald" size="sm">{log.tool}</Badge>
                      <span className="text-slate-300 font-semibold">{formatTimestamp(log.ts)}</span>
                    </div>

                    <span className="text-[10px] text-slate-500">
                      TS: {log.ts.toFixed(3)}
                    </span>
                  </div>

                  {isExpanded && (
                    <div className="p-4 bg-black/60 border-t border-slate-800/80 space-y-3">
                      <div>
                        <div className="text-[10px] uppercase text-slate-500 font-bold mb-1">Arguments:</div>
                        <pre className="p-2.5 rounded bg-slate-950 text-slate-300 overflow-x-auto text-[11px]">
                          {JSON.stringify(log.args, null, 2)}
                        </pre>
                      </div>

                      <div>
                        <div className="text-[10px] uppercase text-slate-500 font-bold mb-1">Execution Summary:</div>
                        <pre className="p-2.5 rounded bg-slate-950 text-slate-300 overflow-x-auto text-[11px]">
                          {JSON.stringify(log.summary, null, 2)}
                        </pre>
                      </div>
                    </div>
                  )}
                </div>
              )
            })
          )}
        </CardContent>
      </Card>
    </div>
  )
}
