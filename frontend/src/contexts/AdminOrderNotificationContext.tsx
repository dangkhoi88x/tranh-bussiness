import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { apiFetch } from '../api/http'
import { useAuth } from './AuthContext'

export type AdminNewOrderNotification = {
  orderId: string
  orderCode: string
  totalAmount: number
  createdAt: string
}

type AdminOrderNotificationContextValue = {
  newOrderCount: number
  latestOrder: AdminNewOrderNotification | null
  soundEnabled: boolean
  enableSound: () => Promise<boolean>
  clearNewOrders: () => void
}

const AdminOrderNotificationContext = createContext<AdminOrderNotificationContextValue | null>(null)
const RECONNECT_DELAY_MS = 3_000

export function AdminOrderNotificationProvider({ children }: { children: ReactNode }) {
  const { session, hasPermission } = useAuth()
  const canReceiveOrders = Boolean(session && hasPermission('ORDER_MANAGE'))
  const [newOrderCount, setNewOrderCount] = useState(0)
  const [latestOrder, setLatestOrder] = useState<AdminNewOrderNotification | null>(null)
  const [soundEnabled, setSoundEnabled] = useState(false)
  const seenOrderIds = useRef(new Set<string>())
  const audioContext = useRef<AudioContext | null>(null)

  const enableSound = useCallback(async () => {
    if (typeof window === 'undefined' || !window.AudioContext) return false
    if (!audioContext.current || audioContext.current.state === 'closed') {
      audioContext.current = new window.AudioContext()
    }
    try {
      await audioContext.current.resume()
      const enabled = audioContext.current.state === 'running'
      setSoundEnabled(enabled)
      return enabled
    } catch {
      setSoundEnabled(false)
      return false
    }
  }, [])

  const playNewOrderSound = useCallback(() => {
    const context = audioContext.current
    if (!soundEnabled || !context || context.state !== 'running') return
    const oscillator = context.createOscillator()
    const gain = context.createGain()
    const now = context.currentTime
    oscillator.type = 'sine'
    oscillator.frequency.setValueAtTime(740, now)
    oscillator.frequency.exponentialRampToValueAtTime(1_040, now + 0.16)
    gain.gain.setValueAtTime(0.0001, now)
    gain.gain.exponentialRampToValueAtTime(0.12, now + 0.018)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.24)
    oscillator.connect(gain)
    gain.connect(context.destination)
    oscillator.start(now)
    oscillator.stop(now + 0.25)
  }, [soundEnabled])

  const receiveOrder = useCallback((order: AdminNewOrderNotification) => {
    if (seenOrderIds.current.has(order.orderId)) return
    seenOrderIds.current.add(order.orderId)
    setLatestOrder(order)
    setNewOrderCount((count) => count + 1)
    playNewOrderSound()
  }, [playNewOrderSound])

  useEffect(() => {
    if (canReceiveOrders) return
    seenOrderIds.current.clear()
    setNewOrderCount(0)
    setLatestOrder(null)
  }, [canReceiveOrders])

  useEffect(() => {
    if (!canReceiveOrders) return
    let stopped = false
    let controller: AbortController | null = null
    let retryTimer: number | null = null

    const reconnect = () => {
      if (!stopped) retryTimer = window.setTimeout(connect, RECONNECT_DELAY_MS)
    }

    const connect = async () => {
      controller = new AbortController()
      try {
        await readOrderNotificationStream(controller.signal, receiveOrder)
        reconnect()
      } catch (error) {
        if (!isAbortError(error)) reconnect()
      }
    }

    void connect()
    return () => {
      stopped = true
      controller?.abort()
      if (retryTimer !== null) window.clearTimeout(retryTimer)
    }
  }, [canReceiveOrders, receiveOrder])

  useEffect(() => {
    if (!canReceiveOrders || soundEnabled) return
    const unlock = () => { void enableSound() }
    window.addEventListener('pointerdown', unlock, { once: true })
    window.addEventListener('keydown', unlock, { once: true })
    return () => {
      window.removeEventListener('pointerdown', unlock)
      window.removeEventListener('keydown', unlock)
    }
  }, [canReceiveOrders, enableSound, soundEnabled])

  useEffect(() => () => {
    const context = audioContext.current
    audioContext.current = null
    if (context && context.state !== 'closed') void context.close()
  }, [])

  const clearNewOrders = useCallback(() => {
    setNewOrderCount(0)
    setLatestOrder(null)
  }, [])

  const value = useMemo(() => ({ newOrderCount, latestOrder, soundEnabled, enableSound, clearNewOrders }), [clearNewOrders, enableSound, latestOrder, newOrderCount, soundEnabled])
  return <AdminOrderNotificationContext.Provider value={value}>{children}</AdminOrderNotificationContext.Provider>
}

export function useAdminOrderNotifications() {
  const context = useContext(AdminOrderNotificationContext)
  if (!context) throw new Error('useAdminOrderNotifications must be used within AdminOrderNotificationProvider')
  return context
}

async function readOrderNotificationStream(signal: AbortSignal, onOrder: (order: AdminNewOrderNotification) => void) {
  const response = await apiFetch('/admin/order-notifications/stream', {
    signal,
    headers: { Accept: 'text/event-stream' },
  })
  if (!response.ok) throw new Error(`Could not open order notification stream (${response.status}).`)
  if (!response.body) throw new Error('Order notification stream is unavailable.')

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  while (true) {
    const { done, value } = await reader.read()
    if (done) return
    buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, '\n')
    const frames = buffer.split('\n\n')
    buffer = frames.pop() ?? ''
    frames.forEach((frame) => {
      const event = parseSseFrame(frame)
      if (event?.name !== 'new-order') return
      const order = parseOrder(event.data)
      if (order) onOrder(order)
    })
  }
}

function parseSseFrame(frame: string): { name: string; data: string } | null {
  let name = 'message'
  const data: string[] = []
  frame.split('\n').forEach((line) => {
    if (line.startsWith('event:')) name = line.slice(6).trim()
    if (line.startsWith('data:')) data.push(line.slice(5).trimStart())
  })
  return data.length ? { name, data: data.join('\n') } : null
}

function parseOrder(value: string): AdminNewOrderNotification | null {
  try {
    const parsed = JSON.parse(value) as Partial<AdminNewOrderNotification>
    const totalAmount = Number(parsed.totalAmount)
    if (typeof parsed.orderId !== 'string' || typeof parsed.orderCode !== 'string' || !Number.isFinite(totalAmount) || typeof parsed.createdAt !== 'string') return null
    return { orderId: parsed.orderId, orderCode: parsed.orderCode, totalAmount, createdAt: parsed.createdAt }
  } catch {
    return null
  }
}

function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === 'AbortError'
}
