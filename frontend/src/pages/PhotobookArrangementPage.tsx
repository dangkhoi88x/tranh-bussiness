import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { ApiRequestError } from '../api/http';
import {
  assignSlotPhoto,
  changeSpreadLayout,
  fetchPhotobookArrangement,
  type PhotobookArrangement,
  type PhotobookArrangementSlot,
  type PhotobookArrangementSpread,
  type PhotobookLayoutOption,
} from '../api/photobookProjects';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../hooks/useCart';
import { useDocumentMeta } from '../hooks/useDocumentMeta';
import { STORE_LABEL_STYLE, StoreNotice, StoreShell } from '../components/StoreShell';
import { cropStyle, focalToPan } from '../data/spreadRendering';
import '../styles/ds.css';
import '../styles/public.css';

/** Caption đè lên spread — chỉ khác rỗng khi cuốn được hydrate từ một bản thiết kế đã chốt. */
type SpreadCaption = { id?: string; text: string; x: number; y: number; fontSize: number; color: string; bold: boolean; align: 'left' | 'center' | 'right'; fontFamily: string };

const CAPTION_FONTS: Record<string, string> = {
  'Archivo': 'sans-serif', 'Playfair Display': 'serif', 'Lora': 'serif',
  'Cormorant Garamond': 'serif', 'Spectral': 'serif', 'Montserrat': 'sans-serif',
  'Quicksand': 'sans-serif', 'Dancing Script': 'cursive', 'Great Vibes': 'cursive', 'Pacifico': 'cursive',
};

function parseCaptions(captionsJson: string): SpreadCaption[] {
  try {
    const parsed = JSON.parse(captionsJson) as unknown;
    return Array.isArray(parsed) ? parsed as SpreadCaption[] : [];
  } catch {
    return [];
  }
}

/**
 * Storyboard — bản nháp sắp xếp ảnh vào từng spread cho xưởng hoàn thiện.
 *
 * Tương tác kiểu "nhấc lên — đặt xuống", không kéo thả pixel: bấm một ảnh (trong khay hoặc
 * đang nằm trong ô khác) để "cầm" nó lên, rồi bấm vào ô muốn đặt. Nếu ô đó đã có ảnh, backend
 * tự hoán vị hai ảnh cho nhau. Cách này chạy tốt trên di động, nơi kéo-thả pixel rất khó dùng.
 */

function findPhotoUrl(arrangement: PhotobookArrangement, photoId: string): string | null {
  const fromTray = arrangement.unplacedPhotos.find((p) => p.id === photoId);
  if (fromTray) return fromTray.url;
  for (const spread of arrangement.spreads) {
    const slot = spread.slots.find((s) => s.photoId === photoId);
    if (slot?.photoUrl) return slot.photoUrl;
  }
  return null;
}

