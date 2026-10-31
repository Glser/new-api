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
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { useBillingTime } from '@/features/pricing/hooks/use-billing-time'
import type { PricingModel } from '@/features/pricing/types'
import { HitPriceConfig } from '@/features/usage-logs/lib/hit-pricing'
import { useSystemConfigStore } from '@/stores/system-config-store'

import {
  getModelHitPriceParts,
  type ModelHitPriceEmptyStatus,
} from '../lib/model-hit-price'

const EMPTY_PRICE_MESSAGE: Record<ModelHitPriceEmptyStatus, string> = {
  unset: 'Unset price',
  'not-configured': 'Not configured',
  special: 'Special billing expression',
  'dynamic-empty': 'Dynamic Pricing',
}

export function ModelHitPriceCell(props: { model: PricingModel }) {
  const { t } = useTranslation()
  useSystemConfigStore((state) => state.config.currency)
  const billingTime = useBillingTime(props.model.billing_expr)
  const hit = useMemo(
    () =>
      getModelHitPriceParts(props.model, {
        now: billingTime === undefined ? undefined : new Date(billingTime),
      }),
    [props.model, billingTime]
  )

  if (hit.status !== 'ready') {
    return (
      <span className='text-muted-foreground text-xs'>
        {t(EMPTY_PRICE_MESSAGE[hit.status])}
      </span>
    )
  }

  return (
    <HitPriceConfig
      parts={hit.parts}
      displayParts={hit.displayParts}
      perCall={hit.perCall}
      ratio={1}
      className='max-w-72 flex-wrap justify-center gap-y-0.5 text-xs! whitespace-normal [&>span]:whitespace-nowrap'
    />
  )
}
