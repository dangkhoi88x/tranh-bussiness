import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import {
  clearAccessToken,
  login,
  loadAccessToken,
  logout,
  persistAccessToken,
  register,
  type AuthSession,
} from '../api/auth'
import { apiRequest, refreshSessionOnce } from '../api/http'

type LoginInput = { email: string; password: string }
type RegisterInput = LoginInput & { firstName: string; lastName: string; phone?: string }
type CurrentUserResponse = {
  id: string
  email: string
  firstName: string
  lastName: string
  roles: string[]
  authorities: string[]
}

type AuthContextValue = {
  session: AuthSession | null
  isLoading: boolean
  signIn: (input: LoginInput) => Promise<AuthSession>
  signUp: (input: RegisterInput) => Promise<AuthSession>
  signOut: () => Promise<void>
  hasPermission: (permission: string) => boolean
}

const AuthContext = createContext<AuthContextValue | null>(null)

function persistSession(session: AuthSession, setSession: (value: AuthSession) => void) {
  persistAccessToken(session.accessToken)
  setSession(session)
}

function sessionFromCurrentUser(user: CurrentUserResponse, accessToken: string): AuthSession {
  return {
    userId: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    roles: user.roles,
    authorities: user.authorities,
    accessToken,
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const permissionSyncPromise = useRef<Promise<AuthSession> | null>(null)

  const clearSession = useCallback(() => {
    clearAccessToken()
    setSession(null)
  }, [])

  const syncCurrentUser = useCallback((fallbackSession?: AuthSession) => {
    if (!permissionSyncPromise.current) {
      permissionSyncPromise.current = apiRequest<CurrentUserResponse>('/users/me')
        .then((user) => {
          const accessToken = loadAccessToken() ?? fallbackSession?.accessToken
          if (!accessToken) throw new Error('Phiên đăng nhập đã hết hạn.')
          const nextSession = sessionFromCurrentUser(user, accessToken)
          setSession(nextSession)
          return nextSession
        })
        .finally(() => {
          permissionSyncPromise.current = null
        })
    }
    return permissionSyncPromise.current
  }, [])

  useEffect(() => {
    let active = true
    void refreshSessionOnce()
      .then((nextSession) => syncCurrentUser(nextSession))
      .catch(() => {
        if (active) clearSession()
      })
      .finally(() => {
        if (active) setIsLoading(false)
      })

    return () => { active = false }
  }, [clearSession, syncCurrentUser])

  useEffect(() => {
    window.addEventListener('business-store:session-expired', clearSession)
    return () => window.removeEventListener('business-store:session-expired', clearSession)
  }, [clearSession])

  useEffect(() => {
    const syncPermissions = () => { void syncCurrentUser().catch(() => undefined) }
    window.addEventListener('business-store:authorization-changed', syncPermissions)
    return () => window.removeEventListener('business-store:authorization-changed', syncPermissions)
  }, [syncCurrentUser])

  useEffect(() => {
    if (!session) return

    const syncPermissions = () => { void syncCurrentUser().catch(() => undefined) }
    const intervalId = window.setInterval(syncPermissions, 60_000)
    const syncWhenVisible = () => {
      if (document.visibilityState === 'visible') syncPermissions()
    }
    window.addEventListener('focus', syncPermissions)
    document.addEventListener('visibilitychange', syncWhenVisible)

    return () => {
      window.clearInterval(intervalId)
      window.removeEventListener('focus', syncPermissions)
      document.removeEventListener('visibilitychange', syncWhenVisible)
    }
  }, [session?.userId, syncCurrentUser])

  const signIn = useCallback(async (input: LoginInput) => {
    const nextSession = await login(input)
    persistSession(nextSession, setSession)
    return syncCurrentUser(nextSession).catch(() => nextSession)
  }, [syncCurrentUser])

  const signUp = useCallback(async (input: RegisterInput) => {
    const nextSession = await register(input)
    persistSession(nextSession, setSession)
    return syncCurrentUser(nextSession).catch(() => nextSession)
  }, [syncCurrentUser])

  const signOut = useCallback(async () => {
    try {
      if (session) await logout(session.accessToken)
    } finally {
      clearSession()
    }
  }, [clearSession, session])

  const value = useMemo<AuthContextValue>(() => ({
    session,
    isLoading,
    signIn,
    signUp,
    signOut,
    hasPermission: (permission) => Boolean(session?.authorities.includes(permission)),
  }), [isLoading, session, signIn, signOut, signUp])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
