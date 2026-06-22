// Shared widget type list — importable from both Edge Runtime (api/) and browser (src/)
// Keep this file dependency-free (no React, no DOM APIs)

export const WIDGET_TYPES = [
  'kpi_card',
  'line_chart',
  'bar_chart',
  'horizontal_bar',
  'donut_chart',
  'funnel_chart',
  'scatter_plot',
  'heatmap',
  'waterfall_chart',
  'gauge_arc',
  'data_table',
  'sparkline_row',
] as const

export type WidgetType = (typeof WIDGET_TYPES)[number]

export function isValidWidgetType(t: unknown): t is WidgetType {
  return typeof t === 'string' && (WIDGET_TYPES as readonly string[]).includes(t)
}
