import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { ApiRequestError, apiRequest } from '../api/http';
import {
  fetchPhotobookPricing,
  photoRangeFor,
  suggestPageCount,
  type PhotobookPricing,
  type PhotobookSize,
} from '../api/photobook';
import { fetchProductBySlug, formatPrice, formatSize, type Product, type ProductVariant } from '../api/storefront';
import { layoutByCode, SPREAD_LAYOUTS, type SpreadLayout } from '../data/spreadLayouts';
import { PHOTOBOOK_TEMPLATES, templateById, type PhotobookTemplate } from '../data/photobookTemplates';
import { compressSharePreviewImage } from '../data/imageCompression';
import {
  readPhotobookDraft,
  readPhotobookDraftImages,
  savePhotobookDraft,
  type StoredPhotobookDraft,
} from '../data/photobookDraft';
import { useCart } from '../hooks/useCart';
import { absoluteSiteUrl, useDocumentMeta } from '../hooks/useDocumentMeta';
import { STORE_LABEL_STYLE, StoreNotice, StoreShell } from '../components/StoreShell';
import { Frame } from '../components/Frame';
import '../styles/ds.css';
import '../styles/public.css';

const FINISHES = ['Eco Matte', 'Eco Silk'];
const CATALOG_HREF = '/photobook';
const STEPS = ['Quy cách', 'Thêm ảnh', 'Xem lại'] as const;

type DraftSlot = { imageId: string | null; file: File | null; preview: string | null; zoom: number; panX: number; panY: number };
type DraftCaption = { id: string; text: string; x: number; y: number; fontSize: number; color: string; bold: boolean; align: 'left' | 'center' | 'right'; fontFamily: string };
type DraftSpread = { position: number; layoutCode: string; slots: DraftSlot[]; captions: DraftCaption[]; backgroundColor: string };
type SpreadHistory = { past: DraftSpread[]; future: DraftSpread[] };
type AutoFillResult = { placed: number; remaining: number };

const HISTORY_LIMIT = 30;

