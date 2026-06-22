import { useEffect, useState } from 'react'
import { useSessionStore } from '../../store/useSessionStore.js'
import { useUIStore } from '../../store/useUIStore.js'

export function Header() {
  const { activeSessionId, sessions, generationStatus, streamingError, setStreamingError } = useSessionStore()
  const { setShowSidebar, showSidebar, setShowSettings } = useUIStore()
  const [toastVisible, setToastVisible] = useState(false)

  const session = sessions.find((s) => s.id === activeSessionId)
  const isStreaming = generationStatus === 'streaming'

  // Show toast when error appears, auto-dismiss after 6s
  useEffect(() => {
    if (!streamingError) { setToastVisible(false); return }
    setToastVisible(true)
    const t = setTimeout(() => {
      setToastVisible(false)
      setStreamingError(null)
    }, 6000)
    return () => clearTimeout(t)
  }, [streamingError, setStreamingError])

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
          <button
            className="btn"
            onClick={() => setShowSettings(true)}
            aria-label="Settings"
          >
            ⚙ Settings
          </button>
        </div>
      </header>

      {toastVisible && streamingError && (
        <div
          className="error-toast"
          role="alert"
          onClick={() => { setToastVisible(false); setStreamingError(null) }}
          title="Click to dismiss"
        >
          ⚠ {streamingError}
        </div>
      )}
    </>
  )
}
