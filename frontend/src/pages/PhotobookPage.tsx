import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchPhotobookPricing } from '../api/photobook';
import { formatPrice, formatSize, type Product } from '../api/storefront';
import { useCategories, useProducts } from '../hooks/useCatalog';
import { useCart } from '../hooks/useCart';
import { absoluteSiteUrl, useDocumentMeta } from '../hooks/useDocumentMeta';
import { StoreShell } from '../components/StoreShell';
import { Frame } from '../components/Frame';
import { layoutByCode } from '../data/spreadLayouts';
import '../styles/ds.css';
import '../styles/public.css';

const SLUG_PHOTOBOOK = 'photobook';

const label: React.CSSProperties = {
  fontSize: 11, letterSpacing: '.16em', textTransform: 'uppercase', color: 'var(--color-neutral-700)',
};

export function PhotobookPage() {
  const { count } = useCart();
  const { data: categories, error: catError } = useCategories();
  const photobookCat = categories?.find((c) => c.slug === SLUG_PHOTOBOOK) ?? null;

  const { data: books, loading, error } = useProducts(
    useMemo(
      () => (photobookCat ? { categoryId: photobookCat.id, sort: 'BEST_SELLING' as const, page: 1, size: 12 } : null),
      [photobookCat?.id],
    ),
  );
  const items = books ?? [];

  const [tab, setTab] = useState(0);

  useDocumentMeta({
    title: 'Photobook | Bubble Memories',
    description: 'Làm photobook theo yêu cầu để giữ khoảnh khắc trong từng trang giấy.',
    canonicalUrl: absoluteSiteUrl('/photobook'),
    type: 'website',
    imageUrl: items[0]?.primaryImageUrl ? absoluteSiteUrl(items[0].primaryImageUrl) : null,
    imageAlt: 'Photobook Bubble Memories',
  });

  const TABS = ['Tổng quan', 'Bao gồm', 'Lưu ý'];
  const tabContent = [
    'Mỗi cuốn photobook được thiết kế riêng theo phong cách và ảnh của bạn. Xưởng layout, chỉnh màu và in thủ công trên giấy mỹ thuật, đóng bìa cứng bọc vải.',
    'Thiết kế layout theo template có sẵn hoặc tuỳ chỉnh · Chỉnh màu chuyên nghiệp · In trên giấy mỹ thuật 250gsm · Bìa cứng bọc vải, ép nhũ tên · Hộp đựng riêng · Giao hàng toàn quốc.',
    'Ảnh gốc từ 8MP trở lên để in sắc nét. File JPEG hoặc TIFF, không nén quá mạnh. Xưởng gửi bản mềm duyệt trước khi in — sửa miễn phí 2 lần. Thời gian hoàn thành 7–10 ngày làm việc.',
  ];

  return (
    <StoreShell cartCount={count}>

        {/* ══ Hero ══ */}
        <section style={{
          position: 'relative', width: '100%', aspectRatio: '16 / 7', overflow: 'hidden',
          borderBottom: '2px solid var(--color-text)',
        }}>
          <div style={{ position: 'absolute', inset: 0 }}>
            <Frame src={items[0]?.primaryImageUrl ?? undefined} label="photobook hero" tone="color" fit="cover" />
          </div>
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,.45) 0%, rgba(0,0,0,.15) 50%, rgba(0,0,0,.5) 100%)' }} />
          <div style={{
            position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column',
            justifyContent: 'flex-end', height: '100%', padding: 'var(--space-8)',
          }}>
            <span style={{ fontSize: 11, letterSpacing: '.2em', textTransform: 'uppercase', color: 'rgba(255,255,255,.8)', marginBottom: 'var(--space-2)' }}>
              Photobook
            </span>
            <h1 style={{
              margin: 0, fontFamily: 'var(--font-heading)', fontWeight: 800,
              fontSize: 'clamp(28px, 5vw, 56px)', lineHeight: .94, letterSpacing: '-.03em',
              color: '#fff', maxWidth: '16ch',
            }}>Giữ khoảnh khắc trong từng trang giấy</h1>
            <p style={{ margin: 0, marginTop: 'var(--space-3)', maxWidth: '38ch', fontSize: 14, lineHeight: 1.5, color: 'rgba(255,255,255,.85)' }}>
              Template thiết kế sẵn — chỉ cần gửi ảnh, xưởng lo phần còn lại.
            </p>
          </div>
        </section>

        {/* ══ Template showcase — each template gets its own section ══ */}
        {!catError && !error && loading && items.length === 0 && (
          <div style={{
            display: 'grid', placeItems: 'center', minHeight: '30vh',
            fontSize: 13, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--color-neutral-700)',
            borderBottom: '2px solid var(--color-text)',
          }}>Đang tải template…</div>
        )}

        {(catError || error) && (
          <div style={{
            display: 'grid', placeItems: 'center', minHeight: '30vh',
            fontSize: 14, color: 'var(--color-accent-700)',
            borderBottom: '2px solid var(--color-text)', padding: 'var(--space-8)', textAlign: 'center',
          }}>Không tải được danh sách template. Vui lòng thử lại sau.</div>
        )}

        {!catError && !error && !loading && categories && !photobookCat && (
          <div style={{
            display: 'grid', placeItems: 'center', minHeight: '30vh',
            fontSize: 14, color: 'var(--color-neutral-700)',
            borderBottom: '2px solid var(--color-text)', padding: 'var(--space-8)', textAlign: 'center',
          }}>Chưa có template photobook nào.</div>
        )}

        {items.map((book, idx) => (
          <TemplateSection key={book.id} book={book} index={idx} />
        ))}

        {/* ══ Details tabs ══ */}
        <section style={{ position: 'relative', overflow: 'hidden', borderBottom: '2px solid var(--color-text)' }}>
          <div style={{ position: 'absolute', inset: 0 }}>
            <Frame src={items[2]?.primaryImageUrl ?? items[0]?.primaryImageUrl ?? undefined} label="details background" tone="color" fit="cover" />
          </div>
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(32,30,29,.7), rgba(32,30,29,.85))' }} />
          <div style={{
            position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column',
            alignItems: 'center', gap: 'var(--space-6)', padding: 'var(--space-8)',
            color: '#fff', textAlign: 'center',
          }}>
            <span style={{ fontSize: 11, letterSpacing: '.2em', textTransform: 'uppercase', color: 'rgba(255,255,255,.7)' }}>Chi tiết</span>
            <h2 style={{ margin: 0, fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: 26, letterSpacing: '.04em', textTransform: 'uppercase' }}>
              Tất cả thông tin
            </h2>
            <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
              {TABS.map((t, k) => (
                <button key={t} type="button" onClick={() => setTab(k)} style={{
                  appearance: 'none', font: 'inherit', fontSize: 12, fontWeight: 600, fontStyle: 'italic',
                  letterSpacing: '.08em', padding: '0 var(--space-4)', height: 36, cursor: 'pointer',
                  border: '1px solid rgba(255,255,255,.4)',
                  background: tab === k ? 'rgba(255,255,255,.18)' : 'transparent',
                  color: '#fff', transition: 'background .2s',
                }}>
                  <span style={{ fontSize: 10, marginRight: 6, opacity: .6 }}>0{k + 1}.</span>{t}
                </button>
              ))}
            </div>
            <p style={{ margin: 0, maxWidth: '52ch', fontSize: 14, lineHeight: 1.7, color: 'rgba(255,255,255,.85)' }}>
              {tabContent[tab]}
            </p>
          </div>
        </section>

        {/* ══ FAQ ══ */}
        <PhotobookFaq />

        {/* ══ CTA ══ */}
        <section style={{ borderTop: '2px solid var(--color-text)', background: 'var(--color-accent)', color: 'var(--color-bg)' }}>
          <div data-split="" style={{
            display: 'grid', gridTemplateColumns: 'minmax(0, 1.6fr) minmax(0, 1fr)',
            alignItems: 'end', gap: 'var(--space-8)', padding: 'var(--space-8)',
          }}>
            <h2 style={{
              margin: 0, fontFamily: 'var(--font-heading)', fontWeight: 800,
              fontSize: 'clamp(26px, 3.4vw, 42px)', lineHeight: .96, letterSpacing: '-.035em', textTransform: 'uppercase',
            }}>Muốn cuốn theo phong cách riêng?</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, letterSpacing: '.1em', textTransform: 'uppercase' }}>
                Gửi ảnh kèm ý tưởng, xưởng gửi báo giá và bản mô phỏng trong 24 giờ.
              </p>
              <a href="/dat-in" style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-6)',
                height: 56, padding: '0 var(--space-6)', background: 'var(--color-bg)', color: 'var(--color-text)',
                fontSize: 14, fontWeight: 600, letterSpacing: '.1em', textTransform: 'uppercase', textDecoration: 'none',
              }}>Gửi ảnh nhận báo giá <span aria-hidden="true">→</span></a>
            </div>
          </div>
        </section>

    </StoreShell>
  );
}

