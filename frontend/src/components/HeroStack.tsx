import { useEffect, useState } from 'react';
import { formatPrice, formatSize, type Product } from '../api/storefront';
import { Frame } from './Frame';

const FIELDS = ['var(--color-accent)', 'var(--color-text)'];
const HEADER = 64;
const EXIT_MS = 760;

/**
 * Hero: các photobook xếp tầng, cuốn active chiếm khổ lớn dưới cùng,
 * những cuốn sau hé ra thành dải hẹp phía trên. Tự chạy 4.2s/cuốn.
 */
export function HeroStack({
  books,
  intervalMs = 4200,
  paused = false,
  onOpen,
}: {
  books: Product[];
  intervalMs?: number;
  paused?: boolean;
  onOpen?: (slug: string) => void;
}) {
  const n = books.length;
  const [active, setActive] = useState(0);
  const [exiting, setExiting] = useState<number | null>(null);

  const advance = (d: number) => {
    if (n === 0) return;
    setActive((a) => (a + d + n) % n);
    if (d > 0) {
      setActive((a) => a);
      setExiting(active);
      setTimeout(() => setExiting(null), EXIT_MS);
    }
  };

  useEffect(() => {
    if (paused || intervalMs <= 0 || n === 0) return;
    const t = setInterval(() => {
      if (!document.hidden) advance(1);
    }, intervalMs);
    return () => clearInterval(t);
  }, [intervalMs, active, paused, n]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (paused) return;
      if (e.key === 'ArrowRight') advance(1);
      if (e.key === 'ArrowLeft') advance(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active, paused]);

  const book = books[active];

  return (
    <section
      style={{
        position: 'relative',
        height: `calc(100vh - ${HEADER}px)`,
        minHeight: 480,
        overflow: 'hidden',
        background: 'var(--color-accent)',
        color: 'var(--color-bg)',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 0,
          background: FIELDS[active % FIELDS.length],
          transition: 'background .7s cubic-bezier(.65,0,.2,1)',
        }}
      />

      <div
        style={{
          position: 'relative',
          zIndex: 1,
          display: 'grid',
          gridTemplateColumns: '1fr auto',
          alignItems: 'baseline',
          gap: 'var(--space-6)',
          padding: '4.5vh var(--space-8) 0',
        }}
      >
        <h1
          style={{
            margin: 0,
            fontFamily: 'var(--font-heading)',
            fontWeight: 800,
            fontSize: 'clamp(30px, 5.6vw, 88px)',
            lineHeight: 0.92,
            letterSpacing: '-.02em',
            textTransform: 'uppercase',
          }}
        >
          Bubble Memories
        </h1>
        <p
          style={{
            margin: 0,
            maxWidth: '24ch',
            fontSize: 11,
            lineHeight: 1.6,
            letterSpacing: '.14em',
            textTransform: 'uppercase',
          }}
        >
          Tranh in &amp; photobook làm theo yêu cầu
        </p>
      </div>

      {books.map((b, idx) => {
        const d = (idx - active + n) % n;
        const isExiting = idx === exiting;
        const base: React.CSSProperties = {
          position: 'absolute',
          left: '4%',
          width: '92%',
          top: '40%',
          height: '78%',
          border: '2px solid var(--color-text)',
          overflow: 'hidden',
          background: 'var(--color-neutral-200)',
          transformOrigin: 'top center',
          transition: 'transform .8s cubic-bezier(.65,0,.2,1), opacity .45s linear',
        };
        const style: React.CSSProperties = isExiting
          ? { ...base, transform: 'translateY(-64%)', opacity: 0, zIndex: 41 }
          : {
              ...base,
              transform: `translateY(${-9.5 * d}%) scale(${(1 - 0.155 * d).toFixed(3)})`,
              opacity: d === n - 1 && exiting !== null ? 0 : 1,
              zIndex: 40 - d,
            };
        return (
          <div key={b.id} style={style}>
            <div style={{ position: 'absolute', inset: 0 }}>
              <Frame src={b.primaryImageUrl ?? undefined} label={`bìa cuốn ${b.name}`} />
            </div>
          </div>
        );
      })}

      {book && (
        <div
          style={{
            position: 'absolute',
            zIndex: 55,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'grid',
            gridTemplateColumns: '1fr auto 1fr',
            alignItems: 'center',
            gap: 'var(--space-6)',
            height: 46,
            padding: '0 var(--space-4)',
            background: 'var(--color-text)',
            color: 'var(--color-bg)',
          }}
        >
          <span style={caption}>{`(BM-00${active + 1}) ${book.name}`}</span>
          <span style={{ ...caption, opacity: 0.7 }}>
            {formatSize(book.widthCm, book.heightCm) ?? formatPrice(book.price)}
          </span>
          <span style={{ ...caption, justifySelf: 'end', opacity: 0.7 }}>
            {active + 1} / {n}
          </span>
        </div>
      )}

      <a
        href="#danh-muc"
        style={{
          position: 'absolute',
          zIndex: 56,
          left: '50%',
          bottom: 'calc(46px + var(--space-3))',
          transform: 'translateX(-50%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 4,
          color: 'var(--color-bg)',
          fontSize: 10,
          letterSpacing: '.2em',
          textTransform: 'uppercase',
          textDecoration: 'none',
        }}
      >
        Cuộn xem tiếp
        <span style={{ fontSize: 14, lineHeight: 1, animation: 'bm-nudge 1.8s ease-in-out infinite' }}>↓</span>
      </a>

      <div
        style={{
          position: 'absolute',
          zIndex: 50,
          left: 'var(--space-8)',
          right: 'var(--space-8)',
          bottom: 'calc(46px + var(--space-6))',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 'var(--space-4)',
        }}
      >
        <button
          type="button"
          className="btn btn-primary"
          style={{ cursor: 'pointer' }}
          onClick={() => book && onOpen?.(book.slug)}
        >
          Xem chi tiết cuốn này
        </button>
        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          <button type="button" aria-label="Cuốn trước" style={navBtn} onClick={() => advance(-1)}>
            ←
          </button>
          <button type="button" aria-label="Cuốn sau" style={navBtn} onClick={() => advance(1)}>
            →
          </button>
        </div>
      </div>
    </section>
  );
}

const caption: React.CSSProperties = { fontSize: 11, letterSpacing: '.16em', textTransform: 'uppercase' };
const navBtn: React.CSSProperties = {
  appearance: 'none',
  font: 'inherit',
  fontSize: 15,
  width: 46,
  height: 46,
  border: '2px solid var(--color-text)',
  background: 'var(--color-bg)',
  color: 'var(--color-text)',
  cursor: 'pointer',
};
