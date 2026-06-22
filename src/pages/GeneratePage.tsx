import { useRef } from 'react'
import { WireframeCanvas } from '../components/canvas/WireframeCanvas.js'
import { CanvasToolbar } from '../components/canvas/CanvasToolbar.js'
import { InputPanel } from '../components/input/InputPanel.js'
import { SettingsPanel } from '../components/settings/SettingsPanel.js'
import { RefinementChat } from '../components/chat/RefinementChat.js'
import { ExportBar } from '../components/layout/ExportBar.js'
import { useSessionStore } from '../store/useSessionStore.js'
import { useGenerate } from '../hooks/useGenerate.js'
import { useAutoSave } from '../hooks/useAutoSave.js'
import { useUIStore } from '../store/useUIStore.js'

export function GeneratePage() {
  const canvasRef = useRef<HTMLDivElement>(null)
  const { showSettings, setShowSettings } = useUIStore()
  const { generationStatus, activeSessionId, sessions } = useSessionStore()
  const { generate } = useGenerate()

  // Capture thumbnail after each generation
  useAutoSave(canvasRef)

  const isStreaming = generationStatus === 'streaming'
  const session = sessions.find((s) => s.id === activeSessionId)
  const hasLayout = !!session?.layout

  async function handleSubmit(prompt: string, imageBase64?: string) {
    const isRefinement = hasLayout
    await generate(prompt, imageBase64, isRefinement)
  }

  return (
    <>
      <CanvasToolbar
        canvasRef={canvasRef}
        onOpenSettings={() => setShowSettings(true)}
      />

      <ExportBar />

      <div
        ref={canvasRef}
        style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
      >
        <WireframeCanvas />
      </div>

      {hasLayout && <RefinementChat />}

      <InputPanel onSubmit={handleSubmit} disabled={isStreaming} />

      {showSettings && (
        <>
          <div
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.3)', zIndex: 99 }}
            onClick={() => setShowSettings(false)}
            aria-hidden="true"
          />
          <SettingsPanel onClose={() => setShowSettings(false)} />
        </>
      )}
    </>
  )
}
