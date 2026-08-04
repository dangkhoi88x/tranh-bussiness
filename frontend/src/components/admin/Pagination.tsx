import type { Page } from "../../types/api";

type PaginationProps = {
  data: Page<unknown> | null;
  onPage: (page: number) => void;
  label?: string;
};

export function Pagination({
  data,
  onPage,
  label = "bản ghi",
}: PaginationProps) {
  if (!data || data.totalPages <= 1) return null;

  return (
    <div className="pagination">
      <button disabled={data.page <= 1} onClick={() => onPage(data.page - 1)}>
        ← Trước
      </button>
      <span>
        Trang {data.page}/{data.totalPages} · {data.totalElements} {label}
      </span>
      <button disabled={!data.hasNext} onClick={() => onPage(data.page + 1)}>
        Sau →
      </button>
    </div>
  );
}
