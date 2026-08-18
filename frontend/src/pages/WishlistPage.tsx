import { Link, useLocation, useNavigate } from 'react-router-dom';
import { formatPrice, formatSize } from '../api/storefront';
import { useAuth } from '../contexts/AuthContext';
import { useWishlist } from '../contexts/WishlistContext';
import { useCart } from '../hooks/useCart';
import { Frame } from '../components/Frame';
import { STORE_LABEL_STYLE, StoreNotice, StoreShell } from '../components/StoreShell';
import '../styles/ds.css';
import '../styles/public.css';

export function WishlistPage() {
  const { session } = useAuth();
  const { count } = useCart();
  const { items, loading, error, busyKey, toggle, reload } = useWishlist();
  const location = useLocation();
  const navigate = useNavigate();
  if (!session)
    return (
      <StoreShell cartCount={count}>
        <Breadcrumb />
        <StoreNotice
          title="Đăng nhập để xem sản phẩm yêu thích"
          body="Danh sách yêu thích được lưu theo tài khoản để bạn có thể quay lại bất cứ lúc nào."
          action={
            <Link to="/auth" state={{ from: location }} className="btn btn-primary">
              Đăng nhập
            </Link>
          }
        />
      </StoreShell>
    );
  return (
    <StoreShell cartCount={count}>
      <Breadcrumb />
      <section
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          gap: 'var(--space-4)',
          padding: 'var(--space-8) var(--space-8) var(--space-6)',
          borderBottom: '2px solid var(--color-text)',
        }}
      >
        <div>
          <h1 style={title}>Sản phẩm yêu thích</h1>
          <p style={{ margin: 'var(--space-2) 0 0', fontSize: 14, color: 'var(--color-neutral-800)' }}>
            Lưu lại những bức bạn muốn xem hoặc in sau.
          </p>
        </div>
        <span style={STORE_LABEL_STYLE}>{items.length} sản phẩm</span>
      </section>
      {loading ? (
        <StoreNotice title="Đang tải danh sách yêu thích…" body="" />
      ) : error && items.length === 0 ? (
        <StoreNotice
          title="Không tải được danh sách yêu thích"
          body={error}
          action={
            <button type="button" className="btn btn-primary" onClick={() => void reload()}>
              Thử lại
            </button>
          }
        />
      ) : items.length === 0 ? (
        <StoreNotice
          title="Bạn chưa lưu sản phẩm nào"
          body="Bấm trái tim ở trang sản phẩm để giữ lại bức bạn thích."
          action={
            <Link className="btn btn-primary" to="/danh-muc/tranh-canvas">
              Xem tranh canvas
            </Link>
          }
        />
      ) : (
        <>
          <div
            data-grid="cols"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
              borderTop: '2px solid var(--color-text)',
            }}
          >
            {items.map((item, index) => (
              <article
                key={item.id}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  minWidth: 0,
                  borderRight: (index + 1) % 3 !== 0 ? '2px solid var(--color-divider)' : undefined,
                  borderBottom: '2px solid var(--color-divider)',
                }}
              >
                <Link
                  to={`/tranh/${item.product.slug}`}
                  style={{ padding: 'var(--space-6)', color: 'var(--color-text)', textDecoration: 'none' }}
                >
                  <div style={{ aspectRatio: '4/5', border: '2px solid var(--color-text)', overflow: 'hidden' }}>
                    <Frame
                      src={item.primaryImageUrl ?? item.product.primaryImageUrl ?? undefined}
                      label={item.product.name}
                      tone="color"
                    />
                  </div>
                  <h2 style={{ margin: 'var(--space-3) 0 var(--space-1)', fontSize: 19 }}>{item.product.name}</h2>
                  <p style={{ margin: 0, fontSize: 13, color: 'var(--color-neutral-800)' }}>
                    {[
                      item.selectedVariant
                        ? (formatSize(item.selectedVariant.widthCm, item.selectedVariant.heightCm) ??
                          item.selectedVariant.name)
                        : null,
                      item.selectedVariant?.material,
                    ]
                      .filter(Boolean)
                      .join(' · ') || item.product.categoryName}
                  </p>
                  <strong style={{ display: 'block', marginTop: 'var(--space-2)' }}>
                    {formatPrice(item.selectedVariant?.price ?? item.product.price)}
                  </strong>
                </Link>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: 'var(--space-3)',
                    alignItems: 'center',
                    padding: '0 var(--space-6) var(--space-5)',
                  }}
                >
                  <button
                    type="button"
                    className="btn btn-ghost"
                    disabled={busyKey === `${item.product.id}:${item.selectedVariant?.id ?? ''}`}
                    onClick={() => void toggle(item.product.id, item.selectedVariant?.id).catch(() => undefined)}
                    style={{ color: 'var(--color-accent-700)' }}
                  >
                    Bỏ yêu thích
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => navigate(`/tranh/${item.product.slug}`)}
                  >
                    Xem tranh
                  </button>
                </div>
              </article>
            ))}
          </div>
          {error && (
            <p
              role="status"
              style={{ margin: 'var(--space-4) var(--space-8)', fontSize: 13, color: 'var(--color-accent-700)' }}
            >
              {error}
            </p>
          )}
        </>
      )}
    </StoreShell>
  );
}

function Breadcrumb() {
  return (
    <nav aria-label="Breadcrumb" data-breadcrumb="" style={breadcrumb}>
      <Link to="/" style={{ color: 'var(--color-neutral-700)', textDecoration: 'none' }}>
        Trang chủ
      </Link>
      <span>/</span>
      <span style={{ color: 'var(--color-text)' }}>Yêu thích</span>
    </nav>
  );
}
const title: React.CSSProperties = {
  margin: 0,
  fontFamily: 'var(--font-heading)',
  fontWeight: 800,
  fontSize: 'clamp(30px, 5vw, 40px)',
  lineHeight: 1.02,
  letterSpacing: '-.035em',
};
const breadcrumb: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 'var(--space-3)',
  minHeight: 46,
  padding: '0 var(--space-8)',
  borderBottom: '2px solid var(--color-divider)',
  fontSize: 11,
  letterSpacing: '.16em',
  textTransform: 'uppercase',
  color: 'var(--color-neutral-700)',
};
