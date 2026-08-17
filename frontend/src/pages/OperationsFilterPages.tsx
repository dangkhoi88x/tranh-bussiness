import { useMemo, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { DataTable } from "../components/admin/DataTable";
import { Panel } from "../components/admin/Panel";
import { Pagination } from "../components/admin/Pagination";
import { apiRequest } from "../api/http";
import { usePagedRequest } from "../hooks/usePagedRequest";

type OrderStatus =
  | "PENDING"
  | "CONFIRMED"
  | "PROCESSING"
  | "SHIPPING"
  | "DELIVERY_FAILED"
  | "DELIVERED"
  | "CANCELLED";
type PaymentStatus = "PENDING" | "SUCCESS" | "CANCELLED";
type Order = {
  id: string;
  orderCode: string;
  status: OrderStatus;
  totalAmount: number;
  shippingFee: number;
  paymentStatus: PaymentStatus | null;
  paymentMethod: "COD" | null;
  shipmentStatus: "READY" | "IN_TRANSIT" | "DELIVERED" | "DELIVERY_FAILED" | "CANCELLED" | null;
  refundStatus: "PENDING" | "SUCCESS" | "FAILED" | null;
  refundAmount: number | null;
  promotionCode: string | null;
  items: unknown[];
  customDetails: unknown | null;
  createdAt: string;
};
type Payment = {
  id: string;
  orderId: string;
  orderCode: string;
  amount: number;
  method: "COD";
  status: PaymentStatus;
  transactionCode: string;
  paidAt: string | null;
  createdAt: string;
};

const money = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});
const dateTime = new Intl.DateTimeFormat("vi-VN", {
  dateStyle: "medium",
  timeStyle: "short",
});
const errorText = (error: unknown) =>
  error instanceof Error ? error.message : "Đã có lỗi xảy ra.";
const stateClass = (status: string) => `status status--${status.toLowerCase()}`;

function Header({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <header className="catalog-header">
      <div>
        <p className="eyebrow">VẬN HÀNH</p>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
    </header>
  );
}

