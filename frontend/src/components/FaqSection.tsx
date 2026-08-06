import { useState } from 'react';

const FAQS = [
  { q: 'Ảnh của tôi có in được khổ lớn không?', a: 'Ảnh từ 12MP trở lên in tốt tới 60×80 cm. Ảnh điện thoại đời mới hoặc file máy ảnh gần như luôn đủ. Gửi file trước, xưởng kiểm tra và báo khổ tối đa in được mà không bị vỡ hạt.' },
  { q: 'Bao lâu thì xong một đơn?', a: 'Tranh canvas 3–5 ngày làm việc. Photobook 7–10 ngày kể từ lúc bạn duyệt bản mềm. Đơn gấp có thể rút còn 48 giờ, phụ thu 30%.' },
  { q: 'Màu in ra có giống trên màn hình không?', a: 'Xưởng in thử một dải màu trước khi in bản chính và gửi ảnh chụp cho bạn xem. Màn hình mỗi máy lệch nhau, nên bản in thử là căn cứ duy nhất. Nếu bản chính lệch so với bản thử đã duyệt, xưởng in lại miễn phí.' },
  { q: 'Ảnh cũ, mờ hoặc bị xước thì sao?', a: 'Có dịch vụ phục chế: ghép vết rách, khử ố, làm nét và phục hồi màu. Báo giá riêng theo mức độ hư hỏng, xem trước kết quả rồi mới quyết định in.' },
  { q: 'Giao hàng thế nào, có ship tỉnh không?', a: 'Ship toàn quốc. Tranh đóng thùng cứng có góc xốp, photobook bọc chống ẩm. Nội thành TP.HCM giao trong ngày; tỉnh 2–4 ngày. Vỡ hỏng do vận chuyển thì làm lại, không tính phí.' },
  { q: 'Đặt số lượng lớn cho quán hoặc văn phòng?', a: 'Từ 10 bức trở lên có giá riêng và người phụ trách theo đơn. Xưởng dựng bản mô phỏng cả mảng tường trước khi in để bạn duyệt bố cục.' },
];

export function FaqSection() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section style={{ borderTop: '2px solid var(--color-text)', background: 'var(--color-bg)' }}>
      <div data-split="" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 2fr)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', padding: 'var(--space-8)', borderRight: '2px solid var(--color-text)' }}>
          <span style={{ fontSize: 11, letterSpacing: '.2em', textTransform: 'uppercase', color: 'var(--color-accent-700)' }}>05/ hỏi đáp</span>
          <h2 style={{ margin: 0, fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: 'clamp(28px, 3vw, 40px)', lineHeight: 1.02, letterSpacing: '-.03em' }}>Câu hỏi thường gặp</h2>
          <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: 'var(--color-neutral-800)' }}>
            Không tìm thấy câu trả lời? Nhắn cho xưởng, thường trả lời trong vài giờ làm việc.
          </p>
          <a href="/lien-he" className="btn btn-secondary" style={{ alignSelf: 'start', marginTop: 'var(--space-2)' }}>Hỏi trực tiếp</a>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {FAQS.map((f, k) => {
            const on = open === k;
            return (
              <div key={f.q} style={{ borderBottom: '2px solid var(--color-divider)' }}>
                <button
                  type="button"
                  aria-expanded={on}
                  onClick={() => setOpen(on ? null : k)}
                  style={{
                    appearance: 'none', width: '100%', display: 'grid', gridTemplateColumns: 'auto minmax(0, 1fr) auto',
                    alignItems: 'baseline', gap: 'var(--space-4)', padding: 'var(--space-6) var(--space-8)',
                    border: 0, background: 'transparent', color: 'var(--color-text)', font: 'inherit', textAlign: 'left', cursor: 'pointer',
                  }}
                >
                  <span style={{ fontSize: 11, letterSpacing: '.18em', color: 'var(--color-neutral-700)' }}>{`0${k + 1}`}</span>
                  <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 17, lineHeight: 1.3, letterSpacing: '-.01em' }}>{f.q}</span>
                  <span style={{ fontSize: 20, lineHeight: 1, color: 'var(--color-accent)' }}>{on ? '−' : '+'}</span>
                </button>

                {/* grid-template-rows 0fr → 1fr; lớp trong giữ padding để panel đóng thu về đúng 0px */}
                <div style={{
                  display: 'grid', gridTemplateRows: on ? '1fr' : '0fr', opacity: on ? 1 : 0, overflow: 'hidden',
                  transition: 'grid-template-rows .35s cubic-bezier(.65,0,.2,1), opacity .25s linear',
                }}>
                  <div style={{ minHeight: 0, overflow: 'hidden' }}>
                    <p style={{
                      margin: 0, maxWidth: '68ch', fontSize: 15, lineHeight: 1.65, color: 'var(--color-neutral-800)',
                      padding: '0 var(--space-8) var(--space-6) calc(var(--space-8) + var(--space-6))',
                    }}>{f.a}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
