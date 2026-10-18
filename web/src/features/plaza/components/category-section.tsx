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
        {/* 无底色图标：只靠形状和深浅区分区块，不再垫一块灰底 */}
        <span
          aria-hidden='true'
          className='text-foreground/80 flex size-5 shrink-0 items-center justify-center [&_svg]:size-5'
        >
          <CategoryIcon />
        </span>
        <h2
          id={headingId}
          className='text-[17px] font-semibold tracking-tight sm:text-lg'
        >
          {categoryLabel}
        </h2>
        {/* 计数收进一枚哑光徽章：原来是一条通到右边的发丝线加一行小字，
            线让标题栏显得零碎，徽章把同一信息收成一个视觉单元。 */}
        <span className='bg-muted text-muted-foreground shrink-0 rounded-full px-2 py-0.5 text-xs font-medium tabular-nums'>
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
