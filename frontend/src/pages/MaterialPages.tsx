import { useEffect, useState, type FormEvent } from "react";
import { apiRequest } from "../api/http";
import { Modal } from "../components/admin/Modal";
import { Panel } from "../components/admin/Panel";

type Scope = "ARTWORK_SURFACE" | "FRAME";
type Material = { id: string; code: string; name: string; scope: Scope; status: "ACTIVE" | "ARCHIVED"; description: string | null };
const errorText = (error: unknown) => error instanceof Error ? error.message : "Đã có lỗi xảy ra.";

export function MaterialsPage() {
  const [scope, setScope] = useState<Scope>("ARTWORK_SURFACE");
  const [items, setItems] = useState<Material[]>([]);
  const [editing, setEditing] = useState<Material | null | undefined>(undefined);
  const [message, setMessage] = useState<string | null>(null);
  async function load() { try { setItems(await apiRequest<Material[]>(`/materials/management?scope=${scope}`)); } catch (error) { setMessage(errorText(error)); } }
  useEffect(() => { void load(); }, [scope]);
  return <>
    <header className="catalog-header"><div><p className="eyebrow">CATALOG</p><h2>Chất liệu</h2><p>Chuẩn hóa chất liệu để variant, bộ lọc và báo cáo luôn dùng cùng một dữ liệu.</p></div><button className="primary-button compact" onClick={() => setEditing(null)}>+ Thêm chất liệu</button></header>
    {message && <p className="catalog-message">{message}</p>}
    <div className="detail-tabs"><button className={scope === "ARTWORK_SURFACE" ? "is-active" : ""} onClick={() => setScope("ARTWORK_SURFACE")}>Bề mặt tranh</button><button className={scope === "FRAME" ? "is-active" : ""} onClick={() => setScope("FRAME")}>Chất liệu khung</button></div>
    <Panel><table className="data-table"><thead><tr><th>Tên</th><th>Mã</th><th>Trạng thái</th><th /></tr></thead><tbody>{items.map((item) => <tr key={item.id}><td><strong>{item.name}</strong><small>{item.description || "—"}</small></td><td><code>{item.code}</code></td><td><span className={`status status--${item.status.toLowerCase()}`}>{item.status === "ACTIVE" ? "Đang dùng" : "Đã lưu trữ"}</span></td><td className="table-actions"><button onClick={() => setEditing(item)}>Sửa</button></td></tr>)}</tbody></table>{items.length === 0 && <p className="empty-state">Chưa có chất liệu trong nhóm này.</p>}</Panel>
    {editing !== undefined && <MaterialForm item={editing} scope={scope} onClose={() => setEditing(undefined)} onSaved={() => { setEditing(undefined); setMessage("Đã lưu chất liệu."); void load(); }} />}
  </>;
}

function MaterialForm({ item, scope, onClose, onSaved }: { item: Material | null; scope: Scope; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({ code: item?.code ?? "", name: item?.name ?? "", status: item?.status ?? "ACTIVE", description: item?.description ?? "" });
  const [error, setError] = useState<string | null>(null); const [busy, setBusy] = useState(false);
  const change = (key: keyof typeof form, value: string) => setForm({ ...form, [key]: value });
  async function submit(event: FormEvent) { event.preventDefault(); setBusy(true); setError(null); try { await apiRequest(item ? `/materials/${item.id}` : "/materials", { method: item ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, scope, description: form.description || null }) }); onSaved(); } catch (cause) { setError(errorText(cause)); } finally { setBusy(false); } }
  return <Modal title={item ? "Sửa chất liệu" : "Thêm chất liệu"} onClose={onClose}><form className="admin-form" onSubmit={(event) => void submit(event)}><div className="form-grid"><label>Mã<input value={form.code} onChange={(event) => change("code", event.target.value)} placeholder="VD: CANVAS" required /></label><label>Tên<input value={form.name} onChange={(event) => change("name", event.target.value)} placeholder="VD: Canvas" required /></label>{item && <label>Trạng thái<select value={form.status} onChange={(event) => change("status", event.target.value)}><option value="ACTIVE">Đang dùng</option><option value="ARCHIVED">Lưu trữ</option></select></label>}</div><label>Mô tả<textarea value={form.description} onChange={(event) => change("description", event.target.value)} /></label>{error && <p className="form-error">{error}</p>}<footer><button type="button" className="ghost-button" onClick={onClose}>Hủy</button><button className="primary-button compact" disabled={busy}>{busy ? "Đang lưu…" : "Lưu chất liệu"}</button></footer></form></Modal>;
}
