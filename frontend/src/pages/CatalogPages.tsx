import { useEffect, useState, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Modal } from "../components/admin/Modal";
import { Panel } from "../components/admin/Panel";
import { apiRequest, ApiRequestError } from "../api/http";
import {
  getArtOrientation,
  type ArtOrientation,
} from "../constants/artSizes";

type Category = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
};
type Frame = {
  id: string;
  name: string;
  slug: string;
  material: string;
  color: string;
  widthMm: number;
  priceAdjustment: number;
  description: string | null;
  imageUrl: string | null;
  status: "ACTIVE" | "INACTIVE";
};
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
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
};
type ProductImage = {
  id: string;
  secureUrl: string;
  altText: string | null;
  sortOrder: number;
  primaryImage: boolean;
};
type Variant = {
  id: string;
  sku: string;
  name: string;
  widthCm: number;
  heightCm: number;
  artSizeId: string | null;
  artSizeCode: string;
  materialId: string | null;
  material: string;
  price: number;
  stockQuantity: number;
  available: boolean;
};
type Material = {
  id: string;
  code: string;
  name: string;
  scope: "ARTWORK_SURFACE" | "FRAME";
  status: "ACTIVE" | "ARCHIVED";
  sortOrder: number;
  description: string | null;
};
type ArtSize = { id: string; code: string; name: string; widthCm: number | null; heightCm: number | null };
type FrameOption = {
  id: string;
  frameId: string;
  frameName: string;
  frameMaterial: string;
  frameColor: string;
  frameImageUrl: string | null;
  priceAdjustment: number;
  minWidthCm: number | null;
  maxWidthCm: number | null;
  minHeightCm: number | null;
  maxHeightCm: number | null;
  available: boolean;
};

const formatMoney = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});
const number = (value: string) => Number(value);
const optionalNumber = (value: string) =>
  value.trim() === "" ? null : Number(value);
const apiError = (error: unknown) =>
  error instanceof Error ? error.message : "Đã có lỗi xảy ra.";

function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <header className="catalog-header">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
      {action}
    </header>
  );
}

function Message({ text }: { text: string | null }) {
  return text ? (
    <p className="catalog-message" role="status">
      {text}
    </p>
  ) : null;
}

export function CategoriesPage() {
  const [items, setItems] = useState<Category[]>([]);
  const [editing, setEditing] = useState<Category | null | undefined>(
    undefined,
  );
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      setItems(await apiRequest<Category[]>("/categories"));
    } catch (error) {
      setMessage(apiError(error));
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void load();
  }, []);
  async function remove(item: Category) {
    if (!window.confirm(`Xóa danh mục “${item.name}”?`)) return;
    try {
      await apiRequest<void>(`/categories/${item.id}`, { method: "DELETE" });
      setMessage("Đã xóa danh mục.");
      void load();
    } catch (error) {
      setMessage(apiError(error));
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="CATALOG"
        title="Danh mục"
        description="Tạo và tổ chức nhóm tranh để dùng trong cửa hàng."
        action={
          <button
            className="primary-button compact"
            onClick={() => setEditing(null)}
          >
            + Thêm danh mục
          </button>
        }
      />
      <Message text={message} />
      <Panel>
        {loading ? (
          <p>Đang tải danh mục…</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Tên</th>
                <th>Slug</th>
                <th>Mô tả</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td>
                    <strong>{item.name}</strong>
                  </td>
                  <td>
                    <code>{item.slug}</code>
                  </td>
                  <td>{item.description || "—"}</td>
                  <td className="table-actions">
                    <button onClick={() => setEditing(item)}>Sửa</button>
                    <button
                      className="danger-text"
                      onClick={() => void remove(item)}
                    >
                      Xóa
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Panel>
      {editing !== undefined && (
        <CategoryForm
          item={editing}
          onClose={() => setEditing(undefined)}
          onSaved={() => {
            setEditing(undefined);
            setMessage("Đã lưu danh mục.");
            void load();
          }}
        />
      )}
    </>
  );
}

function CategoryForm({
  item,
  onClose,
  onSaved,
}: {
  item: Category | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(item?.name ?? "");
  const [description, setDescription] = useState(item?.description ?? "");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await apiRequest<Category>(
        item ? `/categories/${item.id}` : "/categories",
        {
          method: item ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, description: description || null }),
        },
      );
      onSaved();
    } catch (cause) {
      setError(apiError(cause));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal title={item ? "Sửa danh mục" : "Thêm danh mục"} onClose={onClose}>
      <form className="admin-form" onSubmit={(event) => void submit(event)}>
        <label>
          Tên danh mục
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={100}
            required
            autoFocus
          />
        </label>
        <label>
          Mô tả
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            maxLength={2000}
            rows={4}
          />
        </label>
        {error && <p className="form-error">{error}</p>}
        <footer>
          <button type="button" className="ghost-button" onClick={onClose}>
            Hủy
          </button>
          <button className="primary-button compact" disabled={busy}>
            {busy ? "Đang lưu…" : "Lưu danh mục"}
          </button>
        </footer>
      </form>
    </Modal>
  );
}

