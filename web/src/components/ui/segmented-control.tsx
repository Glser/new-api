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

export type SegmentedControlOption<T extends string> = {
  value: T
  label: ReactNode
  disabled?: boolean
}

export function SegmentedControl<T extends string>(props: {
  value: T
  options: Array<SegmentedControlOption<T>>
  onChange: (value: T) => void
  ariaLabel?: string
  size?: 'sm' | 'md'
  className?: string
}) {
  const compact = props.size === 'sm'
  const buttonClass = compact
    ? 'h-6 px-2.5 text-[11px]'
    : 'h-7 px-3 text-xs @min-[48rem]/console:text-sm'

  return (
    <div
      role='tablist'
      aria-label={props.ariaLabel}
      className={cn(
        'bg-muted inline-flex min-w-0 flex-wrap items-center rounded-full',
        compact ? 'p-0.5' : 'h-9 p-1',
        props.className
      )}
    >
      {props.options.map((option) => {
        const selected = props.value === option.value
        return (
          <button
            key={option.value}
            type='button'
            role='tab'
            aria-selected={selected}
            disabled={option.disabled}
            onClick={() => {
              if (!option.disabled) props.onChange(option.value)
            }}
            className={cn(
              'inline-flex items-center justify-center gap-1 rounded-full font-medium whitespace-nowrap transition-colors [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*="size-"])]:size-3.5',
              buttonClass,
              option.disabled && 'pointer-events-none opacity-50',
              selected
                ? 'bg-foreground text-background'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
