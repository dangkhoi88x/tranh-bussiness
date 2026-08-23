import { apiFetch, apiRequest, ApiRequestError } from './http';
import { parseJsonSafe, getApiMessage } from './apiResponse';
import { sessionFromAuthResponse, type AuthSession } from './auth';

export type CurrentUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  roles: string[];
  authorities: string[];
};

export type ProfileInput = {
  firstName: string;
  lastName: string;
  phone?: string;
};

export function fetchCurrentUser(): Promise<CurrentUser> {
  return apiRequest<CurrentUser>('/users/me');
}

export function updateProfile(input: ProfileInput): Promise<CurrentUser> {
  return apiRequest<CurrentUser>('/users/me', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      firstName: input.firstName.trim(),
      lastName: input.lastName.trim(),
      phone: input.phone?.trim() || null,
    }),
  });
}

/**
 * Máy chủ thu hồi mọi refresh token cũ rồi cấp phiên mới cho chính thiết bị này, nên phải
 * giữ lại access token trả về — nếu không, thiết bị vừa đổi mật khẩu cũng bị đăng xuất theo.
 *
 * Đi qua apiFetch để access token hết hạn vẫn được làm mới và thử lại, thay vì báo nhầm
 * thành sai mật khẩu.
 */
export async function changePassword(currentPassword: string, newPassword: string): Promise<AuthSession> {
  const response = await apiFetch('/auth/password/change', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ currentPassword, newPassword }),
  });
  const payload = await parseJsonSafe(response);

  if (!response.ok) {
    // Sai mật khẩu hiện tại và access token hết hạn đều là 401; chỉ mã lỗi phân biệt được.
    const code = (payload as { data?: { code?: string } } | null)?.data?.code;
    throw new ApiRequestError(
      code === 'INVALID_CREDENTIALS'
        ? 'Mật khẩu hiện tại không đúng.'
        : getApiMessage(payload, 'Không đổi được mật khẩu.'),
      response.status,
    );
  }

  return sessionFromAuthResponse(payload);
}