const CAPTION_COLORS = ['#1a1a1a', '#ffffff', '#8b4513', '#c0392b', '#2c3e50', '#27ae60', '#8e44ad', '#e67e22'];
const CAPTION_SIZES: { label: string; value: number }[] = [
  { label: 'Nhỏ', value: 2.5 }, { label: 'Vừa', value: 4 }, { label: 'Lớn', value: 6 }, { label: 'Rất lớn', value: 8 },
];
const CAPTION_FONTS: { label: string; value: string; fallback: string }[] = [
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

const emptyDraftSlot = (): DraftSlot => ({ imageId: null, file: null, preview: null, zoom: 1, panX: 0, panY: 0 });

function newCaption(): DraftCaption {
  return { id: newImageId(), text: '', x: 0.5, y: 0.5, fontSize: 4, color: '#1a1a1a', bold: false, align: 'center', fontFamily: 'Archivo' };
}

function newImageId() {
  return typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `image-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function cloneSpread(spread: DraftSpread): DraftSpread {
  return { ...spread, slots: spread.slots.map((slot) => ({ ...slot })), captions: spread.captions.map((c) => ({ ...c })) };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function SlotImage({ slot, alt }: { slot: DraftSlot; alt: string }) {
  const zoom = clamp(slot.zoom ?? 1, 1, 3);
  const panRange = ((zoom - 1) / zoom) * 50;
  return <img src={slot.preview ?? undefined} alt={alt} draggable={false} style={{
    width: '100%', height: '100%', objectFit: 'cover', display: 'block',
    objectPosition: `${50 + (slot.panX ?? 0) * panRange}% ${50 + (slot.panY ?? 0) * panRange}%`,
    transform: `scale(${zoom})`, transformOrigin: 'center', willChange: 'transform, object-position',
  }} />;
}

function makeSpreads(count: number, prev: DraftSpread[], template: PhotobookTemplate): DraftSpread[] {
  const cycle = template.layoutCycle;
  const colors = template.spreadColors;
  return Array.from({ length: count }, (_, i) => {
    if (prev[i]) return prev[i];
    const code = cycle[i % cycle.length];
    const layout = layoutByCode(code);
    const captions: DraftCaption[] = [];
    for (const pc of template.presetCaptions) {
      if (pc.spreadIndex === i) {
        captions.push({ id: newImageId(), text: pc.text, x: 0.5, y: 0.5, fontSize: pc.fontSize, color: pc.color, bold: false, align: pc.align, fontFamily: pc.fontFamily });
      }
    }
    return { position: i + 1, layoutCode: code, slots: layout.slots.map(emptyDraftSlot), captions, backgroundColor: colors[i % colors.length] };
  });
}

function hydrateDraftSpreads(draft: StoredPhotobookDraft, images: Map<string, File>, trackPreview: (url: string) => void): DraftSpread[] {
  return draft.spreads.map((spread) => ({
    position: spread.position,
    layoutCode: spread.layoutCode,
    slots: spread.slots.map((slot) => {
      const file = slot.imageId ? images.get(slot.imageId) ?? null : null;
      const preview = file ? URL.createObjectURL(file) : null;
      if (preview) trackPreview(preview);
      return {
        imageId: file ? slot.imageId : null,
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

function draftImages(spreads: DraftSpread[]) {
  return spreads.flatMap((spread) => spread.slots)
    .flatMap((slot) => slot.imageId && slot.file ? [{ id: slot.imageId, file: slot.file }] : []);
}

function variantSnapshot(product: Product, size: PhotobookSize, priceAtPageCount: number): ProductVariant {
  return {
    id: size.variantId, productId: product.id, sku: size.sku, name: size.name,
    widthCm: size.widthCm, heightCm: size.heightCm, artSizeId: null, artSizeCode: 'CUSTOM',
    materialId: null, material: product.coverMaterial ?? 'Photobook',
    price: priceAtPageCount, stockQuantity: product.effectiveStockQuantity, available: size.available,
  };
}

const chipStyle = (on: boolean, disabled = false): React.CSSProperties => ({
  appearance: 'none', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
  height: 36, padding: '0 10px', font: 'inherit', fontSize: 12, fontWeight: on ? 600 : 400,
  lineHeight: 1, whiteSpace: 'nowrap', cursor: disabled ? 'not-allowed' : 'pointer',
  border: `2px solid ${on ? 'var(--color-text)' : 'var(--color-neutral-300)'}`,
  background: on ? 'var(--color-text)' : 'var(--color-bg)', color: on ? 'var(--color-bg)' : 'var(--color-text)',
  opacity: disabled ? 0.4 : 1,
});

const stepBtnStyle = (disabled: boolean): React.CSSProperties => ({
  appearance: 'none', width: 32, height: 32, border: 0, background: 'transparent',
  font: 'inherit', fontSize: 16, color: 'var(--color-text)',
  cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.4 : 1,
});

const optionRow: React.CSSProperties = {
  display: 'grid', gridTemplateColumns: '84px minmax(0, 1fr)', alignItems: 'center',
  gap: 'var(--space-4)', padding: 'var(--space-4) 0', borderBottom: '1px solid var(--color-neutral-300)',
};

const chipGrid: React.CSSProperties = {
  display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(104px, 1fr))', gap: 6,
};

export function PhotobookDetailPage() {
  const { slug = '' } = useParams();
  const { count: cartCount, add } = useCart();

  const [product, setProduct] = useState<Product | null>(null);
  const [pricing, setPricing] = useState<PhotobookPricing | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [sizeId, setSizeId] = useState<string | null>(null);
  const [pageIndex, setPageIndex] = useState(0);
  const [finish, setFinish] = useState(FINISHES[0]);
  const [qty, setQty] = useState(1);
  const [photoCount, setPhotoCount] = useState('');
  const [templateId, setTemplateId] = useState('free');

  const [step, setStepRaw] = useState(0);
  const setStep = useCallback((s: number) => { setStepRaw(s); window.scrollTo(0, 0); }, []);
  const [spreads, setSpreads] = useState<DraftSpread[]>([]);
  const [currentSpreadIdx, setCurrentSpreadIdx] = useState(0);
  const spreadsRef = useRef<DraftSpread[]>([]);
  const previewUrlsRef = useRef(new Set<string>());
  const historyRef = useRef<Record<number, SpreadHistory>>({});
  const [historyBySpread, setHistoryBySpread] = useState<Record<number, SpreadHistory>>({});
  const [draftHydrated, setDraftHydrated] = useState(false);
  const [draftNotice, setDraftNotice] = useState<string | null>(null);
  const draftSaveVersionRef = useRef(0);
  const draftSaveQueueRef = useRef<Promise<void>>(Promise.resolve());

  const [added, setAdded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [cartError, setCartError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    const savedDraft = readPhotobookDraft(slug);
    setProduct(null); setPricing(null); setLoadError(null);
    setDraftHydrated(false); setDraftNotice(null);
    draftSaveVersionRef.current++;
    previewUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    previewUrlsRef.current.clear();
    spreadsRef.current = [];
    historyRef.current = {};
    setSizeId(null); setPageIndex(0); setFinish(FINISHES[0]); setQty(1); setPhotoCount(''); setTemplateId('free');
    setStepRaw(0); setCurrentSpreadIdx(0); setSpreads([]); setHistoryBySpread({});

    if (savedDraft) {
      void readPhotobookDraftImages(savedDraft)
        .then((images) => {
          if (!alive) return;
          const restored = hydrateDraftSpreads(savedDraft, images, (url) => previewUrlsRef.current.add(url));
          spreadsRef.current = restored;
          setSpreads(restored);
          setSizeId(savedDraft.sizeId);
          setPageIndex(Math.max(0, savedDraft.pageIndex));
          setFinish(FINISHES.includes(savedDraft.finish) ? savedDraft.finish : FINISHES[0]);
          setQty(Math.max(1, savedDraft.qty));
          setPhotoCount(savedDraft.photoCount);
          setTemplateId(savedDraft.templateId ?? 'free');
          setStepRaw(clamp(savedDraft.step, 0, 2));
          setCurrentSpreadIdx(Math.max(0, savedDraft.currentSpreadIdx));
          setDraftNotice(images.size ? 'Đã khôi phục bản nháp và ảnh trên thiết bị này.' : 'Đã khôi phục bố cục bản nháp. Hãy chọn lại ảnh bị thiếu.');
          setDraftHydrated(true);
        })
        .catch(() => {
          if (!alive) return;
          setDraftNotice('Không thể đọc ảnh của bản nháp trên thiết bị này.');
        });
    } else {
      setDraftHydrated(true);
    }

    fetchProductBySlug(slug)
      .then((item) => {
        if (!alive) return;
        setProduct(item);
        if (!item.pagePriced) return;
        return fetchPhotobookPricing(item.id).then((table) => {
          if (!alive) return;
          setPricing(table);
          const savedSize = savedDraft?.sizeId ?? null;
          setSizeId(table.sizes.some((size) => size.variantId === savedSize)
            ? savedSize
            : table.sizes.find((size) => size.available)?.variantId ?? table.sizes[0]?.variantId ?? null);
        });
      })
      .catch((e: Error) => { if (alive) setLoadError(e.message); });
    return () => { alive = false; };
  }, [slug]);

  const size: PhotobookSize | null = pricing?.sizes.find((s) => s.variantId === sizeId) ?? null;
  const pageOptions = size?.pageOptions ?? [];
  const selected = pageOptions[Math.min(pageIndex, Math.max(pageOptions.length - 1, 0))] ?? null;
  const price = selected?.price ?? 0;
  const photos = selected ? photoRangeFor(selected.pageCount) : null;
  const numSpreads = selected ? selected.pageCount / 2 : 0;

  const suggestion = useMemo(() => {
    const wanted = Number(photoCount);
    if (!Number.isFinite(wanted) || wanted <= 0 || !selected) return null;
    const suggested = suggestPageCount(wanted, pageOptions);
    return suggested === null || suggested === selected.pageCount ? null : suggested;
  }, [photoCount, pageOptions, selected]);

  const template = templateById(templateId);

  const applyTemplateToSpreads = useCallback((tpl: PhotobookTemplate) => {
    setSpreads((prev) => {
      const cycle = tpl.layoutCycle;
      const colors = tpl.spreadColors;
      const next = prev.map((spread, i) => {
        const hasImages = spread.slots.some((s) => s.file !== null);
        const code = hasImages ? spread.layoutCode : cycle[i % cycle.length];
        const layout = layoutByCode(code);
        const slots = hasImages ? spread.slots : layout.slots.map(emptyDraftSlot);
        let captions = hasImages ? spread.captions : [];
        const presets = tpl.presetCaptions.filter((pc) => pc.spreadIndex === i);
        if (!hasImages && presets.length > 0) {
          captions = presets.map((pc) => ({ id: newImageId(), text: pc.text, x: 0.5, y: 0.5, fontSize: pc.fontSize, color: pc.color, bold: false, align: pc.align, fontFamily: pc.fontFamily }));
        }
        return { ...spread, layoutCode: code, slots, captions, backgroundColor: colors[i % colors.length] };
      });
      spreadsRef.current = next;
      return next;
    });
  }, []);

  useEffect(() => {
    if (numSpreads <= 0) return;
    setSpreads((prev) => {
      const next = makeSpreads(numSpreads, prev, template);
      spreadsRef.current = next;
      return next;
    });
  }, [numSpreads]);

  const prevTemplateRef = useRef(templateId);
  useEffect(() => {
    if (prevTemplateRef.current === templateId) return;
    prevTemplateRef.current = templateId;
    if (spreadsRef.current.length > 0) applyTemplateToSpreads(template);
  }, [templateId, template, applyTemplateToSpreads]);

  useEffect(() => {
    if (!added) return;
    const t = window.setTimeout(() => setAdded(false), 1800);
    return () => window.clearTimeout(t);
  }, [added]);

  useEffect(() => {
    if (!draftHydrated || !slug || !spreads.length) return;
    const version = ++draftSaveVersionRef.current;
    const draft: StoredPhotobookDraft = {
      version: 1,
      slug,
      sizeId,
      pageIndex,
      finish,
      qty,
      photoCount,
      step,
      currentSpreadIdx,
      spreads: spreads.map((spread) => ({
        position: spread.position,
        layoutCode: spread.layoutCode,
        slots: spread.slots.map((slot) => ({
          imageId: slot.file ? slot.imageId : null,
          zoom: slot.zoom,
          panX: slot.panX,
          panY: slot.panY,
        })),
        captions: spread.captions.map((c) => ({ ...c })),
        backgroundColor: spread.backgroundColor,
      })),
      updatedAt: Date.now(),
      templateId,
    };
    const images = draftImages(spreads);
    const timer = window.setTimeout(() => {
      draftSaveQueueRef.current = draftSaveQueueRef.current
        .catch(() => undefined)
        .then(async () => {
          if (version !== draftSaveVersionRef.current) return;
          await savePhotobookDraft(draft, images);
          if (version === draftSaveVersionRef.current) setDraftNotice('Bản nháp đã được lưu trên thiết bị này.');
        })
        .catch(() => {
          if (version === draftSaveVersionRef.current) setDraftNotice('Không thể lưu bản nháp trên thiết bị này.');
        });
    }, 500);
    return () => window.clearTimeout(timer);
  }, [currentSpreadIdx, draftHydrated, finish, pageIndex, photoCount, qty, sizeId, slug, spreads, step]);

  useDocumentMeta({
    title: product ? `${product.name} | Bubble Memories` : 'Photobook | Bubble Memories',
    description: product?.description ?? 'Photobook in theo yêu cầu.',
    canonicalUrl: absoluteSiteUrl(`/photobook/${slug}`),
    type: 'product',
    imageUrl: product?.primaryImageUrl ? absoluteSiteUrl(product.primaryImageUrl) : null,
    imageAlt: product?.name ?? null,
  });

  const setHistory = useCallback((nextHistory: Record<number, SpreadHistory>) => {
    historyRef.current = nextHistory;
    setHistoryBySpread(nextHistory);
  }, []);

  const rememberSpread = useCallback((spreadIdx: number, spread: DraftSpread) => {
    const current = historyRef.current[spreadIdx] ?? { past: [], future: [] };
    setHistory({
      ...historyRef.current,
      [spreadIdx]: {
        past: [...current.past, cloneSpread(spread)].slice(-HISTORY_LIMIT),
        future: [],
      },
    });
  }, [setHistory]);

  const restoreSpread = useCallback((spreadIdx: number, snapshot: DraftSpread) => {
    setSpreads((prev) => {
      const next = [...prev];
      next[spreadIdx] = cloneSpread(snapshot);
      spreadsRef.current = next;
      return next;
    });
  }, []);

  const undoSpread = useCallback((spreadIdx: number) => {
    const current = spreadsRef.current[spreadIdx];
    const history = historyRef.current[spreadIdx];
    if (!current || !history?.past.length) return;
    const previous = history.past[history.past.length - 1];
    setHistory({
      ...historyRef.current,
      [spreadIdx]: {
        past: history.past.slice(0, -1),
        future: [cloneSpread(current), ...history.future].slice(0, HISTORY_LIMIT),
      },
    });
    restoreSpread(spreadIdx, previous);
  }, [restoreSpread, setHistory]);

  const redoSpread = useCallback((spreadIdx: number) => {
    const current = spreadsRef.current[spreadIdx];
    const history = historyRef.current[spreadIdx];
    if (!current || !history?.future.length) return;
    const nextSnapshot = history.future[0];
    setHistory({
      ...historyRef.current,
      [spreadIdx]: {
        past: [...history.past, cloneSpread(current)].slice(-HISTORY_LIMIT),
        future: history.future.slice(1),
      },
    });
    restoreSpread(spreadIdx, nextSnapshot);
  }, [restoreSpread, setHistory]);

  const autoFillFiles = useCallback((files: File[]): AutoFillResult => {
    const orderedFiles = files
      .filter((file) => file.type.startsWith('image/'))
      .sort((a, b) => (a.webkitRelativePath || a.name).localeCompare(b.webkitRelativePath || b.name, undefined, {
        numeric: true, sensitivity: 'base',
      }));
    const current = spreadsRef.current;
    if (!orderedFiles.length || !current.length) return { placed: 0, remaining: orderedFiles.length };

    const next = current.map(cloneSpread);
    const changedSpreadIndexes = new Set<number>();
    let fileIndex = 0;
    for (let spreadIndex = 0; spreadIndex < next.length && fileIndex < orderedFiles.length; spreadIndex++) {
      const layout = layoutByCode(next[spreadIndex].layoutCode);
      for (let slotIndex = 0; slotIndex < layout.slots.length && fileIndex < orderedFiles.length; slotIndex++) {
        if (next[spreadIndex].slots[slotIndex]?.file) continue;
        const file = orderedFiles[fileIndex++];
        const preview = URL.createObjectURL(file);
        previewUrlsRef.current.add(preview);
        next[spreadIndex].slots[slotIndex] = { imageId: newImageId(), file, preview, zoom: 1, panX: 0, panY: 0 };
        changedSpreadIndexes.add(spreadIndex);
      }
    }

    if (changedSpreadIndexes.size) {
      const nextHistory = { ...historyRef.current };
      changedSpreadIndexes.forEach((spreadIndex) => {
        const history = nextHistory[spreadIndex] ?? { past: [], future: [] };
        nextHistory[spreadIndex] = {
          past: [...history.past, cloneSpread(current[spreadIndex])].slice(-HISTORY_LIMIT),
          future: [],
        };
      });
      setHistory(nextHistory);
      spreadsRef.current = next;
      setSpreads(next);
    }

    return { placed: fileIndex, remaining: orderedFiles.length - fileIndex };
  }, [setHistory]);

  const setSlotFile = useCallback((spreadIdx: number, slotIdx: number, file: File | null) => {
    const preview = file ? URL.createObjectURL(file) : null;
    if (preview) previewUrlsRef.current.add(preview);
    setSpreads((prev) => {
      const next = [...prev];
      const spread = { ...next[spreadIdx], slots: [...next[spreadIdx].slots] };
      spread.slots[slotIdx] = { imageId: file ? newImageId() : null, file, preview, zoom: 1, panX: 0, panY: 0 };
      next[spreadIdx] = spread;
      spreadsRef.current = next;
      return next;
    });
  }, []);

  const changeLayout = useCallback((spreadIdx: number, code: string) => {
    setSpreads((prev) => {
      const next = [...prev];
      const old = next[spreadIdx];
      const layout = layoutByCode(code);
      const newSlots: DraftSlot[] = layout.slots.map((_, i) => old.slots[i] ?? emptyDraftSlot());
      next[spreadIdx] = { ...old, layoutCode: code, slots: newSlots, captions: old.captions };
      spreadsRef.current = next;
      return next;
    });
  }, []);

  const swapSlots = useCallback((spreadIdx: number, fromSlot: number, toSlot: number) => {
    setSpreads((prev) => {
      const next = [...prev];
      const spread = { ...next[spreadIdx], slots: [...next[spreadIdx].slots] };
      [spread.slots[fromSlot], spread.slots[toSlot]] = [spread.slots[toSlot], spread.slots[fromSlot]];
      next[spreadIdx] = spread;
      spreadsRef.current = next;
      return next;
    });
  }, []);

  const setSlotCrop = useCallback((spreadIdx: number, slotIdx: number, crop: Pick<DraftSlot, 'zoom' | 'panX' | 'panY'>) => {
    setSpreads((prev) => {
      const next = [...prev];
      const spread = { ...next[spreadIdx], slots: [...next[spreadIdx].slots] };
      spread.slots[slotIdx] = { ...spread.slots[slotIdx], ...crop };
      next[spreadIdx] = spread;
      spreadsRef.current = next;
      return next;
    });
  }, []);

  const addCaption = useCallback((spreadIdx: number) => {
    const caption: DraftCaption = { ...newCaption(), fontFamily: template.defaultFont, color: template.defaultCaptionColor };
    setSpreads((prev) => {
      const next = [...prev];
      next[spreadIdx] = { ...next[spreadIdx], captions: [...next[spreadIdx].captions, caption] };
      spreadsRef.current = next;
      return next;
    });
    return caption.id;
  }, [template]);

  const updateCaption = useCallback((spreadIdx: number, captionId: string, updates: Partial<Omit<DraftCaption, 'id'>>) => {
    setSpreads((prev) => {
      const next = [...prev];
      next[spreadIdx] = { ...next[spreadIdx], captions: next[spreadIdx].captions.map((c) => c.id === captionId ? { ...c, ...updates } : c) };
      spreadsRef.current = next;
      return next;
    });
  }, []);

  const removeCaption = useCallback((spreadIdx: number, captionId: string) => {
    setSpreads((prev) => {
      const next = [...prev];
      next[spreadIdx] = { ...next[spreadIdx], captions: next[spreadIdx].captions.filter((c) => c.id !== captionId) };
      spreadsRef.current = next;
      return next;
    });
  }, []);

  useEffect(() => {
    return () => {
      previewUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
      previewUrlsRef.current.clear();
    };
  }, []);

  async function addToCart() {
    if (!product || !size || !selected) return;
    setBusy(true); setCartError(null);
    try {
      await add({
        productId: product.id, productVariantId: size.variantId, productFrameOptionId: null,
        pageCount: selected.pageCount, quantity: qty,
        productName: product.name, productSlug: product.slug,
        selectedVariant: variantSnapshot(product, size, selected.price),
        basePrice: selected.price, selectedFrameOption: null, unitPrice: selected.price,
      });
      setAdded(true);
    } catch (e) {
      setCartError(e instanceof ApiRequestError ? e.message : 'Không thêm được vào giỏ.');
    } finally { setBusy(false); }
  }

  if (product && !product.pagePriced) return <Navigate to={`/tranh/${product.slug}`} replace />;

  if (loadError) {
    return (
      <StoreShell cartCount={cartCount}>
        <StoreNotice
          title="Không mở được photobook này"
          body={loadError}
          action={<Link className="btn btn-secondary" to={CATALOG_HREF}>← Về danh sách</Link>}
        />
      </StoreShell>
    );
  }

  if (!product || !pricing) {
    return (
      <StoreShell cartCount={cartCount}>
        <PhotobookDetailSkeleton />
      </StoreShell>
    );
  }

  return (
    <StoreShell cartCount={cartCount}>
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" data-breadcrumb="" style={{
        display: 'flex', alignItems: 'center', gap: 'var(--space-3)', minHeight: 46, padding: '0 var(--space-8)',
        borderBottom: '2px solid var(--color-divider)', fontSize: 11, letterSpacing: '.16em',
        textTransform: 'uppercase', color: 'var(--color-neutral-700)',
      }}>
        <Link to="/" style={{ color: 'var(--color-neutral-700)', textDecoration: 'none' }}>Trang chủ</Link>
        <span aria-hidden="true">/</span>
        <Link to={CATALOG_HREF} style={{ color: 'var(--color-neutral-700)', textDecoration: 'none' }}>Photobook</Link>
        <span aria-hidden="true">/</span>
        <span style={{ color: 'var(--color-text)' }}>{product.name}</span>
      </nav>

      {/* Step indicator */}
      <div data-pb-step-bar="" style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--space-4)',
        padding: 'var(--space-4) var(--space-8)', borderBottom: '2px solid var(--color-text)',
        background: 'var(--color-neutral-100)',
      }}>
        {STEPS.map((label, i) => {
          const active = i === step;
          const done = i < step;
          return (
            <button key={label} type="button" onClick={() => { if (done) setStep(i); }}
              disabled={i > step}
              style={{
                appearance: 'none', display: 'flex', alignItems: 'center', gap: 6, border: 0,
                background: 'transparent', font: 'inherit', fontSize: 12, fontWeight: active ? 700 : 400,
                letterSpacing: '.08em', textTransform: 'uppercase', cursor: done ? 'pointer' : 'default',
                color: active ? 'var(--color-text)' : done ? 'var(--color-accent-700)' : 'var(--color-neutral-500)',
              }}>
              <span style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 24, height: 24,
                borderRadius: '50%', fontSize: 11, fontWeight: 700,
                background: active ? 'var(--color-text)' : done ? 'var(--color-accent-700)' : 'var(--color-neutral-300)',
                color: active || done ? 'var(--color-bg)' : 'var(--color-neutral-600)',
              }}>{done ? '✓' : i + 1}</span>
              {label}
            </button>
          );
        })}
      </div>

      {/* Step content */}
      {step === 0 && (
        <StepSpecs
          product={product} pricing={pricing} size={size} sizeId={sizeId} setSizeId={setSizeId}
          pageIndex={pageIndex} setPageIndex={setPageIndex} pageOptions={pageOptions} selected={selected}
          finish={finish} setFinish={setFinish} qty={qty} setQty={setQty}
          price={price} photos={photos} photoCount={photoCount} setPhotoCount={setPhotoCount}
          suggestion={suggestion} templateId={templateId} setTemplateId={setTemplateId}
          spreadsHaveImages={spreads.some((s) => s.slots.some((sl) => sl.file !== null))}
          onApplyTemplate={() => applyTemplateToSpreads(template)}
          onNext={() => setStep(1)}
        />
      )}

      {step === 1 && (
        <StepArrange
          spreads={spreads} currentIdx={currentSpreadIdx} setCurrentIdx={setCurrentSpreadIdx}
          onChangeLayout={changeLayout} onSetSlotFile={setSlotFile} onSwapSlots={swapSlots} onSetSlotCrop={setSlotCrop}
          onAddCaption={addCaption} onUpdateCaption={updateCaption} onRemoveCaption={removeCaption}
          history={historyBySpread[currentSpreadIdx]} onRemember={rememberSpread}
          onUndo={undoSpread} onRedo={redoSpread} onAutoFillFiles={autoFillFiles}
          draftNotice={draftNotice}
          onBack={() => setStep(0)} onNext={() => setStep(2)}
        />
      )}

      {step === 2 && (
        <StepReview
          spreads={spreads} price={price} qty={qty} finish={finish} size={size} selected={selected}
          added={added} busy={busy} cartError={cartError} slug={slug} templateId={templateId}
          onEdit={(idx) => { setCurrentSpreadIdx(idx); setStep(1); }}
          onBack={() => setStep(1)}
          onAddToCart={() => void addToCart()}
        />
      )}
    </StoreShell>
  );
}

function SkeletonBlock({ width = '100%', height = 16 }: { width?: string | number; height?: string | number }) {
  return (
    <span
      aria-hidden="true"
      style={{
        display: 'block', width, height, borderRadius: 3,
        background: 'linear-gradient(90deg, var(--color-neutral-200), var(--color-neutral-100), var(--color-neutral-200))',
        backgroundSize: '200% 100%', animation: 'photobook-skeleton 1.25s ease-in-out infinite',
      }}
    />
  );
}

function PhotobookDetailSkeleton() {
  return (
    <div aria-busy="true" aria-label="Đang tải cấu hình photobook" style={{ paddingBottom: 56 }}>
      <nav aria-label="Điều hướng" style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '22px 0 16px' }}>
        <SkeletonBlock width={78} height={12} />
        <SkeletonBlock width={8} height={12} />
        <SkeletonBlock width={132} height={12} />
      </nav>

      <div data-pb-step-bar style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28 }}>
        {['Quy cách', 'Thêm ảnh', 'Xem lại'].map((label, index) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8, color: index === 0 ? 'var(--color-text)' : 'var(--color-text-muted)' }}>
            <span style={{ width: 24, height: 24, borderRadius: '50%', background: index === 0 ? 'var(--color-neutral-300)' : 'var(--color-neutral-200)' }} />
            <span style={{ fontSize: 13 }}>{label}</span>
            {index < 2 && <span style={{ width: 44, height: 1, background: 'var(--color-border)' }} />}
          </div>
        ))}
      </div>

      <section data-split style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.05fr) minmax(320px, .95fr)', border: '1px solid var(--color-border)', background: 'var(--color-surface)' }}>
        <div style={{ minHeight: 420, padding: 28, display: 'grid', placeItems: 'center', borderRight: '1px solid var(--color-border)', background: 'var(--color-neutral-50)' }}>
          <div style={{ width: '88%', maxWidth: 490, aspectRatio: '4 / 3', borderRadius: 3, overflow: 'hidden' }}>
            <SkeletonBlock height="100%" />
          </div>
        </div>
        <div style={{ padding: 30, display: 'grid', alignContent: 'start', gap: 20 }}>
          <div style={{ display: 'grid', gap: 10 }}>
            <SkeletonBlock width="42%" height={13} />
            <SkeletonBlock width="76%" height={30} />
            <SkeletonBlock width="96%" height={14} />
          </div>
          <div style={{ display: 'grid', gap: 10 }}>
            <SkeletonBlock width="32%" height={13} />
            <div style={{ display: 'flex', gap: 8 }}>
              <SkeletonBlock width={96} height={44} />
              <SkeletonBlock width={96} height={44} />
              <SkeletonBlock width={96} height={44} />
            </div>
          </div>
          <div style={{ display: 'grid', gap: 10 }}>
            <SkeletonBlock width="36%" height={13} />
            <div style={{ display: 'flex', gap: 8 }}>
              <SkeletonBlock width={74} height={38} />
              <SkeletonBlock width={74} height={38} />
              <SkeletonBlock width={74} height={38} />
            </div>
          </div>
          <SkeletonBlock height={50} />
        </div>
      </section>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   Step 1 — Chọn quy cách
   ═══════════════════════════════════════════════════════════════════════════ */

function StepSpecs({ product, pricing, size, sizeId, setSizeId, pageIndex, setPageIndex, pageOptions, selected,
  finish, setFinish, qty, setQty, price, photos, photoCount, setPhotoCount, suggestion,
  templateId, setTemplateId, spreadsHaveImages, onApplyTemplate, onNext,
}: {
  product: Product; pricing: PhotobookPricing;
  size: PhotobookSize | null; sizeId: string | null; setSizeId: (id: string) => void;
  pageIndex: number; setPageIndex: (fn: number | ((i: number) => number)) => void;
  pageOptions: { pageCount: number; price: number }[]; selected: { pageCount: number; price: number } | null;
  finish: string; setFinish: (f: string) => void;
  qty: number; setQty: (fn: number | ((q: number) => number)) => void;
  price: number; photos: { min: number; max: number } | null;
  photoCount: string; setPhotoCount: (v: string) => void;
  suggestion: number | null; templateId: string; setTemplateId: (id: string) => void;
  spreadsHaveImages: boolean; onApplyTemplate: () => void; onNext: () => void;
}) {
  const images = product.images ?? [];
  const [shot, setShot] = useState(0);
  const currentImage = images[shot] ?? images[0] ?? null;
  const thumbCols = Math.min(Math.max(images.length, 1), 4);
  const [pendingApply, setPendingApply] = useState(false);

  return (
    <section data-split="" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', alignItems: 'start' }}>
      <div style={{ display: 'flex', flexDirection: 'column', borderRight: '2px solid var(--color-text)' }}>
        <div style={{
          position: 'relative', width: '100%', aspectRatio: '4/3', maxHeight: '62vh',
          background: 'var(--color-neutral-200)', borderBottom: '2px solid var(--color-text)', overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', inset: 0 }}>
            <Frame src={currentImage?.secureUrl} alt={currentImage?.altText ?? undefined}
              label={`photobook — ${product.name}`} tone="color" fit="contain" />
          </div>
          {size && selected && (
            <span style={{
              position: 'absolute', right: 'var(--space-4)', bottom: 'var(--space-4)', padding: '7px 11px',
              background: 'var(--color-text)', color: 'var(--color-bg)', fontSize: 11,
              letterSpacing: '.16em', textTransform: 'uppercase',
            }}>
              {formatSize(size.widthCm, size.heightCm)} · {selected.pageCount} trang · {finish}
            </span>
          )}
        </div>
        {images.length > 1 && (
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${thumbCols}, minmax(0, 1fr))` }}>
            {images.map((image, k) => {
              const on = k === shot;
              return (
                <button key={image.id} type="button" onClick={() => setShot(k)} aria-pressed={on} style={{
                  appearance: 'none', position: 'relative', padding: 0, width: '100%', aspectRatio: '1/1',
                  background: 'var(--color-neutral-200)', cursor: 'pointer', overflow: 'hidden', border: 0,
                  borderRight: k % thumbCols === thumbCols - 1 ? 0 : '2px solid var(--color-text)',
                  borderTop: k >= thumbCols ? '2px solid var(--color-text)' : 0,
                  outline: on ? '3px solid var(--color-accent)' : 'none', outlineOffset: -3,
                }}>
                  <div style={{ position: 'absolute', inset: 0 }}>
                    <Frame src={image.secureUrl} alt={image.altText ?? undefined} label={`ảnh ${k + 1}`} tone="color" />
                  </div>
                </button>
              );
            })}
          </div>
        )}
        <div data-pb-price-table="" style={{ padding: 'var(--space-6) var(--space-8)' }}>
          <span style={STORE_LABEL_STYLE}>Bảng giá theo khổ</span>
          <div style={{ marginTop: 'var(--space-4)', overflowX: 'auto' }}>
            <table className="table" style={{ minWidth: 320 }}>
              <thead><tr><th>Số trang</th>{pricing.sizes.map((s) => <th key={s.variantId}>{s.name}</th>)}</tr></thead>
              <tbody>
                {(pricing.sizes[0]?.pageOptions ?? []).slice(0, 6).map((opt, idx) => (
                  <tr key={opt.pageCount}>
                    <td>{opt.pageCount} trang</td>
                    {pricing.sizes.map((s) => <td key={s.variantId}>{formatPrice(s.pageOptions[idx]?.price)}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div id="mua" data-pb-buy="" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)', padding: 'var(--space-8)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          <span style={{ fontSize: 11, letterSpacing: '.2em', textTransform: 'uppercase', color: 'var(--color-accent-700)' }}>{product.categoryName}</span>
          <h1 style={{ margin: 0, fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: 30, lineHeight: 1.05, letterSpacing: '-.03em' }}>{product.name}</h1>
          {product.description && <p style={{ margin: 0, maxWidth: '48ch', fontSize: 15, lineHeight: 1.6, color: 'var(--color-neutral-800)' }}>{product.description}</p>}
        </div>

        <div style={{
          display: 'flex', alignItems: 'baseline', gap: 'var(--space-4)', padding: 'var(--space-4) 0',
          borderTop: '2px solid var(--color-text)', borderBottom: '2px solid var(--color-text)',
        }}>
          <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: 26, letterSpacing: '-.03em' }}>{formatPrice(price)}</span>
          <span style={{ fontSize: 12, color: 'var(--color-neutral-700)' }}>đã gồm bìa cứng in hình và áo bọc</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div data-option-row="" style={optionRow}>
            <span style={STORE_LABEL_STYLE}>Khổ</span>
            <div style={chipGrid}>
              {pricing.sizes.map((s) => {
                const on = s.variantId === sizeId;
                const at = s.pageOptions[Math.min(pageIndex, s.pageOptions.length - 1)];
                return (
                  <button key={s.variantId} type="button" disabled={!s.available} aria-pressed={on}
                    title={at ? formatPrice(at.price) : undefined} onClick={() => setSizeId(s.variantId)}
                    style={chipStyle(on, !s.available)}>{s.name}</button>
                );
              })}
            </div>
          </div>
          <div data-option-row="" style={optionRow}>
            <span style={STORE_LABEL_STYLE}>Số trang</span>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-4)', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', border: '2px solid var(--color-text)' }}>
                <button type="button" aria-label="Bớt trang" disabled={pageIndex <= 0}
                  onClick={() => setPageIndex((i: number) => Math.max(0, i - 1))} style={stepBtnStyle(pageIndex <= 0)}>−</button>
                <span style={{ minWidth: 72, textAlign: 'center', fontSize: 14, fontWeight: 600 }}>{selected?.pageCount ?? '—'} trang</span>
                <button type="button" aria-label="Thêm trang" disabled={pageIndex >= pageOptions.length - 1}
                  onClick={() => setPageIndex((i: number) => Math.min(pageOptions.length - 1, i + 1))}
                  style={stepBtnStyle(pageIndex >= pageOptions.length - 1)}>+</button>
              </div>
              {photos && <span style={{ ...STORE_LABEL_STYLE, letterSpacing: '.1em' }}>Cần {photos.min}–{photos.max} hình</span>}
            </div>
          </div>
          <div data-option-row="" style={optionRow}>
            <span style={STORE_LABEL_STYLE}>Bề mặt</span>
            <div style={chipGrid}>
              {FINISHES.map((f) => (
                <button key={f} type="button" aria-pressed={f === finish} onClick={() => setFinish(f)} style={chipStyle(f === finish)}>{f}</button>
              ))}
            </div>
          </div>
          <div data-option-row="" style={optionRow}>
            <span style={STORE_LABEL_STYLE}>Số lượng</span>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-4)' }}>
              <div style={{ display: 'flex', alignItems: 'center', border: '2px solid var(--color-text)' }}>
                <button type="button" aria-label="Bớt một" disabled={qty <= 1}
                  onClick={() => setQty((q: number) => Math.max(1, q - 1))} style={stepBtnStyle(qty <= 1)}>−</button>
                <span style={{ minWidth: 36, textAlign: 'center', fontSize: 14, fontWeight: 600 }}>{qty}</span>
                <button type="button" aria-label="Thêm một" disabled={qty >= 9}
                  onClick={() => setQty((q: number) => Math.min(9, q + 1))} style={stepBtnStyle(qty >= 9)}>+</button>
              </div>
              <span style={{ fontSize: 12, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--color-neutral-700)' }}>Tổng {formatPrice(price * qty)}</span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          <label htmlFor="photo-count" style={STORE_LABEL_STYLE}>Bạn có bao nhiêu ảnh?</label>
          <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center', flexWrap: 'wrap' }}>
            <input id="photo-count" className="input" type="number" min={1} inputMode="numeric"
              placeholder="ví dụ 150" value={photoCount}
              onChange={(e) => setPhotoCount(e.target.value)} style={{ maxWidth: 140 }} />
            {suggestion !== null && (
              <button type="button" className="btn btn-ghost"
                onClick={() => setPageIndex(pageOptions.findIndex((o) => o.pageCount === suggestion))}>
                Nên chọn {suggestion} trang →
              </button>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          <span style={STORE_LABEL_STYLE}>Chọn chủ đề</span>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 8 }}>
            {PHOTOBOOK_TEMPLATES.map((tpl) => {
              const on = tpl.id === templateId;
              const previewColors = tpl.spreadColors.slice(0, 3);
              return (
                <button key={tpl.id} type="button" onClick={() => { setTemplateId(tpl.id); if (spreadsHaveImages && tpl.id !== templateId) setPendingApply(true); }}
                  aria-pressed={on} style={{
                    appearance: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                    padding: '10px 6px', cursor: 'pointer', borderRadius: 4, font: 'inherit',
                    border: `2px solid ${on ? 'var(--color-accent)' : 'var(--color-neutral-300)'}`,
                    background: on ? 'var(--color-accent-100, rgba(180,60,60,.08))' : 'var(--color-bg)',
                    transition: 'border-color .15s, background .15s',
                  }}>
                  <div style={{ display: 'flex', gap: 2, height: 20 }}>
                    {previewColors.map((c, ci) => (
                      <div key={ci} style={{ width: 28, height: 20, borderRadius: 2, background: c, border: '1px solid var(--color-neutral-300)' }} />
                    ))}
                  </div>
                  <span style={{ fontSize: 18, lineHeight: 1 }}>{tpl.icon}</span>
                  <span style={{ fontSize: 11, fontWeight: on ? 700 : 500, lineHeight: 1.2, textAlign: 'center',
                    fontFamily: `"${tpl.defaultFont}", sans-serif`,
                  }}>{tpl.name}</span>
                </button>
              );
            })}
          </div>
          {pendingApply && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 'var(--space-3)', flexWrap: 'wrap',
              padding: 'var(--space-3)', background: 'var(--color-accent-100, rgba(180,60,60,.08))',
              borderRadius: 4, fontSize: 13,
            }}>
              <span>Áp dụng bố cục mới cho các spread chưa có ảnh?</span>
              <button type="button" className="btn btn-secondary" style={{ fontSize: 12, padding: '4px 12px' }}
                onClick={() => { onApplyTemplate(); setPendingApply(false); }}>
                Áp dụng
              </button>
              <button type="button" className="btn btn-ghost" style={{ fontSize: 12, padding: '4px 12px' }}
                onClick={() => setPendingApply(false)}>
                Bỏ qua
              </button>
            </div>
          )}
        </div>

        <button type="button" className="btn btn-primary btn-block" disabled={!selected || !size?.available}
          onClick={onNext} style={{ cursor: 'pointer' }}>
          {!size?.available ? 'Khổ này tạm ngưng' : 'Tiếp — Thêm ảnh →'}
        </button>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   Step 2 — Sắp xếp spread
   ═══════════════════════════════════════════════════════════════════════════ */

