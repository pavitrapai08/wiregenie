import { create } from 'zustand'
import { useSessionStore } from './useSessionStore.js'

interface HistoryState {
  searchQuery: string
  setSearchQuery: (q: string) => void
}

export const useHistoryStore = create<HistoryState>()((set) => ({
  searchQuery: '',
  setSearchQuery: (searchQuery) => set({ searchQuery }),
}))

export function useFilteredSessions() {
  const { searchQuery } = useHistoryStore()
  const { sessions } = useSessionStore()

  if (!searchQuery.trim()) return sessions

  const q = searchQuery.toLowerCase()
  return sessions.filter(
    (s) =>
      s.name.toLowerCase().includes(q) ||
      s.tags.some((t) => t.toLowerCase().includes(q))
  )
}
