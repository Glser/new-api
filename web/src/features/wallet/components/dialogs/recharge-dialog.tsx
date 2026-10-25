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
  CreditCardIcon,
  RefreshIcon,
  SecurityCheckIcon,
  Wallet01Icon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { useTranslation } from 'react-i18next'

import { Dialog } from '@/components/dialog'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { formatLocalCurrencyAmount } from '@/lib/currency'

import { PAYMENT_TYPES } from '../../constants'
import {
  formatCurrency,
  getMinTopupAmount,
  getPaymentMethodMinTopup,
} from '../../lib'
import type {
  CreemProduct,
  PaymentMethod,
  PresetAmount,
  TopupInfo,
  WaffoPayMethod,
} from '../../types'
import { CreemProductsSection } from '../creem-products-section'
import { RechargeAmountOptions } from '../recharge-amount-options'
import {
  RechargePaymentOptions,
  type RechargePaymentOption,
} from '../recharge-payment-options'

interface RechargeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  topupInfo: TopupInfo | null
  loading: boolean
  presets: PresetAmount[]
  amount: number
  onAmountChange: (amount: number) => void
  onPresetSelect: (preset: PresetAmount) => void
  paymentAmount: number
  calculating: boolean
  processing: boolean
  selectedMethod?: PaymentMethod
  selectedWaffoIndex: number | null
  onMethodSelect: (method: PaymentMethod) => void
  onWaffoSelect: (method: WaffoPayMethod, index: number) => void
  onCreemSelect: (product: CreemProduct) => void
  onConfirm: () => void
  exchangeRate: number
}

