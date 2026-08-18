// Test hồi quy cho trang chi tiết đơn phía admin.
//
// Hai ca `hồi quy` bên dưới tương ứng hai bug thật phát hiện ngày 2026-08-18, cả hai đều lọt
// qua CI vì frontend lúc đó chưa có test component nào:
//
//   A. Admin không huỷ được đơn đã CONFIRMED — UI chỉ mở tuỳ chọn khi đơn còn PENDING, trong khi
//      backend cho phép huỷ cả PENDING lẫn CONFIRMED (OrderServiceImpl.CANCELLABLE).
//   B. Sau khi cập nhật shipment thành công, ExistingShipmentCard giữ nguyên state cũ vì component
//      không remount theo shipment.status, nên lần submit kế tiếp gửi trạng thái cũ và backend trả 409.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

const apiRequest = vi.fn();

// Giữ ApiRequestError thật vì OrderDetailPage dùng `instanceof` để phân biệt 404 shipment.
vi.mock('../api/http', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../api/http')>();
  return { ...actual, apiRequest: (...args: unknown[]) => apiRequest(...args) };
});

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({ hasPermission: () => true }),
}));

const { OrderDetailPage } = await import('./OperationsPages');
const { ApiRequestError } = await import('../api/http');

type OrderStatus = 'PENDING' | 'CONFIRMED' | 'PROCESSING' | 'SHIPPING' | 'DELIVERY_FAILED' | 'DELIVERED' | 'CANCELLED';
type ShipmentStatus = 'READY' | 'IN_TRANSIT' | 'DELIVERED' | 'DELIVERY_FAILED' | 'CANCELLED';

function makeOrder(status: OrderStatus) {
  return {
    id: 'order-1',
    orderCode: 'ART-20260818-TEST',
    status,
    shippingAddress: '99 Trần Hưng Đạo, Quận 5, TP.HCM',
    shippingAddressSnapshot: null,
    subtotalAmount: 1300000,
    discountAmount: 0,
    totalAmount: 1300000,
    promotionCode: null,
    customDetails: null,
    items: [
      {
        id: 'item-1',
        productName: 'Miền nhớ Đà Lạt',
        variantName: '35 × 50 cm',
        variantSku: 'TBS-DL-3550',
        variantMaterial: 'Canvas',
        frameName: null,
        unitPrice: 1300000,
        quantity: 1,
        lineTotal: 1300000,
      },
    ],
    createdAt: '2026-08-18T03:00:00Z',
  };
}

function makeShipment(status: ShipmentStatus) {
  return {
    id: 'shipment-1',
    carrier: 'GHTK',
    trackingCode: 'GHTK-TEST-001',
    shippingFee: 30000,
    status,
    shippedAt: null,
    deliveredAt: null,
    failedAt: null,
    failureReason: null,
  };
}

// 404 là trường hợp bình thường: đơn chưa tạo vận đơn. OrderDetailPage phải nuốt lỗi này và
// hiển thị form "Tạo vận đơn" thay vì báo lỗi.
const NO_SHIPMENT = new ApiRequestError('Không có shipment', 404);

/**
 * Fake backend tối giản: mutation làm đổi state, GET sau đó trả state mới — đúng như backend thật.
 * Cần đúng hành vi này thì ca hồi quy bug B mới có nghĩa, vì bug chỉ lộ ra khi parent load lại và
 * nhận về shipment ở trạng thái khác.
 */
