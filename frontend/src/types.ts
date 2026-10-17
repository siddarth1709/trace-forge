export type PropValue = string | number | boolean | null
export type Props = Record<string, PropValue>

export interface GNode {
    id: number
    labels: string[]
    props: Props
}

export interface GEdge {
    src: number
    rel: string
    dst: number
    props: Props
}

export interface GraphData {
    graph: string
    nodes: GNode[]
    edges: GEdge[]
}

export interface PathRec {
    id: string
    nodes: string[]
    rels: string[]
    times: (number | null)[]
    evidence: (string | null)[]
    confidence: (number | null)[]
}

export interface Step {
    n: number
    tool: string
    reason: string
    ms: number
    ok: boolean
    result: Record<string, unknown>
}

export interface Evidence {
    id: string
    source: string | null
    observed_at: number | null
    summary: string
    flagged: boolean
    quarantined: boolean
}

export interface HypEvidence {
    evidence: string
    relation: string
    weight: number
}

export interface Hypothesis {
    id: string
    text: string
    p: number
    log_odds: number
    evidence: HypEvidence[]
}

export interface Decision {
    act: boolean
    reason: string
}

export interface CutEdge {
    type: string
    src: string
    dst: string
    rel: string
    benign_load: number
}

export interface Proposal {
    cut: CutEdge[]
    size: number
    disruption: number
    paths_before: number
}

export interface RemainingPath {
    nodes: string[]
    rels: string[]
}

export interface Verification {
    sim_id: string
    before: number
    after: number
    verdict: string
    remaining_paths: RemainingPath[]
}

export interface Claim {
    text: string
    cites: string[]
}

export interface Report {
    summary: string
    summary_source: string
    claims: Claim[]
    rejected: Claim[]
    unsupported_rate: number
    recommendation: string
}

export interface Risk {
    score: number
    version: string
}

export interface Case {
    id: string
    status: string
    mode: string
    sources: string[]
    target: string
    steps: Step[]
    evidence: Evidence[]
    hypotheses: Hypothesis[]
    decision: Decision | null
    proposal: Proposal | null
    paths?: PathRec[]
    risk?: Risk
    verification?: Verification
    report?: Report
    error?: string
}

export interface AuditRow {
    ts: number
    tool: string
    args: unknown
    summary: unknown
}

export interface Agg {
    contained_pct: number
    mean_remaining_paths: number
    mean_disruption: number
    mean_ms: number
}

export interface Bench {
    n: number
    limits: string
    graph_agent: Agg
    baseline: Agg
    graph_cut_matches_truth_pct: number
    graph_agrees_with_networkx_pct: number
}