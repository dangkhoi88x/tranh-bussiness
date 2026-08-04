import { useCallback, useEffect, useState } from "react";
import { apiRequest } from "../api/http";
import type { Page } from "../types/api";

const errorText = (error: unknown) =>
  error instanceof Error ? error.message : "Đã có lỗi xảy ra.";

export function usePagedRequest<T>(path: string) {
  const [data, setData] = useState<Page<T> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await apiRequest<Page<T>>(path));
    } catch (cause) {
      setError(errorText(cause));
    } finally {
      setLoading(false);
    }
  }, [path]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { data, loading, error, reload };
}
