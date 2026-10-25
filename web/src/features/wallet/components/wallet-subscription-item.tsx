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

import { StatusBadge } from '@/components/status-badge'
import { Progress } from '@/components/ui/progress'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import type { UserSubscriptionRecord } from '@/features/subscriptions/types'
import { formatQuota } from '@/lib/format'

interface WalletSubscriptionItemProps {
  record: UserSubscriptionRecord
  title?: string
  currentTime: number
}

export function WalletSubscriptionItem(props: WalletSubscriptionItemProps) {
  const { t } = useTranslation()
  const subscription = props.record.subscription
  const total = Number(subscription.amount_total || 0)
  const used = Number(subscription.amount_used || 0)
  const remaining = Math.max(0, total - used)
  const now = props.currentTime
  const nextResetTime = subscription.next_reset_time ?? 0
  const active = subscription.status === 'active' && subscription.end_time > now
  const cancelled = subscription.status === 'cancelled'
  const daysRemaining = Math.max(
    0,
    Math.ceil((subscription.end_time - now) / 86400)
  )
  const percent = total > 0 ? Math.max(0, Math.round((used / total) * 100)) : 0
  const termQuota = props.record.quota_summary?.total_amount
  let status = t('Expired')
  let endLabel = t('Expired at')
  if (active) {
    status = t('Active')
    endLabel = t('Until')
  } else if (cancelled) {
    status = t('Cancelled')
    endLabel = t('Cancelled at')
  }

  return (
    <article className='flex min-w-0 flex-col gap-2.5 py-4 first:pt-1 last:pb-0'>
      <div className='flex min-w-0 flex-wrap items-center justify-between gap-x-6 gap-y-2'>
        <div className='flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-1'>
          <h4 className='text-sm font-semibold break-words'>
            {props.title || `${t('Subscription')} #${subscription.id}`}
          </h4>
          {props.title && (
            <span className='text-muted-foreground text-xs tabular-nums'>
              #{subscription.id}
            </span>
          )}
          <StatusBadge
            label={status}
            variant={active ? 'success' : 'neutral'}
            copyable={false}
            type='text'
          />
        </div>
        {termQuota !== undefined && (
          <Tooltip>
            <TooltipTrigger
              render={
                <span
                  tabIndex={0}
                  className='text-muted-foreground ml-auto inline-flex min-w-0 cursor-help items-baseline gap-2 text-xs underline decoration-dotted underline-offset-4'
                />
              }
            >
              {t('Estimated term quota')}
              <span className='text-foreground text-base font-semibold break-all tabular-nums'>
                {total > 0 ? formatQuota(termQuota) : t('Unlimited')}
              </span>
            </TooltipTrigger>
            <TooltipContent>
              {t(
                'Estimated across the full validity period. Quota resets each period; unused quota does not roll over.'
              )}
            </TooltipContent>
          </Tooltip>
        )}
      </div>
      <div className='text-muted-foreground flex min-w-0 flex-wrap items-center justify-between gap-x-6 gap-y-2 text-xs leading-relaxed'>
        <div className='flex min-w-0 flex-wrap items-center gap-x-5 gap-y-1'>
          <span>
            {endLabel}{' '}
            <time
              className='tabular-nums'
              dateTime={new Date(subscription.end_time * 1000).toISOString()}
            >
              {new Date(subscription.end_time * 1000).toLocaleString()}
            </time>
            {active && (
              <>
                {' · '}
                {t('{{count}} days remaining', { count: daysRemaining })}
              </>
            )}
          </span>
        </div>
        <div className='ml-auto flex min-w-0 flex-wrap items-center justify-end gap-x-5 gap-y-1'>
          {total > 0 && (
            <div className='flex min-w-0 items-center gap-3'>
              <Tooltip>
                <TooltipTrigger
                  render={
                    <span
                      tabIndex={0}
                      className='w-fit cursor-help tabular-nums'
                    />
                  }
                >
                  {t('Used')} {formatQuota(used)} / {formatQuota(total)} ·{' '}
                  {percent}%
                </TooltipTrigger>
                <TooltipContent>
                  {t('Raw Quota')}: {used}/{total} · {t('Remaining')}{' '}
                  {remaining}
                </TooltipContent>
              </Tooltip>
              {active && (
                <Progress
                  value={Math.min(100, percent)}
                  aria-label={t('Total Usage')}
                  className='w-20 shrink-0'
                />
              )}
            </div>
          )}
          {active && nextResetTime > 0 && (
            <span>
              {t('Next reset')}
              {': '}
              <time
                className='tabular-nums'
                dateTime={new Date(nextResetTime * 1000).toISOString()}
              >
                {new Date(nextResetTime * 1000).toLocaleString()}
              </time>
            </span>
          )}
        </div>
      </div>
    </article>
  )
}
