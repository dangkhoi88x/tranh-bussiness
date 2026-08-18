import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const loadAccessToken = vi.fn<() => string | null>();
const persistAccessToken = vi.fn();
const clearAccessToken = vi.fn();
const refreshSession = vi.fn();

vi.mock('./auth', () => ({
  loadAccessToken: () => loadAccessToken(),
  persistAccessToken: (token: string) => persistAccessToken(token),
  clearAccessToken: () => clearAccessToken(),
  refreshSession: () => refreshSession(),
}));

const { apiFetch, apiRequest, ApiRequestError } = await import('./http');

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
  loadAccessToken.mockReturnValue('token-cu');
  refreshSession.mockResolvedValue({ accessToken: 'token-moi' });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function authorizationOf(call: number) {
  return (fetchMock.mock.calls[call][1] as RequestInit & { headers: Headers }).headers.get('Authorization');
}

describe('gắn access token', () => {
  it('thêm Bearer token vào request', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, {}));

    await apiFetch('/orders');

    expect(authorizationOf(0)).toBe('Bearer token-cu');
    expect((fetchMock.mock.calls[0][1] as RequestInit).credentials).toBe('include');
  });

  it('không đè Authorization do nơi gọi tự đặt', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, {}));

    await apiFetch('/orders', { headers: { Authorization: 'Bearer rieng' } });

    expect(authorizationOf(0)).toBe('Bearer rieng');
  });
});

describe('làm mới phiên khi gặp 401', () => {
  it('làm mới rồi thử lại đúng một lần', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(401, {})).mockResolvedValueOnce(jsonResponse(200, { data: 'xong' }));

    const response = await apiFetch('/orders');

    expect(refreshSession).toHaveBeenCalledTimes(1);
    expect(persistAccessToken).toHaveBeenCalledWith('token-moi');
    expect(response.status).toBe(200);
  });

  it('nhiều request cùng dính 401 chỉ xoay vòng token một lần', async () => {
    // Backend tiêu refresh token đúng một lần; xoay hai lần là tự đăng xuất người dùng.
    fetchMock.mockImplementation(async () => jsonResponse(401, {}));
    let resolveRefresh: (value: unknown) => void = () => {};
    refreshSession.mockReturnValue(
      new Promise((resolve) => {
        resolveRefresh = resolve;
      }),
    );

    const inflight = Promise.all([apiFetch('/a'), apiFetch('/b'), apiFetch('/c')]);
    resolveRefresh({ accessToken: 'token-moi' });
    await inflight;

    expect(refreshSession).toHaveBeenCalledTimes(1);
  });

  it('không thử lại lần hai nếu lần thử lại vẫn 401', async () => {
    fetchMock.mockResolvedValue(jsonResponse(401, {}));

    await apiFetch('/orders');

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('không làm mới khi request vốn không có token', async () => {
    loadAccessToken.mockReturnValue(null);
    fetchMock.mockResolvedValue(jsonResponse(401, {}));

    await apiFetch('/products');

    expect(refreshSession).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('dùng lại token mà request khác vừa làm mới, thay vì xoay tiếp', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(401, {})).mockResolvedValueOnce(jsonResponse(200, {}));
    loadAccessToken.mockReturnValueOnce('token-cu').mockReturnValue('token-vua-duoc-lam-moi');

    await apiFetch('/orders');

    expect(refreshSession).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('báo hết phiên khi làm mới thất bại', async () => {
    fetchMock.mockResolvedValue(jsonResponse(401, {}));
    refreshSession.mockRejectedValue(new Error('refresh token đã bị thu hồi'));
    const expired = vi.fn();
    window.addEventListener('business-store:session-expired', expired);

    const response = await apiFetch('/orders');

    expect(clearAccessToken).toHaveBeenCalled();
    expect(expired).toHaveBeenCalled();
    expect(response.status).toBe(401);
    window.removeEventListener('business-store:session-expired', expired);
  });
});

describe('403', () => {
  it('phát sự kiện để nạp lại quyền và không thử lại', async () => {
    fetchMock.mockResolvedValue(jsonResponse(403, {}));
    const changed = vi.fn();
    window.addEventListener('business-store:authorization-changed', changed);

    const response = await apiFetch('/products/management');

    expect(changed).toHaveBeenCalled();
    expect(refreshSession).not.toHaveBeenCalled();
    expect(response.status).toBe(403);
    window.removeEventListener('business-store:authorization-changed', changed);
  });
});

describe('apiRequest', () => {
  it('bóc phần data của phong bì', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { status: 'success', data: { id: 'p1' } }));

    await expect(apiRequest('/products/p1')).resolves.toEqual({ id: 'p1' });
  });

  it('ném ApiRequestError kèm thông báo và lỗi theo trường', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(400, {
        status: 'error',
        message: 'Dữ liệu gửi lên chưa hợp lệ.',
        data: { code: 'VALIDATION_ERROR', fields: { email: 'Email không hợp lệ.' } },
      }),
    );

    await expect(apiRequest('/auth/register', { method: 'POST' })).rejects.toMatchObject({
      // Thông báo lỗi theo trường được ưu tiên vì nó nói rõ chỗ cần sửa.
      message: 'Email không hợp lệ.',
      status: 400,
      fields: { email: 'Email không hợp lệ.' },
    });
  });

  it('vẫn báo lỗi khi máy chủ trả về thân rỗng', async () => {
    fetchMock.mockResolvedValue(new Response('', { status: 500 }));

    await expect(apiRequest('/orders')).rejects.toBeInstanceOf(ApiRequestError);
  });
});
