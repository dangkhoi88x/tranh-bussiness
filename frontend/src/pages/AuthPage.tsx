import { useState, type FormEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { AuthShell } from '../components/AuthShell'
import { requestPasswordReset } from '../api/auth'
import { beginGoogleSignIn, isGoogleSignInAvailable } from '../api/googleOAuth'

type Mode = 'login' | 'register' | 'forgot'
type Notice = { kind: 'error' | 'success'; text: string } | null

const emptyRegistration = { firstName: '', lastName: '', phone: '', confirmPassword: '' }

/** Logo Google phải giữ đúng màu gốc theo quy định nhận diện của họ. */
function GoogleMark() {
  return <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true" focusable="false">
    <path fill="#4285F4" d="M45.12 24.5c0-1.56-.14-3.06-.4-4.5H24v8.51h11.84c-.51 2.75-2.06 5.08-4.39 6.64v5.52h7.11c4.16-3.83 6.56-9.47 6.56-16.17z" />
    <path fill="#34A853" d="M24 46c5.94 0 10.92-1.97 14.56-5.33l-7.11-5.52c-1.97 1.32-4.49 2.1-7.45 2.1-5.73 0-10.58-3.87-12.31-9.07H4.34v5.7C7.96 41.07 15.4 46 24 46z" />
    <path fill="#FBBC05" d="M11.69 28.18C11.25 26.86 11 25.45 11 24s.25-2.86.69-4.18v-5.7H4.34C2.85 17.09 2 20.45 2 24s.85 6.91 2.34 9.88l7.35-5.7z" />
    <path fill="#EA4335" d="M24 10.75c3.23 0 6.13 1.11 8.41 3.29l6.31-6.31C34.91 4.18 29.93 2 24 2 15.4 2 7.96 6.93 4.34 14.12l7.35 5.7c1.73-5.2 6.58-9.07 12.31-9.07z" />
  </svg>
}

export function postLoginDestination(authorities: string[]) {
  if (authorities.includes('DASHBOARD_VIEW')) return '/admin'
  const firstAdminRoute = [
    ['CATEGORY_MANAGE', '/admin/categories'], ['PRODUCT_MANAGE', '/admin/products'],
    ['FRAME_MANAGE', '/admin/frames'], ['ORDER_MANAGE', '/admin/orders'],
  ].find(([permission]) => authorities.includes(permission))
  return firstAdminRoute?.[1] ?? '/account'
}

export function AuthPage() {
  const { signIn, signUp } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [mode, setMode] = useState<Mode>('login')
  const [notice, setNotice] = useState<Notice>(null)
  const [submitting, setSubmitting] = useState(false)
  const [registration, setRegistration] = useState(emptyRegistration)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setNotice(null)
    const form = new FormData(event.currentTarget)
    const email = String(form.get('email') ?? '').trim()
    const password = String(form.get('password') ?? '')

    if (mode === 'register' && password.length < 12) {
      setNotice({ kind: 'error', text: 'Mật khẩu phải có ít nhất 12 ký tự.' })
      return
    }
    if (mode === 'register' && password !== registration.confirmPassword) {
      setNotice({ kind: 'error', text: 'Mật khẩu xác nhận chưa khớp.' })
      return
    }

    setSubmitting(true)
    try {
      const session = mode === 'login'
        ? await signIn({ email, password })
        : await signUp({ email, password, firstName: registration.firstName.trim(), lastName: registration.lastName.trim(), phone: registration.phone.trim() || undefined })
      const requestedPath = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname
      navigate(requestedPath || postLoginDestination(session.authorities), { replace: true })
    } catch (error) {
      setNotice({ kind: 'error', text: error instanceof Error ? error.message : 'Đã có lỗi xảy ra. Vui lòng thử lại.' })
    } finally {
      setSubmitting(false)
    }
  }

  async function handleForgotSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setNotice(null)
    const email = String(new FormData(event.currentTarget).get('email') ?? '').trim()

    setSubmitting(true)
    try {
      await requestPasswordReset(email)
      // Máy chủ luôn trả về 200 để không lộ email nào đã đăng ký, nên thông báo ở đây
      // cũng phải trung lập.
      setNotice({ kind: 'success', text: `Nếu ${email} có tài khoản, chúng tôi vừa gửi liên kết đặt lại mật khẩu. Liên kết hết hạn sau 30 phút; nhớ xem cả hộp thư rác.` })
    } catch (error) {
      setNotice({ kind: 'error', text: error instanceof Error ? error.message : 'Không thể gửi liên kết đặt lại mật khẩu.' })
    } finally {
      setSubmitting(false)
    }
  }

  function selectMode(nextMode: Mode) {
    setMode(nextMode)
    setNotice(null)
  }

  if (mode === 'forgot') {
    return <AuthShell>
      <section className="auth-card" aria-labelledby="auth-title">
        <header className="auth-card__header"><p className="eyebrow">KHÔI PHỤC TÀI KHOẢN</p><h2 id="auth-title">Quên mật khẩu</h2><p>Nhập email bạn đã đăng ký. Chúng tôi sẽ gửi một liên kết để bạn đặt mật khẩu mới.</p></header>
        {notice && <div className={`notice notice--${notice.kind === 'success' ? 'success' : 'error'}`} role="status">{notice.text}</div>}
        <form className="auth-form" onSubmit={(event) => void handleForgotSubmit(event)}>
          <label>Email<input type="email" name="email" autoComplete="email" placeholder="ban@example.com" required /></label>
          <button className="primary-button" type="submit" disabled={submitting}>{submitting ? 'Đang gửi…' : 'Gửi liên kết đặt lại'}</button>
        </form>
        <p className="switch-copy">Nhớ ra mật khẩu rồi?<button type="button" onClick={() => selectMode('login')}>Quay lại đăng nhập</button></p>
      </section>
    </AuthShell>
  }

  return <AuthShell>
    <section className="auth-card" aria-labelledby="auth-title"><div className="mode-switch" role="tablist" aria-label="Chọn hình thức xác thực"><button type="button" role="tab" aria-selected={mode === 'login'} className={mode === 'login' ? 'is-active' : ''} onClick={() => selectMode('login')}>Đăng nhập</button><button type="button" role="tab" aria-selected={mode === 'register'} className={mode === 'register' ? 'is-active' : ''} onClick={() => selectMode('register')}>Đăng ký</button></div>
      <header className="auth-card__header"><p className="eyebrow">{mode === 'login' ? 'CHÀO MỪNG BẠN TRỞ LẠI' : 'BẮT ĐẦU HÀNH TRÌNH'}</p><h2 id="auth-title">{mode === 'login' ? 'Đăng nhập tài khoản' : 'Tạo tài khoản mới'}</h2><p>{mode === 'login' ? 'Nhập thông tin của bạn để tiếp tục.' : 'Chỉ mất một phút để tham gia cùng chúng tôi.'}</p></header>
      {notice && <div className={`notice notice--${notice.kind === 'success' ? 'success' : 'error'}`} role="status">{notice.text}</div>}
      <form className="auth-form" onSubmit={(event) => void handleSubmit(event)}>{mode === 'register' && <div className="form-row"><label>Họ<input required autoComplete="family-name" value={registration.lastName} onChange={(event) => setRegistration({ ...registration, lastName: event.target.value })} placeholder="Nguyễn" /></label><label>Tên<input required autoComplete="given-name" value={registration.firstName} onChange={(event) => setRegistration({ ...registration, firstName: event.target.value })} placeholder="An" /></label></div>}<label>Email<input type="email" name="email" autoComplete="email" placeholder="ban@example.com" required /></label>{mode === 'register' && <label>Số điện thoại <em>(không bắt buộc)</em><input type="tel" autoComplete="tel" value={registration.phone} onChange={(event) => setRegistration({ ...registration, phone: event.target.value })} placeholder="090 000 0000" /></label>}<label>Mật khẩu<input type="password" name="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} minLength={mode === 'register' ? 12 : undefined} placeholder="••••••••••••" required /></label>{mode === 'login' && <button type="button" className="forgot-link" onClick={() => selectMode('forgot')}>Quên mật khẩu?</button>}{mode === 'register' && <label>Xác nhận mật khẩu<input type="password" autoComplete="new-password" minLength={12} value={registration.confirmPassword} onChange={(event) => setRegistration({ ...registration, confirmPassword: event.target.value })} placeholder="••••••••••••" required /></label>}{mode === 'register' && <p className="password-hint">Tối thiểu 12 ký tự để bảo vệ tài khoản của bạn.</p>}<button className="primary-button" type="submit" disabled={submitting}>{submitting ? 'Đang xử lý…' : mode === 'login' ? 'Đăng nhập' : 'Tạo tài khoản'}</button></form>
      {isGoogleSignInAvailable() && <>
        <div className="auth-divider"><span>hoặc</span></div>
        <button type="button" className="google-button" onClick={() => { window.location.href = beginGoogleSignIn() }}><GoogleMark />Tiếp tục với Google</button>
      </>}
      <p className="switch-copy">{mode === 'login' ? 'Chưa có tài khoản?' : 'Đã có tài khoản?'}<button type="button" onClick={() => selectMode(mode === 'login' ? 'register' : 'login')}>{mode === 'login' ? 'Đăng ký ngay' : 'Đăng nhập'}</button></p>
    </section>
  </AuthShell>
}
