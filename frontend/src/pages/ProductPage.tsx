import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate, useParams } from 'react-router-dom';
import { ApiRequestError } from '../api/http';
import {
  fetchProductBySlug,
  fetchProductFrameOptions,
  fetchProductVariants,
  formatPrice,
  formatSize,
  unitPrice,
  type Product,
  type ProductFrameOption,
  type ProductVariant,
} from '../api/storefront';
import { useProducts } from '../hooks/useCatalog';
import { useCart } from '../hooks/useCart';
import { useAuth } from '../contexts/AuthContext';
import { StoreShell } from '../components/StoreShell';
import { ClosingCta } from '../components/ClosingCta';
import { Frame } from '../components/Frame';
import { useWishlist, wishlistKey } from '../contexts/WishlistContext';
import { absoluteSiteUrl, metaDescription, useDocumentMeta } from '../hooks/useDocumentMeta';
import '../styles/ds.css';
import '../styles/public.css';

/** Stepper của thiết kế dừng ở 9; tồn kho thật vẫn là trần cứng phía trên. */
const MAX_QTY = 9;

/**
 * Chính sách giao/đổi trả không có nguồn trong backend — đây là copy của cửa hàng,
 * giữ nguyên như bản thiết kế. Đổi ở đây khi chính sách đổi.
 */
const SHIPPING_TAB = {
  title: 'Vỡ hỏng thì làm lại',
  body: 'Đóng thùng cứng có góc xốp. Nội thành TP.HCM giao trong ngày, tỉnh 2–4 ngày, đều có mã theo dõi. Hàng hỏng do vận chuyển được in lại và giao bù, bạn không phải trả thêm.',
  rows: [
    { k: 'Sản xuất', v: '3–5 ngày làm việc' },
    { k: 'Nội thành', v: 'Giao trong ngày' },
    { k: 'Tỉnh', v: '2–4 ngày, có mã theo dõi' },
    { k: 'Đóng gói', v: 'Thùng cứng, góc xốp' },
    { k: 'Đổi trả', v: 'Hỏng do vận chuyển: in lại miễn phí' },
  ],
};

/**
 * Frame.color trong DB là tên màu tiếng Việt ("Tự nhiên", "Đen mờ"), không phải mã màu,
 * nên swatch 10×10 của thiết kế phải suy ra từ tên. Không khớp thì dùng xám trung tính.
 */
const SWATCHES: [RegExp, string][] = [
  [/đen|black/i, '#201e1d'],
  [/óc chó|walnut|nâu/i, '#6b4f38'],
  [/sồi|oak|gỗ|tự nhiên|natural/i, '#c9b79c'],
  [/vàng|champagne|gold/i, '#c8a34a'],
  [/bạc|silver|xám/i, '#9b9797'],
  [/trắng|white/i, '#eae7e7'],
];

function swatchColor(name: string): string {
  return SWATCHES.find(([pattern]) => pattern.test(name))?.[1] ?? 'var(--color-neutral-400)';
}

/**
 * Nhãn khổ giống thiết kế ("60 × 80 cm"); rơi về tên variant nếu thiếu kích thước.
 *
 * Hai variant cùng kích thước khác chất liệu là hợp lệ (DB không có ràng buộc chặn), khi đó
 * nguyên khổ thì hai chip giống hệt nhau và người mua không phân biệt được — thêm chất liệu
 * vào, nhưng chỉ ở những khổ thật sự bị trùng để nhãn không dài vô cớ.
 */
function variantLabel(variant: ProductVariant, siblings: ProductVariant[] = []): string {
  const size = formatSize(variant.widthCm, variant.heightCm);
  if (size === null) return variant.name;
  const duplicated = siblings.some(
    (other) => other.id !== variant.id && formatSize(other.widthCm, other.heightCm) === size,
  );
  return duplicated ? `${size} · ${variant.material}` : size;
}

