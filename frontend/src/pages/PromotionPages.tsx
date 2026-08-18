import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Modal } from '../components/admin/Modal';
import { Pagination } from '../components/admin/Pagination';
import { apiRequest } from '../api/http';
import type { Page } from '../types/api';

type PromotionStatus = 'DRAFT' | 'ACTIVE' | 'INACTIVE' | 'EXPIRED';
type ScopeType = 'CATEGORY' | 'PRODUCT' | 'VARIANT';
type PromotionScope = {
  id: string;
  type: ScopeType;
  targetId: string;
  targetName: string;
};
type Promotion = {
  id: string;
  name: string;
  code: string;
  description: string | null;
  type: 'PERCENTAGE' | 'FIXED_AMOUNT';
  discountValue: number;
  maxDiscountAmount: number | null;
  minOrderAmount: number;
  startAt: string;
  endAt: string;
  usageLimit: number;
  reservedCount: number;
  usedCount: number;
  perUserLimit: number;
  appliesToAll: boolean;
  status: PromotionStatus;
  scopes: PromotionScope[];
  createdAt: string;
  updatedAt: string;
};
type PromotionUsage = {
  id: string;
  promotionId: string;
  userId: string | null;
  orderId: string | null;
  orderCode: string | null;
  couponCode: string;
  eligibleSubtotal: number;
  discountAmount: number;
  status: 'RESERVED' | 'CONSUMED' | 'RELEASED' | 'EXPIRED';
  expiresAt: string | null;
  consumedAt: string | null;
  releasedAt: string | null;
  createdAt: string;
};
type Category = { id: string; name: string };
type Product = { id: string; name: string };
type Variant = { id: string; sku: string; name: string };

const currency = new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
  maximumFractionDigits: 0,
});
const apiError = (error: unknown) => (error instanceof Error ? error.message : 'Đã có lỗi xảy ra.');
const formatTime = (value: string | null) =>
  value
    ? new Intl.DateTimeFormat('vi-VN', {
        dateStyle: 'short',
        timeStyle: 'short',
      }).format(new Date(value))
    : '—';
const asLocalInput = (value?: string) => {
  const date = value ? new Date(value) : new Date();
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
};

function PageHeader({ action }: { action: React.ReactNode }) {
  return (
    <header className="catalog-header">
      <div>
        <p className="eyebrow">PROMOTIONS</p>
        <h2>Khuyến mãi</h2>
        <p>Tạo mã giảm giá, giới hạn lượt dùng và kiểm soát phạm vi áp dụng cho cửa hàng.</p>
      </div>
      {action}
    </header>
  );
}

function discountCopy(item: Promotion) {
  return item.type === 'PERCENTAGE'
    ? `${item.discountValue}%${item.maxDiscountAmount ? ` · tối đa ${currency.format(item.maxDiscountAmount)}` : ''}`
    : currency.format(item.discountValue);
}

