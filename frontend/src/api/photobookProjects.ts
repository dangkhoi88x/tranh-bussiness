import { apiRequest } from './http';
import type { Page } from '../types/api';

export type PhotobookProjectStatus =
  | 'AWAITING_PHOTOS' | 'PHOTOS_SUBMITTED' | 'PROOF_SENT' | 'REVISION_REQUESTED' | 'APPROVED';

export type PhotobookProofDecision = 'PENDING' | 'APPROVED' | 'REVISION_REQUESTED';

/** Mirrors PhotobookProofResponse — một lần xưởng gửi bản mềm. */
export type PhotobookProof = {
  id: string;
  revision: number;
  /** File gốc (PDF hoặc ảnh) — dùng cho nút tải về. */
  url: string;
  /** Số spread trong bản này. */
  pageCount: number;
  /** Từng spread đã render sẵn thành ảnh, theo thứ tự lật. Xem inline, không cần tải PDF. */
  pageUrls: string[];
  staffNote: string | null;
  decision: PhotobookProofDecision;
  customerNote: string | null;
  decidedAt: string | null;
  createdAt: string;
};

export type PhotobookPhoto = {
  id: string;
  /** URL đã ký, hết hạn theo Cloudinary — đừng cache lại ở client. */
  url: string;
  originalFilename: string | null;
  createdAt: string;
};

/** Mirrors PhotobookProjectResponse. */
export type PhotobookProject = {
  id: string;
  orderId: string;
  orderCode: string;
  orderItemId: string;
  productName: string;
  productSlug: string;
  variantName: string | null;
  pageCount: number;
  status: PhotobookProjectStatus;
  /** Khoảng ảnh nên gửi — do backend tính, đừng nhân lại ở frontend. */
  recommendedPhotosMin: number;
  recommendedPhotosMax: number;
  photoCount: number;
  maxPhotos: number;
  editable: boolean;
  customerNote: string | null;
  submittedAt: string | null;
  revisionCount: number;
  maxRevisions: number;
  /** Có bản mềm đang chờ khách quyết định hay không. */
  awaitingDecision: boolean;
  photos: PhotobookPhoto[];
  proofs: PhotobookProof[];
  createdAt: string;
};

export const PHOTOBOOK_STATUS_LABEL: Record<PhotobookProjectStatus, string> = {
  AWAITING_PHOTOS: 'Chờ bạn gửi ảnh',
  PHOTOS_SUBMITTED: 'Xưởng đang lên layout',
  PROOF_SENT: 'Chờ bạn duyệt bản mềm',
  REVISION_REQUESTED: 'Xưởng đang chỉnh theo góp ý',
  APPROVED: 'Đã duyệt, đang in',
};

export function fetchMyPhotobookProjects(page = 1, size = 10): Promise<Page<PhotobookProject>> {
  return apiRequest<Page<PhotobookProject>>(`/photobook-projects/mine?page=${page}&size=${size}`);
}

export function fetchMyPhotobookProject(id: string): Promise<PhotobookProject> {
  return apiRequest<PhotobookProject>(`/photobook-projects/mine/${id}`);
}

/** POST multipart — không đặt Content-Type thủ công, trình duyệt tự thêm boundary. */
export function uploadPhotobookPhoto(id: string, file: File): Promise<PhotobookProject> {
  const body = new FormData();
  body.append('file', file);
  return apiRequest<PhotobookProject>(`/photobook-projects/mine/${id}/photos`, { method: 'POST', body });
}

export function deletePhotobookPhoto(id: string, photoId: string): Promise<PhotobookProject> {
  return apiRequest<PhotobookProject>(`/photobook-projects/mine/${id}/photos/${photoId}`, { method: 'DELETE' });
}

/** Khách duyệt bản mềm mới nhất, hoặc yêu cầu sửa — từ chối thì bắt buộc nói rõ sửa gì. */
export function decidePhotobookProof(id: string, approved: boolean, customerNote: string): Promise<PhotobookProject> {
  return apiRequest<PhotobookProject>(`/photobook-projects/mine/${id}/proof-decision`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ approved, customerNote: customerNote.trim() || null }),
  });
}

