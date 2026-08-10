const UPLOAD_MAX_IMAGE_EDGE = 2000;
const UPLOAD_JPEG_QUALITY = 0.85;
const SHARE_PREVIEW_MAX_IMAGE_EDGE = 1440;
const SHARE_PREVIEW_JPEG_QUALITY = 0.72;

export type CompressionResult = {
  file: File;
  originalBytes: number;
  compressedBytes: number;
};

function jpegFilename(filename: string) {
  const stem = filename.replace(/\.[^.]+$/, '').trim() || 'photo';
  return `${stem}.jpg`;
}

function canvasBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
}

async function decodeImage(file: File): Promise<{ source: CanvasImageSource; width: number; height: number; dispose: () => void }> {
  if ('createImageBitmap' in window) {
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
    return { source: bitmap, width: bitmap.width, height: bitmap.height, dispose: () => bitmap.close() };
  }

  const url = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = () => reject(new Error('Cannot decode image'));
      element.src = url;
    });
    return { source: image, width: image.naturalWidth, height: image.naturalHeight, dispose: () => URL.revokeObjectURL(url) };
  } catch (error) {
    URL.revokeObjectURL(url);
    throw error;
  }
}

async function compressImage(file: File, maxEdge: number, quality: number, keepOriginalWhenLarger: boolean): Promise<CompressionResult> {
  if (!file.type.startsWith('image/')) return { file, originalBytes: file.size, compressedBytes: file.size };

  let decoded: Awaited<ReturnType<typeof decodeImage>>;
  try {
    decoded = await decodeImage(file);
  } catch {
    return { file, originalBytes: file.size, compressedBytes: file.size };
  }
  try {
    const scale = Math.min(1, maxEdge / Math.max(decoded.width, decoded.height));
    const width = Math.max(1, Math.round(decoded.width * scale));
    const height = Math.max(1, Math.round(decoded.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) return { file, originalBytes: file.size, compressedBytes: file.size };
    context.drawImage(decoded.source, 0, 0, width, height);

    const blob = await canvasBlob(canvas, quality);
    if (!blob) return { file, originalBytes: file.size, compressedBytes: file.size };
    const compressed = new File([blob], jpegFilename(file.name), { type: 'image/jpeg', lastModified: file.lastModified });
    if (keepOriginalWhenLarger && compressed.size >= file.size) return { file, originalBytes: file.size, compressedBytes: file.size };
    return { file: compressed, originalBytes: file.size, compressedBytes: compressed.size };
  } finally {
    decoded.dispose();
  }
}

/** Resize a customer photo for upload while preserving its aspect ratio and EXIF orientation. */
export function compressPhotobookPhoto(file: File): Promise<CompressionResult> {
  return compressImage(file, UPLOAD_MAX_IMAGE_EDGE, UPLOAD_JPEG_QUALITY, true);
}

/** Create a smaller derivative intended only for a browser-based share preview. */
export function compressSharePreviewImage(file: File): Promise<CompressionResult> {
  return compressImage(file, SHARE_PREVIEW_MAX_IMAGE_EDGE, SHARE_PREVIEW_JPEG_QUALITY, false);
}
