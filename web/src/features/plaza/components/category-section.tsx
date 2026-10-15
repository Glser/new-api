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
  MessageCircle,
  type LucideIcon,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { IconBadge } from '@/components/ui/icon-badge'
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
  [PLAZA_CATEGORIES.CHAT]: MessageCircle,
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
        {/* 中性色徽标融进柔光纸面，区块之间靠图标形状区分，不再上饱和度 */}
        <IconBadge size='md'>
          <CategoryIcon />
        </IconBadge>
        <h2
          id={headingId}
          className='text-[17px] font-semibold tracking-tight sm:text-lg'
        >
          {categoryLabel}
        </h2>
        <span aria-hidden='true' className='bg-border h-px min-w-8 flex-1' />
        <span className='text-muted-foreground shrink-0 text-xs whitespace-nowrap tabular-nums'>
          {t('{{count}} models', { count: props.models.length })}
        </span>
      </div>
      <div className='grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2 xl:grid-cols-3'>
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
