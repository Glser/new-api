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

import { Handle, Position, type NodeProps } from '@xyflow/react'
import { Gauge, Loader2, Power, PowerOff } from 'lucide-react'
import {
  createContext,
  memo,
  useContext,
  type CSSProperties,
  type MouseEvent,
  type ReactNode,
} from 'react'
import { useTranslation } from 'react-i18next'

import { GroupMultiplierBadge } from '@/components/group-badge'
import { Button } from '@/components/ui/button'
import { TooltipHint } from '@/components/ui/tooltip'
import { ChannelTypeLogo } from '@/features/channels/components/channel-type-badge'
import {
  CHANNEL_STATUS,
  CHANNEL_STATUS_CONFIG,
} from '@/features/channels/constants'
import {
  formatResponseTime,
  getChannelTypeLabel,
  getResponseTimeConfig,
} from '@/features/channels/lib/channel-utils'
import { formatQuotaWithCurrency } from '@/lib/currency'
import { getLobeIcon } from '@/lib/lobe-icon'
import { cn } from '@/lib/utils'

import { useFlashingIds } from '../hooks/use-topology-traffic'
import { topologyColorAlpha } from '../lib/colors'
import type {
  TopologyChannelData,
  TopologyGroupData,
  TopologyModelData,
} from '../types'

export type TopologyNodeActions = {
  canOperate: boolean
  togglingId?: number
  onToggleChannel: (channelId: number) => void
  onTestChannel: (channelId: number) => void
}

const TopologyNodeActionsContext = createContext<TopologyNodeActions>({
  canOperate: false,
  onToggleChannel: () => undefined,
  onTestChannel: () => undefined,
})

export function TopologyNodeActionsProvider(props: {
  value: TopologyNodeActions
  children: ReactNode
}) {
  return (
    <TopologyNodeActionsContext.Provider value={props.value}>
      {props.children}
    </TopologyNodeActionsContext.Provider>
  )
}

function stopCardEvent(event: MouseEvent) {
  event.preventDefault()
  event.stopPropagation()
}

function handleStyle(color: string): CSSProperties {
  return {
    background: color,
    borderColor: 'var(--background)',
    width: 10,
    height: 10,
    borderWidth: 2,
  }
}

function FlowCard(props: {
  nodeId: string
  selected?: boolean
  color: string
  disabled?: boolean
  children: ReactNode
}) {
  const flashing = useFlashingIds().has(props.nodeId)
  return (
    <div
      className={cn(
        'bg-card w-full rounded-2xl border px-3 py-2.5',
        'shadow-[0_1px_2px_rgba(15,23,42,0.06),0_8px_20px_-12px_rgba(15,23,42,0.18)]',
        'dark:shadow-[0_8px_24px_-12px_rgba(0,0,0,0.55)]',
        props.selected ? 'border-transparent' : 'border-border',
        props.disabled && 'opacity-70',
        flashing && 'topology-flash-card'
      )}
      style={
        {
          '--topology-flash': topologyColorAlpha(props.color, 0.55),
          ...(props.selected
            ? {
                borderColor: topologyColorAlpha(props.color, 0.45),
                boxShadow: `0 0 0 3px ${topologyColorAlpha(props.color, 0.12)}`,
              }
            : {}),
        } as CSSProperties
      }
    >
      {props.children}
    </div>
  )
}

export const TopologyGroupNode = memo(function TopologyGroupNode(
  props: NodeProps & { data: TopologyGroupData }
) {
  const { t } = useTranslation()
  const color = props.data.color
  const ratio = props.data.ratio
  return (
    <FlowCard nodeId={props.id} selected={props.selected} color={color}>
      <Handle
        id='out'
        type='source'
        position={Position.Right}
        style={handleStyle(color)}
      />
      <div className='flex items-start gap-2.5'>
        <span
          className='mt-1.5 size-2.5 shrink-0 rounded-full'
          style={{ background: color }}
        />
        <div className='min-w-0 flex-1'>
          <div className='flex items-center justify-between gap-2'>
            <div className='truncate text-sm font-semibold'>
              {props.data.name}
            </div>
            <GroupMultiplierBadge ratio={ratio ?? 1} />
          </div>
          <div className='text-muted-foreground mt-0.5 truncate text-[11px]'>
            {props.data.channelCount} {t('Channels')}
            <span className='mx-1'>·</span>
            {props.data.modelCount} {t('Models')}
          </div>
        </div>
      </div>
    </FlowCard>
  )
})