export function OrdersSearchPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({
    orderCode: "",
    status: "",
    customer: "",
    createdFrom: "",
    createdTo: "",
  });
  const [draft, setDraft] = useState(filters);
  const query = useMemo(() => {
    const value = new URLSearchParams({ page: String(page), size: "15" });
    Object.entries(filters).forEach(([key, item]) => {
      if (item) value.set(key, item);
    });
    return value.toString();
  }, [filters, page]);
  const { data, loading, error, reload } = usePagedRequest<Order>(`/orders?${query}`);
  function submit(event: FormEvent) {
    event.preventDefault();
    setPage(1);
    setFilters(draft);
  }
  function reset() {
    const empty = {
      orderCode: "",
      status: "",
      customer: "",
      createdFrom: "",
      createdTo: "",
    };
    setDraft(empty);
    setFilters(empty);
    setPage(1);
  }
  async function completeDelivery(order: Order) {
    if (!window.confirm(`Xác nhận ${order.orderCode} đã giao thành công và đã thu COD?`)) return;
    try {
      await apiRequest(`/orders/${order.id}/fulfillment/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: null }),
      });
      void reload();
    } catch (error) {
      window.alert(errorText(error));
    }
  }
  async function failDelivery(order: Order) {
    const failureReason = window.prompt("Lý do giao thất bại:");
    if (!failureReason?.trim()) return;
    if (!window.confirm("Xác nhận hàng đã về kho? Hệ thống sẽ hoàn tồn, hủy COD và hoàn quota coupon.")) return;
    try {
      await apiRequest(`/orders/${order.id}/fulfillment/delivery-failed`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ failureReason: failureReason.trim(), restockConfirmed: true }),
      });
      void reload();
    } catch (error) {
      window.alert(errorText(error));
    }
  }
  return (
    <>
      <Header
        title="Đơn hàng"
        description="Tìm nhanh theo mã đơn, khách hàng, trạng thái và thời điểm tạo."
      />
      {error && <p className="catalog-message">{error}</p>}
      <Panel>
        <form className="operations-filters" onSubmit={submit}>
          <label>
            Mã đơn
            <input
              value={draft.orderCode}
              placeholder="ART-..."
              onChange={(event) =>
                setDraft({ ...draft, orderCode: event.target.value })
              }
            />
          </label>
          <label>
            Khách hàng
            <input
              value={draft.customer}
              placeholder="Tên hoặc email"
              onChange={(event) =>
                setDraft({ ...draft, customer: event.target.value })
              }
            />
          </label>
          <label>
            Trạng thái
            <select
              value={draft.status}
              onChange={(event) =>
                setDraft({ ...draft, status: event.target.value })
              }
            >
              <option value="">Tất cả</option>
              {(
                [
                  "PENDING",
                  "CONFIRMED",
                  "PROCESSING",
                  "SHIPPING",
                  "DELIVERY_FAILED",
                  "DELIVERED",
                  "CANCELLED",
                ] as OrderStatus[]
              ).map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>
          <label>
            Từ ngày
            <input
              type="date"
              value={draft.createdFrom}
              onChange={(event) =>
                setDraft({ ...draft, createdFrom: event.target.value })
              }
            />
          </label>
          <label>
            Đến ngày
            <input
              type="date"
              value={draft.createdTo}
              onChange={(event) =>
                setDraft({ ...draft, createdTo: event.target.value })
              }
            />
          </label>
          <button className="primary-button compact">Tìm kiếm</button>
          <button type="button" className="filter-reset" onClick={reset}>
            Xóa lọc
          </button>
        </form>
        {loading ? (
          <p className="table-loading">Đang tải đơn hàng…</p>
        ) : (
          <>
            <DataTable>
              <thead>
                <tr>
                  <th>Mã đơn</th>
                  <th>Thời gian</th>
                  <th>Thanh toán</th>
                  <th>Khuyến mãi</th>
                  <th>Phí giao</th>
                  <th>Tổng tiền</th>
                  <th>Trạng thái</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {data?.items.map((order) => (
                  <tr key={order.id}>
                    <td>
                      <strong>{order.orderCode}</strong>
                      <small>
                        {order.items.length} sản phẩm
                        {order.customDetails ? " · Đơn theo yêu cầu" : ""}
                      </small>
                    </td>
                    <td>{dateTime.format(new Date(order.createdAt))}</td>
                    <td>
                      {order.paymentStatus ? (
                        <>
                          <span className={stateClass(order.paymentStatus)}>
                            {order.paymentStatus}
                          </span>
                          <small>{order.paymentMethod}</small>
                        </>
                      ) : (
                        "Chưa tạo"
                      )}
                    </td>
                    <td>
                      {order.promotionCode ? `Mã ${order.promotionCode}` : "—"}
                    </td>
                    <td>{money.format(order.shippingFee)}</td>
                    <td>{money.format(order.totalAmount)}</td>
                    <td>
                      <span className={stateClass(order.status)}>
                        {order.status}
                      </span>
                    </td>
                    <td className="table-actions">
                      <button
                        onClick={() => navigate(`/admin/orders/${order.id}`)}
                      >
                        Chi tiết
                      </button>
                      {order.status === "SHIPPING" && order.shipmentStatus === "IN_TRANSIT" && (
                        <>
                          <button onClick={() => void completeDelivery(order)}>
                            Hoàn thành
                          </button>
                          <button className="danger-text" onClick={() => void failDelivery(order)}>
                            Giao thất bại
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </DataTable>
            {data?.items.length === 0 && (
              <p className="empty-state">Không tìm thấy đơn hàng phù hợp.</p>
            )}
            <Pagination data={data} onPage={setPage} />
          </>
        )}
      </Panel>
    </>
  );
}

export function PaymentsSearchPage() {
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({
    status: "",
    orderCode: "",
    createdFrom: "",
    createdTo: "",
  });
  const [draft, setDraft] = useState(filters);
  const [message, setMessage] = useState<string | null>(null);
  const query = useMemo(() => {
    const value = new URLSearchParams({ page: String(page), size: "20" });
    Object.entries(filters).forEach(([key, item]) => {
      if (item) value.set(key, item);
    });
    return value.toString();
  }, [filters, page]);
  const {
    data,
    loading,
    error,
    reload: load,
  } = usePagedRequest<Payment>(`/payments?${query}`);
  function submit(event: FormEvent) {
    event.preventDefault();
    setPage(1);
    setFilters(draft);
  }
  function reset() {
    const empty = { status: "", orderCode: "", createdFrom: "", createdTo: "" };
    setDraft(empty);
    setFilters(empty);
    setPage(1);
  }
  async function confirm(item: Payment) {
    if (!window.confirm(`Xác nhận đã thu COD cho ${item.orderCode}?`)) return;
    try {
      await apiRequest(`/payments/${item.id}/cod/confirm`, { method: "PUT" });
      setMessage("Đã xác nhận thanh toán COD.");
      void load();
    } catch (error) {
      setMessage(errorText(error));
    }
  }
  return (
    <>
      <Header
        title="Thanh toán COD"
        description="Lọc theo trạng thái, ngày tạo và mã đơn để kiểm soát các khoản phải thu."
      />
      {(message || error) && (
        <p className="catalog-message">{message || error}</p>
      )}
      <Panel>
        <form
          className="operations-filters operations-filters--payments"
          onSubmit={submit}
        >
          <label>
            Mã đơn
            <input
              value={draft.orderCode}
              placeholder="ART-..."
              onChange={(event) =>
                setDraft({ ...draft, orderCode: event.target.value })
              }
            />
          </label>
          <label>
            Trạng thái
            <select
              value={draft.status}
              onChange={(event) =>
                setDraft({ ...draft, status: event.target.value })
              }
            >
              <option value="">Tất cả</option>
              {(["PENDING", "SUCCESS", "CANCELLED"] as PaymentStatus[]).map(
                (item) => (
                  <option key={item}>{item}</option>
                ),
              )}
            </select>
          </label>
          <label>
            Từ ngày
            <input
              type="date"
              value={draft.createdFrom}
              onChange={(event) =>
                setDraft({ ...draft, createdFrom: event.target.value })
              }
            />
          </label>
          <label>
            Đến ngày
            <input
              type="date"
              value={draft.createdTo}
              onChange={(event) =>
                setDraft({ ...draft, createdTo: event.target.value })
              }
            />
          </label>
          <button className="primary-button compact">Tìm kiếm</button>
          <button type="button" className="filter-reset" onClick={reset}>
            Xóa lọc
          </button>
        </form>
        {loading ? (
          <p className="table-loading">Đang tải thanh toán…</p>
        ) : (
          <>
            <DataTable>
              <thead>
                <tr>
                  <th>Mã giao dịch</th>
                  <th>Đơn hàng</th>
                  <th>Phương thức</th>
                  <th>Số tiền</th>
                  <th>Trạng thái</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {data?.items.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <strong>{item.transactionCode}</strong>
                      <small>{dateTime.format(new Date(item.createdAt))}</small>
                    </td>
                    <td>{item.orderCode}</td>
                    <td>{item.method}</td>
                    <td>{money.format(item.amount)}</td>
                    <td>
                      <span className={stateClass(item.status)}>
                        {item.status}
                      </span>
                    </td>
                    <td className="table-actions">
                      {item.status === "PENDING" && (
                        <button onClick={() => void confirm(item)}>
                          Xác nhận COD
                        </button>
                      )}
                      {item.paidAt && (
                        <small>
                          Thu: {dateTime.format(new Date(item.paidAt))}
                        </small>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </DataTable>
            {data?.items.length === 0 && (
              <p className="empty-state">Không tìm thấy thanh toán phù hợp.</p>
            )}
            <Pagination data={data} onPage={setPage} />
          </>
        )}
      </Panel>
      <RefundsPanel />
    </>
  );
}

type Refund = {
  id: string;
  orderId: string;
  orderCode: string;
  paymentId: string;
  transactionCode: string;
  amount: number;
  status: "PENDING" | "SUCCESS" | "FAILED";
  reason: string;
  providerRefundId: string | null;
  failureMessage: string | null;
  completedAt: string | null;
  createdAt: string;
};

/**
 * Hoàn tiền sinh ra tự động ở trạng thái PENDING khi giao thất bại một đơn đã thu COD, và
 * khách nhìn thấy ngay "Đang xử lý hoàn tiền" ở đơn của mình. Không có bảng này thì không ai
 * trong xưởng biết còn khoản nào phải trả, nên mặc định lọc đúng nhóm PENDING.
 */
function RefundsPanel() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("PENDING");
  const [message, setMessage] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const query = useMemo(() => {
    const value = new URLSearchParams({ page: String(page), size: "20" });
    if (status) value.set("status", status);
    return value.toString();
  }, [status, page]);
  const { data, loading, error, reload } = usePagedRequest<Refund>(
    `/payment-refunds?${query}`,
  );

  async function settle(
    refund: Refund,
    next: "SUCCESS" | "FAILED",
    reference: string,
    failureMessage: string,
  ) {
    try {
      await apiRequest(`/payment-refunds/${refund.id}/settle`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: next,
          providerRefundId: reference || null,
          failureMessage: failureMessage || null,
        }),
      });
      setMessage(
        next === "SUCCESS"
          ? `Đã ghi nhận hoàn tiền cho ${refund.orderCode}.`
          : `Đã ghi nhận hoàn tiền thất bại cho ${refund.orderCode}.`,
      );
      setOpenId(null);
      void reload();
    } catch (settleError) {
      setMessage(errorText(settleError));
    }
  }

  return (
    <Panel>
      <Header
        title="Hoàn tiền"
        description="Khoản phải trả lại khách khi giao thất bại đơn đã thu COD. Chuyển tiền xong thì chốt lại ở đây để khách thấy đúng trạng thái."
      />
      {(message || error) && <p className="catalog-message">{message || error}</p>}
      <form
        className="operations-filters"
        onSubmit={(event) => {
          event.preventDefault();
          setPage(1);
        }}
      >
        <label>
          Trạng thái
          <select
            value={status}
            onChange={(event) => {
              setStatus(event.target.value);
              setPage(1);
            }}
          >
            <option value="PENDING">Chờ hoàn</option>
            <option value="SUCCESS">Đã hoàn</option>
            <option value="FAILED">Hoàn thất bại</option>
            <option value="">Tất cả</option>
          </select>
        </label>
      </form>
      {loading ? (
        <p className="table-loading">Đang tải khoản hoàn tiền…</p>
      ) : (
        <>
          <DataTable>
            <thead>
              <tr>
                <th>Đơn hàng</th>
                <th>Số tiền</th>
                <th>Lý do</th>
                <th>Trạng thái</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {data?.items.map((refund) => (
                <tr key={refund.id}>
                  <td>
                    <strong>{refund.orderCode}</strong>
                    <small>{dateTime.format(new Date(refund.createdAt))}</small>
                  </td>
                  <td>{money.format(refund.amount)}</td>
                  <td>
                    {refund.reason}
                    {refund.failureMessage && <small>{refund.failureMessage}</small>}
                    {refund.providerRefundId && <small>Mã CK: {refund.providerRefundId}</small>}
                  </td>
                  <td>
                    <span className={stateClass(refund.status)}>{refund.status}</span>
                  </td>
                  <td className="table-actions">
                    {refund.status === "PENDING" ? (
                      openId === refund.id ? (
                        <SettleRefundForm
                          refund={refund}
                          onCancel={() => setOpenId(null)}
                          onSettle={settle}
                        />
                      ) : (
                        <button onClick={() => setOpenId(refund.id)}>Chốt khoản này</button>
                      )
                    ) : (
                      refund.completedAt && (
                        <small>{dateTime.format(new Date(refund.completedAt))}</small>
                      )
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </DataTable>
          {data?.items.length === 0 && (
            <p className="empty-state">Không có khoản hoàn tiền nào.</p>
          )}
          <Pagination data={data} onPage={setPage} />
        </>
      )}
    </Panel>
  );
}

function SettleRefundForm({
  refund,
  onCancel,
  onSettle,
}: {
  refund: Refund;
  onCancel: () => void;
  onSettle: (
    refund: Refund,
    next: "SUCCESS" | "FAILED",
    reference: string,
    failureMessage: string,
  ) => Promise<void>;
}) {
  const [reference, setReference] = useState("");
  const [failureMessage, setFailureMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function run(next: "SUCCESS" | "FAILED") {
    setBusy(true);
    try {
      await onSettle(refund, next, reference.trim(), failureMessage.trim());
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="refund-settle">
      <label>
        Mã chuyển khoản (tuỳ chọn)
        <input
          value={reference}
          placeholder="VD: FT2608140001"
          maxLength={120}
          onChange={(event) => setReference(event.target.value)}
        />
      </label>
      <label>
        Lý do nếu thất bại
        <input
          value={failureMessage}
          placeholder="VD: sai số tài khoản"
          maxLength={1000}
          onChange={(event) => setFailureMessage(event.target.value)}
        />
      </label>
      <button disabled={busy} onClick={() => void run("SUCCESS")}>
        Đã hoàn tiền
      </button>
      <button
        disabled={busy || !failureMessage.trim()}
        title={!failureMessage.trim() ? "Cần ghi lý do trước" : undefined}
        onClick={() => void run("FAILED")}
      >
        Hoàn thất bại
      </button>
      <button type="button" disabled={busy} onClick={onCancel}>
        Huỷ
      </button>
    </div>
  );
}
