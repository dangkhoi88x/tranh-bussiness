import { Link, useLocation } from 'react-router-dom';
import { STORE_LABEL_STYLE, StoreShell } from '../components/StoreShell';
import { useCart } from '../hooks/useCart';
import { absoluteSiteUrl, useDocumentMeta } from '../hooks/useDocumentMeta';
import '../styles/ds.css';
import '../styles/public.css';

type PageLink = { label: string; to: string };

const POLICY_PAGES: Record<string, { title: string; intro: string; sections: { title: string; body: string[] }[] }> = {
  'chinh-sach-doi-tra': {
    title: 'Chính sách đổi trả',
    intro: 'Nếu sản phẩm gặp vấn đề trong quá trình giao nhận, hãy liên hệ xưởng để được kiểm tra và hỗ trợ.',
    sections: [
      { title: 'Khi nhận hàng', body: ['Bạn nên kiểm tra bưu kiện và sản phẩm ngay khi nhận. Giữ lại ảnh chụp tình trạng kiện hàng nếu có dấu hiệu móp, rách hoặc hư hại.'] },
      { title: 'Sản phẩm bị hư hại khi vận chuyển', body: ['Với sản phẩm bị hư hại trong quá trình vận chuyển, xưởng sẽ tiếp nhận thông tin, kiểm tra và hỗ trợ in lại khi phù hợp với tình trạng đơn hàng.'] },
      { title: 'Cách liên hệ', body: ['Gửi mã đơn hàng cùng ảnh hoặc video tình trạng sản phẩm qua số 0909 000 000 hoặc email hello@bubblememories.vn. Thông tin đơn hàng của bạn cũng luôn có tại mục Đơn hàng của tôi.'] },
    ],
  },
  'chinh-sach-van-chuyen': {
    title: 'Chính sách vận chuyển',
    intro: 'Mỗi sản phẩm được làm theo đơn, vì vậy thời gian giao hàng gồm thời gian xưởng hoàn thiện và thời gian vận chuyển.',
    sections: [
      { title: 'Thời gian hoàn thiện', body: ['Tranh canvas và photobook thường cần khoảng 3–5 ngày làm việc để in và hoàn thiện trước khi bàn giao đơn vị vận chuyển.'] },
      { title: 'Thời gian giao', body: ['Đơn nội thành có thể được giao trong ngày sau khi hoàn thiện. Với các tỉnh thành khác, thời gian giao thường thêm 2–4 ngày tùy khu vực.'] },
      { title: 'Theo dõi đơn hàng', body: ['Khi có thông tin vận chuyển, bạn có thể xem trạng thái tại Đơn hàng của tôi. Tranh được đóng gói bảo vệ các góc trước khi gửi đi.'] },
    ],
  },
  'chinh-sach-thanh-toan': {
    title: 'Chính sách thanh toán',
    intro: 'Hiện cửa hàng áp dụng hình thức thanh toán khi nhận hàng cho các đơn được đặt trực tiếp trên website.',
    sections: [
      { title: 'Thanh toán khi nhận hàng', body: ['Sau khi xưởng xác nhận đơn và đơn vị vận chuyển giao tới, bạn thanh toán số tiền hiển thị trong phần tổng kết đơn hàng.'] },
      { title: 'Đơn đặt in theo yêu cầu', body: ['Với đơn theo yêu cầu, xưởng sẽ gửi báo giá trước. Bạn có thể xem, đồng ý hoặc từ chối báo giá ngay tại trang Đặt in theo yêu cầu.'] },
    ],
  },
  'chinh-sach-bao-mat': {
    title: 'Chính sách bảo mật',
    intro: 'Thông tin bạn cung cấp được dùng để xử lý đơn hàng, giao hàng và hỗ trợ sau mua.',
    sections: [
      { title: 'Thông tin đơn hàng', body: ['Tên người nhận, số điện thoại và địa chỉ giao hàng được sử dụng để tạo đơn và bàn giao cho đơn vị vận chuyển.'] },
      { title: 'Ảnh đặt in', body: ['Ảnh bạn tải lên cho yêu cầu đặt in được gắn với tài khoản và yêu cầu của bạn để xưởng có thể kiểm tra, báo giá và thực hiện sản phẩm.'] },
      { title: 'Quản lý địa chỉ', body: ['Bạn có thể xem, thêm, cập nhật hoặc xóa các địa chỉ đã lưu trong mục Tài khoản.'] },
    ],
  },
};

function Breadcrumb({ current }: { current: string }) {
  return (
    <nav aria-label="Breadcrumb" data-breadcrumb="" style={breadcrumbStyle}>
      <Link to="/" style={crumbLink}>Trang chủ</Link><span aria-hidden="true">/</span><span style={{ color: 'var(--color-text)' }}>{current}</span>
    </nav>
  );
}

