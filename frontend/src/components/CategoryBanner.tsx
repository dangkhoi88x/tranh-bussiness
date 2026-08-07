import { Frame } from './Frame';
import { useCategories } from '../hooks/useCatalog';

/** Ảnh minh hoạ cho từng danh mục — key theo slug danh mục trong DB. */
const CATEGORY_ART: Record<string, string | undefined> = {};

export function CategoryBanner() {
  const { data, error } = useCategories();
  const cats = (data ?? []).slice(0, 3);

  return (
    <section id="danh-muc" style={{ borderTop: '2px solid var(--color-text)', background: 'var(--color-bg)', padding: 'var(--space-6) var(--space-8)' }}>
      <div data-split="" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 'var(--space-6)', alignItems: 'start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          <span style={{ fontSize: 11, letterSpacing: '.2em', textTransform: 'uppercase', color: 'var(--color-accent-700)' }}>01/ danh mục</span>
          <h2 style={{ margin: 0, fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: 'clamp(24px, 2.4vw, 32px)', lineHeight: 1.04, letterSpacing: '-.025em' }}>Bạn muốn in gì?</h2>
        </div>
        <p style={{ margin: 0, maxWidth: '46ch', fontSize: 14, lineHeight: 1.55, color: 'var(--color-neutral-800)' }}>
          Ba cách để giữ lại một tấm ảnh: treo lên tường, đóng thành sách, hoặc gửi file cho xưởng làm riêng theo ý bạn.
        </p>
      </div>

      {error && <p style={{ marginTop: 'var(--space-6)', fontSize: 13, color: 'var(--color-accent-700)' }}>Không tải được danh mục: {error}</p>}

      <div data-grid="cols" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 'var(--space-6)', marginTop: 'var(--space-6)' }}>
        {cats.map((c) => (
          <article key={c.id} style={{ position: 'relative', border: '2px solid var(--color-text)', background: 'var(--color-neutral-200)', overflow: 'hidden' }}>
            <div style={{ position: 'relative', width: '100%', aspectRatio: '5 / 4' }}>
              <Frame src={CATEGORY_ART[c.slug]} label={c.name} />
            </div>
            <div style={{
              position: 'absolute', top: 0, left: 0, right: 0, minHeight: 84, display: 'grid',
              gridTemplateColumns: 'auto minmax(0, 1fr)', alignContent: 'start', gap: 'var(--space-3)',
              padding: 'var(--space-3) var(--space-4)', background: 'var(--color-bg)', borderBottom: '2px solid var(--color-text)',
            }}>
              <h3 style={{ margin: 0, fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: 18, lineHeight: 1, letterSpacing: '-.02em' }}>{c.name}</h3>
              <p style={{ margin: 0, fontSize: 11, lineHeight: 1.4, color: 'var(--color-neutral-700)' }}>{c.description}</p>
            </div>
            {/* /danh-muc/:slug chưa có trang (xem App.tsx); nút này đáp trang chủ cho tới khi dựng. */}
            <a href={`/danh-muc/${c.slug}`} aria-label={`Xem ${c.name}`} style={{
              position: 'absolute', right: 'var(--space-3)', bottom: 'var(--space-3)', display: 'grid', placeItems: 'center',
              width: 38, height: 38, background: 'var(--color-text)', color: 'var(--color-bg)', fontSize: 15, textDecoration: 'none',
            }}>↗</a>
          </article>
        ))}
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 'var(--space-6)' }}>
        <a href="/#tranh-canvas" className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-6)' }}>
          Xem toàn bộ danh mục <span aria-hidden="true">↗</span>
        </a>
      </div>
    </section>
  );
}
