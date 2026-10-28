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
import { useQuery } from '@tanstack/react-query'
import { getRouteApi } from '@tanstack/react-router'
import { Gauge, Hash, Wallet } from 'lucide-react'
import type { ComponentType } from 'react'
import { useTranslation } from 'react-i18next'

import { IconBadge, type IconBadgeTone } from '@/components/ui/icon-badge'
import { Skeleton } from '@/components/ui/skeleton'
import { formatLogQuota, formatNumber } from '@/lib/format'
import { requireServerSuccess } from '@/lib/server-error-message'
import { cn } from '@/lib/utils'

import { getLogStats, getUserLogStats } from '../api'
import { DEFAULT_LOG_STATS } from '../constants'
import { buildApiParams } from '../lib/utils'
import { useLogsViewScope, useUsageLogsContext } from './usage-logs-provider'

const route = getRouteApi('/_authenticated/usage-logs/$section')

function StatValue(props: { loading?: boolean; value: string }) {
  if (props.loading) {
    return <Skeleton className='h-3.5 w-12' />
  }

  return (
    <span className='text-foreground font-mono text-xs font-medium tabular-nums'>
      {props.value}
    </span>
  )
}

export function CommonLogsStats() {
  const { t } = useTranslation()
  const { isAdminView: isAdmin } = useLogsViewScope()
  const searchParams = route.useSearch()
  const { sensitiveVisible } = useUsageLogsContext()

  const { data: stats, isLoading } = useQuery({
    queryKey: ['usage-logs-stats', isAdmin, searchParams],
    queryFn: async () => {
      const params = buildApiParams({
        page: 1,
        pageSize: 1,
        searchParams,
        columnFilters: [],
        isAdmin,
      })

      const result = isAdmin
        ? requireServerSuccess(await getLogStats(params))
        : requireServerSuccess(await getUserLogStats(params))

      if (result.success && result.data) {
        return result.data
      }
      return DEFAULT_LOG_STATS
    },
    placeholderData: (previousData) => previousData,
  })

  let usageValue = '••••'
  if (sensitiveVisible) {
    usageValue = formatLogQuota(stats?.quota || 0)
  }

  const items: {
    label: string
    value: string
    icon: ComponentType<{ className?: string }>
    tone: IconBadgeTone
  }[] = [
    { label: t('Usage'), value: usageValue, icon: Wallet, tone: 'warning' },
    {
      label: t('RPM'),
      value: formatNumber(stats?.rpm || 0),
      icon: Gauge,
      tone: 'info',
    },
    {
      label: t('TPM'),
      value: formatNumber(stats?.tpm || 0),
      icon: Hash,
      tone: 'success',
    },
  ]

  return (
    <div className='flex min-w-0'>
      <div className='flex h-8 max-w-full min-w-0 items-stretch overflow-hidden rounded-lg border'>
        {items.map((item, index) => {
          const Icon = item.icon
          return (
            <div
              key={item.label}
              className={cn(
                'flex min-w-0 items-center gap-1.5 px-2.5',
                index > 0 && 'border-l'
              )}
            >
              <IconBadge tone={item.tone} size='xs'>
                <Icon />
              </IconBadge>
              <span className='text-muted-foreground shrink-0 text-xs'>
                {item.label}
              </span>
              <StatValue loading={isLoading} value={item.value} />
            </div>
          )
        })}
      </div>
    </div>
  )
}
