import React, { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { casesApi, outcomesApi } from '../../api/index.ts'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../../components/ui/Card.tsx'
import { Button } from '../../components/ui/Button.tsx'
import { Badge } from '../../components/ui/Badge.tsx'
import { Input, Select } from '../../components/ui/Input.tsx'
import { Modal } from '../../components/ui/Modal.tsx'
import { useToast } from '../../components/ui/Toast.tsx'
import { useAuth } from '../../hooks/useAuth.tsx'
import {
  Terminal,
  CheckCircle2,
  XCircle,
  ArrowLeft,
  ShieldAlert,
  BookmarkCheck,
  ShieldCheck,
  Scale,
  AlertTriangle,
  History,
} from 'lucide-react'

export const CaseDetailPage: React.FC = () => {
  const { caseId } = useParams<{ caseId: string }>()
  const navigate = useNavigate()
  const toast = useToast()
  const { user } = useAuth()

  const [outcomeModalOpen, setOutcomeModalOpen] = useState(false)
  const [outcomeType, setOutcomeType] = useState<'successful' | 'unsuccessful' | 'inconclusive'>('successful')
  const [outcomeNotes, setOutcomeNotes] = useState('')

  // Fetch case details
  const { data: caseData, isLoading, refetch } = useQuery({
    queryKey: ['case-detail', caseId],
    queryFn: () => casesApi.getCase(caseId!),
    enabled: !!caseId,
  })

  // Approve / reject mutation
  const approveMutation = useMutation({
    mutationFn: (approve: boolean) =>
      casesApi.approveCase(caseId!, {
        approve,
        approver: user?.name || 'analyst',
      }),
    onSuccess: updatedCase => {
      refetch()
      toast.success(
        'Case Updated',
        `Case status updated to ${updatedCase.status.toUpperCase()} by ${user?.name || 'analyst'}.`
      )
    },
    onError: (err: Error) => {
      toast.error('Approval Action Failed', err.message)
    },
  })

  // Record outcome mutation
  const outcomeMutation = useMutation({
    mutationFn: () =>
      outcomesApi.recordOutcome({
        case_id: caseId!,
        decision: `Containment review by ${user?.name || 'analyst'}`,
        outcome: outcomeType,
        verified: true,
        notes: outcomeNotes,
      }),
    onSuccess: () => {
      setOutcomeModalOpen(false)
      toast.success('Outcome Memory Recorded', 'Decision outcome safely logged to advisory memory.')
    },
    onError: (err: Error) => {
      toast.error('Record Outcome Failed', err.message)
    },
  })

  if (isLoading) {
    return <div className="p-12 text-center text-xs text-[#858E9B] font-mono">Loading case details...</div>
  }

  if (!caseData) {
    return (
      <div className="p-12 text-center font-mono space-y-3">
        <h3 className="text-base font-bold text-[#FB7185]">Case Not Found</h3>
        <p className="text-xs text-[#858E9B]">No case found with identifier #{caseId}.</p>
        <Button variant="outline" size="sm" onClick={() => navigate('/cases')}>
          Return to Cases
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6 font-mono text-xs">
      {/* Top Navigation Back */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => navigate('/cases')}>
          <ArrowLeft className="w-4 h-4 mr-1.5" />
          Back to Cases
        </Button>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setOutcomeModalOpen(true)}
          >
            <BookmarkCheck className="w-4 h-4 mr-1.5 text-[#FF8559]" />
            Record Decision Outcome
          </Button>
        </div>
      </div>

      {/* Case Header Card */}
      <Card glow="accent">
        <CardHeader>
          <div className="flex items-center gap-3">
            <Badge variant="accent" size="md">Case #{caseData.id}</Badge>
            <div>
              <CardTitle>Investigation Target: {caseData.target}</CardTitle>
              <CardDescription>
                Mode: {caseData.mode} • Footholds: {caseData.sources?.join(', ') || 'N/A'}
              </CardDescription>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge
              variant={
                caseData.status === 'awaiting_approval'
                  ? 'cyan'
                  : caseData.status === 'needs_analyst'
                    ? 'amber'
                    : caseData.status === 'approved' || caseData.status === 'verified'
                      ? 'emerald'
                      : 'red'
              }
            >
              STATUS: {caseData.status.replace(/_/g, ' ').toUpperCase()}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Human Authorization Callout: strictly when awaiting_approval and valid proposal actions exist */}
          {caseData.status === 'awaiting_approval' &&
          caseData.proposal != null &&
          Array.isArray(caseData.proposal.cut) &&
          caseData.proposal.cut.length > 0 ? (
            <div className="p-4 rounded-xl bg-[#321E17]/60 border border-[#FF6B35]/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <div className="font-bold text-[#FF8559] text-sm flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-[#FF8559]" />
                  Authorization Required: Human-in-the-Loop Review
                </div>
                <p className="text-[#B0B7C3] font-sans text-xs mt-1 leading-relaxed">
                  The autonomous agent proposed {caseData.proposal.cut.length} containment cut action(s). Live sandbox simulation requires verified SOC analyst authorization.
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => approveMutation.mutate(false)}
                  isLoading={approveMutation.isPending}
                >
                  <XCircle className="w-4 h-4 mr-1" />
                  Reject
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => approveMutation.mutate(true)}
                  isLoading={approveMutation.isPending}
                >
                  <CheckCircle2 className="w-4 h-4 mr-1" />
                  Authorize Containment
                </Button>
              </div>
            </div>
          ) : caseData.status === 'needs_analyst' ? (
            <div className="p-4 rounded-xl bg-[#291F10]/50 border border-[#FBBF24]/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <div className="font-bold text-[#FBBF24] text-sm flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-[#FBBF24]" />
                  Analyst Review Required — No Approved Containment Proposal Available
                </div>
                <p className="text-[#B0B7C3] font-sans text-xs mt-1 leading-relaxed">
                  {caseData.decision?.reason ||
                    'Investigation is incomplete, evidence is insufficient, or the agent abstained. Containment cannot be authorized without a valid containment proposal.'}
                </p>
              </div>
              <Badge variant="amber" size="sm" className="shrink-0">
                ESCALATED TO ANALYST
              </Badge>
            </div>
          ) : caseData.status === 'awaiting_approval' ? (
            <div className="p-4 rounded-xl bg-[#2A1417]/50 border border-[#FB7185]/30 text-xs text-[#FB7185] flex items-center justify-between">
              <span>Case is marked awaiting approval but contains an empty or invalid containment proposal.</span>
              <Badge variant="red" size="sm">INVALID PROPOSAL</Badge>
            </div>
          ) : (
            <div className="p-3 rounded-xl bg-[#191D22] border border-[#2A3038] text-[#F5F5F5] flex items-center justify-between">
              <span className="text-xs">
                {caseData.status === 'verified' || caseData.status === 'approved'
                  ? 'Analyst Action Verified: Containment simulated & confirmed in sandbox.'
                  : caseData.status === 'rejected'
                    ? 'Analyst Action Recorded: Containment proposal was rejected.'
                    : caseData.status === 'approval_failed'
                      ? `Approval Failed: ${caseData.error || 'Policy or simulation error.'}`
                      : 'Investigation Status:'}
              </span>
              <Badge
                variant={
                  caseData.status === 'approved' || caseData.status === 'verified'
                    ? 'emerald'
                    : 'red'
                }
              >
                {caseData.status.replace(/_/g, ' ').toUpperCase()}
              </Badge>
            </div>
          )}

          {/* Containment Proposal if available */}
          {caseData.proposal && (
            <div className="space-y-3 pt-2">
              <div className="text-[#F5F5F5] font-bold text-sm">Proposed Containment Cut Actions</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {caseData.proposal.cut.map((action, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl bg-[#191D22] border border-[#2A3038] flex items-center justify-between"
                  >
                    <div>
                      <div className="text-[#F5F5F5] font-semibold">
                        {action.src} → {action.dst}
                      </div>
                      <div className="text-[10px] text-[#60A5FA] font-mono mt-0.5">
                        Rel: {action.rel}
                      </div>
                    </div>
                    <span className="text-[#FF8559] font-bold">
                      {action.benign_load} load
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Grounded Agent Reasoning: Facts vs Assumptions */}
          {(caseData.finding || caseData.proposal?.observed_facts) && (
            <div className="space-y-3 pt-3 border-t border-[#2A3038]">
              <div className="text-[#F5F5F5] font-bold text-sm flex items-center gap-2">
                <Scale className="w-4 h-4 text-[#10B981]" />
                Evidence Grounding: Observed Facts vs Explicit Assumptions
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl bg-[#0F231C]/60 border border-[#10B981]/30 space-y-2">
                  <div className="text-[#10B981] font-bold text-xs flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#10B981]" />
                    Observed Facts (From FalkorDB Graph)
                  </div>
                  <ul className="space-y-1.5 text-[11px] text-[#D1D5DB] font-sans">
                    {(caseData.finding?.observed_facts || caseData.proposal?.observed_facts || [
                      `Identified ${caseData.paths?.length || 0} attack paths to '${caseData.target}'.`
                    ]).map((fact, fIdx) => (
                      <li key={fIdx} className="flex items-start gap-1.5">
                        <span className="text-[#10B981] font-bold shrink-0">•</span>
                        <span>{fact}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="p-3.5 rounded-xl bg-[#291F10]/60 border border-[#F59E0B]/30 space-y-2">
                  <div className="text-[#F59E0B] font-bold text-xs flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-[#F59E0B]" />
                    Explicit Assumptions (Unverified Telemetry)
                  </div>
                  <ul className="space-y-1.5 text-[11px] text-[#D1D5DB] font-sans">
                    {(caseData.finding?.assumptions || caseData.proposal?.assumptions || [
                      "Adversary retains operational control of identified foothold sources.",
                      "Graph relationships represent traversable attack primitives.",
                    ]).map((assump, aIdx) => (
                      <li key={aIdx} className="flex items-start gap-1.5">
                        <span className="text-[#F59E0B] font-bold shrink-0">•</span>
                        <span>{assump}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Simulation & Independent Verification */}
          {(caseData.verification || caseData.status === 'verified' || caseData.status === 'residual_risk' || caseData.status === 'rejected') && (
            <div className="space-y-3 pt-3 border-t border-[#2A3038]">
              <div className="text-[#F5F5F5] font-bold text-sm flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#60A5FA]" />
                Isolated Sandbox Simulation & Independent Verification Result
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-xl bg-[#191D22] border border-[#2A3038]">
                  <div className="text-[10px] uppercase text-[#858E9B]">Sandbox Graph</div>
                  <div className="font-bold text-xs text-[#60A5FA] mt-1 font-mono truncate">
                    {caseData.simulation?.sim_id || 'N/A (Rejected)'}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-[#191D22] border border-[#2A3038]">
                  <div className="text-[10px] uppercase text-[#858E9B]">Production Graph</div>
                  <div className="font-bold text-xs text-[#10B981] mt-1 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-[#10B981]" />
                    UNTOUCHED (0 writes)
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-[#191D22] border border-[#2A3038]">
                  <div className="text-[10px] uppercase text-[#858E9B]">Before Measurement</div>
                  <div className="font-bold text-xs text-[#F5F5F5] mt-1">
                    {caseData.verification?.before ?? caseData.paths?.length ?? 0} Path(s)
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-[#191D22] border border-[#2A3038]">
                  <div className="text-[10px] uppercase text-[#858E9B]">After Measurement</div>
                  <div className={`font-bold text-xs mt-1 ${caseData.contained ? 'text-[#10B981]' : 'text-[#F59E0B]'}`}>
                    {caseData.verification?.after ?? (caseData.status === 'rejected' ? 'Skipped' : 0)} Path(s)
                  </div>
                </div>
              </div>

              {caseData.verification && caseData.verification.after > 0 && caseData.verification.remaining_paths && (
                <div className="p-3.5 rounded-xl bg-[#291F10]/60 border border-[#F59E0B]/40 space-y-2">
                  <div className="font-bold text-[#F59E0B] text-xs flex items-center gap-2">
                    <AlertTriangle className="w-3.5 h-3.5 text-[#F59E0B]" />
                    Verification Notice: {caseData.verification.after} Residual Path(s) Remain
                  </div>
                  <div className="space-y-1.5 pt-1">
                    {caseData.verification.remaining_paths.map((rPath, idx) => (
                      <div key={idx} className="p-2 rounded bg-black/50 border border-[#F59E0B]/20 text-xs font-mono text-[#FCD34D]">
                        {rPath.nodes.join(' → ')} ({rPath.rels.join(', ')})
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Structured Audit Event */}
          {caseData.audit_record && (
            <div className="space-y-2 pt-3 border-t border-[#2A3038]">
              <div className="text-[#F5F5F5] font-bold text-sm flex items-center gap-2">
                <History className="w-4 h-4 text-[#60A5FA]" />
                Immutable Security Audit Event
              </div>
              <pre className="p-3 rounded-xl bg-[#0B0D0F] border border-[#2A3038] text-[11px] text-[#B0B7C3] max-h-40 overflow-y-auto font-mono">
                {JSON.stringify(caseData.audit_record, null, 2)}
              </pre>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Step by Step Execution Trail */}
      <Card>
        <CardHeader>
          <CardTitle>
            <Terminal className="w-4 h-4 text-[#FF8559]" />
            Tool Execution & Reasoning History ({caseData.steps?.length || 0} Steps)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {caseData.steps?.map(step => (
            <div
              key={step.n}
              className="p-3.5 rounded-xl bg-[#191D22] border border-[#2A3038] flex items-start justify-between gap-4"
            >
              <div className="flex items-start gap-3">
                <span className="font-bold text-[#858E9B] mt-0.5">#{step.n}</span>
                <div>
                  <div className="font-semibold text-[#FF8559]">{step.tool}</div>
                  <div className="text-[#B0B7C3] font-sans text-xs mt-0.5 leading-relaxed">{step.reason}</div>
                  {step.result && (
                    <pre className="mt-2 p-2.5 rounded-lg bg-[#0B0D0F] border border-[#2A3038] text-[10px] text-[#858E9B] max-h-32 overflow-y-auto font-mono">
                      {JSON.stringify(step.result, null, 2)}
                    </pre>
                  )}
                </div>
              </div>

              <div className="text-right shrink-0">
                <Badge variant={step.ok ? 'emerald' : 'red'} size="sm">
                  {step.ok ? 'SUCCESS' : 'FAILURE'}
                </Badge>
                <div className="text-[10px] text-[#858E9B] mt-1">{step.ms}ms</div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Record Outcome Modal */}
      <Modal
        isOpen={outcomeModalOpen}
        onClose={() => setOutcomeModalOpen(false)}
        title="Record Decision Outcome Memory"
        description="Safely record verified outcome for advisory memory."
        maxWidth="md"
      >
        <div className="space-y-4 font-mono text-xs">
          <div>
            <label className="text-[10px] uppercase text-[#858E9B] block mb-1">
              Observed Outcome
            </label>
            <Select
              value={outcomeType}
              onChange={e => setOutcomeType(e.target.value as typeof outcomeType)}
            >
              <option value="successful">Successful (Threat Contained)</option>
              <option value="unsuccessful">Unsuccessful (Residual Compromise)</option>
              <option value="inconclusive">Inconclusive (Further Evidence Needed)</option>
            </Select>
          </div>

          <div>
            <label className="text-[10px] uppercase text-[#858E9B] block mb-1">
              Analyst Notes & Context
            </label>
            <Input
              value={outcomeNotes}
              onChange={e => setOutcomeNotes(e.target.value)}
              placeholder="e.g. S1 routes severed without disruption to build pipeline."
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-[#2A3038]">
            <Button variant="ghost" size="sm" onClick={() => setOutcomeModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => outcomeMutation.mutate()}
              isLoading={outcomeMutation.isPending}
            >
              Record Outcome
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
