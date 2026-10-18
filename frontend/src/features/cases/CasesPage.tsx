import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { casesApi, outcomesApi } from '../../api/index.ts'
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card.tsx'
import { Badge } from '../../components/ui/Badge.tsx'
import { formatRelativeTime, formatTimestamp } from '../../lib/utils.ts'
import {
  FolderArchive,
  Search,
  Filter,
  Terminal,
  Clock,
  ArrowRight,
} from 'lucide-react'

export const CasesPage: React.FC = () => {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')

  // Fetch cases
  const { data: casesList, isLoading } = useQuery({
    queryKey: ['cases-list'],
    queryFn: () => casesApi.listCases(100),
  })

  // Fetch outcome memory summary
  const { data: outcomesSummary } = useQuery({
    queryKey: ['outcomes-summary'],
    queryFn: () => outcomesApi.getSummary(),
  })

  const filteredCases = (casesList || []).filter(c => {
    const matchesSearch = !search || c.id.toLowerCase().includes(search.toLowerCase()) || c.target.toLowerCase().includes(search.toLowerCase())
    const matchesStatus = statusFilter === 'ALL' || c.status === statusFilter
    return matchesSearch && matchesStatus
  })

  return (
    <div className="space-y-6 font-mono text-xs">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="amber" size="sm">Investigation Cases & Human-in-the-Loop</Badge>
            <span className="text-xs font-mono text-slate-400">SOC Approval Gate</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold font-mono text-slate-100 tracking-tight mt-1 flex items-center gap-2">
            <FolderArchive className="w-6 h-6 text-amber-400" />
            Investigation Case Management
          </h1>
          <p className="text-xs text-slate-400 font-sans mt-0.5">
            Audit case investigations, inspect multi-step agent reasoning, and authorize or reject containment actions.
          </p>
        </div>
      </div>

      {/* Outcome Memory KPI Banner */}
      {outcomesSummary && (
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="text-slate-400 text-[11px]">Total Decision Records</div>
            <div className="text-xl font-bold text-slate-100 mt-1">
              {outcomesSummary.total_records}
            </div>
          </Card>

          <Card className="p-4">
            <div className="text-slate-400 text-[11px]">Successful Containment</div>
            <div className="text-xl font-bold text-emerald-400 mt-1">
              {outcomesSummary.outcomes?.successful?.total ?? 0}
            </div>
          </Card>

          <Card className="p-4">
            <div className="text-slate-400 text-[11px]">Unsuccessful Actions</div>
            <div className="text-xl font-bold text-red-400 mt-1">
              {outcomesSummary.outcomes?.unsuccessful?.total ?? 0}
            </div>
          </Card>

          <Card className="p-4">
            <div className="text-slate-400 text-[11px]">Memory Governance</div>
            <div className="text-base font-bold text-cyan-400 mt-1">
              Advisory Only
            </div>
            <Badge variant="cyan" size="sm" className="mt-0.5">Zero Auto Actions</Badge>
          </Card>
        </div>
      )}

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative w-full sm:w-72">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-3 pointer-events-none" />
            <input
              type="text"
              placeholder="Search case ID or target asset..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-[#070a0f] border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Filter className="w-3.5 h-3.5 text-slate-500" />
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="bg-[#070a0f] border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
            >
              <option value="ALL">All Statuses</option>
              <option value="needs_analyst">Needs Analyst</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Cases List */}
      <Card>
        <CardHeader>
          <CardTitle>
            <FolderArchive className="w-4 h-4 text-amber-400" />
            Recorded Cases ({filteredCases.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2.5">
          {isLoading ? (
            <div className="p-8 text-center text-slate-500">Loading cases...</div>
          ) : filteredCases.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              No matching investigation cases found. Run an investigation to generate a case.
            </div>
          ) : (
            filteredCases.map(c => (
              <div
                key={c.id}
                onClick={() => navigate(`/cases/${c.id}`)}
                className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer transition-colors"
              >
                <div className="flex items-start sm:items-center gap-3">
                  <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-amber-400 shrink-0">
                    <Terminal className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-bold text-slate-100 text-sm flex items-center gap-2">
                      <span>Case #{c.id}</span>
                      <span className="text-slate-400 text-xs font-normal">
                        → Target: <span className="font-semibold text-slate-200">{c.target}</span>
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-500 mt-1 flex items-center gap-2">
                      <Clock className="w-3 h-3" />
                      <span>Created {formatRelativeTime(c.ts)} ({formatTimestamp(c.ts)})</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <Badge
                    variant={c.status === 'needs_analyst' ? 'amber' : c.status === 'approved' ? 'emerald' : 'red'}
                  >
                    {c.status.replace(/_/g, ' ').toUpperCase()}
                  </Badge>
                  <ArrowRight className="w-4 h-4 text-slate-500" />
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  )
}
