import { useRef, useState } from 'react'
import { WireframeCanvas } from '../components/canvas/WireframeCanvas.js'
import { CanvasToolbar } from '../components/canvas/CanvasToolbar.js'
import { InputPanel } from '../components/input/InputPanel.js'
import { SettingsPanel } from '../components/settings/SettingsPanel.js'
import { useSessionStore } from '../store/useSessionStore.js'
import { useGenerate } from '../hooks/useGenerate.js'

export function GeneratePage() {
  const canvasRef = useRef<HTMLDivElement>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const { generationStatus, activeSessionId, sessions } = useSessionStore()
  const { generate } = useGenerate()

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
        onOpenSettings={() => setSettingsOpen(true)}
      />

      <div ref={canvasRef} style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <WireframeCanvas />
      </div>

      <InputPanel onSubmit={handleSubmit} disabled={isStreaming} />

      {settingsOpen && (
        <>
          <div
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.3)', zIndex: 99 }}
            onClick={() => setSettingsOpen(false)}
            aria-hidden="true"
          />
          <SettingsPanel onClose={() => setSettingsOpen(false)} />
        </>
      )}
    </>
  )
}
