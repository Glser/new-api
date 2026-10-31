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
import { useEffect, useMemo, useRef, useState } from 'react'
import type { DateRange } from 'react-day-picker'
import { enUS, zhCN } from 'react-day-picker/locale'
import { useTranslation } from 'react-i18next'

import { TimeInputPopover } from '@/components/time-wheel'
import { Button, buttonVariants } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import {
  isPopoverDismissFromTrigger,
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import dayjs from '@/lib/dayjs'
import { cn } from '@/lib/utils'

const DATETIME_QUICK_RANGES = [
  { labelKey: 'Last 5 minutes', minutes: 5 },
  { labelKey: 'Last 15 minutes', minutes: 15 },
  { labelKey: 'Last 30 minutes', minutes: 30 },
  { labelKey: 'Last 1 hour', minutes: 60 },
  { labelKey: 'Last 1 day', minutes: 1440 },
] as const

export interface DateRangePickerButtonProps {
  start?: Date
  end?: Date
  onApply: (range: { start: Date; end: Date }) => void
  showTime?: boolean
  disableFuture?: boolean
  align?: 'start' | 'center' | 'end'
  className?: string
  triggerClassName?: string
}

function parseDateInput(raw: string): Date | null {
  const trimmed = raw.trim()
  if (!trimmed) return null

  let year: number
  let month: number
  let day: number
  const isoMatch = trimmed.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/)
  if (isoMatch) {
    year = Number(isoMatch[1])
    month = Number(isoMatch[2])
    day = Number(isoMatch[3])
  } else {
    const digits = trimmed.replaceAll(/\D/g, '')
    if (digits.length !== 8) return null
    year = Number(digits.slice(0, 4))
    month = Number(digits.slice(4, 6))
    day = Number(digits.slice(6, 8))
  }

  if (
    !Number.isFinite(year) ||
    !Number.isFinite(month) ||
    !Number.isFinite(day) ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31
  ) {
    return null
  }

  const parsed = dayjs(new Date(year, month - 1, day))
  if (
    parsed.year() !== year ||
    parsed.month() !== month - 1 ||
    parsed.date() !== day
  ) {
    return null
  }
  return parsed.startOf('day').toDate()
}

function DateInputField(props: {
  date?: Date
  placeholder: string
  ariaLabel: string
  onChange?: (date: Date) => void
}) {
  const [draft, setDraft] = useState(() =>
    props.date ? dayjs(props.date).format('YYYY-MM-DD') : ''
  )
  const focusedRef = useRef(false)

  useEffect(() => {
    if (focusedRef.current) return
    setDraft(props.date ? dayjs(props.date).format('YYYY-MM-DD') : '')
  }, [props.date])

  const commitDraft = () => {
    const parsed = parseDateInput(draft)
    if (parsed) {
      props.onChange?.(parsed)
      setDraft(dayjs(parsed).format('YYYY-MM-DD'))
      return
    }
    setDraft(props.date ? dayjs(props.date).format('YYYY-MM-DD') : '')
  }

  return (
    <input
      aria-label={props.ariaLabel}
      placeholder={props.placeholder}
      inputMode='numeric'
      autoComplete='off'
      spellCheck={false}
      value={draft}
      onChange={(event) => {
        const next = event.target.value
        setDraft(next)
        const parsed = parseDateInput(next)
        if (parsed && /^\d{4}-\d{2}-\d{2}$/.test(next)) {
          props.onChange?.(parsed)
        }
      }}
      onFocus={() => {
        focusedRef.current = true
      }}
      onBlur={() => {
        focusedRef.current = false
        commitDraft()
      }}
      onKeyDown={(event) => {
        if (event.key === 'Enter') {
          event.preventDefault()
          commitDraft()
          event.currentTarget.blur()
        }
        if (event.key === 'Escape') {
          setDraft(props.date ? dayjs(props.date).format('YYYY-MM-DD') : '')
          event.currentTarget.blur()
        }
      }}
      className={cn(
        'border-input h-8 w-[7.5rem] min-w-0 rounded-lg border bg-transparent px-1.5 text-center text-sm leading-8 tabular-nums outline-none',
        'placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-1'
      )}
    />
  )
}

