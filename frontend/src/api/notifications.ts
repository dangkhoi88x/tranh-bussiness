import { apiRequest } from './http';
import type { Page } from '../types/api';

// Phải khớp com.example.businessstore.constant.NotificationType ở backend.
export type NotificationType =
  | 'WELCOME'
  | 'ORDER_PLACED'
  | 'ORDER_CONFIRMED'
  | 'ORDER_SHIPPED'
  | 'ORDER_DELIVERED'
  | 'ORDER_DELIVERY_FAILED'
  | 'ORDER_CANCELLED'
  | 'CUSTOM_ORDER_QUOTED'
  | 'PHOTOBOOK_PROOF_SENT';

export type Notification = {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  actionUrl: string | null;
  read: boolean;
  readAt: string | null;
  createdAt: string;
};

export function fetchNotifications(page = 1, size = 20): Promise<Page<Notification>> {
  return apiRequest<Page<Notification>>(`/notifications?page=${page}&size=${size}`);
}
export function fetchUnreadNotificationCount(): Promise<{ unreadCount: number }> {
  return apiRequest<{ unreadCount: number }>('/notifications/unread-count');
}
export function markNotificationRead(id: string): Promise<Notification> {
  return apiRequest<Notification>(`/notifications/${id}/read`, { method: 'PATCH' });
}
export function markAllNotificationsRead(): Promise<void> {
  return apiRequest<void>('/notifications/read-all', { method: 'PATCH' });
}
