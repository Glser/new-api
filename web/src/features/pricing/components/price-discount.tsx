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
import type { ReactElement } from 'react'
import { useTranslation } from 'react-i18next'

import { GroupMultiplierBadge } from '@/components/group-badge'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

import { formatPriceRatio, getPriceDiscount } from '../lib/usd-price'

type PriceDiscountProps = {
  groupRatio: number
  usdOfficial: boolean
  mixedCurrencies?: boolean
}

export function PriceDiscountHint(
  props: PriceDiscountProps & { children: ReactElement }
) {
  const { t } = useTranslation()
  const discount = getPriceDiscount(props.groupRatio, props.usdOfficial)
  const ratio = formatPriceRatio(discount.groupRatio)
  const effectiveRatio = formatPriceRatio(discount.effectiveRatio)

  return (
    <Tooltip>
      <TooltipTrigger render={props.children} />
      <TooltipContent className='block max-w-72 space-y-2'>
        <p className='font-medium'>{t('Price calculation')}</p>
        <dl className='grid grid-cols-[auto_1fr] gap-x-5 gap-y-1.5'>
          <dt className='text-muted-foreground'>{t('Group Ratio')}</dt>
          <dd className='text-right font-mono tabular-nums'>×{ratio}</dd>
          {props.usdOfficial && (
            <>
              <dt className='text-muted-foreground'>
                {t('Fixed exchange rate')}
              </dt>
              <dd className='text-right font-mono'>1 USD = 7 CNY</dd>
            </>
          )}
          <dt className='text-muted-foreground'>
            {props.mixedCurrencies
              ? t('USD official price ratio')
              : t('Price ratio')}
          </dt>
          <dd className='text-right font-mono tabular-nums'>
            {props.usdOfficial ? `${ratio} ÷ ${discount.exchangeRate} = ` : '×'}
            {effectiveRatio}
          </dd>
          {props.mixedCurrencies && (
            <>
              <dt className='text-muted-foreground'>
                {t('CNY official price ratio')}
              </dt>
              <dd className='text-right font-mono tabular-nums'>×{ratio}</dd>
            </>
          )}
        </dl>
        <p className='text-muted-foreground border-t pt-2'>
          {t('Group price divided by official price in the same currency.')}
          {props.mixedCurrencies && (
            <span className='mt-1 block'>
              {t("Discounts vary with the model's official price currency.")}
            </span>
          )}
          {!props.mixedCurrencies && discount.discountPercent > 0 && (
            <span className='text-foreground ml-1 font-medium'>
              {t('Save {{percent}}%', { percent: discount.discountPercent })}
            </span>
          )}
        </p>
      </TooltipContent>
    </Tooltip>
  )
}

export function PriceRatioBadge(
  props: PriceDiscountProps & { className?: string }
) {
  const discount = getPriceDiscount(props.groupRatio, props.usdOfficial)
  return (
    <PriceDiscountHint
      groupRatio={props.groupRatio}
      usdOfficial={props.usdOfficial}
    >
      <span
        tabIndex={0}
        className='focus-visible:outline-ring inline-flex cursor-help rounded focus-visible:outline-2'
      >
        <GroupMultiplierBadge
          ratio={discount.effectiveRatio}
          label={`×${formatPriceRatio(discount.effectiveRatio)}`}
          className={cn(
            'h-auto min-w-0 rounded border-0 bg-lime-400 px-1.5 py-px text-[11px] font-semibold text-black tabular-nums',
            props.className
          )}
        />
      </span>
    </PriceDiscountHint>
  )
}