/* ══ Template section — alternates image left/right ══ */

function TemplateSection({ book, index }: { book: Product; index: number }) {
  const even = index % 2 === 0;
  const [minPrice, setMinPrice] = useState<number | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    if (!book.pagePriced) return;
    let alive = true;
    fetchPhotobookPricing(book.id)
      .then((pricing) => {
        if (!alive) return;
        const prices = pricing.sizes.flatMap((s) => s.pageOptions.map((o) => o.price));
        if (prices.length > 0) setMinPrice(Math.min(...prices));
      })
      .catch(() => {});
    return () => { alive = false; };
  }, [book.id, book.pagePriced]);

  const displayPrice = minPrice ?? book.price;

  const imageBlock = (
    <div data-tpl-img="" onPointerEnter={(event) => { if (event.pointerType === 'mouse') setShowPreview(true); }}
      onPointerLeave={(event) => { if (event.pointerType === 'mouse') setShowPreview(false); }}
      onFocusCapture={() => setShowPreview(true)} onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setShowPreview(false);
      }}
      style={{ position: 'relative', overflow: 'hidden', borderRight: even ? '2px solid var(--color-text)' : undefined, borderLeft: even ? undefined : '2px solid var(--color-text)' }}>
      <Link to={`/photobook/${book.slug}`} style={{ display: 'block', width: '100%', height: '100%', minHeight: 360 }}>
        <Frame src={book.primaryImageUrl ?? undefined} label={book.name} tone="color" fit="cover" />
      </Link>
      <button type="button" onClick={() => setShowPreview((visible) => !visible)} aria-expanded={showPreview}
        style={{
          appearance: 'none', position: 'absolute', right: 'var(--space-4)', bottom: 'var(--space-4)', zIndex: 2,
          height: 36, padding: '0 var(--space-4)', border: '2px solid var(--color-bg)', background: 'rgba(25,24,23,.86)',
          color: 'var(--color-bg)', font: 'inherit', fontSize: 11, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase',
          cursor: 'pointer', borderRadius: 2,
        }}>
        {showPreview ? 'Đóng xem trước' : 'Xem trước 3 spread'}
      </button>
      {showPreview && <TemplateQuickPreview book={book} templateIndex={index} onClose={() => setShowPreview(false)} />}
    </div>
  );

  const textBlock = (
    <div data-tpl-text="" style={{
      display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 'var(--space-4)',
      padding: 'var(--space-8)',
    }}>
      <span style={{ ...label, color: 'var(--color-accent-700)' }}>
        {String(index + 1).padStart(2, '0')} / template
      </span>
      <h2 style={{
        margin: 0, fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: 28,
        lineHeight: 1.05, letterSpacing: '-.02em',
      }}>{book.name}</h2>
      <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap', ...label }}>
        {formatSize(book.widthCm, book.heightCm) && <span>{formatSize(book.widthCm, book.heightCm)}</span>}
        {book.pageCount && <><span>·</span><span>{book.pageCount} trang</span></>}
        {book.coverMaterial && <><span>·</span><span>{book.coverMaterial}</span></>}
      </div>
      <p style={{
        margin: 0, fontSize: 14, lineHeight: 1.65, color: 'var(--color-neutral-800)', maxWidth: '42ch',
      }}>
        {book.description ?? 'Photobook template thiết kế sẵn — gửi ảnh, xưởng layout và in thủ công.'}
      </p>
      <div style={{
        display: 'flex', alignItems: 'baseline', gap: 'var(--space-3)', marginTop: 'var(--space-2)',
      }}>
        <span style={{ fontSize: 11, letterSpacing: '.2em', textTransform: 'uppercase', color: 'var(--color-neutral-700)' }}>Từ</span>
        <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: 24 }}>{formatPrice(displayPrice)}</span>
      </div>
      <div style={{ display: 'flex', gap: 'var(--space-3)', marginTop: 'var(--space-2)' }}>
        <Link to={`/photobook/${book.slug}`} className="btn btn-primary">Xem chi tiết</Link>
        <Link to="/dat-in" className="btn btn-secondary">Đặt cuốn này</Link>
      </div>
    </div>
  );

  return (
    <section data-split="" style={{
      display: 'grid', gridTemplateColumns: even ? 'minmax(0, 1.15fr) minmax(0, 1fr)' : 'minmax(0, 1fr) minmax(0, 1.15fr)',
      borderBottom: '2px solid var(--color-text)',
    }}>
      {even ? <>{imageBlock}{textBlock}</> : <>{textBlock}{imageBlock}</>}
    </section>
  );
}

