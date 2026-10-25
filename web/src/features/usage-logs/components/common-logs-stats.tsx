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
import { useTranslation } from 'react-i18next'

import { Skeleton } from '@/components/ui/skeleton'
import { formatLogQuota, formatNumber } from '@/lib/format'
import { requireServerSuccess } from '@/lib/server-error-message'

import { getLogStats, getUserLogStats } from '../api'
import { DEFAULT_LOG_STATS } from '../constants'
import { buildApiParams } from '../lib/utils'
import { useLogsViewScope, useUsageLogsContext } from './usage-logs-provider'

const route = getRouteApi('/_authenticated/usage-logs/$section')

function StatValue(props: { loading?: boolean; value: string }) {
  if (props.loading) {
    return <Skeleton className='h-4 w-16' />
  }

  return (
    <span className='text-muted-foreground/75 text-[11px] leading-relaxed tabular-nums @min-[48rem]/console:text-xs'>
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

  const items = [
    { label: t('Usage'), value: usageValue },
    { label: t('RPM'), value: formatNumber(stats?.rpm || 0) },
    { label: t('TPM'), value: formatNumber(stats?.tpm || 0) },
  ]

  return (
    <div className='flex min-w-0 flex-wrap items-baseline justify-start gap-x-3 gap-y-1 pl-0 text-left'>
      {items.map((item, index) => (
        <span
          key={item.label}
          className='inline-flex min-w-0 items-baseline gap-x-1.5 text-left'
        >
          {index > 0 && (
            <span className='text-muted-foreground/45'>
              |
            </span>
          )}
          <span className='text-muted-foreground/80 text-xs'>
            {item.label}
          </span>
          <StatValue loading={isLoading} value={item.value} />
        </span>
      ))}
    </div>
  )
}
