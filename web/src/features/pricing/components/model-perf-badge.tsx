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
import { memo, useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import {
  formatLatency,
  formatThroughput,
  getSuccessRateDotClass,
} from '@/features/performance-metrics/lib/format'
import type { SuccessRatePoint } from '@/features/performance-metrics/types'
import { cn } from '@/lib/utils'

export type ModelPerfBadgeData = {
  avg_latency_ms: number
  success_rate: number
  avg_tps: number
  recent_success_series?: SuccessRatePoint[]
}

export interface ModelPerfBadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  perf: ModelPerfBadgeData | undefined
}

const STATUS_SLOTS = Array.from({ length: 24 }, (_, slot) => slot)

export const ModelPerfBadge = memo(function ModelPerfBadge(
  props: ModelPerfBadgeProps
) {
  const { t } = useTranslation()
  const latencyText = formatLatency(props.perf?.avg_latency_ms ?? 0)
  const throughputText = formatThroughput(props.perf?.avg_tps ?? 0).replace(
    ' t/s',
    't/s'
  )
  const successRate = props.perf?.success_rate
  const hasSuccessRate =
    successRate != null &&
    Number.isFinite(successRate) &&
    successRate >= 0 &&
    successRate <= 100
  // Hourly points with timestamps, anchored to the client's current hour.
  // Hours without traffic stay gray. Slot 23 is the current, partial hour.
  const statusRates = useMemo(() => {
    const currentHourStart = Math.floor(Date.now() / 1000 / 3600) * 3600
    const ratesByHour = new Map<number, number>()
    for (const point of props.perf?.recent_success_series ?? []) {
      ratesByHour.set(point.ts, point.success_rate)
    }
    return STATUS_SLOTS.map((slot) => {
      const hourStart = currentHourStart - (23 - slot) * 3600
      return ratesByHour.get(hourStart)
    })
  }, [props.perf?.recent_success_series])

  return (
    <div
      aria-label={t('Performance metrics for the last 24 hours')}
      className={cn(
        'flex w-full min-w-0 items-center justify-between gap-3',
        props.className
      )}
    >
      <dl className='flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1 text-[9px] tabular-nums'>
        <div className='flex shrink-0 items-center gap-1.5'>
          <dt
            title={t('Request success rate sampled over the last 24 hours')}
            className='text-muted-foreground text-[9px] leading-3'
          >
            {t('Status')}
          </dt>
          <dd className='flex items-center gap-1'>
            <span
              role='img'
              aria-label={t(
                'Recent success-rate samples; gray bars indicate missing data.'
              )}
              title={t(
                'Recent success-rate samples; gray bars indicate missing data.'
              )}
              className='flex h-2 w-14 items-center justify-between'
            >
              {STATUS_SLOTS.map((slot) => {
                const rate = statusRates[slot]
                return (
                  <span
                    key={slot}
                    aria-hidden
                    className={cn(
                      'h-full w-px shrink-0 rounded-xs',
                      rate != null &&
                        Number.isFinite(rate) &&
                        rate >= 0 &&
                        rate <= 100
                        ? getSuccessRateDotClass(rate)
                        : 'bg-muted-foreground/15'
                    )}
                  />
                )
              })}
            </span>
            <span className='font-mono text-[9px] leading-3'>
              {hasSuccessRate ? `${successRate.toFixed(1)}%` : '—%'}
            </span>
          </dd>
        </div>
        <div className='ms-auto flex shrink-0 items-center gap-x-3'>
          <div
            title={t('Average latency')}
            className='flex shrink-0 items-center gap-1.5'
          >
            <dt className='text-muted-foreground text-[9px] leading-3'>
              {t('Latency short')}
            </dt>
            <dd className='font-mono text-[9px] leading-3 whitespace-nowrap'>
              {latencyText === '—' ? '—s' : latencyText}
            </dd>
          </div>
          <div
            title={t('Throughput')}
            className='flex shrink-0 items-center gap-1.5'
          >
            <dt className='text-muted-foreground text-[9px] leading-3'>
              {t('Throughput short')}
            </dt>
            <dd className='font-mono text-[9px] leading-3 whitespace-nowrap'>
              {throughputText === '—' ? '—t/s' : throughputText}
            </dd>
          </div>
        </div>
      </dl>
      {props.children}
    </div>
  )
})
