import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ApiRequestError } from '../api/http';
import { fetchCurrentUser, type CurrentUser } from '../api/account';
import {
  createShippingAddress,
  deleteShippingAddress,
  fetchShippingAddresses,
  updateShippingAddress,
  type ShippingAddress,
  type ShippingAddressInput,
} from '../api/checkout';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../hooks/useCart';
import { ShippingAddressForm } from '../components/ShippingAddressForm';
import { STORE_LABEL_STYLE, StoreNotice, StoreShell } from '../components/StoreShell';
import '../styles/ds.css';
import '../styles/public.css';

const EMPTY_ADDRESS: ShippingAddressInput = {
  recipientName: '', phone: '', province: '', district: '', ward: '', addressLine: '', defaultAddress: false,
};

const EMPTY_PASSWORD_FORM = { currentPassword: '', newPassword: '', confirmPassword: '' };
// Khớp với ChangePasswordRequest ở backend.
const MIN_PASSWORD_LENGTH = 12;
const MAX_PASSWORD_LENGTH = 72;

function oneLine(address: ShippingAddress) {
  return [address.addressLine, address.ward, address.district, address.province].filter(Boolean).join(', ');
}

function Breadcrumb() {
  return <nav aria-label="Breadcrumb" data-breadcrumb="" style={{
    display: 'flex', alignItems: 'center', gap: 'var(--space-3)', minHeight: 46, padding: '0 var(--space-8)',
    borderBottom: '2px solid var(--color-divider)', fontSize: 11, letterSpacing: '.16em', textTransform: 'uppercase', color: 'var(--color-neutral-700)',
  }}>
    <Link to="/" style={{ color: 'var(--color-neutral-700)', textDecoration: 'none' }}>Trang chủ</Link>
    <span aria-hidden="true">/</span><span style={{ color: 'var(--color-text)' }}>Tài khoản</span>
  </nav>;
}

