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
import { Link } from '@tanstack/react-router'
import { VChart } from '@visactor/react-vchart'
import { LayoutGrid } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { EmptyState } from '@/components/empty-state'
import { Skeleton } from '@/components/ui/skeleton'
import { useThemeCustomization } from '@/context/theme-customization-provider'
import { useTheme } from '@/context/theme-provider'
import { processChartData } from '@/features/dashboard/lib'
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
  emptyDescription: string
}) {
  if (props.loading) {
    return <Skeleton className='h-full w-full rounded-xl' />
  }
  if (!props.hasData) {
    return (
      <EmptyState
        icon={props.emptyIcon}
        className='min-h-full border-0'
        title={props.emptyTitle}
        description={props.emptyDescription}
      />
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
  spendLabel: string
  requestsLabel: string
}) {
  const buckets = new Map<string, { spend: number; requests: number }>()

  for (const item of args.data) {
    const time = formatChartTime(Number(item.created_at) || 0, args.timeGranularity)
    const current = buckets.get(time) ?? { spend: 0, requests: 0 }
    current.spend += Number(item.quota) || 0
    current.requests += Number(item.count) || 0
    buckets.set(time, current)
  }

  const values = [...buckets.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([time, totals]) => ({
      Time: time,
      Value: args.metric === 'spend' ? totals.spend : totals.requests,
    }))

  return {
    type: 'area',
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
        fillOpacity: 0.12,
        curveType: 'monotone',
      },
    },
    axes: [
      { orient: 'bottom', label: { visible: true } },
      { orient: 'left', label: { visible: true } },
    ],
    tooltip: {
      mark: {
        content: [
          {
            key: args.metric === 'spend' ? args.spendLabel : args.requestsLabel,
            value: (datum: Record<string, unknown>) => {
              const value = Number(datum?.Value) || 0
              return args.metric === 'spend' ? formatQuota(value) : value
            },
          },
        ],
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
        spendLabel: t('Spend'),
        requestsLabel: t('Requests'),
      }),
    [metric, props.data, props.loading, props.timeGranularity, t]
  )
  const chartData = useMemo(
    () =>
      processChartData(
        props.loading ? [] : props.data,
        props.timeGranularity,
        t,
        chartRadius
      ),
    [chartRadius, props.data, props.loading, props.timeGranularity, t]
  )
  const rankSpec = useMemo(() => {
    const spec = chartData.spec_rank_bar
    return {
      ...spec,
      title: { visible: false },
      legends: { visible: false },
    }
  }, [chartData.spec_rank_bar])

  return (
    <div className='grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(18rem,1fr)]'>
      <section className='bg-card overflow-hidden rounded-2xl border'>
        <div className='flex flex-wrap items-start justify-between gap-3 px-4 py-3 sm:px-5'>
          <div>
            <h3 className='text-sm font-semibold'>{t('Usage trend')}</h3>
            <p className='text-muted-foreground mt-0.5 text-xs'>{props.rangeLabel}</p>
          </div>
          <div className='bg-muted/70 inline-flex rounded-lg p-0.5'>
            {(['spend', 'requests'] as const).map((item) => (
              <button
                key={item}
                type='button'
                onClick={() => setMetric(item)}
                className={cn(
                  'h-7 rounded-md px-2.5 text-xs font-medium transition-colors',
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
        <div className='h-64 px-2 pb-3 sm:h-72'>
          <ChartBody
            loading={props.loading || !themeReady}
            hasData={hasData}
            chartKey={`${metric}-${props.data.length}-${resolvedTheme}`}
            spec={trendSpec}
            resolvedTheme={resolvedTheme}
            emptyTitle={t('No usage in this range')}
            emptyDescription={t(
              'Change the date range above to inspect another period'
            )}
          />
        </div>
      </section>

      <section className='bg-card overflow-hidden rounded-2xl border'>
        <div className='flex items-start justify-between gap-3 px-4 py-3 sm:px-5'>
          <div>
            <h3 className='text-sm font-semibold'>{t('Model spend distribution')}</h3>
            <p className='text-muted-foreground mt-0.5 text-xs'>
              {t('Ranked by spend')}
            </p>
          </div>
          <Link
            to='/dashboard/$section'
            params={{ section: 'models' }}
            className='text-muted-foreground hover:text-foreground shrink-0 text-xs underline-offset-2 hover:underline'
          >
            {t('30-day details')} →
          </Link>
        </div>
        <div className='h-64 px-2 pb-3 sm:h-72'>
          <ChartBody
            loading={props.loading || !themeReady}
            hasData={hasData}
            chartKey={`rank-${props.data.length}-${resolvedTheme}`}
            spec={rankSpec}
            resolvedTheme={resolvedTheme}
            emptyIcon={LayoutGrid}
            emptyTitle={t('No model spend yet')}
            emptyDescription={t('Spend and request mix by model will appear here')}
          />
        </div>
      </section>
    </div>
  )
}
