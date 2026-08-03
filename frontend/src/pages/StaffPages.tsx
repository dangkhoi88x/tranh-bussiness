import { useEffect, useState, type FormEvent } from 'react'
import { apiRequest } from '../api/http'
import { useAuth } from '../contexts/AuthContext'

type Page<T> = { items: T[]; page: number; size: number; totalElements: number; totalPages: number; hasNext: boolean }
type ManagedUser = { id: string; email: string; firstName: string; lastName: string; phone: string | null; enabled: boolean; roles: RoleName[]; createdAt: string }
type RoleName = 'CUSTOMER' | 'STAFF' | 'ADMIN'
type ManagedRole = { name: RoleName; description: string | null; permissionsConfigurable: boolean; permissions: PermissionName[] }
type PermissionName = 'DASHBOARD_VIEW' | 'USER_MANAGE' | 'CATEGORY_MANAGE' | 'PRODUCT_MANAGE' | 'FRAME_MANAGE' | 'ORDER_MANAGE' | 'PAYMENT_MANAGE' | 'CUSTOM_ORDER_MANAGE' | 'SHIPMENT_MANAGE' | 'PROMOTION_MANAGE'

const roles: RoleName[] = ['CUSTOMER', 'STAFF', 'ADMIN']
const permissionLabels: Record<PermissionName, string> = {
  DASHBOARD_VIEW: 'Xem dashboard', USER_MANAGE: 'Quản lý nhân sự', CATEGORY_MANAGE: 'Quản lý danh mục', PRODUCT_MANAGE: 'Quản lý sản phẩm', FRAME_MANAGE: 'Quản lý khung', ORDER_MANAGE: 'Quản lý đơn hàng', PAYMENT_MANAGE: 'Quản lý thanh toán COD', CUSTOM_ORDER_MANAGE: 'Quản lý đơn đặt theo yêu cầu', SHIPMENT_MANAGE: 'Quản lý vận chuyển', PROMOTION_MANAGE: 'Quản lý khuyến mãi',
}
const staffPermissions = (Object.keys(permissionLabels) as PermissionName[]).filter((permission) => permission !== 'USER_MANAGE')
const errorText = (error: unknown) => error instanceof Error ? error.message : 'Đã có lỗi xảy ra.'
const dateTime = new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium', timeStyle: 'short' })

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) { return <div className="modal-backdrop" role="presentation"><section className="modal" role="dialog" aria-modal="true" aria-label={title}><header><h3>{title}</h3><button type="button" className="icon-button" onClick={onClose} aria-label="Đóng">×</button></header>{children}</section></div> }
function Pagination({ data, onPage }: { data: Page<unknown> | null; onPage: (page: number) => void }) { if (!data || data.totalPages <= 1) return null; return <div className="pagination"><button disabled={data.page <= 1} onClick={() => onPage(data.page - 1)}>← Trước</button><span>Trang {data.page}/{data.totalPages} · {data.totalElements} tài khoản</span><button disabled={!data.hasNext} onClick={() => onPage(data.page + 1)}>Sau →</button></div> }

export function StaffPage() {
  const { session } = useAuth()
  const [data, setData] = useState<Page<ManagedUser> | null>(null)
  const [managedRoles, setManagedRoles] = useState<ManagedRole[]>([])
  const [queryInput, setQueryInput] = useState('')
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const [editing, setEditing] = useState<ManagedUser | null>(null)
  const [editingPermissions, setEditingPermissions] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    try {
      const suffix = query ? `&query=${encodeURIComponent(query)}` : ''
      const [users, roleData] = await Promise.all([apiRequest<Page<ManagedUser>>(`/users?page=${page}&size=15${suffix}`), apiRequest<ManagedRole[]>('/users/roles')])
      setData(users); setManagedRoles(roleData)
    } catch (cause) { setMessage(errorText(cause)) }
    finally { setLoading(false) }
  }
  useEffect(() => { void load() }, [page, query])

  async function toggleEnabled(user: ManagedUser) {
    const action = user.enabled ? 'khóa' : 'mở lại'
    if (!window.confirm(`${action[0].toUpperCase()}${action.slice(1)} tài khoản ${user.email}? Các phiên đăng nhập sẽ bị thu hồi.`)) return
    try { await apiRequest<ManagedUser>(`/users/${user.id}/enabled`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ enabled: !user.enabled }) }); setMessage(`Đã ${action} tài khoản.`); void load() }
    catch (cause) { setMessage(errorText(cause)) }
  }
  const staffRole = managedRoles.find((role) => role.name === 'STAFF')
  return <>
    <header className="catalog-header staff-header"><div><p className="eyebrow">ACCESS CONTROL</p><h2>Nhân sự & phân quyền</h2><p>Gán role cho tài khoản và thiết lập quyền vận hành cho nhóm STAFF.</p></div><button className="ghost-button" onClick={() => setEditingPermissions(true)}>Quyền STAFF</button></header>
    {message && <p className="catalog-message" role="status">{message}</p>}
    <section className="catalog-panel"><div className="staff-toolbar"><form className="staff-search" onSubmit={(event) => { event.preventDefault(); setPage(1); setQuery(queryInput.trim()) }}><input aria-label="Tìm kiếm nhân sự" placeholder="Tìm email hoặc tên…" value={queryInput} onChange={(event) => setQueryInput(event.target.value)} /><button className="ghost-button">Tìm</button></form><small>{data?.totalElements ?? 0} tài khoản</small></div>{loading ? <p className="table-loading">Đang tải danh sách tài khoản…</p> : <><table className="data-table"><thead><tr><th>Nhân sự</th><th>Role</th><th>Trạng thái</th><th>Ngày tạo</th><th /></tr></thead><tbody>{data?.items.map((user) => <tr key={user.id}><td><strong>{user.firstName} {user.lastName}</strong><small>{user.email}{user.phone ? ` · ${user.phone}` : ''}{user.id === session?.userId ? ' · Bạn' : ''}</small></td><td><div className="role-badges">{user.roles.map((role) => <span key={role}>{role}</span>)}</div></td><td><span className={`status ${user.enabled ? 'status--active' : 'status--cancelled'}`}>{user.enabled ? 'ACTIVE' : 'LOCKED'}</span></td><td>{dateTime.format(new Date(user.createdAt))}</td><td className="table-actions">{user.id !== session?.userId ? <><button onClick={() => setEditing(user)}>Phân quyền</button><button className={user.enabled ? 'danger-text' : ''} onClick={() => void toggleEnabled(user)}>{user.enabled ? 'Khóa' : 'Mở khóa'}</button></> : <small>Không tự đổi quyền</small>}</td></tr>)}{data?.items.length === 0 && <tr><td colSpan={5}><p className="empty-state">Không tìm thấy tài khoản phù hợp.</p></td></tr>}</tbody></table><Pagination data={data} onPage={setPage} /></>}</section>
    {editing && <UserRolesModal user={editing} onClose={() => setEditing(null)} onSaved={(user) => { setEditing(null); setMessage(`Đã cập nhật role cho ${user.email}.`); void load() }} />}
    {editingPermissions && staffRole && <StaffPermissionsModal role={staffRole} onClose={() => setEditingPermissions(false)} onSaved={() => { setEditingPermissions(false); setMessage('Đã cập nhật quyền cho role STAFF. Các phiên STAFF sẽ nhận quyền mới ngay.'); void load() }} />}
  </>
}

