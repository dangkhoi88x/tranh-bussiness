export function SkeletonBlock({ width = '100%', height = 16 }: { width?: string | number; height?: string | number }) {
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

export function PhotobookDetailSkeleton() {
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
   Progress bar
   ═══════════════════════════════════════════════════════════════════════════ */
