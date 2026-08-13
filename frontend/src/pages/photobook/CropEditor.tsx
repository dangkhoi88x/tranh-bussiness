import { useEffect, useRef } from 'react';
import { STORE_LABEL_STYLE } from '../../components/StoreShell';
import { SlotImage } from './SlotImage';
import { DraftSlot, clamp } from './draft';
import { chipStyle } from './styles';

export function CropEditor({ slot, slotAspectRatio, onChange, onBeginEdit, onReplace, onClose }: {
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
