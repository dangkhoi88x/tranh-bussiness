import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useAdminOrderNotifications } from '../contexts/AdminOrderNotificationContext';

type MenuItem = { to: string; label: string; permission: string; marker: string };

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
  { to: '/admin/photobooks', label: 'Photobook', permission: 'CUSTOM_ORDER_MANAGE', marker: '08' },
  { to: '/admin/photobook-templates', label: 'Chủ đề photobook', permission: 'PRODUCT_MANAGE', marker: '04' },
  { to: '/admin/shipments', label: 'Vận chuyển', permission: 'SHIPMENT_MANAGE', marker: '09' },
  { to: '/admin/promotions', label: 'Khuyến mãi', permission: 'PROMOTION_MANAGE', marker: '10' },
];

export function AdminLayout() {
  const { session, hasPermission, signOut } = useAuth();
  const { newOrderCount, latestOrder, soundEnabled, enableSound, clearNewOrders } = useAdminOrderNotifications();
  const navigate = useNavigate();
  const visibleItems = menuItems.filter((item) => hasPermission(item.permission));

  async function handleSignOut() {
    await signOut();
    navigate('/auth', { replace: true });
  }

  function openNewOrders() {
    clearNewOrders();
    navigate('/admin/orders');
  }

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <NavLink className="admin-brand" to="/admin">
          TB<span>.</span>
        </NavLink>
        <p className="admin-sidebar__label">QUẢN TRỊ CỬA HÀNG</p>
        <nav className="admin-nav" aria-label="Điều hướng quản trị">
          {visibleItems.map((item) => (
            <NavLink key={item.to} to={item.to}>
              <span>{item.marker}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="admin-sidebar__user">
          <strong>{session?.firstName || session?.email}</strong>
          <small>{session?.roles.join(' · ')}</small>
          <button type="button" onClick={() => void handleSignOut()}>
            Đăng xuất
          </button>
        </div>
      </aside>
      <section className="admin-main">
        <header className="admin-header">
          <div>
            <p className="eyebrow">BUSINESS STORE</p>
            <h1>Không gian quản trị</h1>
          </div>
          <div className="admin-header__actions">
            {hasPermission('ORDER_MANAGE') && (
              <>
                <button
                  type="button"
                  className="admin-sound-button"
                  aria-pressed={soundEnabled}
                  onClick={() => void enableSound()}
                >
                  {soundEnabled ? 'Âm báo bật' : 'Bật âm báo'}
                </button>
                <button
                  type="button"
                  className="admin-order-bell"
                  onClick={openNewOrders}
                  aria-label={newOrderCount ? `${newOrderCount} đơn hàng mới` : 'Không có đơn hàng mới'}
                  title="Đơn hàng mới"
                >
                  <svg
                    width="19"
                    height="19"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M18 10a6 6 0 0 0-12 0c0 7-2.5 7-2.5 9h17c0-2-2.5-2-2.5-9" />
                    <path d="M10 22h4" />
                  </svg>
                  {newOrderCount > 0 && <span aria-hidden="true">{newOrderCount > 99 ? '99+' : newOrderCount}</span>}
                </button>
              </>
            )}
            <div className="admin-header__account">
              <span>{session?.firstName?.slice(0, 1) || 'A'}</span>
              <div>
                <strong>{[session?.firstName, session?.lastName].filter(Boolean).join(' ')}</strong>
                <small>{session?.email}</small>
              </div>
            </div>
          </div>
        </header>
        {latestOrder && newOrderCount > 0 && (
          <button type="button" className="admin-order-toast" onClick={openNewOrders} aria-live="polite">
            <span>Đơn hàng mới</span>
            <strong>{latestOrder.orderCode}</strong>
            <small>
              {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(
                latestOrder.totalAmount,
              )}{' '}
              · Xem danh sách đơn →
            </small>
          </button>
        )}
        <main className="admin-content">
          <Outlet />
        </main>
      </section>
    </div>
  );
}
