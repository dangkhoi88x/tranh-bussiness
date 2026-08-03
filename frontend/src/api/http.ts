import {
  clearAccessToken,
  loadAccessToken,
  persistAccessToken,
  refreshSession,
} from './auth'
import { getApiMessage, parseJsonSafe, unwrapApiData } from './apiResponse'

const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:8080/api/v1'

export class ApiRequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly fields: Record<string, string> = {},
  ) {
    super(message)
    this.name = 'ApiRequestError'
  }
}

function sessionExpired() {
  clearAccessToken()
  window.dispatchEvent(new Event('business-store:session-expired'))
}

export async function apiFetch(path: string, init: RequestInit = {}, retryOnUnauthorized = true): Promise<Response> {
  const headers = new Headers(init.headers)
  const accessToken = loadAccessToken()
  if (accessToken && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${accessToken}`)
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers,
    credentials: 'include',
  })

  if (response.status !== 401 || !retryOnUnauthorized) {
    return response
  }

  try {
    const refreshedSession = await refreshSession()
    persistAccessToken(refreshedSession.accessToken)
    return apiFetch(path, init, false)
  } catch {
    sessionExpired()
    return response
  }
}

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await apiFetch(path, init)
  const payload = await parseJsonSafe(response)

  if (!response.ok) {
    const envelope = payload as { data?: { fields?: Record<string, string> } } | null
    throw new ApiRequestError(
      getApiMessage(payload, `Yêu cầu thất bại (${response.status}).`),
      response.status,
      envelope?.data?.fields ?? {},
    )
  }

  return unwrapApiData<T>(payload) as T
}
