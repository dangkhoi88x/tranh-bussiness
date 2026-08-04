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
    </>
  );
}