function StepArrange({ spreads, currentIdx, setCurrentIdx, onChangeLayout, onSetSlotFile, onSwapSlots, onSetSlotCrop, onAddCaption, onUpdateCaption, onRemoveCaption, history, onRemember, onUndo, onRedo, onAutoFillFiles, draftNotice, onBack, onNext }: {
  spreads: DraftSpread[]; currentIdx: number; setCurrentIdx: (i: number) => void;
  onChangeLayout: (spreadIdx: number, code: string) => void;
  onSetSlotFile: (spreadIdx: number, slotIdx: number, file: File | null) => void;
  onSwapSlots: (spreadIdx: number, fromSlot: number, toSlot: number) => void;
  onSetSlotCrop: (spreadIdx: number, slotIdx: number, crop: Pick<DraftSlot, 'zoom' | 'panX' | 'panY'>) => void;
  onAddCaption: (spreadIdx: number) => string;
  onUpdateCaption: (spreadIdx: number, captionId: string, updates: Partial<Omit<DraftCaption, 'id'>>) => void;
  onRemoveCaption: (spreadIdx: number, captionId: string) => void;
  history: SpreadHistory | undefined;
  onRemember: (spreadIdx: number, spread: DraftSpread) => void;
  onUndo: (spreadIdx: number) => void;
  onRedo: (spreadIdx: number) => void;
  onAutoFillFiles: (files: File[]) => AutoFillResult;
  draftNotice: string | null;
  onBack: () => void; onNext: () => void;
}) {
  const arrangeRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const slotRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const focusedSlotRef = useRef<number | null>(null);
  const [pendingSlot, setPendingSlot] = useState<number | null>(null);
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);
  const [editingSlot, setEditingSlot] = useState<number | null>(null);
  const [editingCaptionId, setEditingCaptionId] = useState<string | null>(null);
  const [autoFillMessage, setAutoFillMessage] = useState<string | null>(null);
  const captionDragRef = useRef<{ id: string; startX: number; startY: number; origX: number; origY: number; moved: boolean } | null>(null);
  const spread = spreads[currentIdx];
  const layout = layoutByCode(spread?.layoutCode ?? 'TRAN_DOI');
  const rememberCurrent = useCallback(() => {
    if (spread) onRemember(currentIdx, spread);
  }, [currentIdx, onRemember, spread]);
  const handleUndo = useCallback(() => {
    setEditingSlot(null);
    onUndo(currentIdx);
  }, [currentIdx, onUndo]);
  const handleRedo = useCallback(() => {
    setEditingSlot(null);
    onRedo(currentIdx);
  }, [currentIdx, onRedo]);
  const navigateSpread = useCallback((nextIdx: number) => {
    if (nextIdx < 0 || nextIdx >= spreads.length || nextIdx === currentIdx) return;
    setCurrentIdx(nextIdx);
    const focusedSlot = focusedSlotRef.current;
    if (focusedSlot !== null) {
      window.requestAnimationFrame(() => slotRefs.current[focusedSlot]?.focus());
    }
  }, [currentIdx, setCurrentIdx, spreads.length]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((!event.ctrlKey && !event.metaKey) || event.altKey) return;
      const target = event.target;
      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement) return;
      const key = event.key.toLowerCase();
      if (key === 'z') {
        event.preventDefault();
        if (event.shiftKey) handleRedo(); else handleUndo();
      } else if (key === 'y') {
        event.preventDefault();
        handleRedo();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleRedo, handleUndo]);

  useEffect(() => {
    const input = folderInputRef.current;
    input?.setAttribute('webkitdirectory', '');
    input?.setAttribute('directory', '');
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || editingSlot !== null) return;
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
      const target = event.target;
      if (!(target instanceof Node) || !arrangeRef.current?.contains(target)) return;
      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement) return;
      const nextIdx = event.key === 'ArrowLeft' ? currentIdx - 1 : currentIdx + 1;
      if (nextIdx < 0 || nextIdx >= spreads.length) return;
      event.preventDefault();
      navigateSpread(nextIdx);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [currentIdx, editingSlot, navigateSpread, spreads.length]);

  function handleSlotClick(slotIdx: number) {
    if (spread?.slots[slotIdx]?.preview) {
      setEditingSlot(slotIdx);
      return;
    }
    setPendingSlot(slotIdx);
    fileRef.current?.click();
  }

  function replaceImage() {
    if (editingSlot === null) return;
    setPendingSlot(editingSlot);
    fileRef.current?.click();
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    if (file && pendingSlot !== null) {
      rememberCurrent();
      onSetSlotFile(currentIdx, pendingSlot, file);
    }
    setPendingSlot(null);
    e.target.value = '';
  }

  function handleFolderChange(e: React.ChangeEvent<HTMLInputElement>) {
    const imageFiles = Array.from(e.target.files ?? []).filter((file) => file.type.startsWith('image/'));
    if (!imageFiles.length) {
      setAutoFillMessage('Không tìm thấy file ảnh trong thư mục đã chọn.');
      e.target.value = '';
      return;
    }
    const { placed, remaining } = onAutoFillFiles(imageFiles);
    setAutoFillMessage(remaining > 0
      ? `Đã tự điền ${placed} ảnh. Còn ${remaining} ảnh chưa đặt vì các slot hiện tại đã đầy.`
      : `Đã tự điền ${placed} ảnh theo thứ tự tên file.`);
    e.target.value = '';
  }

  function fillEmptySlots(files: File[]) {
    if (!spread) return;
    const hasEmptySlot = layout.slots.some((_, slotIdx) => !spread.slots[slotIdx]?.file);
    if (!hasEmptySlot) return;
    rememberCurrent();
    let fileIdx = 0;
    for (let slotIdx = 0; slotIdx < layout.slots.length && fileIdx < files.length; slotIdx++) {
      if (!spread.slots[slotIdx]?.file) {
        onSetSlotFile(currentIdx, slotIdx, files[fileIdx]);
        fileIdx++;
      }
    }
  }

  function handleSlotKeyDown(event: React.KeyboardEvent<HTMLButtonElement>, slotIdx: number) {
    if (event.key !== 'Tab') return;
    const nextSlot = slotIdx + (event.shiftKey ? -1 : 1);
    if (nextSlot < 0 || nextSlot >= layout.slots.length) return;
    event.preventDefault();
    slotRefs.current[nextSlot]?.focus();
  }

  if (!spread) return null;

  const filledSlots = spread.slots.filter((s) => s.file).length;
  const totalSlots = layout.slots.length;

  return (
    <div ref={arrangeRef} data-pb-arrange="" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)', padding: 'var(--space-8)', maxWidth: 900, margin: '0 auto' }}>
      <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileChange} />
      <input ref={folderInputRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={handleFolderChange} />

      {/* Spread navigation */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <button type="button" className="btn btn-ghost" disabled={currentIdx <= 0}
          onClick={() => navigateSpread(currentIdx - 1)}>← Trước</button>
        <span style={{ fontSize: 14, fontWeight: 700, letterSpacing: '.06em' }}>
          Spread {currentIdx + 1} / {spreads.length}
        </span>
        <button type="button" className="btn btn-ghost" disabled={currentIdx >= spreads.length - 1}
          onClick={() => navigateSpread(currentIdx + 1)}>Sau →</button>
      </div>

      <div aria-label="Lịch sử chỉnh sửa" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
        <button type="button" className="btn btn-ghost" disabled={!history?.past.length} onClick={handleUndo} title="Ctrl+Z">
          ↶ Hoàn tác
        </button>
        <button type="button" className="btn btn-ghost" disabled={!history?.future.length} onClick={handleRedo} title="Ctrl+Shift+Z">
          ↷ Làm lại
        </button>
        <span style={{ fontSize: 11, color: 'var(--color-neutral-600)' }}>Ctrl/Cmd + Z</span>
      </div>

      {draftNotice && <p role="status" style={{ margin: 0, fontSize: 12, color: 'var(--color-neutral-700)', textAlign: 'center' }}>{draftNotice}</p>}

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-2)' }}>
        <button type="button" className="btn btn-secondary" onClick={() => folderInputRef.current?.click()}>
          Tải thư mục ảnh & tự điền
        </button>
        <p style={{ margin: 0, fontSize: 12, color: 'var(--color-neutral-700)', textAlign: 'center' }}>
          Chỉ lấp các slot trống, theo thứ tự tên file; ảnh đã sắp xếp sẽ được giữ nguyên.
        </p>
        {autoFillMessage && <p role="status" style={{ margin: 0, fontSize: 12, color: 'var(--color-accent-700)', textAlign: 'center' }}>{autoFillMessage}</p>}
      </div>

      {/* Layout picker */}
      <div>
        <span style={{ ...STORE_LABEL_STYLE, marginBottom: 'var(--space-3)', display: 'block' }}>Chọn bố cục</span>
        <div data-pb-layout-picker="" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {SPREAD_LAYOUTS.map((l) => (
            <LayoutThumb key={l.code} layout={l} active={l.code === spread.layoutCode}
              onClick={() => {
                if (l.code === spread.layoutCode) return;
                rememberCurrent();
                onChangeLayout(currentIdx, l.code);
              }} />
          ))}
        </div>
      </div>

      {/* Spread widget */}
      <div style={{
        position: 'relative', width: '100%', aspectRatio: '2 / 1.4',
        background: spread.backgroundColor || 'var(--color-neutral-100)', border: '2px solid var(--color-text)', borderRadius: 4,
        containerType: 'inline-size',
      }}
        onDragOver={(e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = dragFrom !== null ? 'move' : 'copy';
        }}
        onDrop={(e) => {
          e.preventDefault();
          const files = Array.from(e.dataTransfer.files).filter((file) => file.type.startsWith('image/'));
          if (files.length > 0) fillEmptySlots(files);
          setDragFrom(null);
          setDragOver(null);
        }}>
        <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: 1, background: 'var(--color-neutral-300)', zIndex: 1 }} />
        {layout.slots.length === 0 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%',
            fontSize: 13, color: 'var(--color-neutral-500)', fontStyle: 'italic', letterSpacing: '.1em' }}>
            Trang trang trí — không có ô ảnh
          </div>
        )}
        {layout.slots.map((slot, i) => {
          const data = spread.slots[i];
          return (
            <button key={i} ref={(node) => { slotRefs.current[i] = node; }} type="button" onClick={() => handleSlotClick(i)}
              onFocus={() => { focusedSlotRef.current = i; }}
              onKeyDown={(event) => handleSlotKeyDown(event, i)}
              aria-label={data?.preview ? `Ô ảnh ${i + 1}. Nhấn Enter để chỉnh khung ảnh.` : `Ô ảnh ${i + 1}. Nhấn Enter để thêm ảnh.`}
              draggable={!!data?.preview}
              onDragStart={(e) => {
                setDragFrom(i);
                e.dataTransfer.effectAllowed = 'move';
                if (data?.preview) {
                  const image = new Image();
                  image.src = data.preview;
                  e.dataTransfer.setDragImage(image, 40, 40);
                }
              }}
              onDragEnd={() => { setDragFrom(null); setDragOver(null); }}
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
                e.dataTransfer.dropEffect = dragFrom !== null ? 'move' : 'copy';
                setDragOver(i);
              }}
              onDragLeave={() => setDragOver((value) => value === i ? null : value)}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setDragOver(null);
                const file = e.dataTransfer.files?.[0];
                if (file?.type.startsWith('image/')) {
                  rememberCurrent();
                  onSetSlotFile(currentIdx, i, file);
                } else if (dragFrom !== null && dragFrom !== i) {
                  rememberCurrent();
                  onSwapSlots(currentIdx, dragFrom, i);
                }
                setDragFrom(null);
              }}
              style={{
              position: 'absolute', left: `${slot.x * 100}%`, top: `${slot.y * 100}%`,
              width: `${slot.w * 100}%`, height: `${slot.h * 100}%`,
              border: data?.preview ? '2px solid var(--color-accent)' : '2px dashed var(--color-neutral-400)',
              background: data?.preview ? 'transparent' : 'var(--color-neutral-200)',
              cursor: 'pointer', padding: 0, overflow: 'hidden', borderRadius: slot.bleed ? 0 : 3,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'border-color .2s, opacity .2s', outline: dragOver === i ? '3px solid var(--color-accent)' : 'none',
              outlineOffset: -3, opacity: dragFrom === i ? 0.4 : 1,
            }}>
              {data?.preview ? (
                <SlotImage slot={data} alt={`Slot ${i + 1}`} />
              ) : (
                <span style={{ fontSize: 24, color: 'var(--color-neutral-400)', fontWeight: 300 }}>+</span>
              )}
            </button>
          );
        })}
        {/* Captions on spread */}
        {spread.captions.map((caption) => (
          <div key={caption.id}
            onPointerDown={(e) => {
              if (e.button !== 0) return;
              e.stopPropagation();
              e.currentTarget.setPointerCapture(e.pointerId);
              captionDragRef.current = { id: caption.id, startX: e.clientX, startY: e.clientY, origX: caption.x, origY: caption.y, moved: false };
            }}
            onPointerMove={(e) => {
              const drag = captionDragRef.current;
              if (!drag || drag.id !== caption.id) return;
              const parent = e.currentTarget.parentElement;
              if (!parent) return;
              const rect = parent.getBoundingClientRect();
              const dx = (e.clientX - drag.startX) / rect.width;
              const dy = (e.clientY - drag.startY) / rect.height;
              if (!drag.moved && Math.abs(dx) * rect.width + Math.abs(dy) * rect.height > 5) {
                drag.moved = true;
                rememberCurrent();
              }
              if (drag.moved) onUpdateCaption(currentIdx, caption.id, { x: clamp(drag.origX + dx, 0.02, 0.98), y: clamp(drag.origY + dy, 0.02, 0.98) });
            }}
            onPointerUp={(e) => {
              const drag = captionDragRef.current;
              if (drag?.id === caption.id) {
                if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
                if (!drag.moved) setEditingCaptionId(caption.id);
                captionDragRef.current = null;
              }
            }}
            style={{
              position: 'absolute', left: `${caption.x * 100}%`, top: `${caption.y * 100}%`,
              transform: 'translate(-50%, -50%)', zIndex: 5, maxWidth: '60%',
              padding: '2px 6px', cursor: 'grab', touchAction: 'none', userSelect: 'none',
              fontSize: `${caption.fontSize}cqw`, fontWeight: caption.bold ? 700 : 400,
              fontFamily: `"${caption.fontFamily}", ${CAPTION_FONTS.find((f) => f.value === caption.fontFamily)?.fallback ?? 'sans-serif'}`,
              color: caption.color, textAlign: caption.align, lineHeight: 1.3, whiteSpace: 'pre-wrap',
              textShadow: caption.color === '#ffffff' || caption.color === '#FFFFFF'
                ? '0 1px 3px rgba(0,0,0,.5)' : '0 1px 2px rgba(255,255,255,.3)',
              border: '1px dashed transparent', borderRadius: 2,
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--color-accent)'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = 'transparent'; }}
          >
            {caption.text || 'Nhấn để nhập chữ'}
          </div>
        ))}
      </div>

      {editingSlot !== null && spread.slots[editingSlot]?.preview && layout.slots[editingSlot] && (
        <CropEditor
          slot={spread.slots[editingSlot]}
          slotAspectRatio={layout.slots[editingSlot].w / layout.slots[editingSlot].h}
          onChange={(crop) => onSetSlotCrop(currentIdx, editingSlot, crop)}
          onBeginEdit={rememberCurrent}
          onReplace={replaceImage}
          onClose={() => setEditingSlot(null)}
        />
      )}

      {editingCaptionId !== null && spread.captions.find((c) => c.id === editingCaptionId) && (
        <CaptionEditor
          caption={spread.captions.find((c) => c.id === editingCaptionId)!}
          onChange={(updates) => onUpdateCaption(currentIdx, editingCaptionId, updates)}
          onDelete={() => { rememberCurrent(); onRemoveCaption(currentIdx, editingCaptionId); setEditingCaptionId(null); }}
          onClose={() => setEditingCaptionId(null)}
        />
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
        <button type="button" className="btn btn-secondary" onClick={() => {
          rememberCurrent();
          const id = onAddCaption(currentIdx);
          setEditingCaptionId(id);
        }} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontFamily: 'serif', fontWeight: 700, fontSize: 16 }}>T</span> Thêm chữ
        </button>
        {spread.captions.length > 0 && (
          <span style={{ fontSize: 12, color: 'var(--color-neutral-600)' }}>
            {spread.captions.length} caption · Kéo để di chuyển, bấm để sửa
          </span>
        )}
      </div>

      {totalSlots > 0 && (
        <p style={{ margin: 0, fontSize: 12, color: 'var(--color-neutral-700)', textAlign: 'center' }}>
          {filledSlots}/{totalSlots} ảnh đã thêm · Bấm ảnh để chỉnh crop, hoặc kéo thả để sắp xếp
        </p>
      )}
      <p style={{ margin: 0, fontSize: 12, color: 'var(--color-neutral-600)', textAlign: 'center' }}>
        Mẹo: dùng ←/→ để chuyển spread, Tab hoặc Shift+Tab để chuyển giữa các ô ảnh.
      </p>

      {/* Navigation */}
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--space-4)' }}>
        <button type="button" className="btn btn-secondary" onClick={onBack}>← Quay lại</button>
        <button type="button" className="btn btn-primary" onClick={onNext}>Xem lại cuốn sách →</button>
      </div>
    </div>
  );
}

