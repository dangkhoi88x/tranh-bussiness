import { useEffect, useState } from 'react';
import { fetchCategories, fetchProducts, type CatalogQuery, type Category, type Product } from '../api/storefront';

type State<T> = { data: T | null; loading: boolean; error: string | null };

/** Một trang sản phẩm theo query. Query đổi thì gọi lại; huỷ kết quả cũ khi unmount. */
export function useProducts(query: CatalogQuery): State<Product[]> {
  const [state, setState] = useState<State<Product[]>>({ data: null, loading: true, error: null });
  const key = JSON.stringify(query);

  useEffect(() => {
    let alive = true;
    setState((s) => ({ ...s, loading: true, error: null }));
    fetchProducts(JSON.parse(key) as CatalogQuery)
      .then((page) => { if (alive) setState({ data: page.items, loading: false, error: null }); })
      .catch((e: Error) => { if (alive) setState({ data: null, loading: false, error: e.message }); });
    return () => { alive = false; };
  }, [key]);

  return state;
}

export function useCategories(): State<Category[]> {
  const [state, setState] = useState<State<Category[]>>({ data: null, loading: true, error: null });

  useEffect(() => {
    let alive = true;
    fetchCategories()
      .then((items) => { if (alive) setState({ data: items, loading: false, error: null }); })
      .catch((e: Error) => { if (alive) setState({ data: null, loading: false, error: e.message }); });
    return () => { alive = false; };
  }, []);

  return state;
}
