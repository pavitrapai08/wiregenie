import { useState } from 'react'
import { useSessionStore } from '../../store/useSessionStore.js'
import type { WireSession } from '../../types/index.js'

interface Props {
  session: WireSession
  isActive: boolean
}

function relativeTime(ts: number): string {
  const diff = Date.now() - ts
  const m = Math.floor(diff / 60000)
  const h = Math.floor(diff / 3600000)
  const d = Math.floor(diff / 86400000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  if (h < 24) return `${h}h ago`
  return `${d}d ago`
}

export function HistoryItem({ session, isActive }: Props) {
  const {
    setActiveSession,
    deleteSession,
    duplicateSession,
    renameSession,
    addTag,
    removeTag,
    sessions,
  } = useSessionStore()

  const [editing, setEditing] = useState(false)
  const [nameValue, setNameValue] = useState(session.name)
  const [tagInput, setTagInput] = useState('')
  const [showTags, setShowTags] = useState(false)

  function commitRename() {
    const trimmed = nameValue.trim()
    if (trimmed && trimmed !== session.name) renameSession(session.id, trimmed)
    setEditing(false)
  }

  function handleTagKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      const tag = tagInput.trim()
      if (tag) {
        addTag(session.id, tag)
        setTagInput('')
      }
    }
  }

  return (
    <div
      className={`history-item${isActive ? ' history-item--active' : ''}`}
      onClick={() => setActiveSession(session.id)}
      tabIndex={0}
      role="button"
      aria-pressed={isActive}
      onKeyDown={(e) => e.key === 'Enter' && setActiveSession(session.id)}
    >
      <div className="history-item__thumb">
        {session.thumbnailDataUrl && (
          <img src={session.thumbnailDataUrl} alt="" />
        )}
      </div>

      <div className="history-item__body">
        {editing ? (
          <input
            className="history-item__name-input"
            value={nameValue}
            autoFocus
            onChange={(e) => setNameValue(e.target.value)}
            onBlur={commitRename}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitRename()
              if (e.key === 'Escape') setEditing(false)
            }}
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span
            className="history-item__name"
            onDoubleClick={(e) => {
              e.stopPropagation()
              setEditing(true)
              setNameValue(session.name)
            }}
            title="Double-click to rename"
          >
            {session.name}
          </span>
        )}

        <span className="history-item__time">{relativeTime(session.updatedAt)}</span>

        {session.tags.length > 0 && (
          <div className="history-item__tags">
            {session.tags.map((tag) => (
              <span key={tag} className="tag">
                {tag}
                <button
                  className="tag__remove"
                  onClick={(e) => { e.stopPropagation(); removeTag(session.id, tag) }}
                  aria-label={`Remove tag ${tag}`}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}

        {showTags && (
          <input
            className="tag-input"
            placeholder="Add tag…"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={handleTagKey}
            onBlur={() => setShowTags(false)}
            autoFocus
            onClick={(e) => e.stopPropagation()}
          />
        )}
      </div>

      <div className="history-item__actions" onClick={(e) => e.stopPropagation()}>
        <button
          className="btn btn--icon"
          title="Add tag"
          aria-label="Add tag"
          onClick={() => setShowTags((v) => !v)}
        >
          #
        </button>
        <button
          className="btn btn--icon"
          title="Duplicate session"
          aria-label="Duplicate session"
          onClick={() => duplicateSession(session.id)}
        >
          ⎘
        </button>
        <button
          className="btn btn--icon"
          title="Delete session"
          aria-label={`Delete session ${session.name}`}
          onClick={() => sessions.length > 1 && deleteSession(session.id)}
          disabled={sessions.length <= 1}
        >
          ✕
        </button>
      </div>
    </div>
  )
}
