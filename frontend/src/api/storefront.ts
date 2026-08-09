import { apiRequest } from './http';
import type { Page } from '../types/api';

/** Mirrors ProductImageResponse. */
export type ProductImage = {
  id: string;
  productId: string;
  secureUrl: string;
  altText: string | null;
  sortOrder: number;
  primaryImage: boolean;
  createdAt: string;
};

/** Mirrors ProductResponse (src/main/java/.../dto/response/ProductResponse.java). */
export type Product = {
  id: string;
  categoryId: string;
  categoryName: string;
  categorySlug: string;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  widthCm: number | null;
  heightCm: number | null;
  stockQuantity: number;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  pageCount: number | null;
  coverMaterial: string | null;
  primaryImageUrl: string | null;
  images: ProductImage[];
  createdAt: string;
  updatedAt: string;
  /** Tổng tồn của các variant bán được; bằng stockQuantity nếu sản phẩm không có variant. */
  effectiveStockQuantity: number;
  hasVariants: boolean;
  /**
   * Photobook: giá phụ thuộc số trang nên KHÔNG lấy từ `price` hay `variant.price` —
   * phải hỏi GET /products/{id}/photobook-pricing và gửi kèm `pageCount` khi thêm vào giỏ.
   */
  pagePriced: boolean;
};

/** Mirrors ProductVariantResponse — mỗi variant là một khổ tranh bán được. */
export type ProductVariant = {
  id: string;
  productId: string;
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

/** Mirrors ProductFrameOptionResponse — khung đã gắn cho sản phẩm, kèm phụ thu. */
export type ProductFrameOption = {
  id: string;
  productId: string;
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

/** Mirrors CategoryResponse. */
export type Category = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
};

/** Mirrors ProductCatalogSort. */
export type CatalogSort = 'NEWEST' | 'PRICE_ASC' | 'PRICE_DESC' | 'BEST_SELLING' | 'TRENDING';

/** Query params accepted by GET /api/v1/products (ProductController.findPublished). */
export type CatalogQuery = {
  categoryId?: string;
  keyword?: string;
  minPrice?: number;
  maxPrice?: number;
  material?: string;
  widthCm?: number;
  heightCm?: number;
  sort?: CatalogSort;
  page?: number;
  size?: number;
};

function qs(query: CatalogQuery): string {
  const p = new URLSearchParams();
  Object.entries(query).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') p.set(k, String(v));
  });
  const s = p.toString();
  return s ? `?${s}` : '';
}

/** GET /api/v1/products — published catalogue, paged. */
export function fetchProducts(query: CatalogQuery = {}): Promise<Page<Product>> {
  return apiRequest<Page<Product>>(`/products${qs(query)}`);
}

/** GET /api/v1/products/slug/{slug} */
export function fetchProductBySlug(slug: string): Promise<Product> {
  return apiRequest<Product>(`/products/slug/${encodeURIComponent(slug)}`);
}

/** GET /api/v1/categories */
export function fetchCategories(): Promise<Category[]> {
  return apiRequest<Category[]>('/categories');
}

/** GET /api/v1/products/{id}/variants — chỉ variant của sản phẩm đã publish. */
export function fetchProductVariants(productId: string): Promise<ProductVariant[]> {
  return apiRequest<ProductVariant[]>(`/products/${productId}/variants`);
}

/**
 * GET /api/v1/products/{id}/frame-options, hoặc bản lọc theo variant khi đã chọn khổ.
 * Backend tự loại khung không vừa kích thước variant (ProductFrameOptionServiceImpl.compatible),
 * nên luôn ưu tiên đường dẫn có variantId để chip khung không bao giờ hiện lựa chọn bị từ chối.
 */
export function fetchProductFrameOptions(productId: string, variantId?: string): Promise<ProductFrameOption[]> {
  const path = variantId
    ? `/products/${productId}/variants/${variantId}/frame-options`
    : `/products/${productId}/frame-options`;
  return apiRequest<ProductFrameOption[]>(path);
}

/**
 * Giá một sản phẩm với lựa chọn hiện tại. Giữ đúng công thức của
 * CartServiceImpl.toItemResponse: giá variant (hoặc giá sản phẩm) cộng phụ thu khung.
 */
export function unitPrice(
  product: Pick<Product, 'price'>,
  variant: Pick<ProductVariant, 'price'> | null,
  frameOption: Pick<ProductFrameOption, 'priceAdjustment'> | null,
): number {
  return (variant ? variant.price : product.price) + (frameOption ? frameOption.priceAdjustment : 0);
}

const VND = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 });

export function formatPrice(value: number | null | undefined): string {
  return value === null || value === undefined ? 'Liên hệ' : VND.format(value);
}

/** "60 × 80 cm" — bỏ số 0 thừa; null nếu sản phẩm chưa khai kích thước. */
export function formatSize(w: number | null, h: number | null): string | null {
  if (w === null || h === null) return null;
  const n = (x: number) => String(Number(x));
  return `${n(w)} × ${n(h)} cm`;
}
