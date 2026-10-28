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
import { useMemo, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { cn } from '@/lib/utils'

import {
  CHANNEL_STATUS_FACETS,
  UNTAGGED_TAG_FILTER,
  sortTagCountEntries,
  statusFacetCount,
} from '../lib/channel-classification'
import { getChannelTypeLabel } from '../lib/channel-utils'
import { ChannelTypeLogo } from './channel-type-badge'

const SENSITIVE_MASK = '••••'

type ClassificationChipProps = {
  selected: boolean
  onClick: () => void
  children: ReactNode
  ariaLabel: string
  tone?: 'default' | 'warning'
}

function ClassificationChip(props: ClassificationChipProps) {
  let toneClass = 'text-muted-foreground hover:bg-muted hover:text-foreground'
  if (props.selected) {
    toneClass = 'bg-foreground text-background shadow-xs'
  } else if (props.tone === 'warning') {
    toneClass = 'text-warning hover:bg-warning/10'
  }

  return (
    <button
      type='button'
      aria-pressed={props.selected}
      aria-label={props.ariaLabel}
      onClick={props.onClick}
      className={cn(
        'inline-flex h-7 shrink-0 items-center gap-1.5 rounded-md px-2 text-xs font-medium whitespace-nowrap transition-colors',
        toneClass
      )}
    >
      {props.children}
    </button>
  )
}

function ChipCount(props: { value: number }) {
  return <span className='tabular-nums opacity-75'>{props.value}</span>
}

function ClassificationRow(props: { label: string; children: ReactNode }) {
  return (
    <div className='flex min-w-0 items-center gap-2'>
      <span className='text-muted-foreground w-12 shrink-0 text-[11px] leading-none'>
        {props.label}
      </span>
      <div className='flex min-w-0 flex-1 [scrollbar-width:none] items-center gap-1 overflow-x-auto [&::-webkit-scrollbar]:hidden'>
        {props.children}
      </div>
    </div>
  )
}

export function ChannelsClassificationBar(props: {
  statusCounts?: Record<string, number>
  typeCounts?: Record<string, number>
  tagCounts?: Record<string, number>
  untaggedCount?: number
  statusValue: string
  typeValue: string
  tagValue: string
  onStatusChange: (value: string | undefined) => void
  onTypeChange: (value: string | undefined) => void
  onTagChange: (value: string | undefined) => void
  sensitiveVisible: boolean
}) {
  const { t } = useTranslation()

  const typeItems = useMemo(() => {
    return Object.entries(props.typeCounts ?? {})
      .map(([type, count]) => ({
        type: Number(type),
        count: Number(count) || 0,
      }))
      .filter((item) => item.type > 0 && item.count > 0)
      .sort((a, b) => {
        const labelA = t(getChannelTypeLabel(a.type))
        const labelB = t(getChannelTypeLabel(b.type))
        return labelA.localeCompare(labelB)
      })
  }, [props.typeCounts, t])

  const tagItems = useMemo(
    () => sortTagCountEntries(props.tagCounts),
    [props.tagCounts]
  )
  const untaggedCount = Number(props.untaggedCount || 0)
  const typeTotal = typeItems.reduce((sum, item) => sum + item.count, 0)
  const tagTotal =
    tagItems.reduce((sum, item) => sum + item.count, 0) + untaggedCount
  const showTypeRail = typeItems.length > 1 || props.typeValue !== 'all'
  const showTagRail = tagItems.length > 0 || props.tagValue !== 'all'

  return (
    <div className='flex min-w-0 flex-col gap-1.5'>
      <ClassificationRow label={t('Status')}>
        {CHANNEL_STATUS_FACETS.map((facet) => {
          const count = statusFacetCount(props.statusCounts, facet.statusKey)
          const selected = props.statusValue === facet.value
          const warning =
            facet.value === 'auto_disabled' && count > 0 && !selected
          const statusCountsReady = props.statusCounts != null
          return (
            <ClassificationChip
              key={facet.value}
              selected={selected}
              tone={warning ? 'warning' : 'default'}
              ariaLabel={
                statusCountsReady
                  ? `${t(facet.label)} ${count}`
                  : t(facet.label)
              }
              onClick={() =>
                props.onStatusChange(
                  selected || facet.value === 'all' ? undefined : facet.value
                )
              }
            >
              <span>{t(facet.label)}</span>
              {statusCountsReady ? <ChipCount value={count} /> : null}
            </ClassificationChip>
          )
        })}
      </ClassificationRow>

      {showTypeRail ? (
        <ClassificationRow label={t('Type')}>
          <ClassificationChip
            selected={props.typeValue === 'all'}
            ariaLabel={t('All Types')}
            onClick={() => props.onTypeChange(undefined)}
          >
            <span>{t('All Types')}</span>
            <ChipCount value={typeTotal} />
          </ClassificationChip>
          {typeItems.map((item) => {
            const value = String(item.type)
            const selected = props.typeValue === value
            const label = t(getChannelTypeLabel(item.type))
            return (
              <ClassificationChip
                key={value}
                selected={selected}
                ariaLabel={`${label} ${item.count}`}
                onClick={() => props.onTypeChange(selected ? undefined : value)}
              >
                <ChannelTypeLogo type={item.type} size={14} />
                <span>{label}</span>
                <ChipCount value={item.count} />
              </ClassificationChip>
            )
          })}
        </ClassificationRow>
      ) : null}

      {showTagRail ? (
        <ClassificationRow label={t('Tag')}>
          <ClassificationChip
            selected={props.tagValue === 'all'}
            ariaLabel={t('All Tags')}
            onClick={() => props.onTagChange(undefined)}
          >
            <span>{t('All Tags')}</span>
            <ChipCount value={tagTotal} />
          </ClassificationChip>
          {tagItems.map((item) => {
            const selected = props.tagValue === item.tag
            const label = props.sensitiveVisible ? item.tag : SENSITIVE_MASK
            return (
              <ClassificationChip
                key={item.tag}
                selected={selected}
                ariaLabel={`${item.tag} ${item.count}`}
                onClick={() =>
                  props.onTagChange(selected ? undefined : item.tag)
                }
              >
                <span>{label}</span>
                <ChipCount value={item.count} />
              </ClassificationChip>
            )
          })}
          {untaggedCount > 0 || props.tagValue === UNTAGGED_TAG_FILTER ? (
            <ClassificationChip
              selected={props.tagValue === UNTAGGED_TAG_FILTER}
              ariaLabel={`${t('Untagged')} ${untaggedCount}`}
              onClick={() =>
                props.onTagChange(
                  props.tagValue === UNTAGGED_TAG_FILTER
                    ? undefined
                    : UNTAGGED_TAG_FILTER
                )
              }
            >
              <span>{t('Untagged')}</span>
              <ChipCount value={untaggedCount} />
            </ClassificationChip>
          ) : null}
        </ClassificationRow>
      ) : null}
    </div>
  )
}
