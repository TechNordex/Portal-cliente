import { useEffect, useRef, useCallback } from 'react'
import { mutate } from 'swr'

const ALL_EVENTS = [
  'PROJECT_UPDATED',
  'STATUS_CHANGED',
  'NOTE_ADDED',
  'NEW_PROJECT',
  'NEW_MESSAGE',
  'USER_TYPING',
  'MESSAGE_EDITED',
  'CONVERSATION_DELETED',
] as const

export function useRealtime(onEvent?: () => void, userId?: string) {
  const retryDelay = useRef(1000)
  const esRef = useRef<EventSource | null>(null)
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isMounted = useRef(true)

  const connect = useCallback(() => {
    if (!isMounted.current) return

    const url = `/api/realtime${userId ? `?userId=${userId}` : ''}`
    const es = new EventSource(url)
    esRef.current = es

    const handleEvent = (e: MessageEvent) => {
      // Reset backoff on successful message
      retryDelay.current = 1000

      try {
        const parsedData = e.data ? JSON.parse(e.data) : null
        window.dispatchEvent(
          new CustomEvent('realtime-event', { detail: { event: e.type, data: parsedData } })
        )
      } catch { }

      if (e.type !== 'NEW_MESSAGE' && e.type !== 'USER_TYPING' && e.type !== 'MESSAGE_EDITED' && e.type !== 'CONVERSATION_DELETED') {
        mutate('/api/dashboard/project')
        mutate('/api/admin/projects')
        if (onEvent) onEvent()
      }
    }

    ALL_EVENTS.forEach(evt => es.addEventListener(evt, handleEvent as EventListener))

    // On open — reset backoff
    es.onopen = () => {
      retryDelay.current = 1000
    }

    es.onerror = () => {
      es.close()
      if (!isMounted.current) return

      // Exponential backoff reconnect
      const delay = Math.min(retryDelay.current, 60000)
      retryDelay.current = Math.min(delay * 2, 60000)
      retryTimer.current = setTimeout(connect, delay)
    }
  }, [userId, onEvent])

  useEffect(() => {
    isMounted.current = true
    connect()

    return () => {
      isMounted.current = false
      if (retryTimer.current) clearTimeout(retryTimer.current)
      esRef.current?.close()
    }
  }, [connect])
}
