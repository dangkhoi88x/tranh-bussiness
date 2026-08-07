import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ApiRequestError } from '../api/http';
import { formatPrice, formatSize } from '../api/storefront';
import type { CartItem } from '../api/cart';
import { useCart } from '../hooks/useCart';
import { useAuth } from '../contexts/AuthContext';
import { SiteHeader } from '../components/SiteHeader';
import { SiteFooter } from '../components/SiteFooter';
import '../styles/ds.css';
import '../styles/public.css';

/** UpdateCartItemRequest chặn ở 999; tồn kho thật vẫn là trần cứng phía trên. */
const MAX_QTY = 999;

const label: React.CSSProperties = {
  fontSize: 11, letterSpacing: '.16em', textTransform: 'uppercase', color: 'var(--color-neutral-700)',
};

const stepStyle = (disabled: boolean): React.CSSProperties => ({
  appearance: 'none', width: 32, height: 32, border: 0, background: 'transparent',
  font: 'inherit', fontSize: 16, color: 'var(--color-text)',
  cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.4 : 1,
});

/** Mô tả lựa chọn của một dòng: "60 × 80 cm · Canvas · Khung đen tối giản". */
function itemOptions(item: CartItem): string {
  const variant = item.selectedVariant;
  return [
    variant ? formatSize(variant.widthCm, variant.heightCm) ?? variant.name : null,
    variant?.material,
    item.selectedFrameOption?.frameName ?? 'Căng viền',
  ].filter(Boolean).join(' · ');
}

