import { useState } from 'react'
import { useSessionStore } from '../../store/useSessionStore.js'
import { ComponentLibrary } from '../library/ComponentLibrary.js'
import { HistoryPanel } from '../history/HistoryPanel.js'

type Tab = 'sessions' | 'library' | 'history'

export function Sidebar() {
  const { sessions, activeSessionId, createSession, deleteSession, setActiveSession } =
    useSessionStore()
  const [tab, setTab] = useState<Tab>('sessions')

  return (
    <aside className="sidebar" aria-label="Sidebar">
      <div className="sidebar-tabs" role="tablist">
        {(['sessions', 'library', 'history'] as Tab[]).map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            className={`sidebar-tab${tab === t ? ' sidebar-tab--active' : ''}`}
            onClick={() => setTab(t)}
          >
            {t === 'sessions' ? 'Sessions' : t === 'library' ? 'Library' : 'History'}
          </button>
        ))}
      </div>

      <div className="sidebar-content">
        {tab === 'sessions' && (
          <>
            <div className="sidebar__header">
              <span className="sidebar__title">Sessions</span>
              <button
                className="btn btn--icon"
                onClick={() => createSession()}
                title="New session"
                aria-label="New session"
              >
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
                  <span className="session-item__name" title={session.name}>
                    {session.name}
                  </span>
                  <button
                    className="session-item__del"
                    title="Delete session"
                    aria-label={`Delete session ${session.name}`}
                    onClick={(e) => {
                      e.stopPropagation()
                      if (sessions.length > 1) deleteSession(session.id)
                    }}
                    disabled={sessions.length <= 1}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </>
        )}

        {tab === 'library' && <ComponentLibrary />}

        {tab === 'history' && <HistoryPanel />}
      </div>
    </aside>
  )
}
