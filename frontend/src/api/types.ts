/**
 * TRACEFORGE TypeScript Type Definitions.
 * Strictly aligned with FastAPI schemas in backend/main.py, tf_core.py, tf_intel.py, tf_advanced.py.
 */

export type PropValue = string | number | boolean | null
export type Props = Record<string, PropValue>

// ---- Backend Health & Meta
export interface BackendHealth {
  status: string
  graph: string
  name_key: string
  attack_relationships: string[] | string
}

export interface AgentMode {
  mode: string
  model: string
}

export interface GraphSchema {
  graph: string
  name_key: string
  labels: string[]
  relationship_types: string[]
  property_keys: string[]
  node_count: number
  edge_count: number
}

// ---- Graph Topology (from /graph)
export interface GNode {
  id: number
  labels: string[]
  props: Props & {
    name?: string
    id?: string
    type?: string
    criticality?: string
    source?: string
    kev?: boolean
    cvss?: number
    rule?: string
    observed_at?: number
    status?: string
    severity?: string
    untrusted?: boolean
    text?: string
  }
}

export interface GEdge {
  src: number
  rel: string
  dst: number
  props: Props & {
    kind?: string
    observed_at?: number
    benign_load?: number
    confidence?: number
    evidence_id?: string
    source?: string
  }
}

export interface GraphData {
  graph: string
  nodes: GNode[]
  edges: GEdge[]
}

// ---- Attack Paths & Tracing (from /paths, /trace)
export interface AttackPathSimple {
  nodes: string[]
  rels: string[]
}

export interface AttackPathsResponse {
  graph: string
  count: number
  paths: AttackPathSimple[]
}

export interface PathRec {
  id: string
  nodes: string[]
  rels: string[]
  times: (number | null)[]
  evidence: (string | null)[]
  confidence: (number | null)[]
}

export interface TraceResponse {
  graph: string
  as_of: number | null
  count: number
  paths: PathRec[]
}

// ---- Incident & Alerts (from /incident)
export interface IncidentData {
  incident: Props | null
  alerts: Props[]
  alerted_entities: string[]
  evidence_ids: string[]
}

// ---- Evidence & Provenance (from /evidence, /reconstruct, /provenance)
export interface EvidenceRecord {
  name?: string
  id?: string
  type?: string
  evidence_source?: string
  source?: string
  observed_at?: number
  text?: string
  summary?: string
  untrusted?: boolean
  trust_status?: 'untrusted' | 'unspecified'
  handling?: 'data_only_never_instructions' | string
  flagged?: boolean
  quarantined?: boolean
}

export interface ReconstructedEvent {
  source: string | null
  relationship: string
  target: string | null
  observed_at: number | null
  confidence: number | null
  evidence_id: string | null
  evidence_status: 'linked' | 'missing'
  evidence: EvidenceRecord | null
  event_status: string
}

export interface ReconstructedPath {
  id: string
  nodes: string[]
  events: ReconstructedEvent[]
  timeline_status: 'timestamped' | 'unverified'
}

export interface IncidentReconstruction {
  graph: string
  as_of: number | null
  path_count: number
  chronology_verified: boolean
  evidence_complete: boolean
  paths: ReconstructedPath[]
  limitations: string[]
}

export interface ProvenanceEvent {
  source: string | null
  relationship: string
  target: string | null
  evidence_id: string | null
  evidence_status: 'linked' | 'missing'
  timestamp: number | null
  timestamp_status: 'available' | 'missing'
  confidence: number | null
  claim_status: 'supported_by_linked_evidence' | 'unverified_missing_evidence'
}

export interface ProvenancePath {
  path_id: string
  timeline_status: string
  events: ProvenanceEvent[]
}

export interface EvidenceProvenanceReport {
  graph: string
  as_of: number | null
  path_count: number
  event_count: number
  events_with_linked_evidence: number
  events_with_timestamps: number
  evidence_coverage: number
  timestamp_coverage: number
  paths: ProvenancePath[]
  limitations: string[]
  advisory_only: boolean
  automatic_actions_enabled: boolean
  production_modified: boolean
}

// ---- Containment & Simulation (from /containment/*, /defense/plan, etc.)
export interface ContainmentAction {
  type: 'remove_edge' | 'isolate_node'
  src?: string
  dst?: string
  rel?: string
  node?: string
  benign_load?: number
}

export interface CutPlan {
  size: number
  disruption: number
  cut: ContainmentAction[]
}

export interface OptimizedContainmentRecommendation {
  action: ContainmentAction
  security_role: string
  business_impact: string
  business_impact_reason: string
  automatic_execution: boolean
}

export interface OptimizedContainmentResponse {
  sources: string[]
  target: string
  candidate_count: number
  minimum_cut_size: number
  reported_disruption: number
  business_impact_status: string
  business_impact_policy_version: string
  business_impact_policy_default_status: string
  recommendations: OptimizedContainmentRecommendation[]
  simulation_required: boolean
  production_modified: boolean
  note: string
}

export interface SimulationResult {
  sim_id: string
  src_graph: string
  clone_method?: string
  applied: number
  actions: ContainmentAction[]
  status: string
  simulation_scope: string
  note: string
}

