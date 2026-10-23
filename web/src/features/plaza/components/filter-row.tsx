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

import { cn } from '@/lib/utils'

export const plazaFilterRowClassName =
  'flex flex-col flex-wrap items-start gap-x-2 gap-y-1.5 px-0.5 py-1.5 sm:flex-row sm:gap-x-2 sm:px-1'
/**
 * 行首标签和右侧胶囊同高（h-[25px] / text-xs）：图标、文字、胶囊三者在同一
 * 基线上对齐，整行才不像「小标签拖着一排大按钮」。
 */
export const plazaFilterRowLabelClassName =
  'text-foreground flex h-[25px] w-full shrink-0 items-center gap-1.5 text-xs font-semibold whitespace-nowrap sm:w-16'
export const plazaFilterRowChipsClassName =
  'flex min-w-0 flex-1 flex-wrap content-start gap-1.5'

/**
 * 筛选区外壳。
 *
 * 不用整块底色把筛选条件框起来：一块浅灰面板在宽屏上会显得刻意，也会和
 * 下面的模型卡片抢层次。行与行之间也不画分割线——两行各自很短，一条线
 * 反而把筛选切成两块；留白本身就足够分组。
 */
export function PlazaFilterPanel(props: { children: ReactNode }) {
  return <div className='flex flex-col'>{props.children}</div>
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
          <span
            aria-hidden='true'
            className='text-foreground flex size-3.5 shrink-0 items-center justify-center [&_svg]:size-3.5'
          >
            {props.icon}
          </span>
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
