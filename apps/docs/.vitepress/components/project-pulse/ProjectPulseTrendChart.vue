<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'

type DataPoint = {
  key: string
  label: string
  value: number
}

type TrendChartCopy = {
  latest: string
  total: string
  peak: string
  low: string
  hoverHint: string
}

type EChartsModule = typeof import('echarts')

const props = defineProps<{
  series: DataPoint[]
  accentStart: string
  accentEnd: string
  locale: 'en' | 'zh'
  valueUnit: string
  deltaLabel: string
  windowLabel: string
  copy: TrendChartCopy
}>()

const chartElement = ref<HTMLElement | null>(null)

let chart: import('echarts').ECharts | null = null
let resizeObserver: ResizeObserver | null = null
let echartsLoader: Promise<EChartsModule> | null = null

const localeCode = computed(() => (props.locale === 'zh' ? 'zh-CN' : 'en-US'))

const compactFormatter = computed(
  () =>
    new Intl.NumberFormat(localeCode.value, {
      notation: 'compact',
      maximumFractionDigits: 1
    })
)

const fullFormatter = computed(
  () =>
    new Intl.NumberFormat(localeCode.value, {
      maximumFractionDigits: 0
    })
)

const latestPoint = computed(() => props.series[props.series.length - 1] ?? null)
const previousPoint = computed(() => props.series[props.series.length - 2] ?? null)
const startingPoint = computed(() => props.series[0] ?? null)

const peakPoint = computed(() => {
  if (props.series.length === 0) {
    return null
  }

  return props.series.reduce((peak, point) => (point.value >= peak.value ? point : peak))
})

const lowPoint = computed(() => {
  if (props.series.length === 0) {
    return null
  }

  return props.series.reduce((low, point) => (point.value <= low.value ? point : low))
})

const deltaValue = computed(() => {
  if (!latestPoint.value || !previousPoint.value) {
    return null
  }

  return latestPoint.value.value - previousPoint.value.value
})

const totalValue = computed(() => {
  if (!latestPoint.value || !startingPoint.value) {
    return null
  }

  return latestPoint.value.value - startingPoint.value.value
})

const visibleAxisIndices = computed(() => {
  if (props.series.length <= 3) {
    return new Set(props.series.map((_, index) => index))
  }

  const middleIndex = Math.floor((props.series.length - 1) / 2)
  return new Set([0, middleIndex, props.series.length - 1])
})

const chartAriaLabel = computed(() => {
  if (!latestPoint.value) {
    return props.windowLabel
  }

  return `${props.windowLabel}, ${props.copy.latest} ${fullFormatter.value.format(latestPoint.value.value)} ${props.valueUnit}`
})

const formatDelta = (value: number | null) => {
  if (value === null) {
    return 'N/A'
  }

  const sign = value > 0 ? '+' : ''
  return `${sign}${compactFormatter.value.format(value)}`
}

const formatTrendTone = (value: number | null) => {
  if (value === null) {
    return 'trend-chart__pill-value--neutral'
  }

  if (value > 0) {
    return 'trend-chart__pill-value--positive'
  }

  if (value < 0) {
    return 'trend-chart__pill-value--negative'
  }

  return 'trend-chart__pill-value--neutral'
}

const loadECharts = () => {
  echartsLoader ??= import('echarts')
  return echartsLoader
}