export function RechargeDialog(props: RechargeDialogProps) {
  const { t } = useTranslation()
  const info = props.topupInfo
  const hasAmountTopup = !!(
    info?.enable_online_topup ||
    info?.enable_stripe_topup ||
    info?.enable_waffo_topup ||
    info?.enable_waffo_pancake_topup
  )
  const options: RechargePaymentOption[] = (info?.pay_methods || [])
    .filter((method) => {
      if (method.type === PAYMENT_TYPES.STRIPE) return info?.enable_stripe_topup
      if (method.type === PAYMENT_TYPES.WAFFO_PANCAKE) {
        return info?.enable_waffo_pancake_topup
      }
      return info?.enable_online_topup
    })
    .map((method) => ({
      key: method.type,
      method,
      minimum: getPaymentMethodMinTopup(info, method),
      waffoIndex: null,
    }))
  if (info?.enable_waffo_topup) {
    info.waffo_pay_methods?.forEach((method, index) => {
      const paymentMethod = {
        name: method.name,
        type: PAYMENT_TYPES.WAFFO,
        icon: method.icon,
      }
      options.push({
        key: `waffo-${index}`,
        method: paymentMethod,
        minimum: getPaymentMethodMinTopup(info, paymentMethod),
        waffoIndex: index,
      })
    })
  }
  const selectedOption = options.find(
    (option) =>
      option.method.type === props.selectedMethod?.type &&
      option.waffoIndex === props.selectedWaffoIndex
  )
  const minimum = selectedOption?.minimum ?? getMinTopupAmount(info)
  const canPay =
    !!selectedOption &&
    props.amount >= minimum &&
    props.amount > 0 &&
    Number.isFinite(props.paymentAmount) &&
    props.paymentAmount > 0 &&
    !props.calculating &&
    !props.processing &&
    !props.loading
  const quoteFailed =
    !!selectedOption &&
    props.amount >= minimum &&
    props.amount > 0 &&
    !props.calculating &&
    (!Number.isFinite(props.paymentAmount) || props.paymentAmount <= 0)

  return (
    <Dialog
      open={props.open}
      onOpenChange={(open) => {
        if (!props.processing) props.onOpenChange(open)
      }}
      showCloseButton={!props.processing}
      title={
        <span className='flex items-center gap-3 pr-5'>
          <span className='wallet-recharge-icon flex size-11 shrink-0 items-center justify-center rounded-xl'>
            <HugeiconsIcon
              icon={Wallet01Icon}
              className='size-6'
              aria-hidden='true'
            />
          </span>
          <span>{t('Wallet Top-up')}</span>
        </span>
      }
      description={t(
        'Choose an amount and payment method, then continue to checkout.'
      )}
      contentClassName='wallet-recharge-dialog max-h-[calc(100dvh-2rem)] rounded-2xl sm:max-w-[42rem] sm:p-7'
      titleClassName='text-xl font-semibold'
      descriptionClassName='text-xs leading-relaxed sm:pl-14'
      headerClassName='gap-2 border-b pb-5'
      bodyClassName='space-y-6'
      scrollClassName='max-h-none'
      footerClassName='mx-0 mb-0 flex-col gap-3 rounded-none border-t bg-transparent px-0 pt-4 pb-0 sm:mx-0 sm:mb-0 sm:flex-col sm:px-0 sm:pt-4 sm:pb-0'
      footer={
        hasAmountTopup && !props.loading ? (
          <>
            <dl className='grid grid-cols-2 gap-4'>
              <div className='min-w-0'>
                <dt className='text-muted-foreground text-xs'>
                  {t('Topup Amount')}
                </dt>
                <dd className='mt-1 text-lg font-semibold break-all tabular-nums'>
                  {formatLocalCurrencyAmount(
                    props.amount * props.exchangeRate,
                    { abbreviate: false }
                  )}
                </dd>
              </div>
              <div className='min-w-0 text-right'>
                <dt className='text-muted-foreground text-xs'>
                  {t('You Pay')}
                </dt>
                <dd
                  className='mt-1 text-2xl leading-7 font-semibold break-all tabular-nums'
                  aria-live='polite'
                >
                  {props.calculating ? (
                    <Skeleton className='ml-auto h-7 w-20' />
                  ) : (
                    <span>
                      {selectedOption && props.paymentAmount > 0
                        ? formatCurrency(props.paymentAmount)
                        : '—'}
                    </span>
                  )}
                </dd>
              </div>
            </dl>
            {quoteFailed && (
              <p role='status' className='text-destructive text-xs'>
                {t(
                  'Unable to calculate the payment amount. Select an amount or payment method to retry.'
                )}
              </p>
            )}
            <Button
              className='wallet-recharge-submit h-12 w-full gap-2 rounded-xl text-sm font-semibold'
              disabled={!canPay}
              onClick={props.onConfirm}
            >
              <HugeiconsIcon
                icon={props.processing ? RefreshIcon : CreditCardIcon}
                className={
                  props.processing
                    ? 'size-4 animate-spin motion-reduce:animate-none'
                    : 'size-4'
                }
                aria-hidden='true'
              />
              {props.processing ? t('Processing...') : t('Continue to Payment')}
              <HugeiconsIcon
                icon={ArrowRight01Icon}
                className='size-4'
                aria-hidden='true'
              />
            </Button>
            <p className='text-muted-foreground flex items-start justify-center gap-1.5 text-center text-xs leading-relaxed'>
              <HugeiconsIcon
                icon={SecurityCheckIcon}
                className='mt-0.5 size-3.5 shrink-0'
                aria-hidden='true'
              />
              {t('Your balance updates after the payment is confirmed.')}
            </p>
          </>
        ) : undefined
      }
    >
      {props.loading ? (
        <div className='space-y-4'>
          <Skeleton className='h-6 w-40' />
          <Skeleton className='h-44 w-full rounded-xl' />
          <Skeleton className='h-16 w-full rounded-xl' />
        </div>
      ) : (
        <>
          {hasAmountTopup ? (
            <fieldset disabled={props.processing} className='min-w-0 space-y-6'>
              <ol
                aria-label={t('Top-up steps')}
                className='text-muted-foreground flex flex-wrap gap-x-5 gap-y-2 text-xs'
              >
                {[
                  t('Choose Amount'),
                  t('Choose Payment'),
                  t('Complete Payment'),
                ].map((step, index) => (
                  <li key={step} className='flex items-center gap-2'>
                    <span className='flex size-5 items-center justify-center rounded-full border text-[11px] tabular-nums'>
                      {index + 1}
                    </span>
                    {step}
                  </li>
                ))}
              </ol>
              <RechargeAmountOptions
                topupInfo={info}
                presets={props.presets}
                amount={props.amount}
                minimum={minimum}
                exchangeRate={props.exchangeRate}
                onSelect={props.onPresetSelect}
                onChange={props.onAmountChange}
              />
              <RechargePaymentOptions
                options={options}
                amount={props.amount}
                selectedMethod={props.selectedMethod}
                selectedWaffoIndex={props.selectedWaffoIndex}
                onSelect={(option) => {
                  if (option.waffoIndex !== null) {
                    const method = info?.waffo_pay_methods?.[option.waffoIndex]
                    if (method) props.onWaffoSelect(method, option.waffoIndex)
                  } else props.onMethodSelect(option.method)
                }}
              />
            </fieldset>
          ) : null}
          {info?.enable_creem_topup && !!info.creem_products?.length && (
            <section className='space-y-3'>
              <h3 className='text-sm font-semibold'>{t('Creem Payment')}</h3>
              <CreemProductsSection
                products={info.creem_products}
                onProductSelect={props.onCreemSelect}
                loading={props.processing}
              />
            </section>
          )}
          {!hasAmountTopup &&
            !(info?.enable_creem_topup && info.creem_products?.length) && (
              <p className='text-muted-foreground py-5 text-sm leading-relaxed'>
                {t(
                  'Online topup is not enabled. Please use redemption code or contact administrator.'
                )}
              </p>
            )}
        </>
      )}
    </Dialog>
  )
}
