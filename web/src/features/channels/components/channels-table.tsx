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
import { useQuery } from '@tanstack/react-query'
import { getRouteApi } from '@tanstack/react-router'
import type {
  ColumnFiltersState,
  OnChangeFn,
  SortingState,
  Row,
} from '@tanstack/react-table'
import { useState, useMemo, useEffect } from 'react'
import { useTranslation } from 'react-i18next'

import {
  DISABLED_ROW_DESKTOP,
  DISABLED_ROW_MOBILE,
  DATA_TABLE_VIEW_MODES,
  DataTablePage,
  DataTableViewModeToggle,
  DataTableViewOptions,
  useDataTable,
  useDataTableViewMode,
} from '@/components/data-table'
import { Combobox } from '@/components/ui/combobox'
import { useMediaQuery } from '@/hooks'
import { useTableUrlState } from '@/hooks/use-table-url-state'
import { getUserModels } from '@/lib/api'
import { requireServerSuccess } from '@/lib/server-error-message'
import { cn } from '@/lib/utils'

import { getChannels, searchChannels, getGroups } from '../api'
import { DEFAULT_PAGE_SIZE, CHANNEL_STATUS } from '../constants'
import {
  channelsQueryKeys,
  aggregateChannelsByTag,
  getChannelTableRowId,
  isTagAggregateRow,
  selectedSingleFilter,
} from '../lib'
import type { Channel, ChannelSortBy } from '../types'
import { ChannelCard } from './channel-card'
import { ChannelsClassificationBar } from './channels-classification-bar'
import { useChannelsColumns } from './channels-columns'
import { ChannelsPrimaryButtons } from './channels-primary-buttons'
import { useChannels } from './channels-provider'
import { DataTableBulkActions } from './data-table-bulk-actions'

const route = getRouteApi('/_authenticated/channels/')
const CHANNELS_COLUMN_VISIBILITY_STORAGE_KEY = 'channels:column-visibility'
const CHANNELS_COLUMN_SIZING_STORAGE_KEY = 'channels:column-sizing'
const CHANNELS_VIEW_MODE_STORAGE_KEY = 'channels:view-mode'
const CHANNELS_STATUS_FILTER_STORAGE_KEY = 'channel-status-filter'

const CHANNEL_SORTABLE_COLUMNS = new Set<ChannelSortBy>([
  'id',
  'name',
  'priority',
  'balance',
  'response_time',
  'test_time',
])

function isDisabledChannelRow(channel: Channel) {
  return (
    !isTagAggregateRow(channel) && channel.status !== CHANNEL_STATUS.ENABLED
  )
}