function PageHeader({ title, intro, eyebrow }: { title: string; intro: string; eyebrow?: string }) {
  return <section style={{ padding: 'var(--space-8) var(--space-8) var(--space-6)', borderBottom: '2px solid var(--color-text)' }}>
    {eyebrow && <p style={{ ...STORE_LABEL_STYLE, margin: '0 0 var(--space-3)' }}>{eyebrow}</p>}
    <h1 style={pageTitle}>{title}</h1>
    <p style={{ margin: 'var(--space-3) 0 0', maxWidth: '64ch', color: 'var(--color-neutral-800)', lineHeight: 1.65 }}>{intro}</p>
  </section>;
}

function ContentRows({ sections }: { sections: { title: string; body: string[] }[] }) {
  return <section style={{ padding: '0 var(--space-8)' }}>
    {sections.map((section) => <article key={section.title} data-split="" style={{ display: 'grid', gridTemplateColumns: 'minmax(180px, .55fr) minmax(0, 1fr)', gap: 'var(--space-6)', padding: 'var(--space-6) 0', borderBottom: '1px solid var(--color-neutral-300)' }}>
      <h2 style={sectionTitle}>{section.title}</h2>
      <div style={{ display: 'grid', gap: 'var(--space-3)', fontSize: 15, lineHeight: 1.65, color: 'var(--color-neutral-800)' }}>
        {section.body.map((paragraph) => <p key={paragraph} style={{ margin: 0 }}>{paragraph}</p>)}
      </div>
    </article>)}
  </section>;
}

function RelatedLinks({ links }: { links: PageLink[] }) {
  return <nav aria-label="Liên kết liên quan" style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)', padding: 'var(--space-6) var(--space-8)' }}>
    {links.map((link) => <Link key={link.to} className="btn btn-secondary" to={link.to}>{link.label}</Link>)}
  </nav>;
}