export function FramesPage() {
  const [items, setItems] = useState<Frame[]>([]);
  const [editing, setEditing] = useState<Frame | null | undefined>(undefined);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  async function load() {
    setLoading(true);
    try {
      setItems(await apiRequest<Frame[]>("/frames/management"));
    } catch (error) {
      setMessage(apiError(error));
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void load();
  }, []);
  async function remove(item: Frame) {
    if (!window.confirm(`Xóa khung “${item.name}”?`)) return;
    try {
      await apiRequest<void>(`/frames/${item.id}`, { method: "DELETE" });
      setMessage("Đã xóa khung.");
      void load();
    } catch (error) {
      setMessage(apiError(error));
    }
  }
  async function removeImage(item: Frame) {
    if (!window.confirm(`Xóa ảnh của “${item.name}”?`)) return;
    try {
      await apiRequest<void>(`/frames/${item.id}/image`, { method: "DELETE" });
      setMessage("Đã xóa ảnh khung.");
      void load();
    } catch (error) {
      setMessage(apiError(error));
    }
  }
  return (
    <>
      <PageHeader
        eyebrow="CATALOG"
        title="Khung tranh"
        description="Quản lý chất liệu, kích thước, giá cộng thêm và ảnh khung."
        action={
          <button
            className="primary-button compact"
            onClick={() => setEditing(null)}
          >
            + Thêm khung
          </button>
        }
      />
      <Message text={message} />
      <Panel>
        {loading ? (
          <p>Đang tải khung…</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Khung</th>
                <th>Chất liệu</th>
                <th>Giá cộng</th>
                <th>Trạng thái</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td className="frame-cell">
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt="" />
                    ) : (
                      <span className="image-empty">—</span>
                    )}
                    <div>
                      <strong>{item.name}</strong>
                      <small>
                        {item.color} · {item.widthMm} mm
                      </small>
                    </div>
                  </td>
                  <td>{item.material}</td>
                  <td>{formatMoney.format(item.priceAdjustment)}</td>
                  <td>
                    <span
                      className={`status status--${item.status.toLowerCase()}`}
                    >
                      {item.status}
                    </span>
                  </td>
                  <td className="table-actions">
                    <button onClick={() => setEditing(item)}>Sửa</button>
                    {item.imageUrl && (
                      <button onClick={() => void removeImage(item)}>
                        Xóa ảnh
                      </button>
                    )}
                    <button
                      className="danger-text"
                      onClick={() => void remove(item)}
                    >
                      Xóa
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Panel>
      {editing !== undefined && (
        <FrameForm
          item={editing}
          onClose={() => setEditing(undefined)}
          onSaved={() => {
            setEditing(undefined);
            setMessage("Đã lưu khung.");
            void load();
          }}
        />
      )}
    </>
  );
}

