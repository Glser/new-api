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
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'

import {
  isPopoverDismissFromTrigger,
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { cn } from '@/lib/utils'

const TIME_WHEEL_ITEM_PX = 28
const TIME_WHEEL_VISIBLE = 5
const TIME_WHEEL_LOOP_COPIES = 5

function parseClock(time: string): { hours: number; minutes: number } {
  const [hours, minutes] = time.split(':').map(Number)
  return {
    hours: Number.isFinite(hours) ? Math.min(23, Math.max(0, hours)) : 0,
    minutes: Number.isFinite(minutes) ? Math.min(59, Math.max(0, minutes)) : 0,
  }
}

function formatClockValue(hours: number, minutes: number): string {
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
}

function parseTimeInput(raw: string): string | null {
  const trimmed = raw.trim()
  if (!trimmed) return null
  const colonMatch = trimmed.match(/^(\d{1,2}):(\d{1,2})$/)
  if (colonMatch) {
    const hours = Number(colonMatch[1])
    const minutes = Number(colonMatch[2])
    if (hours > 23 || minutes > 59) return null
    return formatClockValue(hours, minutes)
  }
  const digits = trimmed.replaceAll(/\D/g, '')
  if (digits.length === 1 || digits.length === 2) {
    const hours = Number(digits)
    if (hours > 23) return null
    return formatClockValue(hours, 0)
  }
  if (digits.length === 3) {
    const hours = Number(digits.slice(0, 1))
    const minutes = Number(digits.slice(1))
    if (hours > 23 || minutes > 59) return null
    return formatClockValue(hours, minutes)
  }
  if (digits.length >= 4) {
    const hours = Number(digits.slice(0, 2))
    const minutes = Number(digits.slice(2, 4))
    if (hours > 23 || minutes > 59) return null
    return formatClockValue(hours, minutes)
  }
  return null
}

function circularDistance(
  value: number,
  selected: number,
  min: number,
  max: number
): number {
  const count = max - min + 1
  const diff = Math.abs(value - selected)
  return Math.min(diff, count - diff)
}

function wrapValue(value: number, min: number, max: number): number {
  const count = max - min + 1
  return min + ((((value - min) % count) + count) % count)
}

function wheelItemClassName(distance: number): string {
  if (distance === 0) return 'text-foreground text-sm font-medium'
  if (distance === 1) return 'text-muted-foreground text-[13px]'
  return 'text-muted-foreground/40 text-xs'
}

function TimeWheelColumn(props: {
  value: number
  min: number
  max: number
  onChange: (next: number) => void
  disabled?: boolean
  visible?: boolean
  visibleCount?: number
  'aria-label': string
}) {
  const visibleCount = props.visibleCount ?? TIME_WHEEL_VISIBLE
  const count = props.max - props.min + 1
  const middleCopy = Math.floor(TIME_WHEEL_LOOP_COPIES / 2)
  const scrollerRef = useRef<HTMLDivElement>(null)
  const frameRef = useRef<number | null>(null)
  const lastEmittedRef = useRef(props.value)
  const userScrollingRef = useRef(false)
  const scrollEndTimerRef = useRef<number | null>(null)
  const values = useMemo(() => {
    const base: number[] = []
    for (let value = props.min; value <= props.max; value += 1) base.push(value)
    const next: Array<{ copy: number; value: number }> = []
    for (let copy = 0; copy < TIME_WHEEL_LOOP_COPIES; copy += 1) {
      for (const value of base) next.push({ copy, value })
    }
    return next
  }, [props.max, props.min])

  const pad = Math.floor(visibleCount / 2)
  const scrollTopForValue = (value: number) =>
    (middleCopy * count + (value - props.min) - pad) * TIME_WHEEL_ITEM_PX

  const recenter = (value: number) => {
    const scroller = scrollerRef.current
    if (!scroller) return
    scroller.scrollTop = scrollTopForValue(value)
  }

  useLayoutEffect(() => {
    if (props.visible === false) return
    if (userScrollingRef.current) {
      lastEmittedRef.current = props.value
      return
    }
    const sync = () => {
      const scroller = scrollerRef.current
      if (!scroller) return
      scroller.scrollTop =
        (middleCopy * count + (props.value - props.min) - pad) *
        TIME_WHEEL_ITEM_PX
    }
    lastEmittedRef.current = props.value
    sync()
    const raf = requestAnimationFrame(() => {
      sync()
      requestAnimationFrame(sync)
    })
    const timer = window.setTimeout(sync, 0)
    return () => {
      cancelAnimationFrame(raf)
      window.clearTimeout(timer)
    }
  }, [count, middleCopy, pad, props.min, props.value, props.visible])

  const emitFromScroll = () => {
    const scroller = scrollerRef.current
    if (!scroller) return
    const index = Math.round(scroller.scrollTop / TIME_WHEEL_ITEM_PX)
    const next = wrapValue(props.min + index + pad, props.min, props.max)
    const copyIndex = Math.floor(index / count)
    if (copyIndex <= 0 || copyIndex >= TIME_WHEEL_LOOP_COPIES - 1) {
      recenter(next)
    }
    if (next === lastEmittedRef.current) return
    lastEmittedRef.current = next
    props.onChange(next)
  }

  return (
    <div
      className='relative w-10 select-none'
      style={{ height: TIME_WHEEL_ITEM_PX * visibleCount }}
      onWheel={(event) => event.stopPropagation()}
    >
      <div
        aria-hidden
        className='bg-muted pointer-events-none absolute inset-x-0.5 top-1/2 z-0 h-7 -translate-y-1/2 rounded-md'
      />
      <div
        ref={scrollerRef}
        role='listbox'
        aria-label={props['aria-label']}
        tabIndex={props.disabled ? -1 : 0}
        className='relative z-10 h-full snap-y snap-mandatory [scrollbar-width:none] overflow-y-auto overscroll-contain [&::-webkit-scrollbar]:hidden'
        onScroll={() => {
          userScrollingRef.current = true
          if (scrollEndTimerRef.current != null) {
            window.clearTimeout(scrollEndTimerRef.current)
          }
          if (frameRef.current != null) cancelAnimationFrame(frameRef.current)
          frameRef.current = requestAnimationFrame(emitFromScroll)
          scrollEndTimerRef.current = window.setTimeout(() => {
            userScrollingRef.current = false
            recenter(lastEmittedRef.current)
          }, 80)
        }}
        onKeyDown={(event) => {
          if (event.key === 'ArrowUp') {
            event.preventDefault()
            props.onChange(wrapValue(props.value - 1, props.min, props.max))
          }
          if (event.key === 'ArrowDown') {
            event.preventDefault()
            props.onChange(wrapValue(props.value + 1, props.min, props.max))
          }
        }}
      >
        {values.map((item) => {
          const distance = circularDistance(
            item.value,
            props.value,
            props.min,
            props.max
          )
          return (
            <button
              key={`${item.copy}-${item.value}`}
              type='button'
              role='option'
              aria-selected={item.value === props.value}
              tabIndex={-1}
              disabled={props.disabled}
              className={cn(
                'flex w-full snap-center items-center justify-center tabular-nums transition-colors',
                wheelItemClassName(distance)
              )}
              style={{ height: TIME_WHEEL_ITEM_PX }}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => props.onChange(item.value)}
            >
              {String(item.value).padStart(2, '0')}
            </button>
          )
        })}
      </div>
      <div
        aria-hidden
        className='from-popover pointer-events-none absolute inset-x-0 top-0 z-20 h-9 bg-gradient-to-b to-transparent'
      />
      <div
        aria-hidden
        className='from-popover pointer-events-none absolute inset-x-0 bottom-0 z-20 h-9 bg-gradient-to-t to-transparent'
      />
    </div>
  )
}

