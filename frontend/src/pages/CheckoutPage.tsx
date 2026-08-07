import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ApiRequestError } from '../api/http';
import { formatPrice, formatSize } from '../api/storefront';
import type { CartItem } from '../api/cart';
import {
  fetchShippingAddresses,
  createShippingAddress,
  checkout,
  createPayment,
  type ShippingAddress,
  type ShippingAddressInput,
  type OrderResponse,
} from '../api/checkout';
import { useCart } from '../hooks/useCart';
import { useAuth } from '../contexts/AuthContext';
import { SiteHeader } from '../components/SiteHeader';
import { SiteFooter } from '../components/SiteFooter';
import '../styles/ds.css';
import '../styles/public.css';

const label: React.CSSProperties = {
  fontSize: 11, letterSpacing: '.16em', textTransform: 'uppercase', color: 'var(--color-neutral-700)',
};

function itemOptions(item: CartItem): string {
  const variant = item.selectedVariant;
  return [
    variant ? formatSize(variant.widthCm, variant.heightCm) ?? variant.name : null,
    variant?.material,
    item.selectedFrameOption?.frameName ?? 'Căng viền',
  ].filter(Boolean).join(' · ');
}

function formatAddressOneLine(a: ShippingAddress): string {
  return [a.addressLine, a.ward, a.district, a.province].filter(Boolean).join(', ');
}

const EMPTY_FORM: ShippingAddressInput = {
  recipientName: '', phone: '', province: '', district: '', ward: '', addressLine: '', defaultAddress: false,
};

