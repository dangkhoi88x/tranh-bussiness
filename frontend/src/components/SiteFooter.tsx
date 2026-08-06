const COLS = [
  { title: 'Sản phẩm', items: ['Tranh canvas', 'Photobook', 'Khổ & giá', 'Đặt riêng'] },
  { title: 'Hỗ trợ', items: ['Hướng dẫn đặt in', 'Chính sách đổi trả', 'Vận chuyển', 'Câu hỏi thường gặp'] },
  { title: 'Theo dõi', items: ['Facebook', 'Instagram', 'Zalo', 'TikTok'] },
];

export function SiteFooter() {
  return (
    <footer style={{ background: 'var(--color-text)', color: 'var(--color-bg)' }}>
      <div data-grid="cols" style={{
        display: 'grid', gridTemplateColumns: 'minmax(0, 1.4fr) repeat(3, minmax(0, 1fr))',
        gap: 'var(--space-8)', padding: 'var(--space-8)',
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <span style={{ display: 'flex', alignItems: 'baseline', gap: 2, fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: 22, letterSpacing: '-.02em' }}>
            bubble memories<span style={{ color: 'var(--color-accent)' }}>.</span>
          </span>
          <p style={{ margin: 0, maxWidth: '34ch', fontSize: 13, lineHeight: 1.6, opacity: .72 }}>
            Xưởng in tranh canvas và làm photobook theo yêu cầu. In từng cuốn một, cho từng người một.
          </p>
        </div>

        {COLS.map((col) => (
          <div key={col.title} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', minWidth: 0 }}>
            <span style={{ fontSize: 11, letterSpacing: '.2em', textTransform: 'uppercase', opacity: .55 }}>{col.title}</span>
            {col.items.map((it) => (
              <a key={it} href="#" style={{ fontSize: 14, lineHeight: 1.5, color: 'var(--color-bg)', textDecoration: 'none' }}>{it}</a>
            ))}
          </div>
        ))}
      </div>

      <div data-split="" style={{
        display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', alignItems: 'center', gap: 'var(--space-6)',
        padding: 'var(--space-4) var(--space-8)', borderTop: '2px solid var(--color-neutral-800)',
        fontSize: 11, letterSpacing: '.16em', textTransform: 'uppercase', opacity: .7,
      }}>
        <span>© 2026 Bubble Memories · 128 Trần Hưng Đạo, Q.5, TP.HCM · 8:00–18:00, T2–T7</span>
        <span>0909 000 000 · hello@bubblememories.vn</span>
      </div>
    </footer>
  );
}
