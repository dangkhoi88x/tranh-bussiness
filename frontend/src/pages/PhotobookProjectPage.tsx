import { useCallback, useEffect, useRef, useState, type ChangeEvent } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { ApiRequestError } from '../api/http';
import {
  decidePhotobookProof,
  deletePhotobookPhoto,
  fetchMyPhotobookProject,
  submitPhotobookPhotos,
  uploadPhotobookPhoto,
  PHOTOBOOK_STATUS_LABEL,
  type PhotobookProject,
  type PhotobookProof,
} from '../api/photobookProjects';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../hooks/useCart';
import { useDocumentMeta } from '../hooks/useDocumentMeta';
import { STORE_LABEL_STYLE, StoreNotice, StoreShell } from '../components/StoreShell';
import { compressPhotobookPhoto } from '../data/imageCompression';
import '../styles/ds.css';
import '../styles/public.css';

const dateTime = new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium', timeStyle: 'short' });

/** Cùng danh sách backend chấp nhận (CloudinaryMediaStorageService.SUPPORTED_CONTENT_TYPES). */
const ACCEPT = 'image/jpeg,image/png,image/webp';

function formatFileSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function PhotobookProjectPage() {
  const { projectId = '' } = useParams();
  const location = useLocation();
  const { session, isLoading: authLoading } = useAuth();
  const { count: cartCount } = useCart();
  const fileInput = useRef<HTMLInputElement>(null);

  const [project, setProject] = useState<PhotobookProject | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [busyPhotoId, setBusyPhotoId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [revisionNote, setRevisionNote] = useState('');
  const [deciding, setDeciding] = useState(false);
  // Upload chạy tuần tự nên hiện được tiến độ thật thay vì một spinner mù.
  const [uploading, setUploading] = useState<{
    done: number;
    total: number;
    stage: 'compressing' | 'uploading';
  } | null>(null);
  const [compressionSummary, setCompressionSummary] = useState<{
    originalBytes: number;
    compressedBytes: number;
  } | null>(null);

  const load = useCallback(async () => {
    if (!session) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError(null);
    try {
      const found = await fetchMyPhotobookProject(projectId);
      setProject(found);
      setNote(found.customerNote ?? '');
    } catch (cause) {
      setLoadError(cause instanceof Error ? cause.message : 'Không mở được cuốn photobook này.');
    } finally {
      setLoading(false);
    }
  }, [projectId, session?.userId]);

  useEffect(() => {
    void load();
  }, [load]);

  useDocumentMeta({
    title: project ? `Ảnh cho ${project.productName} | Bubble Memories` : 'Gửi ảnh photobook | Bubble Memories',
    description: 'Gửi ảnh gốc để xưởng lên layout cho cuốn photobook của bạn.',
    canonicalUrl: `${window.location.origin}/photobook-cua-toi/${projectId}`,
    robots: 'noindex, nofollow',
  });

  async function onPick(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = '';
    if (files.length === 0 || !project) return;

    setError(null);
    setCompressionSummary(null);
    const room = project.maxPhotos - project.photoCount;
    const batch = files.slice(0, Math.max(room, 0));
    if (batch.length === 0) {
      setError(`Cuốn này đã đủ ${project.maxPhotos} ảnh.`);
      return;
    }

    setUploading({ done: 0, total: batch.length, stage: 'compressing' });
    let latest = project;
    let originalBytes = 0;
    let compressedBytes = 0;
    for (const [index, file] of batch.entries()) {
      try {
        setUploading({ done: index, total: batch.length, stage: 'compressing' });
        const compressed = await compressPhotobookPhoto(file);
        originalBytes += compressed.originalBytes;
        compressedBytes += compressed.compressedBytes;
        setUploading({ done: index, total: batch.length, stage: 'uploading' });
        latest = await uploadPhotobookPhoto(project.id, compressed.file);
        setProject(latest);
        setUploading({ done: index + 1, total: batch.length, stage: 'uploading' });
      } catch (cause) {
        // Dừng ở ảnh hỏng thay vì chạy tiếp im lặng — thường là sai định dạng hoặc quá nặng.
        setError(`${file.name}: ${cause instanceof ApiRequestError ? cause.message : 'không tải lên được'}`);
        break;
      }
    }
    setUploading(null);
    if (originalBytes > 0) setCompressionSummary({ originalBytes, compressedBytes });
    if (files.length > batch.length) {
      setError(`Chỉ nhận thêm ${batch.length} ảnh; cuốn này tối đa ${project.maxPhotos} ảnh.`);
    }
  }

  async function removePhoto(photoId: string) {
    if (!project) return;
    setBusyPhotoId(photoId);
    setError(null);
    try {
      setProject(await deletePhotobookPhoto(project.id, photoId));
    } catch (cause) {
      setError(cause instanceof ApiRequestError ? cause.message : 'Không xoá được ảnh.');
    } finally {
      setBusyPhotoId(null);
    }
  }

  async function decide(approved: boolean) {
    if (!project) return;
    setDeciding(true);
    setError(null);
    try {
      setProject(await decidePhotobookProof(project.id, approved, revisionNote));
      setRevisionNote('');
    } catch (cause) {
      setError(cause instanceof ApiRequestError ? cause.message : 'Không gửi được quyết định.');
    } finally {
      setDeciding(false);
    }
  }

  async function submit() {
    if (!project) return;
    setSubmitting(true);
    setError(null);
    try {
      setProject(await submitPhotobookPhotos(project.id, note));
    } catch (cause) {
      setError(cause instanceof ApiRequestError ? cause.message : 'Không gửi được bộ ảnh.');
    } finally {
      setSubmitting(false);
    }
  }

  if (!session && !authLoading) {
    return (
      <StoreShell cartCount={cartCount}>
        <StoreNotice
          title="Đăng nhập để gửi ảnh"
          body="Ảnh gốc của bạn được lưu riêng theo tài khoản."
          action={
            <Link className="btn btn-primary" to="/auth" state={{ from: location }}>
              Đăng nhập
            </Link>
          }
        />
      </StoreShell>
    );
  }

  if (loading || !project) {
    return (
      <StoreShell cartCount={cartCount}>
        <StoreNotice
          title={loadError ? 'Không mở được cuốn photobook này' : 'Đang tải…'}
          body={loadError ?? ''}
          action={
            loadError ? (
              <Link className="btn btn-secondary" to="/don-hang-cua-toi">
                Về đơn hàng
              </Link>
            ) : undefined
          }
        />
      </StoreShell>
    );
  }

  const { photoCount, recommendedPhotosMin, recommendedPhotosMax, maxPhotos } = project;
  const enough = photoCount >= recommendedPhotosMin;
  const progress = Math.min(100, Math.round((photoCount / recommendedPhotosMin) * 100));

  return (
    <StoreShell cartCount={cartCount}>
      <nav
        aria-label="Breadcrumb"
        data-breadcrumb=""
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-3)',
          minHeight: 46,
          padding: '0 var(--space-8)',
          borderBottom: '2px solid var(--color-divider)',
          fontSize: 11,
          letterSpacing: '.16em',
          textTransform: 'uppercase',
          color: 'var(--color-neutral-700)',
        }}
      >
        <Link to="/" style={{ color: 'var(--color-neutral-700)', textDecoration: 'none' }}>
          Trang chủ
        </Link>
        <span aria-hidden="true">/</span>
        <Link to="/don-hang-cua-toi" style={{ color: 'var(--color-neutral-700)', textDecoration: 'none' }}>
          Đơn hàng
        </Link>
        <span aria-hidden="true">/</span>
        <span style={{ color: 'var(--color-text)' }}>Ảnh photobook</span>
      </nav>

      <section
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          gap: 'var(--space-4)',
          padding: 'var(--space-8) var(--space-8) var(--space-6)',
        }}
      >
        <div>
          <h1
            style={{
              margin: 0,
              fontFamily: 'var(--font-heading)',
              fontWeight: 800,
              fontSize: 'clamp(28px, 4vw, 36px)',
              lineHeight: 1.02,
              letterSpacing: '-.03em',
            }}
          >
            Gửi ảnh cho cuốn của bạn
          </h1>
          <p style={{ margin: 'var(--space-2) 0 0', fontSize: 14, color: 'var(--color-neutral-800)' }}>
            {project.productName}
            {project.variantName ? ` · ${project.variantName}` : ''} · {project.pageCount} trang · đơn{' '}
            {project.orderCode}
          </p>
        </div>
        <span style={STORE_LABEL_STYLE}>{PHOTOBOOK_STATUS_LABEL[project.status]}</span>
      </section>

      {/*
        Storyboard chỉ tồn tại từ lúc submit() sinh spread, nên chưa có gì để mở khi còn
        AWAITING_PHOTOS. Bản sắp xếp (khác với project.editable — cái đó nói về DANH SÁCH ẢNH,
        chỉ mở trong lúc AWAITING_PHOTOS) chỉ sửa được đúng lúc status là PHOTOS_SUBMITTED.
      */}
      {project.status !== 'AWAITING_PHOTOS' && (
        <section style={{ padding: '0 var(--space-8) var(--space-6)' }}>
          <Link to={`/photobook-cua-toi/${project.id}/sap-xep`} className="btn btn-primary">
            {project.status === 'PHOTOS_SUBMITTED' ? 'Sắp xếp ảnh vào cuốn sách →' : 'Xem bản sắp xếp →'}
          </Link>
        </section>
      )}

      {/* Tiến độ: mốc là số ảnh tối thiểu cho số trang đã chọn. */}
      <section style={{ padding: '0 var(--space-8) var(--space-6)' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            justifyContent: 'space-between',
            gap: 'var(--space-4)',
            marginBottom: 'var(--space-2)',
          }}
        >
          <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: 20 }}>
            Đã gửi {photoCount} / {recommendedPhotosMin}–{recommendedPhotosMax} ảnh
          </span>
          <span style={STORE_LABEL_STYLE}>
            {enough ? 'Đủ để lên layout' : `Còn thiếu ${recommendedPhotosMin - photoCount} ảnh`}
          </span>
        </div>
        <div style={{ height: 10, background: 'var(--color-neutral-200)', border: '2px solid var(--color-text)' }}>
          <div
            style={{
              width: `${progress}%`,
              height: '100%',
              background: enough ? 'var(--color-text)' : 'var(--color-accent)',
              transition: 'width .25s linear',
            }}
          />
        </div>
        <p style={{ margin: 'var(--space-3) 0 0', fontSize: 13, lineHeight: 1.55, color: 'var(--color-neutral-800)' }}>
          Cuốn {project.pageCount} trang cần khoảng {recommendedPhotosMin}–{recommendedPhotosMax} ảnh. Gửi dư cũng được,
          xưởng sẽ chọn và bố cục giúp — tối đa {maxPhotos} ảnh.
        </p>
      </section>

      {project.editable ? (
        <section
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: 'var(--space-3)',
            padding: '0 var(--space-8) var(--space-6)',
          }}
        >
          <input ref={fileInput} type="file" accept={ACCEPT} multiple hidden onChange={(event) => void onPick(event)} />
          <button
            type="button"
            className="btn btn-primary"
            disabled={uploading !== null}
            onClick={() => fileInput.current?.click()}
          >
            {uploading
              ? uploading.stage === 'compressing'
                ? `Đang tối ưu ${Math.min(uploading.done + 1, uploading.total)}/${uploading.total}…`
                : `Đang tải ${uploading.done}/${uploading.total}…`
              : '+ Chọn ảnh từ máy'}
          </button>
          <span style={{ fontSize: 12, color: 'var(--color-neutral-700)' }}>
            JPEG, PNG hoặc WebP · tự tối ưu cạnh dài 2.000px
          </span>
          {compressionSummary && (
            <span role="status" style={{ fontSize: 12, color: 'var(--color-accent-700)' }}>
              Đã tối ưu {formatFileSize(compressionSummary.originalBytes)} →{' '}
              {formatFileSize(compressionSummary.compressedBytes)}
              {compressionSummary.compressedBytes < compressionSummary.originalBytes
                ? ` (giảm ${Math.round((1 - compressionSummary.compressedBytes / compressionSummary.originalBytes) * 100)}%)`
                : ''}
            </span>
          )}
        </section>
      ) : (
        <section style={{ padding: '0 var(--space-8) var(--space-6)' }}>
          <p
            style={{
              margin: 0,
              padding: 'var(--space-4)',
              border: '2px solid var(--color-text)',
              fontSize: 14,
              lineHeight: 1.6,
            }}
          >
            Bạn đã gửi bộ ảnh này cho xưởng
            {project.submittedAt ? ` lúc ${dateTime.format(new Date(project.submittedAt))}` : ''}. Xưởng sẽ lên layout
            và gửi bản mềm để bạn duyệt trước khi in.
            {project.customerNote && (
              <>
                <br />
                <strong>Ghi chú của bạn:</strong> {project.customerNote}
              </>
            )}
          </p>
        </section>
      )}

      {error && (
        <p
          role="status"
          style={{
            margin: '0 var(--space-8) var(--space-4)',
            fontSize: 13,
            color: 'var(--color-accent-700)',
          }}
        >
          {error}
        </p>
      )}

      {project.proofs.length > 0 && (
        <ProofSection
          project={project}
          note={revisionNote}
          onNote={setRevisionNote}
          busy={deciding}
          onDecide={(approved) => void decide(approved)}
        />
      )}

      {photoCount === 0 ? (
        <StoreNotice title="Chưa có ảnh nào" body="Chọn ảnh từ máy để bắt đầu. Bạn có thể gửi làm nhiều lần." />
      ) : (
        <section
          data-grid="cols"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
            gap: 2,
            padding: '0 var(--space-8) var(--space-8)',
          }}
        >
          {project.photos.map((photo) => (
            <figure
              key={photo.id}
              style={{
                position: 'relative',
                margin: 0,
                aspectRatio: '1/1',
                border: '2px solid var(--color-text)',
                overflow: 'hidden',
              }}
            >
              <img
                src={photo.url}
                alt={photo.originalFilename ?? 'Ảnh đã gửi'}
                loading="lazy"
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              />
              {project.editable && (
                <button
                  type="button"
                  aria-label={`Xoá ${photo.originalFilename ?? 'ảnh'}`}
                  disabled={busyPhotoId === photo.id}
                  onClick={() => void removePhoto(photo.id)}
                  style={{
                    position: 'absolute',
                    top: 0,
                    right: 0,
                    appearance: 'none',
                    width: 28,
                    height: 28,
                    border: 0,
                    background: 'var(--color-text)',
                    color: 'var(--color-bg)',
                    font: 'inherit',
                    fontSize: 14,
                    lineHeight: 1,
                    cursor: busyPhotoId === photo.id ? 'not-allowed' : 'pointer',
                    opacity: busyPhotoId === photo.id ? 0.5 : 1,
                  }}
                >
                  ×
                </button>
              )}
            </figure>
          ))}
        </section>
      )}

      {project.editable && (
        <section
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-3)',
            padding: 'var(--space-6) var(--space-8) var(--space-8)',
            borderTop: '2px solid var(--color-text)',
          }}
        >
          <label htmlFor="note" style={STORE_LABEL_STYLE}>
            Ghi chú cho xưởng (tuỳ chọn)
          </label>
          <textarea
            id="note"
            className="input"
            rows={3}
            maxLength={2000}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Ví dụ: xếp theo thứ tự thời gian, ảnh cưới để lên bìa."
          />
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 'var(--space-3)' }}>
            <button
              type="button"
              className="btn btn-primary"
              disabled={!enough || submitting || uploading !== null}
              onClick={() => void submit()}
            >
              {submitting ? 'Đang gửi…' : 'Gửi bộ ảnh cho xưởng'}
            </button>
            {!enough && (
              <span style={{ fontSize: 13, color: 'var(--color-neutral-700)' }}>
                Cần ít nhất {recommendedPhotosMin} ảnh mới gửi được.
              </span>
            )}
          </div>
          <p style={{ margin: 0, fontSize: 12, color: 'var(--color-neutral-700)' }}>
            Sau khi gửi, bộ ảnh sẽ khoá lại để xưởng lên layout.
          </p>
        </section>
      )}
    </StoreShell>
  );
}

