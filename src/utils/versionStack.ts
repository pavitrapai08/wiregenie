import type { SessionVersion, WireframeLayout } from '../types/index.js'

const MAX_VERSIONS = 20

export function pushVersion(
  stack: SessionVersion[],
  layout: WireframeLayout
): SessionVersion[] {
  const next = [...stack, { layout, timestamp: Date.now() }]
  if (next.length > MAX_VERSIONS) {
    window.dispatchEvent(new CustomEvent('version-stack-pruned'))
    return next.slice(next.length - MAX_VERSIONS)
  }
  return next
}

export function popVersion(stack: SessionVersion[]): {
  stack: SessionVersion[]
  layout: WireframeLayout | null
} {
  if (stack.length === 0) return { stack, layout: null }
  const newStack = stack.slice(0, -1)
  return { stack: newStack, layout: newStack[newStack.length - 1]?.layout ?? null }
}
