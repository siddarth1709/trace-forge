import { apiClient } from '../client.ts'
import type { GraphData, AttackPathsResponse, TraceResponse } from '../types.ts'

export interface QueryPayload {
  sources: string[]
  target: string
  graph?: string
}

export interface TracePayload extends QueryPayload {
  as_of?: number | null
}

export const graphApi = {
  getGraph: (graph?: string) =>
    apiClient.get<GraphData>(graph ? `/graph?graph=${encodeURIComponent(graph)}` : '/graph'),
  findPaths: (payload: QueryPayload) => apiClient.post<AttackPathsResponse>('/paths', payload),
  tracePaths: (payload: TracePayload) => apiClient.post<TraceResponse>('/trace', payload),
}
