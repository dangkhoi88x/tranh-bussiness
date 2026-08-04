import { useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { apiRequest } from '../api/http'

const permissions = [
  ['DASHBOARD_VIEW', '/admin/dashboard'], ['CATEGORY_MANAGE', '/admin/categories'], ['PRODUCT_MANAGE', '/admin/products'],
  ['FRAME_MANAGE', '/admin/frames'], ['ORDER_MANAGE', '/admin/orders'], ['PAYMENT_MANAGE', '/admin/payments'],
  ['CUSTOM_ORDER_MANAGE', '/admin/custom-orders'], ['SHIPMENT_MANAGE', '/admin/shipments'], ['PROMOTION_MANAGE', '/admin/promotions'],
]

type DashboardData = {
  from: string; to: string; revenue: number; orderCount: number; ordersToProcess: number; pendingCodAmount: number; pendingCodCount: number; lowStockCount: number; lowStockThreshold: number
  dailyMetrics: { date: string; orderCount: number; revenue: number }[]
  orderStatuses: { status: string; count: number }[]
  lowStockItems: { productId: string; productName: string; categoryName: string; variantId: string | null; variantSku: string | null; variantName: string | null; material: string | null; widthCm: number | null; heightCm: number | null; stockQuantity: number }[]
}

const money = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 })
function dateInput(offset: number) { const date = new Date(); date.setHours(12, 0, 0, 0); date.setDate(date.getDate() + offset); return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 10) }
function formatDate(value: string) { return new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium' }).format(new Date(`${value}T00:00:00`)) }
function shortDate(value: string) { return new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit' }).format(new Date(`${value}T00:00:00`)) }

export function AdminIndex() {
  const { hasPermission } = useAuth()
  return <Navigate to={permissions.find(([permission]) => hasPermission(permission))?.[1] ?? '/403'} replace />
}

export function AdminDashboard() {
  const initialTo = dateInput(0)
  const initialFrom = dateInput(-29)
  const [from, setFrom] = useState(initialFrom)
  const [to, setTo] = useState(initialTo)
  const [range, setRange] = useState({ from: initialFrom, to: initialTo })
  const [data, setData] = useState<DashboardData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true); setError(null)
    try { setData(await apiRequest<DashboardData>(`/dashboard?from=${range.from}&to=${range.to}`)) }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Không thể tải số liệu dashboard.') }
    finally { setLoading(false) }
  }
  useEffect(() => { void load() }, [range.from, range.to])

  const maxRevenue = Math.max(...(data?.dailyMetrics.map((item) => item.revenue) ?? [0]), 1)
  const maxOrders = Math.max(...(data?.dailyMetrics.map((item) => item.orderCount) ?? [0]), 1)
  const middleMetric = data?.dailyMetrics[Math.floor((data?.dailyMetrics.length ?? 0) / 2)]
  const lastMetric = data?.dailyMetrics[data.dailyMetrics.length - 1]
  return <>
    <header className="catalog-header dashboard-header"><div><p className="eyebrow">TỔNG QUAN</p><h2>Hiệu quả vận hành</h2><p>Doanh thu chỉ tính các khoản COD đã thu thành công; đơn và trạng thái tính theo ngày tạo đơn.</p></div><form className="dashboard-range" onSubmit={(event) => { event.preventDefault(); setRange({ from, to }) }}><label>Từ ngày<input type="date" value={from} max={to} onChange={(event) => setFrom(event.target.value)} required /></label><label>Đến ngày<input type="date" value={to} min={from} max={initialTo} onChange={(event) => setTo(event.target.value)} required /></label><button className="primary-button compact">Áp dụng</button></form></header>
    {error && <p className="form-error dashboard-message">{error}</p>}
    {loading && !data ? <section className="catalog-panel"><p className="table-loading">Đang tổng hợp số liệu…</p></section> : data && <>
      <section className="dashboard-metrics">
        <MetricCard label="Doanh thu đã thu" value={money.format(data.revenue)} note={`${formatDate(data.from)} – ${formatDate(data.to)}`} tone="revenue" />
        <MetricCard label="Đơn hàng tạo mới" value={String(data.orderCount)} note="Bao gồm cả đơn đã hủy" link="/admin/orders" />
        <MetricCard label="Cần xử lý" value={String(data.ordersToProcess)} note="Chờ xác nhận, xử lý sản xuất" tone="attention" link="/admin/orders" />
        <MetricCard label="COD chờ thu" value={money.format(data.pendingCodAmount)} note={`${data.pendingCodCount} khoản đang chờ`} tone="attention" link="/admin/payments" />
        <MetricCard label="Sắp hết hàng" value={String(data.lowStockCount)} note={`Tồn kho ≤ ${data.lowStockThreshold} theo SKU hoặc sản phẩm gốc`} tone="danger" link="/admin/products" />
      </section>
      <section className="dashboard-grid">
        <section className="catalog-panel dashboard-card dashboard-card--chart"><header className="panel-heading"><div><h3>Doanh thu và đơn theo ngày</h3><p>{data.dailyMetrics.length} ngày trong khoảng đang chọn.</p></div><span className="dashboard-legend"><i /> Doanh thu <b /> Đơn hàng</span></header><div className="daily-chart" aria-label="Biểu đồ doanh thu và số đơn theo ngày">{data.dailyMetrics.map((item) => <div className="daily-chart__item" key={item.date} title={`${formatDate(item.date)}: ${money.format(item.revenue)} · ${item.orderCount} đơn`}><span className="daily-chart__revenue" style={{ height: `${Math.max(5, item.revenue / maxRevenue * 100)}%` }} /><span className="daily-chart__orders" style={{ height: `${Math.max(4, item.orderCount / maxOrders * 100)}%` }} /></div>)}</div><div className="daily-chart__labels"><span>{data.dailyMetrics[0] && shortDate(data.dailyMetrics[0].date)}</span><span>{middleMetric && shortDate(middleMetric.date)}</span><span>{lastMetric && shortDate(lastMetric.date)}</span></div></section>
        <section className="catalog-panel dashboard-card"><header className="panel-heading"><div><h3>Trạng thái đơn</h3><p>Đơn được tạo trong khoảng đã chọn.</p></div><Link className="dashboard-link" to="/admin/orders">Mở đơn hàng</Link></header><div className="status-summary">{data.orderStatuses.map((item) => <div key={item.status}><span className={`status status--${item.status.toLowerCase()}`}>{item.status}</span><strong>{item.count}</strong></div>)}</div></section>
        <section className="catalog-panel dashboard-card dashboard-card--wide"><header className="panel-heading"><div><h3>Mặt hàng cần kiểm tra tồn kho</h3><p>Variant hiển thị theo SKU, size và chất liệu; sản phẩm không có variant dùng tồn kho gốc.</p></div><Link className="dashboard-link" to="/admin/products">Quản lý sản phẩm</Link></header>{data.lowStockItems.length > 0 ? <table className="data-table"><thead><tr><th>Sản phẩm / variant</th><th>Danh mục</th><th>Tồn kho</th><th /></tr></thead><tbody>{data.lowStockItems.map((item) => <tr key={item.variantId ?? item.productId}><td><strong>{item.productName}</strong><small>{item.variantId ? [item.variantSku, item.variantName, item.widthCm && item.heightCm ? `${item.widthCm} × ${item.heightCm} cm` : null, item.material].filter(Boolean).join(' · ') : 'Sản phẩm không có variant'}</small></td><td>{item.categoryName}</td><td><span className={`stock-pill${item.stockQuantity === 0 ? ' stock-pill--empty' : ''}`}>{item.stockQuantity}</span></td><td><Link className="dashboard-link" to={`/admin/products/${item.productId}`}>Mở chi tiết</Link></td></tr>)}</tbody></table> : <p className="empty-state">Không có sản phẩm PUBLISHED hoặc variant khả dụng nào sắp hết hàng.</p>}</section>
      </section>
    </>}
  </>
}

