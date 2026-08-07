import { apiRequest } from './http';

/* ── Shipping addresses ─────────────────────────────────────────────── */

export type ShippingAddress = {
  id: string;
  recipientName: string;
  phone: string;
  province: string;
  district: string;
  ward: string;
  addressLine: string;
  defaultAddress: boolean;
};

export type ShippingAddressInput = {
  recipientName: string;
  phone: string;
  province: string;
  district: string;
  ward: string;
  addressLine: string;
  defaultAddress?: boolean;
};

export function fetchShippingAddresses(): Promise<ShippingAddress[]> {
  return apiRequest<ShippingAddress[]>('/shipping-addresses');
}

export function createShippingAddress(input: ShippingAddressInput): Promise<ShippingAddress> {
  return apiRequest<ShippingAddress>('/shipping-addresses', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
}

export function updateShippingAddress(id: string, input: ShippingAddressInput): Promise<ShippingAddress> {
  return apiRequest<ShippingAddress>(`/shipping-addresses/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
}

export function deleteShippingAddress(id: string): Promise<void> {
  return apiRequest<void>(`/shipping-addresses/${id}`, { method: 'DELETE' });
}

/* ── Checkout & payment ─────────────────────────────────────────────── */

export type CheckoutRequest = {
  shippingAddressId: string;
  couponCode?: string;
};

export type OrderShippingSnapshot = {
  recipientName: string;
  phone: string;
  province: string;
  district: string;
  ward: string;
  addressLine: string;
};

export type OrderItem = {
  id: string;
  productId: string;
  productName: string;
  productSlug: string;
  productVariantId: string | null;
  variantSku: string | null;
  variantName: string | null;
  variantMaterial: string | null;
  variantWidthCm: number | null;
  variantHeightCm: number | null;
  productFrameOptionId: string | null;
  frameName: string | null;
  productPrice: number;
  framePriceAdjustment: number;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
};

export type OrderResponse = {
  id: string;
  orderCode: string;
  status: string;
  shippingAddress: string;
  shippingAddressSnapshot: OrderShippingSnapshot;
  subtotalAmount: number;
  discountAmount: number;
  shippingFee: number;
  totalAmount: number;
  paymentStatus: string;
  paymentMethod: string | null;
  shipmentStatus: string | null;
  refundStatus: string | null;
  refundAmount: number | null;
  promotionId: string | null;
  promotionCode: string | null;
  items: OrderItem[];
  createdAt: string;
};

export function checkout(request: CheckoutRequest): Promise<OrderResponse> {
  return apiRequest<OrderResponse>('/orders/checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });
}

export type PaymentResponse = {
  id: string;
  orderId: string;
  orderCode: string;
  amount: number;
  method: string;
  status: string;
  transactionCode: string | null;
  paidAt: string | null;
  createdAt: string;
};

export function createPayment(orderId: string, method: 'COD' = 'COD'): Promise<PaymentResponse> {
  return apiRequest<PaymentResponse>(`/orders/${orderId}/payments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ method }),
  });
}
