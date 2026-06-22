import LZString from 'lz-string'
import type { WireSession } from '../types/index.js'

const STORAGE_KEY = 'wiregenie_sessions'
const SESSION_CAP = 100

export function loadSessions(): WireSession[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const decompressed = LZString.decompressFromUTF16(raw)
    if (!decompressed) return []
    return JSON.parse(decompressed) as WireSession[]
  } catch {
    return []
  }
}

let _quotaDebounceTimer: ReturnType<typeof setTimeout> | null = null

export function saveSessions(sessions: WireSession[]): void {
  try {
    const compressed = LZString.compressToUTF16(JSON.stringify(sessions))
    localStorage.setItem(STORAGE_KEY, compressed)
  } catch (e) {
    if (e instanceof DOMException && e.name === 'QuotaExceededError') {
      if (_quotaDebounceTimer) clearTimeout(_quotaDebounceTimer)
      _quotaDebounceTimer = setTimeout(() => {
        window.dispatchEvent(new CustomEvent('storage-quota-warning'))
        _quotaDebounceTimer = null
      }, 500)
    }
  }
}

export function checkSessionCap(sessions: WireSession[]): boolean {
  if (sessions.length >= SESSION_CAP) {
    window.dispatchEvent(new CustomEvent('session-cap-warning'))
    return false
  }
  return true
}
