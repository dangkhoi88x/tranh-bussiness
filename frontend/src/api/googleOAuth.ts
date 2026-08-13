const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? ''
const STATE_KEY = 'business-store.google-oauth-state'
const AUTHORIZE_URL = 'https://accounts.google.com/o/oauth2/v2/auth'

/** Đường dẫn này phải được khai báo y hệt trong Google Cloud Console. */
export function googleRedirectUri(): string {
  return `${window.location.origin}/auth/google/callback`
}

/** Không có client id thì nút đăng nhập Google phải ẩn đi, thay vì bấm vào rồi hỏng. */
export function isGoogleSignInAvailable(): boolean {
  return CLIENT_ID.trim().length > 0
}

/**
 * Sinh state ngẫu nhiên và giữ trong sessionStorage. Không đối chiếu state lúc quay về thì
 * kẻ tấn công có thể ép nạn nhân đăng nhập vào tài khoản Google của chúng (login CSRF).
 */
export function beginGoogleSignIn(): string {
  const state = crypto.randomUUID()
  sessionStorage.setItem(STATE_KEY, state)

  const parameters = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: googleRedirectUri(),
    response_type: 'code',
    scope: 'openid email profile',
    state,
    // Người dùng nhiều tài khoản Google phải được chọn, thay vì bị đăng nhập ngầm bằng
    // tài khoản đang mở sẵn trên trình duyệt.
    prompt: 'select_account',
  })
  return `${AUTHORIZE_URL}?${parameters.toString()}`
}

/** Trả về true đúng một lần cho mỗi lần bắt đầu đăng nhập; state đã dùng bị xoá ngay. */
export function consumeGoogleState(returnedState: string | null): boolean {
  const expected = sessionStorage.getItem(STATE_KEY)
  sessionStorage.removeItem(STATE_KEY)
  return Boolean(expected) && expected === returnedState
}
