import type { ReactNode } from 'react'

/**
 * Khung chung của các trang xác thực. Trang đăng nhập và trang đặt lại mật khẩu dùng
 * cùng một tấm nền thương hiệu; chỉ phần thẻ bên phải là khác nhau.
 */
export function AuthShell({ children }: { children: ReactNode }) {
  return <main className="auth-page"><section className="auth-shell">
    <aside className="brand-panel"><div className="brand-panel__orb brand-panel__orb--top" /><div className="brand-panel__orb brand-panel__orb--bottom" />
      <div className="brand">TB<span>.</span></div><div className="brand-panel__content"><p className="eyebrow">TRANH BUSINESS STORE</p><h1>Nơi mỗi bức tranh tìm được không gian của mình.</h1><p className="brand-panel__lead">Lưu tác phẩm yêu thích, theo dõi đơn hàng và quản lý trải nghiệm mua tranh trong một tài khoản.</p><ul className="benefit-list"><li><span>01</span>Danh sách yêu thích cá nhân</li><li><span>02</span>Theo dõi đơn hàng minh bạch</li><li><span>03</span>Đặt tranh theo yêu cầu</li></ul></div><p className="brand-panel__footer">Nghệ thuật dành cho không gian sống.</p>
    </aside>
    {children}
  </section></main>
}
