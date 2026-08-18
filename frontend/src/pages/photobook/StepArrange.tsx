import { useCallback, useEffect, useRef, useState } from 'react';
import { STORE_LABEL_STYLE } from '../../components/StoreShell';
import { SPREAD_LAYOUTS, layoutByCode, type SpreadLayout } from '../../data/spreadLayouts';
import { CaptionEditor } from './CaptionEditor';
import { CropEditor } from './CropEditor';
import { SlotImage } from './SlotImage';
import { SpreadOrderGrid } from './SpreadOrderGrid';
import { AutoFillResult, CAPTION_FONTS, DraftCaption, DraftSlot, DraftSpread, SpreadHistory, clamp } from './draft';

export function StepArrange({
  spreads,
  currentIdx,
  setCurrentIdx,
  onChangeLayout,
  onSetSlotFile,
  onSwapSlots,
  onSetSlotCrop,
  onAddCaption,
  onUpdateCaption,
  onRemoveCaption,
  history,
  onRemember,
  onUndo,
  onRedo,
  onAutoFillFiles,
  onMoveSpread,
  draftNotice,
  onBack,
  onNext,
}: {
  spreads: DraftSpread[];
  currentIdx: number;
  setCurrentIdx: (i: number) => void;
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
  onMoveSpread: (fromIdx: number, toIdx: number) => void;
  draftNotice: string | null;
  onBack: () => void;
  onNext: () => void;
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
  const captionDragRef = useRef<{
    id: string;
    startX: number;
    startY: number;
    origX: number;
    origY: number;
    moved: boolean;
  } | null>(null);
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
  const navigateSpread = useCallback(
    (nextIdx: number) => {
      if (nextIdx < 0 || nextIdx >= spreads.length || nextIdx === currentIdx) return;
      setCurrentIdx(nextIdx);
      const focusedSlot = focusedSlotRef.current;
      if (focusedSlot !== null) {
        window.requestAnimationFrame(() => slotRefs.current[focusedSlot]?.focus());
      }
    },
    [currentIdx, setCurrentIdx, spreads.length],
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((!event.ctrlKey && !event.metaKey) || event.altKey) return;
      const target = event.target;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement
      )
        return;
      const key = event.key.toLowerCase();
      if (key === 'z') {
        event.preventDefault();
        if (event.shiftKey) handleRedo();
        else handleUndo();
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
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement
      )
        return;
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
    setAutoFillMessage(
      remaining > 0
        ? `Đã tự điền ${placed} ảnh. Còn ${remaining} ảnh chưa đặt vì các slot hiện tại đã đầy.`
        : `Đã tự điền ${placed} ảnh theo thứ tự tên file.`,
    );
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
    <div
      ref={arrangeRef}
      data-pb-arrange=""
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-6)',
        padding: 'var(--space-8)',
        maxWidth: 900,
        margin: '0 auto',
      }}
    >
      <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileChange} />
      <input
        ref={folderInputRef}
        type="file"
        accept="image/*"
        multiple
        style={{ display: 'none' }}
        onChange={handleFolderChange}
      />

      {/* Spread navigation */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <button
          type="button"
          className="btn btn-ghost"
          disabled={currentIdx <= 0}
          onClick={() => navigateSpread(currentIdx - 1)}
        >
          ← Trước
        </button>
        <span style={{ fontSize: 14, fontWeight: 700, letterSpacing: '.06em' }}>
          Spread {currentIdx + 1} / {spreads.length}
        </span>
        <button
          type="button"
          className="btn btn-ghost"
          disabled={currentIdx >= spreads.length - 1}
          onClick={() => navigateSpread(currentIdx + 1)}
        >
          Sau →
        </button>
      </div>

      {spreads.length > 1 && (
        <SpreadOrderGrid
          spreads={spreads}
          activeIndex={currentIdx}
          onSelect={setCurrentIdx}
          onMove={onMoveSpread}
          compact
          ariaLabel="Sắp xếp thứ tự spread"
        />
      )}

      <div
        aria-label="Lịch sử chỉnh sửa"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 'var(--space-3)',
          flexWrap: 'wrap',
        }}
      >
        <button
          type="button"
          className="btn btn-ghost"
          disabled={!history?.past.length}
          onClick={handleUndo}
          title="Ctrl+Z"
        >
          ↶ Hoàn tác
        </button>
        <button
          type="button"
          className="btn btn-ghost"
          disabled={!history?.future.length}
          onClick={handleRedo}
          title="Ctrl+Shift+Z"
        >
          ↷ Làm lại
        </button>
        <span style={{ fontSize: 11, color: 'var(--color-neutral-600)' }}>Ctrl/Cmd + Z</span>
      </div>

      {draftNotice && (
        <p role="status" style={{ margin: 0, fontSize: 12, color: 'var(--color-neutral-700)', textAlign: 'center' }}>
          {draftNotice}
        </p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-2)' }}>
        <button type="button" className="btn btn-secondary" onClick={() => folderInputRef.current?.click()}>
          Tải thư mục ảnh & tự điền
        </button>
        <p style={{ margin: 0, fontSize: 12, color: 'var(--color-neutral-700)', textAlign: 'center' }}>
          Chỉ lấp các slot trống, theo thứ tự tên file; ảnh đã sắp xếp sẽ được giữ nguyên.
        </p>
        {autoFillMessage && (
          <p role="status" style={{ margin: 0, fontSize: 12, color: 'var(--color-accent-700)', textAlign: 'center' }}>
            {autoFillMessage}
          </p>
        )}
      </div>

      {/* Layout picker */}
      <div>
        <span style={{ ...STORE_LABEL_STYLE, marginBottom: 'var(--space-3)', display: 'block' }}>Chọn bố cục</span>
        <div data-pb-layout-picker="" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {SPREAD_LAYOUTS.map((l) => (
            <LayoutThumb
              key={l.code}
              layout={l}
              active={l.code === spread.layoutCode}
              onClick={() => {
                if (l.code === spread.layoutCode) return;
                rememberCurrent();
                onChangeLayout(currentIdx, l.code);
              }}
            />
          ))}
        </div>
      </div>

      {/* Spread widget */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          aspectRatio: '2 / 1.4',
          background: spread.backgroundColor || 'var(--color-neutral-100)',
          border: '2px solid var(--color-text)',
          borderRadius: 4,
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
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: 0,
            bottom: 0,
            width: 1,
            background: 'var(--color-neutral-300)',
            zIndex: 1,
          }}
        />
        {layout.slots.length === 0 && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              fontSize: 13,
              color: 'var(--color-neutral-500)',
              fontStyle: 'italic',
              letterSpacing: '.1em',
            }}
          >
            Trang trang trí — không có ô ảnh
          </div>
        )}
        {layout.slots.map((slot, i) => {
          const data = spread.slots[i];
          return (
            <button
              key={i}
              ref={(node) => {
                slotRefs.current[i] = node;
              }}
              type="button"
              onClick={() => handleSlotClick(i)}
              onFocus={() => {
                focusedSlotRef.current = i;
              }}
              onKeyDown={(event) => handleSlotKeyDown(event, i)}
              aria-label={
                data?.preview
                  ? `Ô ảnh ${i + 1}. Nhấn Enter để chỉnh khung ảnh.`
                  : `Ô ảnh ${i + 1}. Nhấn Enter để thêm ảnh.`
              }
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
              onDragEnd={() => {
                setDragFrom(null);
                setDragOver(null);
              }}
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
                e.dataTransfer.dropEffect = dragFrom !== null ? 'move' : 'copy';
                setDragOver(i);
              }}
              onDragLeave={() => setDragOver((value) => (value === i ? null : value))}
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
                position: 'absolute',
                left: `${slot.x * 100}%`,
                top: `${slot.y * 100}%`,
                width: `${slot.w * 100}%`,
                height: `${slot.h * 100}%`,
                border: data?.preview ? '2px solid var(--color-accent)' : '2px dashed var(--color-neutral-400)',
                background: data?.preview ? 'transparent' : 'var(--color-neutral-200)',
                cursor: 'pointer',
                padding: 0,
                overflow: 'hidden',
                borderRadius: slot.bleed ? 0 : 3,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'border-color .2s, opacity .2s',
                outline: dragOver === i ? '3px solid var(--color-accent)' : 'none',
                outlineOffset: -3,
                opacity: dragFrom === i ? 0.4 : 1,
              }}
            >
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
          <div
            key={caption.id}
            onPointerDown={(e) => {
              if (e.button !== 0) return;
              e.stopPropagation();
              e.currentTarget.setPointerCapture(e.pointerId);
              captionDragRef.current = {
                id: caption.id,
                startX: e.clientX,
                startY: e.clientY,
                origX: caption.x,
                origY: caption.y,
                moved: false,
              };
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
              if (drag.moved)
                onUpdateCaption(currentIdx, caption.id, {
                  x: clamp(drag.origX + dx, 0.02, 0.98),
                  y: clamp(drag.origY + dy, 0.02, 0.98),
                });
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
              position: 'absolute',
              left: `${caption.x * 100}%`,
              top: `${caption.y * 100}%`,
              transform: 'translate(-50%, -50%)',
              zIndex: 5,
              maxWidth: '60%',
              padding: '2px 6px',
              cursor: 'grab',
              touchAction: 'none',
              userSelect: 'none',
              fontSize: `${caption.fontSize}cqw`,
              fontWeight: caption.bold ? 700 : 400,
              fontFamily: `"${caption.fontFamily}", ${CAPTION_FONTS.find((f) => f.value === caption.fontFamily)?.fallback ?? 'sans-serif'}`,
              color: caption.color,
              textAlign: caption.align,
              lineHeight: 1.3,
              whiteSpace: 'pre-wrap',
              textShadow:
                caption.color === '#ffffff' || caption.color === '#FFFFFF'
                  ? '0 1px 3px rgba(0,0,0,.5)'
                  : '0 1px 2px rgba(255,255,255,.3)',
              border: '1px dashed transparent',
              borderRadius: 2,
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--color-accent)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLDivElement).style.borderColor = 'transparent';
            }}
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
          onDelete={() => {
            rememberCurrent();
            onRemoveCaption(currentIdx, editingCaptionId);
            setEditingCaptionId(null);
          }}
          onClose={() => setEditingCaptionId(null)}
        />
      )}

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 'var(--space-3)',
          flexWrap: 'wrap',
        }}
      >
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => {
            rememberCurrent();
            const id = onAddCaption(currentIdx);
            setEditingCaptionId(id);
          }}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
        >
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
        <button type="button" className="btn btn-secondary" onClick={onBack}>
          ← Quay lại
        </button>
        <button type="button" className="btn btn-primary" onClick={onNext}>
          Xem lại cuốn sách →
        </button>
      </div>
    </div>
  );
}

