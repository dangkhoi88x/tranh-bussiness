import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { ApiRequestError } from '../api/http';
import {
  fetchPhotobookPricing,
  photoRangeFor,
  suggestPageCount,
  type PhotobookPricing,
  type PhotobookSize,
} from '../api/photobook';
import { fetchProductBySlug, formatPrice, formatSize, type Product, type ProductVariant } from '../api/storefront';
import { useCart } from '../hooks/useCart';
import { absoluteSiteUrl, useDocumentMeta } from '../hooks/useDocumentMeta';
import { STORE_LABEL_STYLE, StoreNotice, StoreShell } from '../components/StoreShell';
import { Frame } from '../components/Frame';
import '../styles/ds.css';
import '../styles/public.css';

/**
 * Bề mặt giấy không đổi giá (bảng giá gộp chung "Eco Matte / Eco Silk"), nên nó chỉ là ghi chú
 * gửi kèm cho xưởng chứ chưa phải một trục giá. Khi nào hai loại lệch giá thì nó phải thành
 * frame-option hoặc một trục riêng ở backend, không phải chuỗi hard-code ở đây.
 */
const FINISHES = ['Eco Matte', 'Eco Silk'];

const CATALOG_HREF = '/photobook';

/**
 * Giỏ khách vãng lai lưu nguyên một CartItem để render offline, nhưng /photobook-pricing chỉ
 * trả phần thông tin khổ. Dựng lại đủ hình dạng ProductVariant từ đó, với giá là giá ở đúng
 * số trang đang chọn — đó mới là con số khách nhìn thấy trong giỏ.
 */
function variantSnapshot(product: Product, size: PhotobookSize, priceAtPageCount: number): ProductVariant {
  return {
    id: size.variantId,
    productId: product.id,
    sku: size.sku,
    name: size.name,
    widthCm: size.widthCm,
    heightCm: size.heightCm,
    artSizeId: null,
    artSizeCode: 'CUSTOM',
    materialId: null,
    material: product.coverMaterial ?? 'Photobook',
    price: priceAtPageCount,
    stockQuantity: product.effectiveStockQuantity,
    available: size.available,
  };
}

const chipStyle = (on: boolean, disabled = false): React.CSSProperties => ({
  appearance: 'none', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
  height: 36, padding: '0 10px', font: 'inherit', fontSize: 12, fontWeight: on ? 600 : 400,
  lineHeight: 1, whiteSpace: 'nowrap', cursor: disabled ? 'not-allowed' : 'pointer',
  border: `2px solid ${on ? 'var(--color-text)' : 'var(--color-neutral-300)'}`,
  background: on ? 'var(--color-text)' : 'var(--color-bg)',
  color: on ? 'var(--color-bg)' : 'var(--color-text)',
  opacity: disabled ? 0.4 : 1,
});

const stepStyle = (disabled: boolean): React.CSSProperties => ({
  appearance: 'none', width: 32, height: 32, border: 0, background: 'transparent',
  font: 'inherit', fontSize: 16, color: 'var(--color-text)',
  cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.4 : 1,
});

const optionRow: React.CSSProperties = {
  display: 'grid', gridTemplateColumns: '84px minmax(0, 1fr)', alignItems: 'center',
  gap: 'var(--space-4)', padding: 'var(--space-4) 0', borderBottom: '1px solid var(--color-neutral-300)',
};

const chipGrid: React.CSSProperties = {
  display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(104px, 1fr))', gap: 6,
};

