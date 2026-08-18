import { useEffect, useMemo, useState } from 'react';
import { SiteHeader } from '../components/SiteHeader';
import { HeroStack } from '../components/HeroStack';
import { CategoryBanner } from '../components/CategoryBanner';
import { BestSellers } from '../components/BestSellers';
import { PhotobookGallery, BookDialog } from '../components/PhotobookGallery';
import { ViewInRoom } from '../components/ViewInRoom';
import { HowItWorks } from '../components/HowItWorks';
import { FaqSection } from '../components/FaqSection';
import { ClosingCta } from '../components/ClosingCta';
import { SiteFooter } from '../components/SiteFooter';
import { useCategories, useProducts } from '../hooks/useCatalog';
import { absoluteSiteUrl, useDocumentMeta } from '../hooks/useDocumentMeta';
import '../styles/ds.css';
import '../styles/public.css';

/**
 * Slug danh mục trong DB. Backend hiện seed 3 slug: tranh-canvas, tranh-son-dau,
 * tranh-truu-tuong — chưa có 'photobook'. Hero/gallery ưu tiên slug photobook nếu
 * backend thêm sau, còn không thì fallback sang một danh mục thật để không rỗng.
 */
const SLUG_PHOTOBOOK = 'photobook';
const SLUG_CANVAS = 'tranh-canvas';
const SLUG_PHOTOBOOK_FALLBACK = 'tranh-son-dau';

export function HomePage() {
  useDocumentMeta({
    title: 'Bubble Memories | Tranh canvas & photobook',
    description: 'Bubble Memories — xưởng in tranh canvas và làm photobook theo yêu cầu.',
    canonicalUrl: absoluteSiteUrl('/'),
    type: 'website',
  });
  const { data: categories } = useCategories();
  const idOf = (slug: string) => categories?.find((c) => c.slug === slug)?.id;

  const photobookId = idOf(SLUG_PHOTOBOOK) ?? idOf(SLUG_PHOTOBOOK_FALLBACK) ?? categories?.[0]?.id;
  const canvasId = idOf(SLUG_CANVAS) ?? categories?.[0]?.id;

  // Chờ có categoryId rồi mới gọi, tránh nạp nhầm toàn bộ catalogue.
  const { data: books } = useProducts(
    useMemo(
      () => (photobookId ? { categoryId: photobookId, sort: 'BEST_SELLING' as const, page: 1, size: 4 } : null),
      [photobookId],
    ),
  );
  const photobooks = photobookId ? (books ?? []) : [];

  const [openSlug, setOpenSlug] = useState<string | null>(null);
  const book = photobooks.find((b) => b.slug === openSlug) ?? null;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenSlug(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  /**
   * Trang chủ render phía client, nên lúc trình duyệt xử lý hash trong URL thì phần tử
   * đích chưa tồn tại và nó bỏ qua luôn — link kiểu /#tranh-canvas từ trang chi tiết sẽ
   * đáp xuống đầu trang. Cuộn lại sau mỗi lần dữ liệu về, vì hero và carousel đổi chiều
   * cao khi có dữ liệu và làm mốc neo trôi đi.
   */
  useEffect(() => {
    const id = window.location.hash.slice(1);
    if (!id) return;
    document.getElementById(id)?.scrollIntoView({ block: 'start' });
  }, [photobooks.length, canvasId]);

  const next = () => {
    const i = photobooks.findIndex((b) => b.slug === openSlug);
    if (photobooks.length) setOpenSlug(photobooks[(i + 1) % photobooks.length].slug);
  };

  return (
    <div style={{ fontFamily: 'var(--font-body)', color: 'var(--color-text)', background: 'var(--color-bg)' }}>
      <SiteHeader />
      <HeroStack books={photobooks} paused={openSlug !== null} onOpen={setOpenSlug} />
      <CategoryBanner />
      <BestSellers categoryId={canvasId} />

      <section id="photobook" style={{ borderTop: '2px solid var(--color-text)', background: 'var(--color-bg)' }}>
        <PhotobookGallery books={photobooks} onOpen={setOpenSlug} />
      </section>

      <ViewInRoom />
      <HowItWorks />
      <FaqSection />
      <ClosingCta />
      <SiteFooter />

      {book && <BookDialog book={book} onClose={() => setOpenSlug(null)} onNext={next} />}
    </div>
  );
}
