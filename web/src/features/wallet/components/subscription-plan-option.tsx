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

import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { formatDuration, formatResetPeriod } from '@/features/subscriptions/lib'
import type { PlanRecord } from '@/features/subscriptions/types'
import { formatBillingCurrencyFromUSD } from '@/lib/currency'
import { formatQuota } from '@/lib/format'

interface SubscriptionPlanOptionProps {
  record: PlanRecord
  purchaseCount: number
  onSelect: (plan: PlanRecord) => void
}

export function SubscriptionPlanOption(props: SubscriptionPlanOptionProps) {
  const { t } = useTranslation()
  const plan = props.record.plan
  const limit = Number(plan.max_purchase_per_user || 0)
  const reached = limit > 0 && props.purchaseCount >= limit
  const total = Number(plan.total_amount || 0)
  const resetPeriod = formatResetPeriod(plan, t)
  const resets = resetPeriod !== t('No Reset')
  const termTotal = props.record.quota_summary?.total_amount
  const showTermTotal = resets && total > 0 && termTotal !== undefined
  let quotaLabel = t('Total Quota')
  if (resets && total > 0) quotaLabel = t('Quota per reset')
  if (showTermTotal) quotaLabel = t('Estimated term quota')
  const details = [
    {
      label: quotaLabel,
      value: total > 0 ? formatQuota(termTotal ?? total) : t('Unlimited'),
    },
    { label: t('Validity Period'), value: formatDuration(plan, t) },
  ]
  if (resets) {
    if (showTermTotal) {
      details.push({
        label: t('Quota per reset'),
        value: formatQuota(total),
      })
    }
    details.push({ label: t('Quota Reset'), value: resetPeriod })
  }
  if (plan.upgrade_group) {
    details.push({ label: t('Upgrade Group'), value: plan.upgrade_group })
  }
  if (limit > 0) {
    details.push({
      label: t('Purchase Limit'),
      value: `${props.purchaseCount}/${limit}`,
    })
  }

  return (
    <article className='flex min-w-0 flex-col gap-4 py-5 first:pt-1 last:pb-0 @min-[48rem]/subscriptions:flex-row @min-[48rem]/subscriptions:items-center @min-[48rem]/subscriptions:justify-between @min-[48rem]/subscriptions:gap-6'>
      <div className='min-w-0 space-y-2.5'>
        <div className='flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-1'>
          <h4 className='text-base font-semibold break-words'>
            {plan.title || t('Subscription Plans')}
          </h4>
          {plan.subtitle && (
            <p className='text-muted-foreground text-xs leading-relaxed break-words'>
              {plan.subtitle}
            </p>
          )}
        </div>
        <dl className='flex flex-wrap items-center gap-x-5 gap-y-2 text-xs leading-relaxed'>
          {details.map((detail) => (
            <div
              key={detail.label}
              className='flex min-w-0 items-baseline gap-2'
            >
              <dt className='text-muted-foreground shrink-0'>
                {showTermTotal && detail.label === quotaLabel ? (
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <span
                          tabIndex={0}
                          className='cursor-help underline decoration-dotted underline-offset-4'
                        />
                      }
                    >
                      {detail.label}
                    </TooltipTrigger>
                    <TooltipContent>
                      {t(
                        'Estimated across the full validity period. Quota resets each period; unused quota does not roll over.'
                      )}
                    </TooltipContent>
                  </Tooltip>
                ) : (
                  detail.label
                )}
              </dt>
              <dd className='font-medium break-words tabular-nums'>
                {detail.value}
              </dd>
            </div>
          ))}
        </dl>
      </div>
      <div className='flex shrink-0 items-center justify-between gap-5 @min-[48rem]/subscriptions:gap-6'>
        <div className='flex flex-wrap items-baseline gap-x-1.5 gap-y-1'>
          <p className='text-xl leading-tight font-semibold tracking-tight tabular-nums'>
            {formatBillingCurrencyFromUSD(Number(plan.price_amount || 0), {
              abbreviate: false,
            })}
          </p>
          <p className='text-muted-foreground text-xs'>
            / {formatDuration(plan, t)}
          </p>
        </div>
        <Button
          size='lg'
          className='min-w-28'
          disabled={reached}
          title={
            reached
              ? `${t('Purchase limit reached')} (${props.purchaseCount}/${limit})`
              : undefined
          }
          onClick={() => props.onSelect(props.record)}
        >
          {reached ? t('Limit Reached') : t('Subscribe Now')}
        </Button>
      </div>
    </article>
  )
}
