import { useMemo } from 'react';
import { layoutByCode } from '../../data/spreadLayouts';
import { DraftSpread } from './draft';

export function PhotobookProgressBar({ spreads }: { spreads: DraftSpread[] }) {
  const { filled, total } = useMemo(() => {
    let filled = 0,
      total = 0;
    for (const s of spreads) {
      const slotCount = layoutByCode(s.layoutCode).slots.length;
      total += slotCount;
      for (let i = 0; i < slotCount; i++) {
        if (s.slots[i]?.file) filled++;
      }
    }
    return { filled, total };
  }, [spreads]);

  if (total === 0) return null;
  const pct = Math.round((filled / total) * 100);
  const done = filled === total;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-4)',
        padding: 'var(--space-3) var(--space-8)',
        borderBottom: '1px solid var(--color-neutral-200)',
        background: 'var(--color-bg)',
      }}
    >
      <div style={{ flex: 1, height: 6, borderRadius: 3, background: 'var(--color-neutral-200)', overflow: 'hidden' }}>
        <div
          style={{
            height: '100%',
            borderRadius: 3,
            width: `${pct}%`,
            background: done ? 'var(--color-accent-700)' : 'var(--color-text)',
            transition: 'width .3s ease',
          }}
        />
      </div>
      <span
        style={{
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: '.04em',
          whiteSpace: 'nowrap',
          color: done ? 'var(--color-accent-700)' : 'var(--color-neutral-700)',
        }}
      >
        {filled}/{total} ảnh · {pct}%
      </span>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   Step 1 — Chọn quy cách
   ═══════════════════════════════════════════════════════════════════════════ */
