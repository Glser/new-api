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
import { ChevronLeft, ChevronRight, Search } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { ConfirmDialog } from '@/components/confirm-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

import { useBillingHistory } from '../hooks/use-billing-history'
import { BillingHistoryRows } from './billing-history-rows'

interface BillingHistoryListProps {
  reloadKey?: number
}

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const

export function BillingHistoryList(props: BillingHistoryListProps) {
  const { t } = useTranslation()
  const billing = useBillingHistory()
  const [confirmTradeNo, setConfirmTradeNo] = useState<string | null>(null)
  const refreshRef = useRef(billing.refresh)
  refreshRef.current = billing.refresh
  const totalPages = Math.max(1, Math.ceil(billing.total / billing.pageSize))
  const columnCount = billing.isAdmin ? 8 : 6

  useEffect(() => {
    if (!props.reloadKey) return
    void refreshRef.current()
  }, [props.reloadKey])

  const handleConfirmComplete = async () => {
    if (!confirmTradeNo) return
    const success = await billing.handleCompleteOrder(confirmTradeNo)
    if (success) {
      setConfirmTradeNo(null)
    }
  }

  return (
    <>
      <section
        id='wallet-billing-history'
        className='bg-card @container/history min-w-0 scroll-mt-4 overflow-hidden rounded-2xl border'
      >
        <div className='flex flex-wrap items-start justify-between gap-2 px-3 py-3 @min-[48rem]/wallet:gap-3 @min-[48rem]/wallet:px-5'>
          <div>
            <h3 className='text-xs font-semibold @min-[48rem]/wallet:text-sm'>
              {t('Billing History')}
            </h3>
            <p className='text-muted-foreground mt-0.5 text-[11px] @min-[48rem]/wallet:text-xs'>
              {t('View your topup transaction records and payment history')}
            </p>
          </div>
          <div className='flex w-full min-w-0 flex-wrap items-center justify-start gap-2 @min-[48rem]/history:w-auto @min-[48rem]/history:justify-end'>
            <div className='relative min-w-0 flex-1 @min-[48rem]/history:w-56 @min-[48rem]/history:flex-none'>
              <Search className='text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2' />
              <Input
                value={billing.keyword}
                onChange={(event) => billing.handleSearch(event.target.value)}
                placeholder={t('Search by order number...')}
                className='h-8 pl-8'
                aria-label={t('Search by order number...')}
              />
            </div>
            <Select
              items={PAGE_SIZE_OPTIONS.map((size) => ({
                value: String(size),
                label: String(size),
              }))}
              value={String(billing.pageSize)}
              onValueChange={(value) => {
                if (value !== null) {
                  billing.handlePageSizeChange(Number.parseInt(value, 10))
                }
              }}
            >
              <SelectTrigger
                className='h-8 w-[72px]'
                aria-label={t('Rows per page')}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent alignItemWithTrigger={false}>
                <SelectGroup>
                  {PAGE_SIZE_OPTIONS.map((size) => (
                    <SelectItem key={size} value={String(size)}>
                      {size}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Table className='min-w-[48rem] table-auto @min-[48rem]/history:min-w-[56rem] [&_td]:px-2 [&_td]:text-xs @min-[48rem]/history:[&_td]:text-sm [&_th]:px-2 [&_th]:text-xs @min-[48rem]/history:[&_th]:text-sm'>
          <TableHeader>
            <TableRow>
              <TableHead className='px-3 text-center'>{t('Time')}</TableHead>
              <TableHead className='px-3 text-center'>
                {t('Order number')}
              </TableHead>
              <TableHead className='px-3 text-center'>
                {t('Payment Method')}
              </TableHead>
              <TableHead className='px-3 text-center'>{t('Amount')}</TableHead>
              <TableHead className='px-3 text-center'>{t('Payment')}</TableHead>
              <TableHead className='px-3 text-center'>{t('Status')}</TableHead>
              {billing.isAdmin ? (
                <TableHead className='px-3 text-center'>
                  {t('User ID')}
                </TableHead>
              ) : null}
              {billing.isAdmin ? (
                <TableHead className='px-3 text-center'>
                  {t('Actions')}
                </TableHead>
              ) : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            <BillingHistoryRows
              records={billing.records}
              loading={billing.loading}
              isAdmin={billing.isAdmin}
              completing={billing.completing}
              columnCount={columnCount}
              keyword={billing.keyword}
              onComplete={setConfirmTradeNo}
            />
          </TableBody>
        </Table>

        {!billing.loading && billing.records.length > 0 ? (
          <div className='flex flex-col items-center justify-between gap-3 border-t px-3 py-3 sm:flex-row @min-[48rem]/wallet:px-5'>
            <div className='text-muted-foreground text-xs tabular-nums sm:text-sm'>
              <span className='text-muted-foreground/80'>{t('Total:')}</span>{' '}
              <span className='text-foreground'>
                {billing.total.toLocaleString()}
              </span>
            </div>
            <div className='flex items-center gap-2'>
              <Button
                variant='outline'
                size='sm'
                className='size-8 p-0'
                onClick={() => billing.handlePageChange(billing.page - 1)}
                disabled={billing.page <= 1}
                aria-label={t('Go to previous page')}
              >
                <ChevronLeft className='size-4' />
              </Button>
              <div className='text-muted-foreground flex items-center gap-1 text-sm tabular-nums'>
                <span className='text-foreground font-medium'>
                  {billing.page}
                </span>
                <span>/</span>
                <span>{totalPages}</span>
              </div>
              <Button
                variant='outline'
                size='sm'
                className='size-8 p-0'
                onClick={() => billing.handlePageChange(billing.page + 1)}
                disabled={billing.page >= totalPages}
                aria-label={t('Go to next page')}
              >
                <ChevronRight className='size-4' />
              </Button>
            </div>
          </div>
        ) : null}
      </section>

      <ConfirmDialog
        open={confirmTradeNo != null}
        onOpenChange={(open) => {
          if (!open) setConfirmTradeNo(null)
        }}
        title={t('Complete Order')}
        desc={t(
          'Are you sure you want to manually complete this order? The user will be credited with the corresponding quota.'
        )}
        confirmText={billing.completing ? t('Processing...') : t('Confirm')}
        handleConfirm={() => {
          void handleConfirmComplete()
        }}
        isLoading={billing.completing}
      />
    </>
  )
}
