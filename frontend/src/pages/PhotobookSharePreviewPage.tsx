import { useEffect, useCallback, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { apiRequest } from '../api/http';
import { layoutByCode } from '../data/spreadLayouts';
import { absoluteSiteUrl, useDocumentMeta } from '../hooks/useDocumentMeta';
import '../styles/ds.css';
import '../styles/public.css';

type PreviewCaption = {
  id?: string;
  text: string;
  x: number;
  y: number;
  fontSize: number;
  color: string;
  bold: boolean;
  align: 'left' | 'center' | 'right';
  fontFamily: string;
};
type PreviewSlot = { imageId: string | null; zoom: number; panX: number; panY: number };
type PreviewSpread = {
  position: number;
  layoutCode: string;
  slots: PreviewSlot[];
  captions?: PreviewCaption[];
  backgroundColor?: string;
};

type SharePreviewData = {
  token: string;
  productSlug: string;
  sizeLabel: string | null;
  pageCount: string | null;
  finish: string | null;
  templateId: string | null;
  spreadsJson: string;
  images: Record<string, string>;
  expiresAt: string;
  createdAt: string;
};

const CAPTION_FONTS: Record<string, string> = {
  Archivo: 'sans-serif',
  'Playfair Display': 'serif',
  Lora: 'serif',
  'Cormorant Garamond': 'serif',
  Spectral: 'serif',
  Montserrat: 'sans-serif',
  Quicksand: 'sans-serif',
  'Dancing Script': 'cursive',
  'Great Vibes': 'cursive',
  Pacifico: 'cursive',
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function PhotobookSharePreviewPage() {
  const { token = '' } = useParams();
  const [data, setData] = useState<SharePreviewData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useDocumentMeta({
    title: 'Xem trước photobook | Bubble Memories',
    description: 'Bản xem trước photobook được chia sẻ riêng tư.',
    canonicalUrl: absoluteSiteUrl(`/xem-truoc/${token}`),
    robots: 'noindex, nofollow',
  });

  useEffect(() => {
    if (!token) {
      setError('Link không hợp lệ');
      setLoading(false);
      return;
    }
    let alive = true;
    apiRequest<SharePreviewData>(`/photobook-share-previews/${encodeURIComponent(token)}`)
      .then((result) => {
        if (alive) setData(result);
      })
      .catch(() => {
        if (alive) setError('Không tìm thấy bản xem trước hoặc link đã hết hạn.');
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [token]);

  if (loading) {
    return (
      <div
        style={{
          minHeight: '100dvh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'var(--font-body)',
        }}
      >
        <p style={{ fontSize: 14, color: 'var(--color-neutral-700)' }}>Đang tải bản xem trước…</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div
        style={{
          minHeight: '100dvh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 'var(--space-4)',
          fontFamily: 'var(--font-body)',
        }}
      >
        <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: 24, margin: 0 }}>Bubble Memories</h1>
        <p style={{ fontSize: 14, color: 'var(--color-neutral-700)', margin: 0 }}>{error}</p>
        <Link to="/photobook" className="btn btn-primary" style={{ marginTop: 'var(--space-4)' }}>
          Tạo photobook của bạn
        </Link>
      </div>
    );
  }

  let spreads: PreviewSpread[] = [];
  try {
    spreads = JSON.parse(data.spreadsJson);
  } catch {
    /* empty */
  }

  return (
    <div style={{ minHeight: '100dvh', fontFamily: 'var(--font-body)', background: 'var(--color-bg)' }}>
      {/* Header */}
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: 'var(--space-4) var(--space-6)',
          borderBottom: '2px solid var(--color-text)',
        }}
      >
        <Link
          to="/"
          style={{
            textDecoration: 'none',
            color: 'var(--color-text)',
            fontFamily: 'var(--font-heading)',
            fontWeight: 800,
            fontSize: 18,
          }}
        >
          Bubble Memories
        </Link>
        <Link to="/photobook" className="btn btn-secondary" style={{ fontSize: 12 }}>
          Tạo photobook
        </Link>
      </header>

      {/* Content */}
      <main style={{ maxWidth: 1000, margin: '0 auto', padding: 'var(--space-8)' }}>
        <div style={{ textAlign: 'center', marginBottom: 'var(--space-8)' }}>
          <p
            style={{
              margin: '0 0 var(--space-2)',
              fontSize: 11,
              letterSpacing: '.2em',
              textTransform: 'uppercase',
              color: 'var(--color-neutral-500)',
            }}
          >
            Bản xem trước
          </p>
          <h1
            style={{
              margin: 0,
              fontFamily: 'var(--font-heading)',
              fontWeight: 800,
              fontSize: 28,
              letterSpacing: '-.03em',
            }}
          >
            Photobook Preview
          </h1>
          {(data.sizeLabel || data.pageCount || data.finish) && (
            <p style={{ margin: 'var(--space-2) 0 0', fontSize: 13, color: 'var(--color-neutral-700)' }}>
              {[
                data.sizeLabel,
                data.pageCount ? `${data.pageCount} trang` : null,
                data.finish,
                `${spreads.length} spread`,
              ]
                .filter(Boolean)
                .join(' · ')}
            </p>
          )}
        </div>

        <PreviewBookDemo spreads={spreads} images={data.images} />

        {/* Grid view */}
        <div style={{ marginTop: 'var(--space-8)' }}>
          <h2
            style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 18, margin: '0 0 var(--space-4)' }}
          >
            Tất cả spread
          </h2>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: 'var(--space-4)',
            }}
          >
            {spreads.map((spread, idx) => {
              const layout = layoutByCode(spread.layoutCode);
              return (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 4,
                    border: '2px solid var(--color-neutral-300)',
                    borderRadius: 4,
                    background: 'var(--color-bg)',
                    padding: 6,
                  }}
                >
                  <PreviewSpreadMini spread={spread} images={data.images} />
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      letterSpacing: '.08em',
                      textTransform: 'uppercase',
                      color: 'var(--color-neutral-700)',
                    }}
                  >
                    {idx + 1}. {layout.name}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* CTA */}
        <div
          style={{
            textAlign: 'center',
            marginTop: 'var(--space-10)',
            padding: 'var(--space-8)',
            borderTop: '2px solid var(--color-text)',
          }}
        >
          <p style={{ margin: '0 0 var(--space-4)', fontSize: 14, color: 'var(--color-neutral-700)' }}>
            Bạn cũng muốn tạo một cuốn photobook?
          </p>
          <Link to="/photobook" className="btn btn-primary" style={{ fontSize: 14 }}>
            Tạo photobook của bạn →
          </Link>
        </div>

        {/* Expiry note */}
        <p
          style={{ textAlign: 'center', fontSize: 11, color: 'var(--color-neutral-500)', marginTop: 'var(--space-6)' }}
        >
          Link xem trước hết hạn ngày {new Date(data.expiresAt).toLocaleDateString('vi-VN')}
        </p>
      </main>
    </div>
  );
}

