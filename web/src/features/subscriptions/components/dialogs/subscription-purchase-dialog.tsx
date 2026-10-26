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
import { Tick02Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { Crown, CalendarClock, Loader2, Package, Wallet } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { Dialog } from '@/components/dialog'
import { GroupBadge } from '@/components/group-badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Separator } from '@/components/ui/separator'
import { getPaymentIcon } from '@/features/wallet/lib/ui'
import { useSystemConfig } from '@/hooks/use-system-config'
import { formatBillingCurrencyFromUSD } from '@/lib/currency'
import { formatQuota } from '@/lib/format'
import { handleServerError } from '@/lib/handle-server-error'
import { cn } from '@/lib/utils'
import { DEFAULT_CURRENCY_CONFIG } from '@/stores/system-config-store'

import {
  paySubscriptionStripe,
  paySubscriptionCreem,
  paySubscriptionEpay,
  paySubscriptionWaffoPancake,
  paySubscriptionBalance,
} from '../../api'
import { formatDuration, formatResetPeriod } from '../../lib'
import type { PlanRecord } from '../../types'

interface PaymentMethod {
  type: string
  name?: string
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  plan: PlanRecord | null
  enableStripe?: boolean
  enableCreem?: boolean
  enableWaffoPancake?: boolean
  enableOnlineTopUp?: boolean
  epayMethods?: PaymentMethod[]
  purchaseLimit?: number
  purchaseCount?: number
  userQuota?: number
  onPurchaseSuccess?: () => void | Promise<void>
}

export function SubscriptionPurchaseDialog(props: Props) {
  const { t } = useTranslation()
  const { currency } = useSystemConfig()
  const [paying, setPaying] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState('')

  const handleOpenChange = (open: boolean) => {
    if (!open) setPaymentMethod('')
    props.onOpenChange(open)
  }

  const plan = props.plan?.plan
  if (!plan) return null

  const hasStripe = props.enableStripe && !!plan.stripe_price_id
  const hasCreem = props.enableCreem && !!plan.creem_product_id
  const hasWaffoPancake =
    props.enableWaffoPancake && !!plan.waffo_pancake_product_id
  const hasEpay =
    props.enableOnlineTopUp && (props.epayMethods || []).length > 0
  const totalAmount = Number(plan.total_amount || 0)
  const termTotalAmount = props.plan?.quota_summary?.total_amount
  const showTermTotal =
    totalAmount > 0 &&
    formatResetPeriod(plan, t) !== t('No Reset') &&
    termTotalAmount !== undefined
  const quotaPerUnit =
    currency?.quotaPerUnit && currency.quotaPerUnit > 0
      ? currency.quotaPerUnit
      : DEFAULT_CURRENCY_CONFIG.quotaPerUnit
  const balanceCost = Math.max(
    0,
    Math.ceil(Number(plan.price_amount || 0) * quotaPerUnit)
  )
  const userQuota = Math.max(0, Number(props.userQuota || 0))
  const allowBalancePay = plan.allow_balance_pay !== false
  const insufficientBalance = userQuota < balanceCost
  const limitReached =
    (props.purchaseLimit || 0) > 0 &&
    (props.purchaseCount || 0) >= (props.purchaseLimit || 0)

  const handlePayStripe = async () => {
    setPaying(true)
    try {
      const res = await paySubscriptionStripe({ plan_id: plan.id })
      if (res.message === 'success' && res.data?.pay_link) {
        window.open(res.data.pay_link, '_blank')
        toast.success(t('Payment page opened'))
        handleOpenChange(false)
      } else {
        handleServerError(res, t('Payment request failed'))
      }
    } catch (error) {
      handleServerError(error, t('Payment request failed'))
    } finally {
      setPaying(false)
    }
  }

  const handlePayCreem = async () => {
    setPaying(true)
    try {
      const res = await paySubscriptionCreem({ plan_id: plan.id })
      if (res.message === 'success' && res.data?.checkout_url) {
        window.open(res.data.checkout_url, '_blank')
        toast.success(t('Payment page opened'))
        handleOpenChange(false)
      } else {
        handleServerError(res, t('Payment request failed'))
      }
    } catch (error) {
      handleServerError(error, t('Payment request failed'))
    } finally {
      setPaying(false)
    }
  }

  // In-tab redirect (not window.open) — user-gesture context is lost
  // across the await, so a popup would be blocked. Same as the wallet hook.
  const handlePayWaffoPancake = async () => {
    setPaying(true)
    try {
      const res = await paySubscriptionWaffoPancake({ plan_id: plan.id })
      if (res.message === 'success' && res.data?.checkout_url) {
        toast.success(t('Redirecting to payment page...'))
        window.location.href = res.data.checkout_url
      } else {
        handleServerError(res, t('Payment request failed'))
      }
    } catch (error) {
      handleServerError(error, t('Payment request failed'))
    } finally {
      setPaying(false)
    }
  }

  const isSafari =
    typeof navigator !== 'undefined' &&
    /^((?!chrome|android).)*safari/i.test(navigator.userAgent)

  const handlePayEpay = async (selectedEpayMethod: string) => {
    if (!selectedEpayMethod) {
      toast.error(t('Please select a payment method'))
      return
    }
    setPaying(true)
    try {
      const res = await paySubscriptionEpay({
        plan_id: plan.id,
        payment_method: selectedEpayMethod,
      })
      if (res.message === 'success' && res.url) {
        const form = document.createElement('form')
        form.action = res.url
        form.method = 'POST'
        if (!isSafari) {
          form.target = '_blank'
        }
        Object.entries(res.data || {}).forEach(([key, value]) => {
          const input = document.createElement('input')
          input.type = 'hidden'
          input.name = key
          input.value = String(value)
          form.appendChild(input)
        })
        document.body.appendChild(form)
        form.submit()
        document.body.removeChild(form)
        toast.success(t('Payment initiated'))
        handleOpenChange(false)
      } else {
        handleServerError(res, t('Payment request failed'))
      }
    } catch (error) {
      handleServerError(error, t('Payment request failed'))
    } finally {
      setPaying(false)
    }
  }

  const handlePayBalance = async () => {
    if (!allowBalancePay) {
      toast.error(t('This plan does not allow balance redemption'))
      return
    }
    setPaying(true)
    try {
      const res = await paySubscriptionBalance({ plan_id: plan.id })
      if (res.success) {
        toast.success(t('Subscription purchased successfully'))
        void props.onPurchaseSuccess?.()
        handleOpenChange(false)
      } else {
        handleServerError(res, t('Payment request failed'))
      }
    } catch (error) {
      handleServerError(error, t('Payment request failed'))
    } finally {
      setPaying(false)
    }
  }

  const paymentOptions = [
    {
      value: 'balance',
      name: t('Pay with Balance'),
      type: 'balance',
      disabled: !allowBalancePay || insufficientBalance,
      onPay: handlePayBalance,
    },
    ...(hasStripe
      ? [
          {
            value: 'stripe',
            name: 'Stripe',
            type: 'stripe',
            disabled: false,
            onPay: handlePayStripe,
          },
        ]
      : []),
    ...(hasCreem
      ? [
          {
            value: 'creem',
            name: 'Creem',
            type: 'creem',
            disabled: false,
            onPay: handlePayCreem,
          },
        ]
      : []),
    ...(hasWaffoPancake
      ? [
          {
            value: 'waffo',
            name: 'Waffo Pancake',
            type: 'waffo_pancake',
            disabled: false,
            onPay: handlePayWaffoPancake,
          },
        ]
      : []),
    ...(hasEpay
      ? (props.epayMethods || []).map((method) => ({
          value: `epay:${method.type}`,
          name: method.name || method.type,
          type: method.type,
          disabled: false,
          onPay: () => handlePayEpay(method.type),
        }))
      : []),
  ]
  const selectedPayment =
    paymentOptions.find(
      (option) => option.value === paymentMethod && !option.disabled
    ) ?? paymentOptions.find((option) => !option.disabled)
  const amountDue = formatBillingCurrencyFromUSD(
    Number(plan.price_amount || 0),
    {
      abbreviate: false,
    }
  )

  return (
    <Dialog
      open={props.open}
      onOpenChange={handleOpenChange}
      title={
        <>
          <Crown className='h-5 w-5' />
          {t('Purchase Subscription')}
        </>
      }
      contentClassName='wallet-subscription-dialog max-sm:w-[calc(100vw-1.5rem)] sm:max-w-md'
      titleClassName='flex items-center gap-2'
      contentHeight='auto'
      bodyClassName='space-y-4'
      footer={
        <Button
          className='h-11 w-full gap-2'
          disabled={paying || limitReached || !selectedPayment}
          onClick={() => void selectedPayment?.onPay()}
        >
          {paying && <Loader2 className='size-4 animate-spin' />}
          {paying ? t('Processing...') : t('Pay')}
          {!paying && <span className='tabular-nums'>{amountDue}</span>}
        </Button>
      }
    >
      <div className='space-y-3 sm:space-y-4'>
        <div className='bg-muted/50 space-y-2.5 rounded-lg border p-3 sm:space-y-3 sm:p-4'>
          <div className='flex justify-between'>
            <span className='text-muted-foreground text-sm'>
              {t('Plan Name')}
            </span>
            <span className='max-w-[200px] truncate text-sm font-medium'>
              {plan.title}
            </span>
          </div>
          <div className='flex items-center justify-between'>
            <span className='text-muted-foreground text-sm'>
              {t('Validity Period')}
            </span>
            <span className='flex items-center gap-1 text-sm'>
              <CalendarClock className='h-3.5 w-3.5' />
              {formatDuration(plan, t)}
            </span>
          </div>
          {formatResetPeriod(plan, t) !== t('No Reset') && (
            <div className='flex justify-between'>
              <span className='text-muted-foreground text-sm'>
                {t('Reset Period')}
              </span>
              <span className='text-sm'>{formatResetPeriod(plan, t)}</span>
            </div>
          )}
          <div className='flex items-center justify-between'>
            <span className='text-muted-foreground text-sm'>
              {showTermTotal ? t('Estimated term quota') : t('Plan Quota')}
            </span>
            <span className='flex items-center gap-1 text-sm'>
              <Package className='h-3.5 w-3.5' />
              {totalAmount > 0
                ? formatQuota(termTotalAmount ?? totalAmount)
                : t('Unlimited')}
            </span>
          </div>
          {showTermTotal && (
            <>
              <div className='flex items-center justify-between gap-3'>
                <span className='text-muted-foreground text-sm'>
                  {t('Quota per reset')}
                </span>
                <span className='text-sm'>{formatQuota(totalAmount)}</span>
              </div>
              <p className='text-muted-foreground text-xs leading-relaxed'>
                {t(
                  'Estimated across the full validity period. Quota resets each period; unused quota does not roll over.'
                )}
              </p>
            </>
          )}
          {plan.upgrade_group && (
            <div className='flex items-center justify-between'>
              <span className='text-muted-foreground text-sm'>
                {t('Upgrade Group')}
              </span>
              <GroupBadge group={plan.upgrade_group} />
            </div>
          )}
          <Separator />
          <div className='flex items-center justify-between'>
            <span className='text-sm font-medium'>{t('Amount Due')}</span>
            <span className='text-primary text-lg font-bold'>{amountDue}</span>
          </div>
        </div>

        {limitReached && (
          <Alert variant='destructive'>
            <AlertDescription>
              {t('Purchase limit reached')} ({props.purchaseCount}/
              {props.purchaseLimit})
            </AlertDescription>
          </Alert>
        )}

        <section
          className='flex flex-col gap-3'
          aria-labelledby='subscription-payment-heading'
        >
          <h3
            id='subscription-payment-heading'
            className='text-sm font-semibold'
          >
            {t('Payment Method')}
          </h3>
          <RadioGroup
            aria-labelledby='subscription-payment-heading'
            value={selectedPayment?.value ?? ''}
            onValueChange={(value) => setPaymentMethod(String(value))}
            disabled={paying || limitReached}
            className={cn(
              'grid-cols-1 gap-2.5',
              paymentOptions.length > 2 && 'sm:grid-cols-2'
            )}
          >
            {paymentOptions.map((option) => (
              <Label
                key={option.value}
                data-selected={selectedPayment?.value === option.value}
                className={cn(
                  'wallet-recharge-choice border-border bg-background hover:bg-muted has-[:focus-visible]:ring-ring/50 flex h-auto min-h-16 min-w-0 cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-left whitespace-normal transition-colors has-[:focus-visible]:ring-3 motion-reduce:transition-none',
                  option.value === 'balance' && 'col-span-full',
                  (option.disabled || paying || limitReached) &&
                    'cursor-not-allowed opacity-60'
                )}
              >
                <span
                  className='flex size-5 shrink-0 items-center justify-center'
                  aria-hidden='true'
                >
                  {option.value === 'balance' ? (
                    <Wallet className='size-5' />
                  ) : (
                    getPaymentIcon(option.type, 'size-5')
                  )}
                </span>
                <span className='flex min-w-0 flex-1 flex-col gap-1.5'>
                  <span
                    id={`subscription-payment-label-${option.value}`}
                    className='text-sm leading-snug font-medium break-words'
                  >
                    {option.name}
                  </span>
                  {option.value === 'balance' && (
                    <>
                      <span className='text-muted-foreground flex flex-wrap gap-x-4 gap-y-1 text-xs leading-relaxed font-normal'>
                        <span>
                          {t('Available')}{' '}
                          <span className='text-foreground tabular-nums'>
                            {formatQuota(userQuota)}
                          </span>
                        </span>
                        <span>
                          {t('Amount Due')}{' '}
                          <span className='tabular-nums'>
                            {formatQuota(balanceCost)}
                          </span>
                        </span>
                      </span>
                      {!allowBalancePay && (
                        <span className='text-muted-foreground text-xs leading-relaxed font-normal'>
                          {t('This plan does not allow balance redemption')}
                        </span>
                      )}
                      {allowBalancePay && insufficientBalance && (
                        <span className='text-destructive text-xs leading-relaxed font-normal'>
                          {t('Insufficient balance')}
                        </span>
                      )}
                    </>
                  )}
                </span>
                {selectedPayment?.value === option.value && (
                  <HugeiconsIcon
                    icon={Tick02Icon}
                    className='size-4 shrink-0'
                    aria-hidden='true'
                  />
                )}
                <RadioGroupItem
                  className='sr-only'
                  value={option.value}
                  disabled={option.disabled}
                  aria-labelledby={`subscription-payment-label-${option.value}`}
                />
              </Label>
            ))}
          </RadioGroup>
        </section>
      </div>
    </Dialog>
  )
}
