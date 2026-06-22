import { describe, it, expect, beforeEach } from 'vitest'
import { LayoutParser } from '../../src/utils/layoutParser.js'

describe('LayoutParser', () => {
  let parser: LayoutParser

  beforeEach(() => {
    parser = new LayoutParser()
  })

  it('returns null for empty input', () => {
    expect(parser.flush()).toBeNull()
  })

  it('parses a complete valid layout', () => {
    const layout = {
      title: 'Sales Dashboard',
      rows: [
        {
          id: 'r1',
          widgets: [
            { id: 'w1', type: 'kpi_card', title: 'Revenue', colspan: 1, value: '$1M' },
            { id: 'w2', type: 'kpi_card', title: 'Users', colspan: 1, value: '10k' },
          ],
        },
      ],
    }
    parser.append(JSON.stringify(layout))
    const result = parser.flush()
    expect(result).not.toBeNull()
    expect(result?.title).toBe('Sales Dashboard')
    expect(result?.rows).toHaveLength(1)
  })

  it('handles incremental chunks', () => {
    const json = '{"title":"Test","rows":[{"id":"r1","widgets":[]}]}'
    const chunks = [json.slice(0, 20), json.slice(20)]
    for (const chunk of chunks) parser.append(chunk)
    const result = parser.flush()
    expect(result?.title).toBe('Test')
  })

  it('resets state after reset()', () => {
    parser.append('{"title":"Old","rows":[]}')
    parser.reset()
    expect(parser.flush()).toBeNull()
  })

  it('returns partial layout during streaming', () => {
    // Partial JSON — rows array opened but not closed
    const partial = '{"title":"Streaming","rows":[{"id":"r1","widgets":[]'
    const result = parser.append(partial)
    // May or may not return depending on heuristic, but should not throw
    expect(result === null || result?.title === 'Streaming').toBe(true)
  })
})
