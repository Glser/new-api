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
import * as React from 'react'
import { useTranslation } from 'react-i18next'

import { StatusBadgeList } from '@/components/status-badge'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

interface BadgeListCellProps {
  items: React.ReactNode[]
  max?: number
  tooltipClassName?: string
  expandable?: boolean
  expandLabel?: string
  className?: string
}

/**
 * Table cell renderer for a list of badges with overflow tooltip.
 * Displays up to `max` badges inline; remaining items appear in a tooltip.
 * Defaults to -ml-1.5 so badges align with left-aligned headers; pass
 * `className` to override that offset for centered tables.
 */
export function BadgeListCell({
  items,
  max = 2,
  tooltipClassName,
  expandable = false,
  expandLabel,
  className,
}: BadgeListCellProps) {
  const { t } = useTranslation()
  if (items.length === 0) {
    return <span className='text-muted-foreground text-xs'>-</span>
  }

  const showTooltip = items.length > max

  if (expandable && showTooltip) {
    return (
      <div className={cn('flex min-w-0 items-center gap-1', className)}>
        <StatusBadgeList
          items={items.slice(0, max)}
          max={max}
          renderItem={(item) => item}
        />
        <Popover>
          <PopoverTrigger
            render={
              <Button
                variant='ghost'
                size='sm'
                className='h-6 shrink-0 px-1'
                aria-label={expandLabel ?? t('Show all tags')}
              />
            }
          >
            +{items.length - max}
          </PopoverTrigger>
          <PopoverContent className='max-h-64 overflow-auto'>
            <div className='flex flex-wrap gap-2'>{items}</div>
          </PopoverContent>
        </Popover>
      </div>
    )
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger
          render={<div className={cn('max-w-full', className ?? '-ml-1.5')} />}
        >
          <StatusBadgeList
            items={items}
            max={max}
            className={className}
            renderItem={(item) => item}
          />
        </TooltipTrigger>
        {showTooltip && (
          <TooltipContent
            side='top'
            className={
              tooltipClassName ??
              'border-border bg-popover max-h-48 max-w-[320px] overflow-y-auto p-2'
            }
          >
            <div className='flex flex-wrap gap-1'>{items}</div>
          </TooltipContent>
        )}
      </Tooltip>
    </TooltipProvider>
  )
}
