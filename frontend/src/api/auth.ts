import { getApiMessage, parseJsonSafe, unwrapApiData } from './apiResponse';

const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:8080/api/v1';
const ACCESS_TOKEN_KEY = 'business-store.access-token';

export type AuthSession = {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  roles: string[];
  authorities: string[];
  accessToken: string;
};

type Credentials = { email: string; password: string };
type Registration = Credentials & {
  firstName: string;
  lastName: string;
  phone?: string;
};

function toSession(payload: unknown): AuthSession {
  const value = unwrapApiData<Record<string, unknown>>(payload);
  if (!value || typeof value.accessToken !== 'string' || !value.accessToken) {
    throw new Error('Máy chủ không trả về phiên đăng nhập hợp lệ.');
  }

  return {
    userId: String(value.userId ?? ''),
    email: typeof value.email === 'string' ? value.email : '',
    firstName: typeof value.firstName === 'string' ? value.firstName : '',
    lastName: typeof value.lastName === 'string' ? value.lastName : '',
    roles: Array.isArray(value.roles) ? value.roles.map(String) : [],
    authorities: authoritiesFromAccessToken(value.accessToken),
    accessToken: value.accessToken,
  };
}

function authoritiesFromAccessToken(accessToken: string): string[] {
  try {
    const payload = accessToken.split('.')[1];
    if (!payload) return [];
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const json = atob(base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '='));
    const roles = (JSON.parse(json) as { roles?: unknown }).roles;
    return Array.isArray(roles) ? roles.map(String) : [];
  } catch {
    return [];
  }
}

type GoogleAuthorizationCode = { code: string; redirectUri: string };

async function requestSession(
  path: string,
  body?: Credentials | Registration | GoogleAuthorizationCode,
): Promise<AuthSession> {
  const response = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    credentials: 'include',
  });
  const payload = await parseJsonSafe(response);

  if (!response.ok) {
    throw new Error(getApiMessage(payload, 'Không thể xác thực tài khoản.'));
  }

  return toSession(payload);
}

export function login(credentials: Credentials): Promise<AuthSession> {
  return requestSession('/auth/login', credentials);
}

export function register(registration: Registration): Promise<AuthSession> {
  return requestSession('/auth/register', registration);
}

export function refreshSession(): Promise<AuthSession> {
  return requestSession('/auth/refresh');
}

/**
 * Máy chủ đổi authorization code lấy hồ sơ Google, tạo tài khoản nếu email chưa có, rồi
 * cấp phiên như đăng nhập thường. redirectUri phải trùng đúng cái đã dùng để xin code —
 * Google từ chối nếu lệch.
 */
export function loginWithGoogle(code: string, redirectUri: string): Promise<AuthSession> {
  return requestSession('/auth/google', { code, redirectUri });
}

/** Dùng lại ở api/account.ts để dựng phiên từ AuthResponse mà không tạo vòng import. */
export { toSession as sessionFromAuthResponse };

// Hai endpoint dưới đây công khai và không trả về phiên đăng nhập, nên dùng fetch trực
// tiếp giống requestSession thay vì apiRequest: http.ts đã import từ file này.
async function postAuthCommand(path: string, body: unknown, fallbackMessage: string): Promise<void> {
  const response = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error(getApiMessage(await parseJsonSafe(response), fallbackMessage));
  }
}

export function requestPasswordReset(email: string): Promise<void> {
  return postAuthCommand('/auth/password/forgot', { email }, 'Không thể gửi liên kết đặt lại mật khẩu.');
}

export function resetPassword(token: string, newPassword: string): Promise<void> {
  // Endpoint này công khai nên 401 chỉ có một nghĩa: token hỏng, hết hạn hoặc đã dùng.
  // API đã trả câu tiếng Việt cho đúng trường hợp đó, không chép lại ở đây nữa.
  return postAuthCommand('/auth/password/reset', { token, newPassword }, 'Không thể đặt lại mật khẩu.');
}

export async function logout(accessToken: string): Promise<void> {
  await fetch(`${API_BASE}/auth/logout`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
    credentials: 'include',
  });
}

export function loadAccessToken(): string | null {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function persistAccessToken(accessToken: string): void {
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
}

export function clearAccessToken(): void {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
}
