import { apiRequest } from './http';
import type { OrderResponse, PaymentResponse } from './checkout';
import type { Page } from '../types/api';

export type OrderStatusHistory = {
  id: string;
  orderId: string;
  fromStatus: string | null;
  toStatus: string;
  changedBy: string | null;
  changedByName: string | null;
  note: string | null;
  createdAt: string;
};

export function fetchMyOrders(page = 1, size = 10): Promise<Page<OrderResponse>> {
  return apiRequest<Page<OrderResponse>>(`/orders/my-orders?page=${page}&size=${size}`);
}

export function fetchMyOrder(id: string): Promise<OrderResponse> {
  return apiRequest<OrderResponse>(`/orders/my-orders/${id}`);
}

export function fetchMyOrderHistory(id: string): Promise<OrderStatusHistory[]> {
  return apiRequest<OrderStatusHistory[]>(`/orders/my-orders/${id}/history`);
}

export function cancelMyOrder(id: string): Promise<OrderResponse> {
  return apiRequest<OrderResponse>(`/orders/my-orders/${id}/cancel`, { method: 'PUT' });
}

export function fetchMyPayments(page = 1, size = 100): Promise<Page<PaymentResponse>> {
  return apiRequest<Page<PaymentResponse>>(`/payments/my-payments?page=${page}&size=${size}`);
}
