const DRAFT_VERSION = 1;
const DRAFT_KEY_PREFIX = 'bubble-memories.photobook-draft.v1:';
const DATABASE_NAME = 'bubble-memories-photobook-drafts';
const IMAGE_STORE = 'images';

export type StoredPhotobookSlot = {
  imageId: string | null;
  zoom: number;
  panX: number;
  panY: number;
};

export type StoredCaption = {
  id: string;
  text: string;
  x: number;
  y: number;
  fontSize: number;
  color: string;
  bold: boolean;
  align: 'left' | 'center' | 'right';
  fontFamily?: string;
};

export type StoredPhotobookSpread = {
  position: number;
  layoutCode: string;
  slots: StoredPhotobookSlot[];
  captions?: StoredCaption[];
  backgroundColor?: string;
};

export type StoredPhotobookDraft = {
  version: typeof DRAFT_VERSION;
  slug: string;
  sizeId: string | null;
  pageIndex: number;
  finish: string;
  qty: number;
  photoCount: string;
  step: number;
  currentSpreadIdx: number;
  spreads: StoredPhotobookSpread[];
  updatedAt: number;
  templateId?: string;
};

export type DraftImage = {
  id: string;
  file: File;
};

type DraftImageRecord = {
  id: string;
  draftKey: string;
  blob: Blob;
  name: string;
  lastModified: number;
};

function storageKey(slug: string) {
  return `${DRAFT_KEY_PREFIX}${slug}`;
}

function isStoredDraft(value: unknown, slug: string): value is StoredPhotobookDraft {
  if (!value || typeof value !== 'object') return false;
  const draft = value as Partial<StoredPhotobookDraft>;
  return draft.version === DRAFT_VERSION && draft.slug === slug && Array.isArray(draft.spreads)
    && typeof draft.pageIndex === 'number' && typeof draft.qty === 'number'
    && typeof draft.photoCount === 'string' && typeof draft.step === 'number'
    && typeof draft.currentSpreadIdx === 'number';
}

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed'));
  });
}

function transactionDone(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onabort = () => reject(transaction.error ?? new Error('IndexedDB transaction aborted'));
    transaction.onerror = () => reject(transaction.error ?? new Error('IndexedDB transaction failed'));
  });
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open(DATABASE_NAME, 1);
    request.onupgradeneeded = () => {
      const database = request.result;
      const store = database.createObjectStore(IMAGE_STORE, { keyPath: 'id' });
      store.createIndex('draftKey', 'draftKey', { unique: false });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Cannot open IndexedDB'));
  });
}

async function storedImagesForDraft(draftKey: string): Promise<DraftImageRecord[]> {
  const database = await openDatabase();
  try {
    const transaction = database.transaction(IMAGE_STORE, 'readonly');
    const store = transaction.objectStore(IMAGE_STORE).index('draftKey');
    const records = await requestResult(store.getAll(draftKey)) as DraftImageRecord[];
    await transactionDone(transaction);
    return records;
  } finally {
    database.close();
  }
}

async function putImages(draftKey: string, images: DraftImage[]) {
  if (!images.length) return;
  const database = await openDatabase();
  try {
    const transaction = database.transaction(IMAGE_STORE, 'readwrite');
    const store = transaction.objectStore(IMAGE_STORE);
    images.forEach(({ id, file }) => store.put({
      id, draftKey, blob: file, name: file.name, lastModified: file.lastModified,
    } satisfies DraftImageRecord));
    await transactionDone(transaction);
  } finally {
    database.close();
  }
}

async function removeImages(ids: string[]) {
  if (!ids.length) return;
  const database = await openDatabase();
  try {
    const transaction = database.transaction(IMAGE_STORE, 'readwrite');
    const store = transaction.objectStore(IMAGE_STORE);
    ids.forEach((id) => store.delete(id));
    await transactionDone(transaction);
  } finally {
    database.close();
  }
}

export function readPhotobookDraft(slug: string): StoredPhotobookDraft | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(storageKey(slug));
    if (!raw) return null;
    const draft = JSON.parse(raw) as unknown;
    if (isStoredDraft(draft, slug)) return draft;
    window.localStorage.removeItem(storageKey(slug));
  } catch {
    // The editor remains usable even if browser storage is unavailable or malformed.
  }
  return null;
}

export async function readPhotobookDraftImages(draft: StoredPhotobookDraft): Promise<Map<string, File>> {
  const imageIds = new Set(draft.spreads.flatMap((spread) => spread.slots)
    .map((slot) => slot.imageId).filter((id): id is string => typeof id === 'string'));
  const records = await storedImagesForDraft(storageKey(draft.slug));
  const images = new Map<string, File>();
  records.forEach((record) => {
    if (!imageIds.has(record.id)) return;
    images.set(record.id, new File([record.blob], record.name, {
      type: record.blob.type,
      lastModified: record.lastModified,
    }));
  });
  return images;
}

export async function savePhotobookDraft(draft: StoredPhotobookDraft, images: DraftImage[]) {
  if (typeof window === 'undefined') return;
  const key = storageKey(draft.slug);
  await putImages(key, images);
  const liveIds = new Set(images.map((image) => image.id));
  const staleIds = (await storedImagesForDraft(key)).map((record) => record.id).filter((id) => !liveIds.has(id));
  await removeImages(staleIds);
  window.localStorage.setItem(key, JSON.stringify(draft));
}

export async function clearPhotobookDraft(slug: string) {
  if (typeof window !== 'undefined') window.localStorage.removeItem(storageKey(slug));
  const staleIds = (await storedImagesForDraft(storageKey(slug))).map((record) => record.id);
  await removeImages(staleIds);
}