export function PromotionsPage() {
  const [data, setData] = useState<Page<Promotion> | null>(null);
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<Promotion | null | undefined>(undefined);
  const [viewingUsages, setViewingUsages] = useState<Promotion | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    code: '',
    status: '',
    effectiveFrom: '',
    effectiveTo: '',
  });
  const [draft, setDraft] = useState(filters);

  async function load() {
    setLoading(true);
    const query = new URLSearchParams({ page: String(page), size: '15' });
    Object.entries(filters).forEach(([key, value]) => {
      if (value) query.set(key, value);
    });
    try {
      setData(await apiRequest<Page<Promotion>>(`/promotions?${query.toString()}`));
    } catch (error) {
      setMessage(apiError(error));
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
    setFilters(draft);
  }
  function resetFilters() {
    const empty = { code: '', status: '', effectiveFrom: '', effectiveTo: '' };
    setDraft(empty);
    setFilters(empty);
    setPage(1);
  }

  async function updateStatus(item: Promotion, status: 'ACTIVE' | 'INACTIVE') {
    try {
      await apiRequest<Promotion>(`/promotions/${item.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      setMessage(status === 'ACTIVE' ? `Đã bật mã ${item.code}.` : `Đã tắt mã ${item.code}.`);
      void load();
    } catch (error) {
      setMessage(apiError(error));
    }
  }
  async function remove(item: Promotion) {
    if (
      !window.confirm(
        `Xóa mã “${item.code}”? Nếu mã đã được dùng, hệ thống sẽ chuyển mã về INACTIVE thay vì xóa dữ liệu lịch sử.`,
      )
    )
      return;
    try {
      await apiRequest<void>(`/promotions/${item.id}`, { method: 'DELETE' });
      setMessage(`Đã xử lý yêu cầu xóa mã ${item.code}.`);
      void load();
    } catch (error) {
      setMessage(apiError(error));
    }
  }

  return (
    <>
      <PageHeader
        action={
          <button className="primary-button compact" onClick={() => setEditing(null)}>
            + Tạo khuyến mãi
          </button>
        }
      />
      {message && (
        <p className="catalog-message" role="status">
          {message}
        </p>
      )}
      <section className="catalog-panel">
        <form className="operations-filters operations-filters--payments" onSubmit={applyFilters}>
          <label>
            Mã khuyến mãi
            <input
              value={draft.code}
              placeholder="SUMMER..."
              onChange={(event) => setDraft({ ...draft, code: event.target.value })}
            />
          </label>
          <label>
            Trạng thái
            <select value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value })}>
              <option value="">Tất cả</option>
              {(['DRAFT', 'ACTIVE', 'INACTIVE', 'EXPIRED'] as PromotionStatus[]).map((status) => (
                <option key={status}>{status}</option>
              ))}
            </select>
          </label>
          <label>
            Hiệu lực từ
            <input
              type="date"
              value={draft.effectiveFrom}
              onChange={(event) => setDraft({ ...draft, effectiveFrom: event.target.value })}
            />
          </label>
          <label>
            Đến ngày
            <input
              type="date"
              value={draft.effectiveTo}
              onChange={(event) => setDraft({ ...draft, effectiveTo: event.target.value })}
            />
          </label>
          <button className="primary-button compact">Tìm kiếm</button>
          <button type="button" className="filter-reset" onClick={resetFilters}>
            Xóa lọc
          </button>
        </form>
      </section>
      <section className="catalog-panel">
        {loading ? (
          <p className="table-loading">Đang tải khuyến mãi…</p>
        ) : (
          <>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Mã / tên</th>
                  <th>Giảm giá</th>
                  <th>Hiệu lực</th>
                  <th>Lượt dùng</th>
                  <th>Phạm vi</th>
                  <th>Trạng thái</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {data?.items.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <strong className="promotion-code">{item.code}</strong>
                      <small>{item.name}</small>
                    </td>
                    <td>
                      {discountCopy(item)}
                      <small>Đơn tối thiểu {currency.format(item.minOrderAmount)}</small>
                    </td>
                    <td>
                      <small>{formatTime(item.startAt)}</small>
                      <small>đến {formatTime(item.endAt)}</small>
                    </td>
                    <td>
                      {item.usedCount + item.reservedCount}
                      {item.usageLimit > 0 ? ` / ${item.usageLimit}` : ' / ∞'}
                      <small>
                        {item.usedCount} đã dùng · {item.reservedCount} đang giữ
                      </small>
                    </td>
                    <td>{item.appliesToAll ? 'Toàn cửa hàng' : `${item.scopes.length} phạm vi`}</td>
                    <td>
                      <span className={`status status--${item.status.toLowerCase()}`}>{item.status}</span>
                    </td>
                    <td className="table-actions">
                      <button onClick={() => setEditing(item)}>Sửa</button>
                      {item.status !== 'ACTIVE' && item.status !== 'EXPIRED' && (
                        <button onClick={() => void updateStatus(item, 'ACTIVE')}>Bật</button>
                      )}
                      {item.status === 'ACTIVE' && (
                        <button onClick={() => void updateStatus(item, 'INACTIVE')}>Tắt</button>
                      )}
                      <button onClick={() => setViewingUsages(item)}>Lịch sử</button>
                      <button className="danger-text" onClick={() => void remove(item)}>
                        Xóa
                      </button>
                    </td>
                  </tr>
                ))}
                {data?.items.length === 0 && (
                  <tr>
                    <td colSpan={7}>
                      <p className="empty-state">Chưa có khuyến mãi nào.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            <Pagination data={data} onPage={setPage} label="mã" />
          </>
        )}
      </section>
      {editing !== undefined && (
        <PromotionForm
          item={editing}
          onClose={() => setEditing(undefined)}
          onSaved={(saved) => {
            setEditing(undefined);
            setMessage(`Đã lưu mã ${saved.code}. Mã mới tạo ở trạng thái DRAFT, hãy bật khi sẵn sàng.`);
            void load();
          }}
        />
      )}
      {viewingUsages && <PromotionUsageModal item={viewingUsages} onClose={() => setViewingUsages(null)} />}
    </>
  );
}

function PromotionForm({
  item,
  onClose,
  onSaved,
}: {
  item: Promotion | null;
  onClose: () => void;
  onSaved: (item: Promotion) => void;
}) {
  const [form, setForm] = useState({
    name: item?.name ?? '',
    code: item?.code ?? '',
    description: item?.description ?? '',
    type: item?.type ?? 'PERCENTAGE',
    discountValue: String(item?.discountValue ?? ''),
    maxDiscountAmount: item?.maxDiscountAmount == null ? '' : String(item.maxDiscountAmount),
    minOrderAmount: String(item?.minOrderAmount ?? 0),
    startAt: asLocalInput(item?.startAt),
    endAt: asLocalInput(item?.endAt ?? new Date(Date.now() + 7 * 86_400_000).toISOString()),
    usageLimit: String(item?.usageLimit ?? 0),
    perUserLimit: String(item?.perUserLimit ?? 0),
  });
  const [scopes, setScopes] = useState<PromotionScope[]>(item?.scopes ?? []);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [scopeType, setScopeType] = useState<ScopeType>('CATEGORY');
  const [scopeProductId, setScopeProductId] = useState('');
  const [scopeTargetId, setScopeTargetId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void Promise.all([
      apiRequest<Category[]>('/categories'),
      apiRequest<Page<Product>>('/products/management?page=1&size=100'),
    ])
      .then(([groups, productPage]) => {
        setCategories(groups);
        setProducts(productPage.items);
      })
      .catch((cause: unknown) => setError(apiError(cause)));
  }, []);
  useEffect(() => {
    setScopeTargetId('');
    if (scopeType !== 'VARIANT' || !scopeProductId) {
      setVariants([]);
      return;
    }
    void apiRequest<Variant[]>(`/products/management/${scopeProductId}/variants`)
      .then(setVariants)
      .catch((cause: unknown) => setError(apiError(cause)));
  }, [scopeType, scopeProductId]);

  const targets = useMemo(
    () =>
      scopeType === 'CATEGORY'
        ? categories.map((value) => ({ id: value.id, name: value.name }))
        : scopeType === 'PRODUCT'
          ? products.map((value) => ({ id: value.id, name: value.name }))
          : variants.map((value) => ({
              id: value.id,
              name: `${value.sku} · ${value.name}`,
            })),
    [categories, products, scopeType, variants],
  );
  const change = (key: keyof typeof form, value: string) => setForm((current) => ({ ...current, [key]: value }));
  function addScope() {
    const target = targets.find((value) => value.id === scopeTargetId);
    if (!target || scopes.some((scope) => scope.type === scopeType && scope.targetId === target.id)) return;
    setScopes((current) => [
      ...current,
      {
        id: `${scopeType}-${target.id}`,
        type: scopeType,
        targetId: target.id,
        targetName: target.name,
      },
    ]);
    setScopeTargetId('');
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const saved = await apiRequest<Promotion>(item ? `/promotions/${item.id}` : '/promotions', {
        method: item ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          discountValue: Number(form.discountValue),
          maxDiscountAmount: form.maxDiscountAmount.trim() ? Number(form.maxDiscountAmount) : null,
          minOrderAmount: Number(form.minOrderAmount),
          usageLimit: Number(form.usageLimit),
          perUserLimit: Number(form.perUserLimit),
          startAt: new Date(form.startAt).toISOString(),
          endAt: new Date(form.endAt).toISOString(),
          scopes: scopes.map(({ type, targetId }) => ({ type, targetId })),
        }),
      });
      onSaved(saved);
    } catch (cause) {
      setError(apiError(cause));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title={item ? `Sửa mã ${item.code}` : 'Tạo khuyến mãi'} onClose={onClose} wide>
      <form className="admin-form" onSubmit={(event) => void submit(event)}>
        <div className="form-grid">
          <label>
            Tên chương trình
            <input
              value={form.name}
              maxLength={160}
              onChange={(event) => change('name', event.target.value)}
              required
              autoFocus
            />
          </label>
          <label>
            Mã giảm giá
            <input
              value={form.code}
              maxLength={60}
              onChange={(event) => change('code', event.target.value.toUpperCase().replace(/\s/g, ''))}
              required
            />
            <small>Không dùng dấu cách.</small>
          </label>
        </div>
        <label>
          Mô tả
          <textarea
            rows={3}
            maxLength={5000}
            value={form.description}
            onChange={(event) => change('description', event.target.value)}
          />
        </label>
        <div className="form-grid">
          <label>
            Loại giảm giá
            <select value={form.type} onChange={(event) => change('type', event.target.value)}>
              <option value="PERCENTAGE">Theo phần trăm</option>
              <option value="FIXED_AMOUNT">Số tiền cố định</option>
            </select>
          </label>
          <label>
            {form.type === 'PERCENTAGE' ? 'Phần trăm giảm' : 'Số tiền giảm'}
            <input
              type="number"
              min="0.01"
              max={form.type === 'PERCENTAGE' ? 100 : undefined}
              step="any"
              value={form.discountValue}
              onChange={(event) => change('discountValue', event.target.value)}
              required
            />
          </label>
          <label>
            Mức giảm tối đa <small>(tuỳ chọn)</small>
            <input
              type="number"
              min="0.01"
              step="any"
              value={form.maxDiscountAmount}
              onChange={(event) => change('maxDiscountAmount', event.target.value)}
            />
          </label>
          <label>
            Đơn tối thiểu
            <input
              type="number"
              min="0"
              step="1000"
              value={form.minOrderAmount}
              onChange={(event) => change('minOrderAmount', event.target.value)}
              required
            />
          </label>
        </div>
        <div className="form-grid">
          <label>
            Bắt đầu
            <input
              type="datetime-local"
              value={form.startAt}
              onChange={(event) => change('startAt', event.target.value)}
              required
            />
          </label>
          <label>
            Kết thúc
            <input
              type="datetime-local"
              value={form.endAt}
              onChange={(event) => change('endAt', event.target.value)}
              required
            />
          </label>
          <label>
            Tổng lượt dùng <small>(0 = không giới hạn)</small>
            <input
              type="number"
              min="0"
              value={form.usageLimit}
              onChange={(event) => change('usageLimit', event.target.value)}
              required
            />
          </label>
          <label>
            Lượt / khách <small>(0 = không giới hạn)</small>
            <input
              type="number"
              min="0"
              value={form.perUserLimit}
              onChange={(event) => change('perUserLimit', event.target.value)}
              required
            />
          </label>
        </div>
        <section className="scope-section">
          <div>
            <strong>Phạm vi áp dụng</strong>
            <p>Không thêm phạm vi nào nghĩa là áp dụng cho toàn cửa hàng.</p>
          </div>
          <div className="scope-picker">
            <select value={scopeType} onChange={(event) => setScopeType(event.target.value as ScopeType)}>
              <option value="CATEGORY">Danh mục</option>
              <option value="PRODUCT">Sản phẩm</option>
              <option value="VARIANT">Variant</option>
            </select>
            {scopeType === 'VARIANT' && (
              <select value={scopeProductId} onChange={(event) => setScopeProductId(event.target.value)}>
                <option value="">Chọn sản phẩm chứa variant</option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name}
                  </option>
                ))}
              </select>
            )}
            <select
              value={scopeTargetId}
              onChange={(event) => setScopeTargetId(event.target.value)}
              disabled={scopeType === 'VARIANT' && !scopeProductId}
            >
              <option value="">
                Chọn {scopeType === 'CATEGORY' ? 'danh mục' : scopeType === 'PRODUCT' ? 'sản phẩm' : 'variant'}
              </option>
              {targets.map((target) => (
                <option key={target.id} value={target.id}>
                  {target.name}
                </option>
              ))}
            </select>
            <button type="button" className="ghost-button" onClick={addScope} disabled={!scopeTargetId}>
              Thêm
            </button>
          </div>
          {scopes.length > 0 && (
            <ul className="scope-list">
              {scopes.map((scope) => (
                <li key={`${scope.type}-${scope.targetId}`}>
                  <span>
                    {scope.type === 'CATEGORY' ? 'Danh mục' : scope.type === 'PRODUCT' ? 'Sản phẩm' : 'Variant'}:{' '}
                    {scope.targetName}
                  </span>
                  <button
                    type="button"
                    aria-label={`Xóa ${scope.targetName}`}
                    onClick={() =>
                      setScopes((current) =>
                        current.filter((value) => value.type !== scope.type || value.targetId !== scope.targetId),
                      )
                    }
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
        {item?.status === 'ACTIVE' && (
          <p className="form-error">
            Mã đang ACTIVE không thể sửa. Hãy tắt mã trước, rồi lưu lại nếu mã chưa có lịch sử sử dụng.
          </p>
        )}
        {error && <p className="form-error">{error}</p>}
        <footer>
          <button type="button" className="ghost-button" onClick={onClose}>
            Hủy
          </button>
          <button className="primary-button compact" disabled={busy || item?.status === 'ACTIVE'}>
            {busy ? 'Đang lưu…' : 'Lưu khuyến mãi'}
          </button>
        </footer>
      </form>
    </Modal>
  );
}

function PromotionUsageModal({ item, onClose }: { item: Promotion; onClose: () => void }) {
  const [data, setData] = useState<Page<PromotionUsage> | null>(null);
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  async function load() {
    setLoading(true);
    try {
      setData(await apiRequest<Page<PromotionUsage>>(`/promotions/${item.id}/usages?page=${page}&size=20`));
    } catch (cause) {
      setError(apiError(cause));
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void load();
  }, [page, item.id]);
  return (
    <Modal title={`Lịch sử dùng mã ${item.code}`} onClose={onClose} wide>
      <p className="usage-intro">
        Theo dõi các lượt giữ mã, dùng thành công, hoàn trả hoặc hết hạn. Số tiền là mức giảm thực tế trên đơn.
      </p>
      {error && <p className="form-error">{error}</p>}
      <div className="usage-table-wrap">
        {loading ? (
          <p className="table-loading">Đang tải lịch sử…</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Đơn hàng</th>
                <th>Mã</th>
                <th>Đơn hợp lệ</th>
                <th>Giảm giá</th>
                <th>Trạng thái</th>
                <th>Thời điểm</th>
              </tr>
            </thead>
            <tbody>
              {data?.items.map((usage) => (
                <tr key={usage.id}>
                  <td>
                    <strong>{usage.orderCode || 'Chưa tạo đơn'}</strong>
                    <small>{usage.orderId ? `#${usage.orderId.slice(0, 8)}` : '—'}</small>
                  </td>
                  <td>
                    <code>{usage.couponCode}</code>
                  </td>
                  <td>{currency.format(usage.eligibleSubtotal)}</td>
                  <td>{currency.format(usage.discountAmount)}</td>
                  <td>
                    <span className={`status status--${usage.status.toLowerCase()}`}>{usage.status}</span>
                  </td>
                  <td>
                    <small>Tạo: {formatTime(usage.createdAt)}</small>
                    {usage.consumedAt && <small>Dùng: {formatTime(usage.consumedAt)}</small>}
                    {usage.releasedAt && <small>Trả: {formatTime(usage.releasedAt)}</small>}
                    {usage.expiresAt && !usage.consumedAt && !usage.releasedAt && (
                      <small>Hết hạn: {formatTime(usage.expiresAt)}</small>
                    )}
                  </td>
                </tr>
              ))}
              {data?.items.length === 0 && (
                <tr>
                  <td colSpan={6}>
                    <p className="empty-state">Mã này chưa có lịch sử sử dụng.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
      <Pagination data={data} onPage={setPage} label="lượt dùng" />
    </Modal>
  );
}
