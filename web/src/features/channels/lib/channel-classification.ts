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
import { CHANNEL_STATUS } from '../constants'

export const UNTAGGED_TAG_FILTER = '__untagged__'

export const CHANNEL_STATUS_FACETS = [
  { value: 'all', label: 'All Status', statusKey: null },
  {
    value: 'enabled',
    label: 'Enabled',
    statusKey: String(CHANNEL_STATUS.ENABLED),
  },
  {
    value: 'auto_disabled',
    label: 'Auto Disabled',
    statusKey: String(CHANNEL_STATUS.AUTO_DISABLED),
  },
  {
    value: 'manually_disabled',
    label: 'Disabled',
    statusKey: String(CHANNEL_STATUS.MANUAL_DISABLED),
  },
] as const

export function countRecordTotal(counts?: Record<string, number>): number {
  return Object.values(counts ?? {}).reduce(
    (sum, count) => sum + (Number(count) || 0),
    0
  )
}

export function statusFacetCount(
  counts: Record<string, number> | undefined,
  statusKey: string | null
): number {
  if (!statusKey) {
    return countRecordTotal(counts)
  }
  return Number(counts?.[statusKey] || 0)
}

export function selectedSingleFilter(values: string[] | undefined): string {
  const value = values?.find((item) => item && item !== 'all')
  return value || 'all'
}

export function sortTagCountEntries(
  tagCounts?: Record<string, number>
): Array<{ tag: string; count: number }> {
  return Object.entries(tagCounts ?? {})
    .map(([tag, count]) => ({ tag, count: Number(count) || 0 }))
    .filter((item) => item.tag && item.count > 0)
    .sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count
      return a.tag.localeCompare(b.tag)
    })
}
