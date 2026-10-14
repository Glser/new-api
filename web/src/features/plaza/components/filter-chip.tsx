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
  if (active) {
    return 'text-background/65'
  }
  if (tone === 'discount') {
    return 'text-success'
  }
  return 'text-muted-foreground'
}

/** 悬停时掠过的一层光泽，做法与首页「进入控制台」按钮一致 */
const shineClassName =
  'pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent to-transparent transition-transform duration-700 ease-out group-hover/button:translate-x-full'

/**
 * 筛选胶囊：未选中是白底细边框，选中是实底墨色 + 投影。
 * 悬停上浮、按下回弹与光泽都沿用首页「进入控制台」那枚按钮的反馈，
 * 让筛选器摸起来像一排真的按钮，而不是标签。
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
        'relative h-8 max-w-full shrink-0 gap-1.5 overflow-hidden rounded-full border px-3 text-xs font-medium',
        'transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]',
        active
          ? 'border-transparent bg-foreground text-background shadow-[0_4px_14px_rgba(0,0,0,0.12)] hover:bg-foreground hover:text-background hover:shadow-[0_8px_24px_rgba(0,0,0,0.18)] dark:shadow-[0_4px_18px_rgba(255,255,255,0.06)]'
          : 'border-border/70 bg-background text-foreground/75 shadow-[0_1px_2px_rgba(0,0,0,0.05)] hover:border-border hover:bg-background hover:text-foreground hover:shadow-[0_4px_14px_rgba(0,0,0,0.10)] dark:shadow-none'
      )}
    >
      <span
        aria-hidden='true'
        className={cn(
          shineClassName,
          active ? 'via-white/25' : 'via-foreground/[0.07]'
        )}
      />
      {option.icon && <span className='relative shrink-0'>{option.icon}</span>}
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
            active ? 'text-background/60' : 'text-muted-foreground/70'
          )}
        >
          {option.countLabel}
        </span>
      )}
    </Button>
  )
}
