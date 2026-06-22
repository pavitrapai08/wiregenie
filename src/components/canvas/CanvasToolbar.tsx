import { useRef } from 'react'
import html2canvas from 'html2canvas'
import { saveAs } from 'file-saver'
import { useSessionStore } from '../../store/useSessionStore.js'
import { useGenerate } from '../../hooks/useGenerate.js'

interface Props {
  canvasRef?: React.RefObject<HTMLElement>
  onOpenSettings: () => void
}

export function CanvasToolbar({ canvasRef, onOpenSettings }: Props) {
  const { activeSessionId, sessions, undo, generationStatus } = useSessionStore()
  const { getGuide } = useGenerate()
  const guideBtnRef = useRef<HTMLButtonElement>(null)

  const session = sessions.find((s) => s.id === activeSessionId)
  const hasLayout = !!session?.layout
  const hasHistory = (session?.versionStack.length ?? 0) > 0
  const isStreaming = generationStatus === 'streaming'

  async function handleExportPng() {
    if (!canvasRef?.current || !hasLayout) return
    try {
      const canvas = await html2canvas(canvasRef.current, {
        backgroundColor: window.getComputedStyle(document.body).getPropertyValue('--color-bg') || '#ffffff',
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
      <button
        className="btn btn--icon"
        title="Undo"
        disabled={!hasHistory || isStreaming}
        onClick={() => activeSessionId && undo(activeSessionId)}
        aria-label="Undo"
      >
        ↩
      </button>

      <div className="canvas-toolbar__sep" />

      <button
        className="btn"
        disabled={!hasLayout || isStreaming}
        onClick={handleExportPng}
        title="Export as PNG"
      >
        ↓ PNG
      </button>

      <button
        ref={guideBtnRef}
        className="btn"
        disabled={!hasLayout || isStreaming}
        onClick={handleDevGuide}
        title="Download developer guide as Markdown"
      >
        📄 Dev Guide
      </button>

      <div style={{ flex: 1 }} />

      <button
        className="btn"
        onClick={onOpenSettings}
        title="Settings"
        aria-label="Open settings"
      >
        ⚙ Settings
      </button>
    </div>
  )
}
