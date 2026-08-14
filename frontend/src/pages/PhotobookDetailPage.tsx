import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { ApiRequestError, apiRequest } from '../api/http';
import {
  fetchPhotobookPricing,
  photoRangeFor,
  type PhotobookPricing,
  type PhotobookSize,
} from '../api/photobook';
import { fetchProductBySlug, formatPrice, formatSize, type Product, type ProductVariant } from '../api/storefront';
import { layoutByCode, SPREAD_LAYOUTS, type SpreadLayout } from '../data/spreadLayouts';
import { templateById, type PhotobookTemplate } from '../data/photobookTemplates';
import { usePhotobookTemplates } from '../hooks/usePhotobookTemplates';
import { compressPhotobookPhoto, compressSharePreviewImage } from '../data/imageCompression';
import { createPhotobookDesign } from '../api/photobookDesigns';
import {
  readPhotobookDraft,
  readPhotobookDraftImages,
  savePhotobookDraft,
  loadDraftFromServer,
  saveDraftToServer,
  type StoredPhotobookDraft,
} from '../data/photobookDraft';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../hooks/useCart';
import { absoluteSiteUrl, useDocumentMeta } from '../hooks/useDocumentMeta';
import { STORE_LABEL_STYLE, StoreNotice, StoreShell } from '../components/StoreShell';
import { Frame } from '../components/Frame';
import '../styles/ds.css';
import '../styles/public.css';
import { PhotobookDetailSkeleton } from './photobook/PhotobookDetailSkeleton';
import { PhotobookProgressBar } from './photobook/PhotobookProgressBar';
import { StepArrange } from './photobook/StepArrange';
import { StepReview } from './photobook/StepReview';
import { StepSpecs } from './photobook/StepSpecs';
import { AutoFillResult, CATALOG_HREF, DraftCaption, DraftSlot, DraftSpread, FINISHES, HISTORY_LIMIT, STEPS, SpreadHistory, clamp, cloneSpread, draftImages, emptyDraftSlot, hydrateDraftSpreads, makeSpreads, newCaption, newImageId, pickNewerDraft, slotCapacityOf, suggestPageCountForTemplate, variantSnapshot } from './photobook/draft';


