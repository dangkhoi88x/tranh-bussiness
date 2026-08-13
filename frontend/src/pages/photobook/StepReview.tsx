import { useCallback, useMemo, useState } from 'react';
import { ApiRequestError, apiRequest } from '../../api/http';
import { type PhotobookPricing, type PhotobookSize } from '../../api/photobook';
import { formatPrice } from '../../api/storefront';
import { compressSharePreviewImage } from '../../data/imageCompression';
import { Link } from 'react-router-dom';
import { BookDemo } from './BookDemo';
import { SpreadOrderGrid } from './SpreadOrderGrid';
import { DraftSpread } from './draft';
import { chipStyle } from './styles';

export function UpsellSuggestions({ size, selected, pricing, pageOptions, pageIndex, onUpgradePages, onUpgradeSize }: {
  size: PhotobookSize | null; selected: { pageCount: number; price: number } | null;
  pricing: PhotobookPricing | null; pageOptions: { pageCount: number; price: number }[];
  pageIndex: number;
  onUpgradePages: (pageIdx: number) => void; onUpgradeSize: (sizeId: string) => void;
}) {
  const suggestions = useMemo(() => {
    if (!size || !selected || !pricing) return [];
    const items: { key: string; label: string; detail: string; diff: number; action: () => void }[] = [];

    const PAGE_JUMP = 5;
    const targetIdx = pageOptions.findIndex((o) => o.pageCount >= selected.pageCount + PAGE_JUMP * 2);
    if (targetIdx > pageIndex) {
      const target = pageOptions[targetIdx];
      const extraPages = target.pageCount - selected.pageCount;
      const extraSpreads = extraPages / 2;
      items.push({
        key: 'pages',
        label: `Thêm ${extraPages} trang`,
        detail: `+${extraSpreads} spread — thêm chỗ cho ${extraSpreads * 2}–${extraSpreads * 3} ảnh nữa`,
        diff: target.price - selected.price,
        action: () => onUpgradePages(targetIdx),
      });
    }

    const sizeIdx = pricing.sizes.findIndex((s) => s.variantId === size.variantId);
    if (sizeIdx >= 0 && sizeIdx < pricing.sizes.length - 1) {
      const next = pricing.sizes[sizeIdx + 1];
      const nextOption = next.pageOptions.find((o) => o.pageCount === selected.pageCount);
      if (nextOption) {
        items.push({
          key: 'size',
          label: `Nâng ${next.name}`,
          detail: `${next.widthCm}×${next.heightCm} cm — ảnh sắc nét hơn, chi tiết rõ hơn`,
          diff: nextOption.price - selected.price,
          action: () => onUpgradeSize(next.variantId),
        });
      }
    }

    return items;
  }, [size, selected, pricing, pageOptions, pageIndex, onUpgradePages, onUpgradeSize]);

  if (!suggestions.length) return null;

  return (
    <div style={{
      display: 'grid', gap: 'var(--space-3)',
      padding: 'var(--space-5)', background: 'var(--color-neutral-50)',
      border: '2px solid var(--color-neutral-200)', borderRadius: 6,
    }}>
      <p style={{ margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--color-neutral-500)' }}>
        Nâng cấp cuốn sách
      </p>
      <div style={{ display: 'grid', gap: 'var(--space-3)', gridTemplateColumns: `repeat(${suggestions.length}, 1fr)` }}>
        {suggestions.map((s) => (
          <button key={s.key} type="button" onClick={s.action} style={{
            appearance: 'none', display: 'flex', flexDirection: 'column', gap: 6,
            padding: 'var(--space-4)', border: '2px solid var(--color-neutral-300)',
            borderRadius: 4, background: 'var(--color-bg)', cursor: 'pointer',
            textAlign: 'left', font: 'inherit', transition: 'border-color .15s',
          }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--color-text)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--color-neutral-300)'; }}
          >
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text)' }}>{s.label}</span>
            <span style={{ fontSize: 12, color: 'var(--color-neutral-600)', lineHeight: 1.4 }}>{s.detail}</span>
            <span style={{
              marginTop: 'auto', paddingTop: 'var(--space-2)',
              fontSize: 13, fontWeight: 700, color: 'var(--color-accent-700)',
            }}>
              chỉ +{formatPrice(s.diff)}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   Step 3 — Xem lại
   ═══════════════════════════════════════════════════════════════════════════ */

export function StepReview({ spreads, price, qty, finish, size, selected, pricing, pageOptions, pageIndex, added, busy, cartError, slug, templateId, onEdit, onMoveSpread, onBack, onAddToCart, onUpgradePages, onUpgradeSize }: {
  spreads: DraftSpread[]; price: number; qty: number; finish: string;
  size: PhotobookSize | null; selected: { pageCount: number; price: number } | null;
  pricing: PhotobookPricing | null; pageOptions: { pageCount: number; price: number }[]; pageIndex: number;
  added: boolean; busy: boolean; cartError: string | null; slug: string; templateId: string;
  onEdit: (idx: number) => void; onBack: () => void; onAddToCart: () => void;
  onMoveSpread: (fromIdx: number, toIdx: number) => void;
  onUpgradePages: (pageIdx: number) => void; onUpgradeSize: (sizeId: string) => void;
}) {
  const [viewMode, setViewMode] = useState<'grid' | 'book'>('grid');
  const [sharing, setSharing] = useState(false);
  const [shareLink, setShareLink] = useState<string | null>(null);
  const [shareError, setShareError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [shareProgress, setShareProgress] = useState<{ completed: number; total: number } | null>(null);

  const shareableImages = useMemo(() => {
    const images = new Map<string, File>();
    for (const spread of spreads) {
      for (const slot of spread.slots) {
        if (slot.imageId && slot.file && !images.has(slot.imageId)) images.set(slot.imageId, slot.file);
      }
    }
    return images;
  }, [spreads]);

  const handleShare = useCallback(async () => {
    if (!shareableImages.size) return;
    setSharing(true);
    setShareError(null);
    setShareLink(null);
    setShareProgress({ completed: 0, total: shareableImages.size });
    try {
      const storedSpreads = spreads.map((s) => ({
        position: s.position, layoutCode: s.layoutCode, backgroundColor: s.backgroundColor,
        slots: s.slots.map((sl) => ({ imageId: sl.imageId, zoom: sl.zoom, panX: sl.panX, panY: sl.panY })),
        captions: s.captions.map((c) => ({ id: c.id, text: c.text, x: c.x, y: c.y, fontSize: c.fontSize, color: c.color, bold: c.bold, align: c.align, fontFamily: c.fontFamily })),
      }));

      const metadata = {
        productSlug: slug,
        sizeLabel: size?.name ?? null,
        pageCount: selected ? String(selected.pageCount) : null,
        finish,
        templateId,
        spreads: storedSpreads,
      };

      const formData = new FormData();
      formData.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }), 'metadata.json');
      let completed = 0;
      for (const [imageId, file] of shareableImages) {
        const { file: previewImage } = await compressSharePreviewImage(file);
        if (previewImage.size > 10 * 1024 * 1024) {
          throw new Error('Một ảnh quá lớn để tạo preview');
        }
        formData.append('images', previewImage, imageId);
        completed++;
        setShareProgress({ completed, total: shareableImages.size });
      }

      const preview = await apiRequest<{ token: string }>('/photobook-share-previews', { method: 'POST', body: formData });
      const token = preview.token;
      if (!token) throw new Error('No token returned');

      const link = `${window.location.origin}/xem-truoc/${token}`;
      setShareLink(link);
    } catch (error) {
      setShareError(error instanceof ApiRequestError && error.status === 401
        ? 'Vui lòng đăng nhập để tạo link chia sẻ. Người nhận link vẫn xem được mà không cần đăng nhập.'
        : 'Không thể tạo link chia sẻ. Vui lòng thử lại.');
    } finally {
      setSharing(false);
      setShareProgress(null);
    }
  }, [spreads, slug, size, selected, finish, templateId, shareableImages]);

  const handleCopy = useCallback(() => {
    if (!shareLink) return;
    if (!navigator.clipboard) {
      setShareError('Trình duyệt không hỗ trợ sao chép tự động. Bạn có thể chọn và sao chép link bên trên.');
      return;
    }
    navigator.clipboard.writeText(shareLink)
      .then(() => {
        setCopied(true);
        window.setTimeout(() => setCopied(false), 2000);
      })
      .catch(() => setShareError('Không thể sao chép tự động. Bạn có thể chọn và sao chép link bên trên.'));
  }, [shareLink]);

  return (
    <div data-pb-review="" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)', padding: 'var(--space-8)', maxWidth: 1000, margin: '0 auto' }}>
      <div style={{ textAlign: 'center' }}>
        <h2 style={{ margin: 0, fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: 24, letterSpacing: '-.02em' }}>Xem lại photobook</h2>
        {size && selected && (
          <p style={{ margin: 'var(--space-2) 0 0', fontSize: 13, color: 'var(--color-neutral-700)' }}>
            {size.name} · {selected.pageCount} trang · {finish} · {spreads.length} spread
          </p>
        )}
      </div>

      {/* View mode toggle */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 6 }}>
        <button type="button" onClick={() => setViewMode('grid')} style={chipStyle(viewMode === 'grid')}>Lưới</button>
        <button type="button" onClick={() => setViewMode('book')} style={chipStyle(viewMode === 'book')}>Demo trên sách</button>
      </div>

      {viewMode === 'grid' ? (
        <ReviewGrid spreads={spreads} onEdit={onEdit} onMove={onMoveSpread} />
      ) : (
        <BookDemo spreads={spreads} onEdit={onEdit} />
      )}

      {/* Share section */}
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-3)',
        padding: 'var(--space-5)', background: 'var(--color-neutral-100)', borderRadius: 6,
      }}>
        <p style={{ margin: 0, fontSize: 13, color: 'var(--color-neutral-700)', textAlign: 'center' }}>
          Gửi link cho gia đình, bạn bè xem trước khi đặt in
        </p>
        {!shareLink ? (
          <>
            <button type="button" className="btn btn-secondary" disabled={sharing || !shareableImages.size} onClick={handleShare} style={{ gap: 6 }}>
              {sharing
                ? shareProgress && shareProgress.completed < shareProgress.total
                  ? `Đang chuẩn bị ảnh ${shareProgress.completed}/${shareProgress.total}…`
                  : 'Đang tải preview…'
                : 'Tạo link chia sẻ'}
            </button>
            {!shareableImages.size && <p style={{ margin: 0, fontSize: 12, color: 'var(--color-neutral-600)' }}>Thêm ít nhất một ảnh trước khi tạo link.</p>}
            {shareError && <p role="status" style={{ margin: 0, fontSize: 12, color: 'var(--color-accent-700)' }}>{shareError}</p>}
          </>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-3)', width: '100%', maxWidth: 480 }}>
            <div style={{
              display: 'flex', width: '100%', border: '2px solid var(--color-text)', borderRadius: 4, overflow: 'hidden',
            }}>
              <input type="text" readOnly value={shareLink} style={{
                flex: 1, border: 0, padding: '8px 12px', font: 'inherit', fontSize: 13,
                background: 'var(--color-bg)', color: 'var(--color-text)', outline: 'none', minWidth: 0,
              }} onClick={(e) => (e.target as HTMLInputElement).select()} />
              <button type="button" onClick={handleCopy} style={{
                appearance: 'none', border: 0, borderLeft: '2px solid var(--color-text)',
                padding: '8px 16px', font: 'inherit', fontSize: 12, fontWeight: 600,
                background: copied ? 'var(--color-text)' : 'var(--color-bg)',
                color: copied ? 'var(--color-bg)' : 'var(--color-text)',
                cursor: 'pointer', whiteSpace: 'nowrap', transition: 'background .15s, color .15s',
              }}>
                {copied ? 'Đã sao chép' : 'Sao chép'}
              </button>
            </div>
            <p style={{ margin: 0, fontSize: 11, color: 'var(--color-neutral-500)' }}>
              Link hết hạn sau 30 ngày. Không cần đăng nhập để xem.
            </p>
          </div>
        )}
      </div>

      {/* Upsell suggestions */}
      <UpsellSuggestions
        size={size} selected={selected} pricing={pricing}
        pageOptions={pageOptions} pageIndex={pageIndex}
        onUpgradePages={onUpgradePages} onUpgradeSize={onUpgradeSize}
      />

      {/* Summary + CTA */}
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-4)',
        padding: 'var(--space-6)', borderTop: '2px solid var(--color-text)',
      }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--space-3)' }}>
          <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: 28 }}>{formatPrice(price * qty)}</span>
          {qty > 1 && <span style={{ fontSize: 12, color: 'var(--color-neutral-700)' }}>({qty} cuốn × {formatPrice(price)})</span>}
        </div>

        <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap', justifyContent: 'center' }}>
          <button type="button" className="btn btn-secondary" onClick={onBack}>← Sửa spread</button>
          <button type="button" className="btn btn-primary" disabled={busy} onClick={onAddToCart} style={{ minWidth: 200 }}>
            {added ? 'Đã thêm vào giỏ ✓' : busy ? 'Đang thêm…' : 'Thêm vào giỏ'}
          </button>
        </div>
        {cartError && <p role="status" style={{ margin: 0, fontSize: 12, color: 'var(--color-accent-700)' }}>{cartError}</p>}
        <p style={{ margin: 0, fontSize: 12, color: 'var(--color-neutral-700)', textAlign: 'center', maxWidth: '50ch' }}>
          {shareableImages.size
            ? 'Bố cục và ảnh bạn vừa sắp xếp sẽ là bản nháp đầu tiên gửi cho xưởng — bạn vẫn chỉnh sửa được sau khi đặt hàng, trước khi xưởng gửi bản mềm duyệt.'
            : 'Sau khi đặt đơn, bạn gửi ảnh gốc lên để xưởng dàn layout chính thức. Bố cục ở đây là bản xem trước.'}
        </p>
      </div>
    </div>
  );
}

export function ReviewGrid({ spreads, onEdit, onMove }: { spreads: DraftSpread[]; onEdit: (idx: number) => void; onMove: (fromIdx: number, toIdx: number) => void }) {
  return <SpreadOrderGrid spreads={spreads} onSelect={onEdit} onMove={onMove} ariaLabel="Sắp xếp thứ tự spread trong bản xem lại" />;
}
