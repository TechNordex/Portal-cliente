import { EventEmitter } from 'events'

// Global Event Emitter for Real-time Updates
// In a serverless environment like Vercel, this only works within the same instance.
// For a production-ready multi-instance solution, Pusher or Redis Pub/Sub is recommended.
declare global {
  var realtimeEmitter: EventEmitter | undefined
}

const realtimeEmitter = global.realtimeEmitter || new EventEmitter()

if (process.env.NODE_ENV !== 'production') {
  global.realtimeEmitter = realtimeEmitter
}

export const EVENTS = {
  PROJECT_UPDATED: 'PROJECT_UPDATED',
  STATUS_CHANGED: 'STATUS_CHANGED',
  NOTE_ADDED: 'NOTE_ADDED',
  NEW_MESSAGE: 'NEW_MESSAGE',
  USER_TYPING: 'USER_TYPING',
  MESSAGE_EDITED: 'MESSAGE_EDITED',
  CONVERSATION_DELETED: 'CONVERSATION_DELETED'
}

export { realtimeEmitter }