export function PhotobookDetailPage() {
  const { slug = '' } = useParams();
  const { session } = useAuth();
  const sessionUserId = session?.userId ?? null;
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
  const templates = usePhotobookTemplates();

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
  const [serverDraftReady, setServerDraftReady] = useState(false);
  const [serverDraftReadOnly, setServerDraftReadOnly] = useState(false);
  const draftSaveVersionRef = useRef(0);
  const serverDraftUserRef = useRef<string | null>(null);
  const sessionRef = useRef(session);
  sessionRef.current = session;
  const draftSaveQueueRef = useRef<Promise<void>>(Promise.resolve());

  const [added, setAdded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [cartError, setCartError] = useState<string | null>(null);

  const hydrateFromDraft = useCallback(async (
    draft: StoredPhotobookDraft,
    fromServer: boolean,
    isCurrent: () => boolean,
  ) => {
    const images = await readPhotobookDraftImages(draft);
    if (!isCurrent()) return false;
    const hasUnavailableImages = draft.spreads.some((spread) =>
      spread.slots.some((slot) => slot.imageId !== null && !images.has(slot.imageId)),
    );
    const restored = hydrateDraftSpreads(draft, images, (url) => previewUrlsRef.current.add(url));
    spreadsRef.current = restored;
    setSpreads(restored);
    setSizeId(draft.sizeId);
    setPageIndex(Math.max(0, draft.pageIndex));
    setFinish(FINISHES.includes(draft.finish) ? draft.finish : FINISHES[0]);
    setQty(Math.max(1, draft.qty));
    setPhotoCount(draft.photoCount);
    setTemplateId(draft.templateId ?? 'free');
    setStepRaw(clamp(draft.step, 0, 2));
    setCurrentSpreadIdx(Math.max(0, draft.currentSpreadIdx));
    // This flag is intentionally sticky for the current page session. Layout
    // or template changes must not silently authorize overwriting image
    // metadata that only exists on another device.
    setServerDraftReadOnly(hasUnavailableImages);
    if (hasUnavailableImages) {
      setDraftNotice('\u0110\u00e3 kh\u00f4i ph\u1ee5c b\u1ed1 c\u1ee5c. \u1ea2nh g\u1ed1c n\u1eb1m tr\u00ean thi\u1ebft b\u1ecb kh\u00e1c n\u00ean kh\u00f4ng ghi \u0111\u00e8 b\u1ea3n nh\u00e1p \u0111\u1ed3ng b\u1ed9.');
    } else if (fromServer) {
      setDraftNotice(images.size
        ? 'Đã khôi phục bản nháp từ tài khoản và ảnh trên thiết bị này.'
        : 'Đã khôi phục bản nháp từ tài khoản. Hãy chọn lại ảnh.');
    } else {
      setDraftNotice(images.size ? 'Đã khôi phục bản nháp và ảnh trên thiết bị này.' : 'Đã khôi phục bố cục bản nháp. Hãy chọn lại ảnh bị thiếu.');
    }
    setDraftHydrated(true);
    return true;
  }, []);

  useEffect(() => {
    let alive = true;
    const savedDraft = readPhotobookDraft(slug);
    setProduct(null); setPricing(null); setLoadError(null);
    setDraftHydrated(false); setDraftNotice(null); setServerDraftReady(false); setServerDraftReadOnly(false);
    serverDraftUserRef.current = null;
    draftSaveVersionRef.current++;
    previewUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    previewUrlsRef.current.clear();
    spreadsRef.current = [];
    historyRef.current = {};
    setSizeId(null); setPageIndex(0); setFinish(FINISHES[0]); setQty(1); setPhotoCount(''); setTemplateId('free');
    setStepRaw(0); setCurrentSpreadIdx(0); setSpreads([]); setHistoryBySpread({});

    const initialUserId = sessionRef.current?.userId ?? null;
    if (initialUserId) serverDraftUserRef.current = initialUserId;

    void (async () => {
      try {
        const serverDraft = initialUserId ? await loadDraftFromServer(slug) : null;
        if (!alive) return;
        const winner = pickNewerDraft(savedDraft, serverDraft);
        if (winner) {
          await hydrateFromDraft(winner.draft, winner.source === 'server', () => alive);
        } else {
          setDraftHydrated(true);
        }
        if (alive && initialUserId) setServerDraftReady(true);
      } catch {
        if (!alive) return;
        if (savedDraft) {
          await hydrateFromDraft(savedDraft, false, () => alive);
        } else {
          setDraftHydrated(true);
        }
        if (alive && initialUserId) setServerDraftReady(true);
      }
    })();

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
  }, [slug, hydrateFromDraft]);

  useEffect(() => {
    const userId = session?.userId ?? null;
    if (!userId) {
      serverDraftUserRef.current = null;
      setServerDraftReady(false);
      return;
    }
    if (!draftHydrated || serverDraftUserRef.current === userId) return;

    let alive = true;
    setServerDraftReady(false);
    void (async () => {
      const serverDraft = await loadDraftFromServer(slug);
      if (!alive) return;
      const winner = pickNewerDraft(readPhotobookDraft(slug), serverDraft);
      if (winner?.source === 'server') {
        await hydrateFromDraft(winner.draft, true, () => alive);
      }
      if (!alive) return;
      serverDraftUserRef.current = userId;
      setServerDraftReady(true);
    })();
    return () => { alive = false; };
  }, [draftHydrated, hydrateFromDraft, session?.userId, slug]);

  const size: PhotobookSize | null = pricing?.sizes.find((s) => s.variantId === sizeId) ?? null;
  const pageOptions = size?.pageOptions ?? [];
  const selected = pageOptions[Math.min(pageIndex, Math.max(pageOptions.length - 1, 0))] ?? null;
  const price = selected?.price ?? 0;
  const photos = selected ? photoRangeFor(selected.pageCount) : null;
  const numSpreads = selected ? selected.pageCount / 2 : 0;

  const template = templateById(templates, templateId);
  // Số ô ảnh của đúng chủ đề đang chọn — thứ khách thật sự lấp đầy ở bước sau.
  const slotCapacity = selected ? slotCapacityOf(template, selected.pageCount) : null;

  const suggestion = useMemo(() => {
    const wanted = Number(photoCount);
    if (!Number.isFinite(wanted) || wanted <= 0 || !selected) return null;
    const suggested = suggestPageCountForTemplate(wanted, pageOptions, template);
    return suggested === null || suggested === selected.pageCount ? null : suggested;
  }, [photoCount, pageOptions, selected, template]);

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
          imageId: slot.imageId,
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
          const synced = sessionUserId && serverDraftReady && !serverDraftReadOnly
            ? await saveDraftToServer(draft)
            : false;
          if (version === draftSaveVersionRef.current) {
            setDraftNotice(!sessionUserId
              ? 'Bản nháp đã được lưu trên thiết bị này.'
              : serverDraftReadOnly
                ? '\u0110\u00e3 l\u01b0u b\u1ea3n nh\u00e1p tr\u00ean thi\u1ebft b\u1ecb n\u00e0y. \u1ea2nh g\u1ed1c n\u1eb1m tr\u00ean thi\u1ebft b\u1ecb kh\u00e1c n\u00ean kh\u00f4ng ghi \u0111\u00e8 b\u1ea3n nh\u00e1p \u0111\u1ed3ng b\u1ed9.'
              : synced
                ? 'Bản nháp đã được lưu và đồng bộ lên tài khoản.'
                : serverDraftReady
                  ? 'Bản nháp đã được lưu trên thiết bị này, nhưng chưa đồng bộ được lên tài khoản.'
                  : 'Bản nháp đã được lưu trên thiết bị này. Đang kiểm tra bản nháp trên tài khoản.');
          }
        })
        .catch(() => {
          if (version === draftSaveVersionRef.current) setDraftNotice('Không thể lưu bản nháp trên thiết bị này.');
        });
    }, 500);
    return () => window.clearTimeout(timer);
  }, [currentSpreadIdx, draftHydrated, finish, pageIndex, photoCount, qty, serverDraftReadOnly, serverDraftReady, sessionUserId, sizeId, slug, spreads, step, templateId]);

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
      // History follows the spread when it is reordered; its former ordinal must not overwrite the new one.
      next[spreadIdx] = { ...cloneSpread(snapshot), position: next[spreadIdx].position };
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

  const moveSpread = useCallback((fromIdx: number, toIdx: number) => {
    const current = spreadsRef.current;
    if (fromIdx === toIdx || fromIdx < 0 || toIdx < 0 || fromIdx >= current.length || toIdx >= current.length) return;

    // Keep the undo/redo stack attached to the spread, not its former array index.
    const priorIndexes = current.map((_, index) => index);
    const [movedIndex] = priorIndexes.splice(fromIdx, 1);
    priorIndexes.splice(toIdx, 0, movedIndex);
    const reordered = priorIndexes.map((oldIndex, index) => ({ ...current[oldIndex], position: index + 1 }));
    const reorderedHistory = priorIndexes.reduce<Record<number, SpreadHistory>>((result, oldIndex, index) => {
      const history = historyRef.current[oldIndex];
      if (history) result[index] = history;
      return result;
    }, {});

    spreadsRef.current = reordered;
    setSpreads(reordered);
    setHistory(reorderedHistory);
    setCurrentSpreadIdx((currentIdx) => priorIndexes.indexOf(currentIdx));
  }, [setHistory]);

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

  /**
   * Chốt bản thiết kế hiện tại (layout, ảnh, crop, caption, màu nền) lên server trước khi thêm
   * vào giỏ, để những gì khách sắp xếp không bị bỏ đi sau khi mua — xem PhotobookProjectServiceImpl.
   * Trả về null nếu khách chưa đặt ảnh nào (dùng luồng gửi ảnh thủ công sau khi mua thay thế).
   */
  async function saveDesign(): Promise<string | null> {
    if (!selected) return null;
    const images = new Map<string, File>();
    for (const spread of spreads) {
      for (const slot of spread.slots) {
        if (slot.imageId && slot.file && !images.has(slot.imageId)) images.set(slot.imageId, slot.file);
      }
    }
    if (!images.size) return null;

    const compressedImages = new Map<string, File>();
    for (const [imageId, file] of images) {
      const { file: compressed } = await compressPhotobookPhoto(file);
      compressedImages.set(imageId, compressed);
    }

    const metadata = {
      productSlug: slug,
      sizeLabel: size?.name ?? null,
      pageCount: selected.pageCount,
      finish,
      templateId,
      spreads: spreads.map((s) => ({
        position: s.position, layoutCode: s.layoutCode, backgroundColor: s.backgroundColor,
        slots: s.slots.map((sl) => ({ imageId: sl.imageId, zoom: sl.zoom, panX: sl.panX, panY: sl.panY })),
        captions: s.captions.map((c) => ({ id: c.id, text: c.text, x: c.x, y: c.y, fontSize: c.fontSize, color: c.color, bold: c.bold, align: c.align, fontFamily: c.fontFamily })),
      })),
    };
    const { id } = await createPhotobookDesign(metadata, compressedImages);
    return id;
  }

  async function addToCart() {
    if (!product || !size || !selected) return;
    setBusy(true); setCartError(null);
    try {
      const photobookDesignId = await saveDesign();
      await add({
        productId: product.id, productVariantId: size.variantId, productFrameOptionId: null,
        // saveDesign() trả null khi khách chưa tải ảnh nào lên: cuốn đi tiếp bằng luồng gửi ảnh
        // sau khi mua, và mã mẫu là thứ duy nhất còn giữ lựa chọn của khách tới lúc xưởng dựng.
        pageCount: selected.pageCount, photobookDesignId, photobookTemplateCode: templateId, quantity: qty,
        productName: product.name, productSlug: product.slug,
        selectedVariant: variantSnapshot(product, size, selected.price),
        basePrice: selected.price, selectedFrameOption: null, unitPrice: selected.price,
      });
      setAdded(true);
    } catch (e) {
      setCartError(e instanceof ApiRequestError && e.status === 401
        ? 'Vui lòng đăng nhập để lưu thiết kế trước khi thêm cuốn này vào giỏ.'
        : e instanceof ApiRequestError ? e.message : 'Không thêm được vào giỏ.');
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

      {step > 0 && spreads.length > 0 && <PhotobookProgressBar spreads={spreads} />}

      {/* Step content */}
      {step === 0 && (
        <StepSpecs
          product={product} pricing={pricing} size={size} sizeId={sizeId} setSizeId={setSizeId}
          pageIndex={pageIndex} setPageIndex={setPageIndex} pageOptions={pageOptions} selected={selected}
          finish={finish} setFinish={setFinish} qty={qty} setQty={setQty}
          price={price} photos={photos} slotCapacity={slotCapacity} photoCount={photoCount} setPhotoCount={setPhotoCount}
          suggestion={suggestion} templates={templates} templateId={templateId} setTemplateId={setTemplateId}
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
          onMoveSpread={moveSpread}
          draftNotice={draftNotice}
          onBack={() => setStep(0)} onNext={() => setStep(2)}
        />
      )}

      {step === 2 && (
        <StepReview
          spreads={spreads} price={price} qty={qty} finish={finish} size={size} selected={selected}
          pricing={pricing} pageOptions={pageOptions} pageIndex={pageIndex}
          added={added} busy={busy} cartError={cartError} slug={slug} templateId={templateId}
          onEdit={(idx) => { setCurrentSpreadIdx(idx); setStep(1); }}
          onMoveSpread={moveSpread}
          onBack={() => setStep(1)}
          onAddToCart={() => void addToCart()}
          onUpgradePages={(idx) => { setPageIndex(idx); }}
          onUpgradeSize={(id) => { setSizeId(id); setPageIndex(0); }}
        />
      )}
    </StoreShell>
  );
}
