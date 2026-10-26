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
import { Check, SlidersHorizontal, Store, Tags, X } from 'lucide-react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer'
import { FILTER_ALL } from '@/features/pricing/constants'
import type {
  PricingModel,
  PricingUsableGroup,
  PricingVendor,
} from '@/features/pricing/types'
import { getLobeIcon } from '@/lib/lobe-icon'
import { cn } from '@/lib/utils'

import { formatGroupRatio } from '../lib/group-ratio'
import { TooltipHint } from '@/components/ui/tooltip'

function countByVendor(models: PricingModel[], vendorName: string): number {
  return models.reduce(
    (count, model) => count + (model.vendor_name === vendorName ? 1 : 0),
    0
  )
}

function countByGroup(models: PricingModel[], group: string): number {
  return models.reduce(
    (count, model) => count + (model.enable_groups?.includes(group) ? 1 : 0),
    0
  )
}

/** formatGroupRatio 产出 "x0.5"，换成更易读的乘号 */
function formatRatio(ratio: number | undefined): string | undefined {
  const formatted = formatGroupRatio(ratio)
  return formatted ? formatted.replaceAll('x', '×') : undefined
}

/**
 * 侧栏里的单个筛选项。
 *
 * 从胶囊改成竖排列表项，是因为横排胶囊在供应商一多就换行、把「价格」那行
 * 挤到屏幕下方；竖排之后每行都是「图标 + 名称 + 数量」，数量右对齐成一列，
 * 扫一眼就能看出哪家供应商货最多。选中态沿用胶囊那一版定下来的灰阶方案：
 * 边框加深 + 底色加深 + 文案加粗 + 右侧对勾，不再用黑底白字那种硬反色。
 */
function PlazaFilterListItem(props: {
  label: string
  count: number
  active: boolean
  onClick: () => void
  icon?: ReactNode
  suffix?: string
}) {
  return (
    <TooltipHint content={props.label}>
      <button
        type='button'
        onClick={props.onClick}
        aria-pressed={props.active}
        className={cn(
          'flex h-9 w-full min-w-0 items-center gap-2 rounded-md border px-2 text-left text-sm',
          'outline-none transition-colors duration-200',
          'focus-visible:ring-ring/50 focus-visible:ring-2',
          props.active
            ? 'border-foreground/25 bg-muted font-medium text-foreground dark:border-foreground/30 dark:bg-foreground/[0.18]'
            : 'text-foreground/75 hover:text-foreground border-transparent hover:bg-muted dark:text-foreground/85 dark:hover:bg-foreground/[0.10]'
        )}
      >
        {props.icon && (
          <span
            aria-hidden='true'
            className='flex size-5 shrink-0 items-center justify-center [&_img]:size-full [&_svg]:size-4'
          >
            {props.icon}
          </span>
        )}
        <span className='min-w-0 flex-1 truncate'>{props.label}</span>
        {props.suffix && (
          <span className='shrink-0 rounded bg-lime-400 px-1.5 py-px text-[11px] leading-none font-semibold text-black tabular-nums'>
            {props.suffix}
          </span>
        )}
        <span className='text-muted-foreground shrink-0 text-xs leading-none tabular-nums'>
          {props.count}
        </span>
        {props.active && (
          <Check
            aria-hidden='true'
            className='text-foreground/70 size-3.5 shrink-0'
          />
        )}
      </button>
    </TooltipHint>
  )
}

function PlazaFilterSection(props: {
  id: string
  title: string
  icon: ReactNode
  children: ReactNode
}) {
  const headingId = `plaza-filter-heading-${props.id}`

  return (
    <section className='flex flex-col gap-1.5'>
      <h2
        id={headingId}
        className='text-foreground/70 flex items-center gap-2 px-1 text-[13px] font-semibold'
      >
        <span
          aria-hidden='true'
          className='text-foreground/80 flex size-4 shrink-0 items-center justify-center [&_svg]:size-4'
        >
          {props.icon}
        </span>
        {props.title}
      </h2>
      <div
        role='group'
        aria-labelledby={headingId}
        className='flex flex-col gap-1'
      >
        {props.children}
      </div>
    </section>
  )
}

export type PlazaFilterSidebarProps = {
  vendors: PricingVendor[]
  models: PricingModel[]
  groups: string[]
  groupRatios?: Record<string, number>
  usableGroup?: PricingUsableGroup
  vendorFilter: string
  groupFilter: string
  onVendorChange: (value: string) => void
  onGroupChange: (value: string) => void
  resultCount: number
  hasActiveFilters: boolean
  onClearAll: () => void
  className?: string
}

/**
 * 筛选侧栏：搜索留在页面头部（首屏一眼能看到的主要入口），侧栏只放
 * 「供应商」和「价格」两个维度，各自带数量，底部给一条命中数和清除入口。
 */
