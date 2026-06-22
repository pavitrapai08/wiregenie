import { useSessionStore } from '../store/useSessionStore.js'
import type { SessionVersion } from '../types/index.js'

interface VersionEntry {
  stackIndex: number
  layout: SessionVersion['layout']
  timestamp: number
  label: string
}

export function useVersionStack(sessionId: string | null) {
  const { sessions, undo, restoreVersion } = useSessionStore()
  const session = sessionId ? sessions.find((s) => s.id === sessionId) : null
  const stack = session?.versionStack ?? []

  // Build display entries: current + all stack entries (newest first)
  // Stack[i] stores the layout BEFORE change i+1, so useful versions start at stack[1]
  const versionEntries: VersionEntry[] = []

  // Current layout as the "latest" entry
  if (session?.layout) {
    versionEntries.push({
      stackIndex: -1, // sentinel: current layout
      layout: session.layout,
      timestamp: session.updatedAt,
      label: 'Current',
    })
  }

  // Stack entries in reverse order (newest → oldest), skip index 0 (empty initial)
  for (let i = stack.length - 1; i >= 1; i--) {
    versionEntries.push({
      stackIndex: i,
      layout: stack[i].layout,
      timestamp: stack[i].timestamp,
      label: `v${i + 1}`,
    })
  }

  return {
    stack,
    versionEntries,
    totalVersions: (session?.layout ? 1 : 0) + Math.max(0, stack.length - 1),
    canUndo: stack.length > 0,
    undo: () => sessionId && undo(sessionId),
    restoreVersion: (stackIndex: number) => sessionId && restoreVersion(sessionId, stackIndex),
  }
}