/**
 * Bản mềm xưởng gửi và quyết định của khách. Lịch sử giữ đủ các bản để hai bên đối chiếu
 * đã sửa những gì; chỉ bản mới nhất mới có nút bấm.
 */
function ProofSection({
  project,
  note,
  onNote,
  busy,
  onDecide,
}: {
  project: PhotobookProject;
  note: string;
  onNote: (value: string) => void;
  busy: boolean;
  onDecide: (approved: boolean) => void;
}) {
  const latest: PhotobookProof = project.proofs[project.proofs.length - 1];
  const remaining = project.maxRevisions - project.revisionCount;

  return (
    <section
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-4)',
        margin: '0 var(--space-8) var(--space-8)',
        padding: 'var(--space-6)',
        border: '2px solid var(--color-text)',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          gap: 'var(--space-3)',
        }}
      >
        <h2 style={{ margin: 0, fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: 20 }}>
          Bản mềm lần {latest.revision}
        </h2>
        <span style={STORE_LABEL_STYLE}>
          {project.revisionCount}/{project.maxRevisions} lần sửa đã dùng
        </span>
      </div>

      <SpreadViewer proof={latest} />

      {latest.staffNote && (
        <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6 }}>
          <strong>Xưởng ghi chú:</strong> {latest.staffNote}
        </p>
      )}

      {project.awaitingDecision ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          <label htmlFor="revision-note" style={STORE_LABEL_STYLE}>
            Muốn sửa gì? (bắt buộc nếu yêu cầu sửa)
          </label>
          <textarea
            id="revision-note"
            className="input"
            rows={3}
            maxLength={2000}
            value={note}
            onChange={(event) => onNote(event.target.value)}
            placeholder="Ví dụ: đổi ảnh bìa sang tấm ở biển, trang 4 xếp lại cho thoáng."
          />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-3)', alignItems: 'center' }}>
            <button type="button" className="btn btn-primary" disabled={busy} onClick={() => onDecide(true)}>
              {busy ? 'Đang gửi…' : 'Duyệt, cho in'}
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              disabled={busy || remaining <= 0}
              onClick={() => onDecide(false)}
            >
              Yêu cầu sửa
            </button>
            <span style={{ fontSize: 13, color: 'var(--color-neutral-700)' }}>
              {remaining > 0
                ? `Còn ${remaining} lần sửa miễn phí.`
                : 'Đã dùng hết lượt sửa miễn phí — liên hệ xưởng nếu vẫn cần chỉnh.'}
            </span>
          </div>
        </div>
      ) : (
        <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: 'var(--color-neutral-800)' }}>
          {latest.decision === 'APPROVED'
            ? 'Bạn đã duyệt bản này. Xưởng đang in cuốn sách của bạn.'
            : 'Xưởng đang chỉnh theo góp ý của bạn và sẽ gửi bản mới.'}
        </p>
      )}

      {project.proofs.length > 1 && (
        <details>
          <summary style={{ ...STORE_LABEL_STYLE, cursor: 'pointer' }}>
            Các bản trước ({project.proofs.length - 1})
          </summary>
          <ul style={{ margin: 'var(--space-3) 0 0', paddingLeft: 'var(--space-6)', fontSize: 13, lineHeight: 1.7 }}>
            {project.proofs.slice(0, -1).map((proof) => (
              <li key={proof.id}>
                <a href={proof.url} target="_blank" rel="noreferrer">
                  Bản {proof.revision}
                </a>
                {proof.customerNote ? ` — bạn yêu cầu: ${proof.customerNote}` : ''}
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}

/**
 * Lật từng spread của bản mềm. Bản mềm là PDF nhiều trang, mỗi trang một spread (hai trang
 * sách mở cạnh nhau) — backend đã render sẵn thành ảnh nên khách xem ngay, không phải tải file.
 */
function SpreadViewer({ proof }: { proof: PhotobookProof }) {
  const [index, setIndex] = useState(0);
  const pages = proof.pageUrls.length > 0 ? proof.pageUrls : [proof.url];
  // Đổi sang bản mềm khác thì quay lại spread đầu.
  useEffect(() => {
    setIndex(0);
  }, [proof.id]);

  const at = Math.min(index, pages.length - 1);
  const single = pages.length === 1;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
      {/* Tỉ lệ 2/1: một spread là hai trang cạnh nhau, nên rộng gấp đôi một trang. */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          aspectRatio: single ? undefined : '2 / 1',
          background: 'var(--color-neutral-200)',
          border: '2px solid var(--color-divider)',
        }}
      >
        <img
          src={pages[at]}
          alt={`Bản mềm lần ${proof.revision}, spread ${at + 1}`}
          style={{
            width: '100%',
            height: single ? 'auto' : '100%',
            objectFit: 'contain',
            display: 'block',
          }}
        />
        {!single && (
          <span
            aria-hidden="true"
            style={{
              position: 'absolute',
              top: 0,
              bottom: 0,
              left: '50%',
              width: 2,
              background: 'var(--color-divider)',
              opacity: 0.6,
            }}
          />
        )}
      </div>

      {!single && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-3)' }}>
          <button
            type="button"
            className="btn btn-secondary"
            disabled={at <= 0}
            onClick={() => setIndex((value) => Math.max(0, value - 1))}
          >
            ← Spread trước
          </button>
          <span style={STORE_LABEL_STYLE}>
            Spread {at + 1} / {pages.length}
          </span>
          <button
            type="button"
            className="btn btn-secondary"
            disabled={at >= pages.length - 1}
            onClick={() => setIndex((value) => Math.min(pages.length - 1, value + 1))}
          >
            Spread sau →
          </button>
        </div>
      )}

      <a href={proof.url} target="_blank" rel="noreferrer" style={{ fontSize: 13 }}>
        Tải file gốc để xem kỹ hơn
      </a>
    </div>
  );
}
