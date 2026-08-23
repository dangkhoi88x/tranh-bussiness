function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

/**
 * CSS crop cho một ô ảnh, từ zoom (1..3) và pan (-1..1) — cùng công thức đang dùng ở editor
 * trước khi mua (PhotobookDetailPage) và trang xem trước chia sẻ (PhotobookSharePreviewPage).
 */
export function cropStyle(zoom: number, panX: number, panY: number): { objectPosition: string; transform: string } {
  const z = clamp(zoom ?? 1, 1, 3);
  const panRange = ((z - 1) / z) * 50;
  return {
    objectPosition: `${50 + (panX ?? 0) * panRange}% ${50 + (panY ?? 0) * panRange}%`,
    transform: `scale(${z})`,
  };
}

/** focalX/focalY (0..1, mô hình crop của backend) -> panX/panY (-1..1, mô hình crop của editor). */
export function focalToPan(focalX: number, focalY: number): { panX: number; panY: number } {
  return { panX: clamp((focalX - 0.5) * 2, -1, 1), panY: clamp((focalY - 0.5) * 2, -1, 1) };
}
