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

import { FILTER_ALL } from '@/features/pricing/constants'
import type { PricingModel, PricingVendor } from '@/features/pricing/types'
import { getLobeIcon } from '@/lib/lobe-icon'

import {
  PlazaFilterChip,
  type PlazaFilterChipOption,
} from './filter-chip'

function countByVendor(models: PricingModel[], vendorName: string): number {
  return models.reduce(
    (count, model) => count + (model.vendor_name === vendorName ? 1 : 0),
    0
  )
}

export function PlazaVendorRow(props: {
  vendors: PricingVendor[]
  models: PricingModel[]
  value: string
  onChange: (value: string) => void
}) {
  const { t } = useTranslation()

  const options: PlazaFilterChipOption[] = [
    {
      value: FILTER_ALL,
      label: t('All Vendors'),
      count: props.models.length,
    },
    ...props.vendors
      .map((vendor) => ({
        value: vendor.name,
        label: vendor.name,
        count: countByVendor(props.models, vendor.name),
        icon: vendor.icon ? getLobeIcon(vendor.icon, 14) : undefined,
      }))
      .filter((vendor) => vendor.count > 0),
  ]

  return (
    <div className='flex flex-col gap-2'>
      <p className='text-muted-foreground text-xs font-medium tracking-wide uppercase'>
        {t('Provider')}
      </p>
      <div
        role='group'
        aria-label={t('All Vendors')}
        className='hover-scrollbar flex gap-2 overflow-x-auto pb-1'
      >
        {options.map((option) => (
          <PlazaFilterChip
            key={option.value}
            option={option}
            active={props.value === option.value}
            onClick={() => props.onChange(option.value)}
          />
        ))}
      </div>
    </div>
  )
}
