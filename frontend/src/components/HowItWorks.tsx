const STEPS = [
  {
    num: '01',
    title: 'Gửi ảnh',
    body: 'Gửi file gốc qua Zalo hoặc form trên trang, kèm khổ mong muốn nếu đã biết. Không cần chỉnh sửa gì trước.',
    when: 'Bạn làm · 5 phút',
  },
  {
    num: '02',
    title: 'Duyệt bản mềm',
    body: 'Xưởng kiểm tra độ phân giải, cắt cúp theo khổ và gửi lại bản mô phỏng kèm báo giá. Sửa tới khi bạn ưng.',
    when: 'Xưởng làm · trong 24 giờ',
  },
  {
    num: '03',
    title: 'In và kiểm màu',
    body: 'In thử dải màu, chụp gửi bạn xem trước khi in bản chính. Lệch so với bản đã duyệt thì in lại, không tính phí.',
    when: 'Xưởng làm · 3–5 ngày',
  },
  {
    num: '04',
    title: 'Đóng gói và giao',
    body: 'Tranh đóng thùng cứng có góc xốp, photobook bọc chống ẩm. Ship toàn quốc, có mã theo dõi.',
    when: 'Giao · 1–4 ngày',
  },
];

export function HowItWorks() {
  return (
    // id là đích của link "Hướng dẫn đặt in" ở header và footer.
    <section id="cach-dat-in" style={{ borderTop: '2px solid var(--color-text)', background: 'var(--color-bg)' }}>
      <div
        data-split=""
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
          gap: 'var(--space-6)',
          alignItems: 'end',
          padding: 'var(--space-8) var(--space-8) var(--space-6)',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          <span
            style={{
              fontSize: 11,
              letterSpacing: '.2em',
              textTransform: 'uppercase',
              color: 'var(--color-accent-700)',
            }}
          >
            04/ cách đặt in
          </span>
          <h2
            style={{
              margin: 0,
              fontFamily: 'var(--font-heading)',
              fontWeight: 800,
              fontSize: 'clamp(28px, 3vw, 40px)',
              lineHeight: 1.02,
              letterSpacing: '-.03em',
            }}
          >
            Gửi file xong thì chuyện gì xảy ra?
          </h2>
        </div>
        <p style={{ margin: 0, maxWidth: '46ch', fontSize: 14, lineHeight: 1.55, color: 'var(--color-neutral-800)' }}>
          Bốn bước, bạn duyệt ở bước hai và không có gì được in trước khi bạn đồng ý.
        </p>
      </div>

      <div
        data-grid="cols"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
          borderTop: '2px solid var(--color-text)',
        }}
      >
        {STEPS.map((s, i) => (
          <article
            key={s.num}
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--space-3)',
              padding: 'var(--space-8)',
              minWidth: 0,
              borderRight: i < STEPS.length - 1 ? '2px solid var(--color-divider)' : undefined,
            }}
          >
            <span
              style={{
                fontFamily: 'var(--font-heading)',
                fontWeight: 800,
                fontSize: 44,
                lineHeight: 1,
                letterSpacing: '-.04em',
                color: 'var(--color-accent)',
              }}
            >
              {s.num}
            </span>
            <h3
              style={{
                margin: 0,
                fontFamily: 'var(--font-heading)',
                fontWeight: 800,
                fontSize: 20,
                lineHeight: 1.1,
                letterSpacing: '-.02em',
              }}
            >
              {s.title}
            </h3>
            <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: 'var(--color-neutral-800)' }}>{s.body}</p>
            <span
              style={{
                marginTop: 'auto',
                paddingTop: 'var(--space-4)',
                fontSize: 11,
                letterSpacing: '.18em',
                textTransform: 'uppercase',
                color: 'var(--color-neutral-700)',
              }}
            >
              {s.when}
            </span>
          </article>
        ))}
      </div>
    </section>
  );
}