function CropEditor({ slot, slotAspectRatio, onChange, onBeginEdit, onReplace, onClose }: {
  slot: DraftSlot;
  slotAspectRatio: number;
  onChange: (crop: Pick<DraftSlot, 'zoom' | 'panX' | 'panY'>) => void;
  onBeginEdit: () => void;
  onReplace: () => void;
  onClose: () => void;
}) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null);
  const hasEditedRef = useRef(false);
  const zoom = clamp(slot.zoom ?? 1, 1, 3);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  function setZoom(nextZoom: number) {
    if (!hasEditedRef.current) {
      onBeginEdit();
      hasEditedRef.current = true;
    }
    onChange({ zoom: clamp(nextZoom, 1, 3), panX: slot.panX ?? 0, panY: slot.panY ?? 0 });
  }

  function onPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = { x: event.clientX, y: event.clientY, panX: slot.panX ?? 0, panY: slot.panY ?? 0 };
  }

  function onPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    const viewport = viewportRef.current;
    if (!drag || !viewport) return;
    if (!hasEditedRef.current) {
      onBeginEdit();
      hasEditedRef.current = true;
    }
    const rect = viewport.getBoundingClientRect();
    onChange({
      zoom,
      panX: clamp(drag.panX - (event.clientX - drag.x) / Math.max(rect.width * 0.3, 1), -1, 1),
      panY: clamp(drag.panY - (event.clientY - drag.y) / Math.max(rect.height * 0.3, 1), -1, 1),
    });
  }

  function onPointerEnd(event: React.PointerEvent<HTMLDivElement>) {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    dragRef.current = null;
  }

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="crop-editor-title" style={{
      position: 'fixed', inset: 0, zIndex: 30, display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 'var(--space-5)', background: 'rgba(19, 19, 19, .64)',
    }}>
      <div style={{
        width: 'min(100%, 620px)', maxHeight: 'calc(100vh - 40px)', overflowY: 'auto',
        background: 'var(--color-bg)', border: '2px solid var(--color-text)', borderRadius: 6,
        boxShadow: '0 24px 80px rgba(0,0,0,.3)', padding: 'var(--space-6)',
      }}>
        <div style={{ display: 'flex', alignItems: 'start', justifyContent: 'space-between', gap: 'var(--space-4)' }}>
          <div>
            <p style={{ ...STORE_LABEL_STYLE, margin: 0 }}>Chỉnh ảnh</p>
            <h2 id="crop-editor-title" style={{ margin: 'var(--space-1) 0 0', fontFamily: 'var(--font-heading)', fontSize: 22 }}>Căn ảnh trong khung</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Đóng chỉnh ảnh" style={{
            appearance: 'none', width: 36, height: 36, border: '2px solid var(--color-text)', background: 'var(--color-bg)',
            font: 'inherit', fontSize: 20, lineHeight: 1, cursor: 'pointer', borderRadius: 3,
          }}>×</button>
        </div>

        <div ref={viewportRef} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerEnd}
          onPointerCancel={onPointerEnd} onWheel={(event) => { event.preventDefault(); setZoom(zoom + (event.deltaY < 0 ? .1 : -.1)); }}
          style={{
            position: 'relative', width: '100%', maxHeight: '52vh', aspectRatio: `${slotAspectRatio}`,
            margin: 'var(--space-5) auto', overflow: 'hidden', background: 'var(--color-neutral-200)',
            border: '2px solid var(--color-text)', cursor: 'grab', touchAction: 'none', userSelect: 'none',
          }}>
          <SlotImage slot={slot} alt="Ảnh đang chỉnh" />
          <div aria-hidden="true" style={{ position: 'absolute', inset: 0, boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.8)', pointerEvents: 'none' }} />
        </div>

        <p style={{ margin: '0 0 var(--space-4)', fontSize: 12, color: 'var(--color-neutral-700)', textAlign: 'center' }}>
          Kéo ảnh để căn vị trí. Dùng thanh trượt hoặc cuộn chuột để phóng to, thu nhỏ.
        </p>

        <label style={{ display: 'grid', gridTemplateColumns: '36px 1fr 36px', alignItems: 'center', gap: 'var(--space-3)', fontSize: 13, fontWeight: 600 }}>
          <button type="button" onClick={() => setZoom(zoom - .1)} disabled={zoom <= 1} aria-label="Thu nhỏ ảnh" style={chipStyle(false, zoom <= 1)}>−</button>
          <input type="range" min="1" max="3" step="0.05" value={zoom} aria-label="Mức phóng ảnh"
            onChange={(event) => setZoom(Number(event.target.value))} style={{ width: '100%', accentColor: 'var(--color-accent)' }} />
          <button type="button" onClick={() => setZoom(zoom + .1)} disabled={zoom >= 3} aria-label="Phóng to ảnh" style={chipStyle(false, zoom >= 3)}>+</button>
        </label>
        <p style={{ margin: 'var(--space-2) 0 var(--space-5)', textAlign: 'center', fontSize: 12, color: 'var(--color-neutral-700)' }}>Phóng {Math.round(zoom * 100)}%</p>

        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
          <button type="button" className="btn btn-ghost" onClick={() => {
            if (!hasEditedRef.current) {
              onBeginEdit();
              hasEditedRef.current = true;
            }
            onChange({ zoom: 1, panX: 0, panY: 0 });
          }}>Đặt lại</button>
          <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
            <button type="button" className="btn btn-secondary" onClick={onReplace}>Thay ảnh</button>
            <button type="button" className="btn btn-primary" onClick={onClose}>Xong</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function CaptionEditor({ caption, onChange, onDelete, onClose }: {
  caption: DraftCaption;
  onChange: (updates: Partial<Omit<DraftCaption, 'id'>>) => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const textRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  useEffect(() => {
    textRef.current?.focus();
    if (textRef.current && !caption.text) textRef.current.select();
  }, []);

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="caption-editor-title" style={{
      position: 'fixed', inset: 0, zIndex: 30, display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 'var(--space-5)', background: 'rgba(19, 19, 19, .64)',
    }} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{
        width: 'min(100%, 480px)', maxHeight: 'calc(100vh - 40px)', overflowY: 'auto',
        background: 'var(--color-bg)', border: '2px solid var(--color-text)', borderRadius: 6,
        boxShadow: '0 24px 80px rgba(0,0,0,.3)', padding: 'var(--space-6)',
        display: 'flex', flexDirection: 'column', gap: 'var(--space-5)',
      }}>
        <div style={{ display: 'flex', alignItems: 'start', justifyContent: 'space-between', gap: 'var(--space-4)' }}>
          <div>
            <p style={{ ...STORE_LABEL_STYLE, margin: 0 }}>Caption</p>
            <h2 id="caption-editor-title" style={{ margin: 'var(--space-1) 0 0', fontFamily: 'var(--font-heading)', fontSize: 22 }}>Thêm chữ trên spread</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Đóng" style={{
            appearance: 'none', width: 36, height: 36, border: '2px solid var(--color-text)', background: 'var(--color-bg)',
            font: 'inherit', fontSize: 20, lineHeight: 1, cursor: 'pointer', borderRadius: 3,
          }}>×</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          <span style={STORE_LABEL_STYLE}>Nội dung</span>
          <textarea ref={textRef} rows={3} value={caption.text} placeholder="Nhập tên, ngày, lời nhắn…"
            onChange={(e) => onChange({ text: e.target.value })}
            style={{
              width: '100%', padding: 'var(--space-3)', font: 'inherit', fontSize: 15, lineHeight: 1.5,
              border: '2px solid var(--color-text)', borderRadius: 3, resize: 'vertical',
              background: 'var(--color-bg)', color: 'var(--color-text)',
            }} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          <span style={STORE_LABEL_STYLE}>Phông chữ</span>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {CAPTION_FONTS.map((f) => (
              <button key={f.value} type="button" onClick={() => onChange({ fontFamily: f.value })}
                style={{
                  ...chipStyle(caption.fontFamily === f.value),
                  fontFamily: `"${f.value}", ${f.fallback}`, fontSize: 13, minWidth: 0, padding: '5px 10px',
                }}>{f.label}</button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          <span style={STORE_LABEL_STYLE}>Cỡ chữ</span>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {CAPTION_SIZES.map((s) => (
              <button key={s.value} type="button" onClick={() => onChange({ fontSize: s.value })}
                style={chipStyle(caption.fontSize === s.value)}>{s.label}</button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          <span style={STORE_LABEL_STYLE}>Màu chữ</span>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {CAPTION_COLORS.map((c) => (
              <button key={c} type="button" onClick={() => onChange({ color: c })} title={c}
                style={{
                  appearance: 'none', width: 32, height: 32, borderRadius: '50%', cursor: 'pointer', padding: 0,
                  background: c, border: caption.color === c ? '3px solid var(--color-accent)' : '2px solid var(--color-neutral-300)',
                  boxShadow: c === '#ffffff' ? 'inset 0 0 0 1px var(--color-neutral-300)' : 'none',
                }} />
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 'var(--space-4)', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            <span style={STORE_LABEL_STYLE}>Căn chữ</span>
            <div style={{ display: 'flex', gap: 6 }}>
              {(['left', 'center', 'right'] as const).map((a) => (
                <button key={a} type="button" onClick={() => onChange({ align: a })}
                  style={chipStyle(caption.align === a)}>
                  {a === 'left' ? '◧' : a === 'center' ? '◫' : '◨'}
                </button>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            <span style={STORE_LABEL_STYLE}>Đậm</span>
            <button type="button" onClick={() => onChange({ bold: !caption.bold })}
              style={chipStyle(caption.bold)}>
              <strong>B</strong>
            </button>
          </div>
        </div>

        <div style={{
          padding: 'var(--space-4)', background: 'var(--color-neutral-100)', borderRadius: 4,
          textAlign: caption.align, fontSize: clamp(caption.fontSize * 4, 12, 36),
          fontWeight: caption.bold ? 700 : 400, color: caption.color, lineHeight: 1.3,
          fontFamily: `"${caption.fontFamily}", ${CAPTION_FONTS.find((f) => f.value === caption.fontFamily)?.fallback ?? 'sans-serif'}`,
          minHeight: 48, display: 'flex', alignItems: caption.align === 'center' ? 'center' : 'flex-start',
          justifyContent: caption.align === 'right' ? 'flex-end' : caption.align === 'center' ? 'center' : 'flex-start',
          textShadow: caption.color === '#ffffff' ? '0 1px 3px rgba(0,0,0,.5)' : 'none',
          whiteSpace: 'pre-wrap', wordBreak: 'break-word',
        }}>
          {caption.text || <span style={{ opacity: 0.4, fontStyle: 'italic' }}>Xem trước...</span>}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
          <button type="button" className="btn btn-ghost" onClick={onDelete}
            style={{ color: 'var(--color-accent-700)' }}>Xoá caption</button>
          <button type="button" className="btn btn-primary" onClick={onClose}>Xong</button>
        </div>
      </div>
    </div>
  );
}

function LayoutThumb({ layout, active, onClick }: { layout: SpreadLayout; active: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} title={layout.name} data-pb-layout-thumb="" style={{
      appearance: 'none', position: 'relative', width: 72, aspectRatio: '2 / 1.4', cursor: 'pointer',
      border: `2px solid ${active ? 'var(--color-accent)' : 'var(--color-neutral-300)'}`,
      background: active ? 'var(--color-accent-100, rgba(180,60,60,.08))' : 'var(--color-neutral-100)',
      borderRadius: 4, padding: 0, overflow: 'hidden', transition: 'border-color .15s',
    }}>
      {layout.slots.map((slot, i) => (
        <div key={i} style={{
          position: 'absolute', left: `${slot.x * 100}%`, top: `${slot.y * 100}%`,
          width: `${slot.w * 100}%`, height: `${slot.h * 100}%`,
          background: active ? 'var(--color-accent)' : 'var(--color-neutral-400)',
          borderRadius: 1, opacity: 0.6,
        }} />
      ))}
      {layout.slots.length === 0 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%',
          fontSize: 8, color: 'var(--color-neutral-500)' }}>—</div>
      )}
    </button>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   Step 3 — Xem lại
   ═══════════════════════════════════════════════════════════════════════════ */

function StepReview({ spreads, price, qty, finish, size, selected, added, busy, cartError, slug, templateId, onEdit, onBack, onAddToCart }: {
  spreads: DraftSpread[]; price: number; qty: number; finish: string;
  size: PhotobookSize | null; selected: { pageCount: number; price: number } | null;
  added: boolean; busy: boolean; cartError: string | null; slug: string; templateId: string;
  onEdit: (idx: number) => void; onBack: () => void; onAddToCart: () => void;
}) {
  const [viewMode, setViewMode] = useState<'grid' | 'book'>('grid');
  const [sharing, setSharing] = useState(false);
  const [shareLink, setShareLink] = useState<string | null>(null);
  const [shareError, setShareError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [shareProgress, setShareProgress] = useState<{ completed: number; total: number } | null>(null);

  const shareableImages = useMemo(() => {
    const images = new Map<string, File>();
    for (const spread of spreads) {
      for (const slot of spread.slots) {
        if (slot.imageId && slot.file && !images.has(slot.imageId)) images.set(slot.imageId, slot.file);
      }
    }
    return images;
  }, [spreads]);

  const handleShare = useCallback(async () => {
    if (!shareableImages.size) return;
    setSharing(true);
    setShareError(null);
    setShareLink(null);
    setShareProgress({ completed: 0, total: shareableImages.size });
    try {
      const storedSpreads = spreads.map((s) => ({
        position: s.position, layoutCode: s.layoutCode, backgroundColor: s.backgroundColor,
        slots: s.slots.map((sl) => ({ imageId: sl.imageId, zoom: sl.zoom, panX: sl.panX, panY: sl.panY })),
        captions: s.captions.map((c) => ({ id: c.id, text: c.text, x: c.x, y: c.y, fontSize: c.fontSize, color: c.color, bold: c.bold, align: c.align, fontFamily: c.fontFamily })),
      }));

      const metadata = {
        productSlug: slug,
        sizeLabel: size?.name ?? null,
        pageCount: selected ? String(selected.pageCount) : null,
        finish,
        templateId,
        spreads: storedSpreads,
      };

      const formData = new FormData();
      formData.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }), 'metadata.json');
      let completed = 0;
      for (const [imageId, file] of shareableImages) {
        const { file: previewImage } = await compressSharePreviewImage(file);
        if (previewImage.size > 10 * 1024 * 1024) {
          throw new Error('Một ảnh quá lớn để tạo preview');
        }
        formData.append('images', previewImage, imageId);
        completed++;
        setShareProgress({ completed, total: shareableImages.size });
      }

      const preview = await apiRequest<{ token: string }>('/photobook-share-previews', { method: 'POST', body: formData });
      const token = preview.token;
      if (!token) throw new Error('No token returned');

      const link = `${window.location.origin}/xem-truoc/${token}`;
      setShareLink(link);
    } catch (error) {
      setShareError(error instanceof ApiRequestError && error.status === 401
        ? 'Vui lòng đăng nhập để tạo link chia sẻ. Người nhận link vẫn xem được mà không cần đăng nhập.'
        : 'Không thể tạo link chia sẻ. Vui lòng thử lại.');
    } finally {
      setSharing(false);
      setShareProgress(null);
    }
  }, [spreads, slug, size, selected, finish, templateId, shareableImages]);

  const handleCopy = useCallback(() => {
    if (!shareLink) return;
    if (!navigator.clipboard) {
      setShareError('Trình duyệt không hỗ trợ sao chép tự động. Bạn có thể chọn và sao chép link bên trên.');
      return;
    }
    navigator.clipboard.writeText(shareLink)
      .then(() => {
        setCopied(true);
        window.setTimeout(() => setCopied(false), 2000);
      })
      .catch(() => setShareError('Không thể sao chép tự động. Bạn có thể chọn và sao chép link bên trên.'));
  }, [shareLink]);

  return (
    <div data-pb-review="" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)', padding: 'var(--space-8)', maxWidth: 1000, margin: '0 auto' }}>
      <div style={{ textAlign: 'center' }}>
        <h2 style={{ margin: 0, fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: 24, letterSpacing: '-.02em' }}>Xem lại photobook</h2>
        {size && selected && (
          <p style={{ margin: 'var(--space-2) 0 0', fontSize: 13, color: 'var(--color-neutral-700)' }}>
            {size.name} · {selected.pageCount} trang · {finish} · {spreads.length} spread
          </p>
        )}
      </div>

      {/* View mode toggle */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 6 }}>
        <button type="button" onClick={() => setViewMode('grid')} style={chipStyle(viewMode === 'grid')}>Lưới</button>
        <button type="button" onClick={() => setViewMode('book')} style={chipStyle(viewMode === 'book')}>Demo trên sách</button>
      </div>

      {viewMode === 'grid' ? (
        <ReviewGrid spreads={spreads} onEdit={onEdit} />
      ) : (
        <BookDemo spreads={spreads} onEdit={onEdit} />
      )}

      {/* Share section */}
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-3)',
        padding: 'var(--space-5)', background: 'var(--color-neutral-100)', borderRadius: 6,
      }}>
        <p style={{ margin: 0, fontSize: 13, color: 'var(--color-neutral-700)', textAlign: 'center' }}>
          Gửi link cho gia đình, bạn bè xem trước khi đặt in
        </p>
        {!shareLink ? (
          <>
            <button type="button" className="btn btn-secondary" disabled={sharing || !shareableImages.size} onClick={handleShare} style={{ gap: 6 }}>
              {sharing
                ? shareProgress && shareProgress.completed < shareProgress.total
                  ? `Đang chuẩn bị ảnh ${shareProgress.completed}/${shareProgress.total}…`
                  : 'Đang tải preview…'
                : 'Tạo link chia sẻ'}
            </button>
            {!shareableImages.size && <p style={{ margin: 0, fontSize: 12, color: 'var(--color-neutral-600)' }}>Thêm ít nhất một ảnh trước khi tạo link.</p>}
            {shareError && <p role="status" style={{ margin: 0, fontSize: 12, color: 'var(--color-accent-700)' }}>{shareError}</p>}
          </>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-3)', width: '100%', maxWidth: 480 }}>
            <div style={{
              display: 'flex', width: '100%', border: '2px solid var(--color-text)', borderRadius: 4, overflow: 'hidden',
            }}>
              <input type="text" readOnly value={shareLink} style={{
                flex: 1, border: 0, padding: '8px 12px', font: 'inherit', fontSize: 13,
                background: 'var(--color-bg)', color: 'var(--color-text)', outline: 'none', minWidth: 0,
              }} onClick={(e) => (e.target as HTMLInputElement).select()} />
              <button type="button" onClick={handleCopy} style={{
                appearance: 'none', border: 0, borderLeft: '2px solid var(--color-text)',
                padding: '8px 16px', font: 'inherit', fontSize: 12, fontWeight: 600,
                background: copied ? 'var(--color-text)' : 'var(--color-bg)',
                color: copied ? 'var(--color-bg)' : 'var(--color-text)',
                cursor: 'pointer', whiteSpace: 'nowrap', transition: 'background .15s, color .15s',
              }}>
                {copied ? 'Đã sao chép' : 'Sao chép'}
              </button>
            </div>
            <p style={{ margin: 0, fontSize: 11, color: 'var(--color-neutral-500)' }}>
              Link hết hạn sau 30 ngày. Không cần đăng nhập để xem.
            </p>
          </div>
        )}
      </div>

      {/* Summary + CTA */}
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-4)',
        padding: 'var(--space-6)', borderTop: '2px solid var(--color-text)',
      }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--space-3)' }}>
          <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: 28 }}>{formatPrice(price * qty)}</span>
          {qty > 1 && <span style={{ fontSize: 12, color: 'var(--color-neutral-700)' }}>({qty} cuốn × {formatPrice(price)})</span>}
        </div>

        <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap', justifyContent: 'center' }}>
          <button type="button" className="btn btn-secondary" onClick={onBack}>← Sửa spread</button>
          <button type="button" className="btn btn-primary" disabled={busy} onClick={onAddToCart} style={{ minWidth: 200 }}>
            {added ? 'Đã thêm vào giỏ ✓' : busy ? 'Đang thêm…' : 'Thêm vào giỏ'}
          </button>
        </div>
        {cartError && <p role="status" style={{ margin: 0, fontSize: 12, color: 'var(--color-accent-700)' }}>{cartError}</p>}
        <p style={{ margin: 0, fontSize: 12, color: 'var(--color-neutral-700)', textAlign: 'center', maxWidth: '50ch' }}>
          Sau khi đặt đơn, bạn gửi ảnh gốc lên để xưởng dàn layout chính thức. Bố cục ở đây là bản xem trước.
        </p>
      </div>
    </div>
  );
}

