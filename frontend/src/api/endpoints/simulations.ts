import { apiClient } from '../client.ts'
import type {
  DigitalTwinResult,
  DefensePlanResult,
  CounterfactualResult,
  MutationLabResult,
} from '../types.ts'
import type { QueryPayload } from './graph.ts'
import type { SimulatePayload } from './containment.ts'

export interface MutationPayload extends QueryPayload {
  mutation_src: string
  mutation_rel: string
  mutation_dst: string
}

export const simulationsApi = {
  digitalTwin: (payload: SimulatePayload) => apiClient.post<DigitalTwinResult>('/digital-twin/simulate', payload),
  defensePlan: (payload: QueryPayload) => apiClient.post<DefensePlanResult>('/defense/plan', payload),
  counterfactual: (payload: SimulatePayload) => apiClient.post<CounterfactualResult>('/counterfactual', payload),
  mutationLab: (payload: MutationPayload) => apiClient.post<MutationLabResult>('/mutation-lab', payload),
}