const chipStyle = (on: boolean, disabled: boolean): React.CSSProperties => ({
  appearance: 'none',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 6,
  height: 36,
  padding: '0 10px',
  font: 'inherit',
  fontSize: 12,
  fontWeight: on ? 600 : 400,
  lineHeight: 1,
  whiteSpace: 'nowrap',
  cursor: disabled ? 'not-allowed' : 'pointer',
  border: `2px solid ${on ? 'var(--color-text)' : 'var(--color-neutral-300)'}`,
  background: on ? 'var(--color-text)' : 'var(--color-bg)',
  color: on ? 'var(--color-bg)' : 'var(--color-text)',
  opacity: disabled ? 0.4 : 1,
});

const stepStyle = (disabled: boolean): React.CSSProperties => ({
  appearance: 'none',
  width: 32,
  height: 32,
  border: 0,
  background: 'transparent',
  font: 'inherit',
  fontSize: 16,
  color: 'var(--color-text)',
  cursor: disabled ? 'not-allowed' : 'pointer',
  opacity: disabled ? 0.4 : 1,
});

const optionRow: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '84px minmax(0, 1fr)',
  alignItems: 'center',
  gap: 'var(--space-4)',
  padding: 'var(--space-4) 0',
  borderBottom: '1px solid var(--color-neutral-300)',
};

const optionLabel: React.CSSProperties = {
  fontSize: 11,
  letterSpacing: '.16em',
  textTransform: 'uppercase',
  color: 'var(--color-neutral-700)',
};

const chipGrid: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(104px, 1fr))',
  gap: 6,
};

type Row = { k: string; v: string };
type Tab = { label: string; title: string; body: string; rows: Row[] };

