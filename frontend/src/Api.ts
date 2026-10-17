const BASE: string = import.meta.env.VITE_API ?? 'http://127.0.0.1:8000'

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const res = await fetch(BASE + path, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: body === undefined ? undefined : JSON.stringify(body),
    })
    const text = await res.text()
    let data: unknown = {}
    try {
        data = text ? JSON.parse(text) : {}
    } catch {
        data = {}
    }
    if (!res.ok) {
        const detail = (data as { detail?: unknown }).detail
        throw new Error(typeof detail === 'string' ? detail : `HTTP ${res.status} on ${method} ${path}`)
    }
    return data as T
}

export const api = {
    get: <T>(path: string) => request<T>('GET', path),
    post: <T>(path: string, body: unknown) => request<T>('POST', path, body),
}