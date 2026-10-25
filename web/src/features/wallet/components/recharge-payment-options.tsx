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
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'

import { getPaymentIcon } from '../lib'
import type { PaymentMethod } from '../types'

export interface RechargePaymentOption {
  key: string
  method: PaymentMethod
  minimum: number
  waffoIndex: number | null
}

interface RechargePaymentOptionsProps {
  options: RechargePaymentOption[]
  amount: number
  selectedMethod?: PaymentMethod
  selectedWaffoIndex: number | null
  onSelect: (option: RechargePaymentOption) => void
}

export function RechargePaymentOptions(props: RechargePaymentOptionsProps) {
  const { t } = useTranslation()
  return (
    <section className='space-y-3' aria-labelledby='recharge-payment-heading'>
      <h3 id='recharge-payment-heading' className='text-sm font-semibold'>
        {t('Payment Method')}
      </h3>
      {props.options.length > 0 ? (
        <div className='grid grid-cols-1 gap-2.5 min-[360px]:grid-cols-2'>
          {props.options.map((option) => {
            const selected =
              props.selectedMethod?.type === option.method.type &&
              props.selectedWaffoIndex === option.waffoIndex
            const belowMinimum = props.amount < option.minimum
            return (
              <Button
                key={option.key}
                variant='outline'
                aria-label={option.method.name}
                aria-pressed={selected}
                data-selected={selected}
                className='wallet-recharge-choice h-auto min-h-16 min-w-0 justify-start gap-3 rounded-xl px-4 py-3 text-left whitespace-normal'
                onClick={() => props.onSelect(option)}
              >
                {getPaymentIcon(
                  option.method.type,
                  'size-5',
                  option.method.icon,
                  option.method.name
                )}
                <span className='min-w-0 flex-1'>
                  <span className='block break-words'>
                    {option.method.name}
                  </span>
                  {belowMinimum && (
                    <span className='text-muted-foreground mt-1 block text-xs font-normal'>
                      {t('Minimum topup amount: {{amount}}', {
                        amount: option.minimum,
                      })}
                    </span>
                  )}
                </span>
                {selected && (
                  <HugeiconsIcon
                    icon={Tick02Icon}
                    className='size-4 shrink-0'
                    aria-hidden='true'
                  />
                )}
              </Button>
            )
          })}
        </div>
      ) : (
        <p className='text-muted-foreground text-sm leading-relaxed'>
          {t('No payment methods available. Please contact administrator.')}
        </p>
      )}
    </section>
  )
}
