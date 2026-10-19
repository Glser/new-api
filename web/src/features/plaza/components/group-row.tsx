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

/**
 * 价格行用「价格标签」而不是百分号：这一行讲的是分组倍率（×0.5 / ×1），
 * 标签图形和「价格」的语义直接对应，也比孤零零一个 % 更像一枚行首徽标。
 */
export function PlazaGroupRow(props: {
  groups: string[]
  models: PricingModel[]
  groupRatios?: Record<string, number>
  /**
   * 后台「分组倍率」可视化编辑器里的 Description 列，键为分组名，
   * 值为 `{ desc, ratio }`（见 `PricingResponse.usable_group`）。
   * 用来替换胶囊上的原始分组名，让管理员写的「标准/VIP/测试」这类说明直接
   * 展示给用户；没有填描述的分组回落显示原始分组名。
   */
  usableGroup?: Record<string, { desc: string; ratio: number }>
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
    // 价格行只保留「描述/分组名 + 倍率」，计数交给「全部」胶囊，避免一粒胶囊里堆三组信息
    ...props.groups.flatMap((group) => {
      const count = countByGroup(props.models, group)
      if (count === 0) {
        return []
      }
      const ratio = props.groupRatios?.[group]
      // 后台描述优先，未填写时回落原始分组名，避免胶囊空白
      const description = props.usableGroup?.[group]?.desc?.trim()
      return [
        {
          value: group,
          label: description || group,
          suffix: formatRatioBadge(ratio),
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
