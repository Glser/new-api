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
import { RefreshCw } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { SectionPageLayout } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { USER_CONSOLE_RANGE_PRESETS } from '@/features/dashboard/constants'
import { useAnnouncements } from '@/features/dashboard/hooks/use-status-data'
import { useUserConsoleData } from '@/features/dashboard/hooks/use-user-console-data'
import {
  buildDefaultUserConsoleRange,
  getSavedConsoleDataScope,
  saveConsoleDataScope,
  type ConsoleDataScope,
} from '@/features/dashboard/lib'
import type { UserConsoleDateRange } from '@/features/dashboard/types'
import { useIsAdmin } from '@/hooks/use-admin'
import dayjs from '@/lib/dayjs'
import { cn } from '@/lib/utils'

import { UserConsoleActivity } from './user-console-activity'
import { UserConsoleBanner } from './user-console-banner'
import { UserConsoleCharts } from './user-console-charts'
import { UserConsoleDateRangeControl } from './user-console-date-range'
import { UserConsoleKpi } from './user-console-kpi'
import { UserConsoleStart } from './user-console-start'

function formatUtcOffset(date: Date = new Date()): string {
  const offsetMinutes = -date.getTimezoneOffset()
  const sign = offsetMinutes >= 0 ? '+' : '-'
  const hours = Math.floor(Math.abs(offsetMinutes) / 60)
  return `UTC${sign}${hours}`
}

function getSpendTitle(
  preset: UserConsoleDateRange['preset'],
  t: (key: string) => string
): string {
  if (preset === 'today') return t('Spend today')
  if (preset === 'yesterday') return t('Yesterday spend')
  if (preset === 'week') return t('This week spend')
  if (preset === 'month') return t('This month spend')
  if (preset === 'last-month') return t('Last month spend')
  return t('Spend')
}

export function UserConsoleDashboard() {
  const { t } = useTranslation()
  const isAdmin = useIsAdmin()
  const [range, setRange] = useState<UserConsoleDateRange>(() =>
    buildDefaultUserConsoleRange()
  )
  const [dataScope, setDataScope] = useState<ConsoleDataScope>(() =>
    isAdmin ? getSavedConsoleDataScope() : 'self'
  )
  const consoleData = useUserConsoleData(range, {
    siteWide: isAdmin && dataScope === 'site',
  })
  const { items: announcements } = useAnnouncements()
  const latestAnnouncement = announcements[0]
  const rangeLabel = `${dayjs(range.start).format('YYYY-MM-DD')} — ${dayjs(range.end).format('YYYY-MM-DD')}`
  const presetLabel = useMemo(() => {
    const preset = USER_CONSOLE_RANGE_PRESETS.find(
      (item) => item.value === range.preset
    )
    return preset ? t(preset.labelKey) : t('Custom')
  }, [range.preset, t])
  const remainQuota = Number(consoleData.user?.quota ?? 0)

  return (
    <SectionPageLayout>
      <SectionPageLayout.Title>
        <span className='truncate text-xl font-bold tracking-tight sm:text-2xl 2xl:text-3xl'>
          {t('Console')}
        </span>
      </SectionPageLayout.Title>
      <SectionPageLayout.Content>
        <div className='@container/console flex min-w-0 flex-col gap-3 sm:gap-4'>
          {latestAnnouncement ? (
            <UserConsoleBanner announcement={latestAnnouncement} />
          ) : null}

          <div className='flex flex-wrap items-center justify-between gap-3'>
            <div className='flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1 pl-3 @min-[48rem]/console:gap-x-3 @min-[48rem]/console:pl-4'>
              <span className='text-sm font-semibold @min-[48rem]/console:text-base'>
                {presetLabel}
              </span>
              <span className='text-muted-foreground text-xs leading-relaxed tabular-nums @min-[48rem]/console:text-sm'>
                {rangeLabel}
                <span className='mx-2'>·</span>
                {t('Updated at {{time}} ({{timezone}})', {
                  time: dayjs().format('HH:mm:ss'),
                  timezone: formatUtcOffset(),
                })}
              </span>
            </div>
            <div className='flex w-full min-w-0 flex-wrap items-center justify-start gap-2 @min-[64rem]/console:w-auto @min-[64rem]/console:justify-end'>
              <Button
                variant='outline'
                size='sm'
                className='h-8 px-2.5 text-xs'
                onClick={consoleData.refresh}
                disabled={consoleData.refreshing}
              >
                <RefreshCw
                  data-icon='inline-start'
                  className={cn(
                    'size-3.5',
                    consoleData.refreshing && 'animate-spin'
                  )}
                />
                {t('Refresh')}
              </Button>
              <UserConsoleDateRangeControl range={range} onChange={setRange} />
            </div>
          </div>

          <UserConsoleKpi
            spendTitle={getSpendTitle(range.preset, t)}
            spend={consoleData.stats.totalQuota}
            balance={remainQuota}
            requests={consoleData.stats.totalCount}
            tokens={consoleData.stats.totalTokens}
            inProgressCount={consoleData.inProgressCount}
            loading={consoleData.loading}
          />

          <UserConsoleStart
            showDataScope={isAdmin}
            dataScope={dataScope}
            onDataScopeChange={(value) => {
              setDataScope(value)
              saveConsoleDataScope(value)
            }}
          />
          <UserConsoleCharts
            data={consoleData.quotaData}
            loading={consoleData.loading}
            timeGranularity={consoleData.granularity}
            rangeLabel={rangeLabel}
          />
          <UserConsoleActivity
            logs={consoleData.recentLogs}
            loading={consoleData.loading}
          />
        </div>
      </SectionPageLayout.Content>
    </SectionPageLayout>
  )
}
