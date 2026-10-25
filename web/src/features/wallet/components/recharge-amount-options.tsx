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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { formatLocalCurrencyAmount } from '@/lib/currency'

import type { PresetAmount, TopupInfo } from '../types'

interface RechargeAmountOptionsProps {
  topupInfo: TopupInfo | null
  presets: PresetAmount[]
  amount: number
  minimum: number
  exchangeRate: number
  onSelect: (preset: PresetAmount) => void
  onChange: (amount: number) => void
}

export function RechargeAmountOptions(props: RechargeAmountOptionsProps) {
  const { t } = useTranslation()
  const belowMinimum = props.amount > 0 && props.amount < props.minimum

  return (
    <section className='space-y-3' aria-labelledby='recharge-amount-heading'>
      <div className='flex flex-wrap items-baseline justify-between gap-2'>
        <h3 id='recharge-amount-heading' className='text-sm font-semibold'>
          {t('Topup Amount')}
        </h3>
        <span className='text-muted-foreground text-xs'>
          {t('Minimum topup amount: {{amount}}', { amount: props.minimum })}
        </span>
      </div>
      <div className='grid grid-cols-2 gap-2.5 sm:grid-cols-3'>
        {props.presets.map((preset) => {
          const selected = props.amount === preset.value
          const discount =
            preset.discount || props.topupInfo?.discount?.[preset.value] || 1
          return (
            <Button
              key={preset.value}
              variant='outline'
              aria-pressed={selected}
              data-selected={selected}
              disabled={preset.value < props.minimum}
              className='wallet-recharge-choice relative h-auto min-h-20 min-w-0 flex-col gap-1 rounded-xl px-3 py-4 whitespace-normal'
              onClick={() => props.onSelect(preset)}
            >
              <span className='max-w-full text-xl font-semibold break-all tabular-nums'>
                {formatLocalCurrencyAmount(preset.value * props.exchangeRate, {
                  abbreviate: false,
                })}
              </span>
              {discount > 0 && discount < 1 && (
                <span className='wallet-recharge-discount text-xs'>
                  {t('{{discount}}% discount', {
                    discount: Math.round((1 - discount) * 100),
                  })}
                </span>
              )}
              {selected && (
                <HugeiconsIcon
                  icon={Tick02Icon}
                  className='absolute top-2 right-2 size-3.5'
                  aria-hidden='true'
                />
              )}
            </Button>
          )
        })}
      </div>
      <div className='flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4'>
        <Label htmlFor='topup-amount' className='shrink-0 text-xs'>
          {t('Custom Amount')}
        </Label>
        <Input
          id='topup-amount'
          type='number'
          inputMode='numeric'
          min={props.minimum}
          step={1}
          value={props.amount || ''}
          onChange={(event) =>
            props.onChange(
              Math.max(0, Number.parseInt(event.target.value) || 0)
            )
          }
          aria-invalid={belowMinimum}
          aria-describedby={belowMinimum ? 'recharge-amount-error' : undefined}
          className='h-10 min-w-0 flex-1 tabular-nums'
        />
      </div>
      {belowMinimum && (
        <p id='recharge-amount-error' className='text-destructive text-xs'>
          {t('Minimum topup amount: {{amount}}', { amount: props.minimum })}
        </p>
      )}
    </section>
  )
}
