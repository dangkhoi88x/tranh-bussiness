import { apiRequest } from './http';
import type { ShippingAddress } from './checkout';
import type { Page } from '../types/api';

export type CustomOrderType = 'FRAME_ONLY' | 'PRINT_AND_FRAME' | 'FAMILY_PHOTO';
export type CustomOrderStatus = 'NEW' | 'QUOTED' | 'CONFIRMED' | 'IN_PRODUCTION' | 'COMPLETED' | 'CANCELLED';

export type CustomOrderImage = { id: string; signedUrl: string };
export type CustomOrderRequest = {
  id: string;
  requestCode: string;
  type: CustomOrderType;
  widthCm: number;
  heightCm: number;
  material: string;
  frameId: string | null;
  frameName: string | null;
  quotedPrice: number | null;
  staffNote: string | null;
  customerNote: string | null;
  status: CustomOrderStatus;
  orderId: string | null;
  orderCode: string | null;
  images: CustomOrderImage[];
  createdAt: string;
};

export type CreateCustomOrderInput = {
  type: CustomOrderType;
  widthCm: number;
  heightCm: number;
  material: string;
  frameId?: string;
  customerNote?: string;
};

export type ActiveFrame = { id: string; name: string; material: string; color: string; priceAdjustment: number };

export function createCustomOrder(input: CreateCustomOrderInput): Promise<CustomOrderRequest> {
  return apiRequest<CustomOrderRequest>('/custom-order-requests', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input),
  });
}

export function fetchMyCustomOrders(page = 1, size = 20): Promise<Page<CustomOrderRequest>> {
  return apiRequest<Page<CustomOrderRequest>>(`/custom-order-requests/mine?page=${page}&size=${size}`);
}

export function uploadCustomOrderImage(requestId: string, file: File): Promise<CustomOrderRequest> {
  const body = new FormData(); body.append('file', file);
  return apiRequest<CustomOrderRequest>(`/custom-order-requests/mine/${requestId}/images`, { method: 'POST', body });
}

export function decideCustomQuote(requestId: string, accepted: boolean, shippingAddressId?: string): Promise<CustomOrderRequest> {
  return apiRequest<CustomOrderRequest>(`/custom-order-requests/mine/${requestId}/quote-decision`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ accepted, shippingAddressId }),
  });
}

export function fetchActiveFrames(): Promise<ActiveFrame[]> { return apiRequest<ActiveFrame[]>('/frames'); }
export { type ShippingAddress };
