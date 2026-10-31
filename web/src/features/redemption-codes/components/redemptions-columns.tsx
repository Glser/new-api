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
import type { ColumnDef } from '@tanstack/react-table'
import { useTranslation } from 'react-i18next'

import { MaskedValueDisplay } from '@/components/masked-value-display'
import { StatusBadge } from '@/components/status-badge'
import { TableId } from '@/components/table-id'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { formatQuota, formatTimestampToDate } from '@/lib/format'
import { cn } from '@/lib/utils'

import { REDEMPTION_FILTER_EXPIRED, REDEMPTION_STATUSES } from '../constants'
import { isRedemptionExpired, isTimestampExpired } from '../lib'
import type { Redemption } from '../types'
import { DataTableRowActions } from './data-table-row-actions'

const TABLE_DATA_TEXT =
  'text-foreground text-[12px]! tabular-nums @min-[48rem]/redemptions:text-[14px]! @min-[80rem]/redemptions:text-[15px]!'

export function useRedemptionsColumns(): ColumnDef<Redemption>[] {
  const { t } = useTranslation()
  return [
    {
      id: 'select',
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected()}
          indeterminate={table.getIsSomePageRowsSelected()}
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label={t('Select all')}
          className='mx-auto'
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label={t('Select row')}
          className='mx-auto'
        />
      ),
      enableSorting: false,
      enableHiding: false,
      size: 40,
    },
    {
      accessorKey: 'id',
      header: t('ID'),
      meta: { mobileHidden: true },
      cell: ({ row }) => {
        return (
          <TableId
            value={row.getValue('id') as number}
            className='[font-family:inherit]'
          />
        )
      },
      size: 72,
    },
    {
      accessorKey: 'name',
      header: t('Name'),
      meta: { mobileTitle: true },
      cell: ({ row }) => (
        <span className='mx-auto block max-w-[180px] truncate text-center'>
          {row.getValue('name')}
        </span>
      ),
      size: 180,
    },
    {
      accessorKey: 'status',
      header: t('Status'),
      meta: { mobileBadge: true },
      cell: ({ row }) => {
        const redemption = row.original
        const statusValue = row.getValue('status') as number

        // Check if expired
        if (isRedemptionExpired(redemption.expired_time, statusValue)) {
          return (
            <StatusBadge
              label={t('Expired')}
              variant='warning'
              copyable={false}
              className='mx-auto font-normal'
            />
          )
        }

        const statusConfig = REDEMPTION_STATUSES[statusValue]

        if (!statusConfig) {
          return null
        }

        return (
          <StatusBadge
            label={t(statusConfig.labelKey)}
            variant={statusConfig.variant}
            copyable={false}
            className='mx-auto font-normal'
          />
        )
      },
      filterFn: (row, id, value) => {
        const redemption = row.original
        const statusValue = row.getValue(id) as number

        // Check if expired status is being filtered
        if (value.includes(REDEMPTION_FILTER_EXPIRED)) {
          if (isRedemptionExpired(redemption.expired_time, statusValue)) {
            return true
          }
        }

        // Check regular status
        return value.includes(String(statusValue))
      },
      size: 120,
    },
    {
      id: 'code',
      accessorKey: 'key',
      header: t('Redemption Code'),
      cell: function CodeCell({ row }) {
        const redemption = row.original
        const key = redemption.key
        const maskedKey = `${key.slice(0, 8)}${'*'.repeat(16)}${key.slice(-8)}`

        return (
          <MaskedValueDisplay
            label={t('Full Code')}
            fullValue={key}
            maskedValue={maskedKey}
            copyTooltip={t('Copy code')}
            copyAriaLabel={t('Copy redemption code')}
            className='mx-auto justify-center'
            triggerClassName='justify-center'
            contentAlign='center'
          />
        )
      },
      enableSorting: false,
      size: 320,
    },
    {
      accessorKey: 'quota',
      header: t('Quota'),
      cell: ({ row }) => {
        const quota = row.getValue('quota') as number
        return (
          <span className={cn(TABLE_DATA_TEXT, 'font-medium')}>
            {formatQuota(quota)}
          </span>
        )
      },
      size: 120,
    },
    {
      accessorKey: 'created_time',
      header: t('Created'),
      meta: { mobileHidden: true },
      cell: ({ row }) => {
        return (
          <span className={TABLE_DATA_TEXT}>
            {formatTimestampToDate(row.getValue('created_time'))}
          </span>
        )
      },
      size: 180,
    },
    {
      accessorKey: 'expired_time',
      header: t('Expires'),
      meta: { mobileHidden: true },
      cell: ({ row }) => {
        const expiredTime = row.getValue('expired_time') as number
        if (expiredTime === 0) {
          return <span className='text-muted-foreground/60'>{t('Never')}</span>
        }
        const isExpired = isTimestampExpired(expiredTime)
        return (
          <span
            className={cn(TABLE_DATA_TEXT, isExpired && 'text-destructive')}
          >
            {formatTimestampToDate(expiredTime)}
          </span>
        )
      },
      size: 180,
    },
    {
      accessorKey: 'used_user_id',
      header: t('Redeemed By'),
      meta: { mobileHidden: true },
      cell: ({ row }) => {
        const userId = row.getValue('used_user_id') as number
        const redemption = row.original

        if (userId === 0) {
          return <span className='text-muted-foreground/60'>-</span>
        }

        return (
          <Tooltip>
            <TooltipTrigger
              render={
                <span className={cn(TABLE_DATA_TEXT, 'cursor-help')}>
                  {t('User {{id}}', { id: userId })}
                </span>
              }
            />
            <TooltipContent>
              <div className='space-y-1 text-center text-xs'>
                <div>
                  {t('User ID:')} {userId}
                </div>
                {redemption.redeemed_time > 0 && (
                  <div>
                    {t('Redeemed:')}{' '}
                    {formatTimestampToDate(redemption.redeemed_time)}
                  </div>
                )}
              </div>
            </TooltipContent>
          </Tooltip>
        )
      },
      size: 140,
    },
    {
      id: 'actions',
      header: () => t('Actions'),
      cell: ({ row }) => <DataTableRowActions row={row} />,
      size: 80,
      meta: { pinned: 'right' as const },
    },
  ]
}
