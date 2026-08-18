import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { AuthShell } from '../components/AuthShell';
import { resetPassword } from '../api/auth';

// Khớp với ResetPasswordRequest ở backend: mật khẩu ngoài khoảng này bị từ chối ở API.
const MIN_PASSWORD_LENGTH = 12;
const MAX_PASSWORD_LENGTH = 72;

type Notice = { kind: 'error' | 'success'; text: string } | null;

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') ?? '';
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [notice, setNotice] = useState<Notice>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice(null);

    if (password.length < MIN_PASSWORD_LENGTH || password.length > MAX_PASSWORD_LENGTH) {
      setNotice({ kind: 'error', text: `Mật khẩu phải từ ${MIN_PASSWORD_LENGTH} đến ${MAX_PASSWORD_LENGTH} ký tự.` });
      return;
    }
    if (password !== confirmPassword) {
      setNotice({ kind: 'error', text: 'Mật khẩu xác nhận chưa khớp.' });
      return;
    }

    setSubmitting(true);
    try {
      await resetPassword(token, password);
      // Backend thu hồi mọi refresh token của tài khoản, nên mọi phiên cũ đã bị đăng
      // xuất; người dùng phải đăng nhập lại bằng mật khẩu mới.
      setDone(true);
      setNotice({ kind: 'success', text: 'Đã đổi mật khẩu. Mọi thiết bị đang đăng nhập đều đã bị đăng xuất.' });
      window.setTimeout(() => navigate('/auth', { replace: true }), 2500);
    } catch (error) {
      setNotice({ kind: 'error', text: error instanceof Error ? error.message : 'Không thể đặt lại mật khẩu.' });
    } finally {
      setSubmitting(false);
    }
  }

  // Vào thẳng URL mà không có token thì không có gì để đặt lại; mời người dùng xin liên
  // kết mới thay vì hiện một form chắc chắn thất bại.
  if (!token) {
    return (
      <AuthShell>
        <section className="auth-card" aria-labelledby="reset-title">
          <header className="auth-card__header">
            <p className="eyebrow">KHÔI PHỤC TÀI KHOẢN</p>
            <h2 id="reset-title">Liên kết không hợp lệ</h2>
            <p>Liên kết đặt lại mật khẩu thiếu mã xác thực. Hãy yêu cầu một liên kết mới rồi mở lại từ email.</p>
          </header>
          <Link
            className="primary-button"
            to="/auth"
            style={{ display: 'inline-block', textAlign: 'center', textDecoration: 'none' }}
          >
            Yêu cầu liên kết mới
          </Link>
        </section>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <section className="auth-card" aria-labelledby="reset-title">
        <header className="auth-card__header">
          <p className="eyebrow">KHÔI PHỤC TÀI KHOẢN</p>
          <h2 id="reset-title">Đặt mật khẩu mới</h2>
          <p>Chọn một mật khẩu mới cho tài khoản của bạn.</p>
        </header>
        {notice && (
          <div className={`notice notice--${notice.kind === 'success' ? 'success' : 'error'}`} role="status">
            {notice.text}
          </div>
        )}
        {!done && (
          <form className="auth-form" onSubmit={(event) => void handleSubmit(event)}>
            <label>
              Mật khẩu mới
              <input
                type="password"
                autoComplete="new-password"
                minLength={MIN_PASSWORD_LENGTH}
                maxLength={MAX_PASSWORD_LENGTH}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="••••••••••••"
                required
              />
            </label>
            <label>
              Xác nhận mật khẩu
              <input
                type="password"
                autoComplete="new-password"
                minLength={MIN_PASSWORD_LENGTH}
                maxLength={MAX_PASSWORD_LENGTH}
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder="••••••••••••"
                required
              />
            </label>
            <p className="password-hint">Tối thiểu {MIN_PASSWORD_LENGTH} ký tự để bảo vệ tài khoản của bạn.</p>
            <button className="primary-button" type="submit" disabled={submitting}>
              {submitting ? 'Đang đặt lại…' : 'Đặt mật khẩu mới'}
            </button>
          </form>
        )}
        <p className="switch-copy">
          {done ? 'Đang chuyển tới trang đăng nhập…' : 'Liên kết đã hết hạn?'}
          {!done && (
            <Link to="/auth" style={{ marginLeft: 7, color: '#8b392f', fontWeight: 800 }}>
              Xin liên kết mới
            </Link>
          )}
        </p>
      </section>
    </AuthShell>
  );
}
