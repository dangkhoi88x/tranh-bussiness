import {
  clearAccessToken,
  loadAccessToken,
  persistAccessToken,
  refreshSession,
  type AuthSession,
} from './auth'
import { getApiMessage, parseJsonSafe, unwrapApiData } from './apiResponse'

const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:8080/api/v1'

// The backend consumes a refresh token exactly once. All simultaneous 401s must
// therefore wait for one rotation instead of competing to consume the cookie.
let refreshPromise: Promise<AuthSession> | null = null

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
  const hadAccessToken = loadAccessToken() !== null
  clearAccessToken()
  if (hadAccessToken) {
    window.dispatchEvent(new Event('business-store:session-expired'))
  }
}

export function refreshSessionOnce(): Promise<AuthSession> {
  if (!refreshPromise) {
    refreshPromise = refreshSession()
      .then((session) => {
        persistAccessToken(session.accessToken)
        return session
      })
      .finally(() => {
        refreshPromise = null
      })
  }
  return refreshPromise
}

export async function apiFetch(path: string, init: RequestInit = {}, retryOnUnauthorized = true): Promise<Response> {
  const headers = new Headers(init.headers)
  const hasCallerAuthorization = headers.has('Authorization')
  const accessToken = loadAccessToken()
  const tokenAttachedByClient = accessToken && !hasCallerAuthorization ? accessToken : null
  if (tokenAttachedByClient) {
    headers.set('Authorization', `Bearer ${accessToken}`)
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers,
    credentials: 'include',
  })

  if (response.status === 403) {
    // The API is authoritative for RBAC. Tell the session store to reload its
    // permissions so navigation catches up with a permission that just changed.
    window.dispatchEvent(new Event('business-store:authorization-changed'))
    return response
  }

  if (response.status !== 401 || !retryOnUnauthorized || !tokenAttachedByClient) {
    return response
  }

  // Another request may already have refreshed while this older request was in
  // flight. Retry once with the current token rather than rotating again.
  if (loadAccessToken() !== tokenAttachedByClient) {
    return apiFetch(path, init, false)
  }

  try {
    await refreshSessionOnce()
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
