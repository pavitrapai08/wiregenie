import { useSessionStore } from '../../store/useSessionStore.js'

export function Sidebar() {
  const { sessions, activeSessionId, createSession, deleteSession, setActiveSession } =
    useSessionStore()

  function handleNew() {
    createSession()
  }

  return (
    <aside className="sidebar" aria-label="Sessions">
      <div className="sidebar__header">
        <span className="sidebar__title">Sessions</span>
        <button className="btn btn--icon" onClick={handleNew} title="New session" aria-label="New session">
          +
        </button>
      </div>

      <div className="sidebar__sessions" role="list">
        {sessions.map((session) => (
          <div
            key={session.id}
            role="listitem"
            className={`session-item${session.id === activeSessionId ? ' session-item--active' : ''}`}
            onClick={() => setActiveSession(session.id)}
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && setActiveSession(session.id)}
          >
            <div className="session-item__thumb">
              {session.thumbnailDataUrl && (
                <img src={session.thumbnailDataUrl} alt="" />
              )}
            </div>
            <span className="session-item__name" title={session.name}>{session.name}</span>
            <button
              className="session-item__del"
              title="Delete session"
              aria-label={`Delete session ${session.name}`}
              onClick={(e) => {
                e.stopPropagation()
                if (sessions.length > 1) deleteSession(session.id)
              }}
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </aside>
  )
}
