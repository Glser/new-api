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
import { ListOrdered, Shuffle, Tags } from 'lucide-react'
import { memo, type MouseEvent, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { GroupBadge } from '@/components/group-badge'
import { StatusBadge, StatusBadgeTypeContext } from '@/components/status-badge'
import { cn } from '@/lib/utils'

import { CHANNEL_STATUS, CHANNEL_TYPE_TASK_PLUGIN } from '../constants'
import {
  getChannelTypeLabel,
  isMultiKeyChannel,
  isTagAggregateRow,
  parseChannelSettings,
  parseGroupsList,
} from '../lib'
import type { Channel } from '../types'
import { ChannelRowActionsLayoutContext } from './channel-row-actions-context'
import { ChannelTypeLogo } from './channel-type-badge'
import { useChannels } from './channels-provider'

const SENSITIVE_MASK = '••••'

function ChannelCardLogo(props: { channel: Channel }) {
  if (isTagAggregateRow(props.channel)) {
    return (
      <Tags className='text-muted-foreground size-3.5' aria-hidden='true' />
    )
  }

  const settings = parseChannelSettings(props.channel.setting)
  const pluginKey = settings.task_plugin_key
  let plugin: { key: string } | undefined
  if (props.channel.type === CHANNEL_TYPE_TASK_PLUGIN && pluginKey) {
    plugin = { key: pluginKey }
  }

  return <ChannelTypeLogo type={props.channel.type} plugin={plugin} size={16} />
}

function statusDotClass(status: number) {
  if (status === CHANNEL_STATUS.ENABLED) return 'bg-success'
  if (status === CHANNEL_STATUS.AUTO_DISABLED) return 'bg-warning'
  if (status === CHANNEL_STATUS.MANUAL_DISABLED) {
    return 'bg-muted-foreground/70'
  }
  return 'bg-muted-foreground/40'
}

function MiniField(props: {
  label: string
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cn('min-w-0', props.className)}>
      <div className='text-muted-foreground mb-1 text-[11px] leading-none font-medium'>
        {props.label}
      </div>
      <div className='flex min-h-7 min-w-0 items-center overflow-hidden text-sm [&_:is([data-slot=badge-cell],[data-slot=status-badge])]:ml-0'>
        {props.children}
      </div>
    </div>
  )
}

function ChannelCardComponent({
  row,
  isSelected,
}: {
  row: Row<Channel>
  isSelected: boolean
}) {
  const { t } = useTranslation()
  const { sensitiveVisible } = useChannels()
  const channel = row.original
  const isTagRow = isTagAggregateRow(channel)
  const cells = row.getAllCells()

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
  const statusCell = renderCell('status')
  const actionsCell = renderCell('actions')
  const priorityCell = renderCell('priority')
  const weightCell = renderCell('weight')
  const balanceCell = renderCell('balance')
  const responseCell = renderCell('response_time')
  const testCell = renderCell('test_time')
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

  let subtitle: ReactNode = null
  if (!isTagRow) {
    subtitle = (
      <div className='text-muted-foreground mt-0.5 flex min-w-0 items-center gap-1 text-[11px] leading-none'>
        <span className='truncate tabular-nums'>
          #{sensitiveVisible ? channel.id : SENSITIVE_MASK}
          <span className='mx-1'>·</span>
          {typeName}
        </span>
        {isMultiKey ? (
          <MultiKeyModeIcon className='size-3 shrink-0' aria-hidden='true' />
        ) : null}
      </div>
    )
  }

  return (
    <ChannelRowActionsLayoutContext.Provider value='card'>
      <div
        data-state={isSelected ? 'selected' : undefined}
        className='flex min-h-0 flex-col gap-3'
      >
        <div className='flex min-w-0 items-start gap-2'>
          {!isTagRow && selectCell ? (
            <span className='mt-0.5 shrink-0'>{selectCell}</span>
          ) : null}
          <div
            className='bg-muted/40 relative mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md border'
            aria-hidden='true'
          >
            <ChannelCardLogo channel={channel} />
            {!isTagRow ? (
              <span
                className={cn(
                  'ring-background absolute -right-0.5 -bottom-0.5 size-1.5 rounded-full ring-2',
                  statusDotClass(channel.status)
                )}
              />
            ) : null}
          </div>
          <div className='min-w-0 flex-1 overflow-hidden'>
            <div className='min-w-0 overflow-hidden text-sm [&_.font-medium]:font-semibold'>
              {nameCell}
            </div>
            {subtitle}
          </div>
          <div className='-mt-1 -mr-1.5 flex shrink-0 items-center gap-0.5'>
            {showStatusBadge ? statusCell : null}
            {actionsCell}
          </div>
        </div>

        <StatusBadgeTypeContext.Provider value='text'>
          <div className='bg-muted/40 grid grid-cols-2 gap-x-4 gap-y-2.5 rounded-lg px-3 py-2.5'>
            <MiniField label={t('Priority')}>
              {priorityCell ?? emptyValue}
            </MiniField>
            <MiniField label={t('Weight')}>
              {weightCell ?? emptyValue}
            </MiniField>
            <MiniField className='col-span-2' label={t('Used / Remaining')}>
              {balanceCell ?? emptyValue}
            </MiniField>
            <MiniField label={t('Response')}>
              {responseCell ?? emptyValue}
            </MiniField>
            <MiniField label={t('Last Tested')}>
              {testCell ?? emptyValue}
            </MiniField>
          </div>
        </StatusBadgeTypeContext.Provider>

        {hasRouting && !isTagRow ? (
          <div className='mt-auto -ml-1.5 flex flex-wrap gap-1'>
            {channel.tag ? (
              <StatusBadge
                label={sensitiveVisible ? channel.tag : SENSITIVE_MASK}
                autoColor={channel.tag}
                size='sm'
                copyable={false}
                className='cursor-pointer'
                onClick={(event: MouseEvent) => {
                  event.stopPropagation()
                  const table = row.getAllCells()[0]?.getContext().table
                  table?.getColumn('tag')?.setFilterValue([channel.tag])
                }}
              />
            ) : null}
            {groups.map((group) => (
              <GroupBadge
                key={group}
                group={group}
                label={sensitiveVisible ? undefined : SENSITIVE_MASK}
                size='sm'
              />
            ))}
          </div>
        ) : null}
      </div>
    </ChannelRowActionsLayoutContext.Provider>
  )
}

export const ChannelCard = memo(ChannelCardComponent)
