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
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { DataTablePage, useDataTable } from '@/components/data-table'
import { requireServerSuccess } from '@/lib/server-error-message'
import { cn } from '@/lib/utils'

import { getAdminPlans } from '../api'
import { useSubscriptionsColumns } from './subscriptions-columns'
import { useSubscriptions } from './subscriptions-provider'

export function SubscriptionsTable() {
  const { t } = useTranslation()
  const columns = useSubscriptionsColumns()
  const { refreshTrigger } = useSubscriptions()

  const { data, isLoading } = useQuery({
    queryKey: ['admin-subscription-plans', refreshTrigger],
    queryFn: async () => {
      const result = requireServerSuccess(await getAdminPlans())
      return result.data || []
    },
    placeholderData: (prev) => prev,
  })

  const plans = useMemo(() => data || [], [data])

  const { table } = useDataTable({
    data: plans,
    columns,
    withFilteredRowModel: false,
    withFacetedRowModel: false,
  })

  return (
    <DataTablePage
      table={table}
      columns={columns}
      isLoading={isLoading}
      emptyTitle={t('No subscription plans yet')}
      emptyDescription={t(
        'Click "Create Plan" to create your first subscription plan'
      )}
      skeletonKeyPrefix='subscriptions-skeleton'
      applyHeaderSize
      tableClassName={cn(
        '@container/activity [&_[data-slot=table]]:min-w-[64rem] [&_[data-slot=table]]:table-auto [&_[data-slot=table]_thead]:bg-(--table-header) [&_[data-slot=table]_th]:bg-(--table-header) [&_[data-slot=table]_th]:h-10 [&_[data-slot=table]_th]:px-3 [&_[data-slot=table]_th]:text-center [&_[data-slot=table]_th]:text-xs [&_[data-slot=table]_td]:px-3 [&_[data-slot=table]_td]:text-center [&_[data-slot=table]_td]:text-xs @min-[48rem]/activity:[&_[data-slot=table]_td]:text-sm @min-[48rem]/activity:[&_[data-slot=table]_th]:text-sm',
        '[&_[data-slot=table]_th>div]:justify-center [&_[data-slot=table]_th_button]:ms-0'
      )}
      getColumnClassName={() => 'py-2.5 text-center'}
    />
  )
}