export interface VerificationResult {
  sim_id: string
  src_graph: string
  before: number
  after: number
  contained: boolean
  verdict: 'eliminated' | 'residual_risk' | 'no_paths_initial' | string
  remaining_paths: { nodes: string[]; rels: string[] }[]
}

export interface AutoContainmentResult {
  plan: CutPlan
  simulation: SimulationResult | null
  verification: VerificationResult | null
  contained: boolean
  status: 'verified' | 'residual_risk'
  simulation_scope: string
  note: string
}

export interface ResidualRiskResult {
  sim_id: string
  src_graph: string
  simulation_scope: string
  paths_before: number
  paths_remaining: number
  contained: boolean
  verdict: string
  remaining_paths: { nodes: string[]; rels: string[] }[]
  note: string
}

export interface DigitalTwinResult {
  feature: 'digital_twin'
  simulation: SimulationResult
  baseline_path_count: number
  remaining_path_count: number
  remaining_paths: { nodes: string[]; rels: string[] }[]
  contained_in_sandbox: boolean
  simulation_scope: string
  production_modified: boolean
  limitations: string[]
}

export interface DefensePlanResult {
  feature: 'closed_loop_defense_planner'
  plan: CutPlan
  simulation: SimulationResult | null
  verification: VerificationResult | null
  approval_required: boolean
  automatic_execution: boolean
  simulation_scope: string
  production_modified: boolean
  note: string
}

export interface CounterfactualResult {
  analysis: 'counterfactual'
  question: string
  baseline_paths: AttackPathSimple[]
  baseline_count: number
  hypothetical_actions: ContainmentAction[]
  simulation: SimulationResult
  remaining_paths: { nodes: string[]; rels: string[] }[]
  remaining_count: number
  verdict: string
  contained_in_sandbox: boolean
  simulation_scope: string
  production_modified: boolean
  limitations: string[]
}

export interface MutationLabResult {
  analysis: 'attack_pattern_mutation'
  sim_id: string
  src_graph: string
  clone_method: string
  mutation: { src: string; rel: string; dst: string }
  baseline_count: number
  mutated_count: number
  new_path_count: number
  new_paths: AttackPathSimple[]
  baseline_paths: AttackPathSimple[]
  mutated_paths: AttackPathSimple[]
  simulation_scope: string
  production_modified: boolean
  limitations: string[]
}

// ---- Risk Analysis & Sensitivity (from /risk, /risk/uncertainty, /recommendations/explain)
export interface PathRiskFeature {
  path: string
  score: number
  features: {
    criticality: number
    exposure: number
    confidence: number
    recency: number
    exploit: number
  }
}

export interface RiskScoreResponse {
  score: number
  version: string
  per_path: PathRiskFeature[]
  exploited: string[]
}

export interface RiskUncertaintyScenario {
  scenario: string
  score: number
  lower_bound: number
  upper_bound: number
  weights: Record<string, number>
}

export interface RiskUncertaintyResponse {
  model_version: string
  features: Record<string, number>
  uncertainty_widths: Record<string, number>
  scenarios: RiskUncertaintyScenario[]
  score_range: {
    minimum: number
    maximum: number
  }
  limitations: string[]
  advisory_only: boolean
  automatic_actions_enabled: boolean
  production_modified: boolean
}

export interface RecommendationSupportingEvidence {
  path_id: string
  path_score: number
  leading_features: { feature: string; value: number }[]
  known_exploit_matches: string[]
}

export interface DefensiveRecommendation {
  priority: 'high' | 'medium' | 'review' | 'insufficient_path_evidence' | string
  title: string
  reason: string
  supporting_evidence: RecommendationSupportingEvidence[]
  uncertainty: string
}

export interface RecommendationsExplainResponse {
  target: string
  risk: RiskScoreResponse
  recommendations: DefensiveRecommendation[]
  historical_outcomes: OutcomeSummaryResponse
  historical_outcomes_usage: string
  limitations: string[]
  memory_scope: string
  automatic_actions_enabled: boolean
  production_modified: boolean
}

// ---- Threat Intel & Mapping (from /threat-intel/map, /investigate/causal, /arena/score)
export interface MitreTechniqueMapping {
  observation_index: number
  technique_id: string
  technique_name: string
  matched_evidence_types: string[]
  mapping_status: string
  limitations: string[]
}

export interface ThreatMappingResponse {
  mappings: MitreTechniqueMapping[]
  unmapped_observations: number[]
  advisory_only: boolean
  production_modified: boolean
}

export interface CausalCandidateChain {
  event_indices: [number, number]
  shared_entities: string[]
  explicit_link: boolean
  classification: 'explicitly_linked_candidate' | 'shared_entity_candidate'
  causation_verified: boolean
}

export interface CausalHypothesisResponse {
  candidate_chains: CausalCandidateChain[]
  events_received: number
  events_with_timestamps: number
  limitations: string[]
  advisory_only: boolean
  production_modified: boolean
}

export interface ArenaScenarioScore {
  scenario: string
  paths_before: number
  paths_after: number
  path_reduction_fraction: number
  contained_in_simulation: boolean
}