export function submitPhotobookPhotos(id: string, customerNote: string): Promise<PhotobookProject> {
  return apiRequest<PhotobookProject>(`/photobook-projects/mine/${id}/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ customerNote: customerNote.trim() || null }),
  });
}

/* ── Storyboard (bản nháp sắp xếp ảnh vào spread) ── */

/** Mirrors PhotobookSlotDef — vị trí một ô trong archetype, tính theo % của cả spread (0..1). */
export type PhotobookSlotDef = { x: number; y: number; w: number; h: number; bleed: boolean };

/** Mirrors PhotobookLayoutResponse — một archetype bố cục (vd. "Tràn đôi", "Contact sheet"). */
export type PhotobookLayoutOption = { code: string; name: string; slots: PhotobookSlotDef[] };

/** Mirrors PhotobookSpreadResponse.Slot. photoUrl null nghĩa là ô đang trống. */
export type PhotobookArrangementSlot = {
  id: string;
  slotIndex: number;
  photoId: string | null;
  photoUrl: string | null;
  focalX: number;
  focalY: number;
  /** Độ phóng lúc chốt thiết kế (1..3) — chỉ khác 1 khi cuốn được hydrate từ một bản thiết kế. */
  zoom: number;
};

/** Mirrors PhotobookSpreadResponse — một spread cụ thể của cuốn, kèm ô và ảnh đã đặt. */
export type PhotobookArrangementSpread = {
  id: string;
  position: number;
  layoutCode: string;
  backgroundColor: string;
  /** Mảng JSON thô {id,text,x,y,fontSize,color,bold,align,fontFamily} — chỉ khác "[]" khi cuốn được hydrate từ một bản thiết kế. */
  captionsJson: string;
  slots: PhotobookArrangementSlot[];
};

/** Mirrors PhotobookArrangementResponse — toàn bộ storyboard của một cuốn. */
export type PhotobookArrangement = {
  projectId: string;
  /** Chỉ true khi status == PHOTOS_SUBMITTED; các bước sau bản sắp xếp đã bàn giao cho xưởng. */
  editable: boolean;
  layouts: PhotobookLayoutOption[];
  spreads: PhotobookArrangementSpread[];
  /** Ảnh khách gửi dư, chưa được đặt vào ô nào. */
  unplacedPhotos: PhotobookPhoto[];
};

/** Yêu cầu chốt ảnh trước (submit) để storyboard được sinh ra ở backend. */
export function fetchPhotobookArrangement(id: string): Promise<PhotobookArrangement> {
  return apiRequest<PhotobookArrangement>(`/photobook-projects/mine/${id}/arrangement`);
}

export function changeSpreadLayout(id: string, spreadId: string, layoutCode: string): Promise<PhotobookArrangement> {
  return apiRequest<PhotobookArrangement>(`/photobook-projects/mine/${id}/spreads/${spreadId}/layout`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ layoutCode }),
  });
}

/**
 * Gán một ảnh vào một ô. photoId null nghĩa là dọn trống ô đó. Nếu ảnh đang nằm ở ô khác trong
 * cùng cuốn, backend tự hoán vị hai ô cho nhau — gọi hàm này y hệt cho cả hai trường hợp.
 */
export function assignSlotPhoto(id: string, slotId: string, photoId: string | null): Promise<PhotobookArrangement> {
  return apiRequest<PhotobookArrangement>(`/photobook-projects/mine/${id}/slots/${slotId}/photo`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ photoId }),
  });
}

/* ── Phía xưởng (cần quyền CUSTOM_ORDER_MANAGE) ── */

export function fetchPhotobookQueue(
  status: PhotobookProjectStatus | '',
  page = 1,
  size = 20,
): Promise<Page<PhotobookProject>> {
  const query = new URLSearchParams({ page: String(page), size: String(size) });
  if (status) query.set('status', status);
  return apiRequest<Page<PhotobookProject>>(`/photobook-projects?${query.toString()}`);
}

export function fetchPhotobookProject(id: string): Promise<PhotobookProject> {
  return apiRequest<PhotobookProject>(`/photobook-projects/${id}`);
}

/** Xưởng gửi PDF nhiều spread (hoặc một ảnh đơn); backend tự đếm số trang. */
export function uploadPhotobookProof(id: string, file: File, staffNote: string): Promise<PhotobookProject> {
  const body = new FormData();
  body.append('file', file);
  if (staffNote.trim()) body.append('staffNote', staffNote.trim());
  return apiRequest<PhotobookProject>(`/photobook-projects/${id}/proofs`, { method: 'POST', body });
}

/** Định dạng bản mềm backend chấp nhận (CloudinaryMediaStorageService.validateProof). */
export const PROOF_ACCEPT = 'application/pdf,image/jpeg,image/png,image/webp';
