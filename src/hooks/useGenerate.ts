import { useCallback } from 'react'
import { useSessionStore } from '../store/useSessionStore.js'
import { LayoutParser } from '../utils/layoutParser.js'
import type { WireframeLayout } from '../types/index.js'

export function useGenerate() {
  const {
    activeSessionId,
    sessions,
    setGenerationStatus,
    setStreamingLayout,
    setStreamingError,
    setLayout,
    mergeRefinement,
    appendChat,
  } = useSessionStore()

  const generate = useCallback(
    async (prompt: string, imageBase64?: string, isRefinement = false) => {
      if (!activeSessionId) return

      const session = sessions.find((s) => s.id === activeSessionId)
      if (!session) return

      setGenerationStatus('streaming')
      setStreamingLayout(null)
      setStreamingError(null)

      appendChat(activeSessionId, { role: 'user', content: prompt })

      const parser = new LayoutParser()

      try {
        const res = await fetch('/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt,
            imageBase64,
            chatHistory: session.chatHistory,
            isRefinement,
            currentLayout: isRefinement ? session.layout : undefined,
          }),
        })

        if (res.status === 429) {
          const data = (await res.json()) as { retryAfter?: number }
          const msg = `Rate limit exceeded. Retry after ${data.retryAfter ?? 60}s.`
          setStreamingError(msg)
          setGenerationStatus('error')
          return
        }

        if (!res.ok) {
          const text = await res.text()
          setStreamingError(text || 'Generation failed')
          setGenerationStatus('error')
          return
        }

        if (!res.body) {
          setStreamingError('No response body')
          setGenerationStatus('error')
          return
        }

        const reader = res.body.getReader()
        const decoder = new TextDecoder()

        let readResult = await reader.read()
        while (!readResult.done) {
          const chunk = decoder.decode(readResult.value, { stream: true })
          const partial = parser.append(chunk)
          if (partial) setStreamingLayout(partial)
          readResult = await reader.read()
        }

        const final = parser.flush()

        if (final) {
          if (isRefinement) {
            mergeRefinement(activeSessionId, { rows: final.rows })
          } else {
            setLayout(activeSessionId, final)
          }
          appendChat(activeSessionId, {
            role: 'assistant',
            content: `Generated layout: "${final.title}" with ${final.rows.length} rows`,
          })
          setGenerationStatus('complete')
        } else {
          setStreamingError('Could not parse response as a valid layout')
          setGenerationStatus('error')
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Network error'
        setStreamingError(msg)
        setGenerationStatus('error')
      } finally {
        setStreamingLayout(null)
        parser.reset()
      }
    },
    [
      activeSessionId,
      sessions,
      setGenerationStatus,
      setStreamingLayout,
      setStreamingError,
      setLayout,
      mergeRefinement,
      appendChat,
    ]
  )

  const getGuide = useCallback(
    async (layout: WireframeLayout): Promise<string> => {
      const res = await fetch('/api/guide', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(layout),
      })

      if (!res.ok || !res.body) return 'Failed to generate guide.'

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let guide = ''

      let readResult = await reader.read()
      while (!readResult.done) {
        guide += decoder.decode(readResult.value, { stream: true })
        readResult = await reader.read()
      }

      return guide
    },
    []
  )

  return { generate, getGuide }
}
