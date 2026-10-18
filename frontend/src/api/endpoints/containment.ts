import { apiClient } from '../client.ts'
import type {
  CutPlan,
  OptimizedContainmentResponse,
  SimulationResult,
  VerificationResult,
  ResidualRiskResult,
  AutoContainmentResult,
  ContainmentAction,
} from '../types.ts'
import type { QueryPayload } from './graph.ts'

export interface SimulatePayload extends QueryPayload {
  actions: ContainmentAction[]
}

export interface VerifyPayload extends QueryPayload {
  sim_id: string
}

export const containmentApi = {
  getMinCut: (payload: QueryPayload) => apiClient.post<CutPlan>('/containment/cut', payload),
  optimizeContainment: (payload: QueryPayload) => apiClient.post<OptimizedContainmentResponse>('/containment/optimize', payload),
  simulate: (payload: SimulatePayload) => apiClient.post<SimulationResult>('/containment/simulate', payload),
  verify: (payload: VerifyPayload) => apiClient.post<VerificationResult>('/containment/verify', payload),
  residualRisk: (payload: VerifyPayload) => apiClient.post<ResidualRiskResult>('/containment/residual-risk', payload),
  autoPipeline: (payload: QueryPayload) => apiClient.post<AutoContainmentResult>('/containment/auto', payload),
  deleteSim: (simId: string) => apiClient.delete<{ dropped: boolean; sim: string }>(`/sim/${encodeURIComponent(simId)}`),
}