function SlotImageUrl({ url, zoom, panX, panY }: { url: string; zoom: number; panX: number; panY: number }) {
  const z = clamp(zoom ?? 1, 1, 3);
  const panRange = ((z - 1) / z) * 50;
  return (
    <img
      src={url}
      alt=""
      draggable={false}
      loading="lazy"
      decoding="async"
      style={{
        width: '100%',
        height: '100%',
        objectFit: 'cover',
        display: 'block',
        objectPosition: `${50 + (panX ?? 0) * panRange}% ${50 + (panY ?? 0) * panRange}%`,
        transform: `scale(${z})`,
        transformOrigin: 'center',
      }}
    />
  );
}

function PreviewSpreadMini({ spread, images }: { spread: PreviewSpread; images: Record<string, string> }) {
  const layout = layoutByCode(spread.layoutCode);
  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        aspectRatio: '2 / 1.4',
        background: spread.backgroundColor || 'var(--color-neutral-100)',
        borderRadius: 2,
        overflow: 'hidden',
        containerType: 'inline-size',
      }}
    >
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: 0,
          bottom: 0,
          width: 1,
          background: 'var(--color-neutral-200)',
        }}
      />
      {layout.slots.map((slot, i) => {
        const data = spread.slots[i];
        const url = data?.imageId ? images[data.imageId] : null;
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: `${slot.x * 100}%`,
              top: `${slot.y * 100}%`,
              width: `${slot.w * 100}%`,
              height: `${slot.h * 100}%`,
              background: url ? 'transparent' : 'var(--color-neutral-200)',
              borderRadius: slot.bleed ? 0 : 2,
              overflow: 'hidden',
              border: '1px solid var(--color-neutral-300)',
            }}
          >
            {url && <SlotImageUrl url={url} zoom={data.zoom} panX={data.panX} panY={data.panY} />}
          </div>
        );
      })}
      {(spread.captions ?? []).map((caption, ci) => (
        <div
          key={caption.id ?? ci}
          style={{
            position: 'absolute',
            left: `${caption.x * 100}%`,
            top: `${caption.y * 100}%`,
            transform: 'translate(-50%, -50%)',
            zIndex: 5,
            maxWidth: '60%',
            padding: '1px 3px',
            fontSize: `${caption.fontSize}cqw`,
            fontWeight: caption.bold ? 700 : 400,
            color: caption.color,
            fontFamily: `"${caption.fontFamily}", ${CAPTION_FONTS[caption.fontFamily] ?? 'sans-serif'}`,
            textAlign: caption.align,
            lineHeight: 1.3,
            whiteSpace: 'pre-wrap',
            pointerEvents: 'none',
            overflow: 'hidden',
          }}
        >
          {caption.text}
        </div>
      ))}
    </div>
  );
}

