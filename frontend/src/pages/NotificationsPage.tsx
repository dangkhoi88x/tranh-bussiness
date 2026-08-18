import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ApiRequestError } from '../api/http';
import {
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type Notification,
} from '../api/notifications';
import type { Page } from '../types/api';
import { useAuth } from '../contexts/AuthContext';
import { useNotificationsBadge } from '../contexts/NotificationContext';
import { useCart } from '../hooks/useCart';
import { STORE_LABEL_STYLE, StoreNotice, StoreShell } from '../components/StoreShell';
import '../styles/ds.css';
import '../styles/public.css';

const dateTime = new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium', timeStyle: 'short' });
const PAGE_SIZE = 20;

export function NotificationsPage() {
  const { session } = useAuth();
  const { count } = useCart();
  const { reloadUnreadCount } = useNotificationsBadge();
  const location = useLocation();
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Page<Notification> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [markingAll, setMarkingAll] = useState(false);
  const load = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    setError(null);
    try {
      setData(await fetchNotifications(page, PAGE_SIZE));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Không tải được thông báo.');
    } finally {
      setLoading(false);
    }
  }, [page, session]);
  useEffect(() => {
    void load();
  }, [load]);
  useEffect(() => {
    const original = document.title;
    document.title = 'Thông báo | Bubble Memories';
    return () => {
      document.title = original;
    };
  }, []);
  async function openNotification(notification: Notification) {
    setBusyId(notification.id);
    setError(null);
    try {
      if (!notification.read) {
        const updated = await markNotificationRead(notification.id);
        setData((current) =>
          current
            ? { ...current, items: current.items.map((item) => (item.id === updated.id ? updated : item)) }
            : current,
        );
        await reloadUnreadCount();
      }
      if (notification.actionUrl) navigate(notification.actionUrl);
    } catch (cause) {
      setError(cause instanceof ApiRequestError ? cause.message : 'Không cập nhật được thông báo.');
    } finally {
      setBusyId(null);
    }
  }
  async function readAll() {
    setMarkingAll(true);
    setError(null);
    try {
      await markAllNotificationsRead();
      setData((current) =>
        current
          ? {
              ...current,
              items: current.items.map((item) => ({
                ...item,
                read: true,
                readAt: item.readAt ?? new Date().toISOString(),
              })),
            }
          : current,
      );
      await reloadUnreadCount();
    } catch (cause) {
      setError(cause instanceof ApiRequestError ? cause.message : 'Không thể đánh dấu tất cả đã đọc.');
    } finally {
      setMarkingAll(false);
    }
  }
  if (!session)
    return (
      <StoreShell cartCount={count}>
        <Breadcrumb />
        <StoreNotice
          title="Đăng nhập để xem thông báo"
          body="Cập nhật về đơn hàng và phản hồi của xưởng được lưu riêng theo tài khoản."
          action={
            <Link to="/auth" state={{ from: location }} className="btn btn-primary">
              Đăng nhập
            </Link>
          }
        />
      </StoreShell>
    );
  const hasUnread = data?.items.some((item) => !item.read) ?? false;
  return (
    <StoreShell cartCount={count}>
      <Breadcrumb />
      <section
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          gap: 'var(--space-4)',
          padding: 'var(--space-8) var(--space-8) var(--space-6)',
          borderBottom: '2px solid var(--color-text)',
        }}
      >
        <div>
          <h1 style={title}>Thông báo</h1>
          <p style={{ margin: 'var(--space-2) 0 0', fontSize: 14, color: 'var(--color-neutral-800)' }}>
            Cập nhật từ xưởng về tài khoản và đơn hàng của bạn.
          </p>
        </div>
        {hasUnread && (
          <button type="button" className="btn btn-secondary" disabled={markingAll} onClick={() => void readAll()}>
            {markingAll ? 'Đang cập nhật…' : 'Đánh dấu đã đọc'}
          </button>
        )}
      </section>
      {loading && !data ? (
        <StoreNotice title="Đang tải thông báo…" body="" />
      ) : error && !data ? (
        <StoreNotice
          title="Không tải được thông báo"
          body={error}
          action={
            <button type="button" className="btn btn-primary" onClick={() => void load()}>
              Thử lại
            </button>
          }
        />
      ) : data?.items.length === 0 ? (
        <StoreNotice
          title="Chưa có thông báo"
          body="Khi xưởng cập nhật đơn hàng, thông báo sẽ xuất hiện tại đây."
          action={
            <Link className="btn btn-primary" to="/don-hang-cua-toi">
              Xem đơn hàng
            </Link>
          }
        />
      ) : (
        <>
          <div style={{ borderTop: '2px solid var(--color-text)' }}>
            {data?.items.map((notification) => (
              <article
                key={notification.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '12px minmax(0, 1fr) auto',
                  gap: 'var(--space-3)',
                  padding: 'var(--space-5) var(--space-8)',
                  borderBottom: '1px solid var(--color-neutral-300)',
                  background: notification.read ? undefined : 'var(--color-neutral-100)',
                }}
              >
                <span
                  aria-hidden="true"
                  style={{
                    width: 9,
                    height: 9,
                    marginTop: 6,
                    borderRadius: '50%',
                    background: notification.read ? 'var(--color-neutral-400)' : 'var(--color-accent)',
                  }}
                />
                <div style={{ minWidth: 0 }}>
                  <strong style={{ display: 'block', overflowWrap: 'anywhere' }}>{notification.title}</strong>
                  <p style={{ margin: '4px 0 0', fontSize: 14, lineHeight: 1.55, overflowWrap: 'anywhere' }}>
                    {notification.message}
                  </p>
                  <small style={{ display: 'block', marginTop: 'var(--space-2)', color: 'var(--color-neutral-700)' }}>
                    {dateTime.format(new Date(notification.createdAt))}
                  </small>
                </div>
                {notification.actionUrl || !notification.read ? (
                  <button
                    type="button"
                    className="btn btn-ghost"
                    disabled={busyId === notification.id}
                    onClick={() => void openNotification(notification)}
                  >
                    {busyId === notification.id ? 'Đang mở…' : notification.actionUrl ? 'Xem →' : 'Đã đọc'}
                  </button>
                ) : (
                  <span style={STORE_LABEL_STYLE}>Đã đọc</span>
                )}
              </article>
            ))}
          </div>
          {error && (
            <p
              role="status"
              style={{ margin: 'var(--space-4) var(--space-8)', fontSize: 13, color: 'var(--color-accent-700)' }}
            >
              {error}
            </p>
          )}
          {data && data.totalPages > 1 && (
            <nav
              aria-label="Phân trang thông báo"
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                gap: 'var(--space-4)',
                padding: 'var(--space-6) var(--space-8)',
              }}
            >
              <button
                type="button"
                className="btn btn-secondary"
                disabled={page <= 1}
                onClick={() => setPage((current) => current - 1)}
              >
                ← Trang trước
              </button>
              <span style={{ alignSelf: 'center', fontSize: 13 }}>
                Trang {data.page} / {data.totalPages}
              </span>
              <button
                type="button"
                className="btn btn-secondary"
                disabled={!data.hasNext}
                onClick={() => setPage((current) => current + 1)}
              >
                Trang sau →
              </button>
            </nav>
          )}
        </>
      )}
    </StoreShell>
  );
}
function Breadcrumb() {
  return (
    <nav aria-label="Breadcrumb" data-breadcrumb="" style={breadcrumb}>
      <Link to="/" style={{ color: 'var(--color-neutral-700)', textDecoration: 'none' }}>
        Trang chủ
      </Link>
      <span>/</span>
      <span style={{ color: 'var(--color-text)' }}>Thông báo</span>
    </nav>
  );
}
const title: React.CSSProperties = {
  margin: 0,
  fontFamily: 'var(--font-heading)',
  fontWeight: 800,
  fontSize: 'clamp(30px, 5vw, 40px)',
  lineHeight: 1.02,
  letterSpacing: '-.035em',
};
const breadcrumb: React.CSSProperties = {
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
};
