import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { addWishlistItem, fetchWishlist, removeWishlistItem, type WishlistItem } from '../api/wishlist';
import { useAuth } from './AuthContext';

type WishlistContextValue = {
  items: WishlistItem[];
  loading: boolean;
  error: string | null;
  busyKey: string | null;
  itemFor: (productId: string, variantId?: string | null) => WishlistItem | undefined;
  reload: () => Promise<void>;
  toggle: (productId: string, variantId?: string | null) => Promise<void>;
};

const WishlistContext = createContext<WishlistContextValue | null>(null);
const keyOf = (productId: string, variantId?: string | null) => `${productId}:${variantId ?? ''}`;

export function WishlistProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!session) {
      setItems([]);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setItems((await fetchWishlist()).items);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Không tải được danh sách yêu thích.');
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const itemFor = useCallback(
    (productId: string, variantId?: string | null) =>
      items.find((item) => item.product.id === productId && (item.selectedVariant?.id ?? null) === (variantId ?? null)),
    [items],
  );

  const toggle = useCallback(
    async (productId: string, variantId?: string | null) => {
      if (!session) throw new Error('Đăng nhập để lưu sản phẩm yêu thích.');
      const key = keyOf(productId, variantId);
      const current = itemFor(productId, variantId);
      setBusyKey(key);
      setError(null);
      try {
        if (current) {
          await removeWishlistItem(current.id);
          setItems((saved) => saved.filter((item) => item.id !== current.id));
        } else {
          const added = await addWishlistItem(productId, variantId);
          setItems((saved) => [added, ...saved]);
        }
      } catch (cause) {
        const message = cause instanceof Error ? cause.message : 'Không cập nhật được danh sách yêu thích.';
        setError(message);
        throw new Error(message);
      } finally {
        setBusyKey(null);
      }
    },
    [itemFor, session],
  );

  const value = useMemo(
    () => ({ items, loading, error, busyKey, itemFor, reload, toggle }),
    [busyKey, error, itemFor, items, loading, reload, toggle],
  );
  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
}

export function useWishlist() {
  const context = useContext(WishlistContext);
  if (!context) throw new Error('useWishlist must be used within WishlistProvider');
  return context;
}

export function wishlistKey(productId: string, variantId?: string | null) {
  return keyOf(productId, variantId);
}
