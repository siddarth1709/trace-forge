import { apiClient } from '../client.ts'
import type { BackendHealth, AgentMode, GraphSchema, BenchmarkReport, Props } from '../types.ts'

export const healthApi = {
  getHealth: () => apiClient.get<BackendHealth>('/health'),
  getMode: () => apiClient.get<AgentMode>('/mode'),
  getScenarios: () => apiClient.get<Record<string, Props>>('/scenarios'),
  getSchema: () => apiClient.get<GraphSchema>('/schema'),
  getBenchmark: () => apiClient.get<BenchmarkReport>('/benchmark'),
}
