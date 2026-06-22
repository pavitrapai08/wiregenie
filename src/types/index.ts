// ─── Widget types ────────────────────────────────────────────────────────────

export type WidgetType =
  | 'kpi_card'
  | 'line_chart'
  | 'bar_chart'
  | 'horizontal_bar'
  | 'donut_chart'
  | 'funnel_chart'
  | 'scatter_plot'
  | 'heatmap'
  | 'waterfall_chart'
  | 'gauge_arc'
  | 'data_table'
  | 'sparkline_row'

export interface BaseWidget {
  id: string
  type: WidgetType
  title: string
  colspan: 1 | 2
}

export interface KpiCardWidget extends BaseWidget {
  type: 'kpi_card'
  value: string
  delta?: string
  deltaPositive?: boolean
  sparklineData?: number[]
}

export interface LineChartWidget extends BaseWidget {
  type: 'line_chart'
  xLabels: string[]
  series: Array<{ name: string; values: number[] }>
}

export interface BarChartWidget extends BaseWidget {
  type: 'bar_chart'
  labels: string[]
  series: Array<{ name: string; values: number[] }>
  stacked?: boolean
}

export interface HorizontalBarWidget extends BaseWidget {
  type: 'horizontal_bar'
  rows: Array<{ label: string; value: number; max?: number }>
}

export interface DonutChartWidget extends BaseWidget {
  type: 'donut_chart'
  segments: Array<{ label: string; value: number }>
  centerLabel?: string
}

export interface FunnelChartWidget extends BaseWidget {
  type: 'funnel_chart'
  stages: Array<{ label: string; value: number }>
}

export interface ScatterPlotWidget extends BaseWidget {
  type: 'scatter_plot'
  xLabel?: string
  yLabel?: string
  points: Array<{ x: number; y: number; label?: string }>
}

export interface HeatmapWidget extends BaseWidget {
  type: 'heatmap'
  xLabels: string[]
  yLabels: string[]
  values: number[][]
}

export interface WaterfallChartWidget extends BaseWidget {
  type: 'waterfall_chart'
  items: Array<{ label: string; value: number; isTotal?: boolean }>
}

export interface GaugeArcWidget extends BaseWidget {
  type: 'gauge_arc'
  value: number
  min?: number
  max?: number
  unit?: string
  zones?: Array<{ from: number; to: number; color: string }>
}

export interface DataTableWidget extends BaseWidget {
  type: 'data_table'
  columns: string[]
  rows: (string | number)[][]
}

export interface SparklineRowWidget extends BaseWidget {
  type: 'sparkline_row'
  metrics: Array<{ label: string; value: string; trend: number[] }>
}

export type WidgetDef =
  | KpiCardWidget
  | LineChartWidget
  | BarChartWidget
  | HorizontalBarWidget
  | DonutChartWidget
  | FunnelChartWidget
  | ScatterPlotWidget
  | HeatmapWidget
  | WaterfallChartWidget
  | GaugeArcWidget
  | DataTableWidget
  | SparklineRowWidget

// ─── Layout ──────────────────────────────────────────────────────────────────

export interface WireframeRow {
  id: string
  widgets: WidgetDef[]
}

export interface WireframeLayout {
  title: string
  description?: string
  rows: WireframeRow[]
}

// ─── Session / chat ───────────────────────────────────────────────────────────

export type ChatRole = 'user' | 'assistant'

export interface ChatMessage {
  role: ChatRole
  content: string
}

export interface SessionVersion {
  layout: WireframeLayout
  timestamp: number
}

export interface WireSession {
  id: string
  name: string
  layout: WireframeLayout | null
  chatHistory: ChatMessage[]
  versionStack: SessionVersion[]
  thumbnailDataUrl?: string
  tags: string[]
  createdAt: number
  updatedAt: number
}

// ─── UI state ────────────────────────────────────────────────────────────────

export type Theme = 'wireframe' | 'dark' | 'blueprint'

export type GenerationStatus = 'idle' | 'streaming' | 'complete' | 'error'

export interface BrandPreset {
  primaryColor: string
  fontFamily: string
  cornerRadius: number
}

// ─── API payloads ────────────────────────────────────────────────────────────

export interface GenerateRequest {
  prompt: string
  imageBase64?: string
  chatHistory?: ChatMessage[]
  isRefinement?: boolean
  currentLayout?: WireframeLayout
}

export interface RateLimitError {
  error: 'rate_limited'
  retryAfter: number
}

// ─── Storage events ──────────────────────────────────────────────────────────

export type WiregenieEventType =
  | 'session-cap-warning'
  | 'storage-quota-warning'
  | 'version-stack-pruned'

export interface WiregenieEvent extends CustomEvent {
  type: WiregenieEventType
}