export function AccountPage() {
  const navigate = useNavigate();
  const { session, signOut, saveProfile, updatePassword } = useAuth();
  const { count } = useCart();
  const [profile, setProfile] = useState<CurrentUser | null>(null);
  const [addresses, setAddresses] = useState<ShippingAddress[]>([]);
  const [loading, setLoading] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [addressError, setAddressError] = useState<string | null>(null);
  const [editing, setEditing] = useState<ShippingAddress | 'new' | null>(null);
  const [form, setForm] = useState<ShippingAddressInput>(EMPTY_ADDRESS);
  const [formFields, setFormFields] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteCandidate, setDeleteCandidate] = useState<string | null>(null);
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({ firstName: '', lastName: '', phone: '' });
  const [profileFormError, setProfileFormError] = useState<string | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordForm, setPasswordForm] = useState(EMPTY_PASSWORD_FORM);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordChanged, setPasswordChanged] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setProfileError(null);
    setAddressError(null);
    const [profileResult, addressResult] = await Promise.allSettled([
      fetchCurrentUser(), fetchShippingAddresses(),
    ]);
    if (profileResult.status === 'fulfilled') setProfile(profileResult.value);
    else setProfileError(profileResult.reason instanceof Error ? profileResult.reason.message : 'Không tải được hồ sơ.');
    if (addressResult.status === 'fulfilled') setAddresses(addressResult.value);
    else setAddressError(addressResult.reason instanceof Error ? addressResult.reason.message : 'Không tải được sổ địa chỉ.');
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    const original = document.title;
    document.title = 'Tài khoản | Bubble Memories';
    return () => { document.title = original; };
  }, []);

  function startNewAddress() {
    setEditing('new'); setForm(EMPTY_ADDRESS); setFormError(null); setFormFields({}); setDeleteCandidate(null);
  }

  function startEditing(address: ShippingAddress) {
    setEditing(address); setForm({ ...address }); setFormError(null); setFormFields({}); setDeleteCandidate(null);
  }

  function setField(key: keyof ShippingAddressInput, value: string | boolean) {
    setForm((current) => ({ ...current, [key]: value }));
    setFormFields((current) => { const next = { ...current }; delete next[key]; return next; });
  }

  async function saveAddress() {
    setSaving(true); setFormError(null); setFormFields({});
    try {
      const saved = editing === 'new' ? await createShippingAddress(form) : await updateShippingAddress(editing!.id, form);
      setAddresses((current) => editing === 'new' ? [...current, saved] : current.map((address) => address.id === saved.id ? saved : address));
      setEditing(null);
    } catch (cause) {
      if (cause instanceof ApiRequestError) { setFormError(cause.message); setFormFields(cause.fields); }
      else setFormError('Không lưu được địa chỉ. Vui lòng thử lại.');
    } finally { setSaving(false); }
  }

  async function removeAddress(id: string) {
    setDeletingId(id); setAddressError(null);
    try {
      await deleteShippingAddress(id);
      setAddresses((current) => current.filter((address) => address.id !== id));
      setDeleteCandidate(null);
      if (editing !== 'new' && editing?.id === id) setEditing(null);
    } catch (cause) {
      setAddressError(cause instanceof Error ? cause.message : 'Không xoá được địa chỉ. Vui lòng thử lại.');
    } finally { setDeletingId(null); }
  }

  function startEditingProfile() {
    if (!profile) return;
    setProfileForm({ firstName: profile.firstName, lastName: profile.lastName, phone: profile.phone ?? '' });
    setProfileFormError(null);
    setProfileSaved(false);
    setEditingProfile(true);
  }

  async function saveProfileForm() {
    setSavingProfile(true);
    setProfileFormError(null);
    try {
      const updated = await saveProfile(profileForm);
      setProfile(updated);
      setEditingProfile(false);
      setProfileSaved(true);
    } catch (cause) {
      setProfileFormError(cause instanceof Error ? cause.message : 'Không lưu được hồ sơ. Vui lòng thử lại.');
    } finally { setSavingProfile(false); }
  }

  function startChangingPassword() {
    setPasswordForm(EMPTY_PASSWORD_FORM);
    setPasswordError(null);
    setPasswordChanged(false);
    setChangingPassword(true);
  }

  async function submitPasswordChange() {
    setPasswordError(null);
    if (passwordForm.newPassword.length < MIN_PASSWORD_LENGTH || passwordForm.newPassword.length > MAX_PASSWORD_LENGTH) {
      setPasswordError(`Mật khẩu mới phải từ ${MIN_PASSWORD_LENGTH} đến ${MAX_PASSWORD_LENGTH} ký tự.`);
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('Mật khẩu xác nhận chưa khớp.');
      return;
    }

    setSavingPassword(true);
    try {
      await updatePassword(passwordForm.currentPassword, passwordForm.newPassword);
      setPasswordForm(EMPTY_PASSWORD_FORM);
      setChangingPassword(false);
      setPasswordChanged(true);
    } catch (cause) {
      setPasswordError(cause instanceof Error ? cause.message : 'Không đổi được mật khẩu. Vui lòng thử lại.');
    } finally { setSavingPassword(false); }
  }

  async function logout() {
    await signOut();
    navigate('/', { replace: true });
  }

  const name = profile ? [profile.firstName, profile.lastName].filter(Boolean).join(' ') : [session?.firstName, session?.lastName].filter(Boolean).join(' ');
  const email = profile?.email ?? session?.email;
  const displayRole = profile?.roles.includes('ADMIN') ? 'Quản trị viên' : profile?.roles.includes('STAFF') ? 'Nhân viên' : 'Khách hàng';

  return <StoreShell cartCount={count}>
    <Breadcrumb />
    <section style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', justifyContent: 'space-between', gap: 'var(--space-4)', padding: 'var(--space-8) var(--space-8) var(--space-6)', borderBottom: '2px solid var(--color-text)' }}>
      <div><h1 style={{ margin: 0, fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: 'clamp(30px, 5vw, 40px)', lineHeight: 1.02, letterSpacing: '-.035em' }}>Tài khoản</h1><p style={{ margin: 'var(--space-2) 0 0', fontSize: 14, color: 'var(--color-neutral-800)' }}>Hồ sơ, địa chỉ giao hàng và đơn đã đặt của bạn.</p></div>
      <button type="button" className="btn btn-secondary" onClick={() => void logout()}>Đăng xuất</button>
    </section>

    {loading ? <StoreNotice title="Đang tải tài khoản…" body="" /> : <section data-split="" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, .76fr) minmax(320px, 1.24fr)', alignItems: 'start' }}>
      <aside style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)', padding: 'var(--space-6) var(--space-8)', borderRight: '2px solid var(--color-text)' }}>
        <section>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 'var(--space-3)' }}>
            <h2 style={sectionTitle}>Hồ sơ</h2>
            {profile && !editingProfile && <button type="button" className="btn btn-ghost" onClick={startEditingProfile}>Sửa</button>}
          </div>
          {profileError ? <div style={block}><p role="alert" style={{ margin: 0, fontSize: 13, color: 'var(--color-accent-700)' }}>{profileError}</p><button type="button" className="btn btn-secondary" style={{ marginTop: 'var(--space-3)' }} onClick={() => void load()}>Thử lại</button></div>
            : editingProfile ? <form style={block} onSubmit={(event) => { event.preventDefault(); void saveProfileForm(); }}>
              <div style={fieldGroup}>
                <label style={fieldLabel}>Họ<input style={fieldInput} value={profileForm.lastName} onChange={(event) => setProfileForm({ ...profileForm, lastName: event.target.value })} required maxLength={100} autoComplete="family-name" /></label>
                <label style={fieldLabel}>Tên<input style={fieldInput} value={profileForm.firstName} onChange={(event) => setProfileForm({ ...profileForm, firstName: event.target.value })} required maxLength={100} autoComplete="given-name" /></label>
                <label style={fieldLabel}>Số điện thoại <em style={{ fontStyle: 'normal', fontWeight: 400, color: 'var(--color-neutral-800)' }}>(không bắt buộc)</em><input style={fieldInput} value={profileForm.phone} onChange={(event) => setProfileForm({ ...profileForm, phone: event.target.value })} maxLength={30} autoComplete="tel" /></label>
                {/* Email là danh tính đăng nhập nên chỉ hiển thị; đổi nó cần bước xác minh riêng. */}
                <p style={{ margin: 0, fontSize: 12, color: 'var(--color-neutral-800)', lineHeight: 1.5 }}>Email đăng nhập <strong style={{ overflowWrap: 'anywhere' }}>{email}</strong> không thay đổi được tại đây.</p>
              </div>
              {profileFormError && <p role="alert" style={noticeError}>{profileFormError}</p>}
              <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'var(--space-4)', flexWrap: 'wrap' }}>
                <button type="submit" className="btn btn-primary" disabled={savingProfile}>{savingProfile ? 'Đang lưu…' : 'Lưu hồ sơ'}</button>
                <button type="button" className="btn btn-secondary" disabled={savingProfile} onClick={() => setEditingProfile(false)}>Huỷ</button>
              </div>
            </form> : <div style={block}>
              <strong style={{ display: 'block', fontFamily: 'var(--font-heading)', fontSize: 20, overflowWrap: 'anywhere' }}>{name || email}</strong>
              <p style={{ margin: 'var(--space-2) 0 0', fontSize: 14, overflowWrap: 'anywhere' }}>{email}</p>
              {profile?.phone && <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--color-neutral-800)' }}>{profile.phone}</p>}
              <span style={{ display: 'inline-block', marginTop: 'var(--space-3)', ...STORE_LABEL_STYLE }}>{displayRole}</span>
              {profileSaved && <p role="status" style={noticeSuccess}>Đã cập nhật hồ sơ.</p>}
            </div>}
        </section>

        <section>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 'var(--space-3)' }}>
            <h2 style={sectionTitle}>Mật khẩu</h2>
            {!changingPassword && <button type="button" className="btn btn-ghost" onClick={startChangingPassword}>Đổi</button>}
          </div>
          {changingPassword ? <form style={block} onSubmit={(event) => { event.preventDefault(); void submitPasswordChange(); }}>
            <div style={fieldGroup}>
              <label style={fieldLabel}>Mật khẩu hiện tại<input type="password" style={fieldInput} value={passwordForm.currentPassword} onChange={(event) => setPasswordForm({ ...passwordForm, currentPassword: event.target.value })} required autoComplete="current-password" /></label>
              <label style={fieldLabel}>Mật khẩu mới<input type="password" style={fieldInput} value={passwordForm.newPassword} onChange={(event) => setPasswordForm({ ...passwordForm, newPassword: event.target.value })} required minLength={MIN_PASSWORD_LENGTH} maxLength={MAX_PASSWORD_LENGTH} autoComplete="new-password" /></label>
              <label style={fieldLabel}>Xác nhận mật khẩu mới<input type="password" style={fieldInput} value={passwordForm.confirmPassword} onChange={(event) => setPasswordForm({ ...passwordForm, confirmPassword: event.target.value })} required minLength={MIN_PASSWORD_LENGTH} maxLength={MAX_PASSWORD_LENGTH} autoComplete="new-password" /></label>
              <p style={{ margin: 0, fontSize: 12, color: 'var(--color-neutral-800)', lineHeight: 1.5 }}>Tối thiểu {MIN_PASSWORD_LENGTH} ký tự. Đổi xong, mọi thiết bị khác đang đăng nhập sẽ bị đăng xuất.</p>
            </div>
            {passwordError && <p role="alert" style={noticeError}>{passwordError}</p>}
            <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'var(--space-4)', flexWrap: 'wrap' }}>
              <button type="submit" className="btn btn-primary" disabled={savingPassword}>{savingPassword ? 'Đang đổi…' : 'Đổi mật khẩu'}</button>
              <button type="button" className="btn btn-secondary" disabled={savingPassword} onClick={() => setChangingPassword(false)}>Huỷ</button>
            </div>
          </form> : <div style={block}>
            <p style={{ margin: 0, fontSize: 13, lineHeight: 1.55, color: 'var(--color-neutral-800)' }}>Đặt mật khẩu mới cho tài khoản. Bạn sẽ cần nhập mật khẩu hiện tại.</p>
            {passwordChanged && <p role="status" style={noticeSuccess}>Đã đổi mật khẩu. Các thiết bị khác đã bị đăng xuất.</p>}
          </div>}
        </section>
        <section>
          <h2 style={sectionTitle}>Mua hàng</h2>
          <Link to="/don-hang-cua-toi" className="btn btn-primary btn-block">Đơn hàng của tôi →</Link>
          <p style={{ margin: 'var(--space-3) 0 0', fontSize: 13, lineHeight: 1.55, color: 'var(--color-neutral-800)' }}>Xem tiến trình xưởng xác nhận, giao hàng và thanh toán.</p>
        </section>
      </aside>

      <section style={{ minWidth: 0, padding: 'var(--space-6) var(--space-8)' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'baseline', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
          <div><h2 style={{ ...sectionTitle, marginBottom: 0 }}>Sổ địa chỉ</h2><p style={{ margin: 'var(--space-2) 0 0', fontSize: 13, color: 'var(--color-neutral-800)' }}>Địa chỉ này sẽ có sẵn khi bạn thanh toán.</p></div>
          {!editing && <button type="button" className="btn btn-primary" onClick={startNewAddress}>+ Thêm địa chỉ</button>}
        </div>
        {addressError && <p role="alert" style={{ margin: '0 0 var(--space-4)', fontSize: 13, color: 'var(--color-accent-700)' }}>{addressError}</p>}
        {editing && <section style={{ padding: 'var(--space-5) 0', borderTop: '2px solid var(--color-text)', borderBottom: '1px solid var(--color-neutral-300)' }}>
          <h3 style={{ margin: '0 0 var(--space-4)', fontSize: 18 }}>{editing === 'new' ? 'Thêm địa chỉ giao hàng' : 'Chỉnh sửa địa chỉ'}</h3>
          <ShippingAddressForm form={form} setField={setField} fieldErrors={formFields} error={formError} saving={saving} submitLabel={editing === 'new' ? 'Thêm địa chỉ' : 'Cập nhật địa chỉ'} onSave={() => void saveAddress()} onCancel={() => setEditing(null)} />
        </section>}
        {!editing && addresses.length === 0 && !addressError && <StoreNotice title="Chưa có địa chỉ giao hàng" body="Thêm địa chỉ trước để thanh toán nhanh hơn ở lần đặt tranh tới." action={<button type="button" className="btn btn-primary" onClick={startNewAddress}>Thêm địa chỉ</button>} />}
        {!editing && addresses.map((address) => <article key={address.id} style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', gap: 'var(--space-4)', padding: 'var(--space-5) 0', borderTop: '1px solid var(--color-neutral-300)' }}>
          <div style={{ minWidth: 0 }}><div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)', alignItems: 'baseline' }}><strong style={{ fontSize: 15 }}>{address.recipientName}</strong><span style={{ fontSize: 13, color: 'var(--color-neutral-800)' }}>{address.phone}</span>{address.defaultAddress && <span style={{ ...STORE_LABEL_STYLE, color: 'var(--color-accent)' }}>Mặc định</span>}</div><p style={{ margin: 'var(--space-2) 0 0', fontSize: 13, lineHeight: 1.55, overflowWrap: 'anywhere' }}>{oneLine(address)}</p>{deleteCandidate === address.id && <div aria-live="polite" style={{ marginTop: 'var(--space-3)', paddingTop: 'var(--space-3)', borderTop: '1px solid var(--color-neutral-300)' }}><p style={{ margin: '0 0 var(--space-2)', fontSize: 12 }}>Xoá địa chỉ này khỏi sổ địa chỉ?</p><div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}><button type="button" className="btn btn-primary" disabled={deletingId === address.id} onClick={() => void removeAddress(address.id)}>{deletingId === address.id ? 'Đang xoá…' : 'Xác nhận xoá'}</button><button type="button" className="btn btn-secondary" disabled={deletingId === address.id} onClick={() => setDeleteCandidate(null)}>Giữ lại</button></div></div>}</div>
          <div style={{ display: 'flex', alignItems: 'start', gap: 'var(--space-2)', flexWrap: 'wrap', justifyContent: 'end' }}><button type="button" className="btn btn-ghost" onClick={() => startEditing(address)}>Sửa</button><button type="button" className="btn btn-ghost" onClick={() => setDeleteCandidate(address.id)} style={{ color: 'var(--color-accent-700)' }}>Xoá</button></div>
        </article>)}
      </section>
    </section>}
  </StoreShell>;
}

