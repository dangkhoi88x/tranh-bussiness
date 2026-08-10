import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ApiRequestError } from '../api/http';
import { formatPrice } from '../api/storefront';
import {
  fetchShippingAddresses,
  createShippingAddress,
  checkout,
  createPayment,
  previewPromotion,
  type ShippingAddress,
  type ShippingAddressInput,
  type OrderResponse,
  type PromotionPreview,
} from '../api/checkout';
import { useCart } from '../hooks/useCart';
import { useAuth } from '../contexts/AuthContext';
import {
  cartItemOptions,
  STORE_LABEL_STYLE,
  StoreNotice,
  StoreShell,
  StoreSummaryRow,
} from '../components/StoreShell';
import { ShippingAddressForm } from '../components/ShippingAddressForm';
import '../styles/ds.css';
import '../styles/public.css';

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
  const [addressError, setAddressError] = useState<string | null>(null);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<ShippingAddressInput>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [formFields, setFormFields] = useState<Record<string, string>>({});
  const [savingAddress, setSavingAddress] = useState(false);

  const [coupon, setCoupon] = useState('');
  const [promotionPreview, setPromotionPreview] = useState<PromotionPreview | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [previewingCoupon, setPreviewingCoupon] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [order, setOrder] = useState<OrderResponse | null>(null);

  useEffect(() => {
    const original = document.title;
    document.title = 'Thanh toán | Bubble Memories';
    return () => { document.title = original; };
  }, []);

  async function loadAddresses() {
    if (!session) return;
    setLoadingAddresses(true);
    setAddressError(null);
    try {
      const list = await fetchShippingAddresses();
      setAddresses(list);
      const def = list.find((a) => a.defaultAddress) ?? list[0];
      setSelectedAddressId(def?.id ?? null);
      setShowForm(list.length === 0);
    } catch (e) {
      setAddressError(e instanceof ApiRequestError
        ? e.message
        : 'Không tải được sổ địa chỉ. Vui lòng thử lại.');
    } finally {
      setLoadingAddresses(false);
    }
  }

  useEffect(() => {
    void loadAddresses();
  }, [session?.userId]);

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

  async function applyCoupon() {
    const code = coupon.trim();
    if (!code) {
      setPromotionPreview(null);
      setCouponError('Nhập mã giảm giá trước khi áp dụng.');
      return;
    }
    setPreviewingCoupon(true);
    setCouponError(null);
    setPromotionPreview(null);
    try {
      const preview = await previewPromotion(code);
      setPromotionPreview(preview);
      setCoupon(preview.couponCode);
    } catch (e) {
      setCouponError(e instanceof ApiRequestError ? e.message : 'Không kiểm tra được mã giảm giá.');
    } finally {
      setPreviewingCoupon(false);
    }
  }

  const couponNeedsPreview = coupon.trim().length > 0
    && promotionPreview?.couponCode.toUpperCase() !== coupon.trim().toUpperCase();
  const displayedTotal = promotionPreview?.totalAmount ?? cart?.subtotal ?? 0;

  if (order) {
    return (
      <StoreShell cartCount={0}>
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
          <div style={{ width: 'min(100%, 380px)', borderTop: '2px solid var(--color-text)', textAlign: 'left' }}>
            <StoreSummaryRow label="Tạm tính" value={formatPrice(order.subtotalAmount)} />
            {order.discountAmount > 0 && (
              <StoreSummaryRow label={`Giảm giá${order.promotionCode ? ` · ${order.promotionCode}` : ''}`}
                value={`− ${formatPrice(order.discountAmount)}`} valueTone="discount" />
            )}
            <StoreSummaryRow label="Vận chuyển" value={formatPrice(order.shippingFee)} />
            <div style={{
              display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 'var(--space-4)',
              padding: 'var(--space-4) 0', borderBottom: '2px solid var(--color-text)',
            }}>
              <span style={STORE_LABEL_STYLE}>Tổng thanh toán</span>
              <strong style={{ fontFamily: 'var(--font-heading)', fontSize: 26 }}>{formatPrice(order.totalAmount)}</strong>
            </div>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 'var(--space-3)', marginTop: 'var(--space-4)' }}>
            <Link to="/danh-muc/tranh-canvas" className="btn btn-secondary">Tiếp tục mua sắm</Link>
            <Link to={`/don-hang-cua-toi/${order.id}`} className="btn btn-primary">Theo dõi đơn hàng</Link>
            <button type="button" className="btn btn-secondary" onClick={() => navigate('/')}>Về trang chủ</button>
          </div>
        </section>
      </StoreShell>
    );
  }

  return (
    <StoreShell cartCount={count}>
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
        <StoreNotice
          title="Đăng nhập để thanh toán"
          body="Bạn cần đăng nhập để tiếp tục đặt hàng."
          action={<Link className="btn btn-primary" to="/auth" state={{ from: location }}>Đăng nhập</Link>}
        />
      ) : cartLoading || loadingAddresses ? (
        <StoreNotice title="Đang tải…" body="" />
      ) : addressError ? (
        <StoreNotice
          title="Không tải được địa chỉ giao hàng"
          body={addressError}
          action={<button type="button" className="btn btn-primary" onClick={() => void loadAddresses()}>Thử lại</button>}
        />
      ) : items.length === 0 ? (
        <StoreNotice
          title="Giỏ hàng trống"
          body="Không có sản phẩm nào để thanh toán."
          action={<Link className="btn btn-primary" to="/danh-muc/tranh-canvas">Xem tranh canvas</Link>}
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
                          {a.defaultAddress && <span style={{ ...STORE_LABEL_STYLE, marginLeft: 8, color: 'var(--color-accent)' }}>Mặc định</span>}
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
                <ShippingAddressForm
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
                  <span style={STORE_LABEL_STYLE}>{cartItemOptions(item)}</span>
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
              <StoreSummaryRow label="Số lượng" value={`${count} bức`} />
              <StoreSummaryRow label="Tạm tính" value={formatPrice(cart?.subtotal ?? 0)} />
              {promotionPreview && promotionPreview.discountAmount > 0 && (
                <StoreSummaryRow label={`Giảm giá · ${promotionPreview.couponCode}`}
                  value={`− ${formatPrice(promotionPreview.discountAmount)}`} valueTone="discount" />
              )}
              <StoreSummaryRow label="Vận chuyển" value="Miễn phí" />
              <StoreSummaryRow label="Thanh toán" value="COD — trả khi nhận hàng" />
            </div>

            {/* Coupon */}
            <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'stretch' }}>
              <input type="text" className="input" placeholder="Mã giảm giá (nếu có)"
                value={coupon} disabled={previewingCoupon}
                onChange={(e) => {
                  setCoupon(e.target.value);
                  setPromotionPreview(null);
                  setCouponError(null);
                }}
                style={{ flex: 1 }} />
              <button type="button" className="btn btn-secondary" disabled={previewingCoupon}
                onClick={() => void applyCoupon()}>
                {previewingCoupon ? 'Đang kiểm tra…' : 'Áp dụng'}
              </button>
            </div>
            {couponError && <p role="alert" style={{ margin: '-10px 0 0', fontSize: 12, color: 'var(--color-accent-700)' }}>{couponError}</p>}
            {promotionPreview && (
              <p role="status" style={{ margin: '-10px 0 0', fontSize: 12, color: 'var(--color-neutral-800)' }}>
                Đã áp dụng mã {promotionPreview.couponCode}, giảm {formatPrice(promotionPreview.discountAmount)}.
              </p>
            )}

            <div style={{
              display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
              gap: 'var(--space-4)', padding: 'var(--space-4) 0',
              borderTop: '2px solid var(--color-text)', borderBottom: '2px solid var(--color-text)',
            }}>
              <span style={STORE_LABEL_STYLE}>Tổng</span>
              <span style={{
                fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: 26, letterSpacing: '-.03em',
              }}>{formatPrice(displayedTotal)}</span>
            </div>

            <button type="button" className="btn btn-primary btn-block"
              disabled={submitting || !selectedAddressId || couponNeedsPreview}
              onClick={() => void submit()}
              style={{ cursor: submitting || !selectedAddressId || couponNeedsPreview ? 'not-allowed' : 'pointer' }}>
              {submitting ? 'Đang xử lý…' : 'Xác nhận đặt hàng'}
            </button>

            {!selectedAddressId && !showForm && (
              <p style={{ margin: 0, fontSize: 12, color: 'var(--color-accent-700)' }}>
                Vui lòng chọn hoặc thêm địa chỉ giao hàng.
              </p>
            )}

            {couponNeedsPreview && !couponError && (
              <p style={{ margin: 0, fontSize: 12, color: 'var(--color-neutral-800)' }}>
                Nhấn “Áp dụng” để kiểm tra mã và cập nhật tổng tiền trước khi đặt hàng.
              </p>
            )}

            {error && (
              <p role="status" style={{ margin: 0, fontSize: 12, color: 'var(--color-accent-700)' }}>{error}</p>
            )}
          </aside>
        </section>
      )}

    </StoreShell>
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
