import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiRequest } from '../api/http'

type Page<T> = { items: T[]; page: number; size: number; totalElements: number; totalPages: number; hasNext: boolean }
type OrderStatus = 'PENDING' | 'CONFIRMED' | 'PROCESSING' | 'SHIPPING' | 'DELIVERY_FAILED' | 'DELIVERED' | 'CANCELLED'
type PaymentStatus = 'PENDING' | 'SUCCESS' | 'CANCELLED'
type Order = { id: string; orderCode: string; status: OrderStatus; totalAmount: number; promotionCode: string | null; items: unknown[]; customDetails: unknown | null; createdAt: string }
type Payment = { id: string; orderId: string; orderCode: string; amount: number; method: 'COD'; status: PaymentStatus; transactionCode: string; paidAt: string | null; createdAt: string }

const money = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 })
const dateTime = new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium', timeStyle: 'short' })
const errorText = (error: unknown) => error instanceof Error ? error.message : 'Đã có lỗi xảy ra.'
const stateClass = (status: string) => `status status--${status.toLowerCase()}`

function Pagination({ data, onPage }: { data: Page<unknown> | null; onPage: (page: number) => void }) {
  if (!data || data.totalPages <= 1) return null
  return <div className="pagination"><button disabled={data.page <= 1} onClick={() => onPage(data.page - 1)}>← Trước</button><span>Trang {data.page}/{data.totalPages} · {data.totalElements} bản ghi</span><button disabled={!data.hasNext} onClick={() => onPage(data.page + 1)}>Sau →</button></div>
}

function Header({ title, description }: { title: string; description: string }) { return <header className="catalog-header"><div><p className="eyebrow">VẬN HÀNH</p><h2>{title}</h2><p>{description}</p></div></header> }
function Panel({ children }: { children: React.ReactNode }) { return <section className="catalog-panel">{children}</section> }

export function OrdersSearchPage() {
  const navigate = useNavigate()
  const [data, setData] = useState<Page<Order> | null>(null)
  const [page, setPage] = useState(1)
  const [filters, setFilters] = useState({ orderCode: '', status: '', customer: '', createdFrom: '', createdTo: '' })
  const [draft, setDraft] = useState(filters)
  const [message, setMessage] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const query = useMemo(() => {
    const value = new URLSearchParams({ page: String(page), size: '15' })
    Object.entries(filters).forEach(([key, item]) => { if (item) value.set(key, item) })
    return value.toString()
  }, [filters, page])
  async function load() { setLoading(true); try { setData(await apiRequest<Page<Order>>(`/orders?${query}`)) } catch (error) { setMessage(errorText(error)) } finally { setLoading(false) } }
  useEffect(() => { void load() }, [query])
  function submit(event: FormEvent) { event.preventDefault(); setPage(1); setFilters(draft) }
  function reset() { const empty = { orderCode: '', status: '', customer: '', createdFrom: '', createdTo: '' }; setDraft(empty); setFilters(empty); setPage(1) }
  return <><Header title="Đơn hàng" description="Tìm nhanh theo mã đơn, khách hàng, trạng thái và thời điểm tạo." />{message && <p className="catalog-message">{message}</p>}<Panel><form className="operations-filters" onSubmit={submit}><label>Mã đơn<input value={draft.orderCode} placeholder="ART-..." onChange={(event) => setDraft({ ...draft, orderCode: event.target.value })} /></label><label>Khách hàng<input value={draft.customer} placeholder="Tên hoặc email" onChange={(event) => setDraft({ ...draft, customer: event.target.value })} /></label><label>Trạng thái<select value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value })}><option value="">Tất cả</option>{(['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPING', 'DELIVERY_FAILED', 'DELIVERED', 'CANCELLED'] as OrderStatus[]).map((item) => <option key={item}>{item}</option>)}</select></label><label>Từ ngày<input type="date" value={draft.createdFrom} onChange={(event) => setDraft({ ...draft, createdFrom: event.target.value })} /></label><label>Đến ngày<input type="date" value={draft.createdTo} onChange={(event) => setDraft({ ...draft, createdTo: event.target.value })} /></label><button className="primary-button compact">Tìm kiếm</button><button type="button" className="filter-reset" onClick={reset}>Xóa lọc</button></form>{loading ? <p className="table-loading">Đang tải đơn hàng…</p> : <><table className="data-table"><thead><tr><th>Mã đơn</th><th>Thời gian</th><th>Thanh toán</th><th>Tổng tiền</th><th>Trạng thái</th><th /></tr></thead><tbody>{data?.items.map((order) => <tr key={order.id}><td><strong>{order.orderCode}</strong><small>{order.items.length} sản phẩm{order.customDetails ? ' · Đơn theo yêu cầu' : ''}</small></td><td>{dateTime.format(new Date(order.createdAt))}</td><td>{order.promotionCode ? `Mã ${order.promotionCode}` : '—'}</td><td>{money.format(order.totalAmount)}</td><td><span className={stateClass(order.status)}>{order.status}</span></td><td className="table-actions"><button onClick={() => navigate(`/admin/orders/${order.id}`)}>Chi tiết</button></td></tr>)}</tbody></table>{data?.items.length === 0 && <p className="empty-state">Không tìm thấy đơn hàng phù hợp.</p>}<Pagination data={data} onPage={setPage} /></>}</Panel></>
}

