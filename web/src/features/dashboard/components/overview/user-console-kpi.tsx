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
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { formatNumber, formatQuota, formatTokens } from '@/lib/format'
import { cn } from '@/lib/utils'

interface UserConsoleKpiProps {
  spendTitle: string
  spend: number
  balance: number
  giftQuota: number
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
    return <Skeleton className='mt-3 h-8 w-24' />
  }
  return (
    <div
      className={cn(
        'mt-3 font-mono text-2xl font-semibold tracking-tight tabular-nums sm:text-[1.75rem]',
        props.className
      )}
    >
      {props.value}
    </div>
  )
}

export function UserConsoleKpi(props: UserConsoleKpiProps) {
  const { t } = useTranslation()

  return (
    <div className='bg-muted/30 overflow-hidden rounded-2xl border'>
      <div className='grid grid-cols-1 divide-y sm:grid-cols-2 sm:divide-x sm:divide-y-0 xl:grid-cols-4'>
        <div className='px-4 py-4 sm:px-5'>
          <div className='text-muted-foreground text-xs font-medium'>
            {props.spendTitle}
          </div>
          <KpiValue loading={props.loading} value={formatQuota(props.spend)} />
          <p className='text-muted-foreground mt-2 text-xs'>
            {t('API usage for the selected range')}
          </p>
        </div>

        <div className='px-4 py-4 sm:px-5'>
          <div className='text-muted-foreground text-xs font-medium'>
            {t('Recharge balance')}
          </div>
          <KpiValue loading={props.loading} value={formatQuota(props.balance)} />
          <p className='text-muted-foreground mt-2 text-xs'>
            {t('Gift remaining {{amount}}', {
              amount: formatQuota(props.giftQuota),
            })}
            {props.giftQuota > 0 ? (
              <Link
                to='/wallet'
                className='text-foreground ml-1 underline-offset-2 hover:underline'
              >
                {t('View')}
              </Link>
            ) : null}
          </p>
          <Button
            size='sm'
            className='mt-3 h-7 bg-lime-400 px-2.5 text-xs font-semibold text-black hover:bg-lime-300'
            render={<Link to='/wallet' />}
          >
            {t('Top up now')}
          </Button>
        </div>

        <div className='px-4 py-4 sm:px-5'>
          <div className='text-muted-foreground text-xs font-medium'>
            {t('Request records')}
          </div>
          <KpiValue
            loading={props.loading}
            value={formatNumber(props.requests)}
          />
          <p className='text-muted-foreground mt-2 text-xs'>
            {t('Token usage {{amount}}', {
              amount: formatTokens(props.tokens),
            })}
          </p>
          <Link
            to='/usage-logs/$section'
            params={{ section: 'common' }}
            className='text-muted-foreground hover:text-foreground mt-3 inline-flex text-xs underline-offset-2 hover:underline'
          >
            {t('Usage logs')} →
          </Link>
        </div>

        <div className='px-4 py-4 sm:px-5'>
          <div className='text-muted-foreground text-xs font-medium'>
            {t('In-progress tasks')}
          </div>
          <KpiValue
            loading={props.loading}
            value={formatNumber(props.inProgressCount)}
          />
          <p className='text-muted-foreground mt-2 text-xs'>
            {t('Images and videos submitted today')}
          </p>
          <Link
            to='/usage-logs/$section'
            params={{ section: 'task' }}
            className='text-muted-foreground hover:text-foreground mt-3 inline-flex text-xs underline-offset-2 hover:underline'
          >
            {t('View tasks')} →
          </Link>
        </div>
      </div>
    </div>
  )
}
