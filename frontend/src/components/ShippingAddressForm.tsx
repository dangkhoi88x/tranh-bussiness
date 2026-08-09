import type { ShippingAddressInput } from '../api/checkout';

export function ShippingAddressForm({ form, setField, fieldErrors, error, saving, submitLabel, onSave, onCancel }: {
  form: ShippingAddressInput;
  setField: (key: keyof ShippingAddressInput, value: string | boolean) => void;
  fieldErrors: Record<string, string>;
  error: string | null;
  saving: boolean;
  submitLabel?: string;
  onSave: () => void;
  onCancel?: () => void;
}) {
  const fields: { key: keyof ShippingAddressInput; label: string; placeholder: string }[] = [
    { key: 'recipientName', label: 'Người nhận', placeholder: 'Nguyễn Văn A' },
    { key: 'phone', label: 'Số điện thoại', placeholder: '0909 000 000' },
    { key: 'province', label: 'Tỉnh / Thành phố', placeholder: 'TP. Hồ Chí Minh' },
    { key: 'district', label: 'Quận / Huyện', placeholder: 'Quận 1' },
    { key: 'ward', label: 'Phường / Xã', placeholder: 'Phường Bến Nghé' },
    { key: 'addressLine', label: 'Địa chỉ chi tiết', placeholder: '123 Lê Lợi' },
  ];

  return <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
    <div data-split="" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 'var(--space-3)' }}>
      {fields.map(({ key, label, placeholder }) => <div key={key} className="field">
        <label htmlFor={`shipping-${key}`}>{label}</label>
        <input id={`shipping-${key}`} className="input" placeholder={placeholder} value={form[key] as string}
          onChange={(event) => setField(key, event.target.value)} />
        {fieldErrors[key] && <span style={{ display: 'block', marginTop: 2, fontSize: 11, color: 'var(--color-accent-700)' }}>{fieldErrors[key]}</span>}
      </div>)}
    </div>
    <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', fontSize: 13, cursor: 'pointer' }}>
      <input type="checkbox" checked={Boolean(form.defaultAddress)} onChange={(event) => setField('defaultAddress', event.target.checked)} />
      Đặt làm địa chỉ mặc định
    </label>
    {error && <p role="alert" style={{ margin: 0, fontSize: 12, color: 'var(--color-accent-700)' }}>{error}</p>}
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
      <button type="button" className="btn btn-primary" disabled={saving} onClick={onSave}>{saving ? 'Đang lưu…' : submitLabel ?? 'Lưu địa chỉ'}</button>
      {onCancel && <button type="button" className="btn btn-secondary" disabled={saving} onClick={onCancel}>Huỷ</button>}
    </div>
  </div>;
}
