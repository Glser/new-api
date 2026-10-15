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
import type { ReactNode } from 'react'

import { IconBadge } from '@/components/ui/icon-badge'
import { cn } from '@/lib/utils'

export const plazaFilterRowClassName =
  'flex flex-wrap items-start gap-x-2 gap-y-2 px-3.5 py-3 sm:gap-x-3 sm:px-4'
/**
 * 行首标签和右侧胶囊同高（h-9 / text-sm）：图标、文字、胶囊三者在同一
 * 基线上对齐，整行才不像「小标签拖着一排大按钮」。
 */
export const plazaFilterRowLabelClassName =
  'flex h-9 w-full shrink-0 items-center gap-2 text-sm font-medium whitespace-nowrap text-foreground/75 sm:w-24'
export const plazaFilterRowChipsClassName =
  'flex min-w-0 flex-1 flex-wrap content-start gap-2'

/**
 * 筛选区外壳：把多行筛选条件收进同一个浅灰面板，行与行之间用发丝线分隔。
 * 相比每行各自一张卡片，面板让「筛选」在视觉上成为一个整体控件。
 */
export function PlazaFilterPanel(props: { children: ReactNode }) {
  return (
    <div className='border-border/70 bg-muted/40 divide-border/60 flex flex-col divide-y rounded-xl border'>
      {props.children}
    </div>
  )
}

export function PlazaFilterRow(props: {
  label: string
  icon?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cn(plazaFilterRowClassName, props.className)}>
      <p className={plazaFilterRowLabelClassName}>
        {props.icon && (
          <IconBadge className='size-9 rounded-xl [&>svg]:size-4.5'>
            {props.icon}
          </IconBadge>
        )}
        {props.label}
      </p>
      <div
        role='group'
        aria-label={props.label}
        className={plazaFilterRowChipsClassName}
      >
        {props.children}
      </div>
    </div>
  )
}