const QUICK_PREVIEW_LAYOUTS = [
  ['DOI_CAN', 'MOT_LON_MOT_NHO', 'BON_O'],
  ['PANORAMA', 'MOT_HAI', 'GHEP_HINH'],
  ['DOC_NGANG', 'BA_TAM', 'CONTACT_SHEET'],
];

function TemplateQuickPreview({ book, templateIndex, onClose }: { book: Product; templateIndex: number; onClose: () => void }) {
  const imageUrls = [...book.images].sort((a, b) => a.sortOrder - b.sortOrder).map((image) => image.secureUrl);
  if (!imageUrls.length && book.primaryImageUrl) imageUrls.push(book.primaryImageUrl);
  const layouts = QUICK_PREVIEW_LAYOUTS[templateIndex % QUICK_PREVIEW_LAYOUTS.length];

  return (
    <div aria-label={`Xem trước spread mẫu của ${book.name}`} style={{
      position: 'absolute', inset: 0, zIndex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center',
      padding: 'var(--space-5)', background: 'rgba(22,21,20,.94)', color: 'var(--color-bg)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.16em', textTransform: 'uppercase' }}>Xem trước 3 spread</span>
        <button type="button" onClick={onClose} aria-label="Đóng xem trước" style={{
          appearance: 'none', width: 28, height: 28, padding: 0, border: '1px solid rgba(255,255,255,.65)',
          background: 'transparent', color: 'var(--color-bg)', font: 'inherit', fontSize: 18, lineHeight: 1, cursor: 'pointer',
        }}>×</button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 'var(--space-3)' }}>
        {layouts.map((layoutCode, spreadIndex) => (
          <SampleSpread key={layoutCode} layoutCode={layoutCode} imageUrls={imageUrls} imageOffset={spreadIndex * 3} />
        ))}
      </div>
      <Link to={`/photobook/${book.slug}`} style={{
        alignSelf: 'center', marginTop: 'var(--space-5)', color: 'var(--color-bg)', fontSize: 11, fontWeight: 700,
        letterSpacing: '.12em', textTransform: 'uppercase', textDecoration: 'underline', textUnderlineOffset: 4,
      }}>Tùy chỉnh cuốn này →</Link>
    </div>
  );
}

