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
import { TooltipHint } from '@/components/ui/tooltip'

import type { LogOtherData } from '../types'

type UserGroupInfo = { desc: string; ratio: number | string }
type UserGroupMap = Record<string, UserGroupInfo>

function formatRatioCompact(ratio: number | undefined): string {
  if (ratio == null || !Number.isFinite(ratio)) return '-'
  return ratio % 1 === 0
    ? String(ratio)
    : ratio.toFixed(4).replace(/\.?0+$/, '')
}

function parseConfiguredRatio(
  value: number | string | undefined
): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return null
}

function getGroupRatio(
  other: LogOtherData | null,
  group: string,
  groups: UserGroupMap
): number | null {
  const userGroupRatio = other?.user_group_ratio
  if (
    userGroupRatio != null &&
    userGroupRatio !== -1 &&
    Number.isFinite(userGroupRatio)
  ) {
    return userGroupRatio
  }
  const groupRatio = other?.group_ratio
  if (groupRatio != null && Number.isFinite(groupRatio)) {
    return groupRatio
  }
  return parseConfiguredRatio(groups[group]?.ratio)
}

function getGroupDescription(group: string, groups: UserGroupMap): string {
  return groups[group]?.desc?.trim() || group
}

interface LogTokenCellProps {
  tokenName?: string | null
  group?: string | null
  other: LogOtherData | null
  groups?: UserGroupMap
  sensitiveVisible?: boolean
}

export function LogTokenCell(props: LogTokenCellProps) {
  const groups = props.groups ?? {}
  const tokenName = props.tokenName?.trim() || ''
  const group = (props.group || props.other?.group || '').trim()
  const groupDesc = group ? getGroupDescription(group, groups) : ''
  const groupRatio = getGroupRatio(props.other, group, groups)
  const sensitiveVisible = props.sensitiveVisible ?? true
  let displayName = '-'
  if (tokenName) {
    displayName = sensitiveVisible ? tokenName : '••••'
  }
  let displayGroup = ''
  if (groupDesc) {
    displayGroup = sensitiveVisible ? groupDesc : '••••'
  }

  return (
    <div className='flex min-w-0 flex-col items-center gap-0.5'>
      <TooltipHint
        content={sensitiveVisible ? tokenName || undefined : undefined}
      >
        <span className='block w-full max-w-48 truncate text-[13px]! @min-[48rem]/activity:text-[15px]! @min-[80rem]/activity:text-[16px]!'>
          {displayName}
        </span>
      </TooltipHint>
      {displayGroup || groupRatio != null ? (
        <span className='flex max-w-full items-center justify-center gap-1 text-[10px]! leading-none @min-[48rem]/activity:text-[12px]!'>
          {displayGroup ? (
            <TooltipHint content={sensitiveVisible ? displayGroup : undefined}>
              <span className='text-muted-foreground max-w-36 truncate text-[10px]! @min-[48rem]/activity:text-[12px]!'>
                {displayGroup}
              </span>
            </TooltipHint>
          ) : null}
          {groupRatio != null ? (
            <span className='shrink-0 rounded bg-lime-400 px-1 py-px text-[10px]! font-semibold text-black tabular-nums @min-[48rem]/activity:text-[12px]!'>
              {formatRatioCompact(groupRatio)}x
            </span>
          ) : null}
        </span>
      ) : null}
    </div>
  )
}