export function CheckoutPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { session } = useAuth();
  const { cart, loading: cartLoading, count, reload: reloadCart } = useCart();

  const [addresses, setAddresses] = useState<ShippingAddress[]>([]);
  const [loadingAddresses, setLoadingAddresses] = useState(true);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<ShippingAddressInput>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [formFields, setFormFields] = useState<Record<string, string>>({});
  const [savingAddress, setSavingAddress] = useState(false);

  const [coupon, setCoupon] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [order, setOrder] = useState<OrderResponse | null>(null);

  useEffect(() => {
    const original = document.title;
    document.title = 'Thanh toán | Bubble Memories';
    return () => { document.title = original; };
  }, []);

  useEffect(() => {
    if (!session) return;
    setLoadingAddresses(true);
    fetchShippingAddresses()
      .then((list) => {
        setAddresses(list);
        const def = list.find((a) => a.defaultAddress) ?? list[0];
        if (def) setSelectedAddressId(def.id);
        if (list.length === 0) setShowForm(true);
      })
      .catch(() => {})
      .finally(() => setLoadingAddresses(false));
  }, [session]);

  const items = cart?.items ?? [];

  function setField(key: keyof ShippingAddressInput, value: string | boolean) {
    setForm((f) => ({ ...f, [key]: value }));
    setFormFields((f) => { const n = { ...f }; delete n[key]; return n; });
  }

  async function saveAddress() {
    setSavingAddress(true);
    setFormError(null);
    setFormFields({});
    try {
      const saved = await createShippingAddress(form);
      setAddresses((prev) => [...prev, saved]);
      setSelectedAddressId(saved.id);
      setShowForm(false);
      setForm(EMPTY_FORM);
    } catch (e) {
      if (e instanceof ApiRequestError) {
        setFormError(e.message);
        setFormFields(e.fields);
      } else {
        setFormError('Không lưu được địa chỉ.');
      }
    } finally {
      setSavingAddress(false);
    }
  }

  async function submit() {
    if (!selectedAddressId) return;
    setSubmitting(true);
    setError(null);
    try {
      const placed = await checkout({
        shippingAddressId: selectedAddressId,
        couponCode: coupon.trim() || undefined,
      });
      try {
        await createPayment(placed.id, 'COD');
      } catch {
        // payment creation failed but order is placed — show confirmation anyway
      }
      setOrder(placed);
      reloadCart();
    } catch (e) {
      setError(e instanceof ApiRequestError ? e.message : 'Không đặt được đơn hàng.');
    } finally {
      setSubmitting(false);
    }
  }

  if (order) {
    return (
      <Shell cartCount={0}>
        <Breadcrumb current="Đặt hàng thành công" />
        <section style={{
          display: 'grid', placeItems: 'center', gap: 'var(--space-4)', minHeight: '50vh',
          padding: 'var(--space-8)', textAlign: 'center',
          borderTop: '2px solid var(--color-text)',
        }}>
          <h1 style={{
            margin: 0, fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: 34,
            lineHeight: 1.02, letterSpacing: '-.03em',
          }}>Đặt hàng thành công!</h1>
          <p style={{ margin: 0, maxWidth: '46ch', fontSize: 15, lineHeight: 1.6, color: 'var(--color-neutral-800)' }}>
            Mã đơn <strong>{order.orderCode}</strong> · Thanh toán khi nhận hàng (COD).
            <br />Xưởng sẽ xác nhận và liên hệ giao hàng sớm nhất.
          </p>
          <div style={{ display: 'flex', gap: 'var(--space-3)', marginTop: 'var(--space-4)' }}>
            <a href="/danh-muc/tranh-canvas" className="btn btn-secondary">Tiếp tục mua sắm</a>
            <button type="button" className="btn btn-primary" onClick={() => navigate('/')}>Về trang chủ</button>
          </div>
        </section>
        <SiteFooter />
      </Shell>
    );
  }

  return (
    <Shell cartCount={count}>
      <Breadcrumb current="Thanh toán" />

      <section style={{
        display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 'var(--space-6)',
        padding: 'var(--space-8) var(--space-8) var(--space-6)',
      }}>
        <h1 style={{
          margin: 0, fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: 34,
          lineHeight: 1.02, letterSpacing: '-.03em',
        }}>Thanh toán</h1>
      </section>

      {!session ? (
        <Notice
          title="Đăng nhập để thanh toán"
          body="Bạn cần đăng nhập để tiếp tục đặt hàng."
          action={<Link className="btn btn-primary" to="/auth" state={{ from: location }}>Đăng nhập</Link>}
        />
      ) : cartLoading || loadingAddresses ? (
        <Notice title="Đang tải…" body="" />
      ) : items.length === 0 ? (
        <Notice
          title="Giỏ hàng trống"
          body="Không có sản phẩm nào để thanh toán."
          action={<a className="btn btn-primary" href="/danh-muc/tranh-canvas">Xem tranh canvas</a>}
        />
      ) : (
        <section data-split="" style={{
          display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, .58fr)',
          alignItems: 'start', borderTop: '2px solid var(--color-text)',
        }}>
          {/* ── Left: address + items ── */}
          <div style={{ display: 'flex', flexDirection: 'column', borderRight: '2px solid var(--color-text)' }}>

            {/* Shipping address selection */}
            <div style={{ padding: 'var(--space-6) var(--space-8)', borderBottom: '2px solid var(--color-divider)' }}>
              <h2 style={{
                margin: '0 0 var(--space-4)', fontFamily: 'var(--font-heading)', fontWeight: 800,
                fontSize: 18, letterSpacing: '.04em', textTransform: 'uppercase',
              }}>Địa chỉ giao hàng</h2>

              {addresses.length > 0 && !showForm && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                  {addresses.map((a) => (
                    <label key={a.id} className="radio" style={{
                      padding: 'var(--space-3) var(--space-4)',
                      border: selectedAddressId === a.id
                        ? '2px solid var(--color-accent)' : '1px solid var(--color-divider)',
                      cursor: 'pointer',
                    }}>
                      <input type="radio" name="address" checked={selectedAddressId === a.id}
                        onChange={() => setSelectedAddressId(a.id)} />
                      <span className="dot" />
                      <span style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                        <span style={{ fontWeight: 600, fontSize: 14 }}>
                          {a.recipientName} · {a.phone}
                          {a.defaultAddress && <span style={{ ...label, marginLeft: 8, color: 'var(--color-accent)' }}>Mặc định</span>}
                        </span>
                        <span style={{ fontSize: 13, color: 'var(--color-neutral-700)' }}>
                          {formatAddressOneLine(a)}
                        </span>
                      </span>
                    </label>
                  ))}
                  <button type="button" className="btn btn-ghost" style={{ alignSelf: 'flex-start' }}
                    onClick={() => { setShowForm(true); setForm(EMPTY_FORM); }}>
                    + Thêm địa chỉ mới
                  </button>
                </div>
              )}

              {showForm && (
                <AddressForm
                  form={form} setField={setField}
                  fieldErrors={formFields} error={formError}
                  saving={savingAddress}
                  onSave={() => void saveAddress()}
                  onCancel={addresses.length > 0 ? () => setShowForm(false) : undefined}
                />
              )}
            </div>

            {/* Order items review */}
            <div style={{ padding: 'var(--space-6) var(--space-8) var(--space-4)', borderBottom: '2px solid var(--color-divider)' }}>
              <h2 style={{
                margin: '0 0 var(--space-4)', fontFamily: 'var(--font-heading)', fontWeight: 800,
                fontSize: 18, letterSpacing: '.04em', textTransform: 'uppercase',
              }}>Sản phẩm ({count})</h2>
            </div>
            {items.map((item) => (
              <article key={item.id} style={{
                display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', gap: 'var(--space-4)',
                padding: 'var(--space-4) var(--space-8)', borderBottom: '1px solid var(--color-neutral-300)',
              }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                  <span style={{
                    fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: 15,
                    lineHeight: 1.15, letterSpacing: '-.015em',
                  }}>{item.productName}</span>
                  <span style={label}>{itemOptions(item)}</span>
                  <span style={{ fontSize: 12, color: 'var(--color-neutral-700)' }}>SL: {item.quantity}</span>
                </div>
                <span style={{
                  fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: 15, letterSpacing: '-.02em',
                  whiteSpace: 'nowrap',
                }}>{formatPrice(item.lineTotal)}</span>
              </article>
            ))}
            <div style={{ padding: 'var(--space-4) var(--space-8)' }}>
              <Link to="/gio-hang" style={{ fontSize: 13, color: 'var(--color-accent)' }}>← Sửa giỏ hàng</Link>
            </div>
          </div>

          {/* ── Right: summary + payment ── */}
          <aside style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)', padding: 'var(--space-8)' }}>
            <h2 style={{
              margin: 0, fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: 20,
              letterSpacing: '.04em', textTransform: 'uppercase',
            }}>Đơn hàng</h2>

            <div style={{ display: 'flex', flexDirection: 'column', borderTop: '2px solid var(--color-text)' }}>
              <SummaryRow k="Số lượng" v={`${count} bức`} />
              <SummaryRow k="Tạm tính" v={formatPrice(cart?.subtotal ?? 0)} />
              <SummaryRow k="Vận chuyển" v="Miễn phí" />
              <SummaryRow k="Thanh toán" v="COD — trả khi nhận hàng" />
            </div>

            {/* Coupon */}
            <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
              <input type="text" className="input" placeholder="Mã giảm giá (nếu có)"
                value={coupon} onChange={(e) => setCoupon(e.target.value)}
                style={{ flex: 1 }} />
            </div>

            <div style={{
              display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
              gap: 'var(--space-4)', padding: 'var(--space-4) 0',
              borderTop: '2px solid var(--color-text)', borderBottom: '2px solid var(--color-text)',
            }}>
              <span style={label}>Tổng</span>
              <span style={{
                fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: 26, letterSpacing: '-.03em',
              }}>{formatPrice(cart?.subtotal ?? 0)}</span>
            </div>

            <button type="button" className="btn btn-primary btn-block"
              disabled={submitting || !selectedAddressId}
              onClick={() => void submit()}
              style={{ cursor: submitting || !selectedAddressId ? 'not-allowed' : 'pointer' }}>
              {submitting ? 'Đang xử lý…' : 'Xác nhận đặt hàng'}
            </button>

            {!selectedAddressId && !showForm && (
              <p style={{ margin: 0, fontSize: 12, color: 'var(--color-accent-700)' }}>
                Vui lòng chọn hoặc thêm địa chỉ giao hàng.
              </p>
            )}

            {error && (
              <p role="status" style={{ margin: 0, fontSize: 12, color: 'var(--color-accent-700)' }}>{error}</p>
            )}
          </aside>
        </section>
      )}

      <SiteFooter />
    </Shell>
  );
}

