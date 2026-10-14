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
import { Percent } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { FILTER_ALL } from '@/features/pricing/constants'
import type { PricingModel } from '@/features/pricing/types'

import { formatGroupRatio } from '../lib/group-ratio'
import { PlazaFilterChip, type PlazaFilterChipOption } from './filter-chip'
import { PlazaFilterRow } from './filter-row'

function countByGroup(models: PricingModel[], group: string): number {
  return models.reduce(
    (count, model) => count + (model.enable_groups?.includes(group) ? 1 : 0),
    0
  )
}

/** formatGroupRatio 产出 "x0.5"，这里换成更易读的乘号 */
function formatRatioBadge(ratio: number | undefined): string | undefined {
  const formatted = formatGroupRatio(ratio)
  return formatted ? formatted.replaceAll('x', '×') : undefined
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
      countLabel: t('{{count}} models short', { count: props.models.length }),
    },
    // 价格行只保留「分组名 + 倍率」，计数交给「全部」胶囊，避免一粒胶囊里堆三组信息
    ...props.groups.flatMap((group) => {
      const count = countByGroup(props.models, group)
      if (count === 0) {
        return []
      }
      const ratio = props.groupRatios?.[group]
      return [
        {
          value: group,
          label: group,
          suffix: formatRatioBadge(ratio),
          suffixTone:
            ratio != null && ratio < 1
              ? ('discount' as const)
              : ('muted' as const),
        },
      ]
    }),
  ]

  return (
    <PlazaFilterRow label={label} icon={<Percent aria-hidden='true' />}>
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
