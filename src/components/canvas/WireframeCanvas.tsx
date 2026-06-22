import { useSessionStore } from '../../store/useSessionStore.js'
import { useUIStore } from '../../store/useUIStore.js'
import { WidgetRenderer } from '../widgets/WidgetRenderer.js'
import { WidgetErrorBoundary } from './ErrorBoundary.js'
import type { WireframeLayout } from '../../types/index.js'

function SkeletonRow() {
  return (
    <div className="canvas-row">
      <div className="skeleton" style={{ height: 180, borderRadius: 8 }} />
      <div className="skeleton" style={{ height: 180, borderRadius: 8 }} />
    </div>
  )
}

function EmptyState() {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      flex: 1,
      gap: 12,
      color: 'var(--color-text-muted)',
      padding: 40,
    }}>
      <div style={{ fontSize: 48 }}>✦</div>
      <div style={{ fontSize: 'var(--font-size-lg)', fontWeight: 600, color: 'var(--color-text)' }}>
        Describe your dashboard
      </div>
      <div style={{ fontSize: 'var(--font-size-md)', textAlign: 'center', maxWidth: 400 }}>
        Type a prompt below to generate a wireframe. Add an image for context, or speak your idea aloud.
      </div>
    </div>
  )
}

export function WireframeCanvas() {
  const { activeSessionId, sessions, generationStatus, streamingLayout } = useSessionStore()
  const { hiddenWidgetTypes } = useUIStore()

  const session = sessions.find((s) => s.id === activeSessionId)
  const isStreaming = generationStatus === 'streaming'

  const layout: WireframeLayout | null =
    isStreaming && streamingLayout ? streamingLayout : session?.layout ?? null

  if (!layout && !isStreaming) {
    return (
      <div className="canvas-area" style={{ justifyContent: 'center' }}>
        <EmptyState />
      </div>
    )
  }

  const filteredRows = (layout?.rows ?? [])
    .map((row) => ({
      ...row,
      widgets: row.widgets.filter((w) => !hiddenWidgetTypes.has(w.type)),
    }))
    .filter((row) => row.widgets.length > 0)

  return (
    <div className="canvas-area">
      {layout?.title && (
        <h1 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700, marginBottom: 4 }}>
          {layout.title}
        </h1>
      )}
      {layout?.description && (
        <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)', marginBottom: 8 }}>
          {layout.description}
        </p>
      )}

      {filteredRows.map((row) => (
        <div key={row.id} className="canvas-row">
          {row.widgets.map((widget) => (
            <div
              key={widget.id}
              className={widget.colspan === 2 ? 'canvas-row__widget--span2' : undefined}
              style={{ height: '100%' }}
            >
              <WidgetErrorBoundary widgetId={widget.id}>
                <WidgetRenderer widget={widget} />
              </WidgetErrorBoundary>
            </div>
          ))}
        </div>
      ))}

      {isStreaming && (
        <>
          <SkeletonRow />
          <SkeletonRow />
        </>
      )}
    </div>
  )
}
