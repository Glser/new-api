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
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { DateRangePickerButton } from '@/components/date-range-picker'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  TIME_GRANULARITY_OPTIONS,
  TIME_RANGE_PRESETS,
} from '@/features/dashboard/constants'
import { cleanFilters } from '@/features/dashboard/lib'
import type { DashboardFilters } from '@/features/dashboard/types'
import { getRollingDateRange, type TimeGranularity } from '@/lib/time'
import { useAuthStore } from '@/stores/auth-store'

interface ModelsFilterChangeProps {
  currentFilters: DashboardFilters
  onFilterChange: (filters: DashboardFilters) => void
}

function granularityForRangeDays(days: number): TimeGranularity {
  if (days <= 1) return 'hour'
  if (days >= 29) return 'week'
  return 'day'
}

function detectQuickRangeDays(
  filters: DashboardFilters | undefined
): number | null {
  const start = filters?.start_timestamp
  const end = filters?.end_timestamp
  if (!start || !end) return null
  const days = Math.round((end.getTime() - start.getTime()) / 86_400_000)
  return TIME_RANGE_PRESETS.some((preset) => preset.days === days) ? days : null
}

function applyFilters(
  current: DashboardFilters,
  next: DashboardFilters,
  onFilterChange: (filters: DashboardFilters) => void
) {
  onFilterChange(
    cleanFilters({ ...current, ...next } as unknown as Record<
      string,
      unknown
    >) as DashboardFilters
  )
}

export function ModelsTimeRangeControls(props: ModelsFilterChangeProps) {
  const { t } = useTranslation()
  const filters = props.currentFilters
  const selectedRange = detectQuickRangeDays(filters)

  const handleQuickRange = (days: number) => {
    const { start, end } = getRollingDateRange(days)
    applyFilters(
      filters,
      {
        start_timestamp: start,
        end_timestamp: end,
        time_granularity: granularityForRangeDays(days),
      },
      props.onFilterChange
    )
  }

  return (
    <div className='flex min-w-0 flex-wrap items-center gap-2'>
      <Tabs
        value={selectedRange != null ? String(selectedRange) : 'custom'}
        onValueChange={(value) => {
          if (value === 'custom') return
          const days = Number(value)
          if (Number.isFinite(days)) handleQuickRange(days)
        }}
        className='shrink-0'
      >
        <TabsList aria-label={t('Quick Range')}>
          {TIME_RANGE_PRESETS.map((range) => (
            <TabsTrigger
              key={range.days}
              value={String(range.days)}
              className='px-2.5 text-xs'
            >
              {t(range.label)}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <DateRangePickerButton
        start={filters.start_timestamp}
        end={filters.end_timestamp}
        showTime
        onApply={({ start, end }) => {
          applyFilters(
            filters,
            {
              start_timestamp: start,
              end_timestamp: end,
            },
            props.onFilterChange
          )
        }}
      />
    </div>
  )
}

export function ModelsUsernameFilter(props: ModelsFilterChangeProps) {
  const { t } = useTranslation()
  const user = useAuthStore((state) => state.auth.user)
  const isAdmin = user?.role && user.role >= 10
  const filters = props.currentFilters
  const [username, setUsername] = useState(filters.username ?? '')

  useEffect(() => {
    setUsername(filters.username ?? '')
  }, [filters.username])

  if (!isAdmin) return null

  const commitUsername = () => {
    const next = username.trim()
    if ((filters.username ?? '') === next) return
    applyFilters(filters, { username: next }, props.onFilterChange)
  }

  return (
    <Input
      className='h-8 w-40 text-xs'
      placeholder={t('Filter by username')}
      value={username}
      onChange={(event) => setUsername(event.target.value)}
      onBlur={commitUsername}
      onKeyDown={(event) => {
        if (event.key === 'Enter') {
          event.currentTarget.blur()
        }
      }}
      aria-label={t('Username')}
    />
  )
}

export function ModelsGranularityTabs(props: {
  value: TimeGranularity
  onChange: (value: TimeGranularity) => void
}) {
  const { t } = useTranslation()

  return (
    <Tabs
      value={props.value}
      onValueChange={(value) => {
        props.onChange(value as TimeGranularity)
      }}
      className='shrink-0'
    >
      <TabsList aria-label={t('Time Granularity')}>
        {TIME_GRANULARITY_OPTIONS.map((option) => (
          <TabsTrigger
            key={option.value}
            value={option.value}
            className='px-2.5 text-xs'
          >
            {t(option.label)}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  )
}

export function ModelsFilter(props: ModelsFilterChangeProps) {
  return (
    <div className='flex min-w-0 flex-wrap items-center justify-end gap-2'>
      <ModelsTimeRangeControls
        currentFilters={props.currentFilters}
        onFilterChange={props.onFilterChange}
      />
      <ModelsUsernameFilter
        currentFilters={props.currentFilters}
        onFilterChange={props.onFilterChange}
      />
    </div>
  )
}
