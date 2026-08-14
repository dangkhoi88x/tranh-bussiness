import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { DataTable } from "../components/admin/DataTable";
import { Pagination } from "../components/admin/Pagination";
import { apiRequest } from "../api/http";
import type { Page } from "../types/api";

type Category = { id: string; name: string };
type Material = { id: string; name: string };
type ProductStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";
type Product = {
  id: string;
  categoryId: string;
  categoryName: string;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  widthCm: number | null;
  heightCm: number | null;
  stockQuantity: number;
  effectiveStockQuantity: number;
  hasVariants: boolean;
  primaryImageUrl: string | null;
  status: ProductStatus;
};
const money = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});
const errorText = (error: unknown) =>
  error instanceof Error ? error.message : "Đã có lỗi xảy ra.";

type PageMessage = { tone: "success" | "error"; text: string };

const productStatus = (item: Product) => {
  if (item.status === "DRAFT") return { label: "Bản nháp", tone: "draft" };
  if (item.status === "ARCHIVED") return { label: "Đã lưu trữ", tone: "archived" };
  if (item.effectiveStockQuantity === 0) return { label: "Hết hàng", tone: "sold-out" };
  return { label: "Đang bán", tone: "published" };
};

const stockStatus = (quantity: number) => {
  if (quantity === 0) return { label: "Hết hàng", tone: "empty" };
  if (quantity <= 5) return { label: "Sắp hết", tone: "low" };
  return { label: "Sẵn sàng", tone: "available" };
};

function ProductThumbnail({ item }: { item: Product }) {
  const [failed, setFailed] = useState(false);
  const initial = item.name.trim().charAt(0).toUpperCase() || "T";
  return (
    <div className="product-thumbnail">
      {item.primaryImageUrl && !failed ? (
        <img
          src={item.primaryImageUrl}
          alt={`Ảnh ${item.name}`}
          loading="lazy"
          onError={() => setFailed(true)}
        />
      ) : (
        <span aria-label={`Chưa có ảnh cho ${item.name}`}>{initial}</span>
      )}
    </div>
  );
}

function NoticeIcon({ tone }: { tone: PageMessage["tone"] }) {
  return tone === "error" ? (
    <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">
      <path d="M10 5.2v5.3M10 14.2v.1" />
      <circle cx="10" cy="10" r="7.2" />
    </svg>
  ) : (
    <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">
      <path d="m5.5 10.2 2.8 2.8 6.2-6.4" />
      <circle cx="10" cy="10" r="7.2" />
    </svg>
  );
}

