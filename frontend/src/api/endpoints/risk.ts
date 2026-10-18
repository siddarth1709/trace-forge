import { apiClient } from '../client.ts'
import type {
  RiskScoreResponse,
  RiskUncertaintyResponse,
  RecommendationsExplainResponse,
} from '../types.ts'
import type { TracePayload } from './graph.ts'

export interface RiskUncertaintyPayload {
  features: Record<string, number>
  uncertainty?: Record<string, number>
  scenarios?: Array<{ name: string; weights: Record<string, number> }>
}

export const riskApi = {
  calculateRisk: (payload: TracePayload) => apiClient.post<RiskScoreResponse>('/risk', payload),
  analyzeUncertainty: (payload: RiskUncertaintyPayload) => apiClient.post<RiskUncertaintyResponse>('/risk/uncertainty', payload),
  explainRecommendations: (payload: TracePayload) => apiClient.post<RecommendationsExplainResponse>('/recommendations/explain', payload),
}
