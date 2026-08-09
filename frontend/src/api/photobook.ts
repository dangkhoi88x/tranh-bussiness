import { apiRequest } from './http';

/** Mirrors PhotobookPricingResponse.PageOption. */
export type PhotobookPageOption = {
  pageCount: number;
  price: number;
};

/** Mirrors PhotobookPricingResponse.Size — một khổ sách kèm bảng giá theo số trang. */
export type PhotobookSize = {
  variantId: string;
  sku: string;
  name: string;
  widthCm: number;
  heightCm: number;
  available: boolean;
  pageOptions: PhotobookPageOption[];
};

/** Mirrors PhotobookPricingResponse. */
export type PhotobookPricing = {
  productId: string;
  minPages: number;
  maxPages: number;
  pageStep: number;
  pricePerStep: number;
  sizes: PhotobookSize[];
};

/**
 * GET /api/v1/products/{id}/photobook-pricing
 *
 * Trả thẳng từng mức trang bán được kèm giá, thay vì để frontend tự nội suy: bảng giá của
 * xưởng neo giá cứng ở vài mức và khổ S không suy ra được từ khổ khác. Tự tính ở đây là
 * cách chắc chắn nhất để giá trên trang lệch với giá backend chốt lúc đặt đơn.
 */
export function fetchPhotobookPricing(productId: string): Promise<PhotobookPricing> {
  return apiRequest<PhotobookPricing>(`/products/${productId}/photobook-pricing`);
}

/**
 * Khoảng ảnh cần gửi cho một cuốn. Bảng giá của xưởng ghi 20 trang → 60–80 hình và
 * 30 trang → 90–120 hình, tức 3–4 ảnh mỗi trang.
 */
export const PHOTOS_PER_PAGE_MIN = 3;
export const PHOTOS_PER_PAGE_MAX = 4;

export function photoRangeFor(pageCount: number): { min: number; max: number } {
  return { min: pageCount * PHOTOS_PER_PAGE_MIN, max: pageCount * PHOTOS_PER_PAGE_MAX };
}

/** Số trang gợi ý cho một số lượng ảnh, làm tròn lên mức bán được gần nhất. */
export function suggestPageCount(photoCount: number, options: PhotobookPageOption[]): number | null {
  if (photoCount <= 0 || options.length === 0) return null;
  const enough = options.find((option) => photoRangeFor(option.pageCount).max >= photoCount);
  return (enough ?? options[options.length - 1]).pageCount;
}
