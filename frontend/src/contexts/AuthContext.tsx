import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  clearAccessToken,
  login,
  logout,
  persistAccessToken,
  refreshSession,
  register,
  type AuthSession,
} from '../api/auth'

type LoginInput = { email: string; password: string }
type RegisterInput = LoginInput & { firstName: string; lastName: string; phone?: string }

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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const clearSession = useCallback(() => {
    clearAccessToken()
    setSession(null)
  }, [])

  useEffect(() => {
    let active = true
    void refreshSession()
      .then((nextSession) => {
        if (active) persistSession(nextSession, setSession)
      })
      .catch(() => {
        if (active) clearSession()
      })
      .finally(() => {
        if (active) setIsLoading(false)
      })

    return () => { active = false }
  }, [clearSession])

  useEffect(() => {
    window.addEventListener('business-store:session-expired', clearSession)
    return () => window.removeEventListener('business-store:session-expired', clearSession)
  }, [clearSession])

  const signIn = useCallback(async (input: LoginInput) => {
    const nextSession = await login(input)
    persistSession(nextSession, setSession)
    return nextSession
  }, [])

  const signUp = useCallback(async (input: RegisterInput) => {
    const nextSession = await register(input)
    persistSession(nextSession, setSession)
    return nextSession
  }, [])

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
