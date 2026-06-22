import { describe, it, expect, beforeEach, vi } from 'vitest'
import { loadSessions, saveSessions, checkSessionCap } from '../../src/utils/storage'
import type { WireSession } from '../../src/types/index'

function makeSession(overrides: Partial<WireSession> = {}): WireSession {
  return {
    id: crypto.randomUUID(),
    name: 'Test',
    layout: null,
    chatHistory: [],
    versionStack: [],
    tags: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...overrides,
  }
}

describe('loadSessions', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  it('returns empty array when nothing stored', () => {
    expect(loadSessions()).toEqual([])
  })

  it('returns empty array on corrupted data', () => {
    localStorage.setItem('wiregenie_sessions', 'not-valid-compressed')
    expect(loadSessions()).toEqual([])
  })

  it('round-trips sessions through saveSessions + loadSessions', () => {
    const sessions = [makeSession({ name: 'A' }), makeSession({ name: 'B' })]
    saveSessions(sessions)
    const loaded = loadSessions()
    expect(loaded).toHaveLength(2)
    expect(loaded[0].name).toBe('A')
    expect(loaded[1].name).toBe('B')
  })
})

describe('checkSessionCap', () => {
  it('returns true when under cap', () => {
    const sessions = Array.from({ length: 99 }, () => makeSession())
    expect(checkSessionCap(sessions)).toBe(true)
  })

  it('returns false and fires event at cap', () => {
    const listener = vi.fn()
    window.addEventListener('session-cap-warning', listener)
    const sessions = Array.from({ length: 100 }, () => makeSession())
    const result = checkSessionCap(sessions)
    expect(result).toBe(false)
    expect(listener).toHaveBeenCalledOnce()
    window.removeEventListener('session-cap-warning', listener)
  })
})
