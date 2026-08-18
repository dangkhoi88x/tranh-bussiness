import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { ApiRequestError } from '../api/http';
import { formatPrice } from '../api/storefront';
import type { OrderResponse, PaymentResponse } from '../api/checkout';
import {
  cancelMyOrder,
  fetchMyOrder,
  fetchMyOrderHistory,
  fetchMyOrders,
  fetchMyPayments,
  type OrderStatusHistory,
} from '../api/orders';
import type { Page } from '../types/api';
import { fetchMyPhotobookProjects, PHOTOBOOK_STATUS_LABEL, type PhotobookProject } from '../api/photobookProjects';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../hooks/useCart';
import { STORE_LABEL_STYLE, StoreNotice, StoreShell, StoreSummaryRow } from '../components/StoreShell';
import '../styles/ds.css';
import '../styles/public.css';

const PAGE_SIZE = 10;
const dateTime = new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium', timeStyle: 'short' });

const ORDER_STATUS: Record<string, string> = {
  PENDING: 'Chờ xác nhận',
  CONFIRMED: 'Đã xác nhận',
  PROCESSING: 'Đang thực hiện',
  SHIPPING: 'Đang giao',
  DELIVERY_FAILED: 'Giao không thành công',
  DELIVERED: 'Đã giao',
  CANCELLED: 'Đã huỷ',
};

const PAYMENT_STATUS: Record<string, string> = {
  PENDING: 'Chờ thanh toán',
  SUCCESS: 'Đã thanh toán',
  CANCELLED: 'Đã huỷ',
};

const SHIPMENT_STATUS: Record<string, string> = {
  READY: 'Đang chuẩn bị giao',
  IN_TRANSIT: 'Đang giao',
  DELIVERED: 'Đã giao',
  DELIVERY_FAILED: 'Giao không thành công',
  CANCELLED: 'Đã huỷ',
};

const REFUND_STATUS: Record<string, string> = {
  PENDING: 'Đang xử lý hoàn tiền',
  SUCCESS: 'Đã hoàn tiền',
  FAILED: 'Hoàn tiền chưa thành công',
};

function labelOf(value: string | null | undefined, labels: Record<string, string>) {
  return value ? (labels[value] ?? value) : 'Chưa có';
}

function stateTone(status: string) {
  if (status === 'DELIVERED' || status === 'SUCCESS') return 'var(--color-success, #18794e)';
  if (status === 'CANCELLED' || status === 'DELIVERY_FAILED' || status === 'FAILED') return 'var(--color-accent-700)';
  if (status === 'SHIPPING' || status === 'IN_TRANSIT' || status === 'PROCESSING') return 'var(--color-text)';
  return 'var(--color-neutral-800)';
}

function StatusBadge({ value, labels }: { value: string | null | undefined; labels: Record<string, string> }) {
  if (!value) return null;
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        width: 'fit-content',
        padding: '5px 8px',
        border: `1px solid ${stateTone(value)}`,
        color: stateTone(value),
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: '.1em',
        lineHeight: 1.1,
        textTransform: 'uppercase',
      }}
    >
      {labelOf(value, labels)}
    </span>
  );
}

function Breadcrumb({ current }: { current: string }) {
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
      <span style={{ color: 'var(--color-text)' }}>{current}</span>
    </nav>
  );
}

function orderAddress(order: OrderResponse) {
  const address = order.shippingAddressSnapshot;
  if (!address) return order.shippingAddress;
  return [address.addressLine, address.ward, address.district, address.province].filter(Boolean).join(', ');
}