export function PhotobookArrangementPage() {
  const { projectId = '' } = useParams();
  const location = useLocation();
  const { session, isLoading: authLoading } = useAuth();
  const { count: cartCount } = useCart();

  const [arrangement, setArrangement] = useState<PhotobookArrangement | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [activeSpreadId, setActiveSpreadId] = useState<string | null>(null);
  const [selectedPhotoId, setSelectedPhotoId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!session) { setLoading(false); return; }
    setLoading(true);
    setLoadError(null);
    try {
      const found = await fetchPhotobookArrangement(projectId);
      setArrangement(found);
      setActiveSpreadId((current) => current ?? found.spreads[0]?.id ?? null);
    } catch (cause) {
      setLoadError(cause instanceof Error ? cause.message : 'Không mở được bản sắp xếp này.');
    } finally {
      setLoading(false);
    }
  }, [projectId, session?.userId]);

  useEffect(() => { void load(); }, [load]);

  useDocumentMeta({
    title: 'Sắp xếp photobook | Bubble Memories',
    description: 'Sắp ảnh vào từng trang của cuốn photobook — bản nháp để xưởng hoàn thiện.',
    canonicalUrl: `${window.location.origin}/photobook-cua-toi/${projectId}/sap-xep`,
    robots: 'noindex, nofollow',
  });

  const activeSpread = arrangement?.spreads.find((s) => s.id === activeSpreadId) ?? null;
  const activeLayout = arrangement?.layouts.find((l) => l.code === activeSpread?.layoutCode) ?? null;
  const selectedPhotoUrl = useMemo(
    () => (arrangement && selectedPhotoId ? findPhotoUrl(arrangement, selectedPhotoId) : null),
    [arrangement, selectedPhotoId],
  );

  async function assign(slotId: string, photoId: string | null) {
    setBusy(true);
    setError(null);
    try {
      setArrangement(await assignSlotPhoto(projectId, slotId, photoId));
    } catch (cause) {
      setError(cause instanceof ApiRequestError ? cause.message : 'Không cập nhật được ô ảnh.');
    } finally {
      setBusy(false);
    }
  }

  async function changeLayout(spreadId: string, layoutCode: string) {
    setBusy(true);
    setError(null);
    try {
      setArrangement(await changeSpreadLayout(projectId, spreadId, layoutCode));
    } catch (cause) {
      setError(cause instanceof ApiRequestError ? cause.message : 'Không đổi được bố cục.');
    } finally {
      setBusy(false);
    }
  }

  function handleTrayTap(photoId: string) {
    if (!arrangement?.editable) return;
    setSelectedPhotoId((current) => (current === photoId ? null : photoId));
  }

  function handleSlotTap(slot: PhotobookArrangementSlot) {
    if (!arrangement?.editable || busy) return;
    if (selectedPhotoId) {
      // Bấm lại đúng ảnh đang cầm (ô đang chứa chính ảnh đó) → huỷ chọn thay vì gán vào chính nó.
      if (selectedPhotoId === slot.photoId) { setSelectedPhotoId(null); return; }
      void assign(slot.id, selectedPhotoId);
      setSelectedPhotoId(null);
    } else if (slot.photoId) {
      // Chưa cầm gì, bấm vào ô đã có ảnh → "nhấc" ảnh đó lên để mang sang ô khác.
      setSelectedPhotoId(slot.photoId);
    }
  }

  function handleClearSlot(slotId: string) {
    void assign(slotId, null);
    setSelectedPhotoId(null);
  }

  if (!session && !authLoading) {
    return (
      <StoreShell cartCount={cartCount}>
        <StoreNotice
          title="Đăng nhập để sắp xếp ảnh"
          body="Bản sắp xếp được lưu riêng theo tài khoản."
          action={<Link className="btn btn-primary" to="/auth" state={{ from: location }}>Đăng nhập</Link>}
        />
      </StoreShell>
    );
  }

  if (loading || !arrangement) {
    return (
      <StoreShell cartCount={cartCount}>
        <StoreNotice
          title={loadError ? 'Không mở được bản sắp xếp' : 'Đang tải…'}
          body={loadError ?? ''}
          action={loadError ? (
            <Link className="btn btn-secondary" to={`/photobook-cua-toi/${projectId}`}>← Về trang gửi ảnh</Link>
          ) : undefined}
        />
      </StoreShell>
    );
  }

  return (
    <StoreShell cartCount={cartCount}>
      <nav aria-label="Breadcrumb" data-breadcrumb="" style={{
        display: 'flex', alignItems: 'center', gap: 'var(--space-3)', minHeight: 46, padding: '0 var(--space-8)',
        borderBottom: '2px solid var(--color-divider)', fontSize: 11, letterSpacing: '.16em',
        textTransform: 'uppercase', color: 'var(--color-neutral-700)',
      }}>
        <Link to="/" style={{ color: 'var(--color-neutral-700)', textDecoration: 'none' }}>Trang chủ</Link>
        <span aria-hidden="true">/</span>
        <Link to={`/photobook-cua-toi/${projectId}`} style={{ color: 'var(--color-neutral-700)', textDecoration: 'none' }}>
          Ảnh photobook
        </Link>
        <span aria-hidden="true">/</span>
        <span style={{ color: 'var(--color-text)' }}>Sắp xếp</span>
      </nav>

      <section style={{
        display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', justifyContent: 'space-between',
        gap: 'var(--space-4)', padding: 'var(--space-8) var(--space-8) var(--space-4)',
      }}>
        <div>
          <h1 style={{
            margin: 0, fontFamily: 'var(--font-heading)', fontWeight: 800,
            fontSize: 'clamp(28px, 4vw, 36px)', lineHeight: 1.02, letterSpacing: '-.03em',
          }}>Sắp xếp cuốn của bạn</h1>
          <p style={{ margin: 'var(--space-2) 0 0', fontSize: 14, color: 'var(--color-neutral-800)' }}>
            {arrangement.spreads.length} spread · bấm một ảnh rồi bấm vào ô muốn đặt
          </p>
        </div>
      </section>

      {!arrangement.editable && (
        <section style={{ padding: '0 var(--space-8) var(--space-6)' }}>
          <p style={{
            margin: 0, padding: 'var(--space-4)', border: '2px solid var(--color-text)',
            fontSize: 14, lineHeight: 1.6,
          }}>
            Bản sắp xếp này đã bàn giao cho xưởng nên không sửa được nữa — đây là bản nháp bạn đã
            để lại, xưởng sẽ dựa vào đó để hoàn thiện layout thật.
          </p>
        </section>
      )}

      {error && (
        <p role="status" style={{ margin: '0 var(--space-8) var(--space-4)', fontSize: 13, color: 'var(--color-accent-700)' }}>
          {error}
        </p>
      )}

      {/* Đang cầm một ảnh: thanh nhắc luôn hiện để khách không quên đang chọn gì. */}
      {selectedPhotoId && selectedPhotoUrl && (
        <section style={{
          display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
          margin: '0 var(--space-8) var(--space-4)', padding: 'var(--space-3)',
          border: '2px solid var(--color-accent)', background: 'var(--color-accent-100)',
        }}>
          <img src={selectedPhotoUrl} alt="" style={{ width: 40, height: 40, objectFit: 'cover', border: '1px solid var(--color-text)' }} />
          <span style={{ fontSize: 13, color: 'var(--color-accent-700)', fontWeight: 600 }}>
            Đang cầm ảnh này — bấm vào một ô để đặt
          </span>
          <button type="button" className="btn btn-ghost" style={{ marginLeft: 'auto' }}
            onClick={() => setSelectedPhotoId(null)}>Bỏ chọn</button>
        </section>
      )}

      {/* ── Vùng biên tập spread đang chọn ── */}
      {activeSpread && (
        <section style={{ padding: '0 var(--space-8) var(--space-6)' }}>
          <div style={{
            display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
            gap: 'var(--space-3)', marginBottom: 'var(--space-3)',
          }}>
            <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: 18 }}>
              Spread {activeSpread.position} / {arrangement.spreads.length}
            </span>
            {busy && <span style={STORE_LABEL_STYLE}>Đang lưu…</span>}
          </div>

          <SpreadCanvas
            spread={activeSpread}
            layout={activeLayout}
            interactive={arrangement.editable}
            selectedPhotoId={selectedPhotoId}
            onSlotTap={handleSlotTap}
            onClearSlot={handleClearSlot}
          />

          {arrangement.editable && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 'var(--space-3)' }}>
              {arrangement.layouts.map((option) => {
                const on = option.code === activeSpread.layoutCode;
                return (
                  <button key={option.code} type="button" disabled={busy} onClick={() => void changeLayout(activeSpread.id, option.code)}
                    style={{
                      appearance: 'none', height: 34, padding: '0 12px', font: 'inherit', fontSize: 12, fontWeight: on ? 600 : 400,
                      cursor: busy ? 'not-allowed' : 'pointer', border: `2px solid ${on ? 'var(--color-text)' : 'var(--color-neutral-300)'}`,
                      background: on ? 'var(--color-text)' : 'var(--color-bg)', color: on ? 'var(--color-bg)' : 'var(--color-text)',
                    }}>{option.name}</button>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* ── Khay ảnh chưa xếp ── */}
      <section style={{ padding: '0 var(--space-8) var(--space-6)' }}>
        <span style={STORE_LABEL_STYLE}>Ảnh chưa xếp ({arrangement.unplacedPhotos.length})</span>
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', padding: 'var(--space-3) 0' }}>
          {arrangement.unplacedPhotos.length === 0 ? (
            <span style={{ fontSize: 13, color: 'var(--color-neutral-700)' }}>Không còn ảnh nào chưa xếp.</span>
          ) : arrangement.unplacedPhotos.map((photo) => {
            const on = photo.id === selectedPhotoId;
            return (
              <button key={photo.id} type="button" disabled={!arrangement.editable} onClick={() => handleTrayTap(photo.id)}
                style={{
                  flex: 'none', width: 84, height: 84, padding: 0, overflow: 'hidden',
                  cursor: arrangement.editable ? 'pointer' : 'default',
                  border: `3px solid ${on ? 'var(--color-accent)' : 'var(--color-divider)'}`,
                  background: 'none',
                }}>
                <img src={photo.url} alt={photo.originalFilename ?? ''} loading="lazy"
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
              </button>
            );
          })}
        </div>
      </section>

      {/* ── Toàn bộ storyboard: bấm một spread để mở lên vùng biên tập ── */}
      <section style={{ padding: '0 var(--space-8) var(--space-8)', borderTop: '2px solid var(--color-text)' }}>
        <span style={{ ...STORE_LABEL_STYLE, display: 'block', margin: 'var(--space-4) 0' }}>Toàn bộ cuốn sách</span>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 10 }}>
          {arrangement.spreads.map((spread) => {
            const layout = arrangement.layouts.find((l) => l.code === spread.layoutCode);
            const active = spread.id === activeSpreadId;
            return (
              <button key={spread.id} type="button" onClick={() => setActiveSpreadId(spread.id)}
                style={{
                  padding: 0, background: 'transparent', cursor: 'pointer', textAlign: 'left',
                  border: `2px solid ${active ? 'var(--color-accent)' : 'transparent'}`,
                }}>
                <SpreadCanvas spread={spread} layout={layout} interactive={false} selectedPhotoId={null} compact />
                <span style={{ display: 'block', marginTop: 4, fontSize: 11, color: 'var(--color-neutral-700)' }}>
                  {spread.position}. {layout?.name ?? spread.layoutCode}
                </span>
              </button>
            );
          })}
        </div>
      </section>
    </StoreShell>
  );
}

