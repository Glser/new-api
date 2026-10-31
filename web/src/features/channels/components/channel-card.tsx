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
import { flexRender, type Row } from '@tanstack/react-table'
import {
  AlertTriangle,
  ListOrdered,
  Shuffle,
  SlidersHorizontal,
  Tags,
} from 'lucide-react'
import { memo, useLayoutEffect, useRef, useState, type MouseEvent } from 'react'
import { useTranslation } from 'react-i18next'

import { GroupBadge } from '@/components/group-badge'
import { StatusBadge } from '@/components/status-badge'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { TooltipHint } from '@/components/ui/tooltip'
import { toIntlLocale } from '@/i18n/languages'
import { formatTimestampToDate } from '@/lib/format'
import { cn } from '@/lib/utils'

import {
  CHANNEL_STATUS,
  CHANNEL_STATUS_CONFIG,
  CHANNEL_TYPE_TASK_PLUGIN,
} from '../constants'
import {
  formatRelativeTime,
  formatResponseTime,
  getChannelTypeLabel,
  getResponseTimeConfig,
  isMultiKeyChannel,
  isTagAggregateRow,
  parseChannelSettings,
  parseGroupsList,
} from '../lib'
import type { Channel } from '../types'
import {
  ChannelRowActionsLayoutContext,
  ChannelRowActionsSlotContext,
} from './channel-row-actions-context'
import { ChannelTypeLogo } from './channel-type-badge'
import {
  BalanceCell,
  PriorityCell,
  UpstreamUpdateTags,
  WeightCell,
} from './channels-columns'
import { useChannels } from './channels-provider'
import { DataTableRowActions } from './data-table-row-actions'

const SENSITIVE_MASK = '••••'

const PLAZA_CARD_HOVER =
  'transition-[translate,box-shadow] duration-500 group-hover/channel-card:-translate-y-1 group-hover/channel-card:shadow-[0_1px_2px_rgba(15,23,42,0.05),0_16px_36px_-24px_rgba(15,23,42,0.22)] dark:group-hover/channel-card:shadow-[0_18px_50px_-24px_rgba(0,0,0,0.6)]'

function ChannelCardLogo(props: { channel: Channel }) {
  if (isTagAggregateRow(props.channel)) {
    return <Tags className='text-muted-foreground size-6' aria-hidden='true' />
  }

  const settings = parseChannelSettings(props.channel.setting)
  const pluginKey = settings.task_plugin_key
  let plugin: { key: string } | undefined
  if (props.channel.type === CHANNEL_TYPE_TASK_PLUGIN && pluginKey) {
    plugin = { key: pluginKey }
  }

  return <ChannelTypeLogo type={props.channel.type} plugin={plugin} size={20} />
}

function responseToneClass(variant: string) {
  if (variant === 'success') {
    return 'text-success'
  }
  if (variant === 'warning') {
    return 'text-warning'
  }
  if (variant === 'danger') {
    return 'text-destructive'
  }
  return 'text-muted-foreground'
}

const GROUP_CHIP_CLASS =
  'h-6 max-w-24 shrink-0 truncate px-2 text-xs leading-tight font-medium'

