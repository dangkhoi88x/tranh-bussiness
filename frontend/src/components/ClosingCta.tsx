export function ClosingCta() {
  return (
    <section style={{ borderTop: '2px solid var(--color-text)', background: 'var(--color-accent)', color: 'var(--color-bg)' }}>
      <div data-split="" style={{
        display: 'grid', gridTemplateColumns: 'minmax(0, 1.6fr) minmax(0, 1fr)',
        alignItems: 'end', gap: 'var(--space-8)', padding: 'var(--space-8)',
      }}>
        <h2 style={{
          margin: 0, fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: 'clamp(32px, 5.4vw, 76px)',
          lineHeight: .96, letterSpacing: '-.035em', textTransform: 'uppercase', textWrap: 'balance',
        }}>Gửi ảnh hôm nay, nhận báo giá trong 24 giờ</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, letterSpacing: '.1em', textTransform: 'uppercase' }}>
            Không cần chỉnh sửa gì trước. Cứ gửi file gốc, xưởng lo phần còn lại.
          </p>
          <a href="/dat-in" style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-6)',
            height: 56, padding: '0 var(--space-6)', background: 'var(--color-bg)', color: 'var(--color-text)',
            fontSize: 14, fontWeight: 600, letterSpacing: '.1em', textTransform: 'uppercase', textDecoration: 'none',
          }}>Gửi ảnh nhận báo giá <span aria-hidden="true">→</span></a>
        </div>
      </div>
    </section>
  );
}
