import { useEffect, useState, type FormEvent } from 'react';
import {
  createPhotobookTemplate,
  fetchPhotobookTemplatesForManagement,
  updatePhotobookTemplate,
  type PhotobookTemplateRow,
  type SavePhotobookTemplateInput,
} from '../api/photobookTemplates';
import type { PresetCaption } from '../data/photobookTemplates';
import { SPREAD_LAYOUTS } from '../data/spreadLayouts';
import { Modal } from '../components/admin/Modal';
import { Panel } from '../components/admin/Panel';

const errorText = (e: unknown) => (e instanceof Error ? e.message : 'Đã có lỗi xảy ra.');

/**
 * Thư viện chủ đề photobook. Chu kỳ bố cục ở đây đi thẳng vào sản xuất: PhotobookLayoutEngine
 * dựng spread cho cuốn khách mua trước rồi gửi ảnh sau theo đúng thứ tự này, lặp lại nếu cuốn
 * dài hơn chu kỳ. Phần màu nền, font và caption thì trình sửa dùng để vẽ bản xem trước.
 */
export function PhotobookTemplatesPage() {
  const [items, setItems] = useState<PhotobookTemplateRow[]>([]);
  const [editing, setEditing] = useState<PhotobookTemplateRow | null | undefined>(undefined);
  const [message, setMessage] = useState<string | null>(null);

  async function load() {
    try {
      setItems(await fetchPhotobookTemplatesForManagement());
    } catch (e) {
      setMessage(errorText(e));
    }
  }

  useEffect(() => { void load(); }, []);

  return <>
    <header className="catalog-header">
      <div>
        <p className="eyebrow">PHOTOBOOK</p>
        <h2>Chủ đề photobook</h2>
        <p>Chu kỳ bố cục, màu nền và caption dựng sẵn cho từng chủ đề khách chọn ở trang sản phẩm.</p>
      </div>
      <button className="primary-button compact" onClick={() => setEditing(null)}>+ Thêm chủ đề</button>
    </header>
    {message && <p className="catalog-message">{message}</p>}
    <Panel>
      <table className="data-table">
        <thead><tr><th>Chủ đề</th><th>Chu kỳ bố cục</th><th>Màu nền</th><th>Trạng thái</th><th /></tr></thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id}>
              <td>
                <strong>{item.icon ? `${item.icon} ` : ''}{item.name}</strong>
                <small>{item.code}{item.defaultTemplate ? ' · mặc định' : ''}</small>
              </td>
              <td>{item.layoutCycle.length} bố cục<small>{item.layoutCycle.slice(0, 4).join(' · ')}{item.layoutCycle.length > 4 ? '…' : ''}</small></td>
              <td>
                <span style={{ display: 'inline-flex', gap: 3 }}>
                  {item.spreadColors.slice(0, 5).map((color, i) => (
                    <span key={i} title={color} style={{ width: 16, height: 16, borderRadius: 3, background: color, border: '1px solid rgba(0,0,0,.2)' }} />
                  ))}
                </span>
              </td>
              <td><span className={`status status--${item.active ? 'active' : 'archived'}`}>{item.active ? 'Đang dùng' : 'Đã ẩn'}</span></td>
              <td className="table-actions"><button onClick={() => setEditing(item)}>Sửa</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </Panel>
    {editing !== undefined && (
      <TemplateForm
        item={editing}
        onClose={() => setEditing(undefined)}
        onSaved={() => { setEditing(undefined); setMessage('Đã lưu chủ đề.'); void load(); }}
      />
    )}
  </>;
}

const EMPTY_CAPTION: PresetCaption = {
  spreadIndex: 0, text: '', fontSize: 6, fontFamily: 'Archivo', color: '#1a1a1a', align: 'center',
};

