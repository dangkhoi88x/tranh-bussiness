import { useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { formatPrice, formatSize, type CatalogSort } from '../api/storefront';
import { useCategories, useProductPage } from '../hooks/useCatalog';
import { useCart } from '../hooks/useCart';
import { SiteHeader } from '../components/SiteHeader';
import { SiteFooter } from '../components/SiteFooter';
import { Frame } from '../components/Frame';
import '../styles/ds.css';
import '../styles/public.css';

const PAGE_SIZE = 12;

const SORTS: { value: CatalogSort; label: string }[] = [
  { value: 'BEST_SELLING', label: 'Bán chạy' },
  { value: 'NEWEST', label: 'Mới nhất' },
  { value: 'PRICE_ASC', label: 'Giá tăng' },
  { value: 'PRICE_DESC', label: 'Giá giảm' },
  { value: 'TRENDING', label: 'Xu hướng' },
];

const label: React.CSSProperties = {
  fontSize: 11, letterSpacing: '.16em', textTransform: 'uppercase', color: 'var(--color-neutral-700)',
};

export function CategoryPage() {
  const { slug } = useParams<{ slug: string }>();
  const { count } = useCart();
  const { data: categories } = useCategories();

  const category = categories?.find((c) => c.slug === slug) ?? null;
  const categoryId = category?.id;

  const [searchParams, setSearchParams] = useSearchParams();
  const page = Math.max(1, Number(searchParams.get('page')) || 1);
  const sort = (searchParams.get('sort') as CatalogSort) || 'BEST_SELLING';

  const query = useMemo(
    () => (categoryId ? { categoryId, sort, page, size: PAGE_SIZE } : null),
    [categoryId, sort, page],
  );
  const { data: pageData, loading, error } = useProductPage(query);
  const items = pageData?.items ?? [];

  function setSort(s: CatalogSort) {
    setSearchParams((p) => { p.set('sort', s); p.delete('page'); return p; }, { replace: true });
  }

  function setPage(n: number) {
    setSearchParams((p) => { if (n <= 1) p.delete('page'); else p.set('page', String(n)); return p; }, { replace: true });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  useEffect(() => {
    const original = document.title;
    document.title = category
      ? `${category.name} | Bubble Memories`
      : 'Danh mục | Bubble Memories';
    return () => { document.title = original; };
  }, [category]);

  const notFound = categories && !category;

  return (
    <Shell cartCount={count}>
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" data-breadcrumb="" style={{
        display: 'flex', alignItems: 'center', gap: 'var(--space-3)', height: 46,
        padding: '0 var(--space-8)', borderBottom: '2px solid var(--color-divider)',
        fontSize: 11, letterSpacing: '.16em', textTransform: 'uppercase', color: 'var(--color-neutral-700)',
      }}>
        <Link to="/" style={{ color: 'var(--color-neutral-700)', textDecoration: 'none' }}>Trang chủ</Link>
        <span aria-hidden="true">/</span>
        <span style={{ color: 'var(--color-text)' }}>{category?.name ?? 'Danh mục'}</span>
      </nav>

      {notFound ? (
        <section style={{
          display: 'grid', placeItems: 'center', gap: 'var(--space-4)', minHeight: '36vh',
          padding: 'var(--space-8)', textAlign: 'center', borderTop: '2px solid var(--color-text)',
        }}>
          <h2 style={{ margin: 0, fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: 26, letterSpacing: '-.025em' }}>
            Không tìm thấy danh mục
          </h2>
          <p style={{ margin: 0, fontSize: 15, lineHeight: 1.6, color: 'var(--color-neutral-800)' }}>
            Danh mục "{slug}" không tồn tại hoặc đã bị xoá.
          </p>
          <Link to="/" className="btn btn-primary">Về trang chủ</Link>
        </section>
      ) : (
        <>
          {/* Header + sort bar */}
          <section style={{
            display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
            flexWrap: 'wrap', gap: 'var(--space-4)',
            padding: 'var(--space-8) var(--space-8) var(--space-6)',
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
              <h1 style={{
                margin: 0, fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: 34,
                lineHeight: 1.02, letterSpacing: '-.03em',
              }}>{category?.name ?? 'Đang tải…'}</h1>
              {category?.description && (
                <p style={{ margin: 0, fontSize: 14, color: 'var(--color-neutral-700)', maxWidth: '56ch' }}>
                  {category.description}
                </p>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
              {SORTS.map((s) => (
                <button key={s.value} type="button" onClick={() => setSort(s.value)} style={{
                  appearance: 'none', font: 'inherit', fontSize: 12, fontWeight: 600, letterSpacing: '.08em',
                  textTransform: 'uppercase', padding: '0 var(--space-4)', height: 36, cursor: 'pointer',
                  border: '2px solid var(--color-text)',
                  background: sort === s.value ? 'var(--color-text)' : 'var(--color-bg)',
                  color: sort === s.value ? 'var(--color-bg)' : 'var(--color-text)',
                  transition: 'background .2s, color .2s',
                }}>{s.label}</button>
              ))}
            </div>
          </section>

          {/* Product grid */}
          {loading && items.length === 0 ? (
            <div style={{
              display: 'grid', placeItems: 'center', minHeight: '30vh',
              fontSize: 13, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--color-neutral-700)',
              borderTop: '2px solid var(--color-text)',
            }}>Đang tải sản phẩm…</div>
          ) : error ? (
            <div style={{
              display: 'grid', placeItems: 'center', minHeight: '30vh',
              fontSize: 13, color: 'var(--color-accent-700)', borderTop: '2px solid var(--color-text)',
            }}>Không tải được sản phẩm: {error}</div>
          ) : items.length === 0 ? (
            <div style={{
              display: 'grid', placeItems: 'center', minHeight: '30vh',
              fontSize: 13, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--color-neutral-700)',
              borderTop: '2px solid var(--color-text)',
            }}>Chưa có sản phẩm trong danh mục này</div>
          ) : (
            <>
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '0 var(--space-8) var(--space-4)',
              }}>
                <span style={label}>
                  {pageData ? `${pageData.totalElements} sản phẩm` : ''}
                </span>
                {pageData && pageData.totalPages > 1 && (
                  <span style={label}>
                    Trang {pageData.page} / {pageData.totalPages}
                  </span>
                )}
              </div>

              <div data-grid="cols" style={{
                display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
                borderTop: '2px solid var(--color-text)',
                opacity: loading ? 0.55 : 1, transition: 'opacity .2s',
              }}>
                {items.map((item, k) => (
                  <Link key={item.id} to={`/tranh/${item.slug}`} style={{
                    display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', minWidth: 0,
                    padding: 'var(--space-6)', color: 'var(--color-text)', textDecoration: 'none',
                    borderRight: (k + 1) % 4 !== 0 ? '2px solid var(--color-divider)' : undefined,
                    borderBottom: '2px solid var(--color-divider)',
                  }}>
                    <div style={{
                      position: 'relative', width: '100%', aspectRatio: '4/5',
                      border: '2px solid var(--color-text)', overflow: 'hidden',
                    }}>
                      <Frame src={item.primaryImageUrl ?? undefined} label={item.name} tone="color" />
                    </div>
                    <div style={{
                      display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto',
                      alignItems: 'baseline', gap: 'var(--space-4)',
                    }}>
                      <h3 style={{
                        margin: 0, fontFamily: 'var(--font-heading)', fontWeight: 800,
                        fontSize: 17, lineHeight: 1.15, letterSpacing: '-.015em',
                      }}>{item.name}</h3>
                      <span style={{ fontSize: 14, fontWeight: 600 }}>{formatPrice(item.price)}</span>
                    </div>
                    <span style={{
                      fontSize: 11, letterSpacing: '.14em', textTransform: 'uppercase',
                      color: 'var(--color-neutral-700)',
                    }}>
                      {formatSize(item.widthCm, item.heightCm) ?? item.categoryName}
                    </span>
                  </Link>
                ))}
              </div>

              {/* Pagination */}
              {pageData && pageData.totalPages > 1 && (
                <nav aria-label="Phân trang" style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  gap: 'var(--space-2)', padding: 'var(--space-8)',
                }}>
                  <button type="button" className="btn btn-secondary" disabled={page <= 1}
                    onClick={() => setPage(page - 1)}
                    style={{ cursor: page <= 1 ? 'not-allowed' : 'pointer' }}>←</button>
                  {Array.from({ length: pageData.totalPages }, (_, i) => i + 1).map((n) => (
                    <button key={n} type="button" onClick={() => setPage(n)} style={{
                      appearance: 'none', font: 'inherit', fontSize: 14, fontWeight: 600,
                      width: 40, height: 40, cursor: 'pointer',
                      border: '2px solid var(--color-text)',
                      background: n === page ? 'var(--color-text)' : 'var(--color-bg)',
                      color: n === page ? 'var(--color-bg)' : 'var(--color-text)',
                      transition: 'background .2s, color .2s',
                    }}>{n}</button>
                  ))}
                  <button type="button" className="btn btn-secondary" disabled={!pageData.hasNext}
                    onClick={() => setPage(page + 1)}
                    style={{ cursor: !pageData.hasNext ? 'not-allowed' : 'pointer' }}>→</button>
                </nav>
              )}
            </>
          )}
        </>
      )}

      <SiteFooter />
    </Shell>
  );
}

function Shell({ cartCount, children }: { cartCount: number; children: React.ReactNode }) {
  return (
    <div style={{ background: 'var(--color-neutral-200)' }}>
      <div style={{
        fontFamily: 'var(--font-body)', color: 'var(--color-text)', background: 'var(--color-bg)',
        minHeight: '100vh', width: '100%', maxWidth: 1180, margin: '0 auto',
        borderLeft: '2px solid var(--color-divider)', borderRight: '2px solid var(--color-divider)',
      }}>
        <SiteHeader cartCount={cartCount} />
        {children}
      </div>
    </div>
  );
}
