import { apiRequest } from './http';

/**
 * POST /api/v1/photobook-designs — chốt bản thiết kế (layout, ảnh, crop, caption, màu nền)
 * trước khi thêm vào giỏ hàng, cùng payload multipart với photobook-share-previews: một phần
 * "metadata" JSON và mỗi ảnh một phần riêng, khớp nhau qua imageId == tên file.
 */
export async function createPhotobookDesign(
  metadata: {
    productSlug: string;
    sizeLabel: string | null;
    pageCount: number;
    finish: string;
    templateId: string;
    spreads: unknown[];
  },
  images: Map<string, File>,
): Promise<{ id: string }> {
  const formData = new FormData();
  formData.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }), 'metadata.json');
  for (const [imageId, file] of images) {
    formData.append('images', file, imageId);
  }
  return apiRequest<{ id: string }>('/photobook-designs', { method: 'POST', body: formData });
}
