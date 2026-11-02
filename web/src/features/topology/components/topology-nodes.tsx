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
import { Trash2 } from 'lucide-react'
import {
  createContext,
  memo,
  useContext,
  type CSSProperties,
  type ReactNode,
} from 'react'
import { useTranslation } from 'react-i18next'

import { GroupMultiplierBadge } from '@/components/group-badge'
import { Button } from '@/components/ui/button'
import { ChannelCard } from '@/features/channels/components/channel-card'
import { CHANNEL_STATUS } from '@/features/channels/constants'
import { getLobeIcon } from '@/lib/lobe-icon'
import { cn } from '@/lib/utils'

import { useFlashingIds } from '../hooks/use-topology-traffic'
import { topologyColorAlpha } from '../lib/colors'
import type {
  TopologyChannelData,
  TopologyClusterData,
  TopologyGroupData,
  TopologyModelData,
} from '../types'
import { TopologyModelPricing } from './topology-model-pricing'

type TopologyNodeActions = {
  canWrite: boolean
  onStatusChanged: (channelId: number, status: number) => void
  onDeleteGroup: (name: string) => void
  onDeleteModel: (name: string) => void
  onDeleteCluster: (clusterId: string) => void
}

const TopologyNodeActionsContext = createContext<TopologyNodeActions | null>(
  null
)

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

function useTopologyNodeActions() {
  return useContext(TopologyNodeActionsContext)
}

function areNodeVisualPropsEqual<T>(
  prev: NodeProps & { data: T },
  next: NodeProps & { data: T }
) {
  return (
    prev.id === next.id &&
    prev.selected === next.selected &&
    prev.data === next.data
  )
}

function handleStyle(
  color: string,
  placement: 'top' | 'bottom'
): CSSProperties {
  return {
    background: color,
    borderColor: 'var(--background)',
    width: 12,
    height: 12,
    borderWidth: 2,
    zIndex: 30,
    ...(placement === 'top' ? { top: 0 } : { bottom: 0 }),
  }
}