function ReviewGrid({ spreads, onEdit }: { spreads: DraftSpread[]; onEdit: (idx: number) => void }) {
  return (
    <div data-pb-review-grid="" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 'var(--space-4)' }}>
      {spreads.map((spread, idx) => {
        const layout = layoutByCode(spread.layoutCode);
        return (
          <button key={idx} type="button" onClick={() => onEdit(idx)} style={{
            appearance: 'none', display: 'flex', flexDirection: 'column', gap: 4,
            border: '2px solid var(--color-neutral-300)', borderRadius: 4,
            background: 'var(--color-bg)', cursor: 'pointer', padding: 6, textAlign: 'left',
            transition: 'border-color .15s',
          }}>
            <SpreadMini spread={spread} layout={layout} />
            <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--color-neutral-700)' }}>
              {idx + 1}. {layout.name}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function SpreadMini({ spread, layout }: { spread: DraftSpread; layout: SpreadLayout }) {
  return (
    <div style={{
      position: 'relative', width: '100%', aspectRatio: '2 / 1.4',
      background: spread.backgroundColor || 'var(--color-neutral-100)', borderRadius: 2, overflow: 'hidden',
      containerType: 'inline-size',
    }}>
      <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: 1, background: 'var(--color-neutral-200)' }} />
      {layout.slots.map((slot, i) => {
        const data = spread.slots[i];
        return (
          <div key={i} style={{
            position: 'absolute', left: `${slot.x * 100}%`, top: `${slot.y * 100}%`,
            width: `${slot.w * 100}%`, height: `${slot.h * 100}%`,
            background: data?.preview ? 'transparent' : 'var(--color-neutral-200)',
            borderRadius: slot.bleed ? 0 : 2, overflow: 'hidden',
            border: '1px solid var(--color-neutral-300)',
          }}>
            {data?.preview && (
              <SlotImage slot={data} alt="" />
            )}
          </div>
        );
      })}
      {spread.captions.map((caption) => (
        <div key={caption.id} style={{
          position: 'absolute', left: `${caption.x * 100}%`, top: `${caption.y * 100}%`,
          transform: 'translate(-50%, -50%)', zIndex: 5, maxWidth: '60%',
          padding: '1px 3px', fontSize: `${caption.fontSize}cqw`,
          fontWeight: caption.bold ? 700 : 400, color: caption.color,
          fontFamily: `"${caption.fontFamily}", ${CAPTION_FONTS.find((f) => f.value === caption.fontFamily)?.fallback ?? 'sans-serif'}`,
          textAlign: caption.align, lineHeight: 1.3, whiteSpace: 'pre-wrap',
          pointerEvents: 'none', overflow: 'hidden',
        }}>
          {caption.text}
        </div>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   Book Demo — 3D page-flip preview
   ═══════════════════════════════════════════════════════════════════════════ */

function BookDemo({ spreads, onEdit }: { spreads: DraftSpread[]; onEdit: (idx: number) => void }) {
  const [page, setPage] = useState(-1);
  const [flipping, setFlipping] = useState(false);
  const [autoPlay, setAutoPlay] = useState(false);
  const timerRef = useRef<number>(0);
  const total = spreads.length;

  const goNext = useCallback(() => {
    if (flipping || page >= total) return;
    setFlipping(true);
    setPage((p) => p + 1);
    window.setTimeout(() => setFlipping(false), 700);
  }, [flipping, page, total]);

  const goPrev = useCallback(() => {
    if (flipping || page < 0) return;
    setFlipping(true);
    setPage((p) => p - 1);
    window.setTimeout(() => setFlipping(false), 700);
  }, [flipping, page]);

  useEffect(() => {
    if (!autoPlay) { window.clearInterval(timerRef.current); return; }
    timerRef.current = window.setInterval(() => {
      setPage((p) => {
        if (p >= total) { setAutoPlay(false); return p; }
        setFlipping(true);
        window.setTimeout(() => setFlipping(false), 700);
        return p + 1;
      });
    }, 2200);
    return () => window.clearInterval(timerRef.current);
  }, [autoPlay, total]);

  const isCover = page < 0;
  const isBack = page >= total;
  const visibleIdx = Math.max(0, Math.min(page, total - 1));
  const nextIdx = Math.min(page + 1, total - 1);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-6)' }}>
      {/* Book scene */}
      <div data-pb-book-scene="" style={{ perspective: 1800, width: '100%', maxWidth: 640, margin: '0 auto' }}>
        <div style={{
          position: 'relative', width: '100%', aspectRatio: '1.05 / 0.7',
          transformStyle: 'preserve-3d',
        }}>
          {/* Book shadow */}
          <div style={{
            position: 'absolute', bottom: -8, left: '8%', right: '8%', height: 16,
            background: 'radial-gradient(ellipse at center, rgba(0,0,0,.18) 0%, transparent 70%)',
            borderRadius: '50%', filter: 'blur(4px)',
          }} />

          {/* Back cover */}
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(135deg, var(--color-neutral-300) 0%, var(--color-neutral-200) 100%)',
            borderRadius: '2px 6px 6px 2px', border: '1px solid var(--color-neutral-300)',
          }} />

          {/* Static underneath page (next spread or back cover) */}
          <div style={{
            position: 'absolute', inset: 0, borderRadius: '2px 6px 6px 2px', overflow: 'hidden',
            background: isBack ? 'linear-gradient(135deg, var(--color-neutral-300) 0%, var(--color-neutral-200) 100%)' : '#fff',
          }}>
            {!isBack && page + 1 < total && (
              <SpreadPage spread={spreads[nextIdx]} />
            )}
            {isBack && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%',
                fontSize: 13, color: 'var(--color-neutral-500)', fontStyle: 'italic' }}>
                Bìa sau
              </div>
            )}
          </div>

          {/* Flipping page */}
          <div style={{
            position: 'absolute', inset: 0,
            transformOrigin: 'left center',
            transform: page >= 0 && !isCover
              ? `rotateY(${flipping && page === visibleIdx ? '-160deg' : page > visibleIdx ? '-180deg' : '0deg'})`
              : 'rotateY(0deg)',
            transition: flipping ? 'transform .65s cubic-bezier(.645,.045,.355,1)' : 'none',
            backfaceVisibility: 'hidden',
            borderRadius: '2px 6px 6px 2px', overflow: 'hidden',
            background: '#fff', zIndex: 2,
            boxShadow: flipping ? '4px 0 12px rgba(0,0,0,.12)' : '2px 0 6px rgba(0,0,0,.06)',
          }}>
            {isCover ? (
              <div style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                height: '100%', gap: 'var(--space-4)',
                background: 'linear-gradient(145deg, var(--color-text) 0%, #3d3835 100%)',
                color: 'var(--color-bg)', borderRadius: '2px 6px 6px 2px',
              }}>
                <span style={{ fontSize: 10, letterSpacing: '.3em', textTransform: 'uppercase', opacity: 0.6 }}>Preview</span>
                <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: 22, letterSpacing: '-.02em' }}>Photobook</span>
                <span style={{ fontSize: 11, opacity: 0.5 }}>{total} spread</span>
              </div>
            ) : (
              <SpreadPage spread={spreads[visibleIdx]} />
            )}
          </div>

          {/* Spine */}
          <div style={{
            position: 'absolute', left: 0, top: 0, bottom: 0, width: 10,
            background: 'linear-gradient(90deg, var(--color-neutral-400) 0%, var(--color-neutral-300) 40%, var(--color-neutral-400) 100%)',
            borderRadius: '2px 0 0 2px', zIndex: 3,
          }} />
        </div>
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
        <button type="button" className="btn btn-ghost" disabled={page < 0 || flipping} onClick={goPrev}>
          ← Trước
        </button>

        <button type="button" onClick={() => setAutoPlay(!autoPlay)} style={{
          ...chipStyle(autoPlay), minWidth: 100,
        }}>
          {autoPlay ? 'Dừng' : 'Tự lật'}
        </button>

        <button type="button" className="btn btn-ghost" disabled={page >= total || flipping} onClick={goNext}>
          Sau →
        </button>
      </div>

      <p style={{ margin: 0, fontSize: 12, color: 'var(--color-neutral-700)', textAlign: 'center' }}>
        {isCover ? 'Bìa trước' : isBack ? 'Bìa sau' : `Spread ${page + 1} / ${total}`}
        {!isCover && !isBack && (
          <> · <button type="button" onClick={() => onEdit(page)} style={{
            appearance: 'none', border: 0, background: 'transparent', font: 'inherit',
            color: 'var(--color-accent-700)', cursor: 'pointer', textDecoration: 'underline', padding: 0,
          }}>Sửa spread này</button></>
        )}
      </p>
    </div>
  );
}