export function PlazaFilterSidebar(props: PlazaFilterSidebarProps) {
  const { t } = useTranslation()

  const vendorOptions = props.vendors.flatMap((vendor) => {
    const count = countByVendor(props.models, vendor.name)
    if (count === 0) {
      return []
    }
    return [
      {
        value: vendor.name,
        label: vendor.name,
        count,
        icon: getLobeIcon(vendor.icon, 20),
      },
    ]
  })

  const groupOptions = props.groups.flatMap((group) => {
    const count = countByGroup(props.models, group)
    if (count === 0) {
      return []
    }
    const ratio = props.groupRatios?.[group]
    return [
      {
        value: group,
        label: group,
        count,
        suffix: formatRatio(ratio),
      },
    ]
  })

  return (
    <nav
      aria-label={t('Filter')}
      className={cn(
        'border-border/70 bg-muted/40 flex flex-col gap-4 rounded-xl border p-3',
        props.className
      )}
    >
      <PlazaFilterSection
        id='vendor'
        title={t('Vendor')}
        icon={<Store aria-hidden='true' />}
      >
        <PlazaFilterListItem
          label={t('All')}
          count={props.models.length}
          active={props.vendorFilter === FILTER_ALL}
          onClick={() => props.onVendorChange(FILTER_ALL)}
        />
        {vendorOptions.map((option) => (
          <PlazaFilterListItem
            key={option.value}
            label={option.label}
            count={option.count}
            icon={option.icon}
            active={props.vendorFilter === option.value}
            onClick={() =>
              props.onVendorChange(
                props.vendorFilter === option.value ? FILTER_ALL : option.value
              )
            }
          />
        ))}
      </PlazaFilterSection>

      <PlazaFilterSection
        id='price'
        title={t('Price')}
        icon={<Tags aria-hidden='true' />}
      >
        <PlazaFilterListItem
          label={t('All')}
          count={props.models.length}
          active={props.groupFilter === FILTER_ALL}
          onClick={() => props.onGroupChange(FILTER_ALL)}
        />
        {groupOptions.map((option) => (
          <PlazaFilterListItem
            key={option.value}
            label={option.label}
            count={option.count}
            suffix={option.suffix}
            active={props.groupFilter === option.value}
            onClick={() =>
              props.onGroupChange(
                props.groupFilter === option.value ? FILTER_ALL : option.value
              )
            }
          />
        ))}
      </PlazaFilterSection>

      <div className='border-border/60 flex items-center justify-between gap-2 border-t pt-3'>
        <span className='text-muted-foreground text-xs whitespace-nowrap tabular-nums'>
          {t('{{count}} results', { count: props.resultCount })}
        </span>
        {props.hasActiveFilters && (
          <Button
            type='button'
            variant='ghost'
            size='sm'
            onClick={props.onClearAll}
            className='text-muted-foreground hover:text-foreground h-7 shrink-0 gap-1 rounded-md px-2 text-xs'
          >
            <X aria-hidden='true' className='size-3.5' />
            {t('Clear filters')}
          </Button>
        )}
      </div>
    </nav>
  )
}

/**
 * 窄屏形态：桌面侧栏在 lg 以下被 CSS 藏掉，用一个抽屉把同一套筛选器搬出来，
 * 避免竖排胶囊那一版里「筛选器占掉大半个首屏、模型列表被推到很深」的问题。
 * 抽屉关闭时内容不挂载，所以页面里始终只有一份筛选器 DOM。
 */
export function PlazaFilterDrawer(props: PlazaFilterSidebarProps) {
  const { t } = useTranslation()
  const activeCount =
    (props.vendorFilter === FILTER_ALL ? 0 : 1) +
    (props.groupFilter === FILTER_ALL ? 0 : 1)

  return (
    <Drawer>
      <DrawerTrigger asChild>
        <Button
          type='button'
          variant='outline'
          size='sm'
          className='border-border/70 bg-background h-9 shrink-0 gap-2 rounded-lg px-3 text-sm font-medium'
        >
          <SlidersHorizontal aria-hidden='true' className='size-4' />
          {t('Filter')}
          {activeCount > 0 && (
            <span className='bg-foreground/10 text-foreground/70 rounded-full px-1.5 text-[11px] leading-4 tabular-nums'>
              {activeCount}
            </span>
          )}
        </Button>
      </DrawerTrigger>
      <DrawerContent className='flex max-h-[82dvh] flex-col'>
        <DrawerHeader className='flex-shrink-0 pb-2'>
          <DrawerTitle className='text-left text-base font-semibold'>
            {t('Filter')}
          </DrawerTitle>
        </DrawerHeader>
        <div className='no-scrollbar min-h-0 flex-1 overflow-y-auto px-4 pb-6'>
          <PlazaFilterSidebar
            {...props}
            className='border-0 bg-transparent p-0'
          />
        </div>
      </DrawerContent>
    </Drawer>
  )
}
