import { describe, it, expect } from 'vitest'
import { trimChatHistory } from '../../lib/prompts'
import type { ChatMessage } from '../../src/types/index'

function makeHistory(pairs: number): ChatMessage[] {
  const msgs: ChatMessage[] = []
  for (let i = 0; i < pairs; i++) {
    msgs.push({ role: 'user', content: `User message ${i + 1}` })
    msgs.push({ role: 'assistant', content: `Assistant message ${i + 1}` })
  }
  return msgs
}

describe('trimChatHistory', () => {
  it('returns unchanged history when 8 or fewer pairs', () => {
    const history = makeHistory(8)
    const { trimmedHistory, summaryPrefix } = trimChatHistory(history)
    expect(trimmedHistory).toHaveLength(16)
    expect(summaryPrefix).toBe('')
  })

  it('summarises older turns when more than 8 pairs', () => {
    const history = makeHistory(10)
    const { trimmedHistory, summaryPrefix } = trimChatHistory(history)
    // Keeps last 8 pairs = 16 messages
    expect(trimmedHistory).toHaveLength(16)
    // Summary covers the 2 older pairs
    expect(summaryPrefix).toContain('User message 1')
    expect(summaryPrefix).toContain('User message 2')
  })

  it('summary prefix is bullet list format', () => {
    const history = makeHistory(10)
    const { summaryPrefix } = trimChatHistory(history)
    expect(summaryPrefix).toMatch(/\[Earlier conversation summary\]/)
    expect(summaryPrefix).toContain('• User:')
  })

  it('returns empty history and no prefix for 0 messages', () => {
    const { trimmedHistory, summaryPrefix } = trimChatHistory([])
    expect(trimmedHistory).toHaveLength(0)
    expect(summaryPrefix).toBe('')
  })

  it('handles unpaired messages without crashing', () => {
    const history: ChatMessage[] = [{ role: 'user', content: 'Lone message' }]
    const { trimmedHistory, summaryPrefix } = trimChatHistory(history)
    expect(summaryPrefix).toBe('')
    expect(trimmedHistory).toHaveLength(1)
  })
})
