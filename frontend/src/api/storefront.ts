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
