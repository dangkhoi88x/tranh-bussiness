import { useEffect, useRef } from 'react';
import { STORE_LABEL_STYLE } from '../../components/StoreShell';
import { CAPTION_COLORS, CAPTION_FONTS, CAPTION_SIZES, DraftCaption, clamp } from './draft';
import { chipStyle } from './styles';

export function CaptionEditor({
  caption,
  onChange,
  onDelete,
  onClose,
}: {
  caption: DraftCaption;
  onChange: (updates: Partial<Omit<DraftCaption, 'id'>>) => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const textRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  useEffect(() => {
    textRef.current?.focus();
    if (textRef.current && !caption.text) textRef.current.select();
  }, []);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="caption-editor-title"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 30,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--space-5)',
        background: 'rgba(19, 19, 19, .64)',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          width: 'min(100%, 480px)',
          maxHeight: 'calc(100vh - 40px)',
          overflowY: 'auto',
          background: 'var(--color-bg)',
          border: '2px solid var(--color-text)',
          borderRadius: 6,
          boxShadow: '0 24px 80px rgba(0,0,0,.3)',
          padding: 'var(--space-6)',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-5)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'start', justifyContent: 'space-between', gap: 'var(--space-4)' }}>
          <div>
            <p style={{ ...STORE_LABEL_STYLE, margin: 0 }}>Caption</p>
            <h2
              id="caption-editor-title"
              style={{ margin: 'var(--space-1) 0 0', fontFamily: 'var(--font-heading)', fontSize: 22 }}
            >
              Thêm chữ trên spread
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            style={{
              appearance: 'none',
              width: 36,
              height: 36,
              border: '2px solid var(--color-text)',
              background: 'var(--color-bg)',
              font: 'inherit',
              fontSize: 20,
              lineHeight: 1,
              cursor: 'pointer',
              borderRadius: 3,
            }}
          >
            ×
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          <span style={STORE_LABEL_STYLE}>Nội dung</span>
          <textarea
            ref={textRef}
            rows={3}
            value={caption.text}
            placeholder="Nhập tên, ngày, lời nhắn…"
            onChange={(e) => onChange({ text: e.target.value })}
            style={{
              width: '100%',
              padding: 'var(--space-3)',
              font: 'inherit',
              fontSize: 15,
              lineHeight: 1.5,
              border: '2px solid var(--color-text)',
              borderRadius: 3,
              resize: 'vertical',
              background: 'var(--color-bg)',
              color: 'var(--color-text)',
            }}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          <span style={STORE_LABEL_STYLE}>Phông chữ</span>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {CAPTION_FONTS.map((f) => (
              <button
                key={f.value}
                type="button"
                onClick={() => onChange({ fontFamily: f.value })}
                style={{
                  ...chipStyle(caption.fontFamily === f.value),
                  fontFamily: `"${f.value}", ${f.fallback}`,
                  fontSize: 13,
                  minWidth: 0,
                  padding: '5px 10px',
                }}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          <span style={STORE_LABEL_STYLE}>Cỡ chữ</span>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {CAPTION_SIZES.map((s) => (
              <button
                key={s.value}
                type="button"
                onClick={() => onChange({ fontSize: s.value })}
                style={chipStyle(caption.fontSize === s.value)}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          <span style={STORE_LABEL_STYLE}>Màu chữ</span>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {CAPTION_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => onChange({ color: c })}
                title={c}
                style={{
                  appearance: 'none',
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  cursor: 'pointer',
                  padding: 0,
                  background: c,
                  border: caption.color === c ? '3px solid var(--color-accent)' : '2px solid var(--color-neutral-300)',
                  boxShadow: c === '#ffffff' ? 'inset 0 0 0 1px var(--color-neutral-300)' : 'none',
                }}
              />
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 'var(--space-4)', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            <span style={STORE_LABEL_STYLE}>Căn chữ</span>
            <div style={{ display: 'flex', gap: 6 }}>
              {(['left', 'center', 'right'] as const).map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => onChange({ align: a })}
                  style={chipStyle(caption.align === a)}
                >
                  {a === 'left' ? '◧' : a === 'center' ? '◫' : '◨'}
                </button>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            <span style={STORE_LABEL_STYLE}>Đậm</span>
            <button type="button" onClick={() => onChange({ bold: !caption.bold })} style={chipStyle(caption.bold)}>
              <strong>B</strong>
            </button>
          </div>
        </div>

        <div
          style={{
            padding: 'var(--space-4)',
            background: 'var(--color-neutral-100)',
            borderRadius: 4,
            textAlign: caption.align,
            fontSize: clamp(caption.fontSize * 4, 12, 36),
            fontWeight: caption.bold ? 700 : 400,
            color: caption.color,
            lineHeight: 1.3,
            fontFamily: `"${caption.fontFamily}", ${CAPTION_FONTS.find((f) => f.value === caption.fontFamily)?.fallback ?? 'sans-serif'}`,
            minHeight: 48,
            display: 'flex',
            alignItems: caption.align === 'center' ? 'center' : 'flex-start',
            justifyContent:
              caption.align === 'right' ? 'flex-end' : caption.align === 'center' ? 'center' : 'flex-start',
            textShadow: caption.color === '#ffffff' ? '0 1px 3px rgba(0,0,0,.5)' : 'none',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}
        >
          {caption.text || <span style={{ opacity: 0.4, fontStyle: 'italic' }}>Xem trước...</span>}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={onDelete}
            style={{ color: 'var(--color-accent-700)' }}
          >
            Xoá caption
          </button>
          <button type="button" className="btn btn-primary" onClick={onClose}>
            Xong
          </button>
        </div>
      </div>
    </div>
  );
}
