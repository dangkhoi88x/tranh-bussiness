import { type PhotobookSize } from '../../api/photobook';
import { type Product, type ProductVariant } from '../../api/storefront';
import { type StoredPhotobookDraft } from '../../data/photobookDraft';
import { type PhotobookTemplate } from '../../data/photobookTemplates';
import { layoutByCode } from '../../data/spreadLayouts';

export const FINISHES = ['Eco Matte', 'Eco Silk'];
export const CATALOG_HREF = '/photobook';
export const STEPS = ['Quy cách', 'Thêm ảnh', 'Xem lại'] as const;

export type DraftSlot = {
  imageId: string | null;
  file: File | null;
  preview: string | null;
  zoom: number;
  panX: number;
  panY: number;
};
export type DraftCaption = {
  id: string;
  text: string;
  x: number;
  y: number;
  fontSize: number;
  color: string;
  bold: boolean;
  align: 'left' | 'center' | 'right';
  fontFamily: string;
};
export type DraftSpread = {
  position: number;
  layoutCode: string;
  slots: DraftSlot[];
  captions: DraftCaption[];
  backgroundColor: string;
};
export type SpreadHistory = { past: DraftSpread[]; future: DraftSpread[] };
export type AutoFillResult = { placed: number; remaining: number };

export const HISTORY_LIMIT = 30;

export const CAPTION_COLORS = ['#1a1a1a', '#ffffff', '#8b4513', '#c0392b', '#2c3e50', '#27ae60', '#8e44ad', '#e67e22'];
export const CAPTION_SIZES: { label: string; value: number }[] = [
  { label: 'Nhỏ', value: 2.5 },
  { label: 'Vừa', value: 4 },
  { label: 'Lớn', value: 6 },
  { label: 'Rất lớn', value: 8 },
];
export const CAPTION_FONTS: { label: string; value: string; fallback: string }[] = [
  { label: 'Mặc định', value: 'Archivo', fallback: 'sans-serif' },
  { label: 'Playfair', value: 'Playfair Display', fallback: 'serif' },
  { label: 'Lora', value: 'Lora', fallback: 'serif' },
  { label: 'Cormorant', value: 'Cormorant Garamond', fallback: 'serif' },
  { label: 'Spectral', value: 'Spectral', fallback: 'serif' },
  { label: 'Montserrat', value: 'Montserrat', fallback: 'sans-serif' },
  { label: 'Quicksand', value: 'Quicksand', fallback: 'sans-serif' },
  { label: 'Dancing Script', value: 'Dancing Script', fallback: 'cursive' },
  { label: 'Great Vibes', value: 'Great Vibes', fallback: 'cursive' },
  { label: 'Pacifico', value: 'Pacifico', fallback: 'cursive' },
];

export const emptyDraftSlot = (): DraftSlot => ({
  imageId: null,
  file: null,
  preview: null,
  zoom: 1,
  panX: 0,
  panY: 0,
});

export function newCaption(): DraftCaption {
  return {
    id: newImageId(),
    text: '',
    x: 0.5,
    y: 0.5,
    fontSize: 4,
    color: '#1a1a1a',
    bold: false,
    align: 'center',
    fontFamily: 'Archivo',
  };
}