function MetricCard({ label, value, note, tone, link }: { label: string; value: string; note: string; tone?: string; link?: string }) {
  const inner = <><span>{label}</span><strong>{value}</strong><small>{note}</small></>
  return link ? <Link className={`metric-card${tone ? ` metric-card--${tone}` : ''}`} to={link}>{inner}</Link> : <div className={`metric-card${tone ? ` metric-card--${tone}` : ''}`}>{inner}</div>
}

export function ForbiddenPage() {
  return <main className="forbidden-page"><p className="eyebrow">403 — KHÔNG ĐỦ QUYỀN</p><h1>Bạn không có quyền mở khu vực này.</h1><p>Hãy đăng nhập bằng tài khoản có permission phù hợp, hoặc quay lại trang quản trị được cấp quyền.</p></main>
}

export function AccountPage() {
  const { session, signOut } = useAuth()
  return <main className="account-page"><section className="account-card"><p className="eyebrow">TÀI KHOẢN</p><span className="account-card__seal">✓</span><h1>Chào {session?.firstName || session?.email}!</h1><p>Tài khoản của bạn đã đăng nhập thành công. Khu vực mua hàng sẽ được triển khai tiếp theo.</p><button className="secondary-button" type="button" onClick={() => void signOut()}>Đăng xuất</button></section></main>
}