function FrameForm({
  item,
  onClose,
  onSaved,
}: {
  item: Frame | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    name: item?.name ?? "",
    material: item?.material ?? "",
    color: item?.color ?? "",
    widthMm: String(item?.widthMm ?? ""),
    priceAdjustment: String(item?.priceAdjustment ?? ""),
    description: item?.description ?? "",
    status: item?.status ?? "ACTIVE",
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
      const saved = await apiRequest<Frame>(
        item ? `/frames/${item.id}` : "/frames",
        {
          method: item ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...form,
            widthMm: number(form.widthMm),
            priceAdjustment: number(form.priceAdjustment),
          }),
        },
      );
      if (file) {
        const body = new FormData();
        body.append("file", file);
        await apiRequest(`/frames/${saved.id}/image`, { method: "POST", body });
      }
      onSaved();
    } catch (cause) {
      setError(apiError(cause));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal title={item ? "Sửa khung" : "Thêm khung"} onClose={onClose}>
      <form className="admin-form" onSubmit={(event) => void submit(event)}>
        <div className="form-grid">
          <label>
            Tên khung
            <input
              value={form.name}
              onChange={(event) => change("name", event.target.value)}
              required
            />
          </label>
          <label>
            Chất liệu
            <input
              value={form.material}
              onChange={(event) => change("material", event.target.value)}
              required
            />
          </label>
          <label>
            Màu sắc
            <input
              value={form.color}
              onChange={(event) => change("color", event.target.value)}
              required
            />
          </label>
          <label>
            Độ rộng (mm)
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={form.widthMm}
              onChange={(event) => change("widthMm", event.target.value)}
              required
            />
          </label>
          <label>
            Giá cộng thêm
            <input
              type="number"
              min="0"
              step="1000"
              value={form.priceAdjustment}
              onChange={(event) =>
                change("priceAdjustment", event.target.value)
              }
              required
            />
          </label>
          <label>
            Trạng thái
            <select
              value={form.status}
              onChange={(event) => change("status", event.target.value)}
            >
              <option value="ACTIVE">ACTIVE</option>
              <option value="INACTIVE">INACTIVE</option>
            </select>
          </label>
        </div>
        <label>
          Mô tả
          <textarea
            rows={3}
            value={form.description}
            onChange={(event) => change("description", event.target.value)}
          />
        </label>
        <label>
          Ảnh khung{" "}
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
            {busy ? "Đang lưu…" : "Lưu khung"}
          </button>
        </footer>
      </form>
    </Modal>
  );
}

export function ProductDetailPage() {
  const { productId } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState<Product | null>(null);
  const [tab, setTab] = useState<"images" | "variants" | "frames">("images");
  const [message, setMessage] = useState<string | null>(null);
  async function load() {
    try {
      setProduct(
        await apiRequest<Product>(`/products/management/${productId}`),
      );
    } catch (error) {
      setMessage(apiError(error));
    }
  }
  useEffect(() => {
    void load();
  }, [productId]);
  if (!product)
    return (
      <section className="admin-page">
        <p>{message || "Đang tải sản phẩm…"}</p>
        <button
          className="ghost-button"
          onClick={() => navigate("/admin/products")}
        >
          ← Quay lại danh sách
        </button>
      </section>
    );
  return (
    <>
      <PageHeader
        eyebrow="SẢN PHẨM"
        title={product.name}
        description={`${product.categoryName} · ${formatMoney.format(product.price)} · ${product.status}`}
        action={
          <button
            className="ghost-button"
            onClick={() => navigate("/admin/products")}
          >
            ← Danh sách
          </button>
        }
      />
      <Message text={message} />
      <div className="detail-tabs" role="tablist">
        <button
          className={tab === "images" ? "is-active" : ""}
          onClick={() => setTab("images")}
        >
          Ảnh
        </button>
        <button
          className={tab === "variants" ? "is-active" : ""}
          onClick={() => setTab("variants")}
        >
          Variants
        </button>
        <button
          className={tab === "frames" ? "is-active" : ""}
          onClick={() => setTab("frames")}
        >
          Frame options
        </button>
      </div>
      {tab === "images" && (
        <ImagesTab productId={product.id} onMessage={setMessage} />
      )}
      {tab === "variants" && (
        <VariantsTab productId={product.id} onMessage={setMessage} />
      )}
      {tab === "frames" && (
        <FrameOptionsTab productId={product.id} onMessage={setMessage} />
      )}
    </>
  );
}

