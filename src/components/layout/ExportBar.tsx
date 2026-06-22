import { useState, useRef, useEffect } from 'react'
import { useSessionStore } from '../../store/useSessionStore.js'
import { useVersionStack } from '../../hooks/useVersionStack.js'

function relativeTime(ts: number): string {
  const diff = Date.now() - ts
  const m = Math.floor(diff / 60000)
  const h = Math.floor(diff / 3600000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  if (h < 24) return `${h}h ago`
  return `${Math.floor(diff / 86400000)}d ago`
}

export function ExportBar() {
  const { activeSessionId, generationStatus } = useSessionStore()
  const { versionEntries, totalVersions, canUndo, undo, restoreVersion } =
    useVersionStack(activeSessionId)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const isStreaming = generationStatus === 'streaming'

  // Close dropdown on outside click
  useEffect(() => {
    if (!dropdownOpen) return
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [dropdownOpen])

  if (totalVersions === 0) return null

  return (
    <div className="export-bar" role="toolbar" aria-label="Version history">
      <button
        className="btn btn--icon"
        title="Undo"
        disabled={!canUndo || isStreaming}
        onClick={() => undo()}
        aria-label="Undo last change"
      >
        ↩
      </button>

      <div className="export-bar__version" ref={dropdownRef}>
        <button
          className="version-badge"
          onClick={() => setDropdownOpen((v) => !v)}
          aria-expanded={dropdownOpen}
          aria-haspopup="listbox"
          title="Version history"
        >
          v{totalVersions}
        </button>

        {dropdownOpen && (
          <div className="version-dropdown" role="listbox" aria-label="Versions">
            {versionEntries.map((entry) => (
              <button
                key={entry.stackIndex}
                className={`version-entry${entry.stackIndex === -1 ? ' version-entry--current' : ''}`}
                role="option"
                aria-selected={entry.stackIndex === -1}
                onClick={() => {
                  if (entry.stackIndex !== -1) restoreVersion(entry.stackIndex)
                  setDropdownOpen(false)
                }}
                disabled={entry.stackIndex === -1}
                title={entry.stackIndex === -1 ? 'Current version' : `Restore to ${entry.label}`}
              >
                <span className="version-entry__label">{entry.label}</span>
                <span className="version-entry__time">{relativeTime(entry.timestamp)}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
