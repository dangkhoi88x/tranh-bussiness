import { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { StoreShell } from '../components/StoreShell';
import { useCart } from '../hooks/useCart';
import '../styles/ds.css';
import '../styles/public.css';

export function NotFoundPage() {
  const { count } = useCart();
  const location = useLocation();
  const requestedPath = `${location.pathname}${location.search}${location.hash}`;

  useEffect(() => {
    const original = document.title;
    const existingRobots = document.querySelector<HTMLMetaElement>('meta[name="robots"]');
    const createdRobots = !existingRobots;
    const robots = existingRobots ?? document.head.appendChild(document.createElement('meta'));
    const originalRobotsContent = robots.content;
    document.title = 'Không tìm thấy trang | Bubble Memories';
    robots.name = 'robots';
    robots.content = 'noindex, nofollow';
    return () => {
      document.title = original;
      if (createdRobots) robots.remove();
      else robots.content = originalRobotsContent;
    };
  }, []);

  return (
    <StoreShell cartCount={count}>
      <main
        style={{
          minHeight: 'calc(100vh - 64px)',
          display: 'grid',
          placeItems: 'center',
          padding: 'var(--space-8)',
          borderBottom: '2px solid var(--color-text)',
        }}
      >
        <section aria-labelledby="not-found-title" style={{ width: 'min(100%, 640px)', padding: 'var(--space-8) 0' }}>
          <p
            style={{
              margin: 0,
              fontSize: 12,
              fontWeight: 800,
              letterSpacing: '.16em',
              textTransform: 'uppercase',
              color: 'var(--color-accent-700)',
            }}
          >
            Lỗi 404
          </p>
          <h1
            id="not-found-title"
            style={{
              margin: 'var(--space-3) 0 0',
              maxWidth: '12ch',
              fontFamily: 'var(--font-heading)',
              fontSize: 'clamp(38px, 7vw, 64px)',
              fontWeight: 800,
              lineHeight: 0.98,
              letterSpacing: '-.04em',
            }}
          >
            Không tìm thấy trang này.
          </h1>
          <p
            style={{
              margin: 'var(--space-5) 0 0',
              maxWidth: '48ch',
              fontSize: 16,
              lineHeight: 1.65,
              color: 'var(--color-neutral-800)',
            }}
          >
            Đường dẫn có thể đã thay đổi, bị gõ sai hoặc không còn tồn tại. Bạn có thể trở lại trang chủ hoặc xem các
            mẫu tranh đang có.
          </p>
          <p
            style={{
              margin: 'var(--space-4) 0 0',
              padding: 'var(--space-3) 0',
              borderTop: '1px solid var(--color-neutral-300)',
              borderBottom: '1px solid var(--color-neutral-300)',
              fontSize: 13,
              color: 'var(--color-neutral-700)',
              overflowWrap: 'anywhere',
            }}
          >
            <span
              style={{
                display: 'block',
                marginBottom: 4,
                fontSize: 11,
                letterSpacing: '.14em',
                textTransform: 'uppercase',
              }}
            >
              Đường dẫn đã yêu cầu
            </span>
            {requestedPath}
          </p>
          <nav
            aria-label="Điều hướng sau lỗi 404"
            style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)', marginTop: 'var(--space-6)' }}
          >
            <Link className="btn btn-primary" to="/">
              Về trang chủ
            </Link>
            <Link className="btn btn-secondary" to="/danh-muc/tranh-canvas">
              Xem tranh canvas
            </Link>
            <Link className="btn btn-ghost" to="/tim-kiem">
              Tìm tranh
            </Link>
          </nav>
        </section>
      </main>
    </StoreShell>
  );
}
