import { describe, it, expect, vi, beforeEach } from 'vitest'
import { apiClient, ApiError, getApiBaseUrl } from '../api/client.ts'
import { formatTimestamp, getRiskLevel, getNodeVisualProps } from '../lib/utils.ts'

describe('API Client & Error Handling', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('provides a valid base URL', () => {
    const url = getApiBaseUrl()
    expect(url).toBeDefined()
    expect(url.startsWith('http')).toBe(true)
  })

  it('creates ApiError with normalized attributes', () => {
    const err = new ApiError({
      message: 'Policy refused action: production is read-only',
      status: 403,
      statusText: 'Forbidden',
      detail: 'Policy refused action: production is read-only',
    })

    expect(err.status).toBe(403)
    expect(err.isPolicyError).toBe(true)
    expect(err.isNetworkError).toBe(false)
    expect(err.detail).toContain('production is read-only')
  })

  it('normalizes network errors correctly', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('Failed to fetch'))

    await expect(apiClient.get('/health')).rejects.toThrow(ApiError)
  })

  it('parses successful json responses', async () => {
    const mockData = { status: 'ok', graph: 'traceforge' }
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify(mockData),
    } as Response)

    const res = await apiClient.get<{ status: string; graph: string }>('/health')
    expect(res).toEqual(mockData)
  })
})

describe('Utility & Formatting Functions', () => {
  it('formats synthetic simulation timestamps correctly', () => {
    expect(formatTimestamp(120)).toBe('T+120s (sim)')
    expect(formatTimestamp(null)).toBe('N/A')
  })

  it('determines risk levels correctly', () => {
    expect(getRiskLevel(0.9).label).toBe('CRITICAL')
    expect(getRiskLevel(0.6).label).toBe('HIGH')
    expect(getRiskLevel(0.3).label).toBe('MEDIUM')
    expect(getRiskLevel(0.1).label).toBe('LOW')
  })

  it('identifies critical server visual attributes', () => {
    const props = getNodeVisualProps(['Server'], { name: 'Critical Server', criticality: 'critical' })
    expect(props.category).toBe('Critical Asset')
    expect(props.color).toBe('#ef4444')
  })

  it('flags untrusted evidence visual attributes', () => {
    const props = getNodeVisualProps(['Evidence'], { name: 'EV-INJ', untrusted: true })
    expect(props.category).toContain('Hostile')
    expect(props.color).toBe('#f43f5e')
  })
})
