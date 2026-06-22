import { useRef, useEffect } from 'react'

interface Props {
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  disabled?: boolean
  placeholder?: string
}

export function PromptInput({ value, onChange, onSubmit, disabled, placeholder }: Props) {
  const ref = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 200) + 'px'
  }, [value])

  function handleKeyDown(e: React.KeyboardEvent) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault()
      if (!disabled && value.trim()) onSubmit()
    }
  }

  return (
    <div className="prompt-input">
      <textarea
        ref={ref}
        className="prompt-input__textarea"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        placeholder={placeholder ?? 'Describe your dashboard… (Ctrl+Enter to generate)'}
        rows={2}
        maxLength={2000}
      />
      <div className="prompt-input__footer">
        <span className="prompt-input__count">{value.length}/2000</span>
        <button
          className="btn btn--primary"
          onClick={onSubmit}
          disabled={disabled || !value.trim()}
        >
          {disabled ? 'Generating…' : 'Generate'}
        </button>
      </div>
    </div>
  )
}
