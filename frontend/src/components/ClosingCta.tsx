/**
 * Dải CTA đỏ dùng chung. Trang chủ giữ chữ mặc định cỡ lớn; trang chi tiết sản phẩm
 * truyền copy riêng và cỡ chữ nhỏ hơn vì nó nằm ngay trên footer.
 */
export function ClosingCta({
  title = 'Gửi ảnh hôm nay, nhận báo giá trong 24 giờ',
  note = 'Không cần chỉnh sửa gì trước. Cứ gửi file gốc, xưởng lo phần còn lại.',
  titleSize = 'clamp(32px, 5.4vw, 76px)',
}: { title?: string; note?: string; titleSize?: string } = {}) {
  return (
    <section
      style={{ borderTop: '2px solid var(--color-text)', background: 'var(--color-accent)', color: 'var(--color-bg)' }}
    >
      <div
        data-split=""
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.6fr) minmax(0, 1fr)',
          alignItems: 'end',
          gap: 'var(--space-8)',
          padding: 'var(--space-8)',
        }}
      >
        <h2
          style={{
            margin: 0,
            fontFamily: 'var(--font-heading)',
            fontWeight: 800,
            fontSize: titleSize,
            lineHeight: 0.96,
            letterSpacing: '-.035em',
            textTransform: 'uppercase',
            textWrap: 'balance',
          }}
        >
          {title}
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, letterSpacing: '.1em', textTransform: 'uppercase' }}>
            {note}
          </p>
          {/* /dat-in chưa có trang (xem App.tsx), dù backend đã có luồng đơn theo yêu cầu. */}
          <a
            href="/dat-in"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 'var(--space-6)',
              height: 56,
              padding: '0 var(--space-6)',
              background: 'var(--color-bg)',
              color: 'var(--color-text)',
              fontSize: 14,
              fontWeight: 600,
              letterSpacing: '.1em',
              textTransform: 'uppercase',
              textDecoration: 'none',
            }}
          >
            Gửi ảnh nhận báo giá <span aria-hidden="true">→</span>
          </a>
        </div>
      </div>
    </section>
  );
}
