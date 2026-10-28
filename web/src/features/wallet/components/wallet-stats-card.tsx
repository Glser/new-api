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
import {
  ArrowRight01Icon,
  ChartHistogramIcon,
  Invoice01Icon,
  Wallet01Icon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { Link } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { formatQuota } from '@/lib/format'

import type { UserWalletData } from '../types'

interface WalletStatsCardProps {
  children: ReactNode
  user: UserWalletData | null
  loading?: boolean
  onAddFunds: () => void
}

export function WalletStatsCard(props: WalletStatsCardProps) {
  const { t } = useTranslation()

  return (
    <section
      aria-label={t('Wallet')}
      className='bg-card grid min-w-0 overflow-hidden rounded-2xl border @min-[56rem]/wallet:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)_minmax(0,1.15fr)]'
    >
      <div className='flex min-w-0 flex-col gap-3 px-5 py-4 sm:px-6 sm:py-5'>
        <div>
          <div className='flex min-h-10 items-center justify-between gap-3'>
            <span className='flex items-center gap-2 text-sm font-medium'>
              <HugeiconsIcon
                icon={Wallet01Icon}
                size={18}
                strokeWidth={1.7}
                aria-hidden='true'
              />
              {t('Current Balance')}
            </span>
          </div>
          <p className='text-muted-foreground mt-1.5 text-xs leading-relaxed'>
            {t('For pay-as-you-go usage and subscription purchases')}
          </p>
        </div>
        <div className='flex min-h-16 flex-1 items-center justify-between gap-4'>
          {props.loading ? (
            <Skeleton className='h-12 w-48 min-w-0' />
          ) : (
            <p className='min-w-0 text-4xl leading-tight font-semibold tracking-tight break-all tabular-nums sm:text-5xl'>
              {formatQuota(props.user?.quota ?? 0)}
            </p>
          )}
          <Button
            size='lg'
            className='relative top-1.5 h-10 overflow-hidden rounded-md bg-lime-400 px-5 text-sm font-semibold text-black shadow-[0_4px_14px_rgba(163,230,53,0.28)] duration-300 hover:-translate-y-px hover:bg-lime-400 hover:shadow-[0_8px_24px_rgba(163,230,53,0.4)] active:translate-y-px'
            onClick={props.onAddFunds}
            aria-haspopup='dialog'
          >
            <span
              aria-hidden='true'
              className='pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 ease-out group-hover/button:translate-x-full'
            />
            <span className='relative'>{t('Top up now')}</span>
          </Button>
        </div>
      </div>
      <div className='flex min-w-0 flex-col gap-3 border-t px-5 py-4 sm:px-6 sm:py-5 @min-[56rem]/wallet:border-t-0 @min-[56rem]/wallet:border-l'>
        <div>
          <div className='flex min-h-10 items-center justify-between gap-3'>
            <span className='flex items-center gap-2 text-sm font-medium'>
              <HugeiconsIcon
                icon={ChartHistogramIcon}
                size={18}
                strokeWidth={1.7}
                aria-hidden='true'
              />
              {t('Total Usage')}
            </span>
          </div>
          <p className='text-muted-foreground mt-1.5 text-xs leading-relaxed'>
            {t('Historical consumed quota')}
          </p>
        </div>
        <div className='flex min-h-16 flex-1 items-center justify-between gap-4'>
          {props.loading ? (
            <Skeleton className='h-9 w-40 min-w-0' />
          ) : (
            <p className='min-w-0 text-3xl leading-tight font-semibold tracking-tight break-all tabular-nums'>
              {formatQuota(props.user?.used_quota ?? 0)}
            </p>
          )}
          <Button
            variant='ghost'
            size='lg'
            className='relative top-1.5 h-10'
            render={
              <Link to='/usage-logs/$section' params={{ section: 'common' }} />
            }
          >
            <HugeiconsIcon
              icon={Invoice01Icon}
              data-icon='inline-start'
              aria-hidden='true'
            />
            {t('Billing History')}
            <HugeiconsIcon
              icon={ArrowRight01Icon}
              data-icon='inline-end'
              aria-hidden='true'
            />
          </Button>
        </div>
      </div>
      {props.children}
    </section>
  )
}
