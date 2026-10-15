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
import { Check } from 'lucide-react'
import type { ReactNode } from 'react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export type PlazaFilterChipOption = {
  value: string
  label: string
  countLabel?: string
  suffix?: string
  /** suffix 的配色：倍率低于 1 时按「有折扣」的语义色呈现 */
  suffixTone?: 'muted' | 'discount'
  icon?: ReactNode
}

function getSuffixClassName(
  active: boolean,
  tone: 'muted' | 'discount'
): string {
  if (tone === 'discount') {
    return 'text-success'
  }
  if (active) {
    return 'text-foreground/60'
  }
  return 'text-muted-foreground'
}

/** 悬停时掠过的一层光泽，做法与首页「进入控制台」按钮一致 */
const shineClassName =
  'pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent to-transparent transition-transform duration-700 ease-out group-hover/button:translate-x-full'

/**
 * 筛选胶囊：未选中是「浅面 + 发丝边框」，选中是「加重的浅面 + 发丝边框 +
 * 勾选标记」。
 *
 * 选中态早先是实底墨色反白，浅色纸面上那一枚黑 pill 太抢，整排筛选器会
 * 变成一颗黑疙瘩带一圈灰按钮，所以换成灰阶方案：底色提到 bg-muted、边框
 * 提到 foreground/25、文字落到正文色，再补一个勾选标记。选中与未选中仍在
 * 同一族里，只是「分量」不同，不再靠黑白反转硬切。
 *
 * 深色模式下筛选面板本身就是一层压暗的灰，未选中胶囊若还用 bg-background
 * 就会和面板糊成一片、只剩选中态一枚亮 pill 飘着，选中/未选中看不出是
 * 同一排按钮的两种状态。所以深色下给未选中态垫一层 10% 的前景色表面，
 * 并加深边框与文字，让它先成为「一颗按钮」，再用更亮的表面表达选中。
 *
 * 密度也调过一版：胶囊整体放大到 h-9 / text-sm，左侧 logo、中间文案、
 * 右侧计数/倍率三者贴得更紧，行首标签也提到同一高度，整行不再头重脚轻。
 *
 * 悬停上浮、按下回弹与光泽都沿用首页「进入控制台」那枚按钮的反馈，
 * 让筛选器摸起来像一排真的按钮，而不是标签。但悬停不用 hover:scale，
 * 改用 hover:-translate-y-px：整页套在 PlazaScaleFrame 的 zoom 画布上
 * （非整数倍缩放），而胶囊只有 36px 高、里面塞着小图标和文字，
 * 一缩放浏览器每一帧都要按分数倍重新栅格化文字和图标，观感就是发虚、
 * 像掉帧。平移只走合成层、不触发重绘，图标和文字全程清晰；按下回弹由
 * Button 基类的 active:translate-y-px 提供。同时把 transition-all 收窄成
 * transition，避免把无关属性一起拖进同一条时间轴做无谓重绘。
 */
export function PlazaFilterChip(props: {
  option: PlazaFilterChipOption
  active: boolean
  onClick: () => void
}) {
  const { active, option } = props

  return (
    <Button
      type='button'
      variant='ghost'
      size='sm'
      onClick={props.onClick}
      aria-pressed={active}
      title={option.label}
      className={cn(
        'relative h-9 max-w-full shrink-0 gap-1.5 overflow-hidden rounded-full border px-3.5 text-sm font-medium',
        'transition duration-200 hover:-translate-y-px',
        active
          ? 'border-foreground/25 bg-muted text-foreground shadow-none hover:border-foreground/25 hover:bg-muted hover:text-foreground dark:border-foreground/30 dark:bg-foreground/[0.18] dark:text-foreground dark:hover:border-foreground/30 dark:hover:bg-foreground/[0.18] dark:hover:text-foreground'
          : 'border-border/70 bg-background text-foreground/75 shadow-[0_1px_2px_rgba(0,0,0,0.05)] hover:border-border hover:bg-background hover:text-foreground hover:shadow-[0_4px_14px_rgba(0,0,0,0.10)] dark:border-foreground/20 dark:bg-foreground/[0.10] dark:text-foreground/85 dark:shadow-none dark:hover:border-foreground/35 dark:hover:bg-foreground/[0.16] dark:hover:text-foreground'
      )}
    >
      <span
        aria-hidden='true'
        className={cn(
          shineClassName,
          active ? 'via-foreground/[0.10]' : 'via-foreground/[0.07]'
        )}
      />
      {active && (
        <span
          aria-hidden='true'
          className='relative flex shrink-0 items-center'
        >
          <Check className='size-3.5' />
        </span>
      )}
      {option.icon && (
        // Button 基类的 [&_svg:not([class*='size-'])]:size-4 会把未标注尺寸的 svg
        // 一律压成 16px，盖掉 getLobeIcon 传的 size；这里用 ! 覆盖，让供应商 logo
        // 跟上放大后的字号。
        <span className='relative flex shrink-0 items-center [&_svg]:size-5!'>
          {option.icon}
        </span>
      )}
      <span className='relative truncate'>{option.label}</span>
      {option.suffix && (
        <span
          className={cn(
            'relative font-mono text-[11px] leading-none tabular-nums',
            getSuffixClassName(active, option.suffixTone ?? 'muted')
          )}
        >
          {option.suffix}
        </span>
      )}
      {option.countLabel && (
        <span
          className={cn(
            'relative text-[11px] leading-none tabular-nums',
            active ? 'text-foreground/60' : 'text-muted-foreground/70'
          )}
        >
          {option.countLabel}
        </span>
      )}
    </Button>
  )
}