function DateTimeSummaryField(props: {
  date?: Date
  time: string
  showTime: boolean
  datePlaceholder: string
  dateLabel: string
  timeLabel: string
  hourLabel: string
  minuteLabel: string
  timeActive?: boolean
  disabled?: boolean
  onDateChange?: (date: Date) => void
  onTimeOpenChange?: (open: boolean) => void
  onTimeChange?: (next: string) => void
}) {
  return (
    <div
      className={cn(
        'flex shrink-0 items-center',
        props.showTime ? 'gap-1' : 'gap-0'
      )}
    >
      <DateInputField
        date={props.date}
        placeholder={props.datePlaceholder}
        ariaLabel={props.dateLabel}
        onChange={props.onDateChange}
      />
      {props.showTime ? (
        <TimeInputPopover
          value={props.time}
          open={Boolean(props.timeActive)}
          onOpenChange={(open) => props.onTimeOpenChange?.(open)}
          onChange={(next) => props.onTimeChange?.(next)}
          hourLabel={props.hourLabel}
          minuteLabel={props.minuteLabel}
          ariaLabel={props.timeLabel}
          disabled={props.disabled}
        />
      ) : null}
    </div>
  )
}

function formatRangeLabel(
  start: Date | undefined,
  end: Date | undefined,
  showTime: boolean,
  placeholder: string
): string {
  if (!start) return placeholder
  const format = showTime ? 'YYYY-MM-DD HH:mm' : 'YYYY-MM-DD'
  const left = dayjs(start).format(format)
  const right = dayjs(end ?? start).format(format)
  return `${left}  →  ${right}`
}

function getVisibleStartMonth(range: DateRange | undefined): Date {
  const end = range?.to ?? range?.from ?? new Date()
  return dayjs(end).startOf('month').subtract(1, 'month').toDate()
}

function toStartOfDay(date: Date): Date {
  return dayjs(date).startOf('day').toDate()
}

function formatClock(date: Date | undefined, fallback: string): string {
  if (!date) return fallback
  return dayjs(date).format('HH:mm')
}

function applyClock(date: Date, time: string): Date {
  const [hours, minutes] = time.split(':').map(Number)
  return dayjs(date)
    .hour(Number.isFinite(hours) ? hours : 0)
    .minute(Number.isFinite(minutes) ? minutes : 0)
    .second(0)
    .millisecond(0)
    .toDate()
}

