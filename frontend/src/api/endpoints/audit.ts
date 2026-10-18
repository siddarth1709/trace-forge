import { apiClient } from '../client.ts'
import type { AuditEvent } from '../types.ts'

export const auditApi = {
  getAuditLog: (limit: number = 100) =>
    apiClient.get<AuditEvent[]>('/audit', { params: { limit } }),
}
