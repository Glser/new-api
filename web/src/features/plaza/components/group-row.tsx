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
import { Tags } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { FILTER_ALL } from '@/features/pricing/constants'
import { matchesPrefix } from '@/features/pricing/lib/usd-price'
import type { PricingModel, PricingUsableGroup } from '@/features/pricing/types'
import { useSystemConfigStore } from '@/stores/system-config-store'

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

/**
 * 价格行用「价格标签」而不是百分号：这一行讲的是分组倍率（×0.5 / ×1），
 * 标签图形和「价格」的语义直接对应，也比孤零零一个 % 更像一枚行首徽标。
 */
export function PlazaGroupRow(props: {
  groups: string[]
  models: PricingModel[]
  groupRatios?: Record<string, number>
  /**
   * /api/pricing usable_group 是「分组名 -> 描述」。
   * 胶囊统一展示分组名称。
   */
  usableGroup?: PricingUsableGroup
  value: string
  onChange: (value: string) => void
}) {
  const { t } = useTranslation()
  const prefixes = useSystemConfigStore(
    (state) => state.config.currency.modelSquareUsdPricePrefixes
  )
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
      const groupModels = props.models.filter((model) =>
        model.enable_groups?.includes(group)
      )
      const usdCount = groupModels.filter((model) =>
        matchesPrefix(model.model_name, prefixes)
      ).length
      const usdOfficial = usdCount > 0
      const mixedCurrencies = usdCount > 0 && usdCount < groupModels.length
      return [
        {
          value: group,
          label: group,
          // 这里的标签语义是分组倍率，始终展示后台配置的原始倍率。
          // 汇率换算和折扣解释保留在悬浮提示及模型详情中。
          suffix: formatRatioBadge(ratio),
          priceDiscount:
            ratio == null
              ? undefined
              : { groupRatio: ratio, usdOfficial, mixedCurrencies },
        },
      ]
    }),
  ]

  return (
    <PlazaFilterRow label={label} icon={<Tags aria-hidden='true' />}>
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