export function PhotobookDetailPage() {
  const { slug = '' } = useParams();
  const { count: cartCount, add } = useCart();

  const [product, setProduct] = useState<Product | null>(null);
  const [pricing, setPricing] = useState<PhotobookPricing | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [sizeId, setSizeId] = useState<string | null>(null);
  const [pageIndex, setPageIndex] = useState(0);
  const [finish, setFinish] = useState(FINISHES[0]);
  const [qty, setQty] = useState(1);
  const [shot, setShot] = useState(0);
  const [photoCount, setPhotoCount] = useState('');

  const [added, setAdded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [cartError, setCartError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setProduct(null); setPricing(null); setLoadError(null);
    setSizeId(null); setPageIndex(0); setShot(0); setQty(1);
    fetchProductBySlug(slug)
      .then((item) => {
        if (!alive) return;
        setProduct(item);
        if (!item.pagePriced) return;
        return fetchPhotobookPricing(item.id).then((table) => {
          if (!alive) return;
          setPricing(table);
          setSizeId(table.sizes.find((size) => size.available)?.variantId ?? table.sizes[0]?.variantId ?? null);
        });
      })
      .catch((error: Error) => { if (alive) setLoadError(error.message); });
    return () => { alive = false; };
  }, [slug]);

  const size: PhotobookSize | null = pricing?.sizes.find((item) => item.variantId === sizeId) ?? null;
  const pageOptions = size?.pageOptions ?? [];
  // Đổi khổ giữ nguyên số trang đang chọn: mọi khổ dùng chung một danh sách mức trang.
  const selected = pageOptions[Math.min(pageIndex, Math.max(pageOptions.length - 1, 0))] ?? null;

  const price = selected?.price ?? 0;
  const photos = selected ? photoRangeFor(selected.pageCount) : null;
  const suggestion = useMemo(() => {
    const wanted = Number(photoCount);
    if (!Number.isFinite(wanted) || wanted <= 0 || !selected) return null;
    const suggested = suggestPageCount(wanted, pageOptions);
    return suggested === null || suggested === selected.pageCount ? null : suggested;
  }, [photoCount, pageOptions, selected]);

  const images = product?.images ?? [];
  const currentImage = images[shot] ?? images[0] ?? null;
  const thumbCols = Math.min(Math.max(images.length, 1), 4);

  useDocumentMeta({
    title: product ? `${product.name} | Bubble Memories` : 'Photobook | Bubble Memories',
    description: product?.description
      ?? 'Photobook in theo yêu cầu: chọn khổ và số trang, xưởng lên layout và gửi duyệt trước khi in.',
    canonicalUrl: absoluteSiteUrl(`/photobook/${slug}`),
    type: 'product',
    imageUrl: product?.primaryImageUrl ? absoluteSiteUrl(product.primaryImageUrl) : null,
    imageAlt: product?.name ?? null,
  });

  useEffect(() => {
    if (!added) return;
    const timer = window.setTimeout(() => setAdded(false), 1800);
    return () => window.clearTimeout(timer);
  }, [added]);

  // Không chặn khách chưa đăng nhập: useCart giữ giỏ ở localStorage rồi gộp lên server khi
  // đăng nhập, nên đá sang /auth ngay đây là vứt đi đúng cái đơn khách vừa quyết định mua.
  async function addToCart() {
    if (!product || !size || !selected) return;
    setBusy(true);
    setCartError(null);
    try {
      await add({
        productId: product.id,
        productVariantId: size.variantId,
        productFrameOptionId: null,
        pageCount: selected.pageCount,
        quantity: qty,
        // Ảnh chụp để giỏ khách vãng lai hiển thị được khi chưa có server; giá thật vẫn do
        // backend tính lại lúc gộp giỏ và lúc đặt đơn.
        productName: product.name,
        productSlug: product.slug,
        selectedVariant: variantSnapshot(product, size, selected.price),
        basePrice: selected.price,
        selectedFrameOption: null,
        unitPrice: selected.price,
      });
      setAdded(true);
    } catch (error) {
      setCartError(error instanceof ApiRequestError ? error.message : 'Không thêm được vào giỏ.');
    } finally {
      setBusy(false);
    }
  }

  // Trang này chỉ dựng cho sản phẩm bán theo số trang; tranh canvas vẫn thuộc về /tranh.
  if (product && !product.pagePriced) {
    return <Navigate to={`/tranh/${product.slug}`} replace />;
  }

  if (loadError || !product || !pricing) {
    return (
      <StoreShell cartCount={cartCount}>
        <StoreNotice
          title={loadError ? 'Không mở được photobook này' : 'Đang tải photobook…'}
          body={loadError ?? ''}
          action={loadError ? <Link className="btn btn-secondary" to={CATALOG_HREF}>← Về danh sách</Link> : undefined}
        />
      </StoreShell>
    );
  }

  return (
    <StoreShell cartCount={cartCount}>
      <nav aria-label="Breadcrumb" data-breadcrumb="" style={{
        display: 'flex', alignItems: 'center', gap: 'var(--space-3)', minHeight: 46, padding: '0 var(--space-8)',
        borderBottom: '2px solid var(--color-divider)', fontSize: 11, letterSpacing: '.16em',
        textTransform: 'uppercase', color: 'var(--color-neutral-700)',
      }}>
        <Link to="/" style={{ color: 'var(--color-neutral-700)', textDecoration: 'none' }}>Trang chủ</Link>
        <span aria-hidden="true">/</span>
        <Link to={CATALOG_HREF} style={{ color: 'var(--color-neutral-700)', textDecoration: 'none' }}>Photobook</Link>
        <span aria-hidden="true">/</span>
        <span style={{ color: 'var(--color-text)' }}>{product.name}</span>
        <Link to={CATALOG_HREF} data-breadcrumb-back="" style={{ marginLeft: 'auto', color: 'var(--color-neutral-700)', textDecoration: 'none' }}>← Về danh sách</Link>
      </nav>

      <section data-split="" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', alignItems: 'start' }}>
        {/* ── Trái: xem trước cuốn sách ── */}
        <div style={{ display: 'flex', flexDirection: 'column', borderRight: '2px solid var(--color-text)' }}>
          <div style={{
            position: 'relative', width: '100%', aspectRatio: '4/3', maxHeight: '62vh',
            background: 'var(--color-neutral-200)', borderBottom: '2px solid var(--color-text)', overflow: 'hidden',
          }}>
            <div style={{ position: 'absolute', inset: 0 }}>
              <Frame src={currentImage?.secureUrl} alt={currentImage?.altText ?? undefined}
                label={`photobook — ${product.name}`} tone="color" fit="contain" />
            </div>
            <span style={{
              position: 'absolute', top: 0, left: 0, padding: '6px 10px', background: 'var(--color-accent)',
              color: 'var(--color-bg)', fontSize: 10, fontWeight: 800, letterSpacing: '.18em', textTransform: 'uppercase',
            }}>Mở phẳng 180°</span>
            {size && selected && (
              <span style={{
                position: 'absolute', right: 'var(--space-4)', bottom: 'var(--space-4)', padding: '7px 11px',
                background: 'var(--color-text)', color: 'var(--color-bg)', fontSize: 11,
                letterSpacing: '.16em', textTransform: 'uppercase',
              }}>
                {formatSize(size.widthCm, size.heightCm)} · {selected.pageCount} trang · {finish}
              </span>
            )}
          </div>

          {images.length > 1 && (
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${thumbCols}, minmax(0, 1fr))` }}>
              {images.map((image, k) => {
                const on = k === shot;
                return (
                  <button key={image.id} type="button" onClick={() => setShot(k)} aria-pressed={on} style={{
                    appearance: 'none', position: 'relative', padding: 0, width: '100%', aspectRatio: '1/1',
                    background: 'var(--color-neutral-200)', cursor: 'pointer', overflow: 'hidden', border: 0,
                    borderRight: k % thumbCols === thumbCols - 1 ? 0 : '2px solid var(--color-text)',
                    borderTop: k >= thumbCols ? '2px solid var(--color-text)' : 0,
                    outline: on ? '3px solid var(--color-accent)' : 'none', outlineOffset: -3,
                  }}>
                    <div style={{ position: 'absolute', inset: 0 }}>
                      <Frame src={image.secureUrl} alt={image.altText ?? undefined} label={`ảnh ${k + 1}`} tone="color" />
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Bảng giá đầy đủ — khách so được các khổ trước khi chọn. */}
          <div style={{ padding: 'var(--space-6) var(--space-8)' }}>
            <span style={STORE_LABEL_STYLE}>Bảng giá theo khổ</span>
            <div style={{ marginTop: 'var(--space-4)', overflowX: 'auto' }}>
              <table className="table" style={{ minWidth: 320 }}>
                <thead>
                  <tr>
                    <th>Số trang</th>
                    {pricing.sizes.map((item) => <th key={item.variantId}>{item.name}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {(pricing.sizes[0]?.pageOptions ?? []).slice(0, 6).map((option, index) => (
                    <tr key={option.pageCount}>
                      <td>{option.pageCount} trang</td>
                      {pricing.sizes.map((item) => (
                        <td key={item.variantId}>{formatPrice(item.pageOptions[index]?.price)}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p style={{ margin: 'var(--space-3) 0 0', fontSize: 12, color: 'var(--color-neutral-700)' }}>
              Trên {pricing.sizes[0]?.pageOptions[1]?.pageCount ?? pricing.minPages} trang:
              thêm {formatPrice(pricing.pricePerStep)} mỗi {pricing.pageStep} trang, tối đa {pricing.maxPages} trang.
            </p>
          </div>
        </div>

        {/* ── Phải: khối mua ── */}
        <div id="mua" style={{
          display: 'flex', flexDirection: 'column', gap: 'var(--space-5)', padding: 'var(--space-8)',
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            <span style={{ fontSize: 11, letterSpacing: '.2em', textTransform: 'uppercase', color: 'var(--color-accent-700)' }}>
              {product.categoryName}
            </span>
            <h1 style={{ margin: 0, fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: 30, lineHeight: 1.05, letterSpacing: '-.03em' }}>
              {product.name}
            </h1>
            {product.description && (
              <p style={{ margin: 0, maxWidth: '48ch', fontSize: 15, lineHeight: 1.6, color: 'var(--color-neutral-800)' }}>
                {product.description}
              </p>
            )}
          </div>

          <div style={{
            display: 'flex', alignItems: 'baseline', gap: 'var(--space-4)', padding: 'var(--space-4) 0',
            borderTop: '2px solid var(--color-text)', borderBottom: '2px solid var(--color-text)',
          }}>
            <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: 26, letterSpacing: '-.03em' }}>
              {formatPrice(price)}
            </span>
            <span style={{ fontSize: 12, color: 'var(--color-neutral-700)' }}>
              đã gồm bìa cứng in hình và áo bọc
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div data-option-row="" style={optionRow}>
              <span style={STORE_LABEL_STYLE}>Khổ</span>
              <div style={chipGrid}>
                {pricing.sizes.map((item) => {
                  const on = item.variantId === sizeId;
                  const at = item.pageOptions[Math.min(pageIndex, item.pageOptions.length - 1)];
                  return (
                    <button key={item.variantId} type="button" disabled={!item.available} aria-pressed={on}
                      title={at ? formatPrice(at.price) : undefined}
                      aria-label={`${item.name}${at ? ` — ${formatPrice(at.price)}` : ''}`}
                      onClick={() => setSizeId(item.variantId)} style={chipStyle(on, !item.available)}>
                      {item.name}
                    </button>
                  );
                })}
              </div>
            </div>

            <div data-option-row="" style={optionRow}>
              <span style={STORE_LABEL_STYLE}>Số trang</span>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-4)', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', border: '2px solid var(--color-text)' }}>
                  <button type="button" aria-label="Bớt trang" disabled={pageIndex <= 0}
                    onClick={() => setPageIndex((i) => Math.max(0, i - 1))} style={stepStyle(pageIndex <= 0)}>−</button>
                  <span style={{ minWidth: 72, textAlign: 'center', fontSize: 14, fontWeight: 600 }}>
                    {selected?.pageCount ?? '—'} trang
                  </span>
                  <button type="button" aria-label="Thêm trang" disabled={pageIndex >= pageOptions.length - 1}
                    onClick={() => setPageIndex((i) => Math.min(pageOptions.length - 1, i + 1))}
                    style={stepStyle(pageIndex >= pageOptions.length - 1)}>+</button>
                </div>
                {photos && (
                  <span style={{ ...STORE_LABEL_STYLE, letterSpacing: '.1em' }}>
                    Cần {photos.min}–{photos.max} hình
                  </span>
                )}
              </div>
            </div>

            <div data-option-row="" style={optionRow}>
              <span style={STORE_LABEL_STYLE}>Bề mặt</span>
              <div style={chipGrid}>
                {FINISHES.map((item) => (
                  <button key={item} type="button" aria-pressed={item === finish} title="không phụ thu"
                    onClick={() => setFinish(item)} style={chipStyle(item === finish)}>{item}</button>
                ))}
              </div>
            </div>

            <div data-option-row="" style={optionRow}>
              <span style={STORE_LABEL_STYLE}>Số lượng</span>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-4)' }}>
                <div style={{ display: 'flex', alignItems: 'center', border: '2px solid var(--color-text)' }}>
                  <button type="button" aria-label="Bớt một" disabled={qty <= 1}
                    onClick={() => setQty((q) => Math.max(1, q - 1))} style={stepStyle(qty <= 1)}>−</button>
                  <span style={{ minWidth: 36, textAlign: 'center', fontSize: 14, fontWeight: 600 }}>{qty}</span>
                  <button type="button" aria-label="Thêm một" disabled={qty >= 9}
                    onClick={() => setQty((q) => Math.min(9, q + 1))} style={stepStyle(qty >= 9)}>+</button>
                </div>
                <span style={{ fontSize: 12, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--color-neutral-700)' }}>
                  Tổng {formatPrice(price * qty)}
                </span>
              </div>
            </div>
          </div>

          {/* Gợi ý số trang theo số ảnh — chính là điều bảng giá hứa bằng lời. */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            <label htmlFor="photo-count" style={STORE_LABEL_STYLE}>Bạn có bao nhiêu ảnh?</label>
            <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center', flexWrap: 'wrap' }}>
              <input id="photo-count" className="input" type="number" min={1} inputMode="numeric"
                placeholder="ví dụ 150" value={photoCount}
                onChange={(event) => setPhotoCount(event.target.value)} style={{ maxWidth: 140 }} />
              {suggestion !== null && (
                <button type="button" className="btn btn-ghost"
                  onClick={() => setPageIndex(pageOptions.findIndex((option) => option.pageCount === suggestion))}>
                  Nên chọn {suggestion} trang →
                </button>
              )}
            </div>
            <p style={{ margin: 0, fontSize: 12, lineHeight: 1.5, color: 'var(--color-neutral-700)' }}>
              Không giới hạn số ảnh mỗi trang. Ảnh nhiều thì tăng thêm trang để bố cục thoáng hơn.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            <button type="button" className="btn btn-primary btn-block" style={{ cursor: 'pointer' }}
              disabled={busy || !selected || !size?.available} onClick={() => void addToCart()}>
              {!size?.available ? 'Khổ này tạm ngưng'
                : added ? 'Đã thêm vào giỏ ✓'
                  : busy ? 'Đang thêm…' : 'Thêm vào giỏ'}
            </button>
            <Link to="/dat-in" className="btn btn-secondary btn-block">Gửi ảnh để xưởng lên layout</Link>
            {cartError && (
              <p role="status" style={{ margin: 0, fontSize: 12, color: 'var(--color-accent-700)' }}>{cartError}</p>
            )}
            <p style={{ margin: 0, fontSize: 12, lineHeight: 1.5, color: 'var(--color-neutral-700)' }}>
              Đặt xong bạn gửi ảnh, xưởng lên layout và gửi bản mềm duyệt trước khi in.
            </p>
          </div>
        </div>
      </section>
    </StoreShell>
  );
}
