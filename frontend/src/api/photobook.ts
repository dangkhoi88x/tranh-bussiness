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
 * Khoảng ảnh cần gửi khi để XƯỞNG tự bố cục. Bảng giá của xưởng ghi 20 trang → 60–80 hình và
 * 30 trang → 90–120 hình, tức 3–4 ảnh mỗi trang: khách gửi cả bộ để xưởng chọn lọc, nên số này
 * lớn hơn số ảnh thật sự lên trang. Trùng khớp có chủ đích với PhotobookProjectServiceImpl —
 * đây chính là ngưỡng backend chặn ở submit(), sửa một bên phải sửa cả hai.
 *
 * KHÁCH TỰ THIẾT KẾ thì dùng slotCapacityOf() bên pages/photobook/draft.ts: lúc đó khách tự đặt
 * từng tấm vào từng ô nên chỉ cần đúng số ô của chủ đề, không phải khoảng này.
 */
export const PHOTOS_PER_PAGE_MIN = 3;
export const PHOTOS_PER_PAGE_MAX = 4;

export function photoRangeFor(pageCount: number): { min: number; max: number } {
  return { min: pageCount * PHOTOS_PER_PAGE_MIN, max: pageCount * PHOTOS_PER_PAGE_MAX };
}
