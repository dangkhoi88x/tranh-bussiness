import { useCallback, useEffect, useState } from 'react';
import { addCartItem, fetchCart, type AddCartItemInput, type Cart } from '../api/cart';
import { useAuth } from '../contexts/AuthContext';

/**
 * Giỏ hàng của người đang đăng nhập. Khách vãng lai không có giỏ trên server
 * (CartController đọc userId từ JWT) nên hook trả giỏ rỗng và để trang gọi
 * quyết định điều hướng sang /auth.
 */
export function useCart() {
  const { session } = useAuth();
  const [cart, setCart] = useState<Cart | null>(null);

  const reload = useCallback(() => {
    if (!session) { setCart(null); return; }
    fetchCart().then(setCart).catch(() => setCart(null));
  }, [session?.userId]);

  useEffect(() => { reload(); }, [reload]);

  const add = useCallback(async (input: AddCartItemInput) => {
    const next = await addCartItem(input);
    setCart(next);
    return next;
  }, []);

  return { cart, count: cart?.totalQuantity ?? 0, add, reload };
}