function SpreadPage({ spread }: { spread: DraftSpread }) {
  const layout = layoutByCode(spread.layoutCode);
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', background: spread.backgroundColor || '#fff', containerType: 'inline-size' }}>
      <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: 1, background: 'var(--color-neutral-200)' }} />
      {layout.slots.map((slot, i) => {
        const data = spread.slots[i];
        return (
          <div key={i} style={{
            position: 'absolute', left: `${slot.x * 100}%`, top: `${slot.y * 100}%`,
            width: `${slot.w * 100}%`, height: `${slot.h * 100}%`,
            background: data?.preview ? 'transparent' : 'var(--color-neutral-100)',
            borderRadius: slot.bleed ? 0 : 2, overflow: 'hidden',
            border: `1px solid ${data?.preview ? 'transparent' : 'var(--color-neutral-200)'}`,
          }}>
            {data?.preview ? (
              <SlotImage slot={data} alt="" />
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%',
                fontSize: 18, color: 'var(--color-neutral-300)' }}>+</div>
            )}
          </div>
        );
      })}
      {spread.captions.map((caption) => (
        <div key={caption.id} style={{
          position: 'absolute', left: `${caption.x * 100}%`, top: `${caption.y * 100}%`,
          transform: 'translate(-50%, -50%)', zIndex: 5, maxWidth: '60%',
          padding: '2px 6px', fontSize: `${caption.fontSize}cqw`,
          fontWeight: caption.bold ? 700 : 400, color: caption.color,
          fontFamily: `"${caption.fontFamily}", ${CAPTION_FONTS.find((f) => f.value === caption.fontFamily)?.fallback ?? 'sans-serif'}`,
          textAlign: caption.align, lineHeight: 1.3, whiteSpace: 'pre-wrap',
          textShadow: caption.color === '#ffffff' ? '0 1px 3px rgba(0,0,0,.5)' : '0 1px 2px rgba(255,255,255,.3)',
          pointerEvents: 'none',
        }}>
          {caption.text}
        </div>
      ))}
      {layout.slots.length === 0 && !spread.captions.length && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%',
          fontSize: 12, color: 'var(--color-neutral-400)', fontStyle: 'italic' }}>
          Trang trang trí
        </div>
      )}
    </div>
  );
}
