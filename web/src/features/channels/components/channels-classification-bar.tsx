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

import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
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

function ChipCount(props: { value: number }) {
  return <span className='tabular-nums opacity-60'>{props.value}</span>
}

function ClassificationTabs(props: {
  value: string
  ariaLabel: string
  onValueChange: (value: string) => void
  children: ReactNode
}) {
  return (
    <div className='flex min-w-0 [scrollbar-width:none] items-center overflow-x-auto [&::-webkit-scrollbar]:hidden'>
      <Tabs
        value={props.value}
        onValueChange={props.onValueChange}
        className='min-w-0 shrink-0'
      >
        <TabsList
          aria-label={props.ariaLabel}
          className='h-auto min-h-8 max-w-full flex-wrap justify-start group-data-horizontal/tabs:h-auto'
        >
          {props.children}
        </TabsList>
      </Tabs>
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
  const showTypeRail = typeItems.length > 1 || props.typeValue !== 'all'
  const showTagRail = tagItems.length > 0 || props.tagValue !== 'all'
  const statusCountsReady = props.statusCounts != null

  return (
    <div className='flex min-w-0 flex-col gap-1.5'>
      <ClassificationTabs
        value={props.statusValue}
        ariaLabel={t('Status')}
        onValueChange={(value) =>
          props.onStatusChange(value === 'all' ? undefined : value)
        }
      >
        {CHANNEL_STATUS_FACETS.map((facet) => {
          const count = statusFacetCount(props.statusCounts, facet.statusKey)
          const warning =
            facet.value === 'auto_disabled' &&
            count > 0 &&
            props.statusValue !== facet.value
          return (
            <TabsTrigger
              key={facet.value}
              value={facet.value}
              className={cn('gap-1 px-2.5 text-xs', warning && 'text-warning')}
            >
              {t(facet.label)}
              {facet.value !== 'all' && statusCountsReady ? (
                <ChipCount value={count} />
              ) : null}
            </TabsTrigger>
          )
        })}
      </ClassificationTabs>

      {showTypeRail ? (
        <ClassificationTabs
          value={props.typeValue}
          ariaLabel={t('Type')}
          onValueChange={(value) =>
            props.onTypeChange(value === 'all' ? undefined : value)
          }
        >
          <TabsTrigger value='all' className='gap-1 px-2.5 text-xs'>
            {t('All Types')}
          </TabsTrigger>
          {typeItems.map((item) => {
            const value = String(item.type)
            return (
              <TabsTrigger
                key={value}
                value={value}
                className='gap-1 px-2.5 text-xs'
              >
                <ChannelTypeLogo type={item.type} size={14} />
                {t(getChannelTypeLabel(item.type))}
                <ChipCount value={item.count} />
              </TabsTrigger>
            )
          })}
        </ClassificationTabs>
      ) : null}

      {showTagRail ? (
        <ClassificationTabs
          value={props.tagValue}
          ariaLabel={t('Tag')}
          onValueChange={(value) =>
            props.onTagChange(value === 'all' ? undefined : value)
          }
        >
          <TabsTrigger value='all' className='gap-1 px-2.5 text-xs'>
            {t('All Tags')}
          </TabsTrigger>
          {tagItems.map((item) => (
            <TabsTrigger
              key={item.tag}
              value={item.tag}
              className='gap-1 px-2.5 text-xs'
            >
              {props.sensitiveVisible ? item.tag : SENSITIVE_MASK}
              <ChipCount value={item.count} />
            </TabsTrigger>
          ))}
          {untaggedCount > 0 || props.tagValue === UNTAGGED_TAG_FILTER ? (
            <TabsTrigger
              value={UNTAGGED_TAG_FILTER}
              className='gap-1 px-2.5 text-xs'
            >
              {t('Untagged')}
              <ChipCount value={untaggedCount} />
            </TabsTrigger>
          ) : null}
        </ClassificationTabs>
      ) : null}
    </div>
  )
}
