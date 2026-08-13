import { useCallback, useEffect, useRef, useState } from 'react';
import { layoutByCode } from '../../data/spreadLayouts';
import { SlotImage } from './SlotImage';
import { CAPTION_FONTS, DraftSpread } from './draft';
import { chipStyle } from './styles';

export function BookDemo({ spreads, onEdit }: { spreads: DraftSpread[]; onEdit: (idx: number) => void }) {
  const [page, setPage] = useState(-1);
  const [flipping, setFlipping] = useState(false);
  const [autoPlay, setAutoPlay] = useState(false);
  const timerRef = useRef<number>(0);
  const total = spreads.length;

  const goNext = useCallback(() => {
    if (flipping || page >= total) return;
    setFlipping(true);
    setPage((p) => p + 1);
    window.setTimeout(() => setFlipping(false), 700);
  }, [flipping, page, total]);

  const goPrev = useCallback(() => {
    if (flipping || page < 0) return;
    setFlipping(true);
    setPage((p) => p - 1);
    window.setTimeout(() => setFlipping(false), 700);
  }, [flipping, page]);

  useEffect(() => {
    if (!autoPlay) { window.clearInterval(timerRef.current); return; }
    timerRef.current = window.setInterval(() => {
      setPage((p) => {
        if (p >= total) { setAutoPlay(false); return p; }
        setFlipping(true);
        window.setTimeout(() => setFlipping(false), 700);
        return p + 1;
      });
    }, 2200);
    return () => window.clearInterval(timerRef.current);
  }, [autoPlay, total]);

  const isCover = page < 0;
  const isBack = page >= total;
  const visibleIdx = Math.max(0, Math.min(page, total - 1));
  const nextIdx = Math.min(page + 1, total - 1);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-6)' }}>
      {/* Book scene */}
      <div data-pb-book-scene="" style={{ perspective: 1800, width: '100%', maxWidth: 640, margin: '0 auto' }}>
        <div style={{
          position: 'relative', width: '100%', aspectRatio: '1.05 / 0.7',
          transformStyle: 'preserve-3d',
        }}>
          {/* Book shadow */}
          <div style={{
            position: 'absolute', bottom: -8, left: '8%', right: '8%', height: 16,
            background: 'radial-gradient(ellipse at center, rgba(0,0,0,.18) 0%, transparent 70%)',
            borderRadius: '50%', filter: 'blur(4px)',
          }} />

          {/* Back cover */}
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(135deg, var(--color-neutral-300) 0%, var(--color-neutral-200) 100%)',
            borderRadius: '2px 6px 6px 2px', border: '1px solid var(--color-neutral-300)',
          }} />

          {/* Static underneath page (next spread or back cover) */}
          <div style={{
            position: 'absolute', inset: 0, borderRadius: '2px 6px 6px 2px', overflow: 'hidden',
            background: isBack ? 'linear-gradient(135deg, var(--color-neutral-300) 0%, var(--color-neutral-200) 100%)' : '#fff',
          }}>
            {!isBack && page + 1 < total && (
              <SpreadPage spread={spreads[nextIdx]} />
            )}
            {isBack && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%',
                fontSize: 13, color: 'var(--color-neutral-500)', fontStyle: 'italic' }}>
                Bìa sau
              </div>
            )}
          </div>

          {/* Flipping page */}
          <div style={{
            position: 'absolute', inset: 0,
            transformOrigin: 'left center',
            transform: page >= 0 && !isCover
              ? `rotateY(${flipping && page === visibleIdx ? '-160deg' : page > visibleIdx ? '-180deg' : '0deg'})`
              : 'rotateY(0deg)',
            transition: flipping ? 'transform .65s cubic-bezier(.645,.045,.355,1)' : 'none',
            backfaceVisibility: 'hidden',
            borderRadius: '2px 6px 6px 2px', overflow: 'hidden',
            background: '#fff', zIndex: 2,
            boxShadow: flipping ? '4px 0 12px rgba(0,0,0,.12)' : '2px 0 6px rgba(0,0,0,.06)',
          }}>
            {isCover ? (
              <div style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                height: '100%', gap: 'var(--space-4)',
                background: 'linear-gradient(145deg, var(--color-text) 0%, #3d3835 100%)',
                color: 'var(--color-bg)', borderRadius: '2px 6px 6px 2px',
              }}>
                <span style={{ fontSize: 10, letterSpacing: '.3em', textTransform: 'uppercase', opacity: 0.6 }}>Preview</span>
                <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: 22, letterSpacing: '-.02em' }}>Photobook</span>
                <span style={{ fontSize: 11, opacity: 0.5 }}>{total} spread</span>
              </div>
            ) : (
              <SpreadPage spread={spreads[visibleIdx]} />
            )}
          </div>

          {/* Spine */}
          <div style={{
            position: 'absolute', left: 0, top: 0, bottom: 0, width: 10,
            background: 'linear-gradient(90deg, var(--color-neutral-400) 0%, var(--color-neutral-300) 40%, var(--color-neutral-400) 100%)',
            borderRadius: '2px 0 0 2px', zIndex: 3,
          }} />
        </div>
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
        <button type="button" className="btn btn-ghost" disabled={page < 0 || flipping} onClick={goPrev}>
          ← Trước
        </button>

        <button type="button" onClick={() => setAutoPlay(!autoPlay)} style={{
          ...chipStyle(autoPlay), minWidth: 100,
        }}>
          {autoPlay ? 'Dừng' : 'Tự lật'}
        </button>

        <button type="button" className="btn btn-ghost" disabled={page >= total || flipping} onClick={goNext}>
          Sau →
        </button>
      </div>

      <p style={{ margin: 0, fontSize: 12, color: 'var(--color-neutral-700)', textAlign: 'center' }}>
        {isCover ? 'Bìa trước' : isBack ? 'Bìa sau' : `Spread ${page + 1} / ${total}`}
        {!isCover && !isBack && (
          <> · <button type="button" onClick={() => onEdit(page)} style={{
            appearance: 'none', border: 0, background: 'transparent', font: 'inherit',
            color: 'var(--color-accent-700)', cursor: 'pointer', textDecoration: 'underline', padding: 0,
          }}>Sửa spread này</button></>
        )}
      </p>
    </div>
  );
}

