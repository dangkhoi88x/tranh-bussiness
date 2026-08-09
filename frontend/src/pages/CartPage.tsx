import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ApiRequestError } from '../api/http';
import { formatPrice } from '../api/storefront';
import { useCart } from '../hooks/useCart';
import { useAuth } from '../contexts/AuthContext';
import {
  cartItemOptions,
  STORE_LABEL_STYLE,
  StoreNotice,
  StoreShell,
  StoreSummaryRow,
} from '../components/StoreShell';
import '../styles/ds.css';
import '../styles/public.css';

/** UpdateCartItemRequest chặn ở 999; tồn kho thật vẫn là trần cứng phía trên. */
const MAX_QTY = 999;

const stepStyle = (disabled: boolean): React.CSSProperties => ({
  appearance: 'none', width: 32, height: 32, border: 0, background: 'transparent',
  font: 'inherit', fontSize: 16, color: 'var(--color-text)',
  cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.4 : 1,
});

export function CartPage() {
  const { session } = useAuth();
  const { cart, loading, count, pendingGuestCount, update, remove, clear, mergePending } = useCart();

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
  const pendingMergeBusy = busyItemId === 'guest-cart-merge';

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
    <StoreShell cartCount={count}>
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
          <span style={STORE_LABEL_STYLE}>{count} sản phẩm · {items.length} dòng</span>
        )}
      </section>

      {!session && items.length > 0 && (
        <p role="status" style={{ margin: '0 var(--space-8) var(--space-5)', padding: 'var(--space-3) 0', borderTop: '1px solid var(--color-neutral-300)', borderBottom: '1px solid var(--color-neutral-300)', fontSize: 13, color: 'var(--color-neutral-800)' }}>
          Giỏ này đang được lưu trên thiết bị này. Đăng nhập khi đặt hàng để gộp vào tài khoản của bạn.
        </p>
      )}

      {loading ? (
        <StoreNotice title="Đang tải giỏ hàng…" body="" />
      ) : items.length === 0 ? (
        <StoreNotice
          title="Giỏ hàng đang trống"
          body="Chọn một bức ưng ý, khổ và khung sẽ tính giá ngay tại trang sản phẩm."
          action={<Link className="btn btn-primary" to="/danh-muc/tranh-canvas">Xem tranh canvas</Link>}
        />
      ) : (
        <>
        {session && pendingGuestCount > 0 && (
          <p role="status" style={{ margin: '0 var(--space-8) var(--space-5)', padding: 'var(--space-3) 0', borderTop: '1px solid var(--color-neutral-300)', borderBottom: '1px solid var(--color-neutral-300)', fontSize: 13, color: 'var(--color-accent-700)' }}>
            {pendingGuestCount} lựa chọn chưa được chuyển vì thông tin sản phẩm vừa thay đổi.{' '}
            <button type="button" className="btn btn-ghost" disabled={pendingMergeBusy} onClick={() => void run('guest-cart-merge', mergePending)}>{pendingMergeBusy ? 'Đang thử lại…' : 'Thử lại'}</button>
          </p>
        )}
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
                    <span style={STORE_LABEL_STYLE}>{cartItemOptions(item)}</span>
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
              <Link to="/danh-muc/tranh-canvas" className="btn btn-secondary">← Xem thêm tranh</Link>
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
              <StoreSummaryRow label="Số lượng" value={`${count} bức`} />
              <StoreSummaryRow label="Tạm tính" value={formatPrice(cart?.subtotal ?? 0)} />
              <StoreSummaryRow label="Vận chuyển" value="Tính khi đặt hàng" />
            </div>

            <div style={{
              display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
              gap: 'var(--space-4)', padding: 'var(--space-4) 0',
              borderTop: '2px solid var(--color-text)', borderBottom: '2px solid var(--color-text)',
            }}>
              <span style={STORE_LABEL_STYLE}>Tổng</span>
              <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: 26, letterSpacing: '-.03em' }}>
                {formatPrice(cart?.subtotal ?? 0)}
              </span>
            </div>

            {session ? (
              <Link to="/thanh-toan" className="btn btn-primary btn-block">Tiến hành đặt hàng</Link>
            ) : (
              <Link to="/auth" state={{ from: { pathname: '/thanh-toan' } }} className="btn btn-primary btn-block">Đăng nhập để đặt hàng</Link>
            )}

            {error && (
              <p role="status" style={{ margin: 0, fontSize: 12, color: 'var(--color-accent-700)' }}>{error}</p>
            )}
          </aside>
        </section>
        </>
      )}

    </StoreShell>
  );
}
