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
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { UserConsoleDateRangeControl } from '@/features/dashboard/components/overview/user-console-date-range'
import { TIME_GRANULARITY_OPTIONS } from '@/features/dashboard/constants'
import {
  buildDefaultUserConsoleRange,
  cleanFilters,
  getUserConsoleGranularity,
  matchUserConsolePreset,
} from '@/features/dashboard/lib'
import type { DashboardFilters } from '@/features/dashboard/types'
import type { TimeGranularity } from '@/lib/time'
import { useAuthStore } from '@/stores/auth-store'

interface ModelsFilterChangeProps {
  currentFilters: DashboardFilters
  onFilterChange: (filters: DashboardFilters) => void
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
  const filters = props.currentFilters
  const range = useMemo(() => {
    const start = filters.start_timestamp
    const end = filters.end_timestamp
    if (!start || !end) {
      return buildDefaultUserConsoleRange()
    }
    return {
      preset: matchUserConsolePreset(start, end),
      start,
      end,
    }
  }, [filters.end_timestamp, filters.start_timestamp])

  return (
    <UserConsoleDateRangeControl
      range={range}
      onChange={(next) => {
        applyFilters(
          filters,
          {
            start_timestamp: next.start,
            end_timestamp: next.end,
            time_granularity: getUserConsoleGranularity(next),
          },
          props.onFilterChange
        )
      }}
    />
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
