// Edge Runtime — do NOT import from src/
import type { WireframeLayout } from '../src/types/index.js'

export const config = { runtime: 'edge' }

const ANTHROPIC_API = 'https://api.anthropic.com/v1/messages'
const MODEL = 'claude-sonnet-4-6'
const MAX_TOKENS = 1500

const GUIDE_SYSTEM = `You are a senior front-end developer.
Given a JSON wireframe layout, write a concise Markdown developer guide for implementing it.
Cover: component hierarchy, recommended libraries/patterns, responsive notes, accessibility considerations.
Keep it under 500 words. Output ONLY Markdown — no JSON.`

function makeSSETransform(): TransformStream<Uint8Array, Uint8Array> {
  const decoder = new TextDecoder()
  const encoder = new TextEncoder()
  let buffer = ''

  return new TransformStream({
    transform(chunk, controller) {
      buffer += decoder.decode(chunk, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        const payload = line.slice(6).trim()
        if (payload === '[DONE]') continue
        try {
          const parsed = JSON.parse(payload) as {
            type: string
            delta?: { type: string; text?: string }
          }
          if (
            parsed.type === 'content_block_delta' &&
            parsed.delta?.type === 'text_delta' &&
            parsed.delta.text
          ) {
            controller.enqueue(encoder.encode(parsed.delta.text))
          }
        } catch {
          // skip malformed SSE
        }
      }
    },
  })
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return new Response('Server configuration error', { status: 500 })

  let layout: WireframeLayout
  try {
    layout = (await req.json()) as WireframeLayout
  } catch {
    return new Response('Invalid JSON body', { status: 400 })
  }

  const anthropicRes = await fetch(ANTHROPIC_API, {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: GUIDE_SYSTEM,
      messages: [
        {
          role: 'user',
          content: `Generate a developer guide for this wireframe layout:\n\n${JSON.stringify(layout, null, 2)}`,
        },
      ],
      stream: true,
    }),
  })

  if (!anthropicRes.ok) {
    const errText = await anthropicRes.text()
    return new Response(`Anthropic error: ${errText}`, { status: anthropicRes.status })
  }

  if (!anthropicRes.body) return new Response('No response body', { status: 502 })

  return new Response(anthropicRes.body.pipeThrough(makeSSETransform()), {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache',
    },
  })
}