export interface AdversaryArenaResponse {
  ranked_scenarios: ArenaScenarioScore[]
  note: string
  advisory_only: boolean
  production_modified: boolean
}

// ---- Cases & Approvals (from /cases, /cases/{id})
export interface CaseStep {
  n: number
  tool: string
  reason: string
  ms: number
  ok: boolean
  result: Record<string, unknown>
}

export interface CaseSummary {
  id: string
  ts: number
  status: 'needs_analyst' | 'approved' | 'rejected' | string
  target: string
}

export interface FullCase {
  id: string
  ts?: number
  status: string
  mode: string
  mcp_mode?: string
  sources: string[]
  target: string
  steps: CaseStep[]
  evidence: EvidenceRecord[]
  hypotheses: Array<{
    id: string
    text: string
    p: number
    log_odds: number
    evidence: Array<{ evidence: string; relation: string; weight: number }>
  }>
  decision: { act: boolean; reason: string } | null
  finding?: {
    summary: string
    reachable_paths_count: number
    reachable_paths: PathRec[]
    observed_facts: string[]
    assumptions: string[]
    risk_explanation: string
    rationale: string
    proposed_interventions: Array<{
      action: string
      source: string
      destination: string
      relationship: string
      benign_load: number
      rationale: string
    }>
    confidence: number
    confidence_and_limitations: {
      confidence_score: number
      confidence_level: string
      confidence_basis: string
      limitations: string[]
    }
    verification_criteria: {
      required_residual_paths: number
      success_verdict: string
      required_status: string
      description: string
    }
  }
  proposal: {
    cut: ContainmentAction[]
    size: number
    disruption: number
    paths_before: number
    finding?: any
    observed_facts?: string[]
    assumptions?: string[]
    rationale?: string
    verification_criteria?: {
      required_residual_paths: number
      success_verdict: string
      required_status: string
      description: string
    }
    confidence_and_limitations?: {
      confidence_score: number
      confidence_level: string
      confidence_basis: string
      limitations: string[]
    }
  } | null
  paths?: PathRec[]
  risk?: { score: number; version: string }
  simulation?: {
    sim_id: string
    src_graph: string
    clone_method: string
    applied: number
    actions: ContainmentAction[]
    simulation_scope: string
  }
  verification?: VerificationResult
  contained?: boolean
  verification_status?: 'VERIFIED' | 'PARTIAL' | 'FAILED' | 'REJECTED' | string
  simulation_scope?: string
  production_modified?: boolean
  audit_record?: Record<string, any>
  approval?: {
    approved: boolean
    approver: string
    ts: number
  }
  report?: {
    summary: string
    summary_source: string
    claims: Array<{ text: string; cites: string[] }>
    rejected: Array<{ text: string; cites: string[] }>
    unsupported_rate: number
    recommendation: string
  }
  error?: string
}

// ---- Outcome Memory (from /outcomes, /outcomes/summary)
export interface OutcomeRecord {
  id: number
  ts: number
  case_id: string
  decision: string
  outcome: 'successful' | 'unsuccessful' | 'inconclusive'
  verified: boolean
  notes: string
}

export interface OutcomeSummaryCounts {
  total: number
  verified: number
  unverified: number
}

export interface OutcomeSummaryResponse {
  total_records: number
  outcomes: {
    successful: OutcomeSummaryCounts
    unsuccessful: OutcomeSummaryCounts
    inconclusive: OutcomeSummaryCounts
  }
  interpretation: string
  memory_scope: string
  automatic_actions_enabled: boolean
}

// ---- Audit Trail (from /audit)
export interface AuditEvent {
  ts: number
  tool: string
  args: Record<string, unknown>
  summary: Record<string, unknown>
}

// ---- Evaluation Benchmark (from /benchmark)
export interface BenchmarkMetrics {
  contained_pct: number
  mean_remaining_paths: number
  mean_disruption: number
  mean_ms: number
}

export interface BenchmarkReport {
  n: number
  limits: string
  graph_agent: BenchmarkMetrics
  baseline: BenchmarkMetrics
  graph_cut_matches_truth_pct: number
  graph_agrees_with_networkx_pct: number
}

// ---- Data Ingestion & Real Telemetry (from /data/ingest, /data/samples)
export interface IngestPayload {
  graph?: string
  content: string | Record<string, unknown> | Array<unknown>
  format?: 'auto' | 'json' | 'csv'
  replace?: boolean
}

export interface IngestResponse {
  status: string
  graph: string
  endpoints_added: number
  connections_added: number
  nodes: Array<{
    name: string
    label?: string
    type?: string
    criticality?: string
    [key: string]: unknown
  }>
  connections: Array<{
    src: string
    dst: string
    rel: string
    description: string
    props: {
      load?: number
      port?: number
      protocol?: string
      evidence_id?: string
      observed_at?: number
      [key: string]: unknown
    }
  }>
  message: string
}

export interface SampleDataset {
  filename: string
  format: 'json' | 'csv'
  size_bytes: number
  content: string
}

export interface SampleDatasetsResponse {
  samples: SampleDataset[]
}