export function CartPage() {
  const location = useLocation();
  const { session } = useAuth();
  const { cart, loading, count, update, remove, clear } = useCart();

  // Khoá riêng từng dòng: bấm + ở dòng này không nên làm đơ stepper của dòng khác.
  const [busyItemId, setBusyItemId] = useState<string | null>(null);
  const [clearing, setClearing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Chụp tiêu đề gốc trước khi ghi đè, rồi trả lại khi rời trang.
  useEffect(() => {
    const original = document.title;
    document.title = 'Giỏ hàng | Bubble Memories';
    return () => { document.title = original; };
  }, []);

  const items = cart?.items ?? [];

  async function run(itemId: string, action: () => Promise<unknown>) {
    setBusyItemId(itemId);
    setError(null);
    try {
      await action();
    } catch (e) {
      setError(e instanceof ApiRequestError ? e.message : 'Không cập nhật được giỏ hàng.');
    } finally {
      setBusyItemId(null);
    }
  }

  async function clearAll() {
    setClearing(true);
    setError(null);
    try {
      await clear();
    } catch (e) {
      setError(e instanceof ApiRequestError ? e.message : 'Không xoá được giỏ hàng.');
    } finally {
      setClearing(false);
    }
  }

  return (
    <Shell cartCount={count}>
      <nav aria-label="Breadcrumb" data-breadcrumb="" style={{
        display: 'flex', alignItems: 'center', gap: 'var(--space-3)', height: 46, padding: '0 var(--space-8)',
        borderBottom: '2px solid var(--color-divider)', fontSize: 11, letterSpacing: '.16em',
        textTransform: 'uppercase', color: 'var(--color-neutral-700)',
      }}>
        <Link to="/" style={{ color: 'var(--color-neutral-700)', textDecoration: 'none' }}>Trang chủ</Link>
        <span aria-hidden="true">/</span>
        <span style={{ color: 'var(--color-text)' }}>Giỏ hàng</span>
      </nav>

      <section style={{
        display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 'var(--space-6)',
        padding: 'var(--space-8) var(--space-8) var(--space-6)',
      }}>
        <h1 style={{ margin: 0, fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: 34, lineHeight: 1.02, letterSpacing: '-.03em' }}>
          Giỏ hàng
        </h1>
        {items.length > 0 && (
          <span style={label}>{count} sản phẩm · {items.length} dòng</span>
        )}
      </section>

      {!session ? (
        <Notice
          title="Đăng nhập để xem giỏ hàng"
          body="Giỏ hàng gắn với tài khoản nên xưởng giữ lại được lựa chọn của bạn giữa các lần ghé."
          action={<Link className="btn btn-primary" to="/auth" state={{ from: location }}>Đăng nhập</Link>}
        />
      ) : loading ? (
        <Notice title="Đang tải giỏ hàng…" body="" />
      ) : items.length === 0 ? (
        <Notice
          title="Giỏ hàng đang trống"
          body="Chọn một bức ưng ý, khổ và khung sẽ tính giá ngay tại trang sản phẩm."
          action={<a className="btn btn-primary" href="/#tranh-canvas">Xem tranh canvas</a>}
        />
      ) : (
        <section data-split="" style={{
          display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, .58fr)',
          alignItems: 'start', borderTop: '2px solid var(--color-text)',
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', borderRight: '2px solid var(--color-text)' }}>
            {items.map((item) => {
              const busy = busyItemId === item.id;
              return (
                <article key={item.id} style={{
                  display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', gap: 'var(--space-4)',
                  padding: 'var(--space-6) var(--space-8)', borderBottom: '1px solid var(--color-neutral-300)',
                  opacity: busy ? 0.55 : 1,
                }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', minWidth: 0 }}>
                    <Link to={`/tranh/${item.productSlug}`} style={{
                      fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: 19, lineHeight: 1.15,
                      letterSpacing: '-.015em', color: 'var(--color-text)', textDecoration: 'none',
                    }}>{item.productName}</Link>
                    <span style={label}>{itemOptions(item)}</span>
                    <span style={{ fontSize: 13, color: 'var(--color-neutral-700)' }}>
                      {formatPrice(item.unitPrice)} / bức
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 'var(--space-3)' }}>
                    <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: 18, letterSpacing: '-.02em' }}>
                      {formatPrice(item.lineTotal)}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', border: '2px solid var(--color-text)' }}>
                      <button type="button" aria-label={`Bớt một ${item.productName}`}
                        disabled={busy || item.quantity <= 1}
                        onClick={() => void run(item.id, () => update(item.id, item.quantity - 1))}
                        style={stepStyle(busy || item.quantity <= 1)}>−</button>
                      <span style={{ minWidth: 36, textAlign: 'center', fontSize: 14, fontWeight: 600 }}>{item.quantity}</span>
                      <button type="button" aria-label={`Thêm một ${item.productName}`}
                        disabled={busy || item.quantity >= MAX_QTY}
                        onClick={() => void run(item.id, () => update(item.id, item.quantity + 1))}
                        style={stepStyle(busy || item.quantity >= MAX_QTY)}>+</button>
                    </div>
                    <button type="button" disabled={busy}
                      onClick={() => void run(item.id, () => remove(item.id))}
                      style={{
                        appearance: 'none', border: 0, padding: 0, background: 'transparent', font: 'inherit',
                        fontSize: 11, letterSpacing: '.14em', textTransform: 'uppercase',
                        color: 'var(--color-accent-700)', cursor: busy ? 'not-allowed' : 'pointer',
                      }}>Xoá</button>
                  </div>
                </article>
              );
            })}

            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--space-4)', padding: 'var(--space-6) var(--space-8)' }}>
              <a href="/#tranh-canvas" className="btn btn-secondary">← Xem thêm tranh</a>
              <button type="button" className="btn btn-ghost" disabled={clearing}
                onClick={() => void clearAll()} style={{ cursor: clearing ? 'not-allowed' : 'pointer' }}>
                {clearing ? 'Đang xoá…' : 'Xoá cả giỏ'}
              </button>
            </div>
          </div>

          <aside style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)', padding: 'var(--space-8)' }}>
            <h2 style={{ margin: 0, fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: 20, letterSpacing: '.04em', textTransform: 'uppercase' }}>
              Tạm tính
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', borderTop: '2px solid var(--color-text)' }}>
              <SummaryRow k="Số lượng" v={`${count} bức`} />
              <SummaryRow k="Tạm tính" v={formatPrice(cart?.subtotal ?? 0)} />
              <SummaryRow k="Vận chuyển" v="Tính khi đặt hàng" />
            </div>

            <div style={{
              display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
              gap: 'var(--space-4)', padding: 'var(--space-4) 0',
              borderTop: '2px solid var(--color-text)', borderBottom: '2px solid var(--color-text)',
            }}>
              <span style={label}>Tổng</span>
              <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: 26, letterSpacing: '-.03em' }}>
                {formatPrice(cart?.subtotal ?? 0)}
              </span>
            </div>

            {/* Nút thật sẽ dẫn sang /thanh-toan — trang đó chưa dựng (xem App.tsx), nên khoá
                lại kèm lý do thay vì gắn một link không đi tới đâu. */}
            <button type="button" className="btn btn-primary btn-block" disabled
              title="Trang thanh toán chưa dựng">Tiến hành đặt hàng</button>
            <p style={{ margin: 0, fontSize: 12, lineHeight: 1.5, color: 'var(--color-neutral-700)' }}>
              Trang thanh toán đang được dựng. Trong lúc chờ, gọi 0909 000 000 để xưởng chốt đơn giúp bạn.
            </p>

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

/** Ba trạng thái rỗng (chưa đăng nhập, đang tải, giỏ trống) dùng chung một khung. */
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

/** Khung trang giống ProductPage: nền desk, container 1180px kẻ dọc hai bên, header sticky. */
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
