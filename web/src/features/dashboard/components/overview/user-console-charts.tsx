/*
Copyright (C) 2023-2026 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/
import { VChart } from '@visactor/react-vchart'
import { LayoutGrid } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { EmptyState } from '@/components/empty-state'
import { Skeleton } from '@/components/ui/skeleton'
import { useThemeCustomization } from '@/context/theme-customization-provider'
import { useTheme } from '@/context/theme-provider'
import type { QuotaDataItem } from '@/features/dashboard/types'
import { formatQuota } from '@/lib/format'
import { formatChartTime, type TimeGranularity } from '@/lib/time'
import { useThemeRadiusPx } from '@/lib/theme-radius'
import { cn } from '@/lib/utils'
import { VCHART_OPTION } from '@/lib/vchart'

let themeManagerPromise: Promise<
  (typeof import('@visactor/vchart'))['ThemeManager']
> | null = null

type TrendMetric = 'spend' | 'requests'

interface UserConsoleChartsProps {
  data: QuotaDataItem[]
  loading?: boolean
  timeGranularity: TimeGranularity
  rangeLabel: string
}

function ChartBody(props: {
  loading: boolean
  hasData: boolean
  chartKey: string
  spec: Record<string, unknown>
  resolvedTheme: string
  emptyIcon?: typeof LayoutGrid
  emptyTitle: string
}) {
  if (props.loading) {
    return <Skeleton className='h-full w-full rounded-xl' />
  }
  if (!props.hasData) {
    return (
      <div className='flex h-full w-full items-center justify-center'>
        <EmptyState
          icon={props.emptyIcon}
          className='min-h-0 border-0 p-0'
          title={props.emptyTitle}
        />
      </div>
    )
  }
  return (
    <VChart
      key={props.chartKey}
      spec={{
        ...props.spec,
        theme: props.resolvedTheme === 'dark' ? 'dark' : 'light',
        background: 'transparent',
      }}
      option={VCHART_OPTION}
    />
  )
}

function buildTrendSpec(args: {
  data: QuotaDataItem[]
  metric: TrendMetric
  timeGranularity: TimeGranularity
  resolvedTheme: string
  spendLabel: string
  requestsLabel: string
  tokensLabel: string
}) {
  const buckets = new Map<
    string,
    { spend: number; requests: number; tokens: number }
  >()

  for (const item of args.data) {
    const time = formatChartTime(Number(item.created_at) || 0, args.timeGranularity)
    const current = buckets.get(time) ?? { spend: 0, requests: 0, tokens: 0 }
    current.spend += Number(item.quota) || 0
    current.requests += Number(item.count) || 0
    current.tokens += Number(item.token_used) || 0
    buckets.set(time, current)
  }

  const values = [...buckets.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([time, totals]) => ({
      Time: time,
      Spend: totals.spend,
      Requests: totals.requests,
      Tokens: totals.tokens,
      Value: args.metric === 'spend' ? totals.spend : totals.requests,
    }))
  const isDark = args.resolvedTheme === 'dark'
  const palette = isDark
    ? ['#9CC8EE', '#78D0C3']
    : ['#5A86B8', '#3E9B91']
  const color = palette[args.metric === 'spend' ? 0 : 1]
  const tooltipContent = [
    {
      key: args.spendLabel,
      value: (datum: Record<string, unknown>) =>
        formatQuota(Number(datum?.Spend) || 0),
    },
    {
      key: args.requestsLabel,
      value: (datum: Record<string, unknown>) =>
        (Number(datum?.Requests) || 0).toLocaleString(),
    },
    {
      key: args.tokensLabel,
      value: (datum: Record<string, unknown>) =>
        (Number(datum?.Tokens) || 0).toLocaleString(),
    },
  ]

  return {
    type: 'area',
    color: [color],
    data: [{ id: 'trend', values }],
    xField: 'Time',
    yField: 'Value',
    legends: { visible: false },
    point: { visible: false },
    line: {
      style: {
        lineWidth: 2,
        curveType: 'monotone',
      },
    },
    area: {
      style: {
        fillOpacity: isDark ? 0.16 : 0.08,
        curveType: 'monotone',
      },
    },
    axes: [
      { orient: 'bottom', label: { visible: true, flush: false } },
      { orient: 'left', label: { visible: true } },
    ],
    tooltip: {
      style: {
        panel: {
          border: { radius: 12 },
        },
      },
      mark: {
        content: tooltipContent,
      },
      dimension: {
        content: tooltipContent,
      },
    },
    background: { fill: 'transparent' },
    animation: true,
  }
}

const AURORA_RANK_COLORS_LIGHT = [
  '#8FCFC4',
  '#9FBFEA',
  '#B9A9E8',
  '#E5B6A7',
  '#8FC8D8',
  '#D2CC9A',
  '#A8B9E0',
  '#D6A9C2',
  '#A8D0A5',
  '#BDB8D0',
]

const AURORA_RANK_COLORS_DARK = [
  '#8CD8C7',
  '#9FC8F4',
  '#C0AEF2',
  '#E9B9AA',
  '#8BD0E1',
  '#D9D19C',
  '#AFC0EA',
  '#DCAAC5',
  '#A7D9A5',
  '#C2BCD8',
]

function buildModelSpendRankSpec(args: {
  data: QuotaDataItem[]
  resolvedTheme: string
  chartRadius: number
  t: (key: string) => string
}) {
  const { data, resolvedTheme, chartRadius, t } = args
  const otherLabel = t('Other')

  const modelMap = new Map<
    string,
    { quota: number; count: number; tokens: number }
  >()
  let totalQuota = 0

  for (const item of data) {
    const model = item.model_name || 'unknown'
    const quota = Number(item.quota) || 0
    const count = Number(item.count) || 0
    const tokens = Number(item.token_used) || 0
    totalQuota += quota
    const cur = modelMap.get(model) ?? { quota: 0, count: 0, tokens: 0 }
    cur.quota += quota
    cur.count += count
    cur.tokens += tokens
    modelMap.set(model, cur)
  }

  const isSpend = totalQuota > 0
  const sorted = [...modelMap.entries()]
    .map(([model, stats]) => ({
      Model: model,
      Quota: stats.quota,
      Count: stats.count,
      Tokens: stats.tokens,
      Value: isSpend ? stats.quota : stats.count,
    }))
    .sort((a, b) => b.Value - a.Value)

  const MAX_MODELS = 8
  let values: Array<{
    Model: string
    Quota: number
    Count: number
    Tokens: number
    Value: number
  }>
  if (sorted.length > MAX_MODELS) {
    const top = sorted.slice(0, MAX_MODELS)
    const rest = sorted.slice(MAX_MODELS)
    const restQuota = rest.reduce((sum, item) => sum + item.Quota, 0)
    const restCount = rest.reduce((sum, item) => sum + item.Count, 0)
    const restTokens = rest.reduce((sum, item) => sum + item.Tokens, 0)
    values = [
      ...top,
      {
        Model: otherLabel,
        Quota: restQuota,
        Count: restCount,
        Tokens: restTokens,
        Value: isSpend ? restQuota : restCount,
      },
    ]
  } else {
    values = sorted
  }

  const modelNames = values.map((v) => v.Model)
  const isDark = resolvedTheme === 'dark'
  const palette = isDark
    ? AURORA_RANK_COLORS_DARK
    : AURORA_RANK_COLORS_LIGHT
  const colorRange = values.map((item, index) =>
    item.Model === otherLabel
      ? (palette.at(-1) ?? palette.at(0) ?? '')
      : (palette.at(index % (palette.length - 1)) ?? palette.at(0) ?? '')
  )
  const textColor = isDark
    ? 'rgba(255, 255, 255, 0.65)'
    : 'rgba(15, 23, 42, 0.65)'
  const axisLineColor = isDark
    ? 'rgba(255, 255, 255, 0.1)'
    : 'rgba(15, 23, 42, 0.08)'
  const gridLineColor = isDark
    ? 'rgba(255, 255, 255, 0.08)'
    : 'rgba(15, 23, 42, 0.06)'
  const radius = Math.min(Math.max(chartRadius || 4, 3), 8)
  const tooltipContent = [
    {
      key: t('Spend'),
      value: (datum: Record<string, unknown>) =>
        formatQuota(Number(datum?.Quota) || 0),
    },
    {
      key: t('Requests'),
      value: (datum: Record<string, unknown>) =>
        (Number(datum?.Count) || 0).toLocaleString(),
    },
    {
      key: t('Tokens'),
      value: (datum: Record<string, unknown>) =>
        (Number(datum?.Tokens) || 0).toLocaleString(),
    },
  ]

  return {
    type: 'bar',
    data: [{ id: 'modelSpendRank', values }],
    xField: 'Model',
    yField: 'Value',
    seriesField: 'Model',
    legends: { visible: false },
    color: {
      type: 'ordinal',
      domain: modelNames,
      range: colorRange,
    },
    bar: {
      style: {
        cornerRadius: [radius, radius, 0, 0],
        barMaxWidth: 30,
        barMinWidth: 8,
      },
      state: {
        hover: {
          fillOpacity: 0.82,
          cursor: 'pointer',
        },
      },
    },
    axes: [
      {
        orient: 'bottom',
        label: {
          visible: true,
          autoRotate: true,
          autoHide: true,
          style: {
            fontSize: 11,
            fill: textColor,
          },
        },
        tick: { visible: false },
        domainLine: {
          style: { stroke: axisLineColor },
        },
      },
      {
        orient: 'left',
        label: {
          visible: true,
          style: {
            fontSize: 10,
            fill: textColor,
          },
          formatMethod: (val: number | string) => {
            const num = Number(val) || 0
            return isSpend ? formatQuota(num) : num.toLocaleString()
          },
        },
        grid: {
          visible: true,
          style: {
            lineDash: [3, 3],
            stroke: gridLineColor,
          },
        },
        domainLine: { visible: false },
        tick: { visible: false },
      },
    ],
    tooltip: {
      style: {
        panel: {
          border: { radius: 12 },
        },
      },
      mark: {
        content: tooltipContent,
      },
      dimension: {
        content: tooltipContent,
      },
    },
    background: { fill: 'transparent' },
    animation: true,
  }
}

export function UserConsoleCharts(props: UserConsoleChartsProps) {
  const { t } = useTranslation()
  const { resolvedTheme } = useTheme()
  const { customization } = useThemeCustomization()
  const chartRadius = useThemeRadiusPx(
    '--radius-md',
    `${customization.preset}:${customization.radius}`
  )
  const [metric, setMetric] = useState<TrendMetric>('spend')
  const [themeReady, setThemeReady] = useState(false)
  const themeManagerRef = useRef<
    (typeof import('@visactor/vchart'))['ThemeManager'] | null
  >(null)

  useEffect(() => {
    const updateTheme = async () => {
      setThemeReady(false)
      if (!themeManagerPromise) {
        themeManagerPromise = import('@visactor/vchart').then((m) => m.ThemeManager)
      }
      const ThemeManager = await themeManagerPromise
      themeManagerRef.current = ThemeManager
      ThemeManager.setCurrentTheme(resolvedTheme === 'dark' ? 'dark' : 'light')
      setThemeReady(true)
    }
    void updateTheme()
  }, [resolvedTheme])

  const hasData = props.data.length > 0
  const trendSpec = useMemo(
    () =>
      buildTrendSpec({
        data: props.loading ? [] : props.data,
        metric,
        timeGranularity: props.timeGranularity,
        resolvedTheme,
        spendLabel: t('Spend'),
        requestsLabel: t('Requests'),
        tokensLabel: t('Tokens'),
      }),
    [metric, props.data, props.loading, props.timeGranularity, resolvedTheme, t]
  )
  const rankSpec = useMemo(
    () =>
      buildModelSpendRankSpec({
        data: props.loading ? [] : props.data,
        resolvedTheme,
        chartRadius: chartRadius ?? 4,
        t,
      }),
    [chartRadius, props.data, props.loading, resolvedTheme, t]
  )

  return (
    <div className='grid min-w-0 grid-cols-1 gap-3 @min-[48rem]/console:gap-4 @min-[72rem]/console:grid-cols-[minmax(0,1.4fr)_minmax(18rem,1fr)]'>
      <section className='bg-card min-w-0 overflow-hidden rounded-2xl border'>
        <div className='flex flex-wrap items-start justify-between gap-2 px-3 py-3 @min-[48rem]/console:gap-3 @min-[48rem]/console:px-5'>
          <div>
            <h3 className='text-xs font-semibold @min-[48rem]/console:text-sm'>{t('Usage trend')}</h3>
            <p className='text-muted-foreground mt-0.5 text-[11px] @min-[48rem]/console:text-xs'>{props.rangeLabel}</p>
          </div>
          <div className='bg-muted/70 inline-flex rounded-lg p-0.5'>
            {(['spend', 'requests'] as const).map((item) => (
              <button
                key={item}
                type='button'
                onClick={() => setMetric(item)}
                className={cn(
                  'h-8 rounded-md px-2 text-[11px] font-medium transition-colors @min-[48rem]/console:px-2.5 @min-[48rem]/console:text-xs',
                  metric === item
                    ? 'bg-foreground text-background shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {item === 'spend' ? t('Spend') : t('Requests')}
              </button>
            ))}
          </div>
        </div>
        <div className='h-56 px-2 pb-3 pl-3 @min-[32rem]/console:h-64 @min-[48rem]/console:h-72 @min-[48rem]/console:pr-3 @min-[48rem]/console:pl-5'>
          <ChartBody
            loading={props.loading || !themeReady}
            hasData={hasData}
            chartKey={`${metric}-${props.data.length}-${resolvedTheme}`}
            spec={trendSpec}
            resolvedTheme={resolvedTheme}
            emptyTitle={t('No usage in this range')}
          />
        </div>
      </section>

      <section className='bg-card min-w-0 overflow-hidden rounded-2xl border'>
        <div className='flex flex-wrap items-start justify-between gap-2 px-3 py-3 @min-[48rem]/console:gap-3 @min-[48rem]/console:px-5'>
          <div>
            <h3 className='text-xs font-semibold @min-[48rem]/console:text-sm'>{t('Model spend distribution')}</h3>
            <p className='text-muted-foreground mt-0.5 text-[11px] @min-[48rem]/console:text-xs'>
              {t('Ranked by spend')}
            </p>
          </div>
        </div>
        <div className='h-56 px-2 pb-3 @min-[32rem]/console:h-64 @min-[48rem]/console:h-72'>
          <ChartBody
            loading={props.loading || !themeReady}
            hasData={hasData}
            chartKey={`rank-${props.data.length}-${resolvedTheme}`}
            spec={rankSpec}
            resolvedTheme={resolvedTheme}
            emptyIcon={LayoutGrid}
            emptyTitle={t('No model spend yet')}
          />
        </div>
      </section>
    </div>
  )
}
