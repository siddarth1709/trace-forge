import { apiClient } from '../client.ts'
import type { IngestPayload, IngestResponse, SampleDatasetsResponse } from '../types.ts'

export const dataApi = {
  ingestData: (payload: IngestPayload) =>
    apiClient.post<IngestResponse>('/data/ingest', payload),

  getSampleDatasets: () =>
    apiClient.get<SampleDatasetsResponse>('/data/samples'),
}
