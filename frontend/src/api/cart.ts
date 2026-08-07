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
