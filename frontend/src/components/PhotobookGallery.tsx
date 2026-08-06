import { formatPrice, formatSize, type Product } from '../api/storefront';
import { Frame } from './Frame';

/** Gallery photobook, mỗi cuốn có nút mở dialog chi tiết. */
export function PhotobookGallery({ books, onOpen }: { books: Product[]; onOpen: (slug: string) => void }) {
  return (
    <>
      <div data-split="" style={{
        display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 'var(--space-6)',
        padding: 'var(--space-6) var(--space-8)', borderBottom: '2px solid var(--color-divider)',
      }}>
        <h2 style={{ margin: 0, fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: 20, letterSpacing: '.04em', textTransform: 'uppercase' }}>
          Photobook tiêu biểu
        </h2>
        <span style={{ fontSize: 11, letterSpacing: '.18em', textTransform: 'uppercase', color: 'var(--color-neutral-700)' }}>
          Ấn vào một cuốn để xem chi tiết
        </span>
      </div>

      <div data-grid="cols" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))' }}>
        {books.map((b, i) => (
          <article key={b.id} style={{
            minWidth: 0, display: 'flex', flexDirection: 'column',
            borderRight: i < books.length - 1 ? '2px solid var(--color-divider)' : undefined,
          }}>
            <div style={{ position: 'relative', width: '100%', aspectRatio: '4 / 5' }}>
              <Frame src={b.primaryImageUrl ?? undefined} label={`bìa cuốn ${b.name}`} />
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', padding: 'var(--space-6)' }}>
              <span style={{ fontSize: 11, letterSpacing: '.2em', textTransform: 'uppercase', color: 'var(--color-accent-700)' }}>{b.categoryName}</span>
              <h3 style={{ margin: 0, fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: 22, lineHeight: 1.1, letterSpacing: '-.01em' }}>{b.name}</h3>
              <span style={{ fontSize: 13, color: 'var(--color-neutral-700)' }}>{formatSize(b.widthCm, b.heightCm) ?? formatPrice(b.price)}</span>
              <button type="button" className="btn btn-secondary" style={{ alignSelf: 'stretch', marginTop: 'auto', paddingTop: 'var(--space-3)', cursor: 'pointer' }} onClick={() => onOpen(b.slug)}>
                Xem chi tiết
              </button>
            </div>
          </article>
        ))}
      </div>
    </>
  );
}

/** Dialog chi tiết một cuốn. Đóng bằng nút, click backdrop hoặc Escape (do HomePage bắt). */
export function BookDialog({ book, onClose, onNext }: { book: Product; onClose: () => void; onNext: () => void }) {
  const rows = [
    { k: 'Khổ', v: formatSize(book.widthCm, book.heightCm) ?? '—' },
    { k: 'Danh mục', v: book.categoryName },
    { k: 'Tình trạng', v: book.stockQuantity > 0 ? 'Còn nhận đặt' : 'Tạm ngưng nhận' },
  ];

  return (
    <div className="dialog-backdrop" onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'grid', placeItems: 'center', padding: 'var(--space-8)', overflow: 'auto' }}>
      <div className="dialog" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}
        style={{ width: 'min(1100px, 100%)', background: 'var(--color-bg)', border: '2px solid var(--color-text)', padding: 0 }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-6)',
          padding: 'var(--space-4) var(--space-6)', background: 'var(--color-accent)', color: 'var(--color-bg)',
          borderBottom: '2px solid var(--color-text)',
        }}>
          <span style={{ fontSize: 11, letterSpacing: '.2em', textTransform: 'uppercase' }}>{book.categoryName}</span>
          <button type="button" onClick={onClose} aria-label="Đóng" style={{
            appearance: 'none', border: '2px solid var(--color-bg)', background: 'transparent', color: 'var(--color-bg)',
            font: 'inherit', fontSize: 11, letterSpacing: '.18em', textTransform: 'uppercase', padding: '6px 12px', cursor: 'pointer',
          }}>Đóng</button>
        </div>

        <div data-split="" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.35fr) minmax(0, 1fr)' }}>
          <div style={{ borderRight: '2px solid var(--color-divider)' }}>
            <div style={{ position: 'relative', width: '100%', aspectRatio: '16 / 10' }}>
              <Frame src={book.primaryImageUrl ?? undefined} label={`bìa cuốn ${book.name}`} />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', padding: 'var(--space-8)' }}>
            <h2 style={{ margin: 0, fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: 34, lineHeight: 1.02, letterSpacing: '-.02em' }}>{book.name}</h2>
            <p style={{ margin: 0, fontSize: 15, lineHeight: 1.6, color: 'var(--color-neutral-800)' }}>{book.description}</p>
            <div style={{ display: 'flex', flexDirection: 'column', borderTop: '2px solid var(--color-divider)' }}>
              {rows.map((r) => (
                <div key={r.k} style={{
                  display: 'flex', justifyContent: 'space-between', gap: 'var(--space-4)',
                  padding: 'var(--space-3) 0', borderBottom: '1px solid var(--color-neutral-300)', fontSize: 13,
                }}>
                  <span style={{ letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--color-neutral-700)' }}>{r.k}</span>
                  <span style={{ fontWeight: 600 }}>{r.v}</span>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--space-3)', marginTop: 'auto' }}>
              <span style={{ fontSize: 11, letterSpacing: '.2em', textTransform: 'uppercase', color: 'var(--color-neutral-700)' }}>Từ</span>
              <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: 28 }}>{formatPrice(book.price)}</span>
            </div>
            <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
              <a href={`/dat-in?san-pham=${book.slug}`} className="btn btn-primary">Đặt cuốn tương tự</a>
              <button type="button" className="btn btn-ghost" style={{ cursor: 'pointer' }} onClick={onNext}>Cuốn kế tiếp</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
