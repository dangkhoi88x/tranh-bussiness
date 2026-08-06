import { Frame } from './Frame';

const FEATURES = [
  { label: 'Đổi khổ tranh', icon: <><rect x="3" y="6" width="18" height="12" /><path d="M3 10h18" /><path d="M7 6V3" /><path d="M17 21v-3" /></> },
  { label: 'Ướm lên tường', icon: <><path d="M12 3 4 7v10l8 4 8-4V7l-8-4Z" /><path d="m4 7 8 4 8-4" /><path d="M12 11v10" /></> },
  { label: 'Phóng xem chi tiết', icon: <><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /><path d="M8 11h6" /><path d="M11 8v6" /></> },
];

export function ViewInRoom({ image }: { image?: string }) {
  return (
    <section style={{ borderTop: '2px solid var(--color-text)', background: 'var(--color-bg)' }}>
      <div data-split="" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.25fr) minmax(0, 1fr)', alignItems: 'stretch' }}>
        <div style={{ position: 'relative', minHeight: 460, borderRight: '2px solid var(--color-text)' }}>
          <div style={{ position: 'absolute', inset: 0 }}>
            <Frame src={image} label="ảnh phòng thật có tranh treo tường" />
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)', padding: 'var(--space-8)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            <span style={{ fontSize: 11, letterSpacing: '.2em', textTransform: 'uppercase', color: 'var(--color-accent-700)' }}>03/ thử trước khi in</span>
            <h2 style={{ margin: 0, fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: 'clamp(28px, 3vw, 40px)', lineHeight: 1.02, letterSpacing: '-.03em' }}>
              Xem tranh trên tường nhà bạn
            </h2>
          </div>

          <p style={{ margin: 0, maxWidth: '46ch', fontSize: 15, lineHeight: 1.6, color: 'var(--color-neutral-800)' }}>
            Chưa chắc nên chọn khổ nào? Chụp một tấm ảnh bức tường, chọn tranh và đổi qua lại giữa các khổ ngay trên ảnh đó cho tới khi vừa mắt.
          </p>

          <div data-grid="cols" style={{
            display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
            borderTop: '2px solid var(--color-divider)', borderBottom: '2px solid var(--color-divider)',
          }}>
            {FEATURES.map((ft, i) => (
              <div key={ft.label} style={{
                display: 'flex', flexDirection: 'column', gap: 'var(--space-3)',
                padding: i === 0 ? 'var(--space-4) var(--space-4) var(--space-4) 0' : 'var(--space-4)',
                borderRight: i < FEATURES.length - 1 ? '2px solid var(--color-divider)' : undefined,
              }}>
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="square" style={{ color: 'var(--color-accent)' }}>{ft.icon}</svg>
                <span style={{ fontSize: 12, letterSpacing: '.12em', textTransform: 'uppercase' }}>{ft.label}</span>
              </div>
            ))}
          </div>

          <a href="/thu-tren-tuong" className="btn btn-primary btn-block" style={{ marginTop: 'auto' }}>Thử ngay</a>
        </div>
      </div>
    </section>
  );
}
