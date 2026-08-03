import { useState, type FormEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

type Mode = 'login' | 'register'
type Notice = { kind: 'error'; text: string } | null

const emptyRegistration = { firstName: '', lastName: '', phone: '', confirmPassword: '' }

function destination(authorities: string[]) {
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
      navigate(requestedPath || destination(session.authorities), { replace: true })
    } catch (error) {
      setNotice({ kind: 'error', text: error instanceof Error ? error.message : 'Đã có lỗi xảy ra. Vui lòng thử lại.' })
    } finally {
      setSubmitting(false)
    }
  }

  function selectMode(nextMode: Mode) {
    setMode(nextMode)
    setNotice(null)
  }

  return <main className="auth-page"><section className="auth-shell">
    <aside className="brand-panel"><div className="brand-panel__orb brand-panel__orb--top" /><div className="brand-panel__orb brand-panel__orb--bottom" />
      <div className="brand">TB<span>.</span></div><div className="brand-panel__content"><p className="eyebrow">TRANH BUSINESS STORE</p><h1>Nơi mỗi bức tranh tìm được không gian của mình.</h1><p className="brand-panel__lead">Lưu tác phẩm yêu thích, theo dõi đơn hàng và quản lý trải nghiệm mua tranh trong một tài khoản.</p><ul className="benefit-list"><li><span>01</span>Danh sách yêu thích cá nhân</li><li><span>02</span>Theo dõi đơn hàng minh bạch</li><li><span>03</span>Đặt tranh theo yêu cầu</li></ul></div><p className="brand-panel__footer">Nghệ thuật dành cho không gian sống.</p>
    </aside>
    <section className="auth-card" aria-labelledby="auth-title"><div className="mode-switch" role="tablist" aria-label="Chọn hình thức xác thực"><button type="button" role="tab" aria-selected={mode === 'login'} className={mode === 'login' ? 'is-active' : ''} onClick={() => selectMode('login')}>Đăng nhập</button><button type="button" role="tab" aria-selected={mode === 'register'} className={mode === 'register' ? 'is-active' : ''} onClick={() => selectMode('register')}>Đăng ký</button></div>
      <header className="auth-card__header"><p className="eyebrow">{mode === 'login' ? 'CHÀO MỪNG BẠN TRỞ LẠI' : 'BẮT ĐẦU HÀNH TRÌNH'}</p><h2 id="auth-title">{mode === 'login' ? 'Đăng nhập tài khoản' : 'Tạo tài khoản mới'}</h2><p>{mode === 'login' ? 'Nhập thông tin của bạn để tiếp tục.' : 'Chỉ mất một phút để tham gia cùng chúng tôi.'}</p></header>
      {notice && <div className="notice notice--error" role="status">{notice.text}</div>}
      <form className="auth-form" onSubmit={(event) => void handleSubmit(event)}>{mode === 'register' && <div className="form-row"><label>Họ<input required autoComplete="family-name" value={registration.lastName} onChange={(event) => setRegistration({ ...registration, lastName: event.target.value })} placeholder="Nguyễn" /></label><label>Tên<input required autoComplete="given-name" value={registration.firstName} onChange={(event) => setRegistration({ ...registration, firstName: event.target.value })} placeholder="An" /></label></div>}<label>Email<input type="email" name="email" autoComplete="email" placeholder="ban@example.com" required /></label>{mode === 'register' && <label>Số điện thoại <em>(không bắt buộc)</em><input type="tel" autoComplete="tel" value={registration.phone} onChange={(event) => setRegistration({ ...registration, phone: event.target.value })} placeholder="090 000 0000" /></label>}<label>Mật khẩu<input type="password" name="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} minLength={mode === 'register' ? 12 : undefined} placeholder="••••••••••••" required /></label>{mode === 'register' && <label>Xác nhận mật khẩu<input type="password" autoComplete="new-password" minLength={12} value={registration.confirmPassword} onChange={(event) => setRegistration({ ...registration, confirmPassword: event.target.value })} placeholder="••••••••••••" required /></label>}{mode === 'register' && <p className="password-hint">Tối thiểu 12 ký tự để bảo vệ tài khoản của bạn.</p>}<button className="primary-button" type="submit" disabled={submitting}>{submitting ? 'Đang xử lý…' : mode === 'login' ? 'Đăng nhập' : 'Tạo tài khoản'}</button></form>
      <p className="switch-copy">{mode === 'login' ? 'Chưa có tài khoản?' : 'Đã có tài khoản?'}<button type="button" onClick={() => selectMode(mode === 'login' ? 'register' : 'login')}>{mode === 'login' ? 'Đăng ký ngay' : 'Đăng nhập'}</button></p>
    </section>
  </section></main>
}
