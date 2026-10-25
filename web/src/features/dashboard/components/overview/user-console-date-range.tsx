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
import { CalendarDays } from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import type { DateRange } from 'react-day-picker'
import { enUS, zhCN } from 'react-day-picker/locale'
import { useTranslation } from 'react-i18next'

import { Button, buttonVariants } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import {
  isPopoverDismissFromTrigger,
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { USER_CONSOLE_RANGE_PRESETS } from '@/features/dashboard/constants'
import {
  getUserConsolePresetRange,
  matchUserConsolePreset,
} from '@/features/dashboard/lib'
import type {
  UserConsoleDateRange,
  UserConsoleRangePreset,
} from '@/features/dashboard/types'
import dayjs from '@/lib/dayjs'
import { cn } from '@/lib/utils'

interface UserConsoleDateRangeProps {
  range: UserConsoleDateRange
  onChange: (range: UserConsoleDateRange) => void
}

function formatRangeLabel(start: Date, end: Date): string {
  return `${dayjs(start).format('YYYY-MM-DD')}  →  ${dayjs(end).format('YYYY-MM-DD')}`
}

function getVisibleStartMonth(range: DateRange | undefined): Date {
  const end = range?.to ?? range?.from ?? new Date()
  return dayjs(end).startOf('month').subtract(1, 'month').toDate()
}

function toStartOfDay(date: Date): Date {
  return dayjs(date).startOf('day').toDate()
}

export function UserConsoleDateRangeControl(props: UserConsoleDateRangeProps) {
  const { t, i18n } = useTranslation()
  const isZh = i18n.language === 'zhCN' || i18n.language.startsWith('zh')
  const calendarLocale = isZh ? zhCN : enUS
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLElement | null>(null)
  const [draft, setDraft] = useState<DateRange | undefined>()
  const [month, setMonth] = useState<Date>(() =>
    getVisibleStartMonth({ from: props.range.start, to: props.range.end })
  )

  const selectedRange = useMemo<DateRange>(
    () => ({ from: props.range.start, to: props.range.end }),
    [props.range.end, props.range.start]
  )

  const handlePreset = (preset: UserConsoleRangePreset) => {
    if (preset === 'custom') return
    const next = getUserConsolePresetRange(preset)
    props.onChange({
      preset,
      start: next.start,
      end: next.end,
    })
  }

  const handleOpenChange = (
    nextOpen: boolean,
    eventDetails: { reason: string; event: Event; cancel: () => void }
  ) => {
    if (eventDetails.reason === 'trigger-press') {
      eventDetails.cancel()
      return
    }
    if (isPopoverDismissFromTrigger(eventDetails, triggerRef.current)) {
      eventDetails.cancel()
      return
    }
    if (nextOpen) {
      setDraft(selectedRange)
      setMonth(getVisibleStartMonth(selectedRange))
    }
    setOpen(nextOpen)
  }

  const handleTriggerClick = () => {
    const nextOpen = !open
    if (nextOpen) {
      setDraft(selectedRange)
      setMonth(getVisibleStartMonth(selectedRange))
    }
    setOpen(nextOpen)
  }

  const handleSelect = (_next: DateRange | undefined, selectedDay: Date) => {
    setDraft((current) => {
      const prev = current ?? selectedRange
      const clicked = toStartOfDay(selectedDay)

      if (!prev.from || (prev.from && prev.to)) {
        return { from: clicked, to: undefined }
      }

      const from = toStartOfDay(prev.from)
      if (dayjs(clicked).isBefore(from, 'day')) {
        return { from: clicked, to: from }
      }
      return { from, to: clicked }
    })
  }

  const applyDraft = () => {
    if (!draft?.from) return
    const start = dayjs(draft.from).startOf('day').toDate()
    const end = dayjs(draft.to ?? draft.from)
      .endOf('day')
      .toDate()
    props.onChange({
      preset: matchUserConsolePreset(start, end),
      start,
      end,
    })
    setOpen(false)
  }

  return (
    <div className='flex min-w-0 flex-wrap items-center justify-start gap-2 @min-[64rem]/console:justify-end'>
      <div className='bg-muted/70 inline-flex flex-wrap items-center rounded-lg p-0.5'>
        {USER_CONSOLE_RANGE_PRESETS.map((preset) => (
          <button
            key={preset.value}
            type='button'
            onClick={() => handlePreset(preset.value)}
            className={cn(
              'h-8 rounded-md px-2 text-xs font-medium transition-colors @min-[48rem]/console:px-3 @min-[48rem]/console:text-sm',
              props.range.preset === preset.value
                ? 'bg-foreground text-background shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {t(preset.labelKey)}
          </button>
        ))}
      </div>

      <Popover open={open} onOpenChange={handleOpenChange}>
        <PopoverTrigger
          ref={triggerRef}
          className={cn(
            buttonVariants({ variant: 'outline', size: 'sm' }),
            'h-9 min-w-0 justify-start gap-1.5 px-2.5 text-xs font-normal tabular-nums @min-[48rem]/console:min-w-56 @min-[48rem]/console:gap-2 @min-[48rem]/console:px-3 @min-[48rem]/console:text-sm'
          )}
          onClick={handleTriggerClick}
        >
          <CalendarDays className='text-muted-foreground size-4' />
          {formatRangeLabel(props.range.start, props.range.end)}
        </PopoverTrigger>
        <PopoverContent
          align='end'
          initialFocus={false}
          animate={false}
          keepMounted
          className='max-h-[80dvh] w-auto max-w-[calc(100vw-2rem)] overflow-auto p-3'
        >
          <Calendar
            mode='range'
            numberOfMonths={2}
            locale={calendarLocale}
            month={month}
            onMonthChange={setMonth}
            selected={draft ?? selectedRange}
            onSelect={handleSelect}
            autoFocus={false}
            disabled={{ after: new Date() }}
            classNames={{
              months: 'relative flex flex-col gap-4 sm:flex-row',
            }}
            formatters={
              isZh
                ? {
                    formatCaption: (date: Date) =>
                      `${date.getFullYear()}年${date.getMonth() + 1}月`,
                    formatMonthDropdown: (date: Date) =>
                      `${date.getMonth() + 1}月`,
                    formatWeekdayName: (date: Date) =>
                      ['日', '一', '二', '三', '四', '五', '六'][
                        date.getDay()
                      ] ?? '',
                  }
                : undefined
            }
          />
          <div className='mt-3 flex justify-end gap-2'>
            <Button variant='ghost' size='sm' onClick={() => setOpen(false)}>
              {t('Cancel')}
            </Button>
            <Button
              size='sm'
              className='bg-foreground text-background hover:bg-foreground/90'
              disabled={!draft?.from}
              onClick={applyDraft}
            >
              {t('Apply')}
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}
