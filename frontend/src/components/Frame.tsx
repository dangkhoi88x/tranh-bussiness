import type { CSSProperties } from 'react';

/**
 * Ô ảnh. Có src thì in ảnh trắng đen (design system: mọi ảnh nội dung đều grayscale),
 * chưa có thì hiện placeholder gạch chân mô tả nội dung cần đặt vào.
 *
 * Hai mặc định trên chỉ đúng cho ảnh trang trí. Ở đâu ảnh CHÍNH LÀ món hàng đang bán
 * (trang chi tiết sản phẩm) thì phải truyền tone="color" để người mua thấy đúng màu tranh,
 * và fit="contain" để tranh khổ dọc không bị cắt đầu đuôi trong ô 4/3.
 */
export function Frame({
  src,
  alt,
  label,
  style,
  tone = 'grayscale',
  fit = 'cover',
}: {
  src?: string;
  alt?: string;
  label: string;
  style?: CSSProperties;
  tone?: 'grayscale' | 'color';
  fit?: 'cover' | 'contain';
}) {
  if (src) {
    return (
      <img
        src={src}
        alt={alt ?? label}
        style={{
          width: '100%',
          height: '100%',
          objectFit: fit,
          display: 'block',
          ...(tone === 'grayscale' ? { filter: 'grayscale(1)' } : null),
          ...style,
        }}
      />
    );
  }
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'grid',
        placeItems: 'center',
        background: 'var(--color-neutral-200)',
        color: 'var(--color-neutral-700)',
        fontSize: 12,
        letterSpacing: '.12em',
        textTransform: 'uppercase',
        textAlign: 'center',
        padding: 'var(--space-4)',
        ...style,
      }}
    >
      {label}
    </div>
  );
}