function SampleSpread({ layoutCode, imageUrls, imageOffset }: { layoutCode: string; imageUrls: string[]; imageOffset: number }) {
  const layout = layoutByCode(layoutCode);
  return (
    <div style={{ position: 'relative', width: '100%', aspectRatio: '2 / 1.4', overflow: 'hidden', background: 'var(--color-neutral-200)', border: '1px solid rgba(255,255,255,.35)' }}>
      <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: 1, background: 'rgba(0,0,0,.18)', zIndex: 1 }} />
      {layout.slots.map((slot, slotIndex) => {
        const imageUrl = imageUrls[(imageOffset + slotIndex) % imageUrls.length];
        return (
          <div key={slotIndex} style={{
            position: 'absolute', left: `${slot.x * 100}%`, top: `${slot.y * 100}%`, width: `${slot.w * 100}%`, height: `${slot.h * 100}%`,
            overflow: 'hidden', borderRadius: slot.bleed ? 0 : 2, background: 'var(--color-neutral-400)',
          }}>
            {imageUrl && <img src={imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />}
          </div>
        );
      })}
    </div>
  );
}

/* ══ FAQ ══ */

const PB_FAQS = [
  { q: 'Template là gì, tôi có thể tuỳ chỉnh không?', a: 'Template là bố cục sẵn với phông chữ, bảng màu và cách sắp ảnh đã được thiết kế. Bạn gửi ảnh, xưởng đặt vào template và gửi bản mềm duyệt. Nếu muốn đổi phông, thay màu hoặc thêm trang thì báo khi duyệt — sửa miễn phí 2 lần.' },
  { q: 'Cần gửi bao nhiêu ảnh?', a: 'Tuỳ bạn làm cách nào. Nếu để xưởng bố cục: cuốn 20 trang cần khoảng 60–80 ảnh, 40 trang cần 120–160 ảnh — gửi dư cũng được, xưởng sẽ chọn lọc giúp. Nếu bạn tự thiết kế trên web: chỉ cần đúng số ô ảnh của chủ đề bạn chọn, con số này hiện ngay ở bước chọn quy cách và thường ít hơn khoảng trên vì mỗi tấm được đặt vào một ô cố định.' },
  { q: 'Chất liệu giấy và bìa thế nào?', a: 'Ruột in trên giấy mỹ thuật 250gsm, phủ mờ chống loá. Bìa cứng bọc vải, ép nhũ tên hoặc in UV tuỳ template. Có thể nâng cấp giấy ảnh 300gsm hoặc bìa da nếu cần.' },
  { q: 'Bao lâu thì nhận được?', a: 'Sau khi duyệt bản mềm: 7–10 ngày làm việc. Đơn gấp rút còn 5 ngày, phụ thu 30%. Ship toàn quốc, đóng hộp chống ẩm.' },
  { q: 'Đặt số lượng nhiều có giảm giá không?', a: 'Từ 5 cuốn trở lên có giá sỉ. Liên hệ xưởng để nhận bảng giá riêng theo số lượng và quy cách.' },
];