export function ProductsSearchPage() {
  const navigate = useNavigate();
  const [data, setData] = useState<Page<Product> | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [editing, setEditing] = useState<Product | null | undefined>(undefined);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({
    name: "",
    categoryId: "",
    status: "",
    variantSku: "",
    materialId: "",
    effectiveStockLevel: "",
    minPrice: "",
    maxPrice: "",
  });
  const [draft, setDraft] = useState(filters);
  const [message, setMessage] = useState<PageMessage | null>(null);
  const [loading, setLoading] = useState(true);
  const query = useMemo(() => {
    const value = new URLSearchParams({ page: String(page), size: "12" });
    Object.entries(filters).forEach(([key, item]) => {
      if (item) value.set(key, item);
    });
    return value.toString();
  }, [filters, page]);
  async function load() {
    setLoading(true);
    try {
      const [products, groups, availableMaterials] = await Promise.all([
        apiRequest<Page<Product>>(`/products/management?${query}`),
        apiRequest<Category[]>("/categories"),
        apiRequest<Material[]>("/materials?scope=ARTWORK_SURFACE"),
      ]);
      setData(products);
      setCategories(groups);
      setMaterials(availableMaterials);
      setMessage((current) =>
        current?.tone === "error" ? null : current,
      );
    } catch (error) {
      setMessage({ tone: "error", text: errorText(error) });
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void load();
  }, [query]);
  function submit(event: FormEvent) {
    event.preventDefault();
    setPage(1);
    setFilters(draft);
  }
  function reset() {
    const empty = {
      name: "",
      categoryId: "",
      status: "",
      variantSku: "",
      materialId: "",
      effectiveStockLevel: "",
      minPrice: "",
      maxPrice: "",
    };
    setDraft(empty);
    setFilters(empty);
    setPage(1);
  }
  async function remove(product: Product) {
    if (
      !window.confirm(
        `Xóa sản phẩm “${product.name}”? Ảnh và variants cũng sẽ bị xóa.`,
      )
    )
      return;
    try {
      await apiRequest<void>(`/products/${product.id}`, { method: "DELETE" });
      setMessage({ tone: "success", text: "Đã xóa sản phẩm." });
      void load();
    } catch (error) {
      setMessage({ tone: "error", text: errorText(error) });
    }
  }
  return (
    <>
      <header className="catalog-header">
        <div>
          <h2>Sản phẩm</h2>
          <p>
            Bộ sưu tập đang vận hành, từ tranh treo tường đến khung tranh. Ảnh,
            giá và tồn kho được đặt cạnh nhau để bạn ra quyết định nhanh hơn.
          </p>
        </div>
        <button
          className="primary-button compact"
          onClick={() => setEditing(null)}
        >
          + Thêm sản phẩm
        </button>
      </header>
      {message && (
        <p
          className={`catalog-message catalog-message--${message.tone}`}
          role={message.tone === "error" ? "alert" : "status"}
        >
          <span className="catalog-message__icon"><NoticeIcon tone={message.tone} /></span>
          {message.text}
        </p>
      )}
      <section className="catalog-panel product-catalog-panel">
        <form className="product-filters" onSubmit={submit}>
          <div className="product-filters__search">
            <label>
              Tìm sản phẩm
              <input
                value={draft.name}
                placeholder="Tên tranh hoặc tên bộ sưu tập"
                onChange={(event) =>
                  setDraft({ ...draft, name: event.target.value })
                }
              />
            </label>
          </div>
          <fieldset className="product-filters__group">
            <legend>Phân loại</legend>
            <label>
              Danh mục
              <select
                value={draft.categoryId}
                onChange={(event) =>
                  setDraft({ ...draft, categoryId: event.target.value })
                }
              >
                <option value="">Tất cả danh mục</option>
                {categories.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Trạng thái
              <select
                value={draft.status}
                onChange={(event) =>
                  setDraft({ ...draft, status: event.target.value })
                }
              >
                <option value="">Tất cả trạng thái</option>
                <option value="PUBLISHED">Đang bán</option>
                <option value="DRAFT">Bản nháp</option>
                <option value="ARCHIVED">Đã lưu trữ</option>
              </select>
            </label>
          </fieldset>
          <fieldset className="product-filters__group product-filters__group--price">
            <legend>Khoảng giá (VNĐ)</legend>
            <label>
              Từ
              <input
                type="number"
                min="0"
                step="1000"
                inputMode="numeric"
                value={draft.minPrice}
                placeholder="0"
                onChange={(event) =>
                  setDraft({ ...draft, minPrice: event.target.value })
                }
              />
            </label>
            <label>
              Đến
              <input
                type="number"
                min="0"
                step="1000"
                inputMode="numeric"
                value={draft.maxPrice}
                placeholder="Không giới hạn"
                onChange={(event) =>
                  setDraft({ ...draft, maxPrice: event.target.value })
                }
              />
            </label>
          </fieldset>
          <details className="product-filters__advanced">
            <summary>Bộ lọc tồn kho và biến thể</summary>
            <div>
              <label>
                SKU variant
                <input
                  value={draft.variantSku}
                  placeholder="VD: TBS-4060"
                  onChange={(event) =>
                    setDraft({ ...draft, variantSku: event.target.value })
                  }
                />
              </label>
              <label>
                Chất liệu
                <select
                  value={draft.materialId}
                  onChange={(event) =>
                    setDraft({ ...draft, materialId: event.target.value })
                  }
                >
                  <option value="">Tất cả chất liệu</option>
                  {materials.map((material) => <option key={material.id} value={material.id}>{material.name}</option>)}
                </select>
              </label>
              <label>
                Tồn kho có thể bán
                <select
                  value={draft.effectiveStockLevel}
                  onChange={(event) =>
                    setDraft({ ...draft, effectiveStockLevel: event.target.value })
                  }
                >
                  <option value="">Tất cả mức tồn</option>
                  <option value="OUT_OF_STOCK">Hết hàng (0)</option>
                  <option value="LOW_STOCK">Sắp hết (1–5)</option>
                  <option value="IN_STOCK">Còn hàng (≥6)</option>
                </select>
              </label>
            </div>
          </details>
          <div className="product-filters__actions">
            <button className="primary-button compact">Tìm kiếm</button>
            <button type="button" className="ghost-button" onClick={reset}>
              Xóa lọc
            </button>
          </div>
        </form>
        {loading ? (
          <p className="table-loading">Đang tải sản phẩm…</p>
        ) : (
          <>
            <div className="product-table-wrap">
              <div className="product-table__meta">
                <p>
                  <strong>{data?.totalElements ?? 0}</strong> sản phẩm phù hợp
                </p>
                <span>Chọn một hàng để xem và chỉnh sửa chi tiết</span>
              </div>
            <DataTable>
              <thead>
                <tr>
                  <th>Tác phẩm</th>
                  <th>Danh mục</th>
                  <th>Giá</th>
                  <th>Tồn kho</th>
                  <th>Trạng thái</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {data?.items.map((item) => (
                  <tr
                    className="product-row"
                    key={item.id}
                    tabIndex={0}
                    onClick={() => navigate(`/admin/products/${item.id}`)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        navigate(`/admin/products/${item.id}`);
                      }
                    }}
                  >
                    <td data-label="Tác phẩm">
                      <div className="product-row__identity">
                        <ProductThumbnail item={item} />
                        <div>
                          <strong>{item.name}</strong>
                          <small>
                            {item.hasVariants ? "Có lựa chọn biến thể" : "Sản phẩm đơn"}
                            {item.widthCm && item.heightCm
                              ? ` · ${item.widthCm} × ${item.heightCm} cm`
                              : ""}
                          </small>
                        </div>
                      </div>
                    </td>
                    <td data-label="Danh mục">
                      <span className="product-category">{item.categoryName}</span>
                    </td>
                    <td data-label="Giá" className="product-price">
                      <strong>{money.format(item.price)}</strong>
                      <small>{item.hasVariants ? "Giá khởi điểm" : "Giá niêm yết"}</small>
                    </td>
                    <td data-label="Tồn kho">
                      <div className="product-stock">
                        <strong>{item.effectiveStockQuantity}</strong>
                        <span className={`stock-pill stock-pill--${stockStatus(item.effectiveStockQuantity).tone}`}>
                          {stockStatus(item.effectiveStockQuantity).label}
                        </span>
                      </div>
                    </td>
                    <td data-label="Trạng thái">
                      <span
                        className={`status status--${productStatus(item).tone}`}
                      >
                        {productStatus(item).label}
                      </span>
                    </td>
                    <td className="table-actions" data-label="Thao tác">
                      <button
                        onClick={(event) => {
                          event.stopPropagation();
                          navigate(`/admin/products/${item.id}`);
                        }}
                      >
                        Chi tiết
                      </button>
                      <button
                        onClick={(event) => {
                          event.stopPropagation();
                          setEditing(item);
                        }}
                      >
                        Sửa
                      </button>
                      <button
                        className="danger-text"
                        onClick={(event) => {
                          event.stopPropagation();
                          void remove(item);
                        }}
                      >
                        Xóa
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </DataTable>
            </div>
            {data?.items.length === 0 && (
              <section className="product-empty-state">
                <div aria-hidden="true" className="product-empty-state__mark">TB</div>
                <div>
                  <h3>Chưa tìm thấy tác phẩm phù hợp</h3>
                  <p>Hãy thử nới khoảng giá hoặc xóa bộ lọc để xem lại toàn bộ danh mục.</p>
                </div>
                <button type="button" className="ghost-button" onClick={reset}>
                  Xóa toàn bộ lọc
                </button>
              </section>
            )}
            <Pagination data={data} onPage={setPage} label="sản phẩm" />
          </>
        )}
      </section>
      {editing !== undefined && (
        <ProductForm
          item={editing}
          categories={categories}
          onClose={() => setEditing(undefined)}
          onSaved={(savedMessage) => {
            setEditing(undefined);
            setMessage({ tone: "success", text: savedMessage ?? "Đã lưu sản phẩm." });
            void load();
          }}
        />
      )}
    </>
  );
}

function ProductForm({
  item,
  categories,
  onClose,
  onSaved,
}: {
  item: Product | null;
  categories: Category[];
  onClose: () => void;
  onSaved: (message?: string) => void;
}) {
  const [form, setForm] = useState({
    categoryId: item?.categoryId ?? "",
    name: item?.name ?? "",
    description: item?.description ?? "",
    price: String(item?.price ?? ""),
    widthCm: item?.widthCm == null ? "" : String(item.widthCm),
    heightCm: item?.heightCm == null ? "" : String(item.heightCm),
    stockQuantity: String(item?.stockQuantity ?? 0),
    status: item?.status ?? "DRAFT",
  });
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const change = (key: keyof typeof form, value: string) =>
    setForm({ ...form, [key]: value });
  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const saved = await apiRequest<Product>(item ? `/products/${item.id}` : "/products", {
        method: item ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          price: Number(form.price),
          widthCm: form.widthCm ? Number(form.widthCm) : null,
          heightCm: form.heightCm ? Number(form.heightCm) : null,
          stockQuantity: Number(form.stockQuantity),
        }),
      });
      if (file) {
        const body = new FormData();
        body.append("file", file);
        try {
          await apiRequest(`/products/${saved.id}/images`, {
            method: "POST",
            body,
          });
        } catch (uploadError) {
          onSaved(
            `Đã lưu sản phẩm nhưng chưa upload được ảnh: ${errorText(uploadError)}. Bạn có thể tải lại tại Chi tiết.`,
          );
          return;
        }
      }
      onSaved();
    } catch (cause) {
      setError(errorText(cause));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="modal-backdrop">
      <section
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={item ? "Sửa sản phẩm" : "Thêm sản phẩm"}
      >
        <header>
          <h3>{item ? "Sửa sản phẩm" : "Thêm sản phẩm"}</h3>
          <button type="button" className="icon-button" onClick={onClose}>
            ×
          </button>
        </header>
        <form className="admin-form" onSubmit={(event) => void submit(event)}>
          <div className="form-grid">
            <label>
              Danh mục
              <select
                value={form.categoryId}
                onChange={(event) => change("categoryId", event.target.value)}
                required
              >
                <option value="">Chọn danh mục</option>
                {categories.map((category) => (
                  <option value={category.id} key={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Tên sản phẩm
              <input
                value={form.name}
                onChange={(event) => change("name", event.target.value)}
                required
              />
            </label>
            <label>
              Giá gốc
              <input
                type="number"
                min="0"
                step="1000"
                value={form.price}
                onChange={(event) => change("price", event.target.value)}
                required
              />
            </label>
            <label>
              Tồn kho
              <input
                type="number"
                min="0"
                value={form.stockQuantity}
                onChange={(event) =>
                  change("stockQuantity", event.target.value)
                }
                required
              />
            </label>
            <label>
              Rộng (cm)
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={form.widthCm}
                onChange={(event) => change("widthCm", event.target.value)}
              />
            </label>
            <label>
              Cao (cm)
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={form.heightCm}
                onChange={(event) => change("heightCm", event.target.value)}
              />
            </label>
            <label>
              Trạng thái
              <select
                value={form.status}
                onChange={(event) => change("status", event.target.value)}
              >
                <option value="DRAFT">DRAFT</option>
                <option value="PUBLISHED">PUBLISHED</option>
                <option value="ARCHIVED">ARCHIVED</option>
              </select>
            </label>
          </div>
          <label>
            Mô tả
            <textarea
              rows={4}
              value={form.description}
              onChange={(event) => change("description", event.target.value)}
            />
          </label>
          <label>
            Ảnh tranh (tùy chọn)
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            />
          </label>
          {error && <p className="form-error">{error}</p>}
          <footer>
            <button type="button" className="ghost-button" onClick={onClose}>
              Hủy
            </button>
            <button className="primary-button compact" disabled={busy}>
              {busy ? "Đang lưu…" : "Lưu sản phẩm"}
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}
