import { apiRequest } from './http';
import type { PhotobookTemplate, PresetCaption } from '../data/photobookTemplates';

/** Mirrors PhotobookTemplateResponse. */
export type PhotobookTemplateRow = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  icon: string | null;
  layoutCycle: string[];
  spreadColors: string[];
  presetCaptions: PresetCaption[];
  defaultFont: string;
  defaultCaptionColor: string;
  defaultTemplate: boolean;
  active: boolean;
  sortOrder: number;
};

/** Mirrors SavePhotobookTemplateRequest — tạo và cập nhật dùng chung một body. */
export type SavePhotobookTemplateInput = Omit<PhotobookTemplateRow, 'id'>;

/** GET /api/v1/photobook-templates — công khai, chỉ trả chủ đề đang bật. */
export function fetchPhotobookTemplates(): Promise<PhotobookTemplateRow[]> {
  return apiRequest<PhotobookTemplateRow[]>('/photobook-templates');
}

/** GET /api/v1/photobook-templates/management — kèm cả chủ đề đã ẩn; cần PRODUCT_MANAGE. */
export function fetchPhotobookTemplatesForManagement(): Promise<PhotobookTemplateRow[]> {
  return apiRequest<PhotobookTemplateRow[]>('/photobook-templates/management');
}

export function createPhotobookTemplate(input: SavePhotobookTemplateInput): Promise<PhotobookTemplateRow> {
  return apiRequest<PhotobookTemplateRow>('/photobook-templates', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
}

export function updatePhotobookTemplate(id: string, input: SavePhotobookTemplateInput): Promise<PhotobookTemplateRow> {
  return apiRequest<PhotobookTemplateRow>(`/photobook-templates/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
}

/**
 * Trình sửa định danh chủ đề bằng `id` là chuỗi mã (nó đi thẳng vào giỏ hàng dưới dạng
 * photobookTemplateCode và nằm trong bản nháp đã lưu), nên `code` của server thành `id` ở đây —
 * không dùng UUID, để bản nháp cũ và dòng đơn cũ vẫn khớp.
 */
export function toStoreTemplate(row: PhotobookTemplateRow): PhotobookTemplate {
  return {
    id: row.code,
    name: row.name,
    icon: row.icon ?? '✨',
    defaultFont: row.defaultFont,
    defaultCaptionColor: row.defaultCaptionColor,
    spreadColors: row.spreadColors.length > 0 ? row.spreadColors : ['#ffffff'],
    layoutCycle: row.layoutCycle,
    presetCaptions: row.presetCaptions,
  };
}