function PhotobookFaq() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section style={{ borderTop: '2px solid var(--color-text)', background: 'var(--color-bg)' }}>
      <div data-split="" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 2fr)' }}>
        <div style={{
          display: 'flex', flexDirection: 'column', gap: 'var(--space-4)',
          padding: 'var(--space-8)', borderRight: '2px solid var(--color-text)',
        }}>
          <span style={{ ...label, color: 'var(--color-accent-700)' }}>Hỏi đáp</span>
          <h2 style={{
            margin: 0, fontFamily: 'var(--font-heading)', fontWeight: 800,
            fontSize: 'clamp(24px, 2.6vw, 34px)', lineHeight: 1.05, letterSpacing: '-.02em',
          }}>Câu hỏi thường gặp</h2>
          <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: 'var(--color-neutral-800)' }}>
            Ấn vào câu hỏi để xem câu trả lời.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {PB_FAQS.map((f, k) => {
            const on = open === k;
            return (
              <div key={f.q} style={{ borderBottom: '2px solid var(--color-divider)' }}>
                <button
                  type="button" aria-expanded={on} onClick={() => setOpen(on ? null : k)}
                  style={{
                    appearance: 'none', width: '100%', display: 'grid',
                    gridTemplateColumns: 'auto minmax(0, 1fr) auto',
                    alignItems: 'baseline', gap: 'var(--space-4)',
                    padding: 'var(--space-6) var(--space-8)',
                    border: 0, background: 'transparent', color: 'var(--color-text)',
                    font: 'inherit', textAlign: 'left', cursor: 'pointer',
                  }}
                >
                  <span style={{ fontSize: 11, letterSpacing: '.18em', color: 'var(--color-neutral-700)' }}>0{k + 1}</span>
                  <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 17, lineHeight: 1.3, letterSpacing: '-.01em' }}>{f.q}</span>
                  <span style={{ fontSize: 20, lineHeight: 1, color: 'var(--color-accent)' }}>{on ? '−' : '+'}</span>
                </button>
                <div style={{
                  display: 'grid', gridTemplateRows: on ? '1fr' : '0fr', opacity: on ? 1 : 0,
                  overflow: 'hidden', transition: 'grid-template-rows .35s cubic-bezier(.65,0,.2,1), opacity .25s linear',
                }}>
                  <div style={{ minHeight: 0, overflow: 'hidden' }}>
                    <p style={{
                      margin: 0, maxWidth: '68ch', fontSize: 15, lineHeight: 1.65,
                      color: 'var(--color-neutral-800)',
                      padding: '0 var(--space-8) var(--space-6) calc(var(--space-8) + var(--space-6))',
                    }}>{f.a}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