function TemplateForm({ item, onClose, onSaved }: {
  item: PhotobookTemplateRow | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [code, setCode] = useState(item?.code ?? '');
  const [name, setName] = useState(item?.name ?? '');
  const [description, setDescription] = useState(item?.description ?? '');
  const [icon, setIcon] = useState(item?.icon ?? '');
  const [defaultFont, setDefaultFont] = useState(item?.defaultFont ?? 'Archivo');
  const [defaultCaptionColor, setDefaultCaptionColor] = useState(item?.defaultCaptionColor ?? '#1a1a1a');
  const [layoutCycle, setLayoutCycle] = useState<string[]>(item?.layoutCycle ?? []);
  const [spreadColors, setSpreadColors] = useState<string[]>(item?.spreadColors ?? ['#ffffff']);
  const [presetCaptions, setPresetCaptions] = useState<PresetCaption[]>(item?.presetCaptions ?? []);
  const [defaultTemplate, setDefaultTemplate] = useState(item?.defaultTemplate ?? false);
  const [active, setActive] = useState(item?.active ?? true);
  const [sortOrder, setSortOrder] = useState(String(item?.sortOrder ?? 0));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function editCaption(index: number, patch: Partial<PresetCaption>) {
    setPresetCaptions((prev) => prev.map((c, i) => (i === index ? { ...c, ...patch } : c)));
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (layoutCycle.length === 0) { setError('Chọn ít nhất một bố cục cho chu kỳ.'); return; }
    if (spreadColors.length === 0) { setError('Cần ít nhất một màu nền.'); return; }
    setBusy(true);
    setError(null);
    const payload: SavePhotobookTemplateInput = {
      code: code.trim(), name: name.trim(), description: description.trim() || null,
      icon: icon.trim() || null, layoutCycle, spreadColors, presetCaptions,
      defaultFont: defaultFont.trim(), defaultCaptionColor, defaultTemplate, active,
      sortOrder: Number(sortOrder) || 0,
    };
    try {
      if (item) await updatePhotobookTemplate(item.id, payload);
      else await createPhotobookTemplate(payload);
      onSaved();
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title={item ? `Sửa chủ đề ${item.name}` : 'Thêm chủ đề'} onClose={onClose} wide>
      <form className="admin-form" onSubmit={(e) => void submit(e)}>
        <div className="form-grid">
          <label>Mã
            {/* Mã đã bán không đổi được: dòng đơn và project chụp lại mã chứ không giữ khoá ngoại. */}
            <input value={code} onChange={(e) => setCode(e.target.value)} disabled={Boolean(item)}
              placeholder="vd: wedding" required />
          </label>
          <label>Tên<input value={name} onChange={(e) => setName(e.target.value)} required /></label>
          <label>Biểu tượng<input value={icon} onChange={(e) => setIcon(e.target.value)} placeholder="💒" /></label>
          <label>Thứ tự hiển thị
            <input type="number" min="0" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} />
          </label>
          <label>Font mặc định
            <input value={defaultFont} onChange={(e) => setDefaultFont(e.target.value)} required />
          </label>
          <label>Màu chữ mặc định
            <input type="color" value={defaultCaptionColor} onChange={(e) => setDefaultCaptionColor(e.target.value)} />
          </label>
        </div>

        <label>Mô tả
          <textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
        </label>

        <fieldset>
          <legend>Chu kỳ bố cục ({layoutCycle.length})</legend>
          <p className="form-hint">
            Thứ tự này là thứ tự spread khi xưởng dựng cuốn; hết chu kỳ thì quay lại từ đầu.
          </p>
          <ol className="template-cycle">
            {layoutCycle.map((entry, index) => (
              <li key={index}>
                <span>{index + 1}</span>
                <select value={entry} onChange={(e) => setLayoutCycle((prev) => prev.map((c, i) => (i === index ? e.target.value : c)))}>
                  {SPREAD_LAYOUTS.map((layout) => (
                    <option key={layout.code} value={layout.code}>{layout.name} ({layout.slots.length} ô)</option>
                  ))}
                </select>
                <button type="button" className="icon-button" aria-label={`Xoá vị trí ${index + 1}`}
                  onClick={() => setLayoutCycle((prev) => prev.filter((_, i) => i !== index))}>×</button>
              </li>
            ))}
          </ol>
          <button type="button" className="ghost-button"
            onClick={() => setLayoutCycle((prev) => [...prev, SPREAD_LAYOUTS[0].code])}>+ Thêm bố cục</button>
        </fieldset>

        <fieldset>
          <legend>Màu nền spread ({spreadColors.length})</legend>
          <p className="form-hint">Xoay vòng theo spread, giống chu kỳ bố cục.</p>
          <div className="template-colors">
            {spreadColors.map((color, index) => (
              <span key={index}>
                <input type="color" value={color} aria-label={`Màu nền ${index + 1}`}
                  onChange={(e) => setSpreadColors((prev) => prev.map((c, i) => (i === index ? e.target.value : c)))} />
                <button type="button" className="icon-button" aria-label={`Xoá màu ${index + 1}`}
                  onClick={() => setSpreadColors((prev) => prev.filter((_, i) => i !== index))}>×</button>
              </span>
            ))}
            <button type="button" className="ghost-button"
              onClick={() => setSpreadColors((prev) => [...prev, '#ffffff'])}>+ Thêm màu</button>
          </div>
        </fieldset>

        <fieldset>
          <legend>Caption dựng sẵn ({presetCaptions.length})</legend>
          <p className="form-hint">Chữ đặt sẵn khi khách mở chủ đề, đánh số spread từ 0.</p>
          {presetCaptions.map((caption, index) => (
            <div className="form-grid" key={index}>
              <label>Spread
                <input type="number" min="0" value={caption.spreadIndex}
                  onChange={(e) => editCaption(index, { spreadIndex: Number(e.target.value) || 0 })} />
              </label>
              <label>Nội dung
                <input value={caption.text} onChange={(e) => editCaption(index, { text: e.target.value })} required />
              </label>
              <label>Cỡ chữ
                <input type="number" min="0.5" max="40" step="0.5" value={caption.fontSize}
                  onChange={(e) => editCaption(index, { fontSize: Number(e.target.value) || 6 })} />
              </label>
              <label>Font
                <input value={caption.fontFamily} onChange={(e) => editCaption(index, { fontFamily: e.target.value })} required />
              </label>
              <label>Màu
                <input type="color" value={caption.color} onChange={(e) => editCaption(index, { color: e.target.value })} />
              </label>
              <label>Canh
                <select value={caption.align} onChange={(e) => editCaption(index, { align: e.target.value as PresetCaption['align'] })}>
                  <option value="left">Trái</option><option value="center">Giữa</option><option value="right">Phải</option>
                </select>
              </label>
              <button type="button" className="ghost-button"
                onClick={() => setPresetCaptions((prev) => prev.filter((_, i) => i !== index))}>Xoá caption</button>
            </div>
          ))}
          <button type="button" className="ghost-button"
            onClick={() => setPresetCaptions((prev) => [...prev, { ...EMPTY_CAPTION, fontFamily: defaultFont, color: defaultCaptionColor }])}>
            + Thêm caption
          </button>
        </fieldset>

        <div className="form-grid">
          <label className="check-label">
            <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
            Hiện cho khách chọn
          </label>
          <label className="check-label">
            <input type="checkbox" checked={defaultTemplate} onChange={(e) => setDefaultTemplate(e.target.checked)} />
            Dùng làm chủ đề mặc định
          </label>
        </div>
        <p className="form-hint">
          Chủ đề mặc định là chu kỳ áp dụng cho cuốn khách mua mà không chọn chủ đề nào, nên
          không ẩn được và luôn phải có đúng một chủ đề giữ vai trò này.
        </p>

        {error && <p className="form-error">{error}</p>}
        <footer>
          <button type="button" className="ghost-button" onClick={onClose}>Hủy</button>
          <button className="primary-button compact" disabled={busy}>{busy ? 'Đang lưu…' : 'Lưu chủ đề'}</button>
        </footer>
      </form>
    </Modal>
  );
}
