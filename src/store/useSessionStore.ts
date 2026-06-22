import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import type {
  WireSession,
  WireframeLayout,
  WireframeRow,
  WidgetDef,
  WidgetType,
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
  duplicateSession: (id: string) => WireSession | null
  setActiveSession: (id: string) => void
  renameSession: (id: string, name: string) => void
  addTag: (sessionId: string, tag: string) => void
  removeTag: (sessionId: string, tag: string) => void

  // Layout
  setLayout: (sessionId: string, layout: WireframeLayout) => void
  mergeRefinement: (sessionId: string, partial: { rows: WireframeLayout['rows'] }) => void
  appendWidget: (sessionId: string, type: WidgetType) => void
  undo: (sessionId: string) => void
  restoreVersion: (sessionId: string, stackIndex: number) => void

  // Chat
  appendChat: (sessionId: string, message: ChatMessage) => void

  // Generation status
  setGenerationStatus: (status: GenerationStatus) => void
  setStreamingLayout: (layout: WireframeLayout | null) => void
  setStreamingError: (error: string | null) => void

  // Thumbnail
  setThumbnail: (sessionId: string, dataUrl: string) => void
}

function makeSession(overrides: Partial<WireSession> = {}): WireSession {
  return {
    id: crypto.randomUUID(),
    name: `Session ${new Date().toLocaleString()}`,
    layout: null,
    chatHistory: [],
    versionStack: [],
    tags: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...overrides,
  }
}

function makeDefaultWidget(type: WidgetType): WidgetDef {
  const id = crypto.randomUUID()
  switch (type) {
    case 'kpi_card':
      return { id, type, title: 'KPI Metric', colspan: 2, value: '—', delta: '+0%', deltaPositive: true }
    case 'line_chart':
      return { id, type, title: 'Trend', colspan: 2, xLabels: ['Q1', 'Q2', 'Q3', 'Q4'], series: [{ name: 'Value', values: [40, 65, 55, 80] }] }
    case 'bar_chart':
      return { id, type, title: 'Comparison', colspan: 2, labels: ['A', 'B', 'C', 'D'], series: [{ name: 'Value', values: [40, 65, 55, 80] }] }
    case 'horizontal_bar':
      return { id, type, title: 'Rankings', colspan: 2, rows: [{ label: 'Item A', value: 80, max: 100 }, { label: 'Item B', value: 60, max: 100 }, { label: 'Item C', value: 45, max: 100 }] }
    case 'donut_chart':
      return { id, type, title: 'Distribution', colspan: 2, segments: [{ label: 'Category A', value: 60 }, { label: 'Category B', value: 25 }, { label: 'Category C', value: 15 }], centerLabel: 'Total' }
    case 'funnel_chart':
      return { id, type, title: 'Funnel', colspan: 2, stages: [{ label: 'Leads', value: 1000 }, { label: 'Qualified', value: 600 }, { label: 'Closed', value: 200 }] }
    case 'scatter_plot':
      return { id, type, title: 'Scatter', colspan: 2, xLabel: 'X Axis', yLabel: 'Y Axis', points: [{ x: 10, y: 20, label: 'A' }, { x: 50, y: 80, label: 'B' }, { x: 30, y: 50, label: 'C' }] }
    case 'heatmap':
      return { id, type, title: 'Heatmap', colspan: 2, xLabels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], yLabels: ['Row 1', 'Row 2', 'Row 3'], values: [[0.2, 0.5, 0.8, 0.3, 0.6], [0.6, 0.3, 0.9, 0.1, 0.4], [0.1, 0.7, 0.4, 0.8, 0.2]] }
    case 'waterfall_chart':
      return { id, type, title: 'Waterfall', colspan: 2, items: [{ label: 'Start', value: 100 }, { label: 'Revenue', value: 50 }, { label: 'Costs', value: -30 }, { label: 'Net', value: 120, isTotal: true }] }
    case 'gauge_arc':
      return { id, type, title: 'Performance', colspan: 2, value: 65, min: 0, max: 100, unit: '%' }
    case 'data_table':
      return { id, type, title: 'Data Table', colspan: 2, columns: ['Name', 'Value', 'Status'], rows: [['Item A', '142', 'Active'], ['Item B', '98', 'Pending'], ['Item C', '201', 'Active']] }
    case 'sparkline_row':
      return { id, type, title: 'Metrics', colspan: 2, metrics: [{ label: 'Revenue', value: '$1.2M', trend: [20, 35, 28, 50, 42, 65] }, { label: 'Users', value: '24.5K', trend: [40, 45, 38, 52, 60, 58] }] }
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

    duplicateSession: (id) => {
      const { sessions } = get()
      if (!checkSessionCap(sessions)) return null
      const source = sessions.find((s) => s.id === id)
      if (!source) return null
      const copy = makeSession({
        name: `${source.name} (copy)`,
        layout: source.layout,
        chatHistory: [...source.chatHistory],
        versionStack: [...source.versionStack],
        tags: [...source.tags],
        thumbnailDataUrl: source.thumbnailDataUrl,
      })
      const next = [...sessions, copy]
      set({ sessions: next, activeSessionId: copy.id })
      return copy
    },

    setActiveSession: (id) => set({ activeSessionId: id }),

    renameSession: (id, name) => {
      set((s) => ({
        sessions: s.sessions.map((sess) =>
          sess.id === id ? { ...sess, name, updatedAt: Date.now() } : sess
        ),
      }))
    },

    addTag: (sessionId, tag) => {
      set((s) => ({
        sessions: s.sessions.map((sess) =>
          sess.id === sessionId && !sess.tags.includes(tag)
            ? { ...sess, tags: [...sess.tags, tag], updatedAt: Date.now() }
            : sess
        ),
      }))
    },

    removeTag: (sessionId, tag) => {
      set((s) => ({
        sessions: s.sessions.map((sess) =>
          sess.id === sessionId
            ? { ...sess, tags: sess.tags.filter((t) => t !== tag), updatedAt: Date.now() }
            : sess
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

    appendWidget: (sessionId, type) => {
      const { sessions } = get()
      const sess = sessions.find((s) => s.id === sessionId)
      if (!sess?.layout) return

      const widget = makeDefaultWidget(type)
      const newRow: WireframeRow = {
        id: crypto.randomUUID(),
        widgets: [widget],
      }

      const updatedLayout: WireframeLayout = {
        ...sess.layout,
        rows: [...sess.layout.rows, newRow],
      }

      set((s) => ({
        sessions: s.sessions.map((sess) =>
          sess.id === sessionId
            ? {
                ...sess,
                layout: updatedLayout,
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

    restoreVersion: (sessionId, stackIndex) => {
      const { sessions } = get()
      const sess = sessions.find((s) => s.id === sessionId)
      if (!sess) return

      const target = sess.versionStack[stackIndex]
      if (!target) return

      const newStack = sess.layout
        ? pushVersion(sess.versionStack.slice(0, stackIndex), sess.layout)
        : sess.versionStack.slice(0, stackIndex)

      set((s) => ({
        sessions: s.sessions.map((sess) =>
          sess.id === sessionId
            ? {
                ...sess,
                layout: target.layout,
                versionStack: newStack,
                updatedAt: Date.now(),
              }
            : sess
        ),
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
