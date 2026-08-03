import { getApiMessage, parseJsonSafe, unwrapApiData } from './apiResponse'

const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:8080/api/v1'
const ACCESS_TOKEN_KEY = 'business-store.access-token'

export type AuthSession = {
  userId: string
  email: string
  firstName: string
  lastName: string
  roles: string[]
  authorities: string[]
  accessToken: string
}

type Credentials = { email: string; password: string }
type Registration = Credentials & {
  firstName: string
  lastName: string
  phone?: string
}

function toSession(payload: unknown): AuthSession {
  const value = unwrapApiData<Record<string, unknown>>(payload)
  if (!value || typeof value.accessToken !== 'string' || !value.accessToken) {
    throw new Error('Máy chủ không trả về phiên đăng nhập hợp lệ.')
  }

  return {
    userId: String(value.userId ?? ''),
    email: typeof value.email === 'string' ? value.email : '',
    firstName: typeof value.firstName === 'string' ? value.firstName : '',
    lastName: typeof value.lastName === 'string' ? value.lastName : '',
    roles: Array.isArray(value.roles) ? value.roles.map(String) : [],
    authorities: authoritiesFromAccessToken(value.accessToken),
    accessToken: value.accessToken,
  }
}

function authoritiesFromAccessToken(accessToken: string): string[] {
  try {
    const payload = accessToken.split('.')[1]
    if (!payload) return []
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/')
    const json = atob(base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '='))
    const roles = (JSON.parse(json) as { roles?: unknown }).roles
    return Array.isArray(roles) ? roles.map(String) : []
  } catch {
    return []
  }
}

async function requestSession(path: string, body?: Credentials | Registration): Promise<AuthSession> {
  const response = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    credentials: 'include',
  })
  const payload = await parseJsonSafe(response)

  if (!response.ok) {
    throw new Error(getApiMessage(payload, 'Không thể xác thực tài khoản.'))
  }

  return toSession(payload)
}

export function login(credentials: Credentials): Promise<AuthSession> {
  return requestSession('/auth/login', credentials)
}

export function register(registration: Registration): Promise<AuthSession> {
  return requestSession('/auth/register', registration)
}

export function refreshSession(): Promise<AuthSession> {
  return requestSession('/auth/refresh')
}

export async function logout(accessToken: string): Promise<void> {
  await fetch(`${API_BASE}/auth/logout`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
    credentials: 'include',
  })
}

export function loadAccessToken(): string | null {
  return localStorage.getItem(ACCESS_TOKEN_KEY)
}

export function persistAccessToken(accessToken: string): void {
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken)
}

export function clearAccessToken(): void {
  localStorage.removeItem(ACCESS_TOKEN_KEY)
}
