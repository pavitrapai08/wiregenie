import { useSessionStore } from '../../store/useSessionStore.js'
import { useHistoryStore, useFilteredSessions } from '../../store/useHistoryStore.js'
import { HistoryItem } from './HistoryItem.js'

export function HistoryPanel() {
  const { activeSessionId } = useSessionStore()
  const { searchQuery, setSearchQuery } = useHistoryStore()
  const filtered = useFilteredSessions()

  return (
    <div className="history-panel">
      <div className="history-panel__search">
        <input
          className="history-search"
          type="search"
          placeholder="Search sessions or tags…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          aria-label="Search sessions"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="history-panel__empty">
          {searchQuery ? 'No sessions match your search.' : 'No sessions yet.'}
        </div>
      ) : (
        <div className="history-panel__list" role="list">
          {filtered.map((session) => (
            <HistoryItem
              key={session.id}
              session={session}
              isActive={session.id === activeSessionId}
            />
          ))}
        </div>
      )}
    </div>
  )
}
