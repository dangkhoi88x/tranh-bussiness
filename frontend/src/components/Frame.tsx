import type { CSSProperties } from 'react';

/**
 * Ô ảnh. Có src thì in ảnh trắng đen (design system: mọi ảnh nội dung đều grayscale),
 * chưa có thì hiện placeholder gạch chân mô tả nội dung cần đặt vào.
 */
export function Frame({ src, alt, label, style }: { src?: string; alt?: string; label: string; style?: CSSProperties }) {
  if (src) {
    return (
      <img
        src={src}
        alt={alt ?? label}
        style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'grayscale(1)', display: 'block', ...style }}
      />
    );
  }
  return (
    <div
      style={{
        width: '100%', height: '100%', display: 'grid', placeItems: 'center',
        background: 'var(--color-neutral-200)', color: 'var(--color-neutral-700)',
        fontSize: 12, letterSpacing: '.12em', textTransform: 'uppercase', textAlign: 'center',
        padding: 'var(--space-4)', ...style,
      }}
    >
      {label}
    </div>
  );
}
