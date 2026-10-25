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
import type { UserConsoleRangePreset } from '@/features/dashboard/types'
import dayjs from '@/lib/dayjs'
import { cn } from '@/lib/utils'

const LOG_RANGE_PRESETS = USER_CONSOLE_RANGE_PRESETS.filter(
  (preset) => preset.value !== 'last-month'
)

interface CompactDateTimeRangePickerProps {
  start?: Date
  end?: Date
  onChange: (range: { start?: Date; end?: Date }) => void
  className?: string
}

function formatRangeLabel(start?: Date, end?: Date): string {
  if (!start && !end) return '-'
  const startStr = start ? dayjs(start).format('YYYY-MM-DD') : ''
  const endStr = end ? dayjs(end).format('YYYY-MM-DD') : ''
  return `${startStr}  →  ${endStr}`
}

function getVisibleStartMonth(range: DateRange | undefined): Date {
  const end = range?.to ?? range?.from ?? new Date()
  return dayjs(end).startOf('month').subtract(1, 'month').toDate()
}

function toStartOfDay(date: Date): Date {
  return dayjs(date).startOf('day').toDate()
}

export function CompactDateTimeRangePicker({
  start,
  end,
  onChange,
  className,
}: CompactDateTimeRangePickerProps) {
  const { t, i18n } = useTranslation()
  const isZh = i18n.language === 'zhCN' || i18n.language?.startsWith('zh')
  const calendarLocale = isZh ? zhCN : enUS

  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLElement | null>(null)
  const [draft, setDraft] = useState<DateRange | undefined>()

  const activePreset = useMemo<UserConsoleRangePreset>(() => {
    if (!start || !end) return 'custom'
    const matched = matchUserConsolePreset(start, end)
    return matched === 'last-month' ? 'custom' : matched
  }, [start, end])

  const selectedRange = useMemo<DateRange>(
    () => ({ from: start, to: end }),
    [start, end]
  )

  const [month, setMonth] = useState<Date>(() =>
    getVisibleStartMonth(selectedRange)
  )

  const handlePreset = (preset: UserConsoleRangePreset) => {
    if (preset === 'custom' || preset === 'last-month') return
    if (activePreset === preset) return
    const next = getUserConsolePresetRange(preset)
    onChange({
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
    const prev = draft ?? selectedRange
    const clicked = toStartOfDay(selectedDay)

    if (!prev.from || (prev.from && prev.to)) {
      setDraft({ from: clicked, to: undefined })
      return
    }

    const from = toStartOfDay(prev.from)
    const nextRange = dayjs(clicked).isBefore(from, 'day')
      ? { from: clicked, to: from }
      : { from, to: clicked }
    setDraft(nextRange)
    onChange({
      start: dayjs(nextRange.from).startOf('day').toDate(),
      end: dayjs(nextRange.to).endOf('day').toDate(),
    })
    setOpen(false)
  }

  const applyDraft = () => {
    if (!draft?.from) return
    const nextStart = dayjs(draft.from).startOf('day').toDate()
    const nextEnd = dayjs(draft.to ?? draft.from)
      .endOf('day')
      .toDate()
    onChange({
      start: nextStart,
      end: nextEnd,
    })
    setOpen(false)
  }

  const displayLabel = useMemo(() => {
    if (!start && !end) return t('Date Range')
    return formatRangeLabel(start, end)
  }, [start, end, t])

  return (
    <div className={cn('flex min-w-0 flex-wrap items-center gap-2', className)}>
      <div className='bg-muted/70 inline-flex flex-wrap items-center rounded-lg p-0.5'>
        {LOG_RANGE_PRESETS.map((preset) => (
          <button
            key={preset.value}
            type='button'
            onClick={() => handlePreset(preset.value)}
            className={cn(
              'h-8 rounded-md px-2 text-xs font-medium transition-colors sm:px-3 sm:text-sm',
              activePreset === preset.value
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
            'h-9 min-w-0 justify-start gap-1.5 px-2.5 text-xs font-normal tabular-nums sm:min-w-56 sm:gap-2 sm:px-3 sm:text-sm'
          )}
          onClick={handleTriggerClick}
        >
          <CalendarDays className='text-muted-foreground size-4 shrink-0' />
          <span>{displayLabel}</span>
        </PopoverTrigger>
        <PopoverContent
          align='start'
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