function stubApi(state: { order: ReturnType<typeof makeOrder>; shipment: ReturnType<typeof makeShipment> | null }) {
  apiRequest.mockImplementation((path: string, init?: RequestInit) => {
    if (!init?.method) {
      if (path === '/orders/order-1') return Promise.resolve(state.order);
      if (path === '/orders/order-1/history') return Promise.resolve([]);
      if (path === '/orders/order-1/shipment') {
        return state.shipment ? Promise.resolve(state.shipment) : Promise.reject(NO_SHIPMENT);
      }
      return Promise.resolve({});
    }

    const body = JSON.parse(init.body as string);
    if (path === '/shipments/shipment-1/status' && state.shipment) {
      state.shipment = { ...state.shipment, status: body.status };
      if (body.status === 'IN_TRANSIT') state.order = { ...state.order, status: 'SHIPPING' };
    } else if (path === '/orders/order-1/fulfillment/complete' && state.shipment) {
      state.shipment = { ...state.shipment, status: 'DELIVERED' };
      state.order = { ...state.order, status: 'DELIVERED' };
    } else if (path === '/orders/order-1/status') {
      state.order = { ...state.order, status: body.status };
    }
    return Promise.resolve({});
  });
}

async function renderPage() {
  render(
    <MemoryRouter initialEntries={['/admin/orders/order-1']}>
      <Routes>
        <Route path="/admin/orders/:orderId" element={<OrderDetailPage />} />
      </Routes>
    </MemoryRouter>,
  );
  // Chờ đơn load xong; trước đó trang chỉ hiện "Đang tải đơn hàng…".
  await screen.findByRole('heading', { name: 'ART-20260818-TEST' });
}

/** Lấy panel theo tiêu đề để tránh nhầm giữa select của "Xử lý đơn" và của "Vận chuyển". */
function panel(heading: string) {
  const section = screen.getByRole('heading', { name: heading }).closest('section');
  if (!section) throw new Error(`Không tìm thấy panel "${heading}"`);
  return within(section);
}

/** Path của các lời gọi mutation, bỏ qua GET lúc load trang. */
function mutationCalls() {
  return apiRequest.mock.calls
    .filter(([, init]) => init && (init as RequestInit).method)
    .map(([path, init]) => ({
      path,
      method: (init as RequestInit).method,
      body: JSON.parse((init as RequestInit).body as string),
    }));
}

beforeEach(() => {
  apiRequest.mockReset();
});

afterEach(() => {
  cleanup();
});

describe('OrderStatusCard — tuỳ chọn chuyển trạng thái', () => {
  it('đơn PENDING cho phép cả xác nhận lẫn huỷ', async () => {
    stubApi({ order: makeOrder('PENDING'), shipment: null });
    await renderPage();

    const options = panel('Xử lý đơn').getByRole('combobox').querySelectorAll('option');
    expect([...options].map((o) => o.textContent)).toEqual(['CONFIRMED', 'CANCELLED']);
  });

  // Hồi quy bug A. Trước khi sửa, nhánh này rơi vào "options.length === 0" nên panel "Xử lý đơn"
  // biến mất hoàn toàn và admin không còn đường huỷ đơn trên giao diện.
  it('hồi quy: đơn CONFIRMED vẫn phải huỷ được', async () => {
    stubApi({ order: makeOrder('CONFIRMED'), shipment: null });
    await renderPage();

    const select = panel('Xử lý đơn').getByRole('combobox');
    expect([...select.querySelectorAll('option')].map((o) => o.textContent)).toEqual(['CANCELLED']);
  });

  it('đơn đã kết thúc thì không còn form đổi trạng thái', async () => {
    stubApi({ order: makeOrder('DELIVERED'), shipment: null });
    await renderPage();

    expect(screen.queryByRole('heading', { name: 'Xử lý đơn' })).not.toBeInTheDocument();
    expect(screen.getByText('Trạng thái hiện tại:')).toBeInTheDocument();
  });

  it('gửi đúng trạng thái và ghi chú lên backend', async () => {
    const user = userEvent.setup();
    stubApi({ order: makeOrder('CONFIRMED'), shipment: null });
    await renderPage();

    const card = panel('Xử lý đơn');
    await user.type(card.getByRole('textbox'), 'Khách đổi ý');
    await user.click(card.getByRole('button', { name: 'Cập nhật đơn' }));

    await waitFor(() => {
      expect(mutationCalls()).toContainEqual({
        path: '/orders/order-1/status',
        method: 'PUT',
        body: { status: 'CANCELLED', note: 'Khách đổi ý' },
      });
    });
  });
});