/* ── Sub-components ─────────────────────────────────────────────────── */

function AddressForm({ form, setField, fieldErrors, error, saving, onSave, onCancel }: {
  form: ShippingAddressInput;
  setField: (key: keyof ShippingAddressInput, value: string | boolean) => void;
  fieldErrors: Record<string, string>;
  error: string | null;
  saving: boolean;
  onSave: () => void;
  onCancel?: () => void;
}) {
  const fields: { key: keyof ShippingAddressInput; label: string; placeholder: string }[] = [
    { key: 'recipientName', label: 'Người nhận', placeholder: 'Nguyễn Văn A' },
    { key: 'phone', label: 'Số điện thoại', placeholder: '0909 000 000' },
    { key: 'province', label: 'Tỉnh / Thành phố', placeholder: 'TP. Hồ Chí Minh' },
    { key: 'district', label: 'Quận / Huyện', placeholder: 'Quận 1' },
    { key: 'ward', label: 'Phường / Xã', placeholder: 'Phường Bến Nghé' },
    { key: 'addressLine', label: 'Địa chỉ chi tiết', placeholder: '123 Lê Lợi' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 'var(--space-3)',
      }} data-split="">
        {fields.map(({ key, label: lbl, placeholder }) => (
          <div key={key} className="field">
            <label>{lbl}</label>
            <input className="input" placeholder={placeholder}
              value={form[key] as string} onChange={(e) => setField(key, e.target.value)} />
            {fieldErrors[key] && (
              <span style={{ fontSize: 11, color: 'var(--color-accent-700)', marginTop: 2 }}>{fieldErrors[key]}</span>
            )}
          </div>
        ))}
      </div>
      <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', fontSize: 13, cursor: 'pointer' }}>
        <input type="checkbox" checked={form.defaultAddress as boolean}
          onChange={(e) => setField('defaultAddress', e.target.checked)} />
        Đặt làm địa chỉ mặc định
      </label>
      {error && <p style={{ margin: 0, fontSize: 12, color: 'var(--color-accent-700)' }}>{error}</p>}
      <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
        <button type="button" className="btn btn-primary" disabled={saving}
          onClick={onSave} style={{ cursor: saving ? 'not-allowed' : 'pointer' }}>
          {saving ? 'Đang lưu…' : 'Lưu địa chỉ'}
        </button>
        {onCancel && (
          <button type="button" className="btn btn-secondary" onClick={onCancel}>Huỷ</button>
        )}
      </div>
    </div>
  );
}

