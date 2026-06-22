import type { WidgetDef } from '../../types/index.js'
import { KpiCard } from './KpiCard.js'
import { LineChart } from './LineChart.js'
import { BarChart } from './BarChart.js'
import { HorizontalBar } from './HorizontalBar.js'
import { DonutChart } from './DonutChart.js'
import { FunnelChart } from './FunnelChart.js'
import { ScatterPlot } from './ScatterPlot.js'
import { Heatmap } from './Heatmap.js'
import { WaterfallChart } from './WaterfallChart.js'
import { GaugeArc } from './GaugeArc.js'
import { DataTable } from './DataTable.js'
import { SparklineRow } from './SparklineRow.js'

interface Props {
  widget: WidgetDef
}

export function WidgetRenderer({ widget }: Props) {
  switch (widget.type) {
    case 'kpi_card':       return <KpiCard widget={widget} />
    case 'line_chart':     return <LineChart widget={widget} />
    case 'bar_chart':      return <BarChart widget={widget} />
    case 'horizontal_bar': return <HorizontalBar widget={widget} />
    case 'donut_chart':    return <DonutChart widget={widget} />
    case 'funnel_chart':   return <FunnelChart widget={widget} />
    case 'scatter_plot':   return <ScatterPlot widget={widget} />
    case 'heatmap':        return <Heatmap widget={widget} />
    case 'waterfall_chart':return <WaterfallChart widget={widget} />
    case 'gauge_arc':      return <GaugeArc widget={widget} />
    case 'data_table':     return <DataTable widget={widget} />
    case 'sparkline_row':  return <SparklineRow widget={widget} />
    default: {
      const _exhaustiveCheck: never = widget
      void _exhaustiveCheck
      return <div className="widget-error">Unknown widget type</div>
    }
  }
}
