import { useState } from 'react';
import { STORE_LABEL_STYLE } from '../../components/StoreShell';
import { layoutByCode, type SpreadLayout } from '../../data/spreadLayouts';
import { SlotImage } from './SlotImage';
import { CAPTION_FONTS, DraftSpread } from './draft';

export function SpreadOrderGrid({ spreads, activeIndex, onSelect, onMove, compact = false, ariaLabel }: {
  spreads: DraftSpread[];
  activeIndex?: number;
  onSelect: (idx: number) => void;
  onMove: (fromIdx: number, toIdx: number) => void;
  compact?: boolean;
  ariaLabel: string;
}) {
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState<{ index: number; after: boolean } | null>(null);

  function beginDrag(event: React.DragEvent<HTMLButtonElement>, index: number) {
    setDragFrom(index);
    event.dataTransfer.effectAllowed = 'move';
    // Firefox only starts an HTML5 drag after at least one data item is supplied.
    event.dataTransfer.setData('text/plain', String(index));
  }

  function updateDropTarget(event: React.DragEvent<HTMLDivElement>, index: number) {
    if (dragFrom === null || dragFrom === index) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    const bounds = event.currentTarget.getBoundingClientRect();
    setDragOver({ index, after: event.clientY - bounds.top >= bounds.height / 2 });
  }

  function dropOn(event: React.DragEvent<HTMLDivElement>, index: number) {
    event.preventDefault();
    if (dragFrom === null || dragFrom === index) {
      setDragOver(null);
      return;
    }
    const bounds = event.currentTarget.getBoundingClientRect();
    const after = event.clientY - bounds.top >= bounds.height / 2;
    const destination = dragFrom < index ? (after ? index : index - 1) : (after ? index + 1 : index);
    onMove(dragFrom, destination);
    setDragFrom(null);
    setDragOver(null);
  }

  return (
    <section aria-label={ariaLabel} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 'var(--space-3)' }}>
        <span style={STORE_LABEL_STYLE}>Thứ tự spread</span>
        <span style={{ fontSize: 11, color: 'var(--color-neutral-600)' }}>Kéo ⠿ hoặc dùng mũi tên</span>
      </div>
      <div data-pb-review-grid="" style={{ display: 'grid', gridTemplateColumns: compact ? 'repeat(auto-fill, minmax(132px, 1fr))' : 'repeat(auto-fill, minmax(280px, 1fr))', gap: compact ? 'var(--space-2)' : 'var(--space-4)' }}>
        {spreads.map((spread, idx) => {
          const layout = layoutByCode(spread.layoutCode);
          const isDragged = dragFrom === idx;
          const target = dragOver?.index === idx ? dragOver : null;
          return (
            <div key={idx} onDragOver={(event) => updateDropTarget(event, idx)} onDragLeave={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget as Node)) setDragOver((current) => current?.index === idx ? null : current);
            }} onDrop={(event) => dropOn(event, idx)} style={{
              position: 'relative', opacity: isDragged ? 0.45 : 1, transition: 'opacity .15s, transform .15s',
              transform: target ? 'scale(1.015)' : undefined,
            }}>
              {target && <span aria-hidden="true" style={{ position: 'absolute', zIndex: 2, left: 0, right: 0, height: 3, borderRadius: 99, background: 'var(--color-accent)', [target.after ? 'bottom' : 'top']: -5 }} />}
              <button type="button" onClick={() => onSelect(idx)} style={{
                appearance: 'none', display: 'flex', width: '100%', flexDirection: 'column', gap: 4,
                border: `2px solid ${activeIndex === idx ? 'var(--color-accent)' : 'var(--color-neutral-300)'}`, borderRadius: 4,
                background: 'var(--color-bg)', cursor: 'pointer', padding: compact ? 4 : 6, textAlign: 'left',
                transition: 'border-color .15s',
              }}>
                <SpreadMini spread={spread} layout={layout} />
                <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--color-neutral-700)' }}>
                  {idx + 1}. {compact ? 'Spread' : layout.name}
                </span>
              </button>
              <button type="button" draggable onDragStart={(event) => beginDrag(event, idx)} onDragEnd={() => { setDragFrom(null); setDragOver(null); }}
                aria-label={`Kéo spread ${idx + 1} để đổi thứ tự`} title="Kéo để đổi thứ tự" style={{
                  position: 'absolute', top: compact ? 7 : 9, right: compact ? 7 : 9, zIndex: 3, width: 29, height: 29,
                  border: '1px solid var(--color-neutral-300)', borderRadius: 4, color: 'var(--color-neutral-700)', background: 'rgba(255,255,255,.9)',
                  cursor: 'grab', fontSize: 16, lineHeight: 1,
                }}>⠿</button>
              <div aria-label={`Di chuyển spread ${idx + 1}`} style={{ position: 'absolute', zIndex: 3, right: compact ? 6 : 8, bottom: compact ? 24 : 27, display: 'flex', gap: 3 }}>
                <button type="button" disabled={idx === 0} onClick={() => onMove(idx, idx - 1)} aria-label={`Đưa spread ${idx + 1} lên trước`} style={moveButtonStyle}>↑</button>
                <button type="button" disabled={idx === spreads.length - 1} onClick={() => onMove(idx, idx + 1)} aria-label={`Đưa spread ${idx + 1} xuống sau`} style={moveButtonStyle}>↓</button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export const moveButtonStyle: React.CSSProperties = {
  width: 24, height: 22, padding: 0, border: '1px solid var(--color-neutral-300)', borderRadius: 3,
  color: 'var(--color-neutral-700)', background: 'rgba(255,255,255,.92)', cursor: 'pointer', fontSize: 13, lineHeight: 1,
};

export function SpreadMini({ spread, layout }: { spread: DraftSpread; layout: SpreadLayout }) {
  return (
    <div style={{
      position: 'relative', width: '100%', aspectRatio: '2 / 1.4',
      background: spread.backgroundColor || 'var(--color-neutral-100)', borderRadius: 2, overflow: 'hidden',
      containerType: 'inline-size',
    }}>
      <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: 1, background: 'var(--color-neutral-200)' }} />
      {layout.slots.map((slot, i) => {
        const data = spread.slots[i];
        return (
          <div key={i} style={{
            position: 'absolute', left: `${slot.x * 100}%`, top: `${slot.y * 100}%`,
            width: `${slot.w * 100}%`, height: `${slot.h * 100}%`,
            background: data?.preview ? 'transparent' : 'var(--color-neutral-200)',
            borderRadius: slot.bleed ? 0 : 2, overflow: 'hidden',
            border: '1px solid var(--color-neutral-300)',
          }}>
            {data?.preview && (
              <SlotImage slot={data} alt="" />
            )}
          </div>
        );
      })}
      {spread.captions.map((caption) => (
        <div key={caption.id} style={{
          position: 'absolute', left: `${caption.x * 100}%`, top: `${caption.y * 100}%`,
          transform: 'translate(-50%, -50%)', zIndex: 5, maxWidth: '60%',
          padding: '1px 3px', fontSize: `${caption.fontSize}cqw`,
          fontWeight: caption.bold ? 700 : 400, color: caption.color,
          fontFamily: `"${caption.fontFamily}", ${CAPTION_FONTS.find((f) => f.value === caption.fontFamily)?.fallback ?? 'sans-serif'}`,
          textAlign: caption.align, lineHeight: 1.3, whiteSpace: 'pre-wrap',
          pointerEvents: 'none', overflow: 'hidden',
        }}>
          {caption.text}
        </div>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   Book Demo — 3D page-flip preview
   ═══════════════════════════════════════════════════════════════════════════ */