export function newImageId() {
  return typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `image-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function cloneSpread(spread: DraftSpread): DraftSpread {
  return {
    ...spread,
    slots: spread.slots.map((slot) => ({ ...slot })),
    captions: spread.captions.map((c) => ({ ...c })),
  };
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function pickNewerDraft(
  local: StoredPhotobookDraft | null,
  server: StoredPhotobookDraft | null,
): { draft: StoredPhotobookDraft; source: 'local' | 'server' } | null {
  if (!local && !server) return null;
  if (!server) return { draft: local!, source: 'local' };
  if (!local) return { draft: server, source: 'server' };
  return server.updatedAt > local.updatedAt ? { draft: server, source: 'server' } : { draft: local, source: 'local' };
}

/**
 * Số ô ảnh thật sự có trong một cuốn khi khách tự thiết kế: đi đúng chu kỳ bố cục mà
 * makeSpreads() dùng, nên luôn khớp với thứ khách đếm được ở bước sắp xếp.
 *
 * Đây là con số khác hẳn photoRangeFor(): bên đó là lượng ảnh gửi cho xưởng tự bố cục, khách
 * cố tình gửi dư để xưởng chọn lọc. Còn ở đây khách tự đặt từng tấm vào từng ô, nên chỉ nhét
 * vừa đúng số ô. Trộn hai con số vào nhau là bảo khách chuẩn bị 60–80 tấm cho chỗ chứa 31 tấm.
 */
export function slotCapacityOf(template: PhotobookTemplate, pageCount: number): number {
  const cycle = template.layoutCycle;
  if (cycle.length === 0 || pageCount <= 0) return 0;
  let total = 0;
  for (let i = 0; i < pageCount / 2; i++) {
    total += layoutByCode(cycle[i % cycle.length]).slots.length;
  }
  return total;
}

/** Số trang nhỏ nhất đủ ô cho ngần này ảnh; hết cỡ thì trả về mức lớn nhất bán được. */
export function suggestPageCountForTemplate(
  photoCount: number,
  options: PhotobookSize['pageOptions'],
  template: PhotobookTemplate,
): number | null {
  if (photoCount <= 0 || options.length === 0) return null;
  const enough = options.find((option) => slotCapacityOf(template, option.pageCount) >= photoCount);
  return (enough ?? options[options.length - 1]).pageCount;
}

export function makeSpreads(count: number, prev: DraftSpread[], template: PhotobookTemplate): DraftSpread[] {
  const cycle = template.layoutCycle;
  const colors = template.spreadColors;
  return Array.from({ length: count }, (_, i) => {
    if (prev[i]) return prev[i];
    const code = cycle[i % cycle.length];
    const layout = layoutByCode(code);
    const captions: DraftCaption[] = [];
    for (const pc of template.presetCaptions) {
      if (pc.spreadIndex === i) {
        captions.push({
          id: newImageId(),
          text: pc.text,
          x: 0.5,
          y: 0.5,
          fontSize: pc.fontSize,
          color: pc.color,
          bold: false,
          align: pc.align,
          fontFamily: pc.fontFamily,
        });
      }
    }
    return {
      position: i + 1,
      layoutCode: code,
      slots: layout.slots.map(emptyDraftSlot),
      captions,
      backgroundColor: colors[i % colors.length],
    };
  });
}

export function hydrateDraftSpreads(
  draft: StoredPhotobookDraft,
  images: Map<string, File>,
  trackPreview: (url: string) => void,
): DraftSpread[] {
  return draft.spreads.map((spread) => ({
    position: spread.position,
    layoutCode: spread.layoutCode,
    slots: spread.slots.map((slot) => {
      const file = slot.imageId ? (images.get(slot.imageId) ?? null) : null;
      const preview = file ? URL.createObjectURL(file) : null;
      if (preview) trackPreview(preview);
      return {
        // Retain the server-side reference when this device has no matching
        // IndexedDB blob. A later autosave must not convert this into an
        // empty slot in the shared draft.
        imageId: slot.imageId,
        file,
        preview,
        zoom: clamp(slot.zoom, 1, 3),
        panX: clamp(slot.panX, -1, 1),
        panY: clamp(slot.panY, -1, 1),
      };
    }),
    captions: (spread.captions ?? []).map((c) => ({ ...c, fontFamily: c.fontFamily ?? 'Archivo' })),
    backgroundColor: spread.backgroundColor ?? '#ffffff',
  }));
}

export function draftImages(spreads: DraftSpread[]) {
  return spreads
    .flatMap((spread) => spread.slots)
    .flatMap((slot) => (slot.imageId && slot.file ? [{ id: slot.imageId, file: slot.file }] : []));
}

/**
 * Ô vẫn giữ imageId nhưng máy này không có tệp: bản nháp mở lại từ tài khoản ở một thiết bị
 * khác với thiết bị đã tải ảnh lên (xem hydrateDraftSpreads). Trong bản nháp chung ô này vẫn
 * "có ảnh", chỉ là từ đây không hiển thị, không chia sẻ và không gửi xưởng được — nên phải
 * hiện khác hẳn ô trống, đừng để khách tưởng mọi thứ vẫn đủ.
 */
export function slotImageMissing(slot: DraftSlot): slot is DraftSlot & { imageId: string } {
  return slot.imageId !== null && slot.file === null;
}

/**
 * Spread đã có ảnh khách đặt vào hay chưa. Xét imageId chứ không xét file: ở thiết bị không giữ
 * blob thì mọi ô đều trông như trống, và những thao tác "chỉ đụng vào spread còn trống" (đổi chủ
 * đề, dựng lại bố cục) sẽ xoá sạch tham chiếu ảnh của bản nháp mà không hỏi câu nào.
 */
export function spreadHasPlacedImages(spread: DraftSpread): boolean {
  return spread.slots.some((slot) => slot.imageId !== null);
}

/** Số ảnh (không trùng) mà bản nháp tham chiếu nhưng máy này không có tệp. */
export function missingImageIds(spreads: DraftSpread[]): string[] {
  const ids = new Set<string>();
  for (const spread of spreads) {
    for (const slot of spread.slots) {
      if (slotImageMissing(slot)) ids.add(slot.imageId);
    }
  }
  return [...ids];
}

/** Spread đầu tiên có ô thiếu tệp, để đưa khách tới đúng chỗ cần chọn lại ảnh. */
export function firstSpreadWithMissingImage(spreads: DraftSpread[]): number {
  return spreads.findIndex((spread) => spread.slots.some(slotImageMissing));
}

/**
 * Ảnh gửi kèm một payload multipart (share preview hoặc design), gộp theo imageId vì cùng một
 * ảnh có thể nằm ở nhiều ô.
 */
export function uploadableImages(spreads: DraftSpread[]): Map<string, File> {
  const images = new Map<string, File>();
  for (const spread of spreads) {
    for (const slot of spread.slots) {
      if (slot.imageId && slot.file && !images.has(slot.imageId)) images.set(slot.imageId, slot.file);
    }
  }
  return images;
}

/**
 * Phần "spreads" của payload multipart. Bỏ imageId của những ô mà máy này không còn giữ blob
 * (bản nháp mở lại từ server ở thiết bị khác cố tình giữ lại imageId để lần autosave sau không
 * xoá ảnh khỏi bản nháp chung — xem hydrateDraftSpreads). Backend bắt buộc tập imageId trong
 * metadata phải trùng khít tập ảnh tải lên, nên tham chiếu thừa sẽ làm cả request 400.
 */
export function uploadableSpreads(spreads: DraftSpread[]) {
  return spreads.map((spread) => ({
    position: spread.position,
    layoutCode: spread.layoutCode,
    backgroundColor: spread.backgroundColor,
    slots: spread.slots.map((slot) => ({
      imageId: slot.file ? slot.imageId : null,
      zoom: slot.zoom,
      panX: slot.panX,
      panY: slot.panY,
    })),
    captions: spread.captions.map((caption) => ({
      id: caption.id,
      text: caption.text,
      x: caption.x,
      y: caption.y,
      fontSize: caption.fontSize,
      color: caption.color,
      bold: caption.bold,
      align: caption.align,
      fontFamily: caption.fontFamily,
    })),
  }));
}

export function variantSnapshot(product: Product, size: PhotobookSize, priceAtPageCount: number): ProductVariant {
  return {
    id: size.variantId,
    productId: product.id,
    sku: size.sku,
    name: size.name,
    widthCm: size.widthCm,
    heightCm: size.heightCm,
    artSizeId: null,
    artSizeCode: 'CUSTOM',
    materialId: null,
    material: product.coverMaterial ?? 'Photobook',
    price: priceAtPageCount,
    stockQuantity: product.effectiveStockQuantity,
    available: size.available,
  };
}
