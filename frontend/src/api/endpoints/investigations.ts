import { apiClient } from '../client.ts'
import type { IncidentData, IncidentReconstruction, EvidenceProvenanceReport, FullCase } from '../types.ts'
import type { QueryPayload, TracePayload } from './graph.ts'

export const investigationsApi = {
  getIncident: () => apiClient.get<IncidentData>('/incident'),
  runAutonomousInvestigation: (payload: QueryPayload) => apiClient.post<FullCase>('/investigate', payload, { timeoutMs: 60000 }),
  reconstruct: (payload: TracePayload) => apiClient.post<IncidentReconstruction>('/reconstruct', payload),
  provenance: (payload: TracePayload) => apiClient.post<EvidenceProvenanceReport>('/provenance', payload),
  runWorkflow: (payload: {
    sources: string[]
    target: string
    approve?: boolean
    approver?: string
    partial_intervention?: boolean
  }) => apiClient.post<FullCase>('/agent/workflow', payload, { timeoutMs: 60000 }),
}
