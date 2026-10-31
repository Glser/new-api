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
import type { ColumnDef } from '@tanstack/react-table'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { CopyButton } from '@/components/copy-button'
import { BadgeListCell, TruncatedCell } from '@/components/data-table'
import { StatusBadge } from '@/components/status-badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  TooltipHint,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from '@/components/ui/tooltip'
import {
  useCanEditModelPricing,
  type ModelPricingConfig,
} from '@/features/model-pricing/api'
import { modelPricingDisplay } from '@/features/model-pricing/pricing'
import { formatTimestampToDate } from '@/lib/format'
import { getLobeIcon } from '@/lib/lobe-icon'

import { getNameRuleConfig } from '../constants'
import { parseModelTags, formatEndpointsDisplay } from '../lib'
import { getModelChannelState } from '../lib/model-utils'
import type { Model, Vendor } from '../types'
import { DataTableRowActions } from './data-table-row-actions'
import { DescriptionCell } from './description-cell'
import { ModelHitPriceCell } from './model-hit-price-cell'
import { ModelSquareStatus } from './model-square-status'
import { useModels } from './models-provider'

export function useModelsColumns(
  vendors: Vendor[] = [],
  pricing?: ModelPricingConfig,
  pricingState?: 'loading' | 'error'
): ColumnDef<Model>[] {
  const { t } = useTranslation()
  const canPrice = useCanEditModelPricing()
  const { setCurrentRow, setOpen } = useModels()
  const vendorMap = useMemo(
    () => new Map(vendors.map((vendor) => [vendor.id, vendor])),
    [vendors]
  )
  const priceMap = useMemo(
    () =>
      new Map(pricing?.entries.map((entry) => [entry.model_name, entry]) ?? []),
    [pricing]
  )
  return useMemo(() => {
    const rules = getNameRuleConfig(t)
    return [
      {
        id: 'select',
        header: ({ table }) => (
          <Checkbox
            checked={table.getIsAllPageRowsSelected()}
            indeterminate={table.getIsSomePageRowsSelected()}
            onCheckedChange={(value) =>
              table.toggleAllPageRowsSelected(Boolean(value))
            }
            aria-label={t('Select all')}
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(Boolean(value))}
            aria-label={t('Select {{name}}', { name: row.original.model_name })}
          />
        ),
        size: 40,
        enableSorting: false,
        enableHiding: false,
      },
      {
        accessorKey: 'model_name',
        header: t('Model'),
        size: 220,
        minSize: 180,
        maxSize: 240,
        enableHiding: false,
        meta: { mobileTitle: true, contentSized: true },
        cell: ({ row }) => {
          const model = row.original
          const vendor = vendorMap.get(model.vendor_id ?? 0)
          const iconKey = model.icon || vendor?.icon || model.model_name[0]
          return (
            <div className='flex w-full max-w-60 min-w-0 items-start gap-2.5'>
              <span className='flex size-6 shrink-0 items-center justify-center'>
                {getLobeIcon(iconKey, 24)}
              </span>
              <div className='min-w-0 flex-1 text-left'>
                <div className='flex min-h-6 min-w-0 items-center gap-1'>
                  <Button
                    variant='link'
                    className='text-foreground h-auto min-w-0 justify-start p-0 font-mono text-base! leading-6 font-medium'
                    title={model.model_name}
                    onClick={() => {
                      setCurrentRow(model)
                      setOpen('update-model')
                    }}
                  >
                    <span className='truncate'>{model.model_name}</span>
                  </Button>
                  <CopyButton
                    value={model.model_name}
                    className='size-5 shrink-0'
                  />
                </div>
                <div className='text-muted-foreground mt-0.5 flex min-w-0 items-center gap-1.5 text-xs'>
                  <TooltipHint content={vendor?.name}>
                    <span className='truncate'>
                      {model.id > 0
                        ? (vendor?.name ?? t('No vendor'))
                        : t('Missing metadata')}
                    </span>
                  </TooltipHint>
                  {model.name_rule !== 0 && (
                    <span className='shrink-0'>
                      {rules[model.name_rule as 0 | 1 | 2 | 3]?.label} ·{' '}
                      {model.matched_count ?? 0}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )
        },
      },
      {
        id: 'pricing',
        header: t('Pricing'),
        meta: { label: t('Pricing') },
        size: 280,
        enableSorting: false,
        cell: ({ row }) => {
          if (!canPrice) {
            return (
              <span className='text-muted-foreground text-xs'>
                {t('Super admin')}
              </span>
            )
          }
          if (row.original.name_rule !== 0) {
            return (
              <span className='text-muted-foreground text-xs'>
                {t('Per matched model')}
              </span>
            )
          }
          if (pricingState) {
            return (
              <span className='text-muted-foreground text-xs'>
                {pricingState === 'error'
                  ? t('Failed to load model pricing')
                  : t('Loading...')}
              </span>
            )
          }
          const entry = priceMap.get(row.original.model_name)
          return (
            <Button
              variant='ghost'
              className='h-auto w-full max-w-full min-w-0 justify-center px-0 py-0.5 text-center font-normal hover:bg-transparent'
              aria-label={t('View pricing for {{model}}', {
                model: row.original.model_name,
              })}
              onClick={() => {
                setCurrentRow(row.original)
                setOpen('price-model')
              }}
            >
              <ModelHitPriceCell
                model={modelPricingDisplay(
                  entry ?? {
                    model_name: row.original.model_name,
                    effective: {},
                  }
                )}
              />
            </Button>
          )
        },
      },
      {
        accessorKey: 'square_state',
        header: t('Model square visibility'),
        size: 115,
        enableSorting: false,
        meta: { mobileBadge: true },
        cell: ({ row }) => <ModelSquareStatus model={row.original} />,
      },
      {
        id: 'connections',
        header: t('Channels and groups'),
        size: 180,
        enableSorting: false,
        cell: ({ row }) => {
          const state = getModelChannelState(row.original)
          return (
            <div className='mx-auto w-fit max-w-full min-w-0 text-center'>
              <Tooltip>
                <TooltipTrigger
                  render={
                    <span
                      tabIndex={0}
                      aria-description={t(state.description)}
                      className='block whitespace-normal sm:truncate'
                    />
                  }
                >
                  {t('Channels {{channels}} · Groups {{groups}}', {
                    channels: row.original.bound_channels?.length ?? 0,
                    groups: row.original.enable_groups?.length ?? 0,
                  })}
                </TooltipTrigger>
                <TooltipContent role='tooltip'>
                  {t(state.description)}
                </TooltipContent>
              </Tooltip>
            </div>
          )
        },
      },
      {
        accessorKey: 'tags',
        header: t('Tags'),
        size: 180,
        enableSorting: false,
        meta: { mobileHidden: true },
        cell: ({ row }) => (
          <BadgeListCell
            expandable
            max={1}
            className='mx-auto justify-center'
            items={parseModelTags(row.original.tags ?? '').map((tag) => (
              <StatusBadge key={tag} label={tag} variant='neutral' size='sm' />
            ))}
          />
        ),
      },
      {
        accessorKey: 'sync_official',
        header: () => (
          <TruncatedCell className='max-w-[120px]'>
            {t('Sync policy')}
          </TruncatedCell>
        ),
        size: 145,
        enableSorting: false,
        meta: { mobileHidden: true, label: t('Sync policy') },
        cell: ({ row }) => (
          <TruncatedCell className='text-muted-foreground mx-auto max-w-[120px] text-xs!'>
            {row.original.id > 0 &&
              (row.original.sync_official
                ? t('Allow updates')
                : t('Keep local'))}
            {!row.original.id && '—'}
          </TruncatedCell>
        ),
      },
      {
        id: 'actions',
        header: t('Actions'),
        enableSorting: false,
        enableHiding: false,
        size: canPrice ? 170 : 105,
        cell: ({ row }) => <DataTableRowActions row={row} />,
      },
      {
        accessorKey: 'status',
        header: t('Display policy'),
        enableHiding: false,
        enableSorting: false,
        cell: ({ row }) =>
          row.original.status === 1 ? t('Allowed') : t('Not listed'),
      },
      {
        accessorKey: 'id',
        header: t('ID'),
        cell: ({ row }) => (
          <span className='font-mono tabular-nums'>
            {row.original.id || '—'}
          </span>
        ),
        size: 65,
        meta: { mobileHidden: true },
      },
      {
        accessorKey: 'vendor_id',
        header: t('Vendor'),
        size: 150,
        enableSorting: false,
        cell: ({ row }) => (
          <TruncatedCell>
            {vendorMap.get(row.original.vendor_id ?? 0)?.name ?? '—'}
          </TruncatedCell>
        ),
        meta: { mobileHidden: true },
      },
      {
        accessorKey: 'name_rule',
        header: t('Match Type'),
        size: 100,
        enableSorting: false,
        cell: ({ row }) =>
          rules[row.original.name_rule as 0 | 1 | 2 | 3]?.label,
        meta: { mobileHidden: true },
      },
      {
        accessorKey: 'description',
        header: t('Description'),
        size: 180,
        enableSorting: false,
        cell: ({ row }) => (
          <DescriptionCell
            modelName={row.original.model_name}
            description={row.original.description ?? ''}
          />
        ),
        meta: { mobileHidden: true },
      },
      {
        accessorKey: 'endpoints',
        header: t('Custom endpoints'),
        size: 180,
        enableSorting: false,
        cell: ({ row }) => (
          <BadgeListCell
            expandable
            expandLabel={t('Supported endpoints')}
            items={formatEndpointsDisplay(row.original.endpoints ?? '').map(
              (endpoint) => (
                <StatusBadge
                  key={endpoint}
                  label={endpoint}
                  variant='neutral'
                />
              )
            )}
          />
        ),
        meta: { mobileHidden: true },
      },
      {
        accessorKey: 'created_time',
        header: t('Created'),
        size: 160,
        cell: ({ row }) =>
          row.original.id ? (
            <span className='text-[12px]! tabular-nums'>
              {formatTimestampToDate(row.original.created_time)}
            </span>
          ) : (
            '—'
          ),
        meta: { mobileHidden: true },
      },
      {
        accessorKey: 'updated_time',
        header: t('Updated'),
        size: 160,
        cell: ({ row }) =>
          row.original.id ? (
            <span className='text-[12px]! tabular-nums'>
              {formatTimestampToDate(row.original.updated_time)}
            </span>
          ) : (
            '—'
          ),
        meta: { mobileHidden: true },
      },
    ]
  }, [t, canPrice, vendorMap, priceMap, pricingState, setCurrentRow, setOpen])
}
