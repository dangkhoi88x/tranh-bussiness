import { useState } from 'react';
import { type PhotobookPricing, type PhotobookSize } from '../../api/photobook';
import { formatPrice, formatSize, type Product } from '../../api/storefront';
import { Frame } from '../../components/Frame';
import { STORE_LABEL_STYLE } from '../../components/StoreShell';
import { type PhotobookTemplate } from '../../data/photobookTemplates';
import { FINISHES } from './draft';
import { chipGrid, chipStyle, optionRow, stepBtnStyle } from './styles';

export function StepSpecs({ product, pricing, size, sizeId, setSizeId, pageIndex, setPageIndex, pageOptions, selected,
  finish, setFinish, qty, setQty, price, photos, photoCount, setPhotoCount, suggestion,
  templates, templateId, setTemplateId, spreadsHaveImages, onApplyTemplate, onNext,
}: {
  product: Product; pricing: PhotobookPricing;
  size: PhotobookSize | null; sizeId: string | null; setSizeId: (id: string) => void;
  pageIndex: number; setPageIndex: (fn: number | ((i: number) => number)) => void;
  pageOptions: { pageCount: number; price: number }[]; selected: { pageCount: number; price: number } | null;
  finish: string; setFinish: (f: string) => void;
  qty: number; setQty: (fn: number | ((q: number) => number)) => void;
  price: number; photos: { min: number; max: number } | null;
  photoCount: string; setPhotoCount: (v: string) => void;
  suggestion: number | null; templates: PhotobookTemplate[];
  templateId: string; setTemplateId: (id: string) => void;
  spreadsHaveImages: boolean; onApplyTemplate: () => void; onNext: () => void;
}) {
  const images = product.images ?? [];
  const [shot, setShot] = useState(0);
  const currentImage = images[shot] ?? images[0] ?? null;
  const thumbCols = Math.min(Math.max(images.length, 1), 4);
  const [pendingApply, setPendingApply] = useState(false);

  return (
    <section data-split="" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', alignItems: 'start' }}>
      <div style={{ display: 'flex', flexDirection: 'column', borderRight: '2px solid var(--color-text)' }}>
        <div style={{
          position: 'relative', width: '100%', aspectRatio: '4/3', maxHeight: '62vh',
          background: 'var(--color-neutral-200)', borderBottom: '2px solid var(--color-text)', overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', inset: 0 }}>
            <Frame src={currentImage?.secureUrl} alt={currentImage?.altText ?? undefined}
              label={`photobook — ${product.name}`} tone="color" fit="contain" />
          </div>
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
        <div data-pb-price-table="" style={{ padding: 'var(--space-6) var(--space-8)' }}>
          <span style={STORE_LABEL_STYLE}>Bảng giá theo khổ</span>
          <div style={{ marginTop: 'var(--space-4)', overflowX: 'auto' }}>
            <table className="table" style={{ minWidth: 320 }}>
              <thead><tr><th>Số trang</th>{pricing.sizes.map((s) => <th key={s.variantId}>{s.name}</th>)}</tr></thead>
              <tbody>
                {(pricing.sizes[0]?.pageOptions ?? []).slice(0, 6).map((opt, idx) => (
                  <tr key={opt.pageCount}>
                    <td>{opt.pageCount} trang</td>
                    {pricing.sizes.map((s) => <td key={s.variantId}>{formatPrice(s.pageOptions[idx]?.price)}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div id="mua" data-pb-buy="" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)', padding: 'var(--space-8)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          <span style={{ fontSize: 11, letterSpacing: '.2em', textTransform: 'uppercase', color: 'var(--color-accent-700)' }}>{product.categoryName}</span>
          <h1 style={{ margin: 0, fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: 30, lineHeight: 1.05, letterSpacing: '-.03em' }}>{product.name}</h1>
          {product.description && <p style={{ margin: 0, maxWidth: '48ch', fontSize: 15, lineHeight: 1.6, color: 'var(--color-neutral-800)' }}>{product.description}</p>}
        </div>

        <div style={{
          display: 'flex', alignItems: 'baseline', gap: 'var(--space-4)', padding: 'var(--space-4) 0',
          borderTop: '2px solid var(--color-text)', borderBottom: '2px solid var(--color-text)',
        }}>
          <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: 26, letterSpacing: '-.03em' }}>{formatPrice(price)}</span>
          <span style={{ fontSize: 12, color: 'var(--color-neutral-700)' }}>đã gồm bìa cứng in hình và áo bọc</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div data-option-row="" style={optionRow}>
            <span style={STORE_LABEL_STYLE}>Khổ</span>
            <div style={chipGrid}>
              {pricing.sizes.map((s) => {
                const on = s.variantId === sizeId;
                const at = s.pageOptions[Math.min(pageIndex, s.pageOptions.length - 1)];
                return (
                  <button key={s.variantId} type="button" disabled={!s.available} aria-pressed={on}
                    title={at ? formatPrice(at.price) : undefined} onClick={() => setSizeId(s.variantId)}
                    style={chipStyle(on, !s.available)}>{s.name}</button>
                );
              })}
            </div>
          </div>
          <div data-option-row="" style={optionRow}>
            <span style={STORE_LABEL_STYLE}>Số trang</span>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-4)', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', border: '2px solid var(--color-text)' }}>
                <button type="button" aria-label="Bớt trang" disabled={pageIndex <= 0}
                  onClick={() => setPageIndex((i: number) => Math.max(0, i - 1))} style={stepBtnStyle(pageIndex <= 0)}>−</button>
                <span style={{ minWidth: 72, textAlign: 'center', fontSize: 14, fontWeight: 600 }}>{selected?.pageCount ?? '—'} trang</span>
                <button type="button" aria-label="Thêm trang" disabled={pageIndex >= pageOptions.length - 1}
                  onClick={() => setPageIndex((i: number) => Math.min(pageOptions.length - 1, i + 1))}
                  style={stepBtnStyle(pageIndex >= pageOptions.length - 1)}>+</button>
              </div>
              {photos && <span style={{ ...STORE_LABEL_STYLE, letterSpacing: '.1em' }}>Cần {photos.min}–{photos.max} hình</span>}
            </div>
          </div>
          <div data-option-row="" style={optionRow}>
            <span style={STORE_LABEL_STYLE}>Bề mặt</span>
            <div style={chipGrid}>
              {FINISHES.map((f) => (
                <button key={f} type="button" aria-pressed={f === finish} onClick={() => setFinish(f)} style={chipStyle(f === finish)}>{f}</button>
              ))}
            </div>
          </div>
          <div data-option-row="" style={optionRow}>
            <span style={STORE_LABEL_STYLE}>Số lượng</span>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-4)' }}>
              <div style={{ display: 'flex', alignItems: 'center', border: '2px solid var(--color-text)' }}>
                <button type="button" aria-label="Bớt một" disabled={qty <= 1}
                  onClick={() => setQty((q: number) => Math.max(1, q - 1))} style={stepBtnStyle(qty <= 1)}>−</button>
                <span style={{ minWidth: 36, textAlign: 'center', fontSize: 14, fontWeight: 600 }}>{qty}</span>
                <button type="button" aria-label="Thêm một" disabled={qty >= 9}
                  onClick={() => setQty((q: number) => Math.min(9, q + 1))} style={stepBtnStyle(qty >= 9)}>+</button>
              </div>
              <span style={{ fontSize: 12, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--color-neutral-700)' }}>Tổng {formatPrice(price * qty)}</span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          <label htmlFor="photo-count" style={STORE_LABEL_STYLE}>Bạn có bao nhiêu ảnh?</label>
          <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center', flexWrap: 'wrap' }}>
            <input id="photo-count" className="input" type="number" min={1} inputMode="numeric"
              placeholder="ví dụ 150" value={photoCount}
              onChange={(e) => setPhotoCount(e.target.value)} style={{ maxWidth: 140 }} />
            {suggestion !== null && (
              <button type="button" className="btn btn-ghost"
                onClick={() => setPageIndex(pageOptions.findIndex((o) => o.pageCount === suggestion))}>
                Nên chọn {suggestion} trang →
              </button>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          <span style={STORE_LABEL_STYLE}>Chọn chủ đề</span>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 8 }}>
            {templates.map((tpl) => {
              const on = tpl.id === templateId;
              const previewColors = tpl.spreadColors.slice(0, 3);
              return (
                <button key={tpl.id} type="button" onClick={() => { setTemplateId(tpl.id); if (spreadsHaveImages && tpl.id !== templateId) setPendingApply(true); }}
                  aria-pressed={on} style={{
                    appearance: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                    padding: '10px 6px', cursor: 'pointer', borderRadius: 4, font: 'inherit',
                    border: `2px solid ${on ? 'var(--color-accent)' : 'var(--color-neutral-300)'}`,
                    background: on ? 'var(--color-accent-100, rgba(180,60,60,.08))' : 'var(--color-bg)',
                    transition: 'border-color .15s, background .15s',
                  }}>
                  <div style={{ display: 'flex', gap: 2, height: 20 }}>
                    {previewColors.map((c, ci) => (
                      <div key={ci} style={{ width: 28, height: 20, borderRadius: 2, background: c, border: '1px solid var(--color-neutral-300)' }} />
                    ))}
                  </div>
                  <span style={{ fontSize: 18, lineHeight: 1 }}>{tpl.icon}</span>
                  <span style={{ fontSize: 11, fontWeight: on ? 700 : 500, lineHeight: 1.2, textAlign: 'center',
                    fontFamily: `"${tpl.defaultFont}", sans-serif`,
                  }}>{tpl.name}</span>
                </button>
              );
            })}
          </div>
          {pendingApply && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 'var(--space-3)', flexWrap: 'wrap',
              padding: 'var(--space-3)', background: 'var(--color-accent-100, rgba(180,60,60,.08))',
              borderRadius: 4, fontSize: 13,
            }}>
              <span>Áp dụng bố cục mới cho các spread chưa có ảnh?</span>
              <button type="button" className="btn btn-secondary" style={{ fontSize: 12, padding: '4px 12px' }}
                onClick={() => { onApplyTemplate(); setPendingApply(false); }}>
                Áp dụng
              </button>
              <button type="button" className="btn btn-ghost" style={{ fontSize: 12, padding: '4px 12px' }}
                onClick={() => setPendingApply(false)}>
                Bỏ qua
              </button>
            </div>
          )}
        </div>

        <button type="button" className="btn btn-primary btn-block" disabled={!selected || !size?.available}
          onClick={onNext} style={{ cursor: 'pointer' }}>
          {!size?.available ? 'Khổ này tạm ngưng' : 'Tiếp — Thêm ảnh →'}
        </button>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   Step 2 — Sắp xếp spread
   ═══════════════════════════════════════════════════════════════════════════ */
