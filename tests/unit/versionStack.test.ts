import { describe, it, expect, vi } from 'vitest'
import { pushVersion, popVersion } from '../../src/utils/versionStack.js'
import type { WireframeLayout } from '../../src/types/index.js'

const makeLayout = (title: string): WireframeLayout => ({ title, rows: [] })

describe('pushVersion', () => {
  it('adds a version to the stack', () => {
    const stack = pushVersion([], makeLayout('v1'))
    expect(stack).toHaveLength(1)
    expect(stack[0].layout.title).toBe('v1')
  })

  it('prunes stack to 20 when exceeded', () => {
    vi.stubGlobal('window', { dispatchEvent: vi.fn() })
    let stack: ReturnType<typeof pushVersion> = []
    for (let i = 0; i < 21; i++) {
      stack = pushVersion(stack, makeLayout(`v${i}`))
    }
    expect(stack).toHaveLength(20)
  })
})

describe('popVersion', () => {
  it('returns null layout for empty stack', () => {
    const { layout } = popVersion([])
    expect(layout).toBeNull()
  })

  it('pops the last entry and returns it', () => {
    const stack = [
      { layout: makeLayout('v1'), timestamp: 1 },
      { layout: makeLayout('v2'), timestamp: 2 },
    ]
    const { stack: next, layout } = popVersion(stack)
    expect(next).toHaveLength(1)
    expect(layout?.title).toBe('v1')
  })
})