function PreviewSpreadPage({ spread, images }: { spread: PreviewSpread; images: Record<string, string> }) {
  const layout = layoutByCode(spread.layoutCode);
  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        background: spread.backgroundColor || '#fff',
        containerType: 'inline-size',
      }}
    >
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: 0,
          bottom: 0,
          width: 1,
          background: 'var(--color-neutral-200)',
        }}
      />
      {layout.slots.map((slot, i) => {
        const data = spread.slots[i];
        const url = data?.imageId ? images[data.imageId] : null;
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: `${slot.x * 100}%`,
              top: `${slot.y * 100}%`,
              width: `${slot.w * 100}%`,
              height: `${slot.h * 100}%`,
              background: url ? 'transparent' : 'var(--color-neutral-100)',
              borderRadius: slot.bleed ? 0 : 2,
              overflow: 'hidden',
              border: `1px solid ${url ? 'transparent' : 'var(--color-neutral-200)'}`,
            }}
          >
            {url ? (
              <SlotImageUrl url={url} zoom={data.zoom} panX={data.panX} panY={data.panY} />
            ) : (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '100%',
                  fontSize: 18,
                  color: 'var(--color-neutral-300)',
                }}
              >
                +
              </div>
            )}
          </div>
        );
      })}
      {(spread.captions ?? []).map((caption, ci) => (
        <div
          key={caption.id ?? ci}
          style={{
            position: 'absolute',
            left: `${caption.x * 100}%`,
            top: `${caption.y * 100}%`,
            transform: 'translate(-50%, -50%)',
            zIndex: 5,
            maxWidth: '60%',
            padding: '2px 6px',
            fontSize: `${caption.fontSize}cqw`,
            fontWeight: caption.bold ? 700 : 400,
            color: caption.color,
            fontFamily: `"${caption.fontFamily}", ${CAPTION_FONTS[caption.fontFamily] ?? 'sans-serif'}`,
            textAlign: caption.align,
            lineHeight: 1.3,
            whiteSpace: 'pre-wrap',
            textShadow: caption.color === '#ffffff' ? '0 1px 3px rgba(0,0,0,.5)' : '0 1px 2px rgba(255,255,255,.3)',
            pointerEvents: 'none',
          }}
        >
          {caption.text}
        </div>
      ))}
      {layout.slots.length === 0 && !(spread.captions ?? []).length && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            fontSize: 12,
            color: 'var(--color-neutral-400)',
            fontStyle: 'italic',
          }}
        >
          Trang trang trí
        </div>
      )}
    </div>
  );
}