export function SpreadPage({ spread }: { spread: DraftSpread }) {
  const layout = layoutByCode(spread.layoutCode);
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', background: spread.backgroundColor || '#fff', containerType: 'inline-size' }}>
      <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: 1, background: 'var(--color-neutral-200)' }} />
      {layout.slots.map((slot, i) => {
        const data = spread.slots[i];
        return (
          <div key={i} style={{
            position: 'absolute', left: `${slot.x * 100}%`, top: `${slot.y * 100}%`,
            width: `${slot.w * 100}%`, height: `${slot.h * 100}%`,
            background: data?.preview ? 'transparent' : 'var(--color-neutral-100)',
            borderRadius: slot.bleed ? 0 : 2, overflow: 'hidden',
            border: `1px solid ${data?.preview ? 'transparent' : 'var(--color-neutral-200)'}`,
          }}>
            {data?.preview ? (
              <SlotImage slot={data} alt="" />
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%',
                fontSize: 18, color: 'var(--color-neutral-300)' }}>+</div>
            )}
          </div>
        );
      })}
      {spread.captions.map((caption) => (
        <div key={caption.id} style={{
          position: 'absolute', left: `${caption.x * 100}%`, top: `${caption.y * 100}%`,
          transform: 'translate(-50%, -50%)', zIndex: 5, maxWidth: '60%',
          padding: '2px 6px', fontSize: `${caption.fontSize}cqw`,
          fontWeight: caption.bold ? 700 : 400, color: caption.color,
          fontFamily: `"${caption.fontFamily}", ${CAPTION_FONTS.find((f) => f.value === caption.fontFamily)?.fallback ?? 'sans-serif'}`,
          textAlign: caption.align, lineHeight: 1.3, whiteSpace: 'pre-wrap',
          textShadow: caption.color === '#ffffff' ? '0 1px 3px rgba(0,0,0,.5)' : '0 1px 2px rgba(255,255,255,.3)',
          pointerEvents: 'none',
        }}>
          {caption.text}
        </div>
      ))}
      {layout.slots.length === 0 && !spread.captions.length && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%',
          fontSize: 12, color: 'var(--color-neutral-400)', fontStyle: 'italic' }}>
          Trang trang trí
        </div>
      )}
    </div>
  );
}