function UserRolesModal({ user, onClose, onSaved }: { user: ManagedUser; onClose: () => void; onSaved: (user: ManagedUser) => void }) {
  const [selected, setSelected] = useState<RoleName[]>(user.roles)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  function toggle(role: RoleName) { setSelected((current) => current.includes(role) ? current.filter((value) => value !== role) : [...current, role]) }
  async function submit(event: FormEvent) { event.preventDefault(); if (selected.length === 0) { setError('Tài khoản phải có ít nhất một role.'); return }; setBusy(true); setError(null); try { onSaved(await apiRequest<ManagedUser>(`/users/${user.id}/roles`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ roles: selected }) })) } catch (cause) { setError(errorText(cause)) } finally { setBusy(false) } }
  return <Modal title={`Phân quyền: ${user.email}`} onClose={onClose}><form className="admin-form" onSubmit={(event) => void submit(event)}><p className="role-help">Một tài khoản có thể có nhiều role. ADMIN có toàn bộ quyền; CUSTOMER không có quyền quản trị.</p><div className="role-options">{roles.map((role) => <label key={role} className="check-label"><input type="checkbox" checked={selected.includes(role)} onChange={() => toggle(role)} />{role}<small>{role === 'ADMIN' ? 'Toàn quyền, gồm quản lý nhân sự.' : role === 'STAFF' ? 'Quyền vận hành cấu hình ở màn Quyền STAFF.' : 'Tài khoản khách hàng thông thường.'}</small></label>)}</div>{error && <p className="form-error">{error}</p>}<footer><button type="button" className="ghost-button" onClick={onClose}>Hủy</button><button className="primary-button compact" disabled={busy}>{busy ? 'Đang lưu…' : 'Lưu role'}</button></footer></form></Modal>
}

function StaffPermissionsModal({ role, onClose, onSaved }: { role: ManagedRole; onClose: () => void; onSaved: () => void }) {
  const [selected, setSelected] = useState<PermissionName[]>(role.permissions.filter((permission) => permission !== 'USER_MANAGE'))
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  function toggle(permission: PermissionName) { setSelected((current) => current.includes(permission) ? current.filter((value) => value !== permission) : [...current, permission]) }
  async function submit(event: FormEvent) { event.preventDefault(); setBusy(true); setError(null); try { await apiRequest<ManagedRole>('/users/roles/STAFF/permissions', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ permissions: selected }) }); onSaved() } catch (cause) { setError(errorText(cause)) } finally { setBusy(false) } }
  return <Modal title="Quyền của STAFF" onClose={onClose}><form className="admin-form" onSubmit={(event) => void submit(event)}><p className="role-help">Chọn các quyền vận hành cho mọi người thuộc role STAFF. USER_MANAGE chỉ dành cho ADMIN để tránh tự nâng quyền.</p><div className="permission-options">{staffPermissions.map((permission) => <label key={permission} className="check-label"><input type="checkbox" checked={selected.includes(permission)} onChange={() => toggle(permission)} />{permissionLabels[permission]}<small>{permission}</small></label>)}</div>{error && <p className="form-error">{error}</p>}<footer><button type="button" className="ghost-button" onClick={onClose}>Hủy</button><button className="primary-button compact" disabled={busy}>{busy ? 'Đang lưu…' : 'Lưu quyền STAFF'}</button></footer></form></Modal>
}