function PreviewBookDemo({ spreads, images }: { spreads: PreviewSpread[]; images: Record<string, string> }) {
  const [page, setPage] = useState(-1);
  const [flipping, setFlipping] = useState(false);
  const [autoPlay, setAutoPlay] = useState(false);
  const timerRef = useRef<number>(0);
  const total = spreads.length;

  const chipStyle = (on: boolean): React.CSSProperties => ({
    appearance: 'none',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: 36,
    padding: '0 10px',
    font: 'inherit',
    fontSize: 12,
    fontWeight: on ? 600 : 400,
    lineHeight: 1,
    whiteSpace: 'nowrap',
    cursor: 'pointer',
    border: `2px solid ${on ? 'var(--color-text)' : 'var(--color-neutral-300)'}`,
    background: on ? 'var(--color-text)' : 'var(--color-bg)',
    color: on ? 'var(--color-bg)' : 'var(--color-text)',
  });

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
    if (!autoPlay) {
      window.clearInterval(timerRef.current);
      return;
    }
    timerRef.current = window.setInterval(() => {
      setPage((p) => {
        if (p >= total) {
          setAutoPlay(false);
          return p;
        }
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
      <div style={{ perspective: 1800, width: '100%', maxWidth: 640, margin: '0 auto' }}>
        <div style={{ position: 'relative', width: '100%', aspectRatio: '1.05 / 0.7', transformStyle: 'preserve-3d' }}>
          <div
            style={{
              position: 'absolute',
              bottom: -8,
              left: '8%',
              right: '8%',
              height: 16,
              background: 'radial-gradient(ellipse at center, rgba(0,0,0,.18) 0%, transparent 70%)',
              borderRadius: '50%',
              filter: 'blur(4px)',
            }}
          />
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(135deg, var(--color-neutral-300) 0%, var(--color-neutral-200) 100%)',
              borderRadius: '2px 6px 6px 2px',
              border: '1px solid var(--color-neutral-300)',
            }}
          />
          <div
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: '2px 6px 6px 2px',
              overflow: 'hidden',
              background: isBack
                ? 'linear-gradient(135deg, var(--color-neutral-300) 0%, var(--color-neutral-200) 100%)'
                : '#fff',
            }}
          >
            {!isBack && page + 1 < total && <PreviewSpreadPage spread={spreads[nextIdx]} images={images} />}
            {isBack && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '100%',
                  fontSize: 13,
                  color: 'var(--color-neutral-500)',
                  fontStyle: 'italic',
                }}
              >
                Bìa sau
              </div>
            )}
          </div>
          <div
            style={{
              position: 'absolute',
              inset: 0,
              transformOrigin: 'left center',
              transform:
                page >= 0 && !isCover
                  ? `rotateY(${flipping && page === visibleIdx ? '-160deg' : page > visibleIdx ? '-180deg' : '0deg'})`
                  : 'rotateY(0deg)',
              transition: flipping ? 'transform .65s cubic-bezier(.645,.045,.355,1)' : 'none',
              backfaceVisibility: 'hidden',
              borderRadius: '2px 6px 6px 2px',
              overflow: 'hidden',
              background: '#fff',
              zIndex: 2,
              boxShadow: flipping ? '4px 0 12px rgba(0,0,0,.12)' : '2px 0 6px rgba(0,0,0,.06)',
            }}
          >
            {isCover ? (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '100%',
                  gap: 'var(--space-4)',
                  background: 'linear-gradient(145deg, var(--color-text) 0%, #3d3835 100%)',
                  color: 'var(--color-bg)',
                  borderRadius: '2px 6px 6px 2px',
                }}
              >
                <span style={{ fontSize: 10, letterSpacing: '.3em', textTransform: 'uppercase', opacity: 0.6 }}>
                  Preview
                </span>
                <span
                  style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: 22, letterSpacing: '-.02em' }}
                >
                  Photobook
                </span>
                <span style={{ fontSize: 11, opacity: 0.5 }}>{total} spread</span>
              </div>
            ) : (
              <PreviewSpreadPage spread={spreads[visibleIdx]} images={images} />
            )}
          </div>
          <div
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              bottom: 0,
              width: 10,
              background:
                'linear-gradient(90deg, var(--color-neutral-400) 0%, var(--color-neutral-300) 40%, var(--color-neutral-400) 100%)',
              borderRadius: '2px 0 0 2px',
              zIndex: 3,
            }}
          />
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
        <button type="button" className="btn btn-ghost" disabled={page < 0 || flipping} onClick={goPrev}>
          ← Trước
        </button>
        <button type="button" onClick={() => setAutoPlay(!autoPlay)} style={chipStyle(autoPlay)}>
          {autoPlay ? 'Dừng' : 'Tự lật'}
        </button>
        <button type="button" className="btn btn-ghost" disabled={page >= total || flipping} onClick={goNext}>
          Sau →
        </button>
      </div>

      <p style={{ margin: 0, fontSize: 12, color: 'var(--color-neutral-700)', textAlign: 'center' }}>
        {isCover ? 'Bìa trước' : isBack ? 'Bìa sau' : `Spread ${page + 1} / ${total}`}
      </p>
    </div>
  );
}
