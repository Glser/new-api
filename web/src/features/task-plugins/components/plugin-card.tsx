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
import { memo } from 'react'
import { useTranslation } from 'react-i18next'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { TooltipHint } from '@/components/ui/tooltip'
import { resolveLocalizedText } from '@/lib/localized-text'
import { cn } from '@/lib/utils'

import type { TaskPluginListItem } from '../types'
import { PluginIcon } from './plugin-icon'

const MAX_VISIBLE_MODELS = 2

const PLUGIN_CARD_HOVER =
  'transition-[translate,box-shadow] duration-500 group-hover/plugin-card:-translate-y-1 group-hover/plugin-card:shadow-[0_1px_2px_rgba(15,23,42,0.05),0_16px_36px_-24px_rgba(15,23,42,0.22)] dark:group-hover/plugin-card:shadow-[0_18px_50px_-24px_rgba(0,0,0,0.6)]'

const CHIP_CLASS = 'h-6 max-w-28 shrink-0 overflow-hidden px-2 text-xs font-normal whitespace-nowrap'

function sourceBadge(
  plugin: TaskPluginListItem,
  t: (key: string, options?: Record<string, unknown>) => string
) {
  if (plugin.source === 'factory') {
    return (
      <Badge variant='secondary' className={CHIP_CLASS}>
        {t('Factory')}
      </Badge>
    )
  }
  if (plugin.source === 'override_over_factory') {
    return (
      <Badge className={cn(CHIP_CLASS, 'font-normal')}>
        <span className='truncate'>
          {t('Custom (overrides factory {{version}})', {
            version: plugin.factory_meta?.version ?? '-',
          })}
        </span>
      </Badge>
    )
  }
  return (
    <Badge className={CHIP_CLASS}>
      <span className='truncate'>{t('Third-party')}</span>
    </Badge>
  )
}

function runtimeBadge(
  plugin: TaskPluginListItem,
  t: (key: string, options?: Record<string, unknown>) => string
) {
  const status = plugin.runtime_status
  if (status === 'registered') {
    return (
      <Badge variant='outline' className={CHIP_CLASS}>
        {t('Registered')}
      </Badge>
    )
  }
  if (status === 'compile_failed') {
    return (
      <Badge
        variant='destructive'
        className={CHIP_CLASS}
        title={plugin.runtime_error}
      >
        <span className='truncate'>{t('Compilation failed')}</span>
      </Badge>
    )
  }
  if (status === 'disabled' || status === 'disabled_fallback') {
    return (
      <Badge variant='secondary' className={CHIP_CLASS}>
        {t('Disabled')}
      </Badge>
    )
  }
  return (
    <Badge variant='secondary' className={CHIP_CLASS}>
      {t('Not registered')}
    </Badge>
  )
}

function PluginCardComponent({
  row,
  isSelected,
}: {
  row: Row<TaskPluginListItem>
  isSelected?: boolean
}) {
  const { t, i18n } = useTranslation()
  const plugin = row.original
  const cells = row.getAllCells()
  const description = resolveLocalizedText(
    plugin.meta.description,
    i18n.language
  )
  const models = plugin.meta.models ?? []
  const hiddenModels = models.slice(MAX_VISIBLE_MODELS)

  const renderCell = (id: string) => {
    const cell = cells.find((c) => c.column.id === id)
    if (!cell || !cell.column.columnDef.cell) {
      return null
    }
    return flexRender(cell.column.columnDef.cell, cell.getContext())
  }

  return (
    <Card
      data-card-hover='false'
      data-state={isSelected ? 'selected' : undefined}
      size='sm'
      className={cn(
        'min-w-0 gap-3 bg-(--data-table-card-bg,var(--card)) py-3.5 ring-inset',
        PLUGIN_CARD_HOVER,
        isSelected && 'ring-primary/40'
      )}
    >
      <CardHeader className='flex flex-row items-center gap-3 px-4'>
        <div className='flex size-8 shrink-0 items-center justify-center'>
          <PluginIcon
            plugin={{ ...plugin.meta, hasIcon: plugin.has_icon }}
            size={20}
          />
        </div>
        <div className='min-w-0 flex-1 overflow-hidden'>
          <TooltipHint content={plugin.meta.name}>
            <span className='block min-w-0 truncate py-px text-base leading-snug font-semibold'>
              {plugin.meta.name}
            </span>
          </TooltipHint>
          <div className='text-muted-foreground truncate font-mono text-xs'>
            {plugin.meta.key}
          </div>
        </div>
        <div className='-mr-1 flex h-8 shrink-0 items-center gap-0.5'>
          {renderCell('enabled')}
          {renderCell('actions')}
        </div>
      </CardHeader>

      <CardContent className='flex flex-col gap-2.5 px-4'>
        <p className='text-muted-foreground line-clamp-2 h-10 overflow-hidden text-sm leading-5 break-words'>
          {description || '\u00a0'}
        </p>

        <div className='flex h-6 min-w-0 items-center gap-1.5 overflow-hidden'>
          {sourceBadge(plugin, t)}
          {runtimeBadge(plugin, t)}
          <Badge
            variant='secondary'
            className={cn(CHIP_CLASS, 'font-mono')}
            aria-label={`${t('Active version')} ${plugin.meta.version}`}
          >
            {plugin.meta.version ? `v${plugin.meta.version}` : '-'}
          </Badge>
        </div>

        <div className='flex h-6 min-w-0 items-center gap-1 overflow-hidden'>
          {models.length > 0 ? (
            <>
              {models.slice(0, MAX_VISIBLE_MODELS).map((model) => (
                <Badge
                  key={model}
                  variant='outline'
                  className={cn(CHIP_CLASS, 'font-mono')}
                  title={model}
                >
                  <span className='min-w-0 truncate'>{model}</span>
                </Badge>
              ))}
              {hiddenModels.length > 0 ? (
                <Badge
                  variant='secondary'
                  className={CHIP_CLASS}
                  title={hiddenModels.join(', ')}
                >
                  +{hiddenModels.length}
                </Badge>
              ) : null}
            </>
          ) : (
            <span className='text-muted-foreground text-xs'>-</span>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export const PluginCard = memo(PluginCardComponent)