const sectionTitle: React.CSSProperties = { margin: '0 0 var(--space-4)', fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: 18, letterSpacing: '.04em', textTransform: 'uppercase' };
const fieldGroup: React.CSSProperties = { display: 'grid', gap: 'var(--space-3)' };
const fieldLabel: React.CSSProperties = { display: 'grid', gap: 6, fontSize: 12, fontWeight: 700, letterSpacing: '.04em', textTransform: 'uppercase', color: 'var(--color-neutral-800)' };
const fieldInput: React.CSSProperties = { width: '100%', minWidth: 0, padding: '10px 12px', border: '1px solid var(--color-neutral-300)', borderRadius: 8, fontSize: 14, fontWeight: 400, textTransform: 'none', letterSpacing: 'normal', color: 'var(--color-text)', background: 'var(--color-surface, #fff)' };
const noticeError: React.CSSProperties = { margin: 'var(--space-3) 0 0', fontSize: 13, lineHeight: 1.5, color: 'var(--color-accent-700)' };
const noticeSuccess: React.CSSProperties = { margin: 'var(--space-3) 0 0', fontSize: 13, lineHeight: 1.5, color: 'var(--color-neutral-800)' };
const block: React.CSSProperties = { borderTop: '2px solid var(--color-text)', borderBottom: '1px solid var(--color-neutral-300)', padding: 'var(--space-4) 0' };
