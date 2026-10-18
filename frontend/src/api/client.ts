/**
 * TRACEFORGE API Client
 * Centralized typed client with timeout handling, normalized errors, and safe request boundaries.
 */

export class ApiError extends Error {
  public status: number
  public statusText: string
  public detail: string
  public isPolicyError: boolean
  public isNetworkError: boolean
  public isTimeout: boolean

  constructor(params: {
    message: string
    status?: number
    statusText?: string
    detail?: string
    isPolicyError?: boolean
    isNetworkError?: boolean
    isTimeout?: boolean
  }) {
    super(params.message)
    this.name = 'ApiError'
    this.status = params.status ?? 0
    this.statusText = params.statusText ?? ''
    this.detail = params.detail ?? params.message
    this.isPolicyError = params.isPolicyError ?? (this.status === 403)
    this.isNetworkError = params.isNetworkError ?? (this.status === 0)
    this.isTimeout = params.isTimeout ?? false
  }
}

export interface RequestOptions extends RequestInit {
  timeoutMs?: number
  params?: Record<string, string | number | boolean | undefined | null>
}

// Configurable API base URL, defaults to local backend
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000').replace(/\/+$/, '')

export function getApiBaseUrl(): string {
  return API_BASE_URL
}

async function request<T>(method: string, path: string, body?: unknown, options: RequestOptions = {}): Promise<T> {
  const { timeoutMs = 20000, params, ...customInit } = options

  let url = `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`

  if (params) {
    const searchParams = new URLSearchParams()
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        searchParams.append(key, String(value))
      }
    })
    const query = searchParams.toString()
    if (query) {
      url += (url.includes('?') ? '&' : '?') + query
    }
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  const headers: Record<string, string> = {
    'Accept': 'application/json',
    ...(customInit.headers as Record<string, string>),
  }

  if (body !== undefined && !(body instanceof FormData)) {
    headers['Content-Type'] = 'application/json'
  }

  try {
    const response = await fetch(url, {
      method,
      headers,
      body: body === undefined ? undefined : (body instanceof FormData ? body : JSON.stringify(body)),
      signal: controller.signal,
      ...customInit,
    })

    clearTimeout(timeoutId)

    // Handle 204 No Content
    if (response.status === 204) {
      return {} as T
    }

    const text = await response.text()
    let data: unknown = {}
    try {
      data = text ? JSON.parse(text) : {}
    } catch {
      data = { rawText: text }
    }

    if (!response.ok) {
      const detail = (data as { detail?: unknown })?.detail
      const message = typeof detail === 'string'
        ? detail
        : Array.isArray(detail)
          ? detail.map((d: { msg?: string }) => d.msg || JSON.stringify(d)).join('; ')
          : `HTTP ${response.status}: ${response.statusText}`

      throw new ApiError({
        message,
        status: response.status,
        statusText: response.statusText,
        detail: typeof detail === 'string' ? detail : message,
        isPolicyError: response.status === 403,
      })
    }

    return data as T
  } catch (err: unknown) {
    clearTimeout(timeoutId)

    if (err instanceof ApiError) {
      throw err
    }

    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new ApiError({
        message: `Request timed out after ${timeoutMs}ms to ${method} ${path}`,
        isTimeout: true,
      })
    }

    const message = err instanceof Error ? err.message : 'Unknown network failure'
    throw new ApiError({
      message: `Failed to connect to TRACEFORGE backend (${method} ${path}): ${message}`,
      isNetworkError: true,
    })
  }
}

export const apiClient = {
  get: <T>(path: string, options?: RequestOptions) => request<T>('GET', path, undefined, options),
  post: <T>(path: string, body?: unknown, options?: RequestOptions) => request<T>('POST', path, body, options),
  delete: <T>(path: string, options?: RequestOptions) => request<T>('DELETE', path, undefined, options),
}
