import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

type MenuItem = { to: string; label: string; permission: string; marker: string }

const menuItems: MenuItem[] = [
  { to: '/admin/users', label: 'Nhân sự', permission: 'USER_MANAGE', marker: '10' },
  { to: '/admin/dashboard', label: 'Tổng quan', permission: 'DASHBOARD_VIEW', marker: '01' },
  { to: '/admin/categories', label: 'Danh mục', permission: 'CATEGORY_MANAGE', marker: '02' },
  { to: '/admin/products', label: 'Sản phẩm', permission: 'PRODUCT_MANAGE', marker: '03' },
  { to: '/admin/materials', label: 'Chất liệu', permission: 'PRODUCT_MANAGE', marker: '04' },
  { to: '/admin/art-sizes', label: 'Khổ tranh', permission: 'PRODUCT_MANAGE', marker: '05' },
  { to: '/admin/frames', label: 'Khung tranh', permission: 'FRAME_MANAGE', marker: '05' },
  { to: '/admin/orders', label: 'Đơn hàng', permission: 'ORDER_MANAGE', marker: '06' },
  { to: '/admin/payments', label: 'Thanh toán', permission: 'PAYMENT_MANAGE', marker: '07' },
  { to: '/admin/custom-orders', label: 'Đặt theo yêu cầu', permission: 'CUSTOM_ORDER_MANAGE', marker: '08' },
  { to: '/admin/shipments', label: 'Vận chuyển', permission: 'SHIPMENT_MANAGE', marker: '09' },
  { to: '/admin/promotions', label: 'Khuyến mãi', permission: 'PROMOTION_MANAGE', marker: '10' },
]

export function AdminLayout() {
  const { session, hasPermission, signOut } = useAuth()
  const navigate = useNavigate()
  const visibleItems = menuItems.filter((item) => hasPermission(item.permission))

  async function handleSignOut() {
    await signOut()
    navigate('/auth', { replace: true })
  }

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <NavLink className="admin-brand" to="/admin">TB<span>.</span></NavLink>
        <p className="admin-sidebar__label">QUẢN TRỊ CỬA HÀNG</p>
        <nav className="admin-nav" aria-label="Điều hướng quản trị">
          {visibleItems.map((item) => (
            <NavLink key={item.to} to={item.to}>
              <span>{item.marker}</span>{item.label}
            </NavLink>
          ))}
        </nav>
        <div className="admin-sidebar__user">
          <strong>{session?.firstName || session?.email}</strong>
          <small>{session?.roles.join(' · ')}</small>
          <button type="button" onClick={() => void handleSignOut()}>Đăng xuất</button>
        </div>
      </aside>
      <section className="admin-main">
        <header className="admin-header">
          <div><p className="eyebrow">BUSINESS STORE</p><h1>Không gian quản trị</h1></div>
          <div className="admin-header__account"><span>{session?.firstName?.slice(0, 1) || 'A'}</span><div><strong>{[session?.firstName, session?.lastName].filter(Boolean).join(' ')}</strong><small>{session?.email}</small></div></div>
        </header>
        <main className="admin-content"><Outlet /></main>
      </section>
    </div>
  )
}
