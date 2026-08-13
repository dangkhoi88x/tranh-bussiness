import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.stubEnv('VITE_GOOGLE_CLIENT_ID', '123-kiemthu.apps.googleusercontent.com');

const { beginGoogleSignIn, consumeGoogleState, googleRedirectUri, isGoogleSignInAvailable } =
  await import('./googleOAuth');

const STATE_KEY = 'business-store.google-oauth-state';

beforeEach(() => {
  sessionStorage.clear();
});

describe('đường dẫn quay về', () => {
  it('luôn là <origin>/auth/google/callback', () => {
    // Lệch một ký tự so với khai báo trong Google Cloud Console là Google từ chối ngay.
    expect(googleRedirectUri()).toBe(`${window.location.origin}/auth/google/callback`);
  });

  it('chỉ bật nút khi có client id', () => {
    expect(isGoogleSignInAvailable()).toBe(true);
  });
});

describe('URL gửi sang Google', () => {
  it('mang đủ tham số bắt buộc', () => {
    const url = new URL(beginGoogleSignIn());

    expect(url.origin + url.pathname).toBe('https://accounts.google.com/o/oauth2/v2/auth');
    expect(Object.fromEntries(url.searchParams)).toMatchObject({
      client_id: '123-kiemthu.apps.googleusercontent.com',
      redirect_uri: googleRedirectUri(),
      response_type: 'code',
      scope: 'openid email profile',
      prompt: 'select_account',
    });
  });

  it('lưu đúng state đã gắn vào URL', () => {
    const state = new URL(beginGoogleSignIn()).searchParams.get('state');

    expect(state).toBeTruthy();
    expect(sessionStorage.getItem(STATE_KEY)).toBe(state);
  });

  it('mỗi lần bấm sinh một state khác', () => {
    const first = new URL(beginGoogleSignIn()).searchParams.get('state');
    const second = new URL(beginGoogleSignIn()).searchParams.get('state');

    expect(first).not.toBe(second);
  });
});

describe('đối chiếu state lúc quay về', () => {
  it('chấp nhận state do chính trang này phát ra', () => {
    const state = new URL(beginGoogleSignIn()).searchParams.get('state');

    expect(consumeGoogleState(state)).toBe(true);
  });

  it('từ chối state lạ', () => {
    beginGoogleSignIn();

    // Đây là lớp chặn login CSRF: kẻ tấn công ép nạn nhân đăng nhập vào tài khoản của chúng.
    expect(consumeGoogleState('state-cua-ke-tan-cong')).toBe(false);
  });

  it('từ chối khi không có state nào đang chờ', () => {
    expect(consumeGoogleState('bat-ky')).toBe(false);
    expect(consumeGoogleState(null)).toBe(false);
  });

  it('mỗi state chỉ dùng được một lần', () => {
    const state = new URL(beginGoogleSignIn()).searchParams.get('state');

    expect(consumeGoogleState(state)).toBe(true);
    expect(consumeGoogleState(state)).toBe(false);
    expect(sessionStorage.getItem(STATE_KEY)).toBeNull();
  });
});