export function ProductPage() {
  const { slug = '' } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { session } = useAuth();
  const { count: cartCount, add } = useCart();
  const { itemFor, toggle: toggleWishlist, busyKey: wishlistBusyKey } = useWishlist();

  const [product, setProduct] = useState<Product | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [variantsFailed, setVariantsFailed] = useState(false);
  const [frameOptions, setFrameOptions] = useState<ProductFrameOption[]>([]);

  const [shot, setShot] = useState(0);
  const [variantId, setVariantId] = useState<string | null>(null);
  const [frameOptionId, setFrameOptionId] = useState<string | null>(null);
  const [qty, setQty] = useState(1);
  const [tab, setTab] = useState(0);
  const [added, setAdded] = useState(false);
  const [cartError, setCartError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [wishlistError, setWishlistError] = useState<string | null>(null);

  // Khối "Cùng bộ" điều hướng bằng <Link> nên trang không unmount khi đổi sản phẩm:
  // phải tự xoá khổ/khung của sản phẩm cũ, nếu không giá hiển thị sẽ là giá variant cũ
  // trong quãng chờ danh sách variant mới về.
  useEffect(() => {
    let alive = true;
    setProduct(null);
    setLoadError(null);
    setShot(0);
    setVariants([]);
    setVariantsFailed(false);
    setVariantId(null);
    setFrameOptions([]);
    setFrameOptionId(null);
    fetchProductBySlug(slug)
      .then((item) => {
        if (alive) setProduct(item);
      })
      .catch((error: Error) => {
        if (alive) setLoadError(error.message);
      });
    return () => {
      alive = false;
    };
  }, [slug]);

  // Khổ: chọn sẵn variant còn hàng đầu tiên để giá và nút mua có nghĩa ngay khi mở trang.
  useEffect(() => {
    if (!product) return;
    let alive = true;
    fetchProductVariants(product.id)
      .then((items) => {
        if (!alive) return;
        setVariants(items);
        const sellable = items.find((v) => v.available && v.stockQuantity > 0);
        setVariantId((sellable ?? items[0])?.id ?? null);
      })
      // Nuốt lỗi ở đây thì trang trông y hệt sản phẩm bán một khổ duy nhất, giá hiển thị là
      // giá gốc, và người mua chỉ biết có chuyện khi backend từ chối lúc bấm thêm vào giỏ.
      .catch(() => {
        if (alive) {
          setVariants([]);
          setVariantsFailed(true);
        }
      });
    return () => {
      alive = false;
    };
  }, [product?.id]);

  // Khung: danh sách phụ thuộc khổ đang chọn, backend đã lọc khung không vừa kích thước.
  useEffect(() => {
    if (!product) return;
    // Sản phẩm có khổ thì chờ chọn xong khổ mới hỏi khung: hỏi trước trả về danh sách
    // rộng hơn (chưa lọc theo kích thước) rồi bị thay ngay bằng danh sách đúng.
    if (product.hasVariants && !variantId) return;
    let alive = true;
    fetchProductFrameOptions(product.id, variantId ?? undefined)
      .then((items) => {
        if (!alive) return;
        setFrameOptions(items);
        // Khung đang chọn có thể không hợp với khổ vừa đổi — bỏ chọn thay vì gửi lên rồi bị từ chối.
        setFrameOptionId((current) => (items.some((o) => o.id === current) ? current : null));
      })
      .catch(() => {
        if (alive) setFrameOptions([]);
      });
    return () => {
      alive = false;
    };
  }, [product?.id, variantId]);

  const variant = variants.find((v) => v.id === variantId) ?? null;
  const frameOption = frameOptions.find((o) => o.id === frameOptionId) ?? null;

  const images = product?.images ?? [];
  const currentImage = images[shot] ?? images[0] ?? null;
  const thumbCols = Math.min(Math.max(images.length, 1), 4);

  const stock = variant ? variant.stockQuantity : (product?.effectiveStockQuantity ?? 0);
  const maxQty = Math.max(1, Math.min(MAX_QTY, stock));
  const soldOut = stock <= 0 || Boolean(variant && !variant.available);
  useEffect(() => {
    setQty((q) => Math.min(q, maxQty));
  }, [maxQty]);

  const price = product ? unitPrice(product, variant, frameOption) : 0;

  const related = useProducts(
    useMemo(
      () => (product ? { categoryId: product.categoryId, sort: 'BEST_SELLING' as const, page: 1, size: 5 } : null),
      [product?.categoryId],
    ),
  );
  const relatedSameCategory = product ? (related.data ?? []) : [];
  const relatedItems = relatedSameCategory.filter((r) => r.slug !== slug).slice(0, 4);
  // Nhãn "Bán chạy" trước đây gắn cứng cho mọi sản phẩm. Danh sách trên đã là top bán chạy
  // của danh mục rồi, nên chỉ cần xem sản phẩm này có nằm trong đó không — không tốn request.
  const bestSelling = relatedSameCategory.some((r) => r.slug === slug);

  const tabs = useMemo<Tab[]>(() => {
    if (!product) return [];
    const sizeRows: Row[] = variants.length
      ? variants.map((v) => ({
          k: variantLabel(v, variants),
          v: `${formatPrice(v.price)} · ${v.stockQuantity > 0 ? `còn ${v.stockQuantity}` : 'hết hàng'}`,
        }))
      : [{ k: formatSize(product.widthCm, product.heightCm) ?? 'Khổ tiêu chuẩn', v: formatPrice(product.price) }];
    const frameRows: Row[] = frameOptions.map((o) => ({
      k: o.frameName,
      v: o.priceAdjustment > 0 ? `+ ${formatPrice(o.priceAdjustment)}` : 'không phụ thu',
    }));

    return [
      {
        label: 'Mô tả',
        title: product.name,
        body: product.description ?? 'Sản phẩm chưa có mô tả chi tiết.',
        rows: [
          { k: 'Danh mục', v: product.categoryName },
          { k: 'Khổ gốc', v: formatSize(product.widthCm, product.heightCm) ?? '—' },
          { k: 'Chất liệu', v: variant?.material ?? product.coverMaterial ?? '—' },
          ...(product.pageCount ? [{ k: 'Số trang', v: String(product.pageCount) }] : []),
          { k: 'Tồn kho', v: soldOut ? 'Tạm hết hàng' : `Còn ${stock}` },
        ],
      },
      {
        label: 'Khổ & giá',
        title: 'Bảng khổ và phụ thu khung',
        body: variants.length
          ? 'Giá mỗi khổ đã gồm căng khung gỗ và móc treo. Chọn thêm khung ở khối mua để cộng phụ thu tương ứng.'
          : 'Sản phẩm này bán theo một khổ duy nhất.',
        rows: frameRows.length ? [...sizeRows, ...frameRows] : sizeRows,
      },
      { label: 'Giao & đổi trả', ...SHIPPING_TAB },
    ];
  }, [product, variants, frameOptions, variant, stock, soldOut]);

  useEffect(() => {
    if (!added) return;
    const timer = window.setTimeout(() => setAdded(false), 1800);
    return () => window.clearTimeout(timer);
  }, [added]);

  const shareImage =
    product?.primaryImageUrl ??
    product?.images.find((image) => image.primaryImage)?.secureUrl ??
    product?.images[0]?.secureUrl ??
    null;
  useDocumentMeta(
    product
      ? {
          title: `${product.name} | Bubble Memories`,
          description: metaDescription(
            product.description,
            `${product.name} thuộc danh mục ${product.categoryName} tại Bubble Memories.`,
          ),
          canonicalUrl: absoluteSiteUrl(`/tranh/${encodeURIComponent(product.slug)}`),
          type: 'product',
          imageUrl: shareImage ? absoluteSiteUrl(shareImage) : null,
          imageAlt: product.name,
          jsonLd: {
            '@context': 'https://schema.org',
            '@type': 'Product',
            name: product.name,
            description: metaDescription(
              product.description,
              `${product.name} thuộc danh mục ${product.categoryName} tại Bubble Memories.`,
            ),
            image: shareImage ? [absoluteSiteUrl(shareImage)] : undefined,
            sku: product.id,
            category: product.categoryName,
            url: absoluteSiteUrl(`/tranh/${encodeURIComponent(product.slug)}`),
            offers: {
              '@type': 'Offer',
              priceCurrency: 'VND',
              price: product.price,
              availability: soldOut ? 'https://schema.org/OutOfStock' : 'https://schema.org/InStock',
              url: absoluteSiteUrl(`/tranh/${encodeURIComponent(product.slug)}`),
            },
          },
        }
      : null,
  );

  async function addToCart() {
    if (!product) return;
    setBusy(true);
    setCartError(null);
    try {
      await add({
        productId: product.id,
        productVariantId: variantId,
        productFrameOptionId: frameOptionId,
        // Trang này chỉ phục vụ hàng không bán theo trang — photobook đã chuyển sang /photobook/:slug.
        pageCount: null,
        photobookDesignId: null,
        photobookTemplateCode: null,
        quantity: qty,
        productName: product.name,
        productSlug: product.slug,
        selectedVariant: variant,
        basePrice: variant?.price ?? product.price,
        selectedFrameOption: frameOption,
        unitPrice: price,
      });
      setAdded(true);
    } catch (error) {
      setCartError(error instanceof ApiRequestError ? error.message : 'Không thêm được vào giỏ.');
    } finally {
      setBusy(false);
    }
  }

  async function toggleFavorite() {
    if (!product) return;
    if (!session) {
      navigate('/auth', { state: { from: location } });
      return;
    }
    setWishlistError(null);
    try {
      await toggleWishlist(product.id, variantId);
    } catch (cause) {
      setWishlistError(cause instanceof Error ? cause.message : 'Không cập nhật được yêu thích.');
    }
  }

  // Photobook có trục giá riêng (khổ × số trang) mà khối mua ở đây không diễn tả được:
  // hiện nó ở trang này sẽ ra giá của mức 20 trang và nút thêm vào giỏ luôn bị backend từ chối.
  if (product?.pagePriced) {
    return <Navigate to={`/photobook/${product.slug}`} replace />;
  }

  if (loadError || !product) {
    return (
      <StoreShell cartCount={cartCount}>
        <div
          style={{
            display: 'grid',
            placeItems: 'center',
            minHeight: '40vh',
            padding: 'var(--space-8)',
            gap: 'var(--space-4)',
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: 13,
              letterSpacing: '.12em',
              textTransform: 'uppercase',
              color: 'var(--color-neutral-700)',
            }}
          >
            {loadError ?? 'Đang tải sản phẩm…'}
          </p>
          {loadError && (
            <Link className="btn btn-secondary" to="/">
              ← Về trang chủ
            </Link>
          )}
        </div>
      </StoreShell>
    );
  }

  const activeTab = tabs[tab] ?? tabs[0];

  const catalogHref = `/danh-muc/${product.categorySlug}`;
  const favorite = itemFor(product.id, variantId);
  const wishlistBusy = wishlistBusyKey === wishlistKey(product.id, variantId);

  return (
    <StoreShell cartCount={cartCount}>
      <nav
        aria-label="Breadcrumb"
        data-breadcrumb=""
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-3)',
          height: 46,
          padding: '0 var(--space-8)',
          borderBottom: '2px solid var(--color-divider)',
          fontSize: 11,
          letterSpacing: '.16em',
          textTransform: 'uppercase',
          color: 'var(--color-neutral-700)',
        }}
      >
        <Link to="/" style={{ color: 'var(--color-neutral-700)', textDecoration: 'none' }}>
          Trang chủ
        </Link>
        <span aria-hidden="true">/</span>
        <Link to={catalogHref} style={{ color: 'var(--color-neutral-700)', textDecoration: 'none' }}>
          {product.categoryName}
        </Link>
        <span aria-hidden="true">/</span>
        <span style={{ color: 'var(--color-text)' }}>{product.name}</span>
        <Link
          to={catalogHref}
          data-breadcrumb-back=""
          style={{ marginLeft: 'auto', color: 'var(--color-neutral-700)', textDecoration: 'none' }}
        >
          ← Về danh sách
        </Link>
      </nav>

      <section
        data-split=""
        style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', alignItems: 'start' }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', borderRight: '2px solid var(--color-text)' }}>
          <div
            style={{
              position: 'relative',
              width: '100%',
              aspectRatio: '4/3',
              maxHeight: '62vh',
              background: 'var(--color-neutral-200)',
              borderBottom: '2px solid var(--color-text)',
              overflow: 'hidden',
            }}
          >
            <div style={{ position: 'absolute', inset: 0 }}>
              <Frame
                src={currentImage?.secureUrl}
                alt={currentImage?.altText ?? undefined}
                label={`tranh canvas — ${product.name}`}
                tone="color"
                fit="contain"
              />
            </div>
            {(soldOut || bestSelling) && (
              <span
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  padding: '6px 10px',
                  background: 'var(--color-accent)',
                  color: 'var(--color-bg)',
                  fontSize: 10,
                  fontWeight: 800,
                  letterSpacing: '.18em',
                  textTransform: 'uppercase',
                }}
              >
                {soldOut ? 'Tạm hết' : 'Bán chạy'}
              </span>
            )}
            <span
              style={{
                position: 'absolute',
                right: 'var(--space-4)',
                bottom: 'var(--space-4)',
                padding: '7px 11px',
                background: 'var(--color-text)',
                color: 'var(--color-bg)',
                fontSize: 11,
                letterSpacing: '.16em',
                textTransform: 'uppercase',
              }}
            >
              {[
                variant ? variantLabel(variant, variants) : formatSize(product.widthCm, product.heightCm),
                frameOption?.frameName ?? 'Căng viền',
              ]
                .filter(Boolean)
                .join(' · ')}
            </span>
          </div>

          {images.length > 1 && (
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${thumbCols}, minmax(0, 1fr))` }}>
              {images.map((image, k) => {
                const on = k === shot;
                return (
                  <button
                    key={image.id}
                    type="button"
                    onClick={() => setShot(k)}
                    aria-pressed={on}
                    style={{
                      appearance: 'none',
                      position: 'relative',
                      padding: 0,
                      width: '100%',
                      aspectRatio: '1/1',
                      background: 'var(--color-neutral-200)',
                      cursor: 'pointer',
                      overflow: 'hidden',
                      border: 0,
                      // Viền theo số cột thật, không phải hằng số 4: dưới 4 ảnh thì ô cuối hàng
                      // vẽ viền phải đè lên viền cột, trên 4 ảnh thì hàng thứ hai thiếu viền trên.
                      borderRight: k % thumbCols === thumbCols - 1 ? 0 : '2px solid var(--color-text)',
                      borderTop: k >= thumbCols ? '2px solid var(--color-text)' : 0,
                      outline: on ? '3px solid var(--color-accent)' : 'none',
                      outlineOffset: -3,
                    }}
                  >
                    <div style={{ position: 'absolute', inset: 0 }}>
                      <Frame
                        src={image.secureUrl}
                        alt={image.altText ?? undefined}
                        label={`ảnh ${k + 1}`}
                        tone="color"
                      />
                    </div>
                    <span
                      style={{
                        position: 'absolute',
                        left: 0,
                        bottom: 0,
                        padding: '4px 8px',
                        background: on ? 'var(--color-accent)' : 'var(--color-text)',
                        color: 'var(--color-bg)',
                        fontSize: 9,
                        fontWeight: 700,
                        letterSpacing: '.16em',
                        textTransform: 'uppercase',
                      }}
                    >
                      {image.altText || `Ảnh ${k + 1}`}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div
          data-buy=""
          id="mua"
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-5)',
            padding: 'var(--space-8)',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            <div
              style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--space-4)', alignItems: 'start' }}
            >
              <span
                style={{
                  fontSize: 11,
                  letterSpacing: '.2em',
                  textTransform: 'uppercase',
                  color: 'var(--color-accent-700)',
                }}
              >
                {product.categoryName}
              </span>
              <button
                type="button"
                aria-pressed={Boolean(favorite)}
                aria-label={favorite ? 'Bỏ sản phẩm khỏi yêu thích' : 'Lưu sản phẩm yêu thích'}
                disabled={wishlistBusy}
                onClick={() => void toggleFavorite()}
                style={{
                  appearance: 'none',
                  display: 'grid',
                  placeItems: 'center',
                  width: 38,
                  height: 38,
                  flex: 'none',
                  border: '2px solid var(--color-text)',
                  background: favorite ? 'var(--color-accent)' : 'var(--color-bg)',
                  color: favorite ? 'var(--color-bg)' : 'var(--color-text)',
                  cursor: wishlistBusy ? 'not-allowed' : 'pointer',
                }}
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill={favorite ? 'currentColor' : 'none'}
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="square"
                >
                  <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.9-8.6a5.5 5.5 0 0 0-.1-7.8Z" />
                </svg>
              </button>
            </div>
            <h1
              style={{
                margin: 0,
                fontFamily: 'var(--font-heading)',
                fontWeight: 800,
                fontSize: 30,
                lineHeight: 1.05,
                letterSpacing: '-.03em',
              }}
            >
              {product.name}
            </h1>
            {/* Mô tả nằm ở tab "Mô tả" ngay bên dưới (tab mặc định) — in lại ở đây vừa trùng
                nội dung vừa đẩy nút "Thêm vào giỏ" xuống dưới màn hình với mô tả dài. */}
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              gap: 'var(--space-4)',
              padding: 'var(--space-4) 0',
              borderTop: '2px solid var(--color-text)',
              borderBottom: '2px solid var(--color-text)',
            }}
          >
            <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: 26, letterSpacing: '-.03em' }}>
              {formatPrice(price)}
            </span>
            <span style={{ fontSize: 12, color: 'var(--color-neutral-700)' }}>
              {frameOption ? 'đã gồm khung và móc treo' : 'căng khung gỗ, đã gồm móc treo'}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {variants.length > 0 && (
              <div data-option-row="" style={optionRow}>
                <span style={optionLabel}>Khổ</span>
                <div style={chipGrid}>
                  {variants.map((v) => {
                    const disabled = !v.available || v.stockQuantity <= 0;
                    const label = variantLabel(v, variants);
                    const note = `${formatPrice(unitPrice(product, v, frameOption))}${disabled ? ' · hết hàng' : ''}`;
                    return (
                      <button
                        key={v.id}
                        type="button"
                        disabled={disabled}
                        aria-pressed={v.id === variantId}
                        title={note}
                        aria-label={`${label} — ${note}`}
                        onClick={() => setVariantId(v.id)}
                        style={chipStyle(v.id === variantId, disabled)}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {frameOptions.length > 0 && (
              <div data-option-row="" style={optionRow}>
                <span style={optionLabel}>Khung</span>
                <div style={chipGrid}>
                  <button
                    type="button"
                    aria-pressed={frameOptionId === null}
                    title="không phụ thu"
                    aria-label="Căng viền — không phụ thu"
                    onClick={() => setFrameOptionId(null)}
                    style={chipStyle(frameOptionId === null, false)}
                  >
                    <span
                      style={{
                        flex: 'none',
                        width: 10,
                        height: 10,
                        background: '#eae7e7',
                        border: `1px solid ${frameOptionId === null ? 'var(--color-bg)' : 'var(--color-text)'}`,
                      }}
                    />
                    Căng viền
                  </button>
                  {frameOptions.map((o) => {
                    const on = o.id === frameOptionId;
                    const note = o.priceAdjustment > 0 ? `+ ${formatPrice(o.priceAdjustment)}` : 'không phụ thu';
                    return (
                      <button
                        key={o.id}
                        type="button"
                        aria-pressed={on}
                        title={note}
                        aria-label={`${o.frameName} — ${note}`}
                        onClick={() => setFrameOptionId(o.id)}
                        style={chipStyle(on, false)}
                      >
                        <span
                          style={{
                            flex: 'none',
                            width: 10,
                            height: 10,
                            background: swatchColor(`${o.frameColor} ${o.frameMaterial}`),
                            border: `1px solid ${on ? 'var(--color-bg)' : 'var(--color-text)'}`,
                          }}
                        />
                        {o.frameName}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div data-option-row="" style={optionRow}>
              <span style={optionLabel}>Số lượng</span>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 'var(--space-4)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', border: '2px solid var(--color-text)' }}>
                  <button
                    type="button"
                    aria-label="Bớt một"
                    disabled={qty <= 1}
                    onClick={() => setQty((q) => Math.max(1, q - 1))}
                    style={stepStyle(qty <= 1)}
                  >
                    −
                  </button>
                  <span style={{ minWidth: 36, textAlign: 'center', fontSize: 14, fontWeight: 600 }}>{qty}</span>
                  <button
                    type="button"
                    aria-label="Thêm một"
                    disabled={qty >= maxQty}
                    onClick={() => setQty((q) => Math.min(maxQty, q + 1))}
                    style={stepStyle(qty >= maxQty)}
                  >
                    +
                  </button>
                </div>
                <span
                  style={{
                    fontSize: 12,
                    letterSpacing: '.1em',
                    textTransform: 'uppercase',
                    color: 'var(--color-neutral-700)',
                  }}
                >
                  Tổng {formatPrice(price * qty)}
                </span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            <button
              type="button"
              className="btn btn-primary btn-block"
              style={{ cursor: 'pointer' }}
              disabled={soldOut || busy || variantsFailed}
              onClick={() => void addToCart()}
            >
              {variantsFailed
                ? 'Chưa chọn được khổ'
                : soldOut
                  ? 'Tạm hết hàng'
                  : added
                    ? 'Đã thêm vào giỏ ✓'
                    : busy
                      ? 'Đang thêm…'
                      : 'Thêm vào giỏ'}
            </button>
            <a href="/#uom-tranh" className="btn btn-secondary btn-block">
              Ướm tranh lên tường nhà bạn
            </a>
            {variantsFailed && (
              <p role="status" style={{ margin: 0, fontSize: 12, color: 'var(--color-accent-700)' }}>
                Không tải được danh sách khổ tranh. Tải lại trang giúp mình nhé.
              </p>
            )}
            {cartError && (
              <p role="status" style={{ margin: 0, fontSize: 12, color: 'var(--color-accent-700)' }}>
                {cartError}
              </p>
            )}
            {wishlistError && (
              <p role="status" style={{ margin: 0, fontSize: 12, color: 'var(--color-accent-700)' }}>
                {wishlistError}
              </p>
            )}
          </div>
        </div>
      </section>

      <section style={{ borderTop: '2px solid var(--color-text)' }}>
        <div style={{ display: 'flex', gap: 'var(--space-2)', padding: 'var(--space-6) var(--space-8) 0' }}>
          {tabs.map((t, k) => (
            <button
              key={t.label}
              type="button"
              onClick={() => setTab(k)}
              style={{
                appearance: 'none',
                font: 'inherit',
                fontSize: 13,
                fontWeight: 600,
                letterSpacing: '.1em',
                textTransform: 'uppercase',
                padding: '0 var(--space-6)',
                height: 44,
                cursor: 'pointer',
                border: '2px solid var(--color-text)',
                background: k === tab ? 'var(--color-text)' : 'var(--color-bg)',
                color: k === tab ? 'var(--color-bg)' : 'var(--color-text)',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div
          data-split=""
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1.2fr)',
            gap: 'var(--space-8)',
            padding: 'var(--space-6) var(--space-8) var(--space-8)',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <h2
              style={{
                margin: 0,
                fontFamily: 'var(--font-heading)',
                fontWeight: 800,
                fontSize: 28,
                lineHeight: 1.06,
                letterSpacing: '-.03em',
              }}
            >
              {activeTab?.title}
            </h2>
            <p
              style={{ margin: 0, maxWidth: '52ch', fontSize: 15, lineHeight: 1.65, color: 'var(--color-neutral-800)' }}
            >
              {activeTab?.body}
            </p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', borderTop: '2px solid var(--color-text)' }}>
            {/* key kèm chỉ số: nhãn khổ và tên khung có thể trùng nhau giữa các hàng. */}
            {activeTab?.rows.map((row, k) => (
              <div
                key={`${row.k}-${k}`}
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1.4fr)',
                  gap: 'var(--space-6)',
                  padding: 'var(--space-4) 0',
                  borderBottom: '1px solid var(--color-neutral-300)',
                }}
              >
                <span style={optionLabel}>{row.k}</span>
                <span style={{ fontSize: 14, lineHeight: 1.5 }}>{row.v}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {relatedItems.length > 0 && (
        <section style={{ borderTop: '2px solid var(--color-text)' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              justifyContent: 'space-between',
              gap: 'var(--space-6)',
              padding: 'var(--space-6) var(--space-8)',
            }}
          >
            <h2
              style={{
                margin: 0,
                fontFamily: 'var(--font-heading)',
                fontWeight: 800,
                fontSize: 20,
                letterSpacing: '.04em',
                textTransform: 'uppercase',
              }}
            >
              Cùng bộ {product.categoryName.toLowerCase()}
            </h2>
            <Link to={catalogHref} className="btn btn-secondary">
              Xem tất cả
            </Link>
          </div>
          <div
            data-grid="cols"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
              borderTop: '2px solid var(--color-divider)',
            }}
          >
            {relatedItems.map((item, k) => (
              <Link
                key={item.id}
                to={`/tranh/${item.slug}`}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 'var(--space-2)',
                  minWidth: 0,
                  padding: 'var(--space-6)',
                  color: 'var(--color-text)',
                  textDecoration: 'none',
                  borderRight: k < relatedItems.length - 1 ? '2px solid var(--color-divider)' : undefined,
                }}
              >
                <div
                  style={{
                    position: 'relative',
                    width: '100%',
                    aspectRatio: '4/5',
                    border: '2px solid var(--color-text)',
                    overflow: 'hidden',
                  }}
                >
                  <Frame src={item.primaryImageUrl ?? undefined} label={`tranh canvas — ${item.name}`} tone="color" />
                </div>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'minmax(0, 1fr) auto',
                    alignItems: 'baseline',
                    gap: 'var(--space-4)',
                  }}
                >
                  <h3
                    style={{
                      margin: 0,
                      fontFamily: 'var(--font-heading)',
                      fontWeight: 800,
                      fontSize: 17,
                      lineHeight: 1.15,
                      letterSpacing: '-.015em',
                    }}
                  >
                    {item.name}
                  </h3>
                  <span style={{ fontSize: 14, fontWeight: 600 }}>{formatPrice(item.price)}</span>
                </div>
                <span
                  style={{
                    fontSize: 11,
                    letterSpacing: '.14em',
                    textTransform: 'uppercase',
                    color: 'var(--color-neutral-700)',
                  }}
                >
                  {formatSize(item.widthCm, item.heightCm) ?? item.categoryName}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <ClosingCta
        title="Muốn khổ khác, hoặc in ảnh của chính bạn?"
        note="Gửi file gốc, xưởng báo giá kèm bản mô phỏng trong 24 giờ."
        titleSize="clamp(26px, 3.4vw, 42px)"
      />
    </StoreShell>
  );
}
