import { describe, it, expect } from 'vitest'
import { buildSystemPrompt, trimChatHistory } from '../../lib/prompts.js'
import type { ChatMessage } from '../../src/types/index.js'

describe('buildSystemPrompt', () => {
  it('contains the colspan rule', () => {
    const prompt = buildSystemPrompt()
    expect(prompt).toContain('EXACTLY 2')
  })

  it('includes refinement addendum when isRefinement=true', () => {
    const prompt = buildSystemPrompt(true)
    expect(prompt).toContain('REFINEMENT MODE')
    expect(prompt).toContain('merge')
  })

  it('does not include refinement text by default', () => {
    const prompt = buildSystemPrompt()
    expect(prompt).not.toContain('REFINEMENT MODE')
  })
})

describe('trimChatHistory', () => {
  it('returns history unchanged when under limit', () => {
    const history: ChatMessage[] = [
      { role: 'user', content: 'hello' },
      { role: 'assistant', content: 'hi' },
    ]
    const { trimmedHistory, summaryPrefix } = trimChatHistory(history)
    expect(trimmedHistory).toHaveLength(2)
    expect(summaryPrefix).toBe('')
  })

  it('trims and summarises history over 8 pairs', () => {
    const history: ChatMessage[] = []
    for (let i = 0; i < 10; i++) {
      history.push({ role: 'user', content: `q${i}` })
      history.push({ role: 'assistant', content: `a${i}` })
    }
    const { trimmedHistory, summaryPrefix } = trimChatHistory(history)
    // 2 pairs summarised, 8 pairs kept = 16 messages
    expect(trimmedHistory).toHaveLength(16)
    expect(summaryPrefix).toContain('Earlier conversation summary')
    expect(summaryPrefix).toContain('q0')
  })
})
