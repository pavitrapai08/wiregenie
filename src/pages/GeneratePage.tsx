import { useRef } from 'react'
import { WireframeCanvas } from '../components/canvas/WireframeCanvas.js'
import { CanvasToolbar } from '../components/canvas/CanvasToolbar.js'
import { InputPanel } from '../components/input/InputPanel.js'
import { SettingsPanel } from '../components/settings/SettingsPanel.js'
import { RefinementChat } from '../components/chat/RefinementChat.js'
import { useSessionStore } from '../store/useSessionStore.js'
import { useGenerate } from '../hooks/useGenerate.js'
import { useAutoSave } from '../hooks/useAutoSave.js'
import { useUIStore } from '../store/useUIStore.js'

export function GeneratePage() {
  const canvasRef = useRef<HTMLDivElement>(null)
  const { showSettings, setShowSettings } = useUIStore()
  const { generationStatus, activeSessionId, sessions } = useSessionStore()
  const { generate } = useGenerate()

  useAutoSave(canvasRef)

  const isStreaming = generationStatus === 'streaming'
  const session = sessions.find((s) => s.id === activeSessionId)
  const hasLayout = !!session?.layout

  async function handleSubmit(prompt: string, imageBase64?: string) {
    await generate(prompt, imageBase64, false)
  }

  return (
    <>
      <CanvasToolbar canvasRef={canvasRef} />

      <div
        ref={canvasRef}
        className="canvas-wrapper"
      >
        <WireframeCanvas />
      </div>

      {/* Show RefinementChat once a layout exists, InputPanel only before first generation */}
      {hasLayout
        ? <RefinementChat />
        : <InputPanel onSubmit={handleSubmit} disabled={isStreaming} />
      }

      {showSettings && (
        <>
          <div
            className="settings-overlay"
            onClick={() => setShowSettings(false)}
            aria-hidden="true"
          />
          <SettingsPanel onClose={() => setShowSettings(false)} />
        </>
      )}
    </>
  )
}