export function MyOrdersPage() {
  const { orderId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { session } = useAuth();
  const { count } = useCart();
  const [page, setPage] = useState(1);
  const [orders, setOrders] = useState<Page<OrderResponse> | null>(null);
  const [detail, setDetail] = useState<OrderResponse | null>(null);
  const [history, setHistory] = useState<OrderStatusHistory[]>([]);
  const [payments, setPayments] = useState<PaymentResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  // Dòng photobook cần đường sang trang gửi ảnh; OrderItemResponse không mang projectId
  // nên tra ngược từ danh sách project của chính khách, khoá theo orderItemId.
  const [photobooks, setPhotobooks] = useState<Map<string, PhotobookProject>>(new Map());

  const load = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    setError(null);
    setConfirmCancel(false);
    try {
      if (orderId) {
        setOrders(null);
        setDetail(null);
        const [order, timeline, paymentPage] = await Promise.all([
          fetchMyOrder(orderId),
          fetchMyOrderHistory(orderId),
          fetchMyPayments(),
        ]);
        setDetail(order);
        setHistory(timeline);
        setPayments(paymentPage.items.filter((payment) => payment.orderId === order.id));
        if (order.items.some((item) => item.pageCount !== null)) {
          // Lỗi ở đây không nên chặn cả trang đơn hàng: chỉ mất nút gửi ảnh.
          const projects = await fetchMyPhotobookProjects(1, 50).catch(() => null);
          setPhotobooks(new Map((projects?.items ?? []).map((project) => [project.orderItemId, project])));
        } else {
          setPhotobooks(new Map());
        }
      } else {
        setDetail(null);
        setHistory([]);
        setPayments([]);
        const result = await fetchMyOrders(page, PAGE_SIZE);
        setOrders(result);
      }
    } catch (cause) {
      setError(cause instanceof ApiRequestError ? cause.message : 'Không tải được đơn hàng. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  }, [orderId, page, session]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const original = document.title;
    document.title = orderId ? 'Chi tiết đơn hàng | Bubble Memories' : 'Đơn hàng của tôi | Bubble Memories';
    return () => {
      document.title = original;
    };
  }, [orderId]);

  async function cancelOrder() {
    if (!detail) return;
    setCancelling(true);
    setError(null);
    try {
      const updated = await cancelMyOrder(detail.id);
      setDetail(updated);
      const [timeline, paymentPage] = await Promise.all([fetchMyOrderHistory(updated.id), fetchMyPayments()]);
      setHistory(timeline);
      setPayments(paymentPage.items.filter((payment) => payment.orderId === updated.id));
      setConfirmCancel(false);
    } catch (cause) {
      setError(cause instanceof ApiRequestError ? cause.message : 'Không thể huỷ đơn hàng này.');
    } finally {
      setCancelling(false);
    }
  }

  const title = orderId ? 'Theo dõi đơn hàng' : 'Đơn hàng của tôi';
  if (!session) {
    return (
      <StoreShell cartCount={count}>
        <Breadcrumb current={title} />
        <StoreNotice
          title="Đăng nhập để xem đơn hàng"
          body="Đơn hàng và trạng thái giao nhận được bảo vệ theo tài khoản của bạn."
          action={
            <Link className="btn btn-primary" to="/auth" state={{ from: location }}>
              Đăng nhập
            </Link>
          }
        />
      </StoreShell>
    );
  }

  if (loading) {
    return (
      <StoreShell cartCount={count}>
        <Breadcrumb current={title} />
        <StoreNotice title="Đang tải đơn hàng…" body="" />
      </StoreShell>
    );
  }

  if (error && !detail && !orders) {
    return (
      <StoreShell cartCount={count}>
        <Breadcrumb current={title} />
        <StoreNotice
          title="Không tải được đơn hàng"
          body={error}
          action={
            <button type="button" className="btn btn-primary" onClick={() => void load()}>
              Thử lại
            </button>
          }
        />
      </StoreShell>
    );
  }

  if (orderId && detail) {
    const cancellable = detail.status === 'PENDING' || detail.status === 'CONFIRMED';
    const shippingText = detail.shipmentStatus
      ? labelOf(detail.shipmentStatus, SHIPMENT_STATUS)
      : detail.status === 'PENDING'
        ? 'Chờ xưởng xác nhận đơn'
        : 'Chưa bàn giao đơn vị vận chuyển';
    return (
      <StoreShell cartCount={count}>
        <Breadcrumb current={`Đơn ${detail.orderCode}`} />
        <section
          style={{
            padding: 'var(--space-8) var(--space-8) var(--space-6)',
            borderBottom: '2px solid var(--color-text)',
          }}
        >
          <Link to="/don-hang-cua-toi" style={{ color: 'var(--color-neutral-800)', fontSize: 13 }}>
            ← Tất cả đơn hàng
          </Link>
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'end',
              justifyContent: 'space-between',
              gap: 'var(--space-4)',
              marginTop: 'var(--space-4)',
            }}
          >
            <div style={{ minWidth: 0 }}>
              <h1
                style={{
                  margin: 0,
                  fontFamily: 'var(--font-heading)',
                  fontWeight: 800,
                  fontSize: 'clamp(28px, 5vw, 40px)',
                  lineHeight: 1.02,
                  letterSpacing: '-.035em',
                  overflowWrap: 'anywhere',
                }}
              >
                {detail.orderCode}
              </h1>
              <p style={{ margin: 'var(--space-2) 0 0', fontSize: 14, color: 'var(--color-neutral-800)' }}>
                Đặt lúc {dateTime.format(new Date(detail.createdAt))}
              </p>
            </div>
            <StatusBadge value={detail.status} labels={ORDER_STATUS} />
          </div>
        </section>

        {error && (
          <p
            role="alert"
            style={{
              margin: 0,
              padding: 'var(--space-3) var(--space-8)',
              borderBottom: '1px solid var(--color-divider)',
              color: 'var(--color-accent-700)',
              fontSize: 13,
            }}
          >
            {error}
          </p>
        )}

        <section
          data-split=""
          style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(290px, .52fr)', alignItems: 'start' }}
        >
          <div style={{ minWidth: 0, borderRight: '2px solid var(--color-text)' }}>
            <section
              style={{ padding: 'var(--space-6) var(--space-8)', borderBottom: '2px solid var(--color-divider)' }}
            >
              <h2 style={sectionTitle}>Sản phẩm trong đơn</h2>
              <div style={{ borderTop: '2px solid var(--color-text)' }}>
                {detail.items.map((item) => (
                  <article
                    key={item.id}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'minmax(0, 1fr) auto',
                      gap: 'var(--space-4)',
                      padding: 'var(--space-4) 0',
                      borderBottom: '1px solid var(--color-neutral-300)',
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <Link
                        to={`/tranh/${item.productSlug}`}
                        style={{
                          color: 'var(--color-text)',
                          fontFamily: 'var(--font-heading)',
                          fontWeight: 800,
                          fontSize: 17,
                          textDecoration: 'none',
                          overflowWrap: 'anywhere',
                        }}
                      >
                        {item.productName}
                      </Link>
                      <p
                        style={{
                          margin: '4px 0 0',
                          fontSize: 13,
                          color: 'var(--color-neutral-800)',
                          overflowWrap: 'anywhere',
                        }}
                      >
                        {[
                          item.variantName,
                          item.pageCount ? `${item.pageCount} trang` : null,
                          item.variantMaterial,
                          item.frameName,
                        ]
                          .filter(Boolean)
                          .join(' · ') || 'Sản phẩm tiêu chuẩn'}{' '}
                        · SL: {item.quantity}
                      </p>
                      {photobooks.get(item.id) && <PhotobookLine project={photobooks.get(item.id)!} />}
                    </div>
                    <strong style={{ alignSelf: 'start', whiteSpace: 'nowrap', fontFamily: 'var(--font-heading)' }}>
                      {formatPrice(item.lineTotal)}
                    </strong>
                  </article>
                ))}
              </div>
              <div style={{ maxWidth: 420, marginLeft: 'auto', marginTop: 'var(--space-4)' }}>
                <StoreSummaryRow label="Tạm tính" value={formatPrice(detail.subtotalAmount)} />
                {detail.discountAmount > 0 && (
                  <StoreSummaryRow
                    label={`Giảm giá${detail.promotionCode ? ` · ${detail.promotionCode}` : ''}`}
                    value={`− ${formatPrice(detail.discountAmount)}`}
                    valueTone="discount"
                  />
                )}
                <StoreSummaryRow label="Vận chuyển" value={formatPrice(detail.shippingFee)} />
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'baseline',
                    gap: 'var(--space-4)',
                    padding: 'var(--space-4) 0',
                    borderBottom: '2px solid var(--color-text)',
                  }}
                >
                  <span style={STORE_LABEL_STYLE}>Tổng thanh toán</span>
                  <strong style={{ fontFamily: 'var(--font-heading)', fontSize: 24 }}>
                    {formatPrice(detail.totalAmount)}
                  </strong>
                </div>
              </div>
            </section>

            <section style={{ padding: 'var(--space-6) var(--space-8)' }}>
              <h2 style={sectionTitle}>Dòng thời gian</h2>
              {history.length === 0 ? (
                <p style={{ color: 'var(--color-neutral-800)', fontSize: 14 }}>Chưa có cập nhật trạng thái.</p>
              ) : (
                <ol style={{ listStyle: 'none', padding: 0, margin: 0, borderTop: '2px solid var(--color-text)' }}>
                  {history.map((event) => (
                    <li
                      key={event.id}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '12px minmax(0, 1fr)',
                        columnGap: 'var(--space-3)',
                        padding: 'var(--space-4) 0',
                        borderBottom: '1px solid var(--color-neutral-300)',
                      }}
                    >
                      <span
                        aria-hidden="true"
                        style={{
                          width: 10,
                          height: 10,
                          marginTop: 5,
                          borderRadius: '50%',
                          background: stateTone(event.toStatus),
                        }}
                      />
                      <div style={{ minWidth: 0 }}>
                        <strong style={{ fontSize: 14 }}>{labelOf(event.toStatus, ORDER_STATUS)}</strong>
                        {event.note && (
                          <p
                            style={{
                              margin: '3px 0 0',
                              fontSize: 13,
                              lineHeight: 1.5,
                              color: 'var(--color-neutral-800)',
                            }}
                          >
                            {event.note}
                          </p>
                        )}
                        <small style={{ display: 'block', marginTop: 4, color: 'var(--color-neutral-700)' }}>
                          {event.changedByName || 'Hệ thống'} · {dateTime.format(new Date(event.createdAt))}
                        </small>
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </section>
          </div>

          <aside
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--space-6)',
              padding: 'var(--space-6) var(--space-8)',
            }}
          >
            <section>
              <h2 style={sectionTitle}>Giao hàng</h2>
              <div style={sideBlock}>
                <StatusBadge value={detail.shipmentStatus} labels={SHIPMENT_STATUS} />
                <p style={{ margin: detail.shipmentStatus ? 'var(--space-3) 0 0' : 0, fontSize: 14, lineHeight: 1.55 }}>
                  {shippingText}
                </p>
              </div>
            </section>
            <section>
              <h2 style={sectionTitle}>Thanh toán</h2>
              <div style={sideBlock}>
                <p style={{ margin: 0, fontSize: 14 }}>
                  <strong>
                    {detail.paymentMethod === 'COD'
                      ? 'COD · trả khi nhận hàng'
                      : (detail.paymentMethod ?? 'Chưa tạo thanh toán')}
                  </strong>
                </p>
                <p style={{ margin: 'var(--space-2) 0 0', fontSize: 13, color: 'var(--color-neutral-800)' }}>
                  {labelOf(detail.paymentStatus, PAYMENT_STATUS)}
                </p>
                {payments.map((payment) => (
                  <p
                    key={payment.id}
                    style={{
                      margin: 'var(--space-2) 0 0',
                      fontSize: 12,
                      color: 'var(--color-neutral-700)',
                      overflowWrap: 'anywhere',
                    }}
                  >
                    Mã thanh toán: {payment.transactionCode || 'Đang tạo'} · {labelOf(payment.status, PAYMENT_STATUS)}
                  </p>
                ))}
                {detail.refundStatus && (
                  <p style={{ margin: 'var(--space-3) 0 0', fontSize: 13, color: stateTone(detail.refundStatus) }}>
                    {labelOf(detail.refundStatus, REFUND_STATUS)}
                    {detail.refundAmount != null ? ` · ${formatPrice(detail.refundAmount)}` : ''}
                  </p>
                )}
              </div>
            </section>
            <section>
              <h2 style={sectionTitle}>Địa chỉ nhận hàng</h2>
              <div style={sideBlock}>
                {detail.shippingAddressSnapshot && (
                  <>
                    <strong style={{ fontSize: 14 }}>{detail.shippingAddressSnapshot.recipientName}</strong>
                    <p style={{ margin: '3px 0 0', fontSize: 13 }}>{detail.shippingAddressSnapshot.phone}</p>
                  </>
                )}
                <p style={{ margin: 'var(--space-2) 0 0', fontSize: 13, lineHeight: 1.55 }}>{orderAddress(detail)}</p>
              </div>
            </section>
            {cancellable && (
              <section aria-live="polite">
                {!confirmCancel ? (
                  <button type="button" className="btn btn-ghost" onClick={() => setConfirmCancel(true)}>
                    Huỷ đơn hàng
                  </button>
                ) : (
                  <div style={{ borderTop: '2px solid var(--color-accent-700)', paddingTop: 'var(--space-3)' }}>
                    <p style={{ margin: '0 0 var(--space-3)', fontSize: 13, lineHeight: 1.5 }}>
                      Bạn chắc muốn huỷ? Kho hàng và mã giảm giá (nếu có) sẽ được hoàn lại.
                    </p>
                    <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        className="btn btn-primary"
                        disabled={cancelling}
                        onClick={() => void cancelOrder()}
                      >
                        {cancelling ? 'Đang huỷ…' : 'Xác nhận huỷ đơn'}
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        disabled={cancelling}
                        onClick={() => setConfirmCancel(false)}
                      >
                        Giữ đơn
                      </button>
                    </div>
                  </div>
                )}
              </section>
            )}
          </aside>
        </section>
      </StoreShell>
    );
  }

  return (
    <StoreShell cartCount={count}>
      <Breadcrumb current="Đơn hàng của tôi" />
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
            Đơn hàng của tôi
          </h1>
          <p style={{ margin: 'var(--space-2) 0 0', color: 'var(--color-neutral-800)', fontSize: 14 }}>
            Theo dõi xác nhận, giao hàng và thanh toán ở một nơi.
          </p>
        </div>
        {orders && <span style={STORE_LABEL_STYLE}>{orders.totalElements} đơn hàng</span>}
      </section>
      {!orders || orders.items.length === 0 ? (
        <StoreNotice
          title="Bạn chưa có đơn hàng nào"
          body="Khi hoàn tất đặt tranh, tiến trình xử lý sẽ xuất hiện tại đây."
          action={
            <Link to="/danh-muc/tranh-canvas" className="btn btn-primary">
              Xem tranh canvas
            </Link>
          }
        />
      ) : (
        <>
          <section style={{ borderTop: '0' }}>
            {orders.items.map((order) => (
              <Link
                key={order.id}
                to={`/don-hang-cua-toi/${order.id}`}
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'minmax(0, 1fr) auto',
                  gap: 'var(--space-5)',
                  padding: 'var(--space-6) var(--space-8)',
                  borderBottom: '1px solid var(--color-neutral-300)',
                  color: 'var(--color-text)',
                  textDecoration: 'none',
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 'var(--space-3)' }}>
                    <strong
                      style={{
                        fontFamily: 'var(--font-heading)',
                        fontSize: 20,
                        letterSpacing: '-.02em',
                        overflowWrap: 'anywhere',
                      }}
                    >
                      {order.orderCode}
                    </strong>
                    <StatusBadge value={order.status} labels={ORDER_STATUS} />
                  </div>
                  <p style={{ margin: 'var(--space-2) 0 0', fontSize: 13, color: 'var(--color-neutral-800)' }}>
                    {dateTime.format(new Date(order.createdAt))} ·{' '}
                    {order.items.reduce((quantity, item) => quantity + item.quantity, 0)} sản phẩm
                  </p>
                  <p
                    style={{
                      margin: '4px 0 0',
                      fontSize: 13,
                      color: 'var(--color-neutral-800)',
                      overflowWrap: 'anywhere',
                    }}
                  >
                    {order.items
                      .slice(0, 2)
                      .map((item) => item.productName)
                      .join(' · ')}
                    {order.items.length > 2 ? ` · +${order.items.length - 2} sản phẩm khác` : ''}
                  </p>
                </div>
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'end',
                    justifyContent: 'space-between',
                    gap: 'var(--space-3)',
                    textAlign: 'right',
                  }}
                >
                  <strong style={{ fontFamily: 'var(--font-heading)', fontSize: 18, whiteSpace: 'nowrap' }}>
                    {formatPrice(order.totalAmount)}
                  </strong>
                  <span style={{ color: 'var(--color-accent)', fontSize: 13, fontWeight: 700 }}>Xem chi tiết →</span>
                </div>
              </Link>
            ))}
          </section>
          {orders.totalPages > 1 && (
            <nav
              aria-label="Phân trang đơn hàng"
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
                Trang {orders.page} / {orders.totalPages}
              </span>
              <button
                type="button"
                className="btn btn-secondary"
                disabled={!orders.hasNext}
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

const sectionTitle: React.CSSProperties = {
  margin: '0 0 var(--space-4)',
  fontFamily: 'var(--font-heading)',
  fontWeight: 800,
  fontSize: 18,
  letterSpacing: '.04em',
  textTransform: 'uppercase',
};

const sideBlock: React.CSSProperties = {
  borderTop: '2px solid var(--color-text)',
  borderBottom: '1px solid var(--color-neutral-300)',
  padding: 'var(--space-4) 0',
};

/**
 * Nhắc gửi ảnh ngay trên dòng đơn photobook. Khách vừa trả tiền xong thường không biết
 * bước tiếp theo là gì; đây là chỗ tự nhiên nhất để nói.
 */
function PhotobookLine({ project }: { project: PhotobookProject }) {
  const missing = Math.max(0, project.recommendedPhotosMin - project.photoCount);
  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: 'var(--space-3)',
        marginTop: 'var(--space-3)',
        padding: 'var(--space-3)',
        border: '2px solid var(--color-text)',
      }}
    >
      <span style={{ ...STORE_LABEL_STYLE, color: 'var(--color-text)' }}>{PHOTOBOOK_STATUS_LABEL[project.status]}</span>
      <span style={{ fontSize: 13, color: 'var(--color-neutral-800)' }}>
        {project.photoCount}/{project.recommendedPhotosMin}–{project.recommendedPhotosMax} ảnh
        {project.editable && missing > 0 ? ` · còn thiếu ${missing}` : ''}
      </span>
      <Link to={`/photobook-cua-toi/${project.id}`} className="btn btn-primary" style={{ marginLeft: 'auto' }}>
        {project.editable ? (project.photoCount === 0 ? 'Gửi ảnh' : 'Tiếp tục gửi ảnh') : 'Xem bộ ảnh'}
      </Link>
    </div>
  );
}
