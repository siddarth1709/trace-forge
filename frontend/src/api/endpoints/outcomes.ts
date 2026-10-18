import { apiClient } from '../client.ts'
import type { OutcomeRecord, OutcomeSummaryResponse } from '../types.ts'

export interface RecordOutcomePayload {
  case_id: string
  decision: string
  outcome: 'successful' | 'unsuccessful' | 'inconclusive'
  verified?: boolean
  notes?: string
}

export const outcomesApi = {
  recordOutcome: (payload: RecordOutcomePayload) =>
    apiClient.post<{ recorded: boolean; case_id: string; decision: string; outcome: string; verified: boolean }>(
      '/outcomes',
      payload
    ),
  listOutcomes: (limit: number = 50) =>
    apiClient.get<OutcomeRecord[]>('/outcomes', { params: { limit } }),
  getSummary: () =>
    apiClient.get<OutcomeSummaryResponse>('/outcomes/summary'),
}