const renderChart = async () => {
  if (!chartElement.value || props.series.length === 0) {
    chart?.clear()
    return
  }

  const echarts = await loadECharts()

  if (!chart) {
    chart = echarts.init(chartElement.value, undefined, {
      renderer: 'svg'
    })
  }

  const values = props.series.map((item) => item.value)
  const categories = props.series.map((item) => item.label)
  const minValue = Math.min(...values)
  const maxValue = Math.max(...values)
  const range = maxValue - minValue
  const padding = range === 0 ? Math.max(1, Math.round(maxValue * 0.12) || 1) : range * 0.16
  const yMin = Math.max(0, minValue - padding)
  const yMax = maxValue + padding
  const latest = latestPoint.value

  chart.setOption(
    {
      animationDuration: 560,
      animationEasing: 'cubicOut',
      aria: {
        enabled: true
      },
      grid: {
        left: 12,
        right: 12,
        top: 20,
        bottom: 26,
        containLabel: true
      },
      tooltip: {
        trigger: 'axis',
        triggerOn: 'mousemove|click',
        confine: true,
        appendToBody: false,
        borderWidth: 0,
        padding: [10, 12],
        backgroundColor: 'rgba(8, 15, 28, 0.92)',
        textStyle: {
          color: '#f8fafc',
          fontSize: 12
        },
        extraCssText: 'border-radius: 16px; box-shadow: 0 22px 40px rgba(2, 6, 23, 0.28);',
        axisPointer: {
          type: 'line',
          lineStyle: {
            color: 'rgba(16, 34, 52, 0.22)',
            width: 1
          },
          label: {
            show: false
          }
        },
        formatter: (params: unknown) => {
          const point = Array.isArray(params) ? params[0] : params

          if (!point || typeof point !== 'object' || !('dataIndex' in point)) {
            return ''
          }

          const dataIndex = typeof point.dataIndex === 'number' ? point.dataIndex : 0
          const item = props.series[dataIndex]

          if (!item) {
            return ''
          }

          return [
            '<div style="display:grid;gap:4px;min-width:132px;">',
            `<span style="font-size:11px;color:rgba(226,232,240,0.72);">${item.label}</span>`,
            `<strong style="font-size:18px;letter-spacing:-0.04em;">${fullFormatter.value.format(item.value)}</strong>`,
            `<span style="font-size:11px;color:rgba(226,232,240,0.78);">${props.valueUnit}</span>`,
            '</div>'
          ].join('')
        }
      },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: categories,
        axisLine: {
          show: false
        },
        axisTick: {
          show: false
        },
        axisLabel: {
          color: 'rgba(16, 34, 52, 0.56)',
          margin: 14,
          hideOverlap: true,
          formatter: (value: string, index: number) =>
            visibleAxisIndices.value.has(index) ? value : ''
        },
        splitLine: {
          show: false
        }
      },
      yAxis: {
        type: 'value',
        min: yMin,
        max: yMax,
        splitNumber: 2,
        axisLine: {
          show: false
        },
        axisTick: {
          show: false
        },
        axisLabel: {
          color: 'rgba(16, 34, 52, 0.56)',
          margin: 12,
          formatter: (value: number) => compactFormatter.value.format(value)
        },
        splitLine: {
          lineStyle: {
            color: 'rgba(16, 34, 52, 0.1)'
          }
        }
      },
      series: [
        {
          type: 'line',
          smooth: 0.28,
          data: values,
          symbol: 'circle',
          symbolSize: 7,
          showSymbol: false,
          lineStyle: {
            width: 3,
            color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
              { offset: 0, color: props.accentStart },
              { offset: 1, color: props.accentEnd }
            ])
          },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: `${props.accentStart}66` },
              { offset: 1, color: `${props.accentEnd}08` }
            ])
          },
          itemStyle: {
            color: props.accentStart,
            borderWidth: 2,
            borderColor: '#ffffff'
          },
          emphasis: {
            focus: 'series',
            scale: true
          },
          markPoint: latest
            ? {
                animation: false,
                symbol: 'circle',
                symbolSize: 13,
                label: {
                  show: false
                },
                itemStyle: {
                  color: props.accentStart,
                  borderColor: '#ffffff',
                  borderWidth: 3,
                  shadowBlur: 16,
                  shadowColor: `${props.accentStart}55`
                },
                data: [
                  {
                    coord: [latest.label, latest.value]
                  }
                ]
              }
            : undefined
        }
      ]
    },
    true
  )
}

onMounted(async () => {
  await renderChart()

  if (chartElement.value && typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver(() => {
      chart?.resize()
    })
    resizeObserver.observe(chartElement.value)
  }
})

watch(
  () => [
    props.series,
    props.locale,
    props.accentStart,
    props.accentEnd,
    props.valueUnit,
    props.deltaLabel,
    props.windowLabel,
    props.copy.latest,
    props.copy.total,
    props.copy.peak,
    props.copy.low,
    props.copy.hoverHint
  ],
  () => {
    void renderChart()
  },
  { deep: true }
)

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
  resizeObserver = null
  chart?.dispose()
  chart = null
})
</script>