function SummaryRow({ k, v }: { k: string; v: string }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 'var(--space-4)',
      padding: 'var(--space-3) 0', borderBottom: '1px solid var(--color-neutral-300)',
    }}>
      <span style={label}>{k}</span>
      <span style={{ fontSize: 14 }}>{v}</span>
    </div>
  );
}

function Breadcrumb({ current }: { current: string }) {
  return (
    <nav aria-label="Breadcrumb" data-breadcrumb="" style={{
      display: 'flex', alignItems: 'center', gap: 'var(--space-3)', height: 46,
      padding: '0 var(--space-8)', borderBottom: '2px solid var(--color-divider)',
      fontSize: 11, letterSpacing: '.16em', textTransform: 'uppercase', color: 'var(--color-neutral-700)',
    }}>
      <Link to="/" style={{ color: 'var(--color-neutral-700)', textDecoration: 'none' }}>Trang chủ</Link>
      <span aria-hidden="true">/</span>
      <Link to="/gio-hang" style={{ color: 'var(--color-neutral-700)', textDecoration: 'none' }}>Giỏ hàng</Link>
      <span aria-hidden="true">/</span>
      <span style={{ color: 'var(--color-text)' }}>{current}</span>
    </nav>
  );
}

function Notice({ title, body, action }: { title: string; body: string; action?: React.ReactNode }) {
  return (
    <section style={{
      display: 'grid', placeItems: 'center', gap: 'var(--space-4)', minHeight: '36vh',
      padding: 'var(--space-8)', textAlign: 'center', borderTop: '2px solid var(--color-text)',
    }}>
      <h2 style={{ margin: 0, fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: 26, letterSpacing: '-.025em' }}>
        {title}
      </h2>
      {body && (
        <p style={{ margin: 0, maxWidth: '46ch', fontSize: 15, lineHeight: 1.6, color: 'var(--color-neutral-800)' }}>
          {body}
        </p>
      )}
      {action}
    </section>
  );
}

function Shell({ cartCount, children }: { cartCount: number; children: React.ReactNode }) {
  return (
    <div style={{ background: 'var(--color-neutral-200)' }}>
      <div style={{
        fontFamily: 'var(--font-body)', color: 'var(--color-text)', background: 'var(--color-bg)',
        minHeight: '100vh', width: '100%', maxWidth: 1180, margin: '0 auto',
        borderLeft: '2px solid var(--color-divider)', borderRight: '2px solid var(--color-divider)',
      }}>
        <SiteHeader cartCount={cartCount} />
        {children}
      </div>
    </div>
  );
}
