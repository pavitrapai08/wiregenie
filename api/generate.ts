// Edge Runtime — do NOT import from src/
import { buildSystemPrompt, trimChatHistory } from '../lib/prompts.js'
import type { GenerateRequest } from '../src/types/index.js'

export const config = { runtime: 'edge' }

const ANTHROPIC_API = 'https://api.anthropic.com/v1/messages'
const MODEL = 'claude-sonnet-4-6'
const MAX_TOKENS = 4096

// Rate limit: 10 requests per IP per 60s
async function checkRateLimit(ip: string): Promise<{ limited: boolean; retryAfter?: number }> {
  const kvUrl = process.env.KV_REST_API_URL
  const kvToken = process.env.KV_REST_API_TOKEN
  if (!kvUrl || !kvToken) return { limited: false }

  const key = `rl:${ip}`
  const window = 60

  try {
    const incrRes = await fetch(`${kvUrl}/incr/${key}`, {
      headers: { Authorization: `Bearer ${kvToken}` },
    })
    const { result: count } = (await incrRes.json()) as { result: number }

    if (count === 1) {
      // First request in window — set expiry
      await fetch(`${kvUrl}/expire/${key}/${window}`, {
        headers: { Authorization: `Bearer ${kvToken}` },
      })
    }

    if (count > 10) {
      const ttlRes = await fetch(`${kvUrl}/ttl/${key}`, {
        headers: { Authorization: `Bearer ${kvToken}` },
      })
      const { result: ttl } = (await ttlRes.json()) as { result: number }
      return { limited: true, retryAfter: ttl > 0 ? ttl : window }
    }
  } catch {
    // KV unavailable — fail open
  }

  return { limited: false }
}

// Strip Anthropic SSE envelope, emit only delta.text as plain text
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
          // Malformed JSON in SSE frame — skip
        }
      }
    },
    flush(controller) {
      // Drain any remaining buffer
      if (buffer.startsWith('data: ')) {
        const payload = buffer.slice(6).trim()
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
            controller.enqueue(new TextEncoder().encode(parsed.delta.text))
          }
        } catch {
          // ignore
        }
      }
    },
  })
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  // Rate limiting
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    req.headers.get('x-real-ip') ??
    '127.0.0.1'

  const { limited, retryAfter } = await checkRateLimit(ip)
  if (limited) {
    return new Response(
      JSON.stringify({ error: 'rate_limited', retryAfter }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': String(retryAfter ?? 60),
        },
      }
    )
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return new Response('Server configuration error', { status: 500 })
  }

  let body: GenerateRequest
  try {
    body = (await req.json()) as GenerateRequest
  } catch {
    return new Response('Invalid JSON body', { status: 400 })
  }

  const { prompt, imageBase64, chatHistory = [], isRefinement, currentLayout } = body

  if (!prompt?.trim()) {
    return new Response('prompt is required', { status: 400 })
  }

  const { trimmedHistory, summaryPrefix } = trimChatHistory(chatHistory)
  const systemPrompt =
    summaryPrefix + buildSystemPrompt(isRefinement)

  // Build Anthropic messages
  const messages: Array<{
    role: 'user' | 'assistant'
    content: string | Array<{ type: string; source?: unknown; text?: string }>
  }> = [
    ...trimmedHistory.map((m) => ({ role: m.role, content: m.content })),
  ]

  // Current message — may include image
  if (imageBase64) {
    messages.push({
      role: 'user',
      content: [
        {
          type: 'image',
          source: { type: 'base64', media_type: 'image/jpeg', data: imageBase64 },
        },
        { type: 'text', text: prompt },
      ],
    })
  } else if (isRefinement && currentLayout) {
    messages.push({
      role: 'user',
      content: `Current layout:\n${JSON.stringify(currentLayout, null, 2)}\n\nRefinement request: ${prompt}`,
    })
  } else {
    messages.push({ role: 'user', content: prompt })
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
      system: systemPrompt,
      messages,
      stream: true,
    }),
  })

  if (!anthropicRes.ok) {
    const errText = await anthropicRes.text()
    return new Response(`Anthropic error: ${errText}`, { status: anthropicRes.status })
  }

  if (!anthropicRes.body) {
    return new Response('No response body', { status: 502 })
  }

  const transformed = anthropicRes.body.pipeThrough(makeSSETransform())

  return new Response(transformed, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}
