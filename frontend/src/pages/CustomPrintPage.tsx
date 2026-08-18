import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ApiRequestError } from '../api/http';
import { fetchShippingAddresses, type ShippingAddress } from '../api/checkout';
import {
  createCustomOrder,
  decideCustomQuote,
  fetchActiveFrames,
  fetchMyCustomOrders,
  uploadCustomOrderImage,
  type ActiveFrame,
  type CustomOrderRequest,
  type CustomOrderStatus,
  type CustomOrderType,
} from '../api/customOrders';
import { formatPrice } from '../api/storefront';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../hooks/useCart';
import { STORE_LABEL_STYLE, StoreNotice, StoreShell } from '../components/StoreShell';
import '../styles/ds.css';
import '../styles/public.css';

const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
const dateTime = new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium', timeStyle: 'short' });
const TYPE_LABEL: Record<CustomOrderType, string> = {
  FRAME_ONLY: 'Chỉ làm khung',
  PRINT_AND_FRAME: 'In tranh & đóng khung',
  FAMILY_PHOTO: 'Phục chế ảnh gia đình',
};
const STATUS_LABEL: Record<CustomOrderStatus, string> = {
  NEW: 'Chờ báo giá',
  QUOTED: 'Đã có báo giá',
  CONFIRMED: 'Đã xác nhận',
  IN_PRODUCTION: 'Đang thực hiện',
  COMPLETED: 'Hoàn thành',
  CANCELLED: 'Đã từ chối / huỷ',
};

type FormState = {
  type: CustomOrderType;
  widthCm: string;
  heightCm: string;
  material: string;
  frameId: string;
  customerNote: string;
};
const EMPTY_FORM: FormState = {
  type: 'PRINT_AND_FRAME',
  widthCm: '',
  heightCm: '',
  material: 'Canvas',
  frameId: '',
  customerNote: '',
};

function statusColor(status: CustomOrderStatus) {
  if (status === 'COMPLETED') return 'var(--color-success, #18794e)';
  if (status === 'CANCELLED') return 'var(--color-accent-700)';
  if (status === 'QUOTED') return 'var(--color-accent-700)';
  return 'var(--color-text)';
}

function StatusBadge({ status }: { status: CustomOrderStatus }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        width: 'fit-content',
        padding: '5px 8px',
        border: `1px solid ${statusColor(status)}`,
        color: statusColor(status),
        fontSize: 11,
        lineHeight: 1.1,
        fontWeight: 700,
        letterSpacing: '.1em',
        textTransform: 'uppercase',
      }}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}

function Breadcrumb() {
  return (
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
      <span style={{ color: 'var(--color-text)' }}>Đặt in theo yêu cầu</span>
    </nav>
  );
}

function addressLabel(address: ShippingAddress) {
  return `${address.recipientName} · ${address.phone} · ${[address.addressLine, address.ward, address.district, address.province].filter(Boolean).join(', ')}`;
}

