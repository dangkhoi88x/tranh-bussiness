import { apiRequest } from './http';
import type { Product, ProductVariant } from './storefront';

export type WishlistItem = {
  id: string;
  product: Product;
  selectedVariant: ProductVariant | null;
  primaryImageUrl: string | null;
  createdAt: string;
};

export type Wishlist = { items: WishlistItem[]; totalItems: number };

export function fetchWishlist(): Promise<Wishlist> {
  return apiRequest<Wishlist>('/wishlist');
}

export function addWishlistItem(productId: string, productVariantId?: string | null): Promise<WishlistItem> {
  return apiRequest<WishlistItem>('/wishlist', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ productId, productVariantId: productVariantId || undefined }),
  });
}

export function removeWishlistItem(itemId: string): Promise<void> {
  return apiRequest<void>(`/wishlist/${itemId}`, { method: 'DELETE' });
}
