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
import {
  Boxes,
  Film,
  Image,
  MessagesSquare,
  type LucideIcon,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { ModelCard } from '@/features/pricing/components/model-card'
import type { ModelPerfBadgeData } from '@/features/pricing/components/model-perf-badge'
import { DEFAULT_TOKEN_UNIT } from '@/features/pricing/constants'
import type { PricingModel, TokenUnit } from '@/features/pricing/types'

import {
  PLAZA_CATEGORIES,
  PLAZA_CATEGORY_LABEL_KEYS,
  type PlazaCategory,
} from '../lib/categories'

const CATEGORY_ICONS: Record<PlazaCategory, LucideIcon> = {
  // 双气泡而不是单气泡：这一区讲的是「和模型对话」，两个气泡比一个评论
  // 气泡更贴近聊天气泡的语义。
  [PLAZA_CATEGORIES.CHAT]: MessagesSquare,
  [PLAZA_CATEGORIES.IMAGE]: Image,
  [PLAZA_CATEGORIES.VIDEO]: Film,
  [PLAZA_CATEGORIES.OTHER]: Boxes,
}

export function PlazaCategorySection(props: {
  category: PlazaCategory

  models: PricingModel[]
  onModelClick: (modelName: string) => void
  priceRate?: number
  usdExchangeRate?: number
  tokenUnit?: TokenUnit
  selectedGroup?: string
  perfMap?: Map<string, ModelPerfBadgeData>
}) {
  const { t } = useTranslation()
  const tokenUnit = props.tokenUnit ?? DEFAULT_TOKEN_UNIT

  if (props.models.length === 0) {
    return null
  }

  const categoryLabel = t(PLAZA_CATEGORY_LABEL_KEYS[props.category])
  const CategoryIcon = CATEGORY_ICONS[props.category]
  const headingId = `plaza-category-${props.category}`

  return (
    <section aria-labelledby={headingId} className='flex flex-col gap-4'>
      <div className='flex items-center gap-2.5 sm:gap-3'>
        {/* 图标、标题、计数同一高度：默认行高会把 17px 标题撑得比右侧徽章高，
            看起来像「聊天」和数量不在一条水平线上。 */}
        <span
          aria-hidden='true'
          className='text-foreground/80 flex size-[18px] shrink-0 items-center justify-center [&_svg]:size-[18px]'
        >
          <CategoryIcon />
        </span>
        <h2
          id={headingId}
          className='text-[17px] leading-none font-semibold tracking-tight sm:text-lg sm:leading-none'
        >
          {categoryLabel}
        </h2>
        <span className='bg-muted text-muted-foreground flex h-[18px] shrink-0 items-center rounded-full px-2 text-xs leading-none font-medium tabular-nums'>
          {t('{{count}} models', { count: props.models.length })}
        </span>
      </div>
      <div className='grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-3 sm:gap-4'>
        {props.models.map((model) => (
          <ModelCard
            key={model.id ?? model.model_name}
            model={model}
            tokenUnit={tokenUnit}
            priceRate={props.priceRate}
            usdExchangeRate={props.usdExchangeRate}
            selectedGroup={props.selectedGroup}
            perf={props.perfMap?.get(model.model_name || '')}
            onClick={() => props.onModelClick(model.model_name || '')}
          />
        ))}
      </div>
    </section>
  )
}