export function CustomPrintPage() {
  const { session } = useAuth();
  const location = useLocation();
  const { count } = useCart();
  const uploadInput = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [files, setFiles] = useState<File[]>([]);
  const [frames, setFrames] = useState<ActiveFrame[]>([]);
  const [requests, setRequests] = useState<CustomOrderRequest[]>([]);
  const [addresses, setAddresses] = useState<ShippingAddress[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingError, setLoadingError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formFields, setFormFields] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState<string | null>(null);
  const [quoteAddresses, setQuoteAddresses] = useState<Record<string, string>>({});
  const [decidingId, setDecidingId] = useState<string | null>(null);
  const [decliningId, setDecliningId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    setLoadingError(null);
    const [requestResult, frameResult, addressResult] = await Promise.allSettled([
      fetchMyCustomOrders(),
      fetchActiveFrames(),
      fetchShippingAddresses(),
    ]);
    if (requestResult.status === 'fulfilled') setRequests(requestResult.value.items);
    if (frameResult.status === 'fulfilled') setFrames(frameResult.value);
    if (addressResult.status === 'fulfilled') setAddresses(addressResult.value);
    const failures = [requestResult, frameResult, addressResult].filter((result) => result.status === 'rejected');
    if (failures.length)
      setLoadingError('Không tải được đầy đủ dữ liệu. Bạn vẫn có thể thử lại trước khi gửi yêu cầu.');
    setLoading(false);
  }, [session]);

  useEffect(() => {
    void load();
  }, [load]);
  useEffect(() => {
    const original = document.title;
    document.title = 'Đặt in theo yêu cầu | Bubble Memories';
    return () => {
      document.title = original;
    };
  }, []);

  function updateField<Key extends keyof FormState>(key: Key, value: FormState[Key]) {
    setForm((current) => ({ ...current, [key]: value }));
    setFormFields((current) => {
      const next = { ...current };
      delete next[key];
      return next;
    });
  }

  function selectFiles(selected: FileList | null) {
    if (!selected) return;
    const next = Array.from(selected);
    const invalid = next.find(
      (file) => !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > MAX_IMAGE_SIZE,
    );
    if (invalid) {
      setFormError(`“${invalid.name}” không phải ảnh JPG, PNG, WebP hợp lệ hoặc vượt quá 10 MB.`);
      return;
    }
    setFiles((current) => [...current, ...next]);
    setFormError(null);
    if (uploadInput.current) uploadInput.current.value = '';
  }

  function replaceRequest(updated: CustomOrderRequest) {
    setRequests((current) => current.map((request) => (request.id === updated.id ? updated : request)));
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setFormFields({});
    setNotice(null);
    const width = Number(form.widthCm);
    const height = Number(form.heightCm);
    if (!Number.isFinite(width) || width < 1) {
      setFormFields({ widthCm: 'Nhập chiều rộng từ 1 cm trở lên.' });
      return;
    }
    if (!Number.isFinite(height) || height < 1) {
      setFormFields({ heightCm: 'Nhập chiều cao từ 1 cm trở lên.' });
      return;
    }
    if (!form.material.trim()) {
      setFormFields({ material: 'Nhập chất liệu mong muốn.' });
      return;
    }
    setSubmitting(true);
    try {
      let created = await createCustomOrder({
        type: form.type,
        widthCm: width,
        heightCm: height,
        material: form.material.trim(),
        frameId: form.frameId || undefined,
        customerNote: form.customerNote.trim() || undefined,
      });
      const failures: string[] = [];
      for (const file of files) {
        try {
          created = await uploadCustomOrderImage(created.id, file);
        } catch {
          failures.push(file.name);
        }
      }
      setRequests((current) => [created, ...current]);
      setForm(EMPTY_FORM);
      setFiles([]);
      setNotice(
        failures.length
          ? `Đã tạo ${created.requestCode}, nhưng chưa tải được: ${failures.join(', ')}. Bạn có thể thử lại khi yêu cầu còn chờ báo giá.`
          : `Đã gửi yêu cầu ${created.requestCode}. Xưởng sẽ xem ảnh và phản hồi báo giá tại trang này.`,
      );
    } catch (cause) {
      if (cause instanceof ApiRequestError) {
        setFormError(cause.message);
        setFormFields(cause.fields);
      } else setFormError('Không gửi được yêu cầu. Vui lòng thử lại.');
    } finally {
      setSubmitting(false);
    }
  }

  async function decide(request: CustomOrderRequest, accepted: boolean) {
    const addressId = quoteAddresses[request.id];
    if (accepted && !addressId) {
      setFormError('Chọn địa chỉ giao hàng trước khi đồng ý báo giá.');
      return;
    }
    setDecidingId(request.id);
    setFormError(null);
    setNotice(null);
    try {
      const updated = await decideCustomQuote(request.id, accepted, addressId);
      replaceRequest(updated);
      setDecliningId(null);
      setNotice(
        accepted
          ? `Bạn đã đồng ý báo giá ${request.requestCode}. Đơn ${updated.orderCode ?? ''} đã được tạo.`
          : `Bạn đã từ chối báo giá ${request.requestCode}.`,
      );
    } catch (cause) {
      setFormError(cause instanceof ApiRequestError ? cause.message : 'Không lưu được phản hồi báo giá.');
    } finally {
      setDecidingId(null);
    }
  }

  if (!session)
    return (
      <StoreShell cartCount={count}>
        <Breadcrumb />
        <StoreNotice
          title="Đăng nhập để gửi ảnh cho xưởng"
          body="Yêu cầu, ảnh gốc và báo giá được lưu riêng theo tài khoản để chỉ bạn xem được."
          action={
            <Link className="btn btn-primary" to="/auth" state={{ from: location }}>
              Đăng nhập để đặt in
            </Link>
          }
        />
      </StoreShell>
    );

  return (
    <StoreShell cartCount={count}>
      <Breadcrumb />
      <section
        style={{ padding: 'var(--space-8) var(--space-8) var(--space-6)', borderBottom: '2px solid var(--color-text)' }}
      >
        <h1
          style={{
            margin: 0,
            maxWidth: '18ch',
            fontFamily: 'var(--font-heading)',
            fontWeight: 800,
            fontSize: 'clamp(30px, 5vw, 42px)',
            lineHeight: 1.02,
            letterSpacing: '-.035em',
          }}
        >
          Đặt in theo yêu cầu
        </h1>
        <p
          style={{ margin: 'var(--space-3) 0 0', maxWidth: '64ch', color: 'var(--color-neutral-800)', lineHeight: 1.6 }}
        >
          Gửi ảnh gốc và kích thước bạn mong muốn. Xưởng kiểm tra file, tư vấn khung rồi báo giá để bạn quyết định trước
          khi làm.
        </p>
      </section>
      {notice && (
        <p
          role="status"
          style={{
            margin: 0,
            padding: 'var(--space-3) var(--space-8)',
            borderBottom: '1px solid var(--color-divider)',
            fontSize: 13,
          }}
        >
          {notice}
        </p>
      )}
      {loadingError && (
        <div
          role="alert"
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: 'var(--space-3)',
            padding: 'var(--space-3) var(--space-8)',
            borderBottom: '1px solid var(--color-divider)',
            color: 'var(--color-accent-700)',
            fontSize: 13,
          }}
        >
          {loadingError}
          <button type="button" className="btn btn-secondary" onClick={() => void load()}>
            Thử lại
          </button>
        </div>
      )}
      <section
        data-split=""
        style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(320px, .82fr)', alignItems: 'start' }}
      >
        <form
          onSubmit={submit}
          style={{ padding: 'var(--space-6) var(--space-8)', borderRight: '2px solid var(--color-text)' }}
        >
          <h2 style={sectionTitle}>Yêu cầu mới</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
            <fieldset style={fieldset}>
              <legend style={STORE_LABEL_STYLE}>Bạn muốn làm gì?</legend>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                  gap: 'var(--space-2)',
                  marginTop: 'var(--space-3)',
                }}
                data-split=""
              >
                {(Object.keys(TYPE_LABEL) as CustomOrderType[]).map((type) => (
                  <label
                    key={type}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 7,
                      minWidth: 0,
                      padding: 'var(--space-3)',
                      border: form.type === type ? '2px solid var(--color-accent)' : '1px solid var(--color-divider)',
                      cursor: 'pointer',
                      fontSize: 13,
                      lineHeight: 1.35,
                    }}
                  >
                    <input
                      type="radio"
                      name="type"
                      value={type}
                      checked={form.type === type}
                      onChange={() => updateField('type', type)}
                    />
                    {TYPE_LABEL[type]}
                  </label>
                ))}
              </div>
            </fieldset>
            <div
              style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 'var(--space-3)' }}
              data-split=""
            >
              <div className="field">
                <label htmlFor="custom-width">Chiều rộng (cm)</label>
                <input
                  id="custom-width"
                  className="input"
                  type="number"
                  min="1"
                  step="0.1"
                  inputMode="decimal"
                  value={form.widthCm}
                  onChange={(event) => updateField('widthCm', event.target.value)}
                />
                {formFields.widthCm && <span style={fieldError}>{formFields.widthCm}</span>}
              </div>
              <div className="field">
                <label htmlFor="custom-height">Chiều cao (cm)</label>
                <input
                  id="custom-height"
                  className="input"
                  type="number"
                  min="1"
                  step="0.1"
                  inputMode="decimal"
                  value={form.heightCm}
                  onChange={(event) => updateField('heightCm', event.target.value)}
                />
                {formFields.heightCm && <span style={fieldError}>{formFields.heightCm}</span>}
              </div>
            </div>
            <div className="field">
              <label htmlFor="custom-material">Chất liệu mong muốn</label>
              <input
                id="custom-material"
                className="input"
                list="custom-materials"
                maxLength={100}
                value={form.material}
                onChange={(event) => updateField('material', event.target.value)}
                placeholder="Canvas, lụa, giấy ảnh…"
              />
              <datalist id="custom-materials">
                <option value="Canvas" />
                <option value="Lụa" />
                <option value="Giấy ảnh" />
              </datalist>
              {formFields.material && <span style={fieldError}>{formFields.material}</span>}
            </div>
            <div className="field">
              <label htmlFor="custom-frame">Khung (tuỳ chọn)</label>
              <select
                id="custom-frame"
                className="input"
                value={form.frameId}
                onChange={(event) => updateField('frameId', event.target.value)}
              >
                <option value="">Nhờ xưởng tư vấn khung</option>
                {frames.map((frame) => (
                  <option key={frame.id} value={frame.id}>
                    {frame.name} · {frame.material} · {formatPrice(frame.priceAdjustment)} phụ thu
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="custom-note">Ghi chú cho xưởng (tuỳ chọn)</label>
              <textarea
                id="custom-note"
                className="input"
                maxLength={4000}
                value={form.customerNote}
                onChange={(event) => updateField('customerNote', event.target.value)}
                placeholder="Ví dụ: ảnh chụp điện thoại, muốn treo phòng khách, ưu tiên khung sáng…"
              />
            </div>
            <div>
              <span style={STORE_LABEL_STYLE}>Ảnh tham chiếu (tuỳ chọn)</span>
              <input
                ref={uploadInput}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                onChange={(event) => selectFiles(event.target.files)}
                style={{ position: 'absolute', width: 1, height: 1, opacity: 0, pointerEvents: 'none' }}
              />
              <button
                type="button"
                className="btn btn-secondary"
                style={{ marginTop: 'var(--space-2)' }}
                onClick={() => uploadInput.current?.click()}
              >
                Chọn ảnh
              </button>
              <p style={{ margin: 'var(--space-2) 0 0', fontSize: 12, color: 'var(--color-neutral-800)' }}>
                JPG, PNG hoặc WebP, tối đa 10 MB mỗi ảnh. Ảnh chỉ tải sau khi yêu cầu được tạo.
              </p>
              {files.length > 0 && (
                <ul
                  style={{
                    margin: 'var(--space-3) 0 0',
                    padding: 0,
                    listStyle: 'none',
                    borderTop: '1px solid var(--color-neutral-300)',
                  }}
                >
                  {files.map((file, index) => (
                    <li
                      key={`${file.name}-${index}`}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 'var(--space-3)',
                        padding: 'var(--space-2) 0',
                        borderBottom: '1px solid var(--color-neutral-300)',
                        fontSize: 13,
                        overflowWrap: 'anywhere',
                      }}
                    >
                      <span>{file.name}</span>
                      <button
                        type="button"
                        className="btn btn-ghost"
                        aria-label={`Bỏ ${file.name}`}
                        onClick={() => setFiles((current) => current.filter((_, fileIndex) => fileIndex !== index))}
                      >
                        Bỏ
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            {formError && (
              <p role="alert" style={{ margin: 0, fontSize: 13, color: 'var(--color-accent-700)' }}>
                {formError}
              </p>
            )}
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Đang gửi yêu cầu…' : 'Gửi xưởng báo giá'}
            </button>
          </div>
        </form>

        <aside style={{ padding: 'var(--space-6) var(--space-8)', minWidth: 0 }}>
          <h2 style={sectionTitle}>Yêu cầu của bạn</h2>
          {loading ? (
            <p style={{ color: 'var(--color-neutral-800)' }}>Đang tải yêu cầu…</p>
          ) : requests.length === 0 ? (
            <p
              style={{
                margin: 0,
                padding: 'var(--space-5) 0',
                borderTop: '2px solid var(--color-text)',
                borderBottom: '1px solid var(--color-neutral-300)',
                color: 'var(--color-neutral-800)',
                lineHeight: 1.6,
              }}
            >
              Chưa có yêu cầu nào. Khi gửi xong, báo giá và phản hồi của xưởng sẽ hiện ở đây.
            </p>
          ) : (
            <div style={{ borderTop: '2px solid var(--color-text)' }}>
              {requests.map((request) => (
                <article
                  key={request.id}
                  style={{ padding: 'var(--space-5) 0', borderBottom: '1px solid var(--color-neutral-300)' }}
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
                    <strong style={{ fontFamily: 'var(--font-heading)', fontSize: 18, overflowWrap: 'anywhere' }}>
                      {request.requestCode}
                    </strong>
                    <StatusBadge status={request.status} />
                  </div>
                  <p style={{ margin: 'var(--space-2) 0 0', fontSize: 13, lineHeight: 1.55 }}>
                    {TYPE_LABEL[request.type]} · {request.widthCm} × {request.heightCm} cm · {request.material}
                    {request.frameName ? ` · Khung ${request.frameName}` : ''}
                  </p>
                  <small style={{ color: 'var(--color-neutral-700)' }}>
                    {dateTime.format(new Date(request.createdAt))}
                  </small>
                  {request.customerNote && (
                    <p style={{ margin: 'var(--space-3) 0 0', fontSize: 13, color: 'var(--color-neutral-800)' }}>
                      <span style={STORE_LABEL_STYLE}>Ghi chú của bạn</span>
                      <br />
                      {request.customerNote}
                    </p>
                  )}
                  {request.images.length > 0 && (
                    <div
                      style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap', marginTop: 'var(--space-3)' }}
                    >
                      {request.images.map((image, index) => (
                        <a key={image.id} href={image.signedUrl} target="_blank" rel="noreferrer">
                          <img
                            src={image.signedUrl}
                            alt={`Ảnh tham chiếu ${index + 1} của ${request.requestCode}`}
                            style={{
                              width: 58,
                              height: 58,
                              objectFit: 'cover',
                              border: '1px solid var(--color-divider)',
                            }}
                          />
                        </a>
                      ))}
                    </div>
                  )}
                  {request.status === 'NEW' && (
                    <p style={{ margin: 'var(--space-3) 0 0', fontSize: 13, color: 'var(--color-neutral-800)' }}>
                      Xưởng đang kiểm tra yêu cầu và sẽ gửi báo giá tại đây.
                    </p>
                  )}
                  {request.status === 'QUOTED' && (
                    <div
                      style={{
                        marginTop: 'var(--space-4)',
                        paddingTop: 'var(--space-4)',
                        borderTop: '2px solid var(--color-accent)',
                      }}
                    >
                      <p style={{ margin: 0, fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: 21 }}>
                        Báo giá: {request.quotedPrice == null ? 'Đang cập nhật' : formatPrice(request.quotedPrice)}
                      </p>
                      {request.staffNote && (
                        <p style={{ margin: 'var(--space-2) 0 0', fontSize: 13, lineHeight: 1.55 }}>
                          {request.staffNote}
                        </p>
                      )}
                      <div className="field" style={{ marginTop: 'var(--space-3)' }}>
                        <label htmlFor={`quote-address-${request.id}`}>Địa chỉ giao hàng khi đồng ý báo giá</label>
                        <select
                          id={`quote-address-${request.id}`}
                          className="input"
                          value={quoteAddresses[request.id] ?? ''}
                          onChange={(event) =>
                            setQuoteAddresses((current) => ({ ...current, [request.id]: event.target.value }))
                          }
                        >
                          <option value="">Chọn địa chỉ giao hàng</option>
                          {addresses.map((address) => (
                            <option key={address.id} value={address.id}>
                              {addressLabel(address)}
                            </option>
                          ))}
                        </select>
                        {addresses.length === 0 && (
                          <p style={{ margin: 'var(--space-2) 0 0', fontSize: 12 }}>
                            Bạn chưa có địa chỉ. <Link to="/account">Thêm địa chỉ giao hàng</Link>
                          </p>
                        )}
                      </div>
                      {decliningId === request.id ? (
                        <div style={{ marginTop: 'var(--space-3)' }}>
                          <p style={{ margin: '0 0 var(--space-2)', fontSize: 12 }}>Từ chối báo giá này?</p>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
                            <button
                              type="button"
                              className="btn btn-primary"
                              disabled={decidingId === request.id}
                              onClick={() => void decide(request, false)}
                            >
                              {decidingId === request.id ? 'Đang lưu…' : 'Xác nhận từ chối'}
                            </button>
                            <button
                              type="button"
                              className="btn btn-secondary"
                              disabled={decidingId === request.id}
                              onClick={() => setDecliningId(null)}
                            >
                              Giữ báo giá
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div
                          style={{
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: 'var(--space-2)',
                            marginTop: 'var(--space-3)',
                          }}
                        >
                          <button
                            type="button"
                            className="btn btn-primary"
                            disabled={decidingId === request.id || addresses.length === 0}
                            onClick={() => void decide(request, true)}
                          >
                            {decidingId === request.id ? 'Đang lưu…' : 'Đồng ý báo giá'}
                          </button>
                          <button
                            type="button"
                            className="btn btn-secondary"
                            disabled={decidingId === request.id}
                            onClick={() => setDecliningId(request.id)}
                          >
                            Từ chối
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                  {request.orderId && (
                    <Link
                      to={`/don-hang-cua-toi/${request.orderId}`}
                      style={{ display: 'inline-block', marginTop: 'var(--space-3)', fontSize: 13, fontWeight: 700 }}
                    >
                      Xem đơn hàng {request.orderCode} →
                    </Link>
                  )}
                </article>
              ))}
            </div>
          )}
        </aside>
      </section>
    </StoreShell>
  );
}

const sectionTitle: React.CSSProperties = {
  margin: '0 0 var(--space-4)',
  fontFamily: 'var(--font-heading)',
  fontWeight: 800,
  fontSize: 18,
  letterSpacing: '.04em',
  textTransform: 'uppercase',
};
const fieldset: React.CSSProperties = { margin: 0, padding: 0, border: 0 };
const fieldError: React.CSSProperties = {
  display: 'block',
  marginTop: 2,
  fontSize: 11,
  color: 'var(--color-accent-700)',
};
