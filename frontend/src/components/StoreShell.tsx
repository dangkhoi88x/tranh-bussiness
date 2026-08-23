import type { ReactNode } from 'react';
import { formatSize } from '../api/storefront';
import type { CartItem } from '../api/cart';
import { SiteFooter } from './SiteFooter';
import { SiteHeader } from './SiteHeader';

export const STORE_LABEL_STYLE: React.CSSProperties = {
  fontSize: 11,
  letterSpacing: '.16em',
  textTransform: 'uppercase',
  color: 'var(--color-neutral-700)',
};

/**
 * Mô tả lựa chọn của một dòng giỏ hàng. Photobook phải nêu số trang: hai dòng cùng khổ mà
 * khác số trang có giá khác nhau, không hiện ra thì trông như bị nhân đôi nhầm. Sách cũng
 * không có khung nên bỏ hẳn "Căng viền" ở nhánh đó.
 */
export function cartItemOptions(item: CartItem): string {
  const variant = item.selectedVariant;
  const size = variant ? (formatSize(variant.widthCm, variant.heightCm) ?? variant.name) : null;
  if (item.pageCount !== null) {
    return [size, `${item.pageCount} trang`, variant?.material].filter(Boolean).join(' · ');
  }
  return [size, variant?.material, item.selectedFrameOption?.frameName ?? 'Căng viền'].filter(Boolean).join(' · ');
}

export function StoreSummaryRow({
  label,
  value,
  valueTone,
}: {
  label: string;
  value: string;
  valueTone?: 'default' | 'discount';
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'baseline',
        justifyContent: 'space-between',
        gap: 'var(--space-4)',
        padding: 'var(--space-3) 0',
        borderBottom: '1px solid var(--color-neutral-300)',
      }}
    >
      <span style={STORE_LABEL_STYLE}>{label}</span>
      <span
        style={{
          fontSize: 14,
          color: valueTone === 'discount' ? 'var(--color-accent-700)' : undefined,
          fontWeight: valueTone === 'discount' ? 600 : undefined,
        }}
      >
        {value}
      </span>
    </div>
  );
}

export function StoreNotice({ title, body, action }: { title: string; body: string; action?: ReactNode }) {
  return (
    <section
      style={{
        display: 'grid',
        placeItems: 'center',
        gap: 'var(--space-4)',
        minHeight: '36vh',
        padding: 'var(--space-8)',
        textAlign: 'center',
        borderTop: '2px solid var(--color-text)',
      }}
    >
      <h2
        style={{
          margin: 0,
          fontFamily: 'var(--font-heading)',
          fontWeight: 800,
          fontSize: 26,
          letterSpacing: '-.025em',
        }}
      >
        {title}
      </h2>
      {body && (
        <p
          style={{
            margin: 0,
            maxWidth: '46ch',
            fontSize: 15,
            lineHeight: 1.6,
            color: 'var(--color-neutral-800)',
          }}
        >
          {body}
        </p>
      )}
      {action}
    </section>
  );
}

export function StoreShell({ cartCount, children }: { cartCount: number; children: ReactNode }) {
  return (
    <div style={{ background: 'var(--color-neutral-200)' }}>
      <div
        style={{
          fontFamily: 'var(--font-body)',
          color: 'var(--color-text)',
          background: 'var(--color-bg)',
          minHeight: '100vh',
          width: '100%',
          maxWidth: 1180,
          margin: '0 auto',
          borderLeft: '2px solid var(--color-divider)',
          borderRight: '2px solid var(--color-divider)',
        }}
      >
        <SiteHeader cartCount={cartCount} />
        {children}
        <SiteFooter />
      </div>
    </div>
  );
}
