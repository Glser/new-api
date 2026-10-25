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
import { useTranslation } from 'react-i18next'

import { CopyButton } from '@/components/copy-button'
import { StatusBadge } from '@/components/status-badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { TableCell, TableRow } from '@/components/ui/table'
import { formatCurrencyFromUSD } from '@/lib/currency'
import { formatNumber } from '@/lib/format'

import {
  formatTimestamp,
  getPaymentMethodName,
  getStatusConfig,
} from '../lib/billing'
import type { TopupRecord } from '../types'

export function BillingHistoryRows(props: {
  records: TopupRecord[]
  loading: boolean
  isAdmin: boolean
  completing: boolean
  columnCount: number
  keyword: string
  onComplete: (tradeNo: string) => void
}) {
  const { t } = useTranslation()

  if (props.loading) {
    return ['row-1', 'row-2', 'row-3', 'row-4'].map((key) => (
      <TableRow key={key}>
        <TableCell colSpan={props.columnCount} className='px-4 sm:px-5'>
          <Skeleton className='h-6 w-full' />
        </TableCell>
      </TableRow>
    ))
  }

  if (props.records.length === 0) {
    return (
      <TableRow>
        <TableCell
          colSpan={props.columnCount}
          className='text-muted-foreground h-24 px-4 text-center sm:px-5'
        >
          <div className='flex flex-col items-center justify-center gap-1'>
            <span className='text-foreground text-sm font-medium'>
              {t('No billing records found')}
            </span>
            <span className='text-xs'>
              {props.keyword
                ? t('Try adjusting your search')
                : t('Your transaction history will appear here')}
            </span>
          </div>
        </TableCell>
      </TableRow>
    )
  }

  return props.records.map((record) => {
    const statusConfig = getStatusConfig(record.status)
    return (
      <TableRow key={record.id}>
        <TableCell className='px-3 text-center text-xs tabular-nums'>
          {formatTimestamp(record.create_time)}
        </TableCell>
        <TableCell className='px-3 text-center'>
          <div className='inline-flex max-w-full items-center justify-center gap-1'>
            <code className='max-w-[12rem] truncate font-mono text-xs'>
              {record.trade_no}
            </code>
            <CopyButton
              value={record.trade_no}
              variant='ghost'
              size='icon'
              className='size-7'
              iconClassName='size-3.5'
              tooltip={t('Copy to clipboard')}
              aria-label={t('Copy to clipboard')}
            />
          </div>
        </TableCell>
        <TableCell className='px-3 text-center text-xs'>
          {getPaymentMethodName(record.payment_method, t)}
        </TableCell>
        <TableCell className='px-3 text-center text-xs font-medium tabular-nums'>
          {formatCurrencyFromUSD(record.amount, {
            digitsLarge: 2,
            digitsSmall: 2,
            abbreviate: false,
          })}
        </TableCell>
        <TableCell className='px-3 text-center text-xs font-medium tabular-nums'>
          {formatNumber(record.money)}
        </TableCell>
        <TableCell className='px-3 text-center'>
          <StatusBadge
            label={t(statusConfig.label)}
            variant={statusConfig.variant}
            copyable={false}
          />
        </TableCell>
        {props.isAdmin ? (
          <TableCell className='px-3 text-center text-xs tabular-nums'>
            {record.user_id}
          </TableCell>
        ) : null}
        {props.isAdmin ? (
          <TableCell className='px-3 text-center'>
            {record.status === 'pending' ? (
              <Button
                size='sm'
                variant='outline'
                className='h-8'
                disabled={props.completing}
                onClick={() => props.onComplete(record.trade_no)}
              >
                {t('Complete Order')}
              </Button>
            ) : (
              <span className='text-muted-foreground'>-</span>
            )}
          </TableCell>
        ) : null}
      </TableRow>
    )
  })
}
