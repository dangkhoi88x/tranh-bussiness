import { apiRequest } from './http';
import type { ProductFrameOption, ProductVariant } from './storefront';

/** Mirrors CartItemResponse. */
export type CartItem = {
  id: string;
  productId: string;
  productName: string;
  productSlug: string;
  selectedVariant: ProductVariant | null;
  basePrice: number;
  selectedFrameOption: ProductFrameOption | null;
  /** Photobook: số trang đã chọn — nó quyết định basePrice. Null với sản phẩm khác. */
  pageCount: number | null;
  /** Bản thiết kế photobook đã chốt cho dòng này; null nếu khách bỏ qua bước thiết kế. */
  photobookDesignId: string | null;
  /** Mẫu đã chọn cho dòng này; null nếu khách không chọn mẫu nào. */
  photobookTemplateCode: string | null;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
};

/** Mirrors CartResponse. */
export type Cart = {
  id: string;
  items: CartItem[];
  totalQuantity: number;
  subtotal: number;
};

/** Mirrors AddCartItemRequest. Bỏ trống variant/frame nếu sản phẩm không có lựa chọn đó. */
export type AddCartItemInput = {
  productId: string;
  productVariantId?: string | null;
  productFrameOptionId?: string | null;
  /** Bắt buộc với photobook, phải bỏ trống với sản phẩm khác — backend từ chối nếu sai. */
  pageCount?: number | null;
  /** Bản thiết kế đã chốt trước khi thêm vào giỏ; tuỳ chọn — thiếu thì dùng luồng gửi ảnh thủ công sau khi mua. */
  photobookDesignId?: string | null;
  /**
   * Mẫu khách chọn ở trang sản phẩm. Chỉ mẫu này cho xưởng biết dựng cuốn theo chu kỳ bố cục
   * nào khi khách mua trước rồi gửi ảnh sau — bỏ trống thì cuốn ra theo mẫu mặc định.
   */
  photobookTemplateCode?: string | null;
  quantity: number;
};

/** GET /api/v1/cart — cần đăng nhập, backend gắn giỏ theo subject của JWT. */
export function fetchCart(): Promise<Cart> {
  return apiRequest<Cart>('/cart');
}

/** POST /api/v1/cart/items */
export function addCartItem(input: AddCartItemInput): Promise<Cart> {
  return apiRequest<Cart>('/cart/items', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      productId: input.productId,
      productVariantId: input.productVariantId ?? null,
      productFrameOptionId: input.productFrameOptionId ?? null,
      pageCount: input.pageCount ?? null,
      photobookDesignId: input.photobookDesignId ?? null,
      photobookTemplateCode: input.photobookTemplateCode ?? null,
      quantity: input.quantity,
    }),
  });
}

/** PUT /api/v1/cart/items/{itemId} — đặt số lượng tuyệt đối, không phải cộng thêm. */
export function updateCartItem(itemId: string, quantity: number): Promise<Cart> {
  return apiRequest<Cart>(`/cart/items/${itemId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ quantity }),
  });
}

/**
 * DELETE /api/v1/cart/items/{itemId}. Hai hàm xoá dưới đây trả 204 không kèm giỏ mới
 * (khác add/update), nên nơi gọi phải tự nạp lại giỏ.
 */
export function removeCartItem(itemId: string): Promise<void> {
  return apiRequest<void>(`/cart/items/${itemId}`, { method: 'DELETE' });
}

/** DELETE /api/v1/cart */
export function clearCart(): Promise<void> {
  return apiRequest<void>('/cart', { method: 'DELETE' });
}
