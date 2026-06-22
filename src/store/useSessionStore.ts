import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import type {
  WireSession,
  WireframeLayout,
  ChatMessage,
  GenerationStatus,
} from '../types/index.js'
import { loadSessions, saveSessions, checkSessionCap } from '../utils/storage.js'
import { pushVersion, popVersion } from '../utils/versionStack.js'

interface SessionState {
  sessions: WireSession[]
  activeSessionId: string | null
  generationStatus: GenerationStatus
  streamingLayout: WireframeLayout | null
  streamingError: string | null

  // Session management
  createSession: () => WireSession | null
  deleteSession: (id: string) => void
  setActiveSession: (id: string) => void
  renameSession: (id: string, name: string) => void

  // Layout
  setLayout: (sessionId: string, layout: WireframeLayout) => void
  mergeRefinement: (sessionId: string, partial: { rows: WireframeLayout['rows'] }) => void
  undo: (sessionId: string) => void

  // Chat
  appendChat: (sessionId: string, message: ChatMessage) => void

  // Generation status
  setGenerationStatus: (status: GenerationStatus) => void
  setStreamingLayout: (layout: WireframeLayout | null) => void
  setStreamingError: (error: string | null) => void

  // Thumbnail
  setThumbnail: (sessionId: string, dataUrl: string) => void
}

function makeSession(): WireSession {
  return {
    id: crypto.randomUUID(),
    name: `Session ${new Date().toLocaleString()}`,
    layout: null,
    chatHistory: [],
    versionStack: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }
}

export const useSessionStore = create<SessionState>()(
  subscribeWithSelector((set, get) => ({
    sessions: loadSessions(),
    activeSessionId: null,
    generationStatus: 'idle',
    streamingLayout: null,
    streamingError: null,

    createSession: () => {
      const { sessions } = get()
      if (!checkSessionCap(sessions)) return null
      const session = makeSession()
      const next = [...sessions, session]
      set({ sessions: next, activeSessionId: session.id })
      return session
    },

    deleteSession: (id) => {
      const { sessions, activeSessionId } = get()
      const next = sessions.filter((s) => s.id !== id)
      const newActive =
        activeSessionId === id ? (next[next.length - 1]?.id ?? null) : activeSessionId
      set({ sessions: next, activeSessionId: newActive })
    },

    setActiveSession: (id) => set({ activeSessionId: id }),

    renameSession: (id, name) => {
      set((s) => ({
        sessions: s.sessions.map((sess) =>
          sess.id === id ? { ...sess, name, updatedAt: Date.now() } : sess
        ),
      }))
    },

    setLayout: (sessionId, layout) => {
      set((s) => ({
        sessions: s.sessions.map((sess) => {
          if (sess.id !== sessionId) return sess
          const versionStack = pushVersion(
            sess.versionStack,
            sess.layout ?? { title: '', rows: [] }
          )
          return { ...sess, layout, versionStack, updatedAt: Date.now() }
        }),
      }))
    },

    mergeRefinement: (sessionId, partial) => {
      const { sessions } = get()
      const sess = sessions.find((s) => s.id === sessionId)
      if (!sess?.layout) return

      const mergedRows = sess.layout.rows.map((row) => {
        const updated = partial.rows.find((r) => r.id === row.id)
        return updated ?? row
      })
      const newRows = partial.rows.filter(
        (r) => !sess.layout!.rows.some((existing) => existing.id === r.id)
      )

      const merged: WireframeLayout = {
        ...sess.layout,
        rows: [...mergedRows, ...newRows],
      }

      set((s) => ({
        sessions: s.sessions.map((sess) =>
          sess.id === sessionId
            ? {
                ...sess,
                layout: merged,
                versionStack: pushVersion(sess.versionStack, sess.layout!),
                updatedAt: Date.now(),
              }
            : sess
        ),
      }))
    },

    undo: (sessionId) => {
      set((s) => ({
        sessions: s.sessions.map((sess) => {
          if (sess.id !== sessionId) return sess
          const { stack, layout } = popVersion(sess.versionStack)
          return {
            ...sess,
            layout: layout ?? sess.layout,
            versionStack: stack,
            updatedAt: Date.now(),
          }
        }),
      }))
    },

    appendChat: (sessionId, message) => {
      set((s) => ({
        sessions: s.sessions.map((sess) =>
          sess.id === sessionId
            ? {
                ...sess,
                chatHistory: [...sess.chatHistory, message],
                updatedAt: Date.now(),
              }
            : sess
        ),
      }))
    },

    setGenerationStatus: (status) => set({ generationStatus: status }),
    setStreamingLayout: (layout) => set({ streamingLayout: layout }),
    setStreamingError: (error) => set({ streamingError: error }),

    setThumbnail: (sessionId, dataUrl) => {
      set((s) => ({
        sessions: s.sessions.map((sess) =>
          sess.id === sessionId
            ? { ...sess, thumbnailDataUrl: dataUrl }
            : sess
        ),
      }))
    },
  }))
)

// Persist to localStorage on every sessions change
useSessionStore.subscribe(
  (s) => s.sessions,
  (sessions) => saveSessions(sessions)
)

// Auto-create initial session if store loads empty
const _initial = useSessionStore.getState()
if (_initial.sessions.length === 0) {
  _initial.createSession()
} else {
  useSessionStore.setState({ activeSessionId: _initial.sessions[0].id })
}
