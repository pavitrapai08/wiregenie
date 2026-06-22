import { useRef, useState, useEffect } from 'react'
import { useSessionStore } from '../../store/useSessionStore.js'
import { useGenerate } from '../../hooks/useGenerate.js'
import { QuickPills } from './QuickPills.js'

export function RefinementChat() {
  const { activeSessionId, sessions, generationStatus } = useSessionStore()
  const { generate } = useGenerate()
  const [input, setInput] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const session = sessions.find((s) => s.id === activeSessionId)
  const history = session?.chatHistory ?? []
  const isStreaming = generationStatus === 'streaming'

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [history.length])

  async function handleSubmit() {
    const prompt = input.trim()
    if (!prompt || isStreaming) return
    setInput('')
    await generate(prompt, undefined, true)
  }

  function handleKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void handleSubmit()
    }
  }

  return (
    <div className="refinement-chat">
      {history.length > 0 && (
        <div className="chat-messages" aria-label="Conversation history" aria-live="polite">
          {history.map((msg, i) => (
            <div key={i} className={`chat-message chat-message--${msg.role}`}>
              <span className="chat-message__role">
                {msg.role === 'user' ? 'You' : 'WireGenie'}
              </span>
              <span className="chat-message__text">{msg.content}</span>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      )}

      <QuickPills onSelect={(p) => void generate(p, undefined, true)} disabled={isStreaming} />

      <div className="chat-input-row">
        <textarea
          className="chat-input"
          placeholder="Refine the layout… (Enter to send, Shift+Enter for new line)"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKey}
          disabled={isStreaming}
          rows={2}
          aria-label="Refinement prompt"
        />
        <button
          className="btn btn--primary"
          onClick={() => void handleSubmit()}
          disabled={!input.trim() || isStreaming}
          aria-label="Send refinement"
        >
          {isStreaming ? '…' : '↑'}
        </button>
      </div>
    </div>
  )
}
