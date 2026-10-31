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

import { DynamicPricingBreakdown } from '@/features/pricing/components/dynamic-pricing-breakdown'
import { QUOTA_TYPE_VALUES } from '@/features/pricing/constants'
import {
  isDynamicPricingModel,
  isUnconfiguredTaskUsageModel,
} from '@/features/pricing/lib/dynamic-price'
import { withPluginPricing } from '@/features/pricing/lib/plugin-pricing'
import { calculateTokenPrice } from '@/features/pricing/lib/price'
import type { PriceType, PricingModel } from '@/features/pricing/types'
import { formatBillingCurrencyFromUSD } from '@/lib/currency'
import { useSystemConfigStore } from '@/stores/system-config-store'

const TOKEN_PRICE_FIELDS: { type: PriceType; label: string }[] = [
  { type: 'input', label: 'Input' },
  { type: 'output', label: 'Output' },
  { type: 'cache', label: 'Cache Read' },
  { type: 'create_cache', label: 'Cache Write' },
  { type: 'image', label: 'Image In' },
  { type: 'audio_input', label: 'Audio In' },
  { type: 'audio_output', label: 'Audio Out' },
]

function isConfiguredPrice(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
}

export function TopologyModelPricing(props: { model: PricingModel }) {
  const { t } = useTranslation()
  // Currency formatting reads this store; subscribe so changes update the card.
  useSystemConfigStore((state) => state.config.currency)
  const model = props.model

  if (model.billing_plugin_variants?.length) {
    return (
      <div className='space-y-3'>
        {model.billing_plugin_variants.map((variant) => (
          <div key={variant.plugin_key} className='space-y-2'>
            <div className='text-sm font-medium break-words'>
              {variant.plugin_name || variant.plugin_key}
            </div>
            <TopologyModelPricing model={withPluginPricing(model, variant)} />
          </div>
        ))}
      </div>
    )
  }

  if (isDynamicPricingModel(model)) {
    return (
      <DynamicPricingBreakdown
        compact
        hideTokenUnit
        layout='list'
        modelName={model.model_name}
        billingExpr={model.billing_expr}
        usageSchema={
          Object.keys(model.billing_usage_schema ?? {}).length > 0
            ? model.billing_usage_schema
            : undefined
        }
      />
    )
  }

  const prices: { key: string; label: string; value: number; unit: string }[] =
    []
  if (!isUnconfiguredTaskUsageModel(model)) {
    if (
      model.quota_type === QUOTA_TYPE_VALUES.REQUEST &&
      isConfiguredPrice(model.model_price)
    ) {
      prices.push({
        key: 'request',
        label: 'Price per request',
        value: model.model_price,
        unit: 'request',
      })
    } else if (
      model.quota_type === QUOTA_TYPE_VALUES.TOKEN &&
      isConfiguredPrice(model.model_ratio)
    ) {
      for (const field of TOKEN_PRICE_FIELDS) {
        // Missing ratios are not free prices. Explicit zero ratios remain visible.
        if (
          field.type === 'output' &&
          !isConfiguredPrice(model.completion_ratio)
        ) {
          continue
        }
        const value = calculateTokenPrice(model, field.type, 1)
        if (!isConfiguredPrice(value)) continue
        prices.push({
          key: field.type,
          label: field.label,
          value,
          unit: '1M token',
        })
      }
    }
  }

  if (prices.length === 0) {
    return (
      <div className='text-muted-foreground text-sm'>{t('Not configured')}</div>
    )
  }

  return (
    <dl className='space-y-1.5 text-sm'>
      {prices.map((price) => (
        <div
          key={price.key}
          className='grid grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)] items-baseline gap-3'
        >
          <dt className='text-muted-foreground break-words'>
            {t(price.label)}
          </dt>
          <dd className='text-right font-medium break-words tabular-nums'>
            {formatBillingCurrencyFromUSD(price.value, {
              digitsLarge: 12,
              digitsSmall: 12,
              abbreviate: false,
            })}
            {price.unit !== '1M token' && (
              <span className='text-muted-foreground ml-1 text-xs font-normal'>
                /{t(price.unit)}
              </span>
            )}
          </dd>
        </div>
      ))}
    </dl>
  )
}