function ChannelCardGroups(props: { groups: string[]; masked: boolean }) {
  const { t } = useTranslation()
  const containerRef = useRef<HTMLDivElement>(null)
  const measureRef = useRef<HTMLDivElement>(null)
  const extraRef = useRef<HTMLSpanElement>(null)
  const [visibleCount, setVisibleCount] = useState(() =>
    Math.min(1, props.groups.length)
  )
  const groupsKey = props.groups.join('\u0000')
  const labels = props.groups.map((group) =>
    props.masked ? SENSITIVE_MASK : group
  )

  useLayoutEffect(() => {
    const container = containerRef.current
    const measure = measureRef.current
    if (!container || !measure) {
      return
    }

    const update = () => {
      const available = container.clientWidth
      if (available <= 0) {
        return
      }
      const chips = [
        ...measure.querySelectorAll<HTMLElement>('[data-group-chip]'),
      ]
      const extraWidth = extraRef.current?.offsetWidth ?? 0
      const gap = 4
      let used = 0
      let count = 0
      for (let index = 0; index < chips.length; index += 1) {
        const width = chips[index].offsetWidth
        const remaining = chips.length - index - 1
        const reserved = remaining > 0 ? extraWidth + gap : 0
        const nextUsed = used + (count === 0 ? 0 : gap) + width
        if (count > 0 && nextUsed + reserved > available) {
          break
        }
        used = nextUsed
        count += 1
      }
      const nextCount = chips.length === 0 ? 0 : Math.max(count, 1)
      setVisibleCount((current) =>
        current === nextCount ? current : nextCount
      )
    }

    update()
    const observer = new ResizeObserver(update)
    observer.observe(container)
    return () => observer.disconnect()
  }, [groupsKey, props.groups, props.masked])

  if (props.groups.length === 0) {
    return null
  }

  const visibleGroups = props.groups.slice(0, visibleCount)
  const hiddenGroups = props.groups.slice(visibleCount)

  return (
    <div ref={containerRef} className='relative min-w-0 flex-1 overflow-hidden'>
      <div
        ref={measureRef}
        aria-hidden='true'
        className='pointer-events-none absolute flex w-max items-center gap-1 opacity-0'
      >
        {props.groups.map((group, index) => (
          <span key={group} data-group-chip>
            <GroupBadge
              group={group}
              label={labels[index]}
              size='sm'
              copyable={false}
              className={GROUP_CHIP_CLASS}
            />
          </span>
        ))}
        <span
          ref={extraRef}
          className='bg-muted/70 text-muted-foreground h-6 shrink-0 rounded-md px-2 text-xs leading-6 font-medium tabular-nums'
        >
          +99
        </span>
      </div>
      <div className='flex min-w-0 flex-nowrap items-center gap-1 overflow-hidden'>
        {visibleGroups.map((group, index) => (
          <GroupBadge
            key={group}
            group={group}
            label={labels[index]}
            size='sm'
            copyable={false}
            className={GROUP_CHIP_CLASS}
          />
        ))}
        {hiddenGroups.length > 0 ? (
          <TooltipHint
            content={`${t('Available groups')}: ${labels.join(', ')}`}
          >
            <span className='bg-muted/70 text-muted-foreground h-6 shrink-0 rounded-md px-2 text-xs leading-6 font-medium tabular-nums'>
              +{hiddenGroups.length}
            </span>
          </TooltipHint>
        ) : null}
      </div>
    </div>
  )
}

function ChannelCardStatus(props: { channel: Channel }) {
  const { t } = useTranslation()
  const status = props.channel.status
  const config =
    CHANNEL_STATUS_CONFIG[status as keyof typeof CHANNEL_STATUS_CONFIG] ||
    CHANNEL_STATUS_CONFIG[0]
  return (
    <StatusBadge
      label={t(config.label)}
      variant={config.variant}
      size='sm'
      copyable={false}
    />
  )
}

