import { useRef, useState, useEffect } from 'react'
import html2canvas from 'html2canvas'
import { saveAs } from 'file-saver'
import { useSessionStore } from '../../store/useSessionStore.js'
import { useGenerate } from '../../hooks/useGenerate.js'
import { useVersionStack } from '../../hooks/useVersionStack.js'

interface Props {
  canvasRef?: React.RefObject<HTMLElement | null>
}

function relativeTime(ts: number): string {
  const diff = Date.now() - ts
  const m = Math.floor(diff / 60000)
  const h = Math.floor(diff / 3600000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  if (h < 24) return `${h}h ago`
  return `${Math.floor(diff / 86400000)}d ago`
}

export function CanvasToolbar({ canvasRef }: Props) {
  const { activeSessionId, sessions, generationStatus } = useSessionStore()
  const { getGuide } = useGenerate()
  const { versionEntries, totalVersions, canUndo, undo, restoreVersion } =
    useVersionStack(activeSessionId)
  const guideBtnRef = useRef<HTMLButtonElement>(null)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const session = sessions.find((s) => s.id === activeSessionId)
  const hasLayout = !!session?.layout
  const isStreaming = generationStatus === 'streaming'

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

  async function handleExportPng() {
    if (!canvasRef?.current || !hasLayout) return
    try {
      const canvas = await html2canvas(canvasRef.current, {
        backgroundColor:
          window.getComputedStyle(document.documentElement).getPropertyValue('--color-bg').trim() ||
          '#ffffff',
        scale: 2,
        logging: false,
      })
      canvas.toBlob((blob) => {
        if (blob) saveAs(blob, `${session?.name ?? 'wireframe'}.png`)
      })
    } catch (e) {
      console.error('Export failed:', e)
    }
  }

  function handleExportPdf() {
    window.print()
  }

  async function handleDevGuide() {
    if (!session?.layout) return
    if (guideBtnRef.current) guideBtnRef.current.textContent = 'Generating…'
    const guide = await getGuide(session.layout)
    const blob = new Blob([guide], { type: 'text/markdown' })
    saveAs(blob, `${session.name ?? 'wireframe'}-guide.md`)
    if (guideBtnRef.current) guideBtnRef.current.textContent = '📄 Dev Guide'
  }

  return (
    <div className="canvas-toolbar" role="toolbar" aria-label="Canvas actions">
      {/* Version controls */}
      <button
        className="btn btn--icon"
        title="Undo last change"
        disabled={!canUndo || isStreaming}
        onClick={() => undo()}
        aria-label="Undo"
      >
        ↩
      </button>

      {totalVersions > 0 && (
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
                >
                  <span className="version-entry__label">{entry.label}</span>
                  <span className="version-entry__time">{relativeTime(entry.timestamp)}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="canvas-toolbar__sep" />

      {/* Exports */}
      <button
        className="btn"
        disabled={!hasLayout || isStreaming}
        onClick={() => void handleExportPng()}
        title="Export as PNG"
      >
        ↓ PNG
      </button>

      <button
        className="btn"
        disabled={!hasLayout || isStreaming}
        onClick={handleExportPdf}
        title="Print / Save as PDF"
      >
        ↓ PDF
      </button>

      <button
        ref={guideBtnRef}
        className="btn"
        disabled={!hasLayout || isStreaming}
        onClick={() => void handleDevGuide()}
        title="Download developer guide as Markdown"
      >
        📄 Dev Guide
      </button>

      <div style={{ flex: 1 }} />
    </div>
  )
}