/**
 * Khung một spread — hai trang sách cạnh nhau, tỉ lệ 2/1, có gáy ở giữa. Ô vẽ theo % trong
 * layout đang dùng, chồng lên ảnh đã đặt (nếu có).
 *
 * `interactive` bật tap-để-chọn/đặt và nút xoá riêng từng ô; tắt thì chỉ để xem (dùng cho lưới
 * thumbnail toàn cuốn, hoặc khi bản sắp xếp đã khoá).
 */
function SpreadCanvas({ spread, layout, interactive, selectedPhotoId, onSlotTap, onClearSlot, compact }: {
  spread: PhotobookArrangementSpread;
  layout: PhotobookLayoutOption | null | undefined;
  interactive: boolean;
  selectedPhotoId: string | null;
  onSlotTap?: (slot: PhotobookArrangementSlot) => void;
  onClearSlot?: (slotId: string) => void;
  compact?: boolean;
}) {
  const defs = layout?.slots ?? [];
  const isColorBlock = defs.length === 0;
  const captions = useMemo(() => parseCaptions(spread.captionsJson), [spread.captionsJson]);

  return (
    <div style={{
      position: 'relative', width: '100%', aspectRatio: '2 / 1', containerType: 'inline-size',
      background: spread.backgroundColor || (isColorBlock ? 'var(--color-accent)' : 'var(--color-neutral-200)'),
      border: '2px solid var(--color-divider)', overflow: 'hidden',
    }}>
      {!isColorBlock && (
        <span aria-hidden="true" style={{
          position: 'absolute', top: 0, bottom: 0, left: '50%', width: 2,
          background: 'var(--color-divider)', opacity: .6, zIndex: 1, pointerEvents: 'none',
        }} />
      )}
      {isColorBlock && !compact && (
        <span style={{
          position: 'absolute', inset: 0, display: 'grid', placeItems: 'center',
          color: 'var(--color-bg)', fontSize: 11, letterSpacing: '.14em', textTransform: 'uppercase',
        }}>Trang ngắt chương</span>
      )}
      {defs.map((def, index) => {
        const slot = spread.slots.find((item) => item.slotIndex === index);
        if (!slot) return null;
        const carried = interactive && selectedPhotoId !== null && slot.photoId === selectedPhotoId;
        return (
          <div key={slot.id}
            role={interactive ? 'button' : undefined}
            tabIndex={interactive ? 0 : undefined}
            aria-label={interactive ? (slot.photoUrl ? 'Nhấc ảnh trong ô này' : 'Đặt ảnh vào ô này') : undefined}
            onClick={interactive ? () => onSlotTap?.(slot) : undefined}
            onKeyDown={interactive ? (event) => {
              if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onSlotTap?.(slot); }
            } : undefined}
            style={{
              position: 'absolute', left: `${def.x * 100}%`, top: `${def.y * 100}%`,
              width: `${def.w * 100}%`, height: `${def.h * 100}%`,
              cursor: interactive ? 'pointer' : 'default', overflow: 'hidden',
              border: carried ? '3px solid var(--color-accent)' : compact ? 0 : '1px solid var(--color-bg)',
              background: slot.photoUrl ? 'transparent' : 'var(--color-neutral-100)',
            }}>
            {slot.photoUrl ? (() => {
              const { panX, panY } = focalToPan(slot.focalX, slot.focalY);
              const crop = cropStyle(slot.zoom, panX, panY);
              return (
                <img src={slot.photoUrl} alt="" style={{
                  width: '100%', height: '100%', objectFit: 'cover',
                  objectPosition: crop.objectPosition, transform: crop.transform, transformOrigin: 'center',
                  opacity: carried ? 0.35 : 1,
                }} />
              );
            })() : (!compact && interactive && (
              <span aria-hidden="true" style={{
                position: 'absolute', inset: 0, display: 'grid', placeItems: 'center',
                fontSize: 18, color: 'var(--color-neutral-400)',
              }}>+</span>
            ))}
            {interactive && slot.photoUrl && !compact && (
              <button type="button" aria-label="Xoá ảnh khỏi ô"
                onClick={(event) => { event.stopPropagation(); onClearSlot?.(slot.id); }}
                style={{
                  position: 'absolute', top: 2, right: 2, width: 20, height: 20, padding: 0,
                  display: 'grid', placeItems: 'center', appearance: 'none', border: 0,
                  background: 'var(--color-text)', color: 'var(--color-bg)', fontSize: 12, lineHeight: 1,
                  cursor: 'pointer',
                }}>×</button>
            )}
          </div>
        );
      })}
      {captions.map((caption, ci) => (
        <div key={caption.id ?? ci} aria-hidden="true" style={{
          position: 'absolute', left: `${caption.x * 100}%`, top: `${caption.y * 100}%`,
          transform: 'translate(-50%, -50%)', zIndex: 5, maxWidth: '60%',
          padding: compact ? '1px 3px' : '2px 6px', fontSize: `${caption.fontSize}cqw`,
          fontWeight: caption.bold ? 700 : 400, color: caption.color,
          fontFamily: `"${caption.fontFamily}", ${CAPTION_FONTS[caption.fontFamily] ?? 'sans-serif'}`,
          textAlign: caption.align, lineHeight: 1.3, whiteSpace: 'pre-wrap',
          pointerEvents: 'none', overflow: 'hidden',
        }}>
          {caption.text}
        </div>
      ))}
    </div>
  );
}