function NodeDeleteButton(props: { onDelete: () => void }) {
  const { t } = useTranslation()
  const canWrite = useTopologyNodeActions()?.canWrite
  if (!canWrite) return null
  return (
    <Button
      type='button'
      variant='ghost'
      size='icon'
      data-topology-action='delete'
      className='nodrag nopan text-muted-foreground hover:text-destructive size-7'
      aria-label={t('Delete')}
      onClick={(event) => {
        event.stopPropagation()
        props.onDelete()
      }}
    >
      <Trash2 className='size-3.5' />
    </Button>
  )
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
        'bg-card relative w-full overflow-visible rounded-3xl border px-5 py-3.5',
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

function TopologyGroupNodeComponent(
  props: NodeProps & { data: TopologyGroupData }
) {
  const { t } = useTranslation()
  const actions = useTopologyNodeActions()
  const color = props.data.color
  const ratio = props.data.ratio
  return (
    <FlowCard nodeId={props.id} selected={props.selected} color={color}>
      <Handle
        id='out'
        type='source'
        position={Position.Bottom}
        style={handleStyle(color, 'bottom')}
      />
      <div className='flex items-start gap-3.5'>
        <span
          className='mt-2 size-3.5 shrink-0 rounded-full'
          style={{ background: color }}
        />
        <div className='min-w-0 flex-1'>
          <div className='flex items-center justify-between gap-2'>
            <div className='truncate text-lg leading-7 font-semibold'>
              {props.data.name}
            </div>
            <div className='flex items-center gap-1'>
              <GroupMultiplierBadge
                ratio={ratio ?? 1}
                className='h-7 min-w-16 px-2.5 text-sm'
              />
              <NodeDeleteButton
                onDelete={() => actions?.onDeleteGroup(props.data.name)}
              />
            </div>
          </div>
          <div className='text-muted-foreground mt-1 truncate text-sm'>
            {props.data.channelCount} {t('Channels')}
            <span className='mx-1'>·</span>
            {props.data.modelCount} {t('Models')}
          </div>
        </div>
      </div>
    </FlowCard>
  )
}

export const TopologyGroupNode = memo(
  TopologyGroupNodeComponent,
  areNodeVisualPropsEqual
)

function TopologyChannelNodeComponent(
  props: NodeProps & { data: TopologyChannelData }
) {
  const actions = useTopologyNodeActions()
  const color = props.data.color
  const flashing = useFlashingIds().has(props.id)
  const disabled = props.data.channel.status !== CHANNEL_STATUS.ENABLED
  return (
    <div
      className={cn('relative w-full', flashing && 'topology-flash-card')}
      style={
        { '--topology-flash': topologyColorAlpha(color, 0.55) } as CSSProperties
      }
    >
      <Handle
        id='in-group'
        type='target'
        position={Position.Top}
        style={handleStyle(color, 'top')}
      />
      <Handle
        id='out-model'
        type='source'
        position={Position.Bottom}
        style={handleStyle(color, 'bottom')}
      />
      <div className={cn(disabled && 'opacity-80')}>
        <ChannelCard
          channel={props.data.channel}
          isSelected={props.selected}
          onStatusChanged={(status) =>
            actions?.onStatusChanged(props.data.channelId, status)
          }
        />
      </div>
    </div>
  )
}

export const TopologyChannelNode = memo(
  TopologyChannelNodeComponent,
  areNodeVisualPropsEqual
)

function TopologyModelNodeComponent(
  props: NodeProps & { data: TopologyModelData }
) {
  const { t } = useTranslation()
  const actions = useTopologyNodeActions()
  const color = props.data.color
  const iconKey = props.data.icon || props.data.vendorIcon
  const icon = iconKey ? getLobeIcon(iconKey, 28) : null

  return (
    <FlowCard nodeId={props.id} selected={props.selected} color={color}>
      <Handle
        id='in'
        type='target'
        position={Position.Top}
        style={handleStyle(color, 'top')}
      />
      <div className='flex items-center gap-3.5'>
        <div className='bg-background/70 flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-xl'>
          {icon ?? (
            <span className='text-muted-foreground text-sm font-semibold'>
              {props.data.name.charAt(0).toUpperCase()}
            </span>
          )}
        </div>
        <div className='min-w-0 flex-1'>
          <div className='flex items-start justify-between gap-2'>
            <div className='truncate text-lg leading-7 font-semibold'>
              {props.data.name}
            </div>
            <NodeDeleteButton
              onDelete={() => actions?.onDeleteModel(props.data.name)}
            />
          </div>
          {!props.data.pricing && (
            <div className='text-muted-foreground mt-1 text-sm'>
              {t('Channel-only model')}
            </div>
          )}
        </div>
      </div>
      {props.data.pricing && (
        <div className='mt-3 border-t pt-3'>
          <TopologyModelPricing model={props.data.pricing} />
        </div>
      )}
    </FlowCard>
  )
}

export const TopologyModelNode = memo(
  TopologyModelNodeComponent,
  areNodeVisualPropsEqual
)

function TopologyClusterNodeComponent(
  props: NodeProps & { data: TopologyClusterData }
) {
  const { t } = useTranslation()
  const actions = useTopologyNodeActions()
  return (
    <div
      className='pointer-events-none h-full w-full rounded-3xl border border-dashed bg-transparent px-4 py-3'
      style={{ borderColor: topologyColorAlpha(props.data.color, 0.4) }}
    >
      <div className='topology-cluster-handle pointer-events-auto flex cursor-grab items-center justify-between gap-2'>
        <div className='truncate text-sm font-medium'>{props.data.name}</div>
        <NodeDeleteButton
          onDelete={() => actions?.onDeleteCluster(props.id)}
        />
      </div>
      <div className='text-muted-foreground mt-1 text-xs'>
        {t('{{count}} cards', { count: props.data.memberIds.length })}
      </div>
    </div>
  )
}

export const TopologyClusterNode = memo(
  TopologyClusterNodeComponent,
  areNodeVisualPropsEqual
)
