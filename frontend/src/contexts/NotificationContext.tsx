import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { fetchUnreadNotificationCount } from '../api/notifications';
import { useAuth } from './AuthContext';

type NotificationContextValue = { unreadCount: number; loading: boolean; reloadUnreadCount: () => Promise<void> };
const NotificationContext = createContext<NotificationContextValue | null>(null);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const reloadUnreadCount = useCallback(async () => {
    if (!session) {
      setUnreadCount(0);
      return;
    }
    setLoading(true);
    try {
      setUnreadCount((await fetchUnreadNotificationCount()).unreadCount);
    } catch {
      setUnreadCount(0);
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    void reloadUnreadCount();
  }, [reloadUnreadCount]);
  const value = useMemo(() => ({ unreadCount, loading, reloadUnreadCount }), [loading, reloadUnreadCount, unreadCount]);
  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}

export function useNotificationsBadge() {
  const context = useContext(NotificationContext);
  if (!context) throw new Error('useNotificationsBadge must be used within NotificationProvider');
  return context;
}