export function TimeWheelControl(props: {
  label?: string
  hourLabel: string
  minuteLabel: string
  value: string
  onChange: (next: string) => void
  disabled?: boolean
  visible?: boolean
  compact?: boolean
}) {
  const { hours, minutes } = parseClock(props.value)
  const visibleCount = props.compact ? 5 : TIME_WHEEL_VISIBLE

  return (
    <div
      className={cn(
        'grid justify-items-center gap-1',
        props.disabled && 'pointer-events-none opacity-50'
      )}
    >
      {props.label ? (
        <span className='text-muted-foreground text-sm'>{props.label}</span>
      ) : null}
      <div className='flex items-center gap-0.5'>
        <TimeWheelColumn
          aria-label={props.hourLabel}
          value={hours}
          min={0}
          max={23}
          disabled={props.disabled}
          visible={props.visible}
          visibleCount={visibleCount}
          onChange={(nextHours) =>
            props.onChange(formatClockValue(nextHours, minutes))
          }
        />
        <span className='text-muted-foreground w-3 text-center text-sm font-medium'>
          :
        </span>
        <TimeWheelColumn
          aria-label={props.minuteLabel}
          value={minutes}
          min={0}
          max={59}
          disabled={props.disabled}
          visible={props.visible}
          visibleCount={visibleCount}
          onChange={(nextMinutes) =>
            props.onChange(formatClockValue(hours, nextMinutes))
          }
        />
      </div>
    </div>
  )
}