export function ChannelsTable() {
  const { t } = useTranslation()
  const { enableTagMode, idSort, batchMode, sensitiveVisible } = useChannels()
  const [viewMode, setViewMode] = useDataTableViewMode({
    storageKey: CHANNELS_VIEW_MODE_STORAGE_KEY,
    defaultMode: DATA_TABLE_VIEW_MODES.CARD,
  })
  const isMobile = useMediaQuery('(max-width: 640px)')

  // Table state
  const [sorting, setSorting] = useState<SortingState>([])

  // URL state management
  const {
    globalFilter,
    onGlobalFilterChange,
    columnFilters,
    onColumnFiltersChange,
    pagination,
    onPaginationChange,
    ensurePageInRange,
  } = useTableUrlState({
    search: route.useSearch(),
    navigate: route.useNavigate(),
    pagination: {
      defaultPage: 1,
      defaultPageSize: isMobile ? 10 : DEFAULT_PAGE_SIZE,
    },
    globalFilter: { enabled: true, key: 'filter' },
    columnFilters: [
      {
        columnId: 'status',
        searchKey: 'status',
        type: 'array',
        deserialize: (value) => {
          if (value !== undefined) return value
          const stored = localStorage.getItem(
            CHANNELS_STATUS_FILTER_STORAGE_KEY
          )
          return stored === 'enabled' ||
            stored === 'disabled' ||
            stored === 'auto_disabled' ||
            stored === 'manually_disabled'
            ? [stored]
            : []
        },
      },
      { columnId: 'type', searchKey: 'type', type: 'array' },
      { columnId: 'group', searchKey: 'group', type: 'array' },
      { columnId: 'tag', searchKey: 'tag', type: 'array' },
      { columnId: 'model', searchKey: 'model', type: 'string' },
    ],
  })

  const handleColumnFiltersChange: OnChangeFn<ColumnFiltersState> = (
    updater
  ) => {
    onColumnFiltersChange((previous) => {
      const next = typeof updater === 'function' ? updater(previous) : updater
      const status = next.find((f) => f.id === 'status')?.value as
        | string[]
        | undefined
      localStorage.setItem(
        CHANNELS_STATUS_FILTER_STORAGE_KEY,
        status?.[0] ?? 'all'
      )
      return next
    })
  }

  // Extract filters from column filters
  const statusFilter =
    (columnFilters.find((f) => f.id === 'status')?.value as string[]) || []
  const typeFilter = useMemo(
    () => (columnFilters.find((f) => f.id === 'type')?.value as string[]) || [],
    [columnFilters]
  )
  const groupFilter =
    (columnFilters.find((f) => f.id === 'group')?.value as string[]) || []
  const tagFilter =
    (columnFilters.find((f) => f.id === 'tag')?.value as string[]) || []
  const modelFilter =
    (columnFilters.find((filter) => filter.id === 'model')?.value as string) ||
    ''

  // Determine whether to use search or regular list API
  const shouldSearch = Boolean(globalFilter?.trim() || modelFilter.trim())

  const sortParams = useMemo(() => {
    const activeSort = sorting[0]
    if (
      !activeSort ||
      !CHANNEL_SORTABLE_COLUMNS.has(activeSort.id as ChannelSortBy)
    ) {
      return {}
    }

    return {
      sort_by: activeSort.id as ChannelSortBy,
      sort_order: activeSort.desc ? 'desc' : 'asc',
    } as const
  }, [sorting])

  const handleSortingChange: OnChangeFn<SortingState> = (updater) => {
    setSorting((previous) => {
      const next = typeof updater === 'function' ? updater(previous) : updater
      if (pagination.pageIndex > 0) {
        onPaginationChange({ ...pagination, pageIndex: 0 })
      }
      return next
    })
  }

  // Fetch groups for filter
  const { data: groupsData } = useQuery({
    queryKey: ['groups'],
    queryFn: async () => requireServerSuccess(await getGroups()),
  })
  const { data: userModels } = useQuery({
    queryKey: ['user-models'],
    queryFn: async () => requireServerSuccess(await getUserModels()),
  })

  const groupOptions = useMemo(
    () =>
      (groupsData?.data || [])
        .filter((group) => group !== 'auto')
        .map((group) => ({
          label: sensitiveVisible ? group : '••••',
          value: group,
        })),
    [groupsData, sensitiveVisible]
  )
  const modelOptions = useMemo(
    () =>
      [...new Set(userModels?.data ?? [])]
        .filter(Boolean)
        .sort((left, right) => left.localeCompare(right))
        .map((model) => ({ label: model, value: model })),
    [userModels]
  )

  const selectedGroup =
    groupFilter.length > 0 && !groupFilter.includes('all')
      ? groupFilter[0]
      : undefined
  const selectedStatus =
    statusFilter.length > 0 && !statusFilter.includes('all')
      ? statusFilter[0]
      : undefined
  const selectedType =
    typeFilter.length > 0 && !typeFilter.includes('all')
      ? Number(typeFilter[0])
      : undefined
  const selectedTag =
    tagFilter.length > 0 && !tagFilter.includes('all')
      ? tagFilter[0]
      : undefined

  const filterParams = {
    group: selectedGroup,
    status: selectedStatus,
    type: selectedType,
    tag: selectedTag,
    tag_mode: enableTagMode,
    id_sort: idSort,
    ...sortParams,
    p: pagination.pageIndex + 1,
    page_size: pagination.pageSize,
  }

  // Fetch channels data
  // eslint-disable-next-line @tanstack/query/exhaustive-deps
  const { data, isLoading, isFetching } = useQuery({
    queryKey: channelsQueryKeys.list({
      keyword: globalFilter,
      model: modelFilter,
      ...filterParams,
    }),
    queryFn: async () => {
      if (shouldSearch) {
        return requireServerSuccess(
          await searchChannels({
            keyword: globalFilter,
            model: modelFilter,
            ...filterParams,
          })
        )
      }
      return requireServerSuccess(await getChannels(filterParams))
    },
    placeholderData: (previousData) => previousData,
  })

  // Apply tag aggregation if tag mode is enabled
  const channels = useMemo(() => {
    const rawChannels = data?.data?.items || []

    if (enableTagMode && rawChannels.length > 0) {
      return aggregateChannelsByTag(rawChannels)
    }

    return rawChannels
  }, [data, enableTagMode])

  const totalCount = data?.data?.total || 0
  const typeCounts = data?.data?.type_counts
  const statusCounts = data?.data?.status_counts
  const tagCounts = data?.data?.tag_counts
  const untaggedCount = data?.data?.untagged_count

  // Columns configuration
  const columns = useChannelsColumns({ enableSelection: batchMode })

  // React Table instance
  const { table } = useDataTable({
    data: channels,
    columns,
    totalCount,
    sorting,
    initialColumnVisibility: {
      models: false,
      tag: false,
    },
    columnVisibilityStorageKey: CHANNELS_COLUMN_VISIBILITY_STORAGE_KEY,
    columnSizingStorageKey: isMobile
      ? false
      : CHANNELS_COLUMN_SIZING_STORAGE_KEY,
    columnFilters,
    pagination,
    globalFilter,
    enableRowSelection: batchMode
      ? (row: Row<Channel>) => !isTagAggregateRow(row.original)
      : false,
    onSortingChange: handleSortingChange,
    onColumnFiltersChange: handleColumnFiltersChange,
    onPaginationChange,
    onGlobalFilterChange,
    getRowId: getChannelTableRowId,
    getSubRows: (row: Channel & { children?: Channel[] }) => row.children,
    manualPagination: true,
    manualSorting: true,
    manualFiltering: true,
    withExpandedRowModel: true,
    enableColumnResizing: !isMobile,
    ensurePageInRange,
  })

  useEffect(() => {
    if (!batchMode) {
      table.resetRowSelection()
    }
  }, [batchMode, table])

  const setSingleColumnFilter = (
    columnId: string,
    value: string | undefined
  ) => {
    handleColumnFiltersChange((previous) => {
      const next = previous.filter((filter) => filter.id !== columnId)
      if (value && value !== 'all') {
        next.push({ id: columnId, value: [value] })
      }
      return next
    })
  }

  const setStringColumnFilter = (
    columnId: string,
    value: string | undefined
  ) => {
    handleColumnFiltersChange((previous) => {
      const next = previous.filter((filter) => filter.id !== columnId)
      if (value) {
        next.push({ id: columnId, value })
      }
      return next
    })
  }

  const handleTagFacetChange = (value: string | undefined) => {
    setSingleColumnFilter('tag', value)
  }

  const getColumnClassName = (_columnId: string, kind: 'header' | 'cell') =>
    kind === 'header'
      ? 'text-center [&>div]:mx-auto [&>div]:justify-center'
      : 'py-2.5 text-center [&>div]:mx-auto [&>div]:items-center [&>div]:justify-center'

  return (
    <div className='@container/console flex h-full min-h-0 flex-col gap-3'>
      <ChannelsClassificationBar
        statusCounts={statusCounts}
        typeCounts={typeCounts}
        tagCounts={tagCounts}
        untaggedCount={untaggedCount}
        statusValue={selectedSingleFilter(statusFilter)}
        typeValue={selectedSingleFilter(typeFilter)}
        tagValue={selectedSingleFilter(tagFilter)}
        onStatusChange={(value) => setSingleColumnFilter('status', value)}
        onTypeChange={(value) => setSingleColumnFilter('type', value)}
        onTagChange={handleTagFacetChange}
        sensitiveVisible={sensitiveVisible}
      />
      <DataTablePage
        className='min-h-0 flex-1'
        table={table}
        columns={columns}
        isLoading={isLoading}
        isFetching={isFetching}
        emptyTitle={t('No Channels Found')}
        emptyDescription={t(
          'No channels available. Create your first channel to get started.'
        )}
        skeletonKeyPrefix='channel-skeleton'
        enableCardView
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        renderCard={(row, { isSelected }) => (
          <ChannelCard row={row} isSelected={isSelected} />
        )}
        cardGridClassName='grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(min(100%,18rem),1fr))]'
        cardItemClassName='group/channel-card relative z-0 min-w-0 self-start overflow-visible border-0 !bg-transparent p-0 shadow-none hover:z-10 data-[state=selected]:border-transparent'
        applyHeaderSize
        tableClassName={cn(
          '@container/channels [&_[data-slot=table]]:min-w-[70rem] [&_[data-slot=table]]:table-auto [&_[data-slot=table]_thead]:bg-(--table-header) [&_[data-slot=table]_th]:bg-(--table-header) [&_[data-slot=table]_th]:h-10 [&_[data-slot=table]_th]:px-3 [&_[data-slot=table]_th]:text-center [&_[data-slot=table]_th]:text-xs [&_[data-slot=table]_td]:px-3 [&_[data-slot=table]_td]:text-center [&_[data-slot=table]_td]:text-xs @min-[48rem]/channels:[&_[data-slot=table]_td]:text-sm @min-[48rem]/channels:[&_[data-slot=table]_th]:text-sm @min-[80rem]/channels:[&_[data-slot=table]_td]:px-3 @min-[80rem]/channels:[&_[data-slot=table]_th]:px-3 @min-[80rem]/channels:[&_[data-slot=table]_td]:text-[15px]',
          '[&_[data-slot=table]_th>div]:justify-center [&_[data-slot=table]_th_button]:ms-0',
          '[&_[data-slot=table]_td_*]:text-center [&_[data-slot=table]_td_*]:justify-center [&_[data-slot=table]_td_*]:items-center'
        )}
        getColumnClassName={getColumnClassName}
        toolbarProps={{
          searchPlaceholder: t('Filter by name, ID, or key...'),
          searchDebounceMs: 500,
          hideViewOptions: true,
          viewToggle: null,
          additionalSearch: (
            <>
              <div className='w-28 shrink-0'>
                <Combobox
                  options={modelOptions}
                  fitContentWidth
                  aria-label={t('Model Name')}
                  emptyText={t('No model found.')}
                  placeholder={t('Model Name')}
                  className='h-8 w-full min-w-0 text-sm leading-5'
                  value={modelFilter}
                  onValueChange={(value) =>
                    setStringColumnFilter('model', value || undefined)
                  }
                />
              </div>
              <div className='w-28 shrink-0'>
                <Combobox
                  options={groupOptions}
                  fitContentWidth
                  aria-label={t('Group')}
                  emptyText={t('No group found.')}
                  placeholder={t('Group')}
                  className='h-8 w-full min-w-0 text-sm leading-5'
                  value={selectedGroup ?? ''}
                  onValueChange={(value) =>
                    setSingleColumnFilter('group', value || undefined)
                  }
                />
              </div>
              <DataTableViewModeToggle
                variant='tabs'
                value={viewMode}
                onChange={setViewMode}
              />
              <DataTableViewOptions table={table} />
            </>
          ),
          endActions: <ChannelsPrimaryButtons />,
        }}
        getRowClassName={(row, { isMobile }) => {
          if (!isDisabledChannelRow(row.original)) {
            return undefined
          }
          if (isMobile) {
            return DISABLED_ROW_MOBILE
          }
          return DISABLED_ROW_DESKTOP
        }}
        bulkActions={batchMode ? <DataTableBulkActions table={table} /> : null}
      />
    </div>
  )
}