export function LayoutThumb({
  layout,
  active,
  onClick,
}: {
  layout: SpreadLayout;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={layout.name}
      data-pb-layout-thumb=""
      style={{
        appearance: 'none',
        position: 'relative',
        width: 72,
        aspectRatio: '2 / 1.4',
        cursor: 'pointer',
        border: `2px solid ${active ? 'var(--color-accent)' : 'var(--color-neutral-300)'}`,
        background: active ? 'var(--color-accent-100, rgba(180,60,60,.08))' : 'var(--color-neutral-100)',
        borderRadius: 4,
        padding: 0,
        overflow: 'hidden',
        transition: 'border-color .15s',
      }}
    >
      {layout.slots.map((slot, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: `${slot.x * 100}%`,
            top: `${slot.y * 100}%`,
            width: `${slot.w * 100}%`,
            height: `${slot.h * 100}%`,
            background: active ? 'var(--color-accent)' : 'var(--color-neutral-400)',
            borderRadius: 1,
            opacity: 0.6,
          }}
        />
      ))}
      {layout.slots.length === 0 && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            fontSize: 8,
            color: 'var(--color-neutral-500)',
          }}
        >
          —
        </div>
      )}
    </button>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   Upsell suggestions
   ═══════════════════════════════════════════════════════════════════════════ */