function ImagesTab({
  productId,
  onMessage,
}: {
  productId: string;
  onMessage: (text: string) => void;
}) {
  const [items, setItems] = useState<ProductImage[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [movingImageId, setMovingImageId] = useState<string | null>(null);
  async function load() {
    try {
      setItems(
        await apiRequest<ProductImage[]>(
          `/products/management/${productId}/images`,
        ),
      );
    } catch (error) {
      onMessage(apiError(error));
    }
  }
  useEffect(() => {
    void load();
  }, [productId]);
  async function upload(event: FormEvent) {
    event.preventDefault();
    if (!file) return;
    setBusy(true);
    try {
      const body = new FormData();
      body.append("file", file);
      await apiRequest(`/products/${productId}/images`, {
        method: "POST",
        body,
      });
      setFile(null);
      onMessage("Đã upload ảnh.");
      void load();
    } catch (error) {
      onMessage(apiError(error));
    } finally {
      setBusy(false);
    }
  }
  async function update(image: ProductImage, patch: Record<string, unknown>) {
    try {
      await apiRequest(`/products/${productId}/images/${image.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      onMessage("Đã cập nhật ảnh.");
      void load();
    } catch (error) {
      onMessage(apiError(error));
    }
  }
  async function move(image: ProductImage, direction: -1 | 1) {
    const orderedItems = [...items].sort(
      (left, right) => left.sortOrder - right.sortOrder,
    );
    const currentIndex = orderedItems.findIndex((item) => item.id === image.id);
    const adjacentImage = orderedItems[currentIndex + direction];
    if (!adjacentImage) return;
    const imageBecomesFirst = currentIndex + direction === 0;
    const adjacentImageBecomesFirst = currentIndex === 0;

    setMovingImageId(image.id);
    try {
      await Promise.all([
        apiRequest(`/products/${productId}/images/${image.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sortOrder: adjacentImage.sortOrder,
            ...(imageBecomesFirst ? { primaryImage: true } : {}),
          }),
        }),
        apiRequest(`/products/${productId}/images/${adjacentImage.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sortOrder: image.sortOrder,
            ...(adjacentImageBecomesFirst ? { primaryImage: true } : {}),
          }),
        }),
      ]);
      await load();
      onMessage("Đã đổi vị trí ảnh.");
    } catch (error) {
      onMessage(apiError(error));
    } finally {
      setMovingImageId(null);
    }
  }
  async function remove(image: ProductImage) {
    if (!window.confirm("Xóa ảnh này?")) return;
    try {
      await apiRequest<void>(`/products/${productId}/images/${image.id}`, {
        method: "DELETE",
      });
      onMessage("Đã xóa ảnh.");
      void load();
    } catch (error) {
      onMessage(apiError(error));
    }
  }
  return (
    <Panel>
      <form className="upload-row" onSubmit={(event) => void upload(event)}>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          required
        />
        <button className="primary-button compact" disabled={busy}>
          {busy ? "Đang upload…" : "Upload ảnh"}
        </button>
      </form>
      <div className="image-grid">
        {[...items]
          .sort((left, right) => left.sortOrder - right.sortOrder)
          .map((image, index, orderedItems) => (
          <article className="image-card" key={image.id}>
            <img src={image.secureUrl} alt={image.altText || ""} />
            <div>
              <label>
                Alt text
                <input
                  defaultValue={image.altText || ""}
                  onBlur={(event) => {
                    if (event.target.value !== (image.altText || ""))
                      void update(image, { altText: event.target.value });
                  }}
                />
              </label>
              <div className="image-card__position" aria-label="Vị trí ảnh">
                <span>Vị trí {index + 1}</span>
                <div>
                  <button
                    type="button"
                    className="image-position-button"
                    disabled={index === 0 || movingImageId !== null}
                    aria-label="Đưa ảnh sang trái"
                    title="Đưa ảnh sang trái"
                    onClick={() => void move(image, -1)}
                  >
                    ←
                  </button>
                  <button
                    type="button"
                    className="image-position-button"
                    disabled={index === orderedItems.length - 1 || movingImageId !== null}
                    aria-label="Đưa ảnh sang phải"
                    title="Đưa ảnh sang phải"
                    onClick={() => void move(image, 1)}
                  >
                    →
                  </button>
                </div>
              </div>
              <div className="image-card__actions">
                <button
                  type="button"
                  disabled={image.primaryImage}
                  onClick={() => void update(image, { primaryImage: true })}
                >
                  {image.primaryImage ? "Ảnh chính" : "Đặt ảnh chính"}
                </button>
                <button
                  type="button"
                  className="danger-text"
                  onClick={() => void remove(image)}
                >
                  Xóa
                </button>
              </div>
            </div>
          </article>
          ))}
      </div>
      {items.length === 0 && (
        <p className="empty-state">
          Chưa có ảnh. Upload JPEG, PNG hoặc WebP để bắt đầu.
        </p>
      )}
    </Panel>
  );
}

function VariantsTab({
  productId,
  onMessage,
}: {
  productId: string;
  onMessage: (text: string) => void;
}) {
  const [items, setItems] = useState<Variant[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [artSizes, setArtSizes] = useState<ArtSize[]>([]);
  const [editing, setEditing] = useState<Variant | null | undefined>(undefined);
  async function load() {
    try {
      const [variants, availableMaterials, availableSizes] = await Promise.all([
        apiRequest<Variant[]>(`/products/management/${productId}/variants`),
        apiRequest<Material[]>("/materials?scope=ARTWORK_SURFACE"),
        apiRequest<ArtSize[]>("/art-sizes"),
      ]);
      setItems(variants);
      setMaterials(availableMaterials);
      setArtSizes(availableSizes);
    } catch (error) {
      onMessage(apiError(error));
    }
  }
  useEffect(() => {
    void load();
  }, [productId]);
  async function remove(item: Variant) {
    if (!window.confirm(`Xóa variant ${item.sku}?`)) return;
    try {
      await apiRequest<void>(`/products/${productId}/variants/${item.id}`, {
        method: "DELETE",
      });
      onMessage("Đã xóa variant.");
      void load();
    } catch (error) {
      onMessage(apiError(error));
    }
  }
  return (
    <Panel>
      <div className="panel-heading">
        <div>
          <h3>Variants</h3>
          <p>Mỗi variant có SKU, kích thước, vật liệu, giá và tồn kho riêng.</p>
        </div>
        <button
          className="primary-button compact"
          onClick={() => setEditing(null)}
        >
          + Thêm variant
        </button>
      </div>
      <table className="data-table">
        <thead>
          <tr>
            <th>SKU</th>
            <th>Kích thước</th>
            <th>Vật liệu</th>
            <th>Giá</th>
            <th>Tồn</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id}>
              <td>
                <strong>{item.sku}</strong>
                <small>{item.name}</small>
              </td>
              <td>
                {item.artSizeCode !== "CUSTOM" && (
                  <strong>{item.artSizeCode}</strong>
                )}
                <span>
                  {item.widthCm} × {item.heightCm} cm
                </span>
              </td>
              <td>{item.material}</td>
              <td>{formatMoney.format(item.price)}</td>
              <td>{item.stockQuantity}</td>
              <td className="table-actions">
                <button onClick={() => setEditing(item)}>Sửa</button>
                <button
                  className="danger-text"
                  onClick={() => void remove(item)}
                >
                  Xóa
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {items.length === 0 && <p className="empty-state">Chưa có variant.</p>}
      {editing !== undefined && (
        <VariantForm
          item={editing}
          productId={productId}
          materials={materials}
          artSizes={artSizes}
          onClose={() => setEditing(undefined)}
          onSaved={() => {
            setEditing(undefined);
            onMessage("Đã lưu variant.");
            void load();
          }}
        />
      )}
    </Panel>
  );
}

function VariantForm({
  item,
  productId,
  materials,
  artSizes,
  onClose,
  onSaved,
}: {
  item: Variant | null;
  productId: string;
  materials: Material[];
  artSizes: ArtSize[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    sku: item?.sku ?? "",
    name: item?.name ?? "",
    widthCm: String(item?.widthCm ?? ""),
    heightCm: String(item?.heightCm ?? ""),
    artSizeId: item?.artSizeId ?? artSizes.find((size) => size.code === "CUSTOM")?.id ?? "",
    materialId: item?.materialId ?? "",
    price: String(item?.price ?? ""),
    stockQuantity: String(item?.stockQuantity ?? 0),
    available: item?.available ?? true,
  });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [orientation, setOrientation] = useState<ArtOrientation>(() =>
    getArtOrientation(item?.widthCm ?? null, item?.heightCm ?? null),
  );
  const change = (key: keyof typeof form, value: string | boolean) =>
    setForm({ ...form, [key]: value } as typeof form);
  const applyArtSize = (artSizeId: string, nextOrientation = orientation) => {
    const dimensions = artSizes.find((size) => size.id === artSizeId);
    setForm({ ...form, artSizeId });
    if (dimensions?.widthCm != null && dimensions.heightCm != null) {
      setForm({
        ...form,
        artSizeId,
        widthCm: String(nextOrientation === "PORTRAIT" ? dimensions.widthCm : dimensions.heightCm),
        heightCm: String(nextOrientation === "PORTRAIT" ? dimensions.heightCm : dimensions.widthCm),
      });
    }
  };
  const changeOrientation = (nextOrientation: ArtOrientation) => {
    setOrientation(nextOrientation);
    applyArtSize(form.artSizeId, nextOrientation);
  };
  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      await apiRequest(
        item
          ? `/products/${productId}/variants/${item.id}`
          : `/products/${productId}/variants`,
        {
          method: item ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...form,
            widthCm: number(form.widthCm),
            heightCm: number(form.heightCm),
            price: number(form.price),
            stockQuantity: number(form.stockQuantity),
          }),
        },
      );
      onSaved();
    } catch (cause) {
      setError(apiError(cause));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal title={item ? "Sửa variant" : "Thêm variant"} onClose={onClose}>
      <form className="admin-form" onSubmit={(event) => void submit(event)}>
        <div className="form-grid">
          <label>
            SKU
            <input
              value={form.sku}
              onChange={(event) => change("sku", event.target.value)}
              required
            />
          </label>
          <label>
            Tên variant
            <input
              value={form.name}
              onChange={(event) => change("name", event.target.value)}
              required
            />
          </label>
          <label>
            Khổ tranh chuẩn
            <select
              value={form.artSizeId}
              onChange={(event) => applyArtSize(event.target.value)}
            >
              {artSizes.map((size) => (
                <option key={size.id} value={size.id}>
                  {size.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Chiều treo
            <select
              value={orientation}
              disabled={artSizes.find((size) => size.id === form.artSizeId)?.code === "CUSTOM"}
              onChange={(event) =>
                changeOrientation(event.target.value as ArtOrientation)
              }
            >
              <option value="PORTRAIT">Dọc</option>
              <option value="LANDSCAPE">Ngang</option>
            </select>
          </label>
          <label>
            Rộng (cm)
            <input
              type="number"
              min="0.01"
              value={form.widthCm}
              onChange={(event) => {
                change("widthCm", event.target.value);
              }}
              required
            />
          </label>
          <label>
            Cao (cm)
            <input
              type="number"
              min="0.01"
              value={form.heightCm}
              onChange={(event) => {
                change("heightCm", event.target.value);
              }}
              required
            />
          </label>
          <label>
            Vật liệu
            <select
              value={form.materialId}
              onChange={(event) => change("materialId", event.target.value)}
              required
            >
              <option value="">Chọn chất liệu</option>
              {materials.map((material) => (
                <option key={material.id} value={material.id}>
                  {material.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Giá
            <input
              type="number"
              min="1"
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
              onChange={(event) => change("stockQuantity", event.target.value)}
              required
            />
          </label>
          <label className="check-label">
            <input
              type="checkbox"
              checked={form.available}
              onChange={(event) => change("available", event.target.checked)}
            />{" "}
            Có thể bán
          </label>
        </div>
        {error && <p className="form-error">{error}</p>}
        <footer>
          <button type="button" className="ghost-button" onClick={onClose}>
            Hủy
          </button>
          <button className="primary-button compact" disabled={busy}>
            {busy ? "Đang lưu…" : "Lưu variant"}
          </button>
        </footer>
      </form>
    </Modal>
  );
}

function FrameOptionsTab({
  productId,
  onMessage,
}: {
  productId: string;
  onMessage: (text: string) => void;
}) {
  const [items, setItems] = useState<FrameOption[]>([]);
  const [frames, setFrames] = useState<Frame[]>([]);
  const [editing, setEditing] = useState<FrameOption | null | undefined>(
    undefined,
  );
  async function load() {
    try {
      const [options, availableFrames] = await Promise.all([
        apiRequest<FrameOption[]>(
          `/products/management/${productId}/frame-options`,
        ),
        apiRequest<Frame[]>("/frames/management"),
      ]);
      setItems(options);
      setFrames(availableFrames);
    } catch (error) {
      onMessage(apiError(error));
    }
  }
  useEffect(() => {
    void load();
  }, [productId]);
  async function remove(item: FrameOption) {
    if (!window.confirm(`Gỡ khung “${item.frameName}” khỏi sản phẩm?`)) return;
    try {
      await apiRequest<void>(
        `/products/${productId}/frame-options/${item.id}`,
        { method: "DELETE" },
      );
      onMessage("Đã gỡ lựa chọn khung.");
      void load();
    } catch (error) {
      onMessage(apiError(error));
    }
  }
  return (
    <Panel>
      <div className="panel-heading">
        <div>
          <h3>Frame options</h3>
          <p>
            Giới hạn kích thước đảm bảo mỗi khung chỉ xuất hiện ở sản phẩm tương
            thích.
          </p>
        </div>
        <button
          className="primary-button compact"
          onClick={() => setEditing(null)}
        >
          + Gắn khung
        </button>
      </div>
      <table className="data-table">
        <thead>
          <tr>
            <th>Khung</th>
            <th>Giá cộng</th>
            <th>Giới hạn (cm)</th>
            <th>Trạng thái</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id}>
              <td>
                <strong>{item.frameName}</strong>
                <small>
                  {item.frameMaterial} · {item.frameColor}
                </small>
              </td>
              <td>{formatMoney.format(item.priceAdjustment)}</td>
              <td>
                {item.minWidthCm ?? "—"}–{item.maxWidthCm ?? "—"} ×{" "}
                {item.minHeightCm ?? "—"}–{item.maxHeightCm ?? "—"}
              </td>
              <td>
                <span
                  className={`status status--${item.available ? "active" : "inactive"}`}
                >
                  {item.available ? "ACTIVE" : "INACTIVE"}
                </span>
              </td>
              <td className="table-actions">
                <button onClick={() => setEditing(item)}>Sửa</button>
                <button
                  className="danger-text"
                  onClick={() => void remove(item)}
                >
                  Gỡ
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {items.length === 0 && (
        <p className="empty-state">Chưa gắn khung cho sản phẩm.</p>
      )}
      {editing !== undefined && (
        <FrameOptionForm
          item={editing}
          frames={frames}
          productId={productId}
          onClose={() => setEditing(undefined)}
          onSaved={() => {
            setEditing(undefined);
            onMessage("Đã lưu lựa chọn khung.");
            void load();
          }}
        />
      )}
    </Panel>
  );
}

function FrameOptionForm({
  item,
  frames,
  productId,
  onClose,
  onSaved,
}: {
  item: FrameOption | null;
  frames: Frame[];
  productId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    frameId: item?.frameId ?? "",
    priceAdjustment: String(item?.priceAdjustment ?? 0),
    minWidthCm: item?.minWidthCm == null ? "" : String(item.minWidthCm),
    maxWidthCm: item?.maxWidthCm == null ? "" : String(item.maxWidthCm),
    minHeightCm: item?.minHeightCm == null ? "" : String(item.minHeightCm),
    maxHeightCm: item?.maxHeightCm == null ? "" : String(item.maxHeightCm),
    available: item?.available ?? true,
  });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const change = (key: keyof typeof form, value: string | boolean) =>
    setForm({ ...form, [key]: value } as typeof form);
  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      const body = {
        ...form,
        priceAdjustment: number(form.priceAdjustment),
        minWidthCm: optionalNumber(form.minWidthCm),
        maxWidthCm: optionalNumber(form.maxWidthCm),
        minHeightCm: optionalNumber(form.minHeightCm),
        maxHeightCm: optionalNumber(form.maxHeightCm),
      };
      await apiRequest(
        item
          ? `/products/${productId}/frame-options/${item.id}`
          : `/products/${productId}/frame-options`,
        {
          method: item ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
      );
      onSaved();
    } catch (cause) {
      setError(apiError(cause));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      title={item ? "Sửa lựa chọn khung" : "Gắn khung cho sản phẩm"}
      onClose={onClose}
    >
      <form className="admin-form" onSubmit={(event) => void submit(event)}>
        <div className="form-grid">
          {!item && (
            <label>
              Khung
              <select
                value={form.frameId}
                onChange={(event) => change("frameId", event.target.value)}
                required
              >
                <option value="">Chọn khung</option>
                {frames
                  .filter((frame) => frame.status === "ACTIVE")
                  .map((frame) => (
                    <option value={frame.id} key={frame.id}>
                      {frame.name}
                    </option>
                  ))}
              </select>
            </label>
          )}
          <label>
            Giá cộng thêm
            <input
              type="number"
              min="0"
              value={form.priceAdjustment}
              onChange={(event) =>
                change("priceAdjustment", event.target.value)
              }
              required
            />
          </label>
          <label>
            Rộng tối thiểu
            <input
              type="number"
              min="0.01"
              value={form.minWidthCm}
              onChange={(event) => change("minWidthCm", event.target.value)}
            />
          </label>
          <label>
            Rộng tối đa
            <input
              type="number"
              min="0.01"
              value={form.maxWidthCm}
              onChange={(event) => change("maxWidthCm", event.target.value)}
            />
          </label>
          <label>
            Cao tối thiểu
            <input
              type="number"
              min="0.01"
              value={form.minHeightCm}
              onChange={(event) => change("minHeightCm", event.target.value)}
            />
          </label>
          <label>
            Cao tối đa
            <input
              type="number"
              min="0.01"
              value={form.maxHeightCm}
              onChange={(event) => change("maxHeightCm", event.target.value)}
            />
          </label>
          <label className="check-label">
            <input
              type="checkbox"
              checked={form.available}
              onChange={(event) => change("available", event.target.checked)}
            />{" "}
            Có thể chọn
          </label>
        </div>
        {error && <p className="form-error">{error}</p>}
        <footer>
          <button type="button" className="ghost-button" onClick={onClose}>
            Hủy
          </button>
          <button className="primary-button compact" disabled={busy}>
            {busy ? "Đang lưu…" : "Lưu lựa chọn"}
          </button>
        </footer>
      </form>
    </Modal>
  );
}
