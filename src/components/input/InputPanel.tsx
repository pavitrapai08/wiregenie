import { useState } from 'react'
import { PromptInput } from './PromptInput.js'
import { ImageUpload } from './ImageUpload.js'
import { VoiceInput } from './VoiceInput.js'
import { useUIStore } from '../../store/useUIStore.js'

interface Props {
  onSubmit: (prompt: string, imageBase64?: string) => void
  disabled?: boolean
}

export function InputPanel({ onSubmit, disabled }: Props) {
  const { inputMode, setInputMode } = useUIStore()
  const [prompt, setPrompt] = useState('')
  const [imageBase64, setImageBase64] = useState<string | undefined>()

  function handleSubmit() {
    if (!prompt.trim()) return
    onSubmit(prompt, imageBase64)
    setPrompt('')
    setImageBase64(undefined)
  }

  function handleTranscript(text: string) {
    setPrompt((prev) => (prev ? prev + ' ' + text : text))
  }

  return (
    <div className="input-panel">
      <div className="input-panel__tabs" role="tablist">
        {(['text', 'image', 'voice'] as const).map((mode) => (
          <button
            key={mode}
            role="tab"
            aria-selected={inputMode === mode}
            className={`input-panel__tab${inputMode === mode ? ' input-panel__tab--active' : ''}`}
            onClick={() => setInputMode(mode)}
          >
            {mode === 'text' && '✏️ Text'}
            {mode === 'image' && '🖼 Image'}
            {mode === 'voice' && '🎤 Voice'}
          </button>
        ))}
      </div>

      <div className="input-panel__body">
        {inputMode === 'image' && (
          <ImageUpload
            onImage={setImageBase64}
            onClear={() => setImageBase64(undefined)}
            hasImage={!!imageBase64}
          />
        )}

        {inputMode === 'voice' && (
          <VoiceInput onTranscript={handleTranscript} disabled={disabled} />
        )}

        <PromptInput
          value={prompt}
          onChange={setPrompt}
          onSubmit={handleSubmit}
          disabled={disabled}
          placeholder={
            inputMode === 'image'
              ? 'Describe what to generate from the image… (Ctrl+Enter)'
              : inputMode === 'voice'
              ? 'Edit transcript or add context… (Ctrl+Enter)'
              : 'Describe your dashboard… (Ctrl+Enter)'
          }
        />
      </div>
    </div>
  )
}
