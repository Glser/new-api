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

import { useNavigate } from '@tanstack/react-router'
import {
  Activity,
  ArrowUpRight,
  Box,
  Cable,
  Compass,
  Radio,
  RefreshCw,
  Search,
  Share2,
  Table2,
  Users,
  Workflow,
} from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { TooltipHint } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

import type { TopologyFilters } from '../types'

const dockClass =
  'pointer-events-auto flex items-center gap-0 rounded-xl border border-border/70 bg-background/90 p-0.5 shadow-[0_8px_24px_rgba(0,0,0,0.1)] backdrop-blur-xl dark:shadow-[0_12px_28px_rgba(0,0,0,0.4)]'

function OverlayIconButton(props: {
  label: string
  onClick?: () => void
  disabled?: boolean
  active?: boolean
  children: ReactNode
}) {
  return (
    <TooltipHint content={props.label}>
      <Button
        type='button'
        variant='ghost'
        size='icon'
        disabled={props.disabled}
        onClick={props.onClick}
        aria-label={props.label}
        className={cn(
          'size-8 rounded-lg',
          props.active
            ? 'bg-white text-foreground shadow-sm ring-1 ring-black/10 hover:bg-white hover:text-foreground dark:bg-white/20 dark:ring-white/20 dark:hover:bg-white/25'
            : 'hover:bg-muted'
        )}
      >
        {props.children}
      </Button>
    </TooltipHint>
  )
}

export function TopologyOverlays(props: {
  search: string
  onSearchChange: (value: string) => void
  filters: TopologyFilters
  onFiltersChange: (filters: TopologyFilters) => void
  groups: string[]
  stats: {
    groups: number
    channels: number
    models: number
    connections: number
  }
  truncated?: boolean
  shownModels?: number
  totalModels?: number
  loading?: boolean
  refreshing?: boolean
  canWrite: boolean
  showMiniMap: boolean
  onToggleMiniMap: () => void
  liveTraffic: boolean
  onToggleLiveTraffic: () => void
  onRefresh: () => void
  onRelayout: () => void
  onCreateChannel: () => void
  onCreateModel: () => void
}) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [filterOpen, setFilterOpen] = useState(false)
  const hasFilters = Boolean(
    props.search.trim() || props.filters.group || props.filters.status
  )

  return (
    <div className='pointer-events-none absolute inset-0 z-20'>
      {props.truncated ? (
        <div className='absolute top-3 left-1/2 max-w-sm -translate-x-1/2'>
          <div
            className={cn(
              dockClass,
              'text-muted-foreground px-3 py-1.5 text-[11px] leading-4'
            )}
          >
            {t(
              'Showing {{shown}} of {{total}} models. Select a channel or search to see more.',
              {
                shown: props.shownModels,
                total: props.totalModels,
              }
            )}
          </div>
        </div>
      ) : null}

      <div className='absolute bottom-4 left-1/2 -translate-x-1/2'>
        <div className={dockClass}>
          <SearchPopover
            open={filterOpen}
            onOpenChange={setFilterOpen}
            hasFilters={hasFilters}
            search={props.search}
            onSearchChange={props.onSearchChange}
            filters={props.filters}
            onFiltersChange={props.onFiltersChange}
            groups={props.groups}
          />
          {props.canWrite ? (
            <>
              <OverlayIconButton
                label={t('Create Channel')}
                onClick={props.onCreateChannel}
              >
                <Cable className='size-4' />
              </OverlayIconButton>
              <OverlayIconButton
                label={t('Create Model')}
                onClick={props.onCreateModel}
              >
                <Box className='size-4' />
              </OverlayIconButton>
            </>
          ) : null}
          <StatsPopover stats={props.stats} loading={props.loading} />
          <OverlayIconButton label={t('Rearrange')} onClick={props.onRelayout}>
            <Workflow className='size-4' />
          </OverlayIconButton>
          <OverlayIconButton
            label={t('Refresh')}
            disabled={props.refreshing}
            onClick={props.onRefresh}
          >
            <RefreshCw
              className={cn('size-4', props.refreshing && 'animate-spin')}
            />
          </OverlayIconButton>
          <OverlayIconButton
            label={props.showMiniMap ? t('Hide minimap') : t('Show minimap')}
            active={props.showMiniMap}
            onClick={props.onToggleMiniMap}
          >
            <Compass className='size-4' />
          </OverlayIconButton>
          <OverlayIconButton
            label={t('Live traffic')}
            active={props.liveTraffic}
            onClick={props.onToggleLiveTraffic}
          >
            <Activity className='size-4' />
          </OverlayIconButton>
          <DropdownMenu>
            <TooltipHint content={t('More')}>
              <DropdownMenuTrigger
                render={
                  <Button
                    type='button'
                    variant='ghost'
                    size='icon'
                    className='hover:bg-muted data-popup-open:text-foreground size-8 rounded-lg data-popup-open:bg-white data-popup-open:shadow-sm data-popup-open:ring-1 data-popup-open:ring-black/10 dark:data-popup-open:bg-white/20 dark:data-popup-open:ring-white/20'
                    aria-label={t('More')}
                  />
                }
              >
                <ArrowUpRight className='size-4' />
              </DropdownMenuTrigger>
            </TooltipHint>
            <DropdownMenuContent side='top' align='center'>
              <DropdownMenuItem onClick={() => navigate({ to: '/channels' })}>
                <Table2 />
                {t('Channels')}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() =>
                  navigate({
                    to: '/models/$section',
                    params: { section: 'metadata' },
                  })
                }
              >
                <Box />
                {t('Models')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  )
}

