import { useCallback, useEffect, useState } from 'react';
import { addCartItem, clearCart, fetchCart, removeCartItem, updateCartItem, type Cart } from '../api/cart';
import {
  addGuestCartItem,
  clearGuestCart,
  guestCartChangeEvent,
  mergeGuestCart,
  readGuestCart,
  removeGuestCartItem,
  updateGuestCartItem,
  type GuestCartItemInput,
} from '../api/guestCart';
import { useAuth } from '../contexts/AuthContext';

/**
 * Giỏ hàng của người đang đăng nhập nằm trên server; khách vãng lai dùng
 * localStorage. Sau khi đăng nhập, AuthProvider gộp từng dòng vào server trước
 * khi các trang tải giỏ chính chủ.
 *
 * `loading` để trang giỏ hàng phân biệt lúc đang nạp giỏ server với giỏ rỗng.
 */
export function useCart() {
  const { session } = useAuth();
  const [cart, setCart] = useState<Cart | null>(() => (session ? null : readGuestCart()));
  const [loading, setLoading] = useState(Boolean(session));

  const reload = useCallback(async () => {
    if (!session) {
      setCart(readGuestCart());
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      setCart(await fetchCart());
    } catch {
      setCart(null);
    } finally {
      setLoading(false);
    }
  }, [session?.userId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    const syncGuestCart = () => {
      if (!session) setCart(readGuestCart());
    };
    window.addEventListener(guestCartChangeEvent, syncGuestCart);
    window.addEventListener('storage', syncGuestCart);
    return () => {
      window.removeEventListener(guestCartChangeEvent, syncGuestCart);
      window.removeEventListener('storage', syncGuestCart);
    };
  }, [session?.userId]);

  // add và update trả về giỏ mới nên dùng thẳng; remove và clear trả 204 nên phải nạp lại.
  const add = useCallback(
    async (input: GuestCartItemInput) => {
      if (!session) {
        const next = addGuestCartItem(input);
        setCart(next);
        return next;
      }
      const next = await addCartItem(input);
      setCart(next);
      return next;
    },
    [session?.userId],
  );

  const update = useCallback(
    async (itemId: string, quantity: number) => {
      if (!session) {
        const next = updateGuestCartItem(itemId, quantity);
        setCart(next);
        return next;
      }
      const next = await updateCartItem(itemId, quantity);
      setCart(next);
      return next;
    },
    [session?.userId],
  );

  const remove = useCallback(
    async (itemId: string) => {
      if (!session) {
        setCart(removeGuestCartItem(itemId));
        return;
      }
      await removeCartItem(itemId);
      await reload();
    },
    [reload, session?.userId],
  );

  const clear = useCallback(async () => {
    if (!session) {
      setCart(clearGuestCart());
      return;
    }
    await clearCart();
    await reload();
  }, [reload, session?.userId]);

  const mergePending = useCallback(async () => {
    const result = await mergeGuestCart();
    await reload();
    return result;
  }, [reload]);

  return {
    cart,
    loading,
    count: cart?.totalQuantity ?? 0,
    pendingGuestCount: session ? readGuestCart().items.length : 0,
    add,
    update,
    remove,
    clear,
    reload,
    mergePending,
  };
}
