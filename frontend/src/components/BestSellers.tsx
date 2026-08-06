import { useEffect, useState } from 'react';
import { formatPrice, formatSize, type CatalogSort } from '../api/storefront';
import { useProducts } from '../hooks/useCatalog';
import { Frame } from './Frame';

/** Ba tab map thẳng sang ProductCatalogSort của backend. */
const TABS: { label: string; sort: CatalogSort }[] = [
  { label: 'Best seller', sort: 'BEST_SELLING' },
  { label: 'Trending', sort: 'TRENDING' },
  { label: 'Hàng mới', sort: 'NEWEST' },
];

/** Coverflow ngang, tấm giữa scale 1.18. Tự trượt 3s/tấm, hướng trái → phải. */
export function BestSellers({ categoryId, intervalMs = 3000 }: { categoryId?: string; intervalMs?: number }) {
  const [tab, setTab] = useState(0);
  const [i, setI] = useState(0);
  const { data, loading, error } = useProducts({ categoryId, sort: TABS[tab].sort, page: 1, size: 6 });
  const items = data ?? [];
  const n = items.length;

  const step = (d: number) => { if (n) setI((v) => (v + d + n) % n); };

  useEffect(() => { setI(0); }, [tab, categoryId]);

  useEffect(() => {
    if (intervalMs <= 0 || n === 0) return;
    const t = setInterval(() => { if (!document.hidden) step(-1); }, intervalMs);
    return () => clearInterval(t);
  }, [intervalMs, i, n]);

  const p = items[i];

  return (
    <section style={{ position: 'relative', borderTop: '2px solid var(--color-text)', background: 'var(--color-bg)', overflow: 'hidden' }}>
      <div data-split="" style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: 'var(--space-6)', padding: 'var(--space-6) var(--space-8) 0' }}>
        <span style={{ fontSize: 11, letterSpacing: '.18em', textTransform: 'uppercase', color: 'var(--color-accent-700)' }}>02/ tranh in canvas</span>

        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          {TABS.map((t, k) => (
            <button key={t.label} type="button" onClick={() => setTab(k)} style={{
              appearance: 'none', font: 'inherit', fontSize: 13, fontWeight: 600, letterSpacing: '.1em',
              textTransform: 'uppercase', padding: '0 var(--space-6)', height: 44, cursor: 'pointer',
              border: '2px solid var(--color-text)',
              background: k === tab ? 'var(--color-text)' : 'var(--color-bg)',
              color: k === tab ? 'var(--color-bg)' : 'var(--color-text)',
              transition: 'background .2s linear, color .2s linear',
            }}>{t.label}</button>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 'var(--space-4)' }}>
          <span style={{ fontSize: 11, letterSpacing: '.18em', textTransform: 'uppercase', color: 'var(--color-neutral-700)' }}>
            {n ? `${i + 1} / ${n}` : '—'}
          </span>
          <a href="/danh-muc/tranh-canvas" className="btn btn-secondary" style={{ whiteSpace: 'nowrap' }}>Xem thêm</a>
        </div>
      </div>

      <div style={{ position: 'relative', height: 560, marginTop: 'var(--space-4)' }}>
        {loading && !n && <Centered>Đang tải…</Centered>}
        {error && <Centered>Không tải được sản phẩm: {error}</Centered>}
        {items.map((item, idx) => {
          let o = idx - i;
          if (o > n / 2) o -= n;
          if (o < -n / 2) o += n;
          const a = Math.abs(o);
          const scale = a === 0 ? 1.18 : a === 1 ? 0.92 : 0.78;
          return (
            <div key={item.id} style={{
              position: 'absolute', top: '50%', left: '50%', width: 300, height: 400,
              marginLeft: -150, marginTop: -200,
              border: a === 0 ? '2px solid var(--color-text)' : '2px solid var(--color-divider)',
              background: 'var(--color-neutral-200)', overflow: 'hidden',
              transform: `translateX(${o * 330}px) scale(${scale})`,
              opacity: a > 2 ? 0 : 1, zIndex: 20 - a,
              boxShadow: a === 0 ? 'var(--shadow-lg)' : 'none',
              transition: 'transform .7s cubic-bezier(.65,0,.2,1), opacity .5s linear, border-color .4s linear',
            }}>
              <a href={`/tranh/${item.slug}`} style={{ position: 'absolute', inset: 0 }}>
                <Frame src={item.primaryImageUrl ?? undefined} label={`tranh canvas — ${item.name}`} />
              </a>
            </div>
          );
        })}
      </div>

      <div data-split="" style={{
        display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', alignItems: 'end',
        gap: 'var(--space-6)', padding: 'var(--space-6) var(--space-8)', borderTop: '2px solid var(--color-divider)',
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', minWidth: 0 }}>
          <span style={{ fontSize: 11, letterSpacing: '.2em', textTransform: 'uppercase', color: 'var(--color-accent-700)' }}>{TABS[tab].label}</span>
          <h3 style={{ margin: 0, fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: 30, lineHeight: 1.05, letterSpacing: '-.02em' }}>{p?.name ?? '—'}</h3>
          <span style={{ fontSize: 14, color: 'var(--color-neutral-700)' }}>
            {p ? [formatSize(p.widthCm, p.heightCm), formatPrice(p.price)].filter(Boolean).join(' · ') : ''}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          <button type="button" aria-label="Tranh trước" style={navBtn} onClick={() => step(1)}>←</button>
          <button type="button" aria-label="Tranh sau" style={navBtn} onClick={() => step(-1)}>→</button>
        </div>
      </div>
    </section>
  );
}

const Centered = ({ children }: { children: React.ReactNode }) => (
  <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', fontSize: 13, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--color-neutral-700)' }}>{children}</div>
);

const navBtn: React.CSSProperties = {
  appearance: 'none', font: 'inherit', fontSize: 15, width: 46, height: 46,
  border: '2px solid var(--color-text)', background: 'var(--color-bg)', color: 'var(--color-text)', cursor: 'pointer',
};
