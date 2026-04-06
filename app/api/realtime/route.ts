import { NextRequest } from 'next/server'
import { realtimeEmitter, EVENTS } from '@/lib/realtime'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const userId = searchParams.get('userId')

  const responseStream = new TransformStream()
  const writer = responseStream.writable.getWriter()
  const encoder = new TextEncoder()

  const sendEvent = (event: string, data: any) => {
    const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
    writer.write(encoder.encode(payload))
  }

  // Handle Event Subscriptions
  const onProjectUpdate = (data: any) => sendEvent(EVENTS.PROJECT_UPDATED, data)
  const onStatusChange = (data: any) => sendEvent(EVENTS.STATUS_CHANGED, data)
  const onNoteAdded = (data: any) => sendEvent(EVENTS.NOTE_ADDED, data)
  const onNewMessage = (data: any) => sendEvent(EVENTS.NEW_MESSAGE, data)
  const onUserTyping = (data: any) => sendEvent(EVENTS.USER_TYPING, data)
  const onMessageEdited = (data: any) => sendEvent(EVENTS.MESSAGE_EDITED, data)
  const onConversationDeleted = (data: any) => sendEvent(EVENTS.CONVERSATION_DELETED, data)

  realtimeEmitter.on(EVENTS.PROJECT_UPDATED, onProjectUpdate)
  realtimeEmitter.on(EVENTS.STATUS_CHANGED, onStatusChange)
  realtimeEmitter.on(EVENTS.NOTE_ADDED, onNoteAdded)
  realtimeEmitter.on(EVENTS.NEW_MESSAGE, onNewMessage)
  realtimeEmitter.on(EVENTS.USER_TYPING, onUserTyping)
  realtimeEmitter.on(EVENTS.MESSAGE_EDITED, onMessageEdited)
  realtimeEmitter.on(EVENTS.CONVERSATION_DELETED, onConversationDeleted)

  // Send initial keep-alive
  sendEvent('connected', { timestamp: new Date().toISOString() })

  // Keep connection open
  const keepAlive = setInterval(() => {
    writer.write(encoder.encode(': keep-alive\n\n'))
  }, 30000)

  // Clean up on close
  req.signal.onabort = () => {
    clearInterval(keepAlive)
    realtimeEmitter.off(EVENTS.PROJECT_UPDATED, onProjectUpdate)
    realtimeEmitter.off(EVENTS.STATUS_CHANGED, onStatusChange)
    realtimeEmitter.off(EVENTS.NOTE_ADDED, onNoteAdded)
    realtimeEmitter.off(EVENTS.NEW_MESSAGE, onNewMessage)
    realtimeEmitter.off(EVENTS.USER_TYPING, onUserTyping)
    realtimeEmitter.off(EVENTS.MESSAGE_EDITED, onMessageEdited)
    realtimeEmitter.off(EVENTS.CONVERSATION_DELETED, onConversationDeleted)
    writer.close()
  }

  return new Response(responseStream.readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
    },
  })
}