export function DateRangePickerButton(props: DateRangePickerButtonProps) {
  const {
    start,
    end,
    onApply,
    showTime = false,
    disableFuture = false,
    align = 'end',
    className,
    triggerClassName,
  } = props
  const { t, i18n } = useTranslation()
  const isZh = i18n.language === 'zhCN' || i18n.language.startsWith('zh')
  const calendarLocale = isZh ? zhCN : enUS
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLElement | null>(null)
  const [draft, setDraft] = useState<DateRange | undefined>()
  const [startTime, setStartTime] = useState(() => formatClock(start, '00:00'))
  const [endTime, setEndTime] = useState(() => formatClock(end, '23:59'))
  const [month, setMonth] = useState<Date>(() =>
    getVisibleStartMonth({ from: start, to: end })
  )
  const [quickRangeMinutes, setQuickRangeMinutes] = useState<number | null>(
    null
  )
  const [timeEditorOpen, setTimeEditorOpen] = useState(false)
  const [activeTimeField, setActiveTimeField] = useState<
    'start' | 'end' | null
  >(null)

  const selectedRange = useMemo<DateRange | undefined>(() => {
    if (!start && !end) return undefined
    return { from: start, to: end }
  }, [end, start])

  const syncDraftFromValue = () => {
    setDraft(selectedRange)
    setMonth(getVisibleStartMonth(selectedRange))
    setStartTime(formatClock(start, '00:00'))
    setEndTime(formatClock(end, '23:59'))
    setQuickRangeMinutes(null)
    setTimeEditorOpen(false)
    setActiveTimeField(null)
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
    if (!nextOpen) {
      const event = eventDetails.event
      const path =
        typeof event.composedPath === 'function' ? event.composedPath() : []
      const clickedTimeWheel = path.some(
        (node) =>
          node instanceof Element &&
          node.closest('[data-slot="time-wheel-popover"]')
      )
      if (clickedTimeWheel) {
        eventDetails.cancel()
        return
      }
    }
    if (nextOpen) {
      syncDraftFromValue()
    }
    setOpen(nextOpen)
  }

  const handleTriggerClick = () => {
    const nextOpen = !open
    if (nextOpen) {
      syncDraftFromValue()
    }
    setOpen(nextOpen)
  }

  const handleSelect = (_next: DateRange | undefined, selectedDay: Date) => {
    setDraft((current) => {
      const prev = current ?? selectedRange
      const clicked = toStartOfDay(selectedDay)

      if (!prev?.from || prev.to) {
        return { from: clicked, to: undefined }
      }

      const from = toStartOfDay(prev.from)
      if (dayjs(clicked).isBefore(from, 'day')) {
        return { from: clicked, to: from }
      }
      return { from, to: clicked }
    })
    setQuickRangeMinutes(null)
  }

  const applyDraft = () => {
    if (!draft?.from) return
    const fromDate = draft.from
    const toDate = draft.to ?? draft.from
    const nextStart = showTime
      ? applyClock(fromDate, startTime)
      : dayjs(fromDate).startOf('day').toDate()
    const nextEnd = showTime
      ? applyClock(toDate, endTime)
      : dayjs(toDate).endOf('day').toDate()
    onApply(
      nextStart.getTime() <= nextEnd.getTime()
        ? { start: nextStart, end: nextEnd }
        : { start: nextEnd, end: nextStart }
    )
    setOpen(false)
  }

  const handleQuickRange = (minutes: number) => {
    if (minutes === 1440) {
      const startDay = dayjs().subtract(1, 'day').toDate()
      const endDay = new Date()
      const nextStart = applyClock(startDay, startTime)
      const nextEnd = applyClock(endDay, '23:59')
      setDraft({ from: nextStart, to: nextEnd })
      setEndTime('23:59')
      setMonth(getVisibleStartMonth({ from: nextStart, to: nextEnd }))
      setQuickRangeMinutes(minutes)
      return
    }

    const nextEnd = new Date()
    const nextStart = dayjs(nextEnd).subtract(minutes, 'minute').toDate()
    setDraft({ from: nextStart, to: nextEnd })
    setStartTime(formatClock(nextStart, '00:00'))
    setEndTime(formatClock(nextEnd, '23:59'))
    setMonth(getVisibleStartMonth({ from: nextStart, to: nextEnd }))
    setQuickRangeMinutes(minutes)
  }

  const handleClear = () => {
    setDraft(undefined)
    setStartTime('00:00')
    setEndTime('23:59')
    setQuickRangeMinutes(null)
  }

  const handleTimeChange = (which: 'start' | 'end', nextTime: string) => {
    setQuickRangeMinutes(null)
    if (which === 'start') setStartTime(nextTime)
    else setEndTime(nextTime)
  }

  const handleDateChange = (which: 'start' | 'end', nextDate: Date) => {
    const day = toStartOfDay(nextDate)
    if (disableFuture && dayjs(day).isAfter(dayjs(), 'day')) return
    setQuickRangeMinutes(null)
    setDraft((current) => {
      const prev: DateRange = current ?? selectedRange ?? { from: undefined }
      if (which === 'start') {
        return { from: day, to: prev.to }
      }
      return { from: prev.from ?? day, to: day }
    })
    setMonth((currentMonth) => {
      const range =
        which === 'start'
          ? { from: day, to: draft?.to }
          : { from: draft?.from, to: day }
      const nextMonth = getVisibleStartMonth(range)
      return dayjs(nextMonth).isSame(currentMonth, 'month')
        ? currentMonth
        : nextMonth
    })
  }

  const handleTimeOpenChange = (field: 'start' | 'end', nextOpen: boolean) => {
    if (nextOpen) {
      setActiveTimeField(field)
      setTimeEditorOpen(true)
      return
    }
    if (activeTimeField === field) {
      setTimeEditorOpen(false)
      setActiveTimeField(null)
    }
  }
  const draftStart = draft?.from
  const draftEnd = draft?.to ?? draft?.from

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger
        ref={triggerRef}
        className={cn(
          buttonVariants({ variant: 'outline', size: 'sm' }),
          'h-8 min-w-0 justify-start gap-1.5 px-2.5 text-sm font-normal tabular-nums',
          triggerClassName,
          className
        )}
        onClick={handleTriggerClick}
      >
        <CalendarDays className='text-muted-foreground size-4' />
        {formatRangeLabel(start, end, showTime, t('Select date'))}
      </PopoverTrigger>
      <PopoverContent
        align={align}
        initialFocus={false}
        animate={false}
        keepMounted
        className='max-h-[80dvh] w-auto max-w-[calc(100vw-2rem)] overflow-auto p-3'
      >
        {showTime ? (
          <div className='mb-0 grid grid-cols-2'>
            <div className='flex justify-center'>
              <DateTimeSummaryField
                date={draftStart}
                time={startTime}
                showTime
                datePlaceholder={t('Select date')}
                dateLabel={t('Select date')}
                timeLabel={t('Start Time')}
                hourLabel={t('Hour')}
                minuteLabel={t('Minute')}
                timeActive={timeEditorOpen && activeTimeField === 'start'}
                disabled={!draft?.from && !start}
                onDateChange={(date) => handleDateChange('start', date)}
                onTimeOpenChange={(open) => handleTimeOpenChange('start', open)}
                onTimeChange={(next) => handleTimeChange('start', next)}
              />
            </div>
            <div className='flex justify-center'>
              <DateTimeSummaryField
                date={draftEnd}
                time={endTime}
                showTime
                datePlaceholder={t('Select date')}
                dateLabel={t('Select date')}
                timeLabel={t('End Time')}
                hourLabel={t('Hour')}
                minuteLabel={t('Minute')}
                timeActive={timeEditorOpen && activeTimeField === 'end'}
                disabled={!draft?.from && !start}
                onDateChange={(date) => handleDateChange('end', date)}
                onTimeOpenChange={(open) => handleTimeOpenChange('end', open)}
                onTimeChange={(next) => handleTimeChange('end', next)}
              />
            </div>
          </div>
        ) : null}
        <Calendar
          mode='range'
          className='pt-0'
          numberOfMonths={2}
          locale={calendarLocale}
          month={month}
          onMonthChange={setMonth}
          selected={draft ?? selectedRange}
          onSelect={handleSelect}
          autoFocus={false}
          disabled={disableFuture ? { after: new Date() } : undefined}
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
                    ['日', '一', '二', '三', '四', '五', '六'][date.getDay()] ??
                    '',
                }
              : undefined
          }
        />
        <div
          className={cn(
            'mt-3 flex gap-2',
            showTime ? 'flex-wrap items-center justify-between' : 'justify-end'
          )}
        >
          {showTime ? (
            <Tabs
              value={
                quickRangeMinutes != null ? String(quickRangeMinutes) : 'custom'
              }
              onValueChange={(value) => {
                if (value === 'custom') return
                const minutes = Number(value)
                if (Number.isFinite(minutes)) handleQuickRange(minutes)
              }}
              className='min-w-0'
            >
              <TabsList aria-label={t('Quick Range')}>
                {DATETIME_QUICK_RANGES.map((range) => (
                  <TabsTrigger
                    key={range.minutes}
                    value={String(range.minutes)}
                    className='px-2.5 text-sm'
                  >
                    {t(range.labelKey)}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          ) : null}
          <div className='flex shrink-0 justify-end gap-2'>
            {showTime ? (
              <Button variant='ghost' size='sm' onClick={handleClear}>
                {t('Clear')}
              </Button>
            ) : (
              <Button variant='ghost' size='sm' onClick={() => setOpen(false)}>
                {t('Cancel')}
              </Button>
            )}
            <Button
              size='sm'
              className='bg-foreground text-background hover:bg-foreground/90'
              disabled={!draft?.from}
              onClick={applyDraft}
            >
              {showTime ? t('Confirm') : t('Apply')}
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
