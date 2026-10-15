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
import { useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { PublicLayout } from '@/components/layout'
import { PageTransition } from '@/components/page-transition'
import { getPerfMetricsSummary } from '@/features/performance-metrics/api'
import { EmptyState } from '@/features/pricing/components/empty-state'
import { ModelDetailsDrawer } from '@/features/pricing/components/model-details'
import type { ModelPerfBadgeData } from '@/features/pricing/components/model-perf-badge'
import { SearchBar } from '@/features/pricing/components/search-bar'
import {
  DEFAULT_TOKEN_UNIT,
  EXCLUDED_GROUPS,
} from '@/features/pricing/constants'
import { usePricingData } from '@/features/pricing/hooks/use-pricing-data'
import { requireServerSuccess } from '@/lib/server-error-message'

import {
  PlazaBackdrop,
  PlazaCategorySection,
  PlazaScaleFrame,
} from './components'
import {
  PlazaFilterDrawer,
  PlazaFilterSidebar,
} from './components/filter-sidebar'
import { ExploreLoadingSkeleton } from './explore-loading-skeleton'
import { usePlazaFilters } from './hooks/use-plaza-filters'
import { groupModelsByCategory, PLAZA_CATEGORY_ORDER } from './lib/categories'

/**
 * 模型广场（新版布局）：侧栏筛选 + 内容流。
 *
 * 和 `/plaza` 那版并列存在，不是替换关系。核心思路：
 * - 搜索留在页头，是首屏最显眼的入口；
 * - 供应商 / 价格两个维度收进左侧常驻侧栏，各自带模型数量，
 *   不用展开、不用翻页，扫一眼就知道站内有什么、哪家货最多；
 * - 命中数常驻，切筛选的反馈即时可见；
 * - 窄屏把同一套侧栏搬进抽屉，不占首屏。
 *
 * 侧栏用 lg 而不是 xl：页面套在 PlazaScaleFrame 的 zoom 画布里，
 * 视口 1024–1440 时 xl(1280) 命中不到，侧栏会整段消失。
 */
export function Explore() {
  const { t } = useTranslation()
  const [selectedModelName, setSelectedModelName] = useState<string | null>(
    null
  )

  const {
    models,
    vendors,
    groupRatio,
    usableGroup,
    endpointMap,
    autoGroups,
    isLoading,
    priceRate,
    usdExchangeRate,
  } = usePricingData()

  const {
    searchInput,
    vendorFilter,
    groupFilter,
    setSearchInput,
    setVendorFilter,
    setGroupFilter,
    filteredModels,
    hasActiveFilters,
    clearSearch,
    clearAll,
  } = usePlazaFilters(models)

  const handleModelClick = useCallback((modelName: string) => {
    setSelectedModelName(modelName)
  }, [])

  const selectedModel = useMemo(
    () =>
      selectedModelName
        ? models.find((model) => model.model_name === selectedModelName) || null
        : null,
    [models, selectedModelName]
  )

  const availableGroups = useMemo(
    () =>
      Object.keys(usableGroup).filter(
        (group) => !EXCLUDED_GROUPS.includes(group)
      ),
    [usableGroup]
  )

  const groupedModels = useMemo(
    () => groupModelsByCategory(filteredModels),
    [filteredModels]
  )

  const visibleCategories = useMemo(
    () =>
      PLAZA_CATEGORY_ORDER.filter(
        (category) => groupedModels[category].length > 0
      ),
    [groupedModels]
  )

  const perfQuery = useQuery({
    queryKey: ['perf-metrics-summary', 24],
    queryFn: async () => requireServerSuccess(await getPerfMetricsSummary(24)),
    staleTime: 60 * 1000,
    retry: false,
  })

  const perfMap = useMemo(() => {
    const map = new Map<string, ModelPerfBadgeData>()
    for (const model of perfQuery.data?.data?.models ?? []) {
      map.set(model.model_name, model)
    }
    return map
  }, [perfQuery.data])

  const sidebarProps = {
    vendors,
    models,
    groups: availableGroups,
    groupRatios: groupRatio,
    vendorFilter,
    groupFilter,
    onVendorChange: setVendorFilter,
    onGroupChange: setGroupFilter,
    resultCount: filteredModels.length,
    hasActiveFilters,
    onClearAll: clearAll,
  }

  if (isLoading) {
    return (
      <PublicLayout showMainContainer={false}>
        <PlazaScaleFrame className='relative'>
          <PlazaBackdrop />
          <div className='relative mx-auto w-full max-w-[1440px] px-3 pt-16 pb-8 sm:px-6 sm:pt-20 sm:pb-10 xl:px-8'>
            <ExploreLoadingSkeleton />
          </div>
        </PlazaScaleFrame>
      </PublicLayout>
    )
  }

  return (
    <PublicLayout showMainContainer={false}>
      <PlazaScaleFrame className='relative'>
        <PlazaBackdrop />
        <PageTransition className='relative mx-auto w-full max-w-[1440px] px-3 pt-16 pb-8 sm:px-6 sm:pt-20 sm:pb-10 xl:px-8'>
          <header className='pt-5 sm:pt-8'>
            <div className='flex flex-wrap items-end justify-between gap-x-6 gap-y-2'>
              <h1 className='text-2xl font-semibold tracking-tight sm:text-[28px]'>
                {t('Model Square')}
              </h1>
              <p className='text-muted-foreground text-sm tabular-nums'>
                {t('{{models}} models · {{vendors}} vendors', {
                  models: models.length,
                  vendors: vendors.length,
                })}
              </p>
            </div>
            <p className='text-muted-foreground/80 mt-2 text-[13px]'>
              {t(
                'Browse every model on this site. Filter by vendor or price group to find the right one.'
              )}
            </p>
            <SearchBar
              value={searchInput}
              onChange={setSearchInput}
              onClear={clearSearch}
              placeholder={t(
                'Search model name, provider, endpoint, or tag...'
              )}
              className='mt-3 w-full max-w-xl'
            />
          </header>

          <div className='mt-5 flex items-start gap-6 sm:mt-6 lg:gap-8'>
            <aside className='sticky top-20 hidden w-60 shrink-0 lg:block'>
              <div className='no-scrollbar max-h-[calc(100dvh-7.5rem)] overflow-y-auto'>
                <PlazaFilterSidebar {...sidebarProps} />
              </div>
            </aside>

            <div className='min-w-0 flex-1'>
              <div className='bg-background/80 sticky top-16 z-30 mb-4 flex items-center gap-3 rounded-lg border px-3 py-2 backdrop-blur lg:hidden'>
                <PlazaFilterDrawer {...sidebarProps} />
                <span className='text-muted-foreground text-xs tabular-nums'>
                  {t('{{count}} results', { count: filteredModels.length })}
                </span>
              </div>

              {filteredModels.length === 0 ? (
                <EmptyState
                  searchQuery={searchInput}
                  hasActiveFilters={hasActiveFilters}
                  onClearFilters={clearAll}
                />
              ) : (
                <div className='flex flex-col gap-10 sm:gap-12'>
                  {visibleCategories.map((category) => (
                    <PlazaCategorySection
                      key={category}
                      category={category}
                      models={groupedModels[category]}
                      onModelClick={handleModelClick}
                      priceRate={priceRate}
                      usdExchangeRate={usdExchangeRate}
                      selectedGroup={groupFilter}
                      perfMap={perfMap}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          {selectedModel && (
            <ModelDetailsDrawer
              open={Boolean(selectedModel)}
              onOpenChange={(open) => {
                if (!open) setSelectedModelName(null)
              }}
              model={selectedModel}
              groupRatio={groupRatio}
              usableGroup={usableGroup}
              endpointMap={
                (endpointMap as Record<
                  string,
                  { path?: string; method?: string }
                >) || {}
              }
              autoGroups={autoGroups}
              priceRate={priceRate}
              usdExchangeRate={usdExchangeRate}
              tokenUnit={DEFAULT_TOKEN_UNIT}
            />
          )}
        </PageTransition>
      </PlazaScaleFrame>
    </PublicLayout>
  )
}
