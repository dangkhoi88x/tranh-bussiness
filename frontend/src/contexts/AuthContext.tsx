import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  clearAccessToken,
  login,
  loginWithGoogle,
  loadAccessToken,
  logout,
  persistAccessToken,
  register,
  type AuthSession,
} from '../api/auth';
import { apiRequest, refreshSessionOnce } from '../api/http';
import { mergeGuestCart } from '../api/guestCart';
import { changePassword, updateProfile, type CurrentUser, type ProfileInput } from '../api/account';

type LoginInput = { email: string; password: string };
type RegisterInput = LoginInput & { firstName: string; lastName: string; phone?: string };
type CurrentUserResponse = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  roles: string[];
  authorities: string[];
};

type AuthContextValue = {
  session: AuthSession | null;
  isLoading: boolean;
  signIn: (input: LoginInput) => Promise<AuthSession>;
  signUp: (input: RegisterInput) => Promise<AuthSession>;
  signInWithGoogle: (code: string, redirectUri: string) => Promise<AuthSession>;
  signOut: () => Promise<void>;
  saveProfile: (input: ProfileInput) => Promise<CurrentUser>;
  updatePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  hasPermission: (permission: string) => boolean;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function sessionFromCurrentUser(user: CurrentUserResponse, accessToken: string): AuthSession {
  return {
    userId: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    roles: user.roles,
    authorities: user.authorities,
    accessToken,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const permissionSyncPromise = useRef<Promise<AuthSession> | null>(null);

  const clearSession = useCallback(() => {
    clearAccessToken();
    setSession(null);
  }, []);

  const syncCurrentUser = useCallback((fallbackSession?: AuthSession) => {
    if (!permissionSyncPromise.current) {
      permissionSyncPromise.current = apiRequest<CurrentUserResponse>('/users/me')
        .then((user) => {
          const accessToken = loadAccessToken() ?? fallbackSession?.accessToken;
          if (!accessToken) throw new Error('Phiên đăng nhập đã hết hạn.');
          const nextSession = sessionFromCurrentUser(user, accessToken);
          setSession(nextSession);
          return nextSession;
        })
        .finally(() => {
          permissionSyncPromise.current = null;
        });
    }
    return permissionSyncPromise.current;
  }, []);

  useEffect(() => {
    let active = true;
    void refreshSessionOnce()
      .then(async (nextSession) => {
        await mergeGuestCart();
        return syncCurrentUser(nextSession);
      })
      .catch(() => {
        if (active) clearSession();
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [clearSession, syncCurrentUser]);

  useEffect(() => {
    window.addEventListener('business-store:session-expired', clearSession);
    return () => window.removeEventListener('business-store:session-expired', clearSession);
  }, [clearSession]);

  useEffect(() => {
    const syncPermissions = () => {
      void syncCurrentUser().catch(() => undefined);
    };
    window.addEventListener('business-store:authorization-changed', syncPermissions);
    return () => window.removeEventListener('business-store:authorization-changed', syncPermissions);
  }, [syncCurrentUser]);

  useEffect(() => {
    if (!session) return;

    const syncPermissions = () => {
      void syncCurrentUser().catch(() => undefined);
    };
    const intervalId = window.setInterval(syncPermissions, 60_000);
    const syncWhenVisible = () => {
      if (document.visibilityState === 'visible') syncPermissions();
    };
    window.addEventListener('focus', syncPermissions);
    document.addEventListener('visibilitychange', syncWhenVisible);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('focus', syncPermissions);
      document.removeEventListener('visibilitychange', syncWhenVisible);
    };
  }, [session?.userId, syncCurrentUser]);

  const signIn = useCallback(
    async (input: LoginInput) => {
      const nextSession = await login(input);
      persistAccessToken(nextSession.accessToken);
      await mergeGuestCart();
      setSession(nextSession);
      return syncCurrentUser(nextSession).catch(() => nextSession);
    },
    [syncCurrentUser],
  );

  const signUp = useCallback(
    async (input: RegisterInput) => {
      const nextSession = await register(input);
      persistAccessToken(nextSession.accessToken);
      await mergeGuestCart();
      setSession(nextSession);
      return syncCurrentUser(nextSession).catch(() => nextSession);
    },
    [syncCurrentUser],
  );

  const saveProfile = useCallback(async (input: ProfileInput) => {
    const user = await updateProfile(input);
    // Tên hiển thị nằm trong session, nên phải cập nhật ngay thay vì đợi lần đồng bộ sau.
    setSession((current) => (current ? { ...current, firstName: user.firstName, lastName: user.lastName } : current));
    return user;
  }, []);

  const updatePassword = useCallback(async (currentPassword: string, newPassword: string) => {
    const nextSession = await changePassword(currentPassword, newPassword);
    // Máy chủ vừa thu hồi mọi phiên cũ và cấp phiên mới cho thiết bị này; giữ lại access
    // token mới thì người dùng mới không bị đăng xuất ngay sau khi đổi mật khẩu.
    persistAccessToken(nextSession.accessToken);
    setSession(nextSession);
  }, []);

  const signInWithGoogle = useCallback(
    async (code: string, redirectUri: string) => {
      const nextSession = await loginWithGoogle(code, redirectUri);
      persistAccessToken(nextSession.accessToken);
      await mergeGuestCart();
      setSession(nextSession);
      return syncCurrentUser(nextSession).catch(() => nextSession);
    },
    [syncCurrentUser],
  );

  const signOut = useCallback(async () => {
    try {
      if (session) await logout(session.accessToken);
    } finally {
      clearSession();
    }
  }, [clearSession, session]);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      isLoading,
      signIn,
      signUp,
      signInWithGoogle,
      signOut,
      saveProfile,
      updatePassword,
      hasPermission: (permission) => Boolean(session?.authorities.includes(permission)),
    }),
    [isLoading, saveProfile, session, signIn, signInWithGoogle, signOut, signUp, updatePassword],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