<template>
  <div class="trend-chart">
    <div class="trend-chart__summary">
      <div class="trend-chart__summary-primary">
        <span class="trend-chart__summary-kicker">{{ copy.latest }}</span>
        <div class="trend-chart__summary-value">
          <strong>{{ latestPoint ? fullFormatter.format(latestPoint.value) : 'N/A' }}</strong>
          <span>{{ valueUnit }}</span>
        </div>
        <span class="trend-chart__summary-context">{{ windowLabel }}</span>
      </div>

      <div class="trend-chart__summary-pills">
        <span class="trend-chart__pill">
          <strong :class="['trend-chart__pill-value', formatTrendTone(deltaValue)]">
            {{ formatDelta(deltaValue) }}
          </strong>
          <span>{{ deltaLabel }}</span>
        </span>

        <span class="trend-chart__pill">
          <strong :class="['trend-chart__pill-value', formatTrendTone(totalValue)]">
            {{ formatDelta(totalValue) }}
          </strong>
          <span>{{ copy.total }}</span>
        </span>

        <span class="trend-chart__pill">
          <strong class="trend-chart__pill-value">
            {{ peakPoint ? compactFormatter.format(peakPoint.value) : 'N/A' }}
          </strong>
          <span>{{ copy.peak }}</span>
        </span>
      </div>
    </div>

    <div class="trend-chart__frame">
      <div
        ref="chartElement"
        class="trend-chart__canvas"
        role="img"
        :aria-label="chartAriaLabel"
      />
    </div>

    <div class="trend-chart__footer">
      <span>
        {{ copy.low }}
        {{ lowPoint ? compactFormatter.format(lowPoint.value) : 'N/A' }}
      </span>
      <span>{{ copy.hoverHint }}</span>
    </div>
  </div>
</template>

<style scoped>
.trend-chart {
  display: grid;
  gap: 0.95rem;
}

.trend-chart__summary {
  display: grid;
  gap: 0.9rem;
}

.trend-chart__summary-primary {
  display: grid;
  gap: 0.38rem;
}

.trend-chart__summary-kicker,
.trend-chart__summary-context,
.trend-chart__pill span,
.trend-chart__footer {
  color: rgba(16, 34, 52, 0.6);
}

.trend-chart__summary-kicker {
  font-size: 0.75rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.trend-chart__summary-value {
  display: flex;
  align-items: baseline;
  gap: 0.55rem;
  color: #102234;
}

.trend-chart__summary-value strong {
  font-size: clamp(2rem, 4vw, 2.8rem);
  line-height: 0.95;
  letter-spacing: -0.06em;
}

.trend-chart__summary-value span {
  font-size: 0.92rem;
  text-transform: uppercase;
  letter-spacing: 0.12em;
}

.trend-chart__summary-context {
  font-size: 0.82rem;
}

.trend-chart__summary-pills {
  display: grid;
  gap: 0.7rem;
  grid-template-columns: repeat(auto-fit, minmax(10rem, 1fr));
}

.trend-chart__pill {
  display: grid;
  gap: 0.2rem;
  padding: 0.7rem 0.85rem;
  border-radius: 16px;
  border: 1px solid rgba(16, 34, 52, 0.08);
  background: rgba(255, 255, 255, 0.76);
}

.trend-chart__pill span {
  font-size: 0.76rem;
  line-height: 1.45;
}

.trend-chart__pill-value {
  font-size: 1.02rem;
  color: #102234;
}

.trend-chart__pill-value--positive {
  color: #0f766e;
}

.trend-chart__pill-value--negative {
  color: #c2410c;
}

.trend-chart__pill-value--neutral {
  color: #102234;
}

.trend-chart__frame {
  position: relative;
  overflow: hidden;
  border-radius: 22px;
  border: 1px solid rgba(16, 34, 52, 0.08);
  background:
    radial-gradient(circle at top left, rgba(249, 115, 22, 0.08), transparent 36%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.88), rgba(245, 249, 252, 0.94));
}

.trend-chart__canvas {
  width: 100%;
  height: 18rem;
}

.trend-chart__footer {
  display: flex;
  justify-content: space-between;
  gap: 0.85rem;
  font-size: 0.79rem;
  line-height: 1.6;
}

@media (max-width: 640px) {
  .trend-chart__summary-pills {
    grid-template-columns: 1fr;
  }

  .trend-chart__canvas {
    height: 15rem;
  }

  .trend-chart__footer {
    display: grid;
  }
}
</style>
