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
import type {
  UserConsoleDateRange,
  UserConsoleRangePreset,
} from '@/features/dashboard/types'
import dayjs from '@/lib/dayjs'
import type { TimeGranularity } from '@/lib/time'

function startOfWeekMonday(date: dayjs.Dayjs): dayjs.Dayjs {
  return date.startOf('day').subtract((date.day() + 6) % 7, 'day')
}

function endOfWeekMonday(date: dayjs.Dayjs): dayjs.Dayjs {
  return startOfWeekMonday(date).add(6, 'day').endOf('day')
}

export function getUserConsolePresetRange(
  preset: Exclude<UserConsoleRangePreset, 'custom'>,
  fromDate: Date = new Date()
): { start: Date; end: Date } {
  const now = dayjs(fromDate)

  if (preset === 'today') {
    return {
      start: now.startOf('day').toDate(),
      end: now.endOf('day').toDate(),
    }
  }
  if (preset === 'yesterday') {
    const day = now.subtract(1, 'day')
    return {
      start: day.startOf('day').toDate(),
      end: day.endOf('day').toDate(),
    }
  }
  if (preset === 'week') {
    return {
      start: startOfWeekMonday(now).toDate(),
      end: endOfWeekMonday(now).toDate(),
    }
  }
  if (preset === 'month') {
    return {
      start: now.startOf('month').toDate(),
      end: now.endOf('month').toDate(),
    }
  }

  const lastMonth = now.subtract(1, 'month')
  return {
    start: lastMonth.startOf('month').toDate(),
    end: lastMonth.endOf('month').toDate(),
  }
}

export function buildDefaultUserConsoleRange(
  fromDate: Date = new Date()
): UserConsoleDateRange {
  const range = getUserConsolePresetRange('today', fromDate)
  return {
    preset: 'today',
    start: range.start,
    end: range.end,
  }
}

export function getUserConsoleGranularity(range: {
  start: Date
  end: Date
}): TimeGranularity {
  const durationMs = range.end.getTime() - range.start.getTime()
  const twoDaysMs = 2 * 24 * 60 * 60 * 1000
  if (durationMs <= twoDaysMs) return 'hour'
  return 'day'
}

export function matchUserConsolePreset(
  start: Date,
  end: Date,
  fromDate: Date = new Date()
): UserConsoleRangePreset {
  const presets: Exclude<UserConsoleRangePreset, 'custom'>[] = [
    'today',
    'yesterday',
    'week',
    'month',
    'last-month',
  ]

  for (const preset of presets) {
    const range = getUserConsolePresetRange(preset, fromDate)
    if (
      dayjs(start).isSame(range.start, 'minute') &&
      dayjs(end).isSame(range.end, 'minute')
    ) {
      return preset
    }
  }

  return 'custom'
}

const CONSOLE_DATA_SCOPE_KEY = 'console-data-scope'

export type ConsoleDataScope = 'site' | 'self'

export function getSavedConsoleDataScope(): ConsoleDataScope {
  try {
    const value = localStorage.getItem(CONSOLE_DATA_SCOPE_KEY)
    if (value === 'site' || value === 'self') return value
  } catch {
    // Ignore storage errors.
  }
  return 'self'
}

export function saveConsoleDataScope(scope: ConsoleDataScope) {
  try {
    localStorage.setItem(CONSOLE_DATA_SCOPE_KEY, scope)
  } catch {
    // Ignore storage errors.
  }
}
