import { useCallback, useEffect, useState } from 'react';
import {
  addCartItem,
  clearCart,
  fetchCart,
  removeCartItem,
  updateCartItem,
  type AddCartItemInput,
  type Cart,
} from '../api/cart';
import { useAuth } from '../contexts/AuthContext';

/**
 * Giỏ hàng của người đang đăng nhập. Khách vãng lai không có giỏ trên server
 * (CartController đọc userId từ JWT) nên hook trả giỏ rỗng và để trang gọi
 * quyết định điều hướng sang /auth.
 *
 * `loading` để trang giỏ hàng phân biệt "đang nạp" với "giỏ trống" — cả hai đều
 * cho cart = null nên nếu chỉ nhìn cart sẽ loé màn hình rỗng trước khi dữ liệu về.
 */
export function useCart() {
  const { session } = useAuth();
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!session) { setCart(null); setLoading(false); return; }
    setLoading(true);
    try {
      setCart(await fetchCart());
    } catch {
      setCart(null);
    } finally {
      setLoading(false);
    }
  }, [session?.userId]);

  useEffect(() => { void reload(); }, [reload]);

  // add và update trả về giỏ mới nên dùng thẳng; remove và clear trả 204 nên phải nạp lại.
  const add = useCallback(async (input: AddCartItemInput) => {
    const next = await addCartItem(input);
    setCart(next);
    return next;
  }, []);

  const update = useCallback(async (itemId: string, quantity: number) => {
    const next = await updateCartItem(itemId, quantity);
    setCart(next);
    return next;
  }, []);

  const remove = useCallback(async (itemId: string) => {
    await removeCartItem(itemId);
    await reload();
  }, [reload]);

  const clear = useCallback(async () => {
    await clearCart();
    await reload();
  }, [reload]);

  return { cart, loading, count: cart?.totalQuantity ?? 0, add, update, remove, clear, reload };
}
