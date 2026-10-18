import { apiClient } from '../client.ts'
import type { CaseSummary, FullCase, ContainmentAction } from '../types.ts'

export interface ApprovePayload {
  approve: boolean
  approver?: string
  actions?: ContainmentAction[]
}

export const casesApi = {
  listCases: (limit: number = 50) =>
    apiClient.get<CaseSummary[]>('/cases', { params: { limit } }),
  getCase: (caseId: string) =>
    apiClient.get<FullCase>(`/cases/${encodeURIComponent(caseId)}`),
  approveCase: (caseId: string, payload: ApprovePayload) =>
    apiClient.post<FullCase>(`/cases/${encodeURIComponent(caseId)}/approve`, payload),
}
