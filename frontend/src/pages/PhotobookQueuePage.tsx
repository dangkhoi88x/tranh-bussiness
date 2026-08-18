import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiRequestError } from '../api/http';
import {
  fetchPhotobookQueue,
  uploadPhotobookProof,
  PROOF_ACCEPT,
  PHOTOBOOK_STATUS_LABEL,
  type PhotobookProject,
  type PhotobookProjectStatus,
} from '../api/photobookProjects';
import type { Page } from '../types/api';

const dateTime = new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' });
const PAGE_SIZE = 20;

/**
 * Bộ lọc mặc định là hàng đợi việc thật của xưởng: cuốn khách vừa chốt ảnh và cuốn khách
 * xin sửa. Hai nhóm đó mới cần người làm; PROOF_SENT là đang chờ khách, APPROVED là xong.
 */
const TABS: { value: PhotobookProjectStatus | ''; label: string }[] = [
  { value: 'PHOTOS_SUBMITTED', label: 'Chờ lên layout' },
  { value: 'REVISION_REQUESTED', label: 'Khách xin sửa' },
  { value: 'PROOF_SENT', label: 'Chờ khách duyệt' },
  { value: 'AWAITING_PHOTOS', label: 'Chờ khách gửi ảnh' },
  { value: 'APPROVED', label: 'Đã duyệt' },
  { value: '', label: 'Tất cả' },
];