function SearchPopover(props: {
  open: boolean
  onOpenChange: (open: boolean) => void
  hasFilters: boolean
  search: string
  onSearchChange: (value: string) => void
  filters: TopologyFilters
  onFiltersChange: (filters: TopologyFilters) => void
  groups: string[]
}) {
  const { t } = useTranslation()
  return (
    <Popover open={props.open} onOpenChange={props.onOpenChange}>
      <TooltipHint content={t('Filter')}>
        <PopoverTrigger
          render={
            <Button
              type='button'
              variant='ghost'
              size='icon'
              aria-label={t('Filter')}
              className={cn(
                'size-8 rounded-lg',
                props.open || props.hasFilters
                  ? 'bg-white text-foreground shadow-sm ring-1 ring-black/10 hover:bg-white hover:text-foreground dark:bg-white/20 dark:ring-white/20 dark:hover:bg-white/25'
                  : 'hover:bg-muted'
              )}
            />
          }
        >
          <Search className='size-4' />
        </PopoverTrigger>
      </TooltipHint>
      <PopoverContent className='w-72 p-2' side='top' align='start'>
        <div className='flex items-center gap-1'>
          <Search className='text-muted-foreground ml-1.5 size-4 shrink-0' />
          <Input
            value={props.search}
            onChange={(event) => props.onSearchChange(event.target.value)}
            placeholder={t('Search channels, models, or groups')}
            className='h-8 border-0 bg-transparent shadow-none focus-visible:ring-0'
          />
        </div>
        <div className='mt-2 flex gap-2 px-1 pb-1'>
          <Select
            value={props.filters.group || 'all'}
            onValueChange={(value) => {
              props.onFiltersChange({
                ...props.filters,
                group:
                  value === 'all' || typeof value !== 'string' ? '' : value,
              })
            }}
          >
            <SelectTrigger size='sm' className='h-8 flex-1'>
              <SelectValue placeholder={t('All groups')} />
            </SelectTrigger>
            <SelectContent alignItemWithTrigger={false}>
              <SelectGroup>
                <SelectItem value='all'>{t('All groups')}</SelectItem>
                {props.groups.map((group) => (
                  <SelectItem key={group} value={group}>
                    {group}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          <Select
            value={props.filters.status || 'all'}
            onValueChange={(value) => {
              props.onFiltersChange({
                ...props.filters,
                status:
                  value === 'all' || typeof value !== 'string' ? '' : value,
              })
            }}
          >
            <SelectTrigger size='sm' className='h-8 w-32'>
              <SelectValue placeholder={t('All Status')} />
            </SelectTrigger>
            <SelectContent alignItemWithTrigger={false}>
              <SelectGroup>
                <SelectItem value='all'>{t('All Status')}</SelectItem>
                <SelectItem value='enabled'>{t('Enabled')}</SelectItem>
                <SelectItem value='disabled'>{t('Disabled')}</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
      </PopoverContent>
    </Popover>
  )
}

function StatsPopover(props: {
  stats: {
    groups: number
    channels: number
    models: number
    connections: number
  }
  loading?: boolean
}) {
  const { t } = useTranslation()
  const items = [
    { icon: Users, label: t('Groups'), value: props.stats.groups },
    { icon: Radio, label: t('Channels'), value: props.stats.channels },
    { icon: Box, label: t('Models'), value: props.stats.models },
    {
      icon: Share2,
      label: t('Connections'),
      value: props.stats.connections,
    },
  ]

  return (
    <Popover>
      <TooltipHint content={t('Canvas overview')}>
        <PopoverTrigger
          render={
            <Button
              type='button'
              variant='ghost'
              className='data-popup-open:text-foreground h-8 rounded-lg px-2 text-[11px] font-medium data-popup-open:bg-white data-popup-open:shadow-sm data-popup-open:ring-1 data-popup-open:ring-black/10 dark:data-popup-open:bg-white/20 dark:data-popup-open:ring-white/20'
            />
          }
        >
          <Users className='size-3.5' />
          <span className='tabular-nums'>{props.stats.groups}</span>
          <span className='text-muted-foreground'>/</span>
          <span className='tabular-nums'>{props.stats.channels}</span>
          <span className='text-muted-foreground'>/</span>
          <span className='tabular-nums'>{props.stats.models}</span>
        </PopoverTrigger>
      </TooltipHint>
      <PopoverContent className='w-48 p-1.5' side='top' align='center'>
        <div className='space-y-0.5'>
          {items.map((item) => {
            const Icon = item.icon
            return (
              <div
                key={item.label}
                className='flex items-center justify-between rounded-lg px-2 py-1.5'
              >
                <span className='text-muted-foreground flex items-center gap-2 text-xs'>
                  <Icon className='size-3.5' />
                  {item.label}
                </span>
                <span className='font-mono text-sm font-semibold tabular-nums'>
                  {props.loading ? '—' : item.value}
                </span>
              </div>
            )
          })}
        </div>
      </PopoverContent>
    </Popover>
  )
}
