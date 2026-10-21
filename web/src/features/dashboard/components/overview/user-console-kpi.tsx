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
    return <Skeleton className='mt-3 h-10 w-28' />
  }
  return (
    <div
      className={cn(
        'mt-3 font-mono text-3xl font-semibold tracking-tight tabular-nums sm:text-4xl',
        props.className
      )}
    >
      {props.value}
    </div>
  )
}

function KpiMeta(props: { detail?: ReactNode; action?: ReactNode }) {
  return (
    <div className='mt-4 flex min-h-8 items-center justify-between gap-2'>
      <div className='min-w-0 flex-1'>{props.detail}</div>
      {props.action ? <div className='shrink-0'>{props.action}</div> : null}
    </div>
  )
}

export function UserConsoleKpi(props: UserConsoleKpiProps) {
  const { t } = useTranslation()

  return (
    <div className='bg-muted/30 overflow-hidden rounded-2xl border'>
      <div className='grid grid-cols-1 divide-y sm:grid-cols-2 sm:divide-x sm:divide-y-0 xl:grid-cols-4'>
        <div className='px-4 py-5 sm:px-5 sm:py-6'>
          <div className='text-muted-foreground text-xs font-medium'>
            {props.spendTitle}
          </div>
          <KpiValue loading={props.loading} value={formatQuota(props.spend)} />
          <KpiMeta detail={<p className='text-muted-foreground truncate text-xs'>{t('API usage for the selected range')}</p>} />
        </div>

        <div className='px-4 py-5 sm:px-5 sm:py-6'>
          <div className='text-muted-foreground text-xs font-medium'>
            {t('Recharge balance')}
          </div>
          <KpiValue loading={props.loading} value={formatQuota(props.balance)} />
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

        <div className='px-4 py-5 sm:px-5 sm:py-6'>
          <div className='text-muted-foreground text-xs font-medium'>
            {t('Request records')}
          </div>
          <KpiValue
            loading={props.loading}
            value={formatNumber(props.requests)}
          />
          <KpiMeta
            detail={
              <p className='text-muted-foreground truncate text-xs'>
                {t('Token usage {{amount}}', {
                  amount: formatTokens(props.tokens),
                })}
              </p>
            }
            action={
              <Link
                to='/usage-logs/$section'
                params={{ section: 'common' }}
                className='text-muted-foreground hover:text-foreground inline-flex text-xs underline-offset-2 hover:underline'
              >
                {t('Usage logs')} →
              </Link>
            }
          />
        </div>

        <div className='px-4 py-5 sm:px-5 sm:py-6'>
          <div className='text-muted-foreground text-xs font-medium'>
            {t('In-progress tasks')}
          </div>
          <KpiValue
            loading={props.loading}
            value={formatNumber(props.inProgressCount)}
          />
          <KpiMeta
            detail={
              <p className='text-muted-foreground truncate text-xs'>
                {t('Images and videos submitted today')}
              </p>
            }
            action={
              <Link
                to='/usage-logs/$section'
                params={{ section: 'task' }}
                className='text-muted-foreground hover:text-foreground inline-flex text-xs underline-offset-2 hover:underline'
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