export const TopologyChannelNode = memo(function TopologyChannelNode(
  props: NodeProps & { data: TopologyChannelData }
) {
  const { t } = useTranslation()
  const actions = useContext(TopologyNodeActionsContext)
  const enabled = props.data.status === CHANNEL_STATUS.ENABLED
  const toggling = actions.togglingId === props.data.channelId
  const color = props.data.color
  const statusLabel = t(
    CHANNEL_STATUS_CONFIG[
      props.data.status as keyof typeof CHANNEL_STATUS_CONFIG
    ]?.label ?? 'Unknown'
  )
  const response = getResponseTimeConfig(props.data.responseTime)
  let statusDot = 'bg-muted-foreground/40'
  if (props.data.status === CHANNEL_STATUS.ENABLED) statusDot = 'bg-success'
  else if (props.data.status === CHANNEL_STATUS.AUTO_DISABLED) {
    statusDot = 'bg-warning'
  } else if (props.data.status === CHANNEL_STATUS.MANUAL_DISABLED) {
    statusDot = 'bg-muted-foreground/70'
  }
  let statusIcon = <Power className='size-3.5' />
  if (toggling) statusIcon = <Loader2 className='size-3.5 animate-spin' />
  else if (enabled) statusIcon = <PowerOff className='size-3.5' />

  return (
    <FlowCard
      nodeId={props.id}
      selected={props.selected}
      color={color}
      disabled={!enabled}
    >
      <Handle
        id='in-group'
        type='target'
        position={Position.Left}
        style={handleStyle(color)}
      />
      <Handle
        id='out-model'
        type='source'
        position={Position.Right}
        style={handleStyle(color)}
      />
      <div className='flex items-start gap-2.5'>
        <div className='mt-0.5 flex size-7 shrink-0 items-center justify-center'>
          <ChannelTypeLogo
            type={props.data.type}
            plugin={
              props.data.pluginKey ? { key: props.data.pluginKey } : undefined
            }
            size={18}
          />
        </div>
        <div className='min-w-0 flex-1'>
          <div className='flex items-center justify-between gap-2'>
            <div className='truncate text-sm font-semibold'>
              {props.data.name}
            </div>
            <div className='text-muted-foreground flex shrink-0 items-center gap-1 text-[11px]'>
              <span className={cn('size-1.5 rounded-full', statusDot)} />
              {statusLabel}
            </div>
          </div>
          <div className='text-muted-foreground mt-0.5 truncate text-[11px]'>
            {t(getChannelTypeLabel(props.data.type))}
            <span className='mx-1'>·</span>
            {t('Used')}{' '}
            {formatQuotaWithCurrency(props.data.usedQuota, {
              digitsLarge: 1,
              digitsSmall: 1,
              abbreviate: true,
            })}
            <span className='mx-1'>·</span>
            <span
              className={cn(
                response.variant === 'success' && 'text-success',
                response.variant === 'warning' && 'text-warning',
                response.variant === 'danger' && 'text-destructive'
              )}
            >
              {formatResponseTime(props.data.responseTime, t)}
            </span>
          </div>
        </div>
        {actions.canOperate ? (
          <div
            data-topology-action='true'
            className='nodrag nopan -mr-1 flex shrink-0 items-center'
            onClick={stopCardEvent}
            onMouseDown={stopCardEvent}
          >
            <TooltipHint content={t('Test Connection')}>
              <Button
                type='button'
                variant='ghost'
                size='icon-sm'
                className='size-7'
                onClick={() => actions.onTestChannel(props.data.channelId)}
                aria-label={t('Test Connection')}
              >
                <Gauge className='size-3.5' />
              </Button>
            </TooltipHint>
            <TooltipHint content={enabled ? t('Disable') : t('Enable')}>
              <Button
                type='button'
                variant='ghost'
                size='icon-sm'
                className={cn(
                  'size-7',
                  enabled
                    ? 'text-destructive hover:text-destructive'
                    : 'text-success hover:text-success'
                )}
                disabled={toggling}
                onClick={() => actions.onToggleChannel(props.data.channelId)}
                aria-label={enabled ? t('Disable') : t('Enable')}
              >
                {statusIcon}
              </Button>
            </TooltipHint>
          </div>
        ) : null}
      </div>
    </FlowCard>
  )
})

export const TopologyModelNode = memo(function TopologyModelNode(
  props: NodeProps & { data: TopologyModelData }
) {
  const { t } = useTranslation()
  const color = props.data.color
  const iconKey = props.data.icon || props.data.vendorIcon
  const icon = iconKey ? getLobeIcon(iconKey, 18) : null
  let unitLabel = props.data.priceUnit
  if (props.data.priceUnit === 'per-call') unitLabel = t('Per-call')
  let priceHint: string | undefined
  if (props.data.priceUnit === '/1M') {
    priceHint = `${t('Input')} / ${t('Output')} /1M`
  } else if (unitLabel) {
    priceHint = unitLabel
  }

  return (
    <FlowCard nodeId={props.id} selected={props.selected} color={color}>
      <Handle
        id='in'
        type='target'
        position={Position.Left}
        style={handleStyle(color)}
      />
      <div className='flex items-start gap-2.5'>
        <div className='bg-background/70 flex size-7 shrink-0 items-center justify-center overflow-hidden rounded-lg'>
          {icon ?? (
            <span className='text-muted-foreground text-xs font-semibold'>
              {props.data.name.charAt(0).toUpperCase()}
            </span>
          )}
        </div>
        <div className='min-w-0 flex-1'>
          <div className='truncate text-sm font-semibold'>
            {props.data.name}
          </div>
          {props.data.priceText ? (
            <div className='text-muted-foreground mt-0.5 truncate text-[11px]'>
              <span className='text-foreground font-medium tabular-nums'>
                {props.data.priceText}
              </span>
              {priceHint ? (
                <span className='ml-1 opacity-70'>{priceHint}</span>
              ) : null}
            </div>
          ) : (
            <div className='text-muted-foreground mt-0.5 text-[11px]'>
              {t('Channel-only model')}
            </div>
          )}
        </div>
      </div>
    </FlowCard>
  )
})
