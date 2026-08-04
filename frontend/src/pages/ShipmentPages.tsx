import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { DataTable } from "../components/admin/DataTable";
import { Pagination } from "../components/admin/Pagination";
import { apiRequest } from "../api/http";
import type { Page } from "../types/api";

type ShipmentStatus =
  "READY" | "IN_TRANSIT" | "DELIVERED" | "DELIVERY_FAILED" | "CANCELLED";
type Shipment = {
  id: string;
  orderId: string;
  orderCode: string;
  carrier: string;
  trackingCode: string;
  shippingFee: number;
  status: ShipmentStatus;
  shippedAt: string | null;
  deliveredAt: string | null;
  failedAt: string | null;
  failureReason: string | null;
  createdAt: string;
  updatedAt: string;
};
type Filters = {
  status: ShipmentStatus | "";
  carrier: string;
  trackingCode: string;
};

const statuses: ShipmentStatus[] = [
  "READY",
  "IN_TRANSIT",
  "DELIVERED",
  "DELIVERY_FAILED",
  "CANCELLED",
];
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
const statusClass = (status: string) =>
  `status status--${status.toLowerCase()}`;

function lastActivity(item: Shipment) {
  if (item.deliveredAt)
    return `Đã giao: ${dateTime.format(new Date(item.deliveredAt))}`;
  if (item.failedAt)
    return `Lỗi giao: ${dateTime.format(new Date(item.failedAt))}`;
  if (item.shippedAt)
    return `Bàn giao: ${dateTime.format(new Date(item.shippedAt))}`;
  return `Tạo: ${dateTime.format(new Date(item.createdAt))}`;
}

export function ShipmentsPage() {
  const navigate = useNavigate();
  const [data, setData] = useState<Page<Shipment> | null>(null);
  const [draft, setDraft] = useState<Filters>({
    status: "",
    carrier: "",
    trackingCode: "",
  });
  const [filters, setFilters] = useState<Filters>({
    status: "",
    carrier: "",
    trackingCode: "",
  });
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({ page: String(page), size: "20" });
    if (filters.status) params.set("status", filters.status);
    if (filters.carrier) params.set("carrier", filters.carrier);
    if (filters.trackingCode) params.set("trackingCode", filters.trackingCode);
    try {
      setData(
        await apiRequest<Page<Shipment>>(`/shipments?${params.toString()}`),
      );
    } catch (cause) {
      setError(errorText(cause));
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void load();
  }, [page, filters]);
  function applyFilters(event: FormEvent) {
    event.preventDefault();
    setPage(1);
    setFilters({
      status: draft.status,
      carrier: draft.carrier.trim(),
      trackingCode: draft.trackingCode.trim(),
    });
  }
  function clearFilters() {
    const empty = { status: "" as const, carrier: "", trackingCode: "" };
    setDraft(empty);
    setPage(1);
    setFilters(empty);
  }

  return (
    <>
      <header className="catalog-header shipment-header">
        <div>
          <p className="eyebrow">VẬN HÀNH</p>
          <h2>Vận chuyển</h2>
          <p>
            Theo dõi tất cả vận đơn, lọc nhanh theo trạng thái, đơn vị giao hàng
            hoặc mã vận đơn.
          </p>
        </div>
        <button
          className="primary-button compact"
          onClick={() => navigate("/admin/orders")}
        >
          + Tạo từ đơn hàng
        </button>
      </header>
      {error && <p className="form-error shipment-message">{error}</p>}
      <section className="catalog-panel">
        <form className="shipment-filters" onSubmit={applyFilters}>
          <label>
            Trạng thái
            <select
              value={draft.status}
              onChange={(event) =>
                setDraft((value) => ({
                  ...value,
                  status: event.target.value as Filters["status"],
                }))
              }
            >
              <option value="">Tất cả trạng thái</option>
              {statuses.map((status) => (
                <option key={status}>{status}</option>
              ))}
            </select>
          </label>
          <label>
            Đơn vị giao hàng
            <input
              placeholder="VD: GHN, GHTK…"
              value={draft.carrier}
              onChange={(event) =>
                setDraft((value) => ({ ...value, carrier: event.target.value }))
              }
            />
          </label>
          <label>
            Mã vận đơn
            <input
              placeholder="Nhập mã vận đơn"
              value={draft.trackingCode}
              onChange={(event) =>
                setDraft((value) => ({
                  ...value,
                  trackingCode: event.target.value,
                }))
              }
            />
          </label>
          <button className="ghost-button">Lọc</button>
          <button type="button" className="filter-reset" onClick={clearFilters}>
            Xóa lọc
          </button>
        </form>
        {loading ? (
          <p className="table-loading">Đang tải vận đơn…</p>
        ) : (
          <>
            <DataTable>
              <thead>
                <tr>
                  <th>Đơn hàng</th>
                  <th>Vận đơn</th>
                  <th>Đơn vị</th>
                  <th>Phí giao</th>
                  <th>Trạng thái</th>
                  <th>Cập nhật gần nhất</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {data?.items.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <strong>{item.orderCode}</strong>
                      <small>{lastActivity(item)}</small>
                    </td>
                    <td>
                      <code>{item.trackingCode}</code>
                    </td>
                    <td>{item.carrier}</td>
                    <td>{money.format(item.shippingFee)}</td>
                    <td>
                      <span className={statusClass(item.status)}>
                        {item.status}
                      </span>
                      {item.failureReason && (
                        <small className="shipment-failure">
                          {item.failureReason}
                        </small>
                      )}
                    </td>
                    <td>{dateTime.format(new Date(item.updatedAt))}</td>
                    <td className="table-actions">
                      <button
                        onClick={() =>
                          navigate(`/admin/orders/${item.orderId}`)
                        }
                      >
                        Mở đơn
                      </button>
                    </td>
                  </tr>
                ))}
                {data?.items.length === 0 && (
                  <tr>
                    <td colSpan={7}>
                      <p className="empty-state">
                        Không có vận đơn phù hợp với bộ lọc.
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </DataTable>
            <Pagination data={data} onPage={setPage} label="vận đơn" />
          </>
        )}
      </section>
    </>
  );
}
