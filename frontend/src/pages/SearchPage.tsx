import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { formatPrice, formatSize } from '../api/storefront';
import { useProductPage } from '../hooks/useCatalog';
import { useCart } from '../hooks/useCart';
import { absoluteSiteUrl, useDocumentMeta } from '../hooks/useDocumentMeta';
import { Frame } from '../components/Frame';
import { StoreNotice, StoreShell } from '../components/StoreShell';
import '../styles/ds.css';
import '../styles/public.css';

const PAGE_SIZE = 12;

function Breadcrumb() {
  return (
    <nav
      aria-label="Breadcrumb"
      data-breadcrumb=""
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-3)',
        minHeight: 46,
        padding: '0 var(--space-8)',
        borderBottom: '2px solid var(--color-divider)',
        fontSize: 11,
        letterSpacing: '.16em',
        textTransform: 'uppercase',
        color: 'var(--color-neutral-700)',
      }}
    >
      <Link to="/" style={{ color: 'var(--color-neutral-700)', textDecoration: 'none' }}>
        Trang chủ
      </Link>
      <span aria-hidden="true">/</span>
      <span style={{ color: 'var(--color-text)' }}>Tìm kiếm</span>
    </nav>
  );
}

export function SearchPage() {
  const { count } = useCart();
  const [params, setParams] = useSearchParams();
  const keyword = (params.get('q') ?? '').trim();
  const [draft, setDraft] = useState(keyword);
  const page = Math.max(1, Number(params.get('page')) || 1);
  const query = useMemo(() => (keyword ? { keyword, page, size: PAGE_SIZE } : null), [keyword, page]);
  const { data, loading, error } = useProductPage(query);
  const items = data?.items ?? [];

  useEffect(() => {
    setDraft(keyword);
  }, [keyword]);
  useDocumentMeta({
    title: keyword ? `Tìm “${keyword}” | Bubble Memories` : 'Tìm kiếm | Bubble Memories',
    description: keyword
      ? `Kết quả tìm kiếm tranh cho “${keyword}” tại Bubble Memories.`
      : 'Tìm tranh theo tên, chủ đề hoặc chất liệu tại Bubble Memories.',
    canonicalUrl: absoluteSiteUrl('/tim-kiem'),
    robots: 'noindex, follow',
  });

  function search(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const next = draft.trim();
    setParams(next ? { q: next } : {}, { replace: true });
  }

  function setPage(next: number) {
    setParams(
      (current) => {
        current.set('q', keyword);
        if (next <= 1) current.delete('page');
        else current.set('page', String(next));
        return current;
      },
      { replace: true },
    );
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  return (
    <StoreShell cartCount={count}>
      <Breadcrumb />
      <section
        style={{ padding: 'var(--space-8) var(--space-8) var(--space-6)', borderBottom: '2px solid var(--color-text)' }}
      >
        <h1
          style={{
            margin: 0,
            fontFamily: 'var(--font-heading)',
            fontWeight: 800,
            fontSize: 'clamp(30px, 5vw, 40px)',
            lineHeight: 1.02,
            letterSpacing: '-.035em',
          }}
        >
          Tìm tranh
        </h1>
        <form
          role="search"
          onSubmit={search}
          style={{ display: 'flex', gap: 'var(--space-2)', maxWidth: 680, marginTop: 'var(--space-5)' }}
        >
          <label
            htmlFor="catalog-search"
            style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}
          >
            Từ khoá tìm tranh
          </label>
          <input
            id="catalog-search"
            className="input"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Tên tranh, chất liệu, chủ đề…"
            maxLength={200}
            style={{ flex: 1, minWidth: 0 }}
          />
          <button type="submit" className="btn btn-primary">
            Tìm
          </button>
        </form>
        {keyword && (
          <p style={{ margin: 'var(--space-4) 0 0', fontSize: 14, color: 'var(--color-neutral-800)' }}>
            Kết quả cho “<strong>{keyword}</strong>”
          </p>
        )}
      </section>
      {!keyword ? (
        <StoreNotice
          title="Bạn đang muốn tìm gì?"
          body="Nhập tên tranh, chủ đề hoặc chất liệu để xem các sản phẩm phù hợp."
        />
      ) : loading && items.length === 0 ? (
        <StoreNotice title="Đang tìm tranh…" body="" />
      ) : error ? (
        <StoreNotice title="Không tải được kết quả" body={`${error} Hãy thử đổi từ khoá hoặc quay lại sau.`} />
      ) : items.length === 0 ? (
        <StoreNotice
          title="Chưa tìm thấy sản phẩm"
          body={`Không có sản phẩm phù hợp với “${keyword}”. Thử một từ khoá ngắn hơn hoặc xem toàn bộ catalogue.`}
          action={
            <Link className="btn btn-primary" to="/danh-muc/tranh-canvas">
              Xem tranh canvas
            </Link>
          }
        />
      ) : (
        <>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              gap: 'var(--space-4)',
              padding: 'var(--space-4) var(--space-8)',
            }}
          >
            <span style={label}>{data?.totalElements} sản phẩm</span>
            {data && data.totalPages > 1 && (
              <span style={label}>
                Trang {data.page} / {data.totalPages}
              </span>
            )}
          </div>
          <div
            data-grid="cols"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
              borderTop: '2px solid var(--color-text)',
              opacity: loading ? 0.55 : 1,
              transition: 'opacity .2s',
            }}
          >
            {items.map((item, index) => (
              <Link
                key={item.id}
                to={`/tranh/${item.slug}`}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 'var(--space-2)',
                  minWidth: 0,
                  padding: 'var(--space-6)',
                  color: 'var(--color-text)',
                  textDecoration: 'none',
                  borderRight: (index + 1) % 4 !== 0 ? '2px solid var(--color-divider)' : undefined,
                  borderBottom: '2px solid var(--color-divider)',
                }}
              >
                <div
                  style={{
                    position: 'relative',
                    width: '100%',
                    aspectRatio: '4/5',
                    border: '2px solid var(--color-text)',
                    overflow: 'hidden',
                  }}
                >
                  <Frame src={item.primaryImageUrl ?? undefined} label={item.name} tone="color" />
                </div>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'minmax(0, 1fr) auto',
                    alignItems: 'baseline',
                    gap: 'var(--space-4)',
                  }}
                >
                  <h2
                    style={{
                      margin: 0,
                      fontFamily: 'var(--font-heading)',
                      fontWeight: 800,
                      fontSize: 17,
                      lineHeight: 1.15,
                      letterSpacing: '-.015em',
                    }}
                  >
                    {item.name}
                  </h2>
                  <span style={{ fontSize: 14, fontWeight: 600 }}>{formatPrice(item.price)}</span>
                </div>
                <span style={label}>{formatSize(item.widthCm, item.heightCm) ?? item.categoryName}</span>
              </Link>
            ))}
          </div>
          {data && data.totalPages > 1 && (
            <nav
              aria-label="Phân trang kết quả tìm kiếm"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 'var(--space-2)',
                padding: 'var(--space-8)',
              }}
            >
              <button
                type="button"
                className="btn btn-secondary"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
              >
                ←
              </button>
              {Array.from({ length: data.totalPages }, (_, index) => index + 1).map((number) => (
                <button
                  key={number}
                  type="button"
                  onClick={() => setPage(number)}
                  style={{
                    appearance: 'none',
                    width: 40,
                    height: 40,
                    border: '2px solid var(--color-text)',
                    background: number === page ? 'var(--color-text)' : 'var(--color-bg)',
                    color: number === page ? 'var(--color-bg)' : 'var(--color-text)',
                    cursor: 'pointer',
                    font: 'inherit',
                    fontWeight: 600,
                  }}
                >
                  {number}
                </button>
              ))}
              <button
                type="button"
                className="btn btn-secondary"
                disabled={!data.hasNext}
                onClick={() => setPage(page + 1)}
              >
                →
              </button>
            </nav>
          )}
        </>
      )}
    </StoreShell>
  );
}

const label: React.CSSProperties = {
  fontSize: 11,
  letterSpacing: '.16em',
  textTransform: 'uppercase',
  color: 'var(--color-neutral-700)',
};
