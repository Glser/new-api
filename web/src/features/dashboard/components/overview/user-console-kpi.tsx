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
import { Link } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { Skeleton } from '@/components/ui/skeleton'
import { formatNumber, formatQuota, formatTokens } from '@/lib/format'
import { cn } from '@/lib/utils'

interface UserConsoleKpiProps {
  spendTitle: string
  spend: number
  balance: number
  requests: number
  tokens: number
  inProgressCount: number
  loading?: boolean
}

function KpiValue(props: {
  loading?: boolean
  value: string
  className?: string
}) {
  if (props.loading) {
    return (
      <Skeleton className='mt-2 h-8 w-24 @min-[48rem]/console:mt-3 @min-[48rem]/console:h-10 @min-[48rem]/console:w-28' />
    )
  }
  return (
    <div
      className={cn(
        'mt-2 font-mono text-2xl font-semibold tracking-tight tabular-nums @min-[48rem]/console:mt-3 @min-[48rem]/console:text-3xl @min-[80rem]/console:text-4xl',
        props.className
      )}
    >
      {props.value}
    </div>
  )
}

function KpiMeta(props: { detail?: ReactNode; action?: ReactNode }) {
  return (
    <div className='mt-3 flex min-h-8 flex-wrap items-center justify-between gap-2 @min-[48rem]/console:mt-4'>
      <div className='min-w-0 flex-1'>{props.detail}</div>
      {props.action ? <div className='shrink-0'>{props.action}</div> : null}
    </div>
  )
}

export function UserConsoleKpi(props: UserConsoleKpiProps) {
  const { t } = useTranslation()

  return (
    <div className='bg-muted/30 overflow-hidden rounded-2xl border'>
      <div className='grid grid-cols-1 @min-[32rem]/console:grid-cols-2 @min-[72rem]/console:grid-cols-4'>
        <div className='min-w-0 border-b px-3 py-4 @min-[32rem]/console:border-r @min-[48rem]/console:px-5 @min-[48rem]/console:py-6 @min-[72rem]/console:border-b-0'>
          <div className='text-muted-foreground text-[11px] font-medium @min-[48rem]/console:text-xs'>
            {t('Current Balance')}
          </div>
          <KpiValue
            loading={props.loading}
            value={formatQuota(props.balance)}
          />
          <KpiMeta
            detail={
              <Link
                to='/wallet'
                className='group relative -ml-1 inline-flex h-7 items-center overflow-hidden rounded-md bg-lime-400 px-2.5 text-xs font-semibold text-black shadow-[0_4px_14px_rgba(163,230,53,0.28)] transition-all duration-300 hover:-translate-y-px hover:bg-lime-400 hover:shadow-[0_8px_24px_rgba(163,230,53,0.4)] active:translate-y-px'
              >
                <span
                  aria-hidden
                  className='pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 ease-out group-hover:translate-x-full'
                />
                <span className='relative'>{t('Top up now')}</span>
              </Link>
            }
          />
        </div>

        <div className='min-w-0 border-b px-3 py-4 @min-[48rem]/console:px-5 @min-[48rem]/console:py-6 @min-[72rem]/console:border-r @min-[72rem]/console:border-b-0'>
          <div className='text-muted-foreground text-[11px] font-medium @min-[48rem]/console:text-xs'>
            {props.spendTitle}
          </div>
          <KpiValue loading={props.loading} value={formatQuota(props.spend)} />
          <KpiMeta
            detail={
              <p className='text-muted-foreground truncate text-[11px] @min-[48rem]/console:text-xs'>
                {t('API usage for the selected range')}
              </p>
            }
          />
        </div>

        <div className='min-w-0 border-b px-3 py-4 @min-[32rem]/console:border-r @min-[32rem]/console:border-b-0 @min-[48rem]/console:px-5 @min-[48rem]/console:py-6'>
          <div className='text-muted-foreground text-[11px] font-medium @min-[48rem]/console:text-xs'>
            {t('Request records')}
          </div>
          <KpiValue
            loading={props.loading}
            value={formatNumber(props.requests)}
          />
          <KpiMeta
            detail={
              <p className='text-muted-foreground truncate text-[11px] @min-[48rem]/console:text-xs'>
                {t('Token usage {{amount}}', {
                  amount: formatTokens(props.tokens),
                })}
              </p>
            }
            action={
              <Link
                to='/usage-logs/$section'
                params={{ section: 'common' }}
                className='text-muted-foreground hover:text-foreground inline-flex text-[11px] underline-offset-2 hover:underline @min-[48rem]/console:text-xs'
              >
                {t('Usage logs')} →
              </Link>
            }
          />
        </div>

        <div className='min-w-0 px-3 py-4 @min-[48rem]/console:px-5 @min-[48rem]/console:py-6'>
          <div className='text-muted-foreground text-[11px] font-medium @min-[48rem]/console:text-xs'>
            {t('In-progress tasks')}
          </div>
          <KpiValue
            loading={props.loading}
            value={formatNumber(props.inProgressCount)}
          />
          <KpiMeta
            detail={
              <p className='text-muted-foreground truncate text-[11px] @min-[48rem]/console:text-xs'>
                {t('Images and videos submitted today')}
              </p>
            }
            action={
              <Link
                to='/usage-logs/$section'
                params={{ section: 'task' }}
                className='text-muted-foreground hover:text-foreground inline-flex text-[11px] underline-offset-2 hover:underline @min-[48rem]/console:text-xs'
              >
                {t('View tasks')} →
              </Link>
            }
          />
        </div>
      </div>
    </div>
  )
}
