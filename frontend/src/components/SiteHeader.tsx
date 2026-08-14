import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useNotificationsBadge } from '../contexts/NotificationContext';

const NAV = [
  { label: 'Tranh canvas', href: '/danh-muc/tranh-canvas', caret: true, secondary: false },
  { label: 'Photobook', href: '/photobook', caret: true, secondary: false },
  { label: 'Khổ & giá', href: '/kho-va-gia', caret: false, secondary: false },
  { label: 'Về chúng tôi', href: '/gioi-thieu', caret: false, secondary: true },
  { label: 'Hướng dẫn đặt in', href: '/#cach-dat-in', caret: false, secondary: true },
];

const Caret = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="square"><path d="m6 9 6 6 6-6" /></svg>
);

/**
 * Header cao 64px, sticky. Thu gọn theo bậc (xem styles/public.css):
 * ≤1180px ẩn 2 mục phụ + icon tìm kiếm; ≤880px cả nav gộp vào nút menu.
 * ≤560px ẩn CTA đặt in để logo, menu và giỏ hàng không tràn viewport.
 */
export function SiteHeader({ cartCount = 0, onMenu }: { cartCount?: number; onMenu?: () => void }) {
  const navigate = useNavigate();
  const location = useLocation();
  const inputRef = useRef<HTMLInputElement>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const [keyword, setKeyword] = useState('');
  const { unreadCount } = useNotificationsBadge();

  // Từ ≤880px CSS giấu [data-nav] và chỉ chừa nút menu, nên nếu nút không mở được gì thì
  // trên điện thoại header mất sạch đường dẫn. Header tự giữ trạng thái đóng/mở: cả hai nơi
  // dựng nó (StoreShell, HomePage) đều không truyền onMenu, và prop giữ lại làm chỗ override.
  const toggleNav = onMenu ?? (() => setNavOpen((open) => !open));

  useEffect(() => { setNavOpen(false); }, [location.pathname]);

  useEffect(() => {
    if (!navOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') setNavOpen(false); };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [navOpen]);

  useEffect(() => {
    if (!searchOpen) return;
    inputRef.current?.focus();
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') setSearchOpen(false); };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [searchOpen]);

  function submitSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = keyword.trim();
    if (!value) { inputRef.current?.focus(); return; }
    navigate(`/tim-kiem?q=${encodeURIComponent(value)}`);
    setSearchOpen(false);
  }

  return (
    <header data-site-header="" style={{
      position: 'sticky', top: 0, zIndex: 60, display: 'flex', alignItems: 'center',
      gap: 'var(--space-4)', height: 64, padding: '0 var(--space-8)',
      background: 'var(--color-bg)', borderBottom: '2px solid var(--color-text)',
    }}>
      <a href="/" style={{
        display: 'flex', alignItems: 'baseline', gap: 2, flex: 'none', fontFamily: 'var(--font-heading)',
        fontWeight: 800, fontSize: 22, letterSpacing: '-.02em', color: 'var(--color-text)',
        textDecoration: 'none', whiteSpace: 'nowrap',
      }}>
        bubble memories<span style={{ color: 'var(--color-accent)' }}>.</span>
      </a>

      <nav data-nav="" style={{
        display: 'flex', alignItems: 'center', flexWrap: 'nowrap', flex: 'none',
        gap: 'clamp(var(--space-4), 2.2vw, var(--space-8))', marginLeft: 'clamp(var(--space-4), 2.2vw, var(--space-8))',
        fontSize: 14, fontWeight: 500, whiteSpace: 'nowrap',
      }}>
        {NAV.map((n) => (
          <a key={n.label} href={n.href} {...(n.secondary ? { 'data-nav-secondary': '' } : {})}
            style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--color-text)', textDecoration: 'none' }}>
            {n.label}{n.caret && <Caret />}
          </a>
        ))}
      </nav>

      <button type="button" data-nav-menu="" aria-label="Menu" aria-expanded={navOpen}
        aria-controls="header-nav-drawer" onClick={toggleNav} style={{
        display: 'none', placeItems: 'center', appearance: 'none', width: 44, height: 44, marginLeft: 'auto',
        border: '2px solid var(--color-text)', background: 'var(--color-bg)', color: 'var(--color-text)', cursor: 'pointer',
      }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="square"><path d="M4 7h16" /><path d="M4 12h16" /><path d="M4 17h16" /></svg>
      </button>

      <div data-header-actions="" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', marginLeft: 'auto', flex: 'none' }}>
        <button type="button" aria-label="Mở tìm kiếm" aria-expanded={searchOpen} aria-controls="header-search" data-search="" style={iconBtn} onClick={() => setSearchOpen((open) => !open)}>
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
        </button>
        <a href="/gio-hang" aria-label="Giỏ hàng" style={{ ...iconBtn, position: 'relative', textDecoration: 'none' }}>
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square"><path d="M4 7h16l-1.4 12H5.4L4 7Z" /><path d="M9 7V5a3 3 0 0 1 6 0v2" /></svg>
          {cartCount > 0 && (
            <span style={{
              position: 'absolute', top: 3, right: 2, minWidth: 15, height: 15, padding: '0 3px',
              display: 'grid', placeItems: 'center', background: 'var(--color-accent)',
              color: 'var(--color-bg)', fontSize: 10, fontWeight: 800, lineHeight: 1,
            }}>{cartCount}</span>
          )}
        </a>
        <a href="/account" data-account-link="" aria-label="Tài khoản" style={{ ...iconBtn, textDecoration: 'none' }}>
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square"><circle cx="12" cy="8" r="3.5" /><path d="M4.5 20c.8-4 3.3-6 7.5-6s6.7 2 7.5 6" /></svg>
        </a>
        <a href="/thong-bao" data-notifications-link="" aria-label={unreadCount ? `Thông báo, ${unreadCount} chưa đọc` : 'Thông báo'} style={{ ...iconBtn, position: 'relative', textDecoration: 'none' }}>
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square"><path d="M18 10a6 6 0 0 0-12 0c0 7-2.5 7-2.5 9h17c0-2-2.5-2-2.5-9" /><path d="M10 22h4" /></svg>
          {unreadCount > 0 && <span aria-hidden="true" style={{ position: 'absolute', top: 4, right: 1, minWidth: 15, height: 15, padding: '0 3px', display: 'grid', placeItems: 'center', background: 'var(--color-accent)', color: 'var(--color-bg)', fontSize: 9, fontWeight: 800, lineHeight: 1 }}>{unreadCount > 99 ? '99+' : unreadCount}</span>}
        </a>
        <a href="/dat-in" data-print-cta="" style={{
          display: 'flex', alignItems: 'center', gap: 'var(--space-4)', height: 44, padding: '0 var(--space-4)',
          background: 'var(--color-accent)', color: 'var(--color-bg)', fontSize: 13, fontWeight: 600,
          letterSpacing: '.08em', textTransform: 'uppercase', textDecoration: 'none', whiteSpace: 'nowrap',
        }}>
          <span>Đặt in ngay</span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="square"><path d="M4 12h15" /><path d="m13 6 6 6-6 6" /></svg>
        </a>
      </div>
      {searchOpen && <form id="header-search" role="search" onSubmit={submitSearch} style={{ position: 'absolute', top: 'calc(100% + 2px)', left: 0, right: 0, display: 'flex', alignItems: 'center', gap: 'var(--space-2)', padding: 'var(--space-3) var(--space-8)', borderBottom: '2px solid var(--color-text)', background: 'var(--color-bg)', boxShadow: 'var(--shadow-md)' }}>
        <label htmlFor="header-search-input" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>Tìm tranh</label>
        <input id="header-search-input" ref={inputRef} className="input" value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="Tìm theo tên tranh, chủ đề, chất liệu…" maxLength={200} style={{ flex: 1, minWidth: 0 }} />
        <button type="submit" className="btn btn-primary">Tìm</button>
        <button type="button" className="btn btn-secondary" aria-label="Đóng tìm kiếm" onClick={() => setSearchOpen(false)}>Đóng</button>
      </form>}
      {navOpen && (
        // Gồm cả mục secondary (CSS giấu từ ≤1180px) và CTA đặt in (giấu từ ≤560px): ở khổ máy
        // mở được drawer này thì đó là chỗ duy nhất còn thấy chúng.
        <nav id="header-nav-drawer" aria-label="Điều hướng" style={{
          position: 'absolute', top: 'calc(100% + 2px)', left: 0, right: 0,
          display: 'flex', flexDirection: 'column',
          padding: 'var(--space-3) var(--space-8) var(--space-4)',
          borderBottom: '2px solid var(--color-text)', background: 'var(--color-bg)',
          boxShadow: 'var(--shadow-md)',
        }}>
          {NAV.map((n) => (
            <a key={n.label} href={n.href} onClick={() => setNavOpen(false)} style={{
              display: 'flex', alignItems: 'center', height: 44, color: 'var(--color-text)',
              fontSize: 15, fontWeight: 500, textDecoration: 'none',
              borderBottom: '1px solid var(--color-neutral-200)',
            }}>{n.label}</a>
          ))}
          <a href="/dat-in" onClick={() => setNavOpen(false)} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', height: 44,
            marginTop: 'var(--space-3)', background: 'var(--color-accent)', color: 'var(--color-bg)',
            fontSize: 13, fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase',
            textDecoration: 'none',
          }}>Đặt in ngay</a>
        </nav>
      )}
    </header>
  );
}

const iconBtn: React.CSSProperties = {
  appearance: 'none', display: 'grid', placeItems: 'center', width: 38, height: 38,
  border: 0, background: 'transparent', color: 'var(--color-text)', cursor: 'pointer',
};