export function PhotobookQueuePage() {
  const [tab, setTab] = useState<PhotobookProjectStatus | ''>('PHOTOS_SUBMITTED');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Page<PhotobookProject> | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [open, setOpen] = useState<PhotobookProject | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await fetchPhotobookQueue(tab, page, PAGE_SIZE));
    } catch (cause) {
      setMessage(cause instanceof ApiRequestError ? cause.message : 'Không tải được danh sách photobook.');
    } finally {
      setLoading(false);
    }
  }, [tab, page]);

  useEffect(() => {
    void load();
  }, [load]);
  useEffect(() => {
    setPage(1);
  }, [tab]);

  const items = data?.items ?? [];

  return (
    <>
      <header className="catalog-header">
        <div>
          <p className="eyebrow">PHOTOBOOK</p>
          <h2>Cuốn đang làm</h2>
          <p>Ảnh khách gửi, bản mềm đã duyệt và những cuốn đang chờ tới lượt xưởng.</p>
        </div>
      </header>

      {message && (
        <p className="catalog-message" role="status">
          {message}
        </p>
      )}

      <div className="detail-tabs" role="tablist">
        {TABS.map((item) => (
          <button key={item.label} className={tab === item.value ? 'is-active' : ''} onClick={() => setTab(item.value)}>
            {item.label}
          </button>
        ))}
      </div>

      <section className="catalog-panel">
        {loading && items.length === 0 ? (
          <p>Đang tải…</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Cuốn</th>
                <th>Đơn</th>
                <th>Ảnh</th>
                <th>Sửa</th>
                <th>Trạng thái</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {items.map((project) => (
                <tr key={project.id}>
                  <td>
                    <strong>{project.productName}</strong>
                    <small>{[project.variantName, `${project.pageCount} trang`].filter(Boolean).join(' · ')}</small>
                  </td>
                  <td>
                    <code>{project.orderCode}</code>
                    <small>{dateTime.format(new Date(project.createdAt))}</small>
                  </td>
                  <td>
                    {project.photoCount}
                    <small>
                      cần {project.recommendedPhotosMin}–{project.recommendedPhotosMax}
                    </small>
                  </td>
                  <td>
                    {project.revisionCount}/{project.maxRevisions}
                  </td>
                  <td>{PHOTOBOOK_STATUS_LABEL[project.status]}</td>
                  <td className="table-actions">
                    <button onClick={() => setOpen(project)}>Mở</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {!loading && items.length === 0 && <p className="empty-state">Không có cuốn nào ở nhóm này.</p>}

        {data && data.totalPages > 1 && (
          <div className="upload-row" style={{ justifyContent: 'space-between' }}>
            <button className="ghost-button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              ← Trang trước
            </button>
            <span>
              Trang {data.page} / {data.totalPages}
            </span>
            <button className="ghost-button" disabled={!data.hasNext} onClick={() => setPage((p) => p + 1)}>
              Trang sau →
            </button>
          </div>
        )}
      </section>

      {open && (
        <ProjectDrawer
          project={open}
          onClose={() => setOpen(null)}
          onChanged={(updated) => {
            setOpen(updated);
            void load();
          }}
          onMessage={setMessage}
        />
      )}
    </>
  );
}

function ProjectDrawer({
  project,
  onClose,
  onChanged,
  onMessage,
}: {
  project: PhotobookProject;
  onClose: () => void;
  onChanged: (project: PhotobookProject) => void;
  onMessage: (text: string) => void;
}) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [staffNote, setStaffNote] = useState('');
  const [busy, setBusy] = useState(false);

  // Bản mềm chỉ gửi được khi khách đã chốt ảnh hoặc vừa xin sửa — khớp với backend.
  const canSendProof = project.status === 'PHOTOS_SUBMITTED' || project.status === 'REVISION_REQUESTED';
  // findLast cần lib es2023; tsconfig ở đây thấp hơn nên duyệt ngược bằng tay.
  const pendingRevisionNote = [...project.proofs].reverse().find((proof) => proof.decision === 'REVISION_REQUESTED');

  async function sendProof() {
    const file = fileInput.current?.files?.[0];
    if (!file) {
      onMessage('Chọn file bản mềm trước.');
      return;
    }
    setBusy(true);
    try {
      onChanged(await uploadPhotobookProof(project.id, file, staffNote));
      onMessage('Đã gửi bản mềm cho khách.');
      setStaffNote('');
      if (fileInput.current) fileInput.current.value = '';
    } catch (cause) {
      onMessage(cause instanceof ApiRequestError ? cause.message : 'Không gửi được bản mềm.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="modal-backdrop" role="presentation">
      <section className="modal" role="dialog" aria-modal="true" aria-label="Chi tiết cuốn photobook">
        <header>
          <h3>
            {project.productName} · {project.pageCount} trang
          </h3>
          <button type="button" className="icon-button" aria-label="Đóng" onClick={onClose}>
            ×
          </button>
        </header>

        <div className="admin-form">
          <p>
            Đơn <code>{project.orderCode}</code> · {PHOTOBOOK_STATUS_LABEL[project.status]} · {project.photoCount} ảnh
            (cần {project.recommendedPhotosMin}–{project.recommendedPhotosMax}) · đã sửa {project.revisionCount}/
            {project.maxRevisions}
          </p>

          {project.customerNote && (
            <p>
              <strong>Khách dặn:</strong> {project.customerNote}
            </p>
          )}
          {pendingRevisionNote?.customerNote && (
            <p>
              <strong>Khách xin sửa:</strong> {pendingRevisionNote.customerNote}
            </p>
          )}

          {project.photos.length > 0 && (
            <>
              <label>Ảnh khách gửi ({project.photos.length})</label>
              <div className="image-grid">
                {project.photos.map((photo) => (
                  <a key={photo.id} href={photo.url} target="_blank" rel="noreferrer" className="image-card">
                    <img src={photo.url} alt={photo.originalFilename ?? ''} loading="lazy" />
                  </a>
                ))}
              </div>
            </>
          )}

          {project.proofs.length > 0 && (
            <>
              <label>Bản mềm đã gửi</label>
              <ul>
                {project.proofs.map((proof) => (
                  <li key={proof.id}>
                    <a href={proof.url} target="_blank" rel="noreferrer">
                      Bản {proof.revision} ({proof.pageCount} spread)
                    </a>
                    {' — '}
                    {proof.decision === 'PENDING'
                      ? 'chờ khách'
                      : proof.decision === 'APPROVED'
                        ? 'khách đã duyệt'
                        : `khách xin sửa: ${proof.customerNote}`}
                  </li>
                ))}
              </ul>
            </>
          )}

          {canSendProof ? (
            <>
              <label>
                Gửi bản mềm {project.proofs.length + 1}
                <input ref={fileInput} type="file" accept={PROOF_ACCEPT} />
                <small>PDF nhiều trang — mỗi trang là một spread. Ảnh đơn cũng nhận được.</small>
              </label>
              <label>
                Ghi chú cho khách
                <textarea
                  rows={3}
                  maxLength={2000}
                  value={staffNote}
                  onChange={(event) => setStaffNote(event.target.value)}
                />
              </label>
              <footer>
                <button type="button" className="ghost-button" onClick={onClose}>
                  Đóng
                </button>
                <button
                  type="button"
                  className="primary-button compact"
                  disabled={busy}
                  onClick={() => void sendProof()}
                >
                  {busy ? 'Đang gửi…' : 'Gửi bản mềm'}
                </button>
              </footer>
            </>
          ) : (
            <footer>
              <button type="button" className="ghost-button" onClick={onClose}>
                Đóng
              </button>
            </footer>
          )}
        </div>
      </section>
    </div>
  );
}
