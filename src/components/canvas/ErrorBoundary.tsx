import { Component, type ReactNode, type ErrorInfo } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  widgetId?: string
}

interface State {
  hasError: boolean
  message: string
}

export class WidgetErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: '' }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(`[WireGenie] Widget ${this.props.widgetId} error:`, error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div className="widget-error" role="alert">
            <span>⚠️</span>
            <span>Widget unavailable</span>
          </div>
        )
      )
    }
    return this.props.children
  }
}