describe('ExistingShipmentCard — chuyển trạng thái vận chuyển', () => {
  it('shipment READY chỉ cho IN_TRANSIT hoặc CANCELLED', async () => {
    stubApi({ order: makeOrder('CONFIRMED'), shipment: makeShipment('READY') });
    await renderPage();

    const select = panel('Vận chuyển').getByRole('combobox');
    expect([...select.querySelectorAll('option')].map((o) => o.textContent)).toEqual(['IN_TRANSIT', 'CANCELLED']);
  });

  it('DELIVERED và DELIVERY_FAILED đi qua endpoint fulfillment riêng, không qua PUT shipment status', async () => {
    const user = userEvent.setup();
    stubApi({ order: makeOrder('SHIPPING'), shipment: makeShipment('IN_TRANSIT') });
    await renderPage();

    await user.click(panel('Vận chuyển').getByRole('button', { name: 'Cập nhật vận chuyển' }));

    await waitFor(() => {
      expect(mutationCalls()).toContainEqual({
        path: '/orders/order-1/fulfillment/complete',
        method: 'POST',
        body: { note: null },
      });
    });
    expect(mutationCalls().some((c) => String(c.path).startsWith('/shipments/'))).toBe(false);
  });

  // Hồi quy bug B. Kịch bản đúng như lúc bấm tay: cập nhật READY -> IN_TRANSIT thành công, parent
  // load lại, rồi admin bấm tiếp mà KHÔNG tự tay đổi dropdown. Khi thiếu `key={shipment.status}`,
  // useState giữ 'IN_TRANSIT' cũ nên request thứ hai gửi PUT /shipments/... IN_TRANSIT và nhận 409,
  // dù dropdown đang hiển thị DELIVERED.
  it('hồi quy: submit ngay sau lần cập nhật trước phải dùng trạng thái mới, không dùng state cũ', async () => {
    const user = userEvent.setup();
    const state = { order: makeOrder('CONFIRMED'), shipment: makeShipment('READY') };
    stubApi(state);
    await renderPage();

    // Bước 1: READY -> IN_TRANSIT.
    await user.click(panel('Vận chuyển').getByRole('button', { name: 'Cập nhật vận chuyển' }));
    await waitFor(() => {
      expect(mutationCalls()).toContainEqual({
        path: '/shipments/shipment-1/status',
        method: 'PUT',
        body: { status: 'IN_TRANSIT', failureReason: null },
      });
    });

    // Fake backend đã chuyển shipment sang IN_TRANSIT; parent load lại sau onSaved và dropdown
    // phải hiển thị bộ lựa chọn mới.
    await waitFor(() => {
      expect(panel('Vận chuyển').getByRole('combobox')).toHaveValue('DELIVERED');
    });

    // Bước 2: bấm luôn, không chạm dropdown.
    await user.click(panel('Vận chuyển').getByRole('button', { name: 'Cập nhật vận chuyển' }));

    await waitFor(() => {
      expect(mutationCalls()).toContainEqual({
        path: '/orders/order-1/fulfillment/complete',
        method: 'POST',
        body: { note: null },
      });
    });
    // Điểm mấu chốt: không được gửi lại IN_TRANSIT lần thứ hai.
    const inTransitCalls = mutationCalls().filter((c) => c.body?.status === 'IN_TRANSIT');
    expect(inTransitCalls).toHaveLength(1);
  });

  it('shipment đã DELIVERED thì không còn form thao tác', async () => {
    stubApi({ order: makeOrder('DELIVERED'), shipment: makeShipment('DELIVERED') });
    await renderPage();

    const card = panel('Vận chuyển');
    expect(card.queryByRole('button', { name: 'Cập nhật vận chuyển' })).not.toBeInTheDocument();
  });
});
