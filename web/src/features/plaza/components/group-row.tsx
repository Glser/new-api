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
import type { PricingModel } from '@/features/pricing/types'

import { formatGroupRatio } from '../lib/group-ratio'
import {
  PlazaFilterChip,
  type PlazaFilterChipOption,
} from './filter-chip'
import { PlazaFilterRow } from './filter-row'

function countByGroup(models: PricingModel[], group: string): number {
  return models.reduce(
    (count, model) => count + (model.enable_groups?.includes(group) ? 1 : 0),
    0
  )
}

export function PlazaGroupRow(props: {
  groups: string[]
  models: PricingModel[]
  groupRatios?: Record<string, number>
  value: string
  onChange: (value: string) => void
}) {
  const { t } = useTranslation()
  const label = t('Price')

  const options: PlazaFilterChipOption[] = [
    {
      value: FILTER_ALL,
      label: t('All'),
      countLabel: t('{{count}} available', { count: props.models.length }),
    },
    ...props.groups.map((group) => ({
      value: group,
      label: group,
      suffix: formatGroupRatio(props.groupRatios?.[group]),
      countLabel: t('{{count}} available', {
        count: countByGroup(props.models, group),
      }),
    })),
  ]

  return (
    <PlazaFilterRow label={label}>
      {options.map((option) => (
        <PlazaFilterChip
          key={option.value}
          option={option}
          active={props.value === option.value}
          onClick={() => props.onChange(option.value)}
        />
      ))}
    </PlazaFilterRow>
  )
}