function ChannelCardComponent({
  row,
  channel: channelProp,
  isSelected = false,
}: {
  row?: Row<Channel>
  channel?: Channel
  isSelected?: boolean
}) {
  const { t, i18n } = useTranslation()
  const { sensitiveVisible } = useChannels()
  const channel = row?.original ?? channelProp
  if (!channel) return null
  const isTagRow = isTagAggregateRow(channel)
  const cells = row?.getAllCells() ?? []
  const renderCell = (id: string) => {
    const cell = cells.find((c) => c.column.id === id)
    if (!cell || !cell.column.columnDef.cell) {
      return null
    }
    return flexRender(cell.column.columnDef.cell, cell.getContext())
  }

  const groups = parseGroupsList(channel.group ?? '')
  const selectCell = renderCell('select')
  const nameCell = renderCell('name')
  const actionsFromRow = renderCell('actions')
  const actionsCell = actionsFromRow ?? (
    <DataTableRowActions channel={channel} />
  )
  const statusCell = renderCell('status') ?? (
    <ChannelCardStatus channel={channel} />
  )
  const priorityCell = renderCell('priority') ?? (
    <PriorityCell channel={channel} />
  )
  const weightCell = renderCell('weight') ?? <WeightCell channel={channel} />
  const balanceCell = renderCell('balance') ?? <BalanceCell channel={channel} />
  const emptyValue = <span className='text-muted-foreground'>-</span>
  const typeName = t(getChannelTypeLabel(channel.type))
  const isMultiKey = !isTagRow && isMultiKeyChannel(channel)
  const multiKeyMode = channel.channel_info?.multi_key_mode ?? 'random'
  const MultiKeyModeIcon = multiKeyMode === 'random' ? Shuffle : ListOrdered
  const showStatusBadge =
    isTagRow ||
    (channel.status !== CHANNEL_STATUS.ENABLED &&
      channel.status !== CHANNEL_STATUS.MANUAL_DISABLED)
  const hasRouting = Boolean(channel.tag || groups.length > 0)
  const settings = parseChannelSettings(channel.setting)
  const isPassThrough = settings.pass_through_body_enabled === true
  const hasParamOverride = Boolean(channel.param_override?.trim())
  const locale = toIntlLocale(i18n.resolvedLanguage || i18n.language)
  const responseTime = channel.response_time ?? 0
  const responseConfig = getResponseTimeConfig(responseTime)
  const testTime = channel.test_time ?? 0
  const testedLabel =
    !testTime || testTime === 0
      ? t('Never')
      : formatRelativeTime(testTime, locale)
  const testedFullDate =
    !testTime || testTime === 0 ? undefined : formatTimestampToDate(testTime)
  const displayName = sensitiveVisible ? channel.name : SENSITIVE_MASK
  const remark = channel.remark?.trim()
  const menuActions = (
    <ChannelRowActionsSlotContext.Provider value='menu'>
      {actionsCell}
    </ChannelRowActionsSlotContext.Provider>
  )
  const toggleActions = (
    <ChannelRowActionsSlotContext.Provider value='toggle'>
      {actionsCell}
    </ChannelRowActionsSlotContext.Provider>
  )
  const testActions = (
    <ChannelRowActionsSlotContext.Provider value='test'>
      {actionsCell}
    </ChannelRowActionsSlotContext.Provider>
  )

  return (
    <ChannelRowActionsLayoutContext.Provider value='card'>
      <Card
        data-card-hover='false'
        data-state={isSelected ? 'selected' : undefined}
        size='sm'
        className={cn(
          'min-w-0 gap-3.5 bg-(--data-table-card-bg,var(--card)) py-3.5 ring-inset',
          PLAZA_CARD_HOVER,
          isSelected && 'ring-primary/40'
        )}
      >
        <CardHeader className='flex flex-row items-center gap-3 px-4'>
          {!isTagRow && selectCell ? (
            <span className='shrink-0'>{selectCell}</span>
          ) : null}
          {isTagRow ? (
            <div
              className='flex size-8 shrink-0 items-center justify-center'
              aria-hidden='true'
            >
              <ChannelCardLogo channel={channel} />
            </div>
          ) : (
            <TooltipHint content={typeName}>
              <div className='flex size-8 shrink-0 items-center justify-center'>
                <ChannelCardLogo channel={channel} />
              </div>
            </TooltipHint>
          )}
          <div className='min-w-0 flex-1 overflow-hidden'>
            {isTagRow ? (
              <div className='min-w-0 overflow-hidden text-base leading-snug [&_.font-medium]:font-semibold [&_.font-semibold]:text-base'>
                {nameCell}
              </div>
            ) : (
              <div className='flex min-w-0 items-center gap-1.5'>
                <TooltipHint content={displayName}>
                  <span className='min-w-0 truncate py-px text-base leading-snug font-semibold'>
                    {displayName}
                  </span>
                </TooltipHint>
                <span className='text-muted-foreground shrink-0 font-mono text-xs leading-none tabular-nums'>
                  #{sensitiveVisible ? channel.id : SENSITIVE_MASK}
                </span>
                {isMultiKey ? (
                  <TooltipHint
                    content={
                      multiKeyMode === 'random'
                        ? t('Multi-key: Random rotation')
                        : t('Multi-key: Polling rotation')
                    }
                  >
                    <MultiKeyModeIcon
                      className='text-muted-foreground size-3.5 shrink-0'
                      aria-hidden='true'
                    />
                  </TooltipHint>
                ) : null}
                {isPassThrough ? (
                  <TooltipHint
                    content={t(
                      'Request body pass-through is enabled. The request body will be sent directly to the upstream without any conversion.'
                    )}
                  >
                    <AlertTriangle
                      className='text-warning size-4 shrink-0'
                      aria-hidden='true'
                    />
                  </TooltipHint>
                ) : null}
                {hasParamOverride ? (
                  <TooltipHint content={t('Override request parameters')}>
                    <SlidersHorizontal
                      className='text-info size-4 shrink-0'
                      aria-hidden='true'
                    />
                  </TooltipHint>
                ) : null}
                <UpstreamUpdateTags channel={channel} />
              </div>
            )}
          </div>
          <div className='-mr-1 flex shrink-0 items-center gap-0.5'>
            {showStatusBadge ? statusCell : null}
            {!isTagRow ? toggleActions : null}
            {isTagRow ? actionsCell : menuActions}
          </div>
        </CardHeader>

        <CardContent className='flex flex-col gap-3 px-4'>
          {!isTagRow ? (
            <p className='text-muted-foreground line-clamp-2 min-h-5 text-sm leading-5 break-words'>
              {remark || ' '}
            </p>
          ) : null}

          <div className='flex min-w-0 items-center justify-between gap-3'>
            <div className='flex min-w-0 items-center gap-1.5'>
              {isTagRow ? (
                <div className='min-w-0 flex-1 overflow-hidden'>
                  {balanceCell}
                </div>
              ) : (
                <>
                  {testActions}
                  <TooltipHint content={testedFullDate ?? testedLabel}>
                    <span
                      className={cn(
                        'font-mono text-sm font-medium tabular-nums',
                        responseToneClass(responseConfig.variant)
                      )}
                    >
                      {formatResponseTime(responseTime, t)}
                    </span>
                  </TooltipHint>
                </>
              )}
            </div>
            <div className='flex shrink-0 items-center'>
              {priorityCell ?? emptyValue}
            </div>
          </div>

          <div className='flex min-w-0 items-center justify-between gap-3'>
            <div className='min-w-0 flex-1 overflow-hidden'>
              {isTagRow ? null : balanceCell}
            </div>
            <div className='flex shrink-0 items-center'>
              {weightCell ?? emptyValue}
            </div>
          </div>

          {hasRouting && !isTagRow ? (
            <div className='flex min-w-0 items-center gap-1.5 overflow-hidden'>
              {channel.tag ? (
                <StatusBadge
                  label={sensitiveVisible ? channel.tag : SENSITIVE_MASK}
                  autoColor={channel.tag}
                  size='sm'
                  copyable={false}
                  className='h-6 max-w-28 shrink-0 cursor-pointer px-2 text-xs leading-tight'
                  onClick={(event: MouseEvent) => {
                    event.stopPropagation()
                    const table = row?.getAllCells()[0]?.getContext().table
                    table?.getColumn('tag')?.setFilterValue([channel.tag])
                  }}
                />
              ) : null}
              <ChannelCardGroups groups={groups} masked={!sensitiveVisible} />
            </div>
          ) : null}
        </CardContent>
      </Card>
    </ChannelRowActionsLayoutContext.Provider>
  )
}

export const ChannelCard = memo(ChannelCardComponent)