function StaticLayout({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  const { count } = useCart();
  const location = useLocation();
  useDocumentMeta({ title, description, canonicalUrl: absoluteSiteUrl(location.pathname), type: 'website' });
  return <StoreShell cartCount={count}>{children}</StoreShell>;
}

export function SizesAndPricingPage() {
  return <StaticLayout title="Khổ & giá | Bubble Memories" description="Tìm hiểu khổ tranh, chất liệu, khung và cách xem giá chính xác tại Bubble Memories.">
    <Breadcrumb current="Khổ & giá" />
    <PageHeader eyebrow="Chọn trước khi in" title="Khổ tranh & giá" intro="Mỗi mẫu tranh có các lựa chọn riêng. Giá chính xác luôn hiển thị ngay khi bạn chọn phiên bản, chất liệu và khung trên trang sản phẩm." />
    <ContentRows sections={[
      { title: 'Khổ có sẵn', body: ['Mở một sản phẩm để xem những kích thước đang áp dụng cho mẫu tranh đó. Giá sẽ đổi theo khổ bạn chọn, nên đây là nguồn thông tin chính xác nhất trước khi thêm vào giỏ.'] },
      { title: 'Chất liệu & khung', body: ['Một số phiên bản có thể chọn chất liệu hoặc khung. Phần chênh lệch giá, nếu có, được cập nhật trực tiếp trong lựa chọn của sản phẩm trước khi bạn đặt hàng.'] },
      { title: 'Khổ riêng theo không gian', body: ['Nếu bạn đã có kích thước mong muốn hoặc cần tư vấn treo tranh, gửi yêu cầu cho xưởng. Bạn sẽ nhận báo giá trước rồi mới quyết định thực hiện.'] },
    ]} />
    <RelatedLinks links={[{ label: 'Xem tranh canvas', to: '/danh-muc/tranh-canvas' }, { label: 'Đặt in theo yêu cầu', to: '/dat-in' }]} />
  </StaticLayout>;
}

export function AboutPage() {
  return <StaticLayout title="Về chúng tôi | Bubble Memories" description="Tìm hiểu Bubble Memories, xưởng in tranh canvas và làm photobook theo yêu cầu.">
    <Breadcrumb current="Về chúng tôi" />
    <PageHeader eyebrow="Bubble Memories" title="Làm ảnh để ở lại" intro="Bubble Memories là xưởng in tranh canvas và làm photobook theo yêu cầu — mỗi sản phẩm được làm từng chiếc, cho một câu chuyện cụ thể." />
    <ContentRows sections={[
      { title: 'Xưởng làm gì?', body: ['Chúng tôi chọn lọc tranh để in canvas và nhận ảnh của bạn để làm photobook hoặc đơn đặt riêng. Bạn chọn mẫu có sẵn, hoặc bắt đầu từ ảnh và kích thước của chính mình.'] },
      { title: 'Cách một đơn hàng đi qua xưởng', body: ['Bạn chọn sản phẩm và phiên bản phù hợp, sau đó xưởng hoàn thiện đơn trước khi gửi đi. Với đơn đặt riêng, xưởng xem yêu cầu và báo giá để bạn đồng ý trước khi thực hiện.'] },
      { title: 'Gặp xưởng', body: ['Bubble Memories làm việc tại 128 Trần Hưng Đạo, Quận 5, TP.HCM. Thời gian hỗ trợ: 8:00–18:00, từ thứ Hai đến thứ Bảy.'] },
    ]} />
    <RelatedLinks links={[{ label: 'Liên hệ xưởng', to: '/lien-he' }, { label: 'Đặt in ngay', to: '/dat-in' }]} />
  </StaticLayout>;
}

export function ContactPage() {
  return <StaticLayout title="Liên hệ | Bubble Memories" description="Liên hệ Bubble Memories để được hỗ trợ về đơn hàng, tranh canvas và photobook.">
    <Breadcrumb current="Liên hệ" />
    <PageHeader eyebrow="Cần xưởng hỗ trợ?" title="Liên hệ Bubble Memories" intro="Gửi mã đơn hàng hoặc yêu cầu của bạn để xưởng kiểm tra và phản hồi nhanh hơn." />
    <section data-split="" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', borderBottom: '2px solid var(--color-text)' }}>
      <article style={contactCard}><span style={STORE_LABEL_STYLE}>Điện thoại</span><a href="tel:0909000000" style={contactValue}>0909 000 000</a><p style={contactBody}>Hỗ trợ trong giờ làm việc.</p></article>
      <article style={contactCard}><span style={STORE_LABEL_STYLE}>Email</span><a href="mailto:hello@bubblememories.vn" style={contactValue}>hello@bubblememories.vn</a><p style={contactBody}>Phù hợp khi cần gửi ảnh hoặc thông tin chi tiết.</p></article>
      <article style={{ ...contactCard, borderRight: 0 }}><span style={STORE_LABEL_STYLE}>Xưởng</span><span style={contactValue}>128 Trần Hưng Đạo, Q.5, TP.HCM</span><p style={contactBody}>8:00–18:00 · Thứ Hai–Thứ Bảy.</p></article>
    </section>
    <ContentRows sections={[
      { title: 'Đơn đang giao', body: ['Mở mục Đơn hàng của tôi để xem tiến độ đơn và thông tin cập nhật. Khi cần hỗ trợ, hãy gửi kèm mã đơn hàng.'] },
      { title: 'Đặt in theo yêu cầu', body: ['Bạn có thể gửi ảnh, kích thước và ghi chú trực tiếp tại trang Đặt in theo yêu cầu. Xưởng sẽ phản hồi báo giá tại chính trang đó.'] },
    ]} />
    <RelatedLinks links={[{ label: 'Đơn hàng của tôi', to: '/don-hang-cua-toi' }, { label: 'Đặt in theo yêu cầu', to: '/dat-in' }]} />
  </StaticLayout>;
}

export function PolicyPage() {
  const { pathname } = useLocation();
  const content = POLICY_PAGES[pathname.slice(1)];
  if (!content) return <StaticLayout title="Chính sách | Bubble Memories" description="Các chính sách mua hàng tại Bubble Memories."><Breadcrumb current="Chính sách" /><PageHeader title="Chính sách" intro="Nội dung bạn tìm chưa có trang riêng." /><RelatedLinks links={policyLinks} /></StaticLayout>;
  return <StaticLayout title={`${content.title} | Bubble Memories`} description={content.intro}>
    <Breadcrumb current={content.title} />
    <PageHeader eyebrow="Bubble Memories" title={content.title} intro={content.intro} />
    <ContentRows sections={content.sections} />
    <RelatedLinks links={policyLinks.filter((link) => link.to !== pathname)} />
  </StaticLayout>;
}

const breadcrumbStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 'var(--space-3)', minHeight: 46, padding: '0 var(--space-8)', borderBottom: '2px solid var(--color-divider)', fontSize: 11, letterSpacing: '.16em', textTransform: 'uppercase', color: 'var(--color-neutral-700)' };
const crumbLink: React.CSSProperties = { color: 'var(--color-neutral-700)', textDecoration: 'none' };
const pageTitle: React.CSSProperties = { margin: 0, maxWidth: '18ch', fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: 'clamp(32px, 5vw, 46px)', lineHeight: 1.02, letterSpacing: '-.04em' };
const sectionTitle: React.CSSProperties = { margin: 0, fontFamily: 'var(--font-heading)', fontSize: 21, fontWeight: 800, lineHeight: 1.1, letterSpacing: '-.02em' };
const contactCard: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', minWidth: 0, padding: 'var(--space-6) var(--space-8)', borderRight: '2px solid var(--color-text)' };
const contactValue: React.CSSProperties = { color: 'var(--color-text)', fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: 19, lineHeight: 1.2, overflowWrap: 'anywhere' };
const contactBody: React.CSSProperties = { margin: 0, fontSize: 13, lineHeight: 1.55, color: 'var(--color-neutral-800)' };
const policyLinks: PageLink[] = [
  { label: 'Đổi trả', to: '/chinh-sach-doi-tra' },
  { label: 'Vận chuyển', to: '/chinh-sach-van-chuyen' },
  { label: 'Thanh toán', to: '/chinh-sach-thanh-toan' },
  { label: 'Bảo mật', to: '/chinh-sach-bao-mat' },
];