export function PaymentsSearchPage() {
  const [data, setData] = useState<Page<Payment> | null>(null)
  const [page, setPage] = useState(1)
  const [filters, setFilters] = useState({ status: '', orderCode: '', createdFrom: '', createdTo: '' })
  const [draft, setDraft] = useState(filters)
  const [message, setMessage] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const query = useMemo(() => { const value = new URLSearchParams({ page: String(page), size: '20' }); Object.entries(filters).forEach(([key, item]) => { if (item) value.set(key, item) }); return value.toString() }, [filters, page])
  async function load() { setLoading(true); try { setData(await apiRequest<Page<Payment>>(`/payments?${query}`)) } catch (error) { setMessage(errorText(error)) } finally { setLoading(false) } }
  useEffect(() => { void load() }, [query])
  function submit(event: FormEvent) { event.preventDefault(); setPage(1); setFilters(draft) }
  function reset() { const empty = { status: '', orderCode: '', createdFrom: '', createdTo: '' }; setDraft(empty); setFilters(empty); setPage(1) }
  async function confirm(item: Payment) { if (!window.confirm(`Xác nhận đã thu COD cho ${item.orderCode}?`)) return; try { await apiRequest(`/payments/${item.id}/cod/confirm`, { method: 'PUT' }); setMessage('Đã xác nhận thanh toán COD.'); void load() } catch (error) { setMessage(errorText(error)) } }
  return <><Header title="Thanh toán COD" description="Lọc theo trạng thái, ngày tạo và mã đơn để kiểm soát các khoản phải thu." />{message && <p className="catalog-message">{message}</p>}<Panel><form className="operations-filters operations-filters--payments" onSubmit={submit}><label>Mã đơn<input value={draft.orderCode} placeholder="ART-..." onChange={(event) => setDraft({ ...draft, orderCode: event.target.value })} /></label><label>Trạng thái<select value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value })}><option value="">Tất cả</option>{(['PENDING', 'SUCCESS', 'CANCELLED'] as PaymentStatus[]).map((item) => <option key={item}>{item}</option>)}</select></label><label>Từ ngày<input type="date" value={draft.createdFrom} onChange={(event) => setDraft({ ...draft, createdFrom: event.target.value })} /></label><label>Đến ngày<input type="date" value={draft.createdTo} onChange={(event) => setDraft({ ...draft, createdTo: event.target.value })} /></label><button className="primary-button compact">Tìm kiếm</button><button type="button" className="filter-reset" onClick={reset}>Xóa lọc</button></form>{loading ? <p className="table-loading">Đang tải thanh toán…</p> : <><table className="data-table"><thead><tr><th>Mã giao dịch</th><th>Đơn hàng</th><th>Phương thức</th><th>Số tiền</th><th>Trạng thái</th><th /></tr></thead><tbody>{data?.items.map((item) => <tr key={item.id}><td><strong>{item.transactionCode}</strong><small>{dateTime.format(new Date(item.createdAt))}</small></td><td>{item.orderCode}</td><td>{item.method}</td><td>{money.format(item.amount)}</td><td><span className={stateClass(item.status)}>{item.status}</span></td><td className="table-actions">{item.status === 'PENDING' && <button onClick={() => void confirm(item)}>Xác nhận COD</button>}{item.paidAt && <small>Thu: {dateTime.format(new Date(item.paidAt))}</small>}</td></tr>)}</tbody></table>{data?.items.length === 0 && <p className="empty-state">Không tìm thấy thanh toán phù hợp.</p>}<Pagination data={data} onPage={setPage} /></>}</Panel></>
}
