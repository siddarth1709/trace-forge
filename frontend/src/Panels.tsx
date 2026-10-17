import type { Case, Decision, Evidence, Hypothesis, Proposal, Step } from './types'

export function StatusBadge({ status }: { status: string }) {
    return <span className={`badge ${status}`}>{status.replace(/_/g, ' ')}</span>
}

export function StepList({ steps }: { steps: Step[] }) {
    if (steps.length === 0) return <p className="muted">No steps yet.</p>
    return (
        <ol className="steps">
            {steps.map((s) => (
                <li key={s.n} className={s.ok ? '' : 'bad'}>
                    <div className="row">
                        <b>{s.tool}</b>
                        <span className="muted">{s.ms} ms</span>
                    </div>
                    <div className="muted">{s.reason}</div>
                    <code>{JSON.stringify(s.result)}</code>
                </li>
            ))}
        </ol>
    )
}

export function HypothesisList({ items, decision }: { items: Hypothesis[]; decision: Decision | null }) {
    if (items.length === 0) return <p className="muted">No hypotheses scored yet.</p>
    return (
        <div>
            {items.map((h) => (
                <div key={h.id} className="hyp">
                    <div className="row">
                        <span>
                            <b>{h.id}</b> {h.text}
                        </span>
                        <b>{h.p.toFixed(2)}</b>
                    </div>
                    <div className="bar">
                        <div className="fill" style={{ width: `${Math.round(h.p * 100)}%` }} />
                    </div>
                    <div className="muted">
                        {h.evidence.length} evidence item(s): {h.evidence.map((x) => `${x.evidence} ${x.relation}`).join(', ') || 'none'}
                    </div>
                </div>
            ))}
            {decision && (
                <p className={decision.act ? 'ok' : 'warn'}>
                    {decision.act ? 'Act: ' : 'Abstain: '}
                    {decision.reason}
                </p>
            )}
            <p className="muted">Scores are heuristics with tunable weights, not calibrated probabilities.</p>
        </div>
    )
}

export function EvidenceList({ items }: { items: Evidence[] }) {
    if (items.length === 0) return <p className="muted">No evidence retrieved yet.</p>
    return (
        <ul className="evidence">
            {items.map((e) => (
                <li key={e.id} className={e.quarantined ? 'quarantined' : ''}>
                    <div className="row">
                        <b>{e.id}</b>
                        <span className="muted">{e.source ?? 'unknown source'}</span>
                    </div>
                    <div>{e.summary}</div>
                    {e.quarantined && <div className="warn">Quarantined: untrusted or instruction-like text. Not used as evidence and cannot trigger actions.</div>}
                </li>
            ))}
        </ul>
    )
}

interface ProposalProps {
    proposal: Proposal
    status: string
    busy: boolean
    onDecide: (approve: boolean) => void
}

export function ProposalCard({ proposal, status, busy, onDecide }: ProposalProps) {
    return (
        <div>
            <p>
                Remove <b>{proposal.size}</b> relationship(s) to cut all <b>{proposal.paths_before}</b> attack path(s). Estimated benign
                disruption: <b>{proposal.disruption}</b>.
            </p>
            <ul className="cut">
                {proposal.cut.map((c) => (
                    <li key={`${c.src}>${c.dst}`}>
                        {c.src} → {c.dst} <span className="muted">({c.rel}, benign load {c.benign_load})</span>
                    </li>
                ))}
            </ul>
            {status === 'awaiting_approval' ? (
                <div className="actions">
                    <button type="button" className="primary" disabled={busy} onClick={() => onDecide(true)}>
                        Approve and simulate
                    </button>
                    <button type="button" disabled={busy} onClick={() => onDecide(false)}>
                        Reject
                    </button>
                </div>
            ) : (
                <p className="muted">Decision recorded: {status.replace(/_/g, ' ')}.</p>
            )}
            <p className="muted">Simulation runs on a disposable copy. Production is never modified.</p>
        </div>
    )
}

export function ResultCard({ c }: { c: Case }) {
    const v = c.verification
    if (!v) return null
    const clean = v.after === 0
    return (
        <div>
            <p className={clean ? 'ok' : 'warn'}>
                Attack paths: <b>{v.before}</b> → <b>{v.after}</b> ({v.verdict.replace(/_/g, ' ')})
            </p>
            {v.remaining_paths.length > 0 && (
                <ul>
                    {v.remaining_paths.map((p) => (
                        <li key={p.nodes.join('>')}>{p.nodes.join(' → ')}</li>
                    ))}
                </ul>
            )}
            {c.report && (
                <div>
                    <p>{c.report.recommendation}</p>
                    <p className="muted">
                        Summary ({c.report.summary_source}): {c.report.summary}
                    </p>
                    <h4>Verified claims</h4>
                    <ul className="claims">
                        {c.report.claims.map((cl) => (
                            <li key={cl.text}>
                                {cl.text}{' '}
                                {cl.cites.map((id) => (
                                    <span key={id} className="chip">
                                        {id}
                                    </span>
                                ))}
                            </li>
                        ))}
                    </ul>
                    <p className="muted">
                        Unsupported claims: {Math.round(c.report.unsupported_rate * 100)}%. Citations are checked for existence, not for entailment.
                    </p>
                </div>
            )}
        </div>
    )
}