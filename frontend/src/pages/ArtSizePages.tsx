import { useEffect, useState, type FormEvent } from 'react';
import { apiRequest } from '../api/http';
import { Modal } from '../components/admin/Modal';
import { Panel } from '../components/admin/Panel';
type ArtSize = {
  id: string;
  code: string;
  name: string;
  widthCm: number | null;
  heightCm: number | null;
  status: 'ACTIVE' | 'ARCHIVED';
};
const errorText = (e: unknown) => (e instanceof Error ? e.message : 'Đã có lỗi xảy ra.');
export function ArtSizesPage() {
  const [items, setItems] = useState<ArtSize[]>([]);
  const [editing, setEditing] = useState<ArtSize | null | undefined>(undefined);
  const [message, setMessage] = useState<string | null>(null);
  async function load() {
    try {
      setItems(await apiRequest<ArtSize[]>('/art-sizes/management'));
    } catch (e) {
      setMessage(errorText(e));
    }
  }
  useEffect(() => {
    void load();
  }, []);
  return (
    <>
      <header className="catalog-header">
        <div>
          <p className="eyebrow">CATALOG</p>
          <h2>Khổ tranh</h2>
          <p>Quản lý chuẩn A0–A4 và kích thước tùy chỉnh cho từng variant.</p>
        </div>
        <button className="primary-button compact" onClick={() => setEditing(null)}>
          + Thêm khổ tranh
        </button>
      </header>
      {message && <p className="catalog-message">{message}</p>}
      <Panel>
        <table className="data-table">
          <thead>
            <tr>
              <th>Khổ</th>
              <th>Kích thước</th>
              <th>Trạng thái</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {items.map((i) => (
              <tr key={i.id}>
                <td>
                  <strong>{i.code}</strong>
                  <small>{i.name}</small>
                </td>
                <td>{i.widthCm == null ? 'Tùy chỉnh' : `${i.widthCm} × ${i.heightCm} cm`}</td>
                <td>
                  <span className={`status status--${i.status.toLowerCase()}`}>
                    {i.status === 'ACTIVE' ? 'Đang dùng' : 'Lưu trữ'}
                  </span>
                </td>
                <td className="table-actions">
                  <button onClick={() => setEditing(i)}>Sửa</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
      {editing !== undefined && (
        <ArtSizeForm
          item={editing}
          onClose={() => setEditing(undefined)}
          onSaved={() => {
            setEditing(undefined);
            setMessage('Đã lưu khổ tranh.');
            void load();
          }}
        />
      )}
    </>
  );
}
function ArtSizeForm({ item, onClose, onSaved }: { item: ArtSize | null; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    code: item?.code ?? '',
    name: item?.name ?? '',
    widthCm: String(item?.widthCm ?? ''),
    heightCm: String(item?.heightCm ?? ''),
    status: item?.status ?? 'ACTIVE',
  });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const change = (key: keyof typeof form, value: string) => setForm({ ...form, [key]: value });
  const custom = form.code.trim().toUpperCase() === 'CUSTOM';
  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await apiRequest(item ? `/art-sizes/${item.id}` : '/art-sizes', {
        method: item ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          widthCm: custom ? null : Number(form.widthCm),
          heightCm: custom ? null : Number(form.heightCm),
        }),
      });
      onSaved();
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal title={item ? 'Sửa khổ tranh' : 'Thêm khổ tranh'} onClose={onClose}>
      <form className="admin-form" onSubmit={(e) => void submit(e)}>
        <div className="form-grid">
          <label>
            Mã
            <input
              value={form.code}
              onChange={(e) => change('code', e.target.value)}
              placeholder="VD: A2 hoặc CUSTOM"
              required
            />
          </label>
          <label>
            Tên
            <input value={form.name} onChange={(e) => change('name', e.target.value)} required />
          </label>
          {!custom && (
            <>
              <label>
                Rộng (cm)
                <input
                  type="number"
                  min="0.01"
                  step="any"
                  value={form.widthCm}
                  onChange={(e) => change('widthCm', e.target.value)}
                  required
                />
              </label>
              <label>
                Cao (cm)
                <input
                  type="number"
                  min="0.01"
                  step="any"
                  value={form.heightCm}
                  onChange={(e) => change('heightCm', e.target.value)}
                  required
                />
              </label>
            </>
          )}
          {item && (
            <label>
              Trạng thái
              <select value={form.status} onChange={(e) => change('status', e.target.value)}>
                <option value="ACTIVE">Đang dùng</option>
                <option value="ARCHIVED">Lưu trữ</option>
              </select>
            </label>
          )}
        </div>
        {error && <p className="form-error">{error}</p>}
        <footer>
          <button type="button" className="ghost-button" onClick={onClose}>
            Hủy
          </button>
          <button className="primary-button compact" disabled={busy}>
            {busy ? 'Đang lưu…' : 'Lưu khổ tranh'}
          </button>
        </footer>
      </form>
    </Modal>
  );
}