export function TimeInputPopover(props: {
  value: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onChange: (next: string) => void
  hourLabel: string
  minuteLabel: string
  ariaLabel: string
  disabled?: boolean
}) {
  const triggerRef = useRef<HTMLElement | null>(null)
  const [draft, setDraft] = useState(props.value)
  const focusedRef = useRef(false)

  useEffect(() => {
    if (!focusedRef.current) setDraft(props.value)
  }, [props.value])

  const commitDraft = () => {
    const parsed = parseTimeInput(draft)
    if (parsed) {
      props.onChange(parsed)
      setDraft(parsed)
      return
    }
    setDraft(props.value)
  }

  return (
    <Popover
      open={props.open}
      onOpenChange={(nextOpen, eventDetails) => {
        if (eventDetails.reason === 'trigger-press') {
          eventDetails.cancel()
          return
        }
        if (eventDetails.reason === 'focus-out') {
          eventDetails.cancel()
          return
        }
        if (isPopoverDismissFromTrigger(eventDetails, triggerRef.current)) {
          eventDetails.cancel()
          return
        }
        props.onOpenChange(nextOpen)
      }}
    >
      <PopoverTrigger
        ref={triggerRef}
        disabled={props.disabled}
        nativeButton={false}
        render={
          <input
            aria-label={props.ariaLabel}
            inputMode='numeric'
            autoComplete='off'
            spellCheck={false}
            disabled={props.disabled}
            value={draft}
            onChange={(event) => {
              const next = event.target.value
              setDraft(next)
              const parsed = parseTimeInput(next)
              if (parsed && /^\d{2}:\d{2}$/.test(next)) {
                props.onChange(parsed)
              }
            }}
            onFocus={() => {
              focusedRef.current = true
              props.onOpenChange(true)
            }}
            onBlur={() => {
              focusedRef.current = false
              commitDraft()
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                commitDraft()
                props.onOpenChange(false)
                event.currentTarget.blur()
              }
              if (event.key === 'Escape') {
                setDraft(props.value)
                props.onOpenChange(false)
              }
              if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
                event.preventDefault()
                const { hours, minutes } = parseClock(props.value)
                const delta = event.key === 'ArrowUp' ? 1 : -1
                const nextMinutes = wrapValue(minutes + delta, 0, 59)
                let hourDelta = 0
                if (delta === 1 && nextMinutes === 0) hourDelta = 1
                if (delta === -1 && nextMinutes === 59) hourDelta = -1
                const nextHours = wrapValue(hours + hourDelta, 0, 23)
                const next = formatClockValue(nextHours, nextMinutes)
                props.onChange(next)
                setDraft(next)
              }
            }}
            className={cn(
              'border-input h-8 w-[4.5rem] rounded-lg border bg-transparent px-1.5 text-center text-sm leading-8 tabular-nums outline-none',
              'placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-1',
              props.open && 'border-foreground/20 bg-muted',
              props.disabled && 'pointer-events-none opacity-50'
            )}
          />
        }
      />
      <PopoverContent
        align='center'
        side='bottom'
        sideOffset={6}
        animate={false}
        initialFocus={false}
        className='w-auto min-w-0 p-1.5'
        data-slot='time-wheel-popover'
        onMouseDown={(event) => event.preventDefault()}
      >
        <TimeWheelControl
          key={props.open ? 'open' : 'closed'}
          hourLabel={props.hourLabel}
          minuteLabel={props.minuteLabel}
          value={props.value}
          onChange={(next) => {
            props.onChange(next)
            setDraft(next)
          }}
          disabled={props.disabled}
          visible={props.open}
          compact
        />
      </PopoverContent>
    </Popover>
  )
}
