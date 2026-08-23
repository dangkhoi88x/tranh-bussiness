import { useEffect, useState } from 'react';
import { fetchCategories, fetchProducts, type CatalogQuery, type Category, type Product } from '../api/storefront';
import type { Page } from '../types/api';

type State<T> = { data: T | null; loading: boolean; error: string | null };

/**
 * Một trang sản phẩm theo query. Query đổi thì gọi lại; huỷ kết quả cũ khi unmount.
 *
 * Truyền null khi chưa đủ điều kiện để hỏi (thường là còn chờ categoryId): hook sẽ không
 * gọi API và ở nguyên trạng thái loading. Không có lối này thì mỗi trang phải nuốt một
 * request thừa nạp nhầm toàn bộ catalogue rồi vứt đi ngay khi có categoryId thật.
 */
export function useProducts(query: CatalogQuery | null): State<Product[]> {
  const [state, setState] = useState<State<Product[]>>({ data: null, loading: true, error: null });
  const key = query === null ? null : JSON.stringify(query);

  useEffect(() => {
    if (key === null) return;
    let alive = true;
    setState((s) => ({ ...s, loading: true, error: null }));
    fetchProducts(JSON.parse(key) as CatalogQuery)
      .then((page) => {
        if (alive) setState({ data: page.items, loading: false, error: null });
      })
      .catch((e: Error) => {
        if (alive) setState({ data: null, loading: false, error: e.message });
      });
    return () => {
      alive = false;
    };
  }, [key]);

  return state;
}

/** Like useProducts but returns the full Page envelope (pagination metadata). */
export function useProductPage(query: CatalogQuery | null): State<Page<Product>> {
  const [state, setState] = useState<State<Page<Product>>>({ data: null, loading: true, error: null });
  const key = query === null ? null : JSON.stringify(query);

  useEffect(() => {
    if (key === null) return;
    let alive = true;
    setState((s) => ({ ...s, loading: true, error: null }));
    fetchProducts(JSON.parse(key) as CatalogQuery)
      .then((page) => {
        if (alive) setState({ data: page, loading: false, error: null });
      })
      .catch((e: Error) => {
        if (alive) setState({ data: null, loading: false, error: e.message });
      });
    return () => {
      alive = false;
    };
  }, [key]);

  return state;
}

export function useCategories(): State<Category[]> {
  const [state, setState] = useState<State<Category[]>>({ data: null, loading: true, error: null });

  useEffect(() => {
    let alive = true;
    fetchCategories()
      .then((items) => {
        if (alive) setState({ data: items, loading: false, error: null });
      })
      .catch((e: Error) => {
        if (alive) setState({ data: null, loading: false, error: e.message });
      });
    return () => {
      alive = false;
    };
  }, []);

  return state;
}
