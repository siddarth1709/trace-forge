import { apiClient } from '../client.ts'
import type {
  EvidenceRecord,
  ThreatMappingResponse,
  CausalHypothesisResponse,
  AdversaryArenaResponse,
} from '../types.ts'

export interface EvidenceFetchPayload {
  ids: string[]
  graph?: string
}

export interface TechniqueObservation {
  evidence_types: string[]
  [key: string]: unknown
}

export interface CausalEventPayload {
  event_id?: string
  timestamp?: number | string
  entities?: string[]
  caused_by?: string[]
  [key: string]: unknown
}

export interface ArenaScenarioPayload {
  name: string
  paths_before: number
  paths_after: number
}

export const intelApi = {
  getEvidence: (ids: string[], graph: string = 'traceforge') =>
    apiClient.post<{ evidence: EvidenceRecord[] }>('/evidence', { ids, graph }),
  mapTechniques: (observations: TechniqueObservation[]) =>
    apiClient.post<ThreatMappingResponse>('/threat-intel/map', { observations }),
  investigateCausality: (events: CausalEventPayload[], maxGapSeconds: number = 3600) =>
    apiClient.post<CausalHypothesisResponse>('/investigate/causal', {
      events,
      max_gap_seconds: maxGapSeconds,
    }),
  scoreArena: (scenarios: ArenaScenarioPayload[]) =>
    apiClient.post<AdversaryArenaResponse>('/arena/score', { scenarios }),
}
