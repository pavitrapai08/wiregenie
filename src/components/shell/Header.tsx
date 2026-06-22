import { useSessionStore } from '../../store/useSessionStore.js'
import { useUIStore } from '../../store/useUIStore.js'

interface Props {
  onOpenSettings: () => void
}

export function Header({ onOpenSettings }: Props) {
  const { activeSessionId, sessions, generationStatus, streamingError } = useSessionStore()
  const { setShowSidebar, showSidebar } = useUIStore()

  const session = sessions.find((s) => s.id === activeSessionId)
  const isStreaming = generationStatus === 'streaming'

  return (
    <>
      <header className="header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            className="btn btn--icon"
            onClick={() => setShowSidebar(!showSidebar)}
            aria-label="Toggle sidebar"
            title="Toggle sidebar"
          >
            ☰
          </button>
          <span className="header__logo">WireGenie</span>
          {session && (
            <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)' }}>
              / {session.name}
            </span>
          )}
        </div>

        <div className="header__actions">
          {isStreaming && (
            <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span className="skeleton" style={{ width: 8, height: 8, borderRadius: '50%', display: 'inline-block' }} />
              Generating…
            </span>
          )}
          <button className="btn" onClick={onOpenSettings} aria-label="Settings">
            ⚙ Settings
          </button>
        </div>
      </header>

      {streamingError && (
        <div className="generation-error" role="alert">
          ⚠ {streamingError}
        </div>
      )}
    </>
  )
}
