import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { AuthShell } from '../components/AuthShell'
import { useAuth } from '../contexts/AuthContext'
import { consumeGoogleState, googleRedirectUri } from '../api/googleOAuth'
import { postLoginDestination } from './AuthPage'

/**
 * Nơi Google trả người dùng về sau khi họ đồng ý. Trang chỉ đổi authorization code lấy
 * phiên đăng nhập rồi chuyển tiếp; mọi việc kiểm tra code đều nằm ở backend.
 */
export function GoogleCallbackPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { signInWithGoogle } = useAuth()
  const [error, setError] = useState<string | null>(null)
  // React 18 gọi effect hai lần ở chế độ dev, mà authorization code chỉ dùng được một lần.
  const exchanged = useRef(false)

  useEffect(() => {
    if (exchanged.current) return
    exchanged.current = true

    const code = searchParams.get('code')
    const returnedState = searchParams.get('state')
    const googleError = searchParams.get('error')

    if (googleError || !code) {
      setError(googleError === 'access_denied'
        ? 'Bạn đã huỷ đăng nhập bằng Google.'
        : 'Google không trả về mã xác thực. Vui lòng thử lại.')
      return
    }
    // State không khớp nghĩa là lượt đăng nhập này không do trang mình khởi tạo.
    if (!consumeGoogleState(returnedState)) {
      setError('Phiên đăng nhập Google không hợp lệ. Vui lòng bấm lại từ trang đăng nhập.')
      return
    }

    void signInWithGoogle(code, googleRedirectUri())
      .then((session) => navigate(postLoginDestination(session.authorities), { replace: true }))
      // Các lỗi còn lại của API đều là chuyện phía máy chủ (chưa cấu hình OAuth, đổi code
      // thất bại, ID token hỏng) và đã được ghi log ở backend. Người dùng không làm gì được
      // với chi tiết đó, nên chỉ hiện một lối thoát rõ ràng.
      .catch(() => setError('Không đăng nhập được bằng Google. Vui lòng thử lại, hoặc đăng nhập bằng email và mật khẩu.'))
  }, [navigate, searchParams, signInWithGoogle])

  return <AuthShell>
    <section className="auth-card" aria-labelledby="google-title">
      <header className="auth-card__header">
        <p className="eyebrow">ĐĂNG NHẬP BẰNG GOOGLE</p>
        <h2 id="google-title">{error ? 'Không hoàn tất được' : 'Đang xác thực…'}</h2>
        <p>{error ?? 'Đang kết nối tài khoản Google của bạn với Bubble Memories.'}</p>
      </header>
      {error && <>
        <div className="notice notice--error" role="alert">{error}</div>
        <Link className="primary-button" to="/auth" style={{ display: 'inline-block', textAlign: 'center', textDecoration: 'none' }}>Quay lại đăng nhập</Link>
      </>}
    </section>
  </AuthShell>
}
