export const chipStyle = (on: boolean, disabled = false): React.CSSProperties => ({
  appearance: 'none', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
  height: 36, padding: '0 10px', font: 'inherit', fontSize: 12, fontWeight: on ? 600 : 400,
  lineHeight: 1, whiteSpace: 'nowrap', cursor: disabled ? 'not-allowed' : 'pointer',
  border: `2px solid ${on ? 'var(--color-text)' : 'var(--color-neutral-300)'}`,
  background: on ? 'var(--color-text)' : 'var(--color-bg)', color: on ? 'var(--color-bg)' : 'var(--color-text)',
  opacity: disabled ? 0.4 : 1,
});

export const stepBtnStyle = (disabled: boolean): React.CSSProperties => ({
  appearance: 'none', width: 32, height: 32, border: 0, background: 'transparent',
  font: 'inherit', fontSize: 16, color: 'var(--color-text)',
  cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.4 : 1,
});

export const optionRow: React.CSSProperties = {
  display: 'grid', gridTemplateColumns: '84px minmax(0, 1fr)', alignItems: 'center',
  gap: 'var(--space-4)', padding: 'var(--space-4) 0', borderBottom: '1px solid var(--color-neutral-300)',
};

export const chipGrid: React.CSSProperties = {
  display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(104px, 1fr))', gap: 6,
};
