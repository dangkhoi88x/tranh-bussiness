/** Các link mạng xã hội vẫn cần URL thật của cửa hàng trước khi thay '#'. */
const COLS: { title: string; items: { label: string; href: string }[] }[] = [
  {
    title: 'Sản phẩm',
    items: [
      { label: 'Tranh canvas', href: '/danh-muc/tranh-canvas' },
      { label: 'Photobook', href: '/photobook' },
      { label: 'Khổ & giá', href: '/kho-va-gia' },
      { label: 'Đặt riêng', href: '/dat-in' },
    ],
  },
  {
    title: 'Hỗ trợ',
    items: [
      { label: 'Hướng dẫn đặt in', href: '/#cach-dat-in' },
      { label: 'Đơn hàng của tôi', href: '/don-hang-cua-toi' },
      { label: 'Sản phẩm yêu thích', href: '/yeu-thich' },
      { label: 'Thông báo', href: '/thong-bao' },
      { label: 'Tài khoản', href: '/account' },
      { label: 'Liên hệ', href: '/lien-he' },
      { label: 'Chính sách đổi trả', href: '/chinh-sach-doi-tra' },
      { label: 'Vận chuyển', href: '/chinh-sach-van-chuyen' },
      { label: 'Thanh toán', href: '/chinh-sach-thanh-toan' },
      { label: 'Bảo mật', href: '/chinh-sach-bao-mat' },
      { label: 'Câu hỏi thường gặp', href: '/#hoi-dap' },
    ],
  },
  {
    title: 'Theo dõi',
    items: [
      { label: 'Facebook', href: '#' },
      { label: 'Instagram', href: '#' },
      { label: 'Zalo', href: '#' },
      { label: 'TikTok', href: '#' },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer style={{ background: 'var(--color-text)', color: 'var(--color-bg)' }}>
      <div
        data-grid="cols"
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.4fr) repeat(3, minmax(0, 1fr))',
          gap: 'var(--space-8)',
          padding: 'var(--space-8)',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <span
            style={{
              display: 'flex',
              alignItems: 'baseline',
              gap: 2,
              fontFamily: 'var(--font-heading)',
              fontWeight: 800,
              fontSize: 22,
              letterSpacing: '-.02em',
            }}
          >
            bubble memories<span style={{ color: 'var(--color-accent)' }}>.</span>
          </span>
          <p style={{ margin: 0, maxWidth: '34ch', fontSize: 13, lineHeight: 1.6, opacity: 0.72 }}>
            Xưởng in tranh canvas và làm photobook theo yêu cầu. In từng cuốn một, cho từng người một.
          </p>
        </div>

        {COLS.map((col) => (
          <div key={col.title} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', minWidth: 0 }}>
            <span style={{ fontSize: 11, letterSpacing: '.2em', textTransform: 'uppercase', opacity: 0.55 }}>
              {col.title}
            </span>
            {col.items.map((it) => (
              <a
                key={it.label}
                href={it.href}
                style={{ fontSize: 14, lineHeight: 1.5, color: 'var(--color-bg)', textDecoration: 'none' }}
              >
                {it.label}
              </a>
            ))}
          </div>
        ))}
      </div>

      <div
        data-split=""
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) auto',
          alignItems: 'center',
          gap: 'var(--space-6)',
          padding: 'var(--space-4) var(--space-8)',
          borderTop: '2px solid var(--color-neutral-800)',
          fontSize: 11,
          letterSpacing: '.16em',
          textTransform: 'uppercase',
          opacity: 0.7,
        }}
      >
        <span>© 2026 Bubble Memories · 128 Trần Hưng Đạo, Q.5, TP.HCM · 8:00–18:00, T2–T7</span>
        <span>0909 000 000 · hello@bubblememories.vn</span>
      </div>
    </footer>
  );
}
