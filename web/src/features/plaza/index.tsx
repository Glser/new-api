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
import { X } from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { PublicLayout } from '@/components/layout'
import { PageTransition } from '@/components/page-transition'
import { Button } from '@/components/ui/button'
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
  PlazaFilterPanel,
  PlazaGroupRow,
  PlazaLoadingSkeleton,
  PlazaScaleFrame,
  PlazaVendorRow,
} from './components'
import { usePlazaFilters } from './hooks/use-plaza-filters'
import { groupModelsByCategory, PLAZA_CATEGORY_ORDER } from './lib/categories'

export function Plaza() {
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

  /** 只展示有模型的分类，编号按可见顺序连续编排 */
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

  if (isLoading) {
    return (
      <PublicLayout showMainContainer={false}>
        <PlazaScaleFrame className='relative'>
          <PlazaBackdrop />
          <div className='relative mx-auto w-full max-w-[1440px] px-3 pt-16 pb-8 sm:px-6 sm:pt-20 sm:pb-10 xl:px-8'>
            <PlazaLoadingSkeleton />
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
          <header className='mx-auto mb-5 max-w-3xl pt-5 sm:mb-6 sm:pt-8'>
            <div className='flex items-center gap-2'>
              <SearchBar
                value={searchInput}
                onChange={setSearchInput}
                onClear={clearSearch}
                placeholder={t(
                  'Search model name, provider, endpoint, or tag...'
                )}
                className='min-w-0 flex-1'
              />
              {hasActiveFilters && (
                <Button
                  type='button'
                  variant='ghost'
                  size='sm'
                  onClick={clearAll}
                  className='text-muted-foreground hover:text-foreground h-10 shrink-0 gap-1.5 rounded-lg px-3 text-xs'
                >
                  <X aria-hidden='true' className='size-3.5' />
                  {t('Clear filters')}
                </Button>
              )}
            </div>
          </header>

          <div className='flex flex-col gap-6 sm:gap-8'>
            <PlazaFilterPanel>
              <PlazaVendorRow
                vendors={vendors}
                models={models}
                value={vendorFilter}
                onChange={setVendorFilter}
              />
              <PlazaGroupRow
                groups={availableGroups}
                models={models}
                groupRatios={groupRatio}
                value={groupFilter}
                onChange={setGroupFilter}
              />
            </PlazaFilterPanel>

            {filteredModels.length === 0 ? (
              <EmptyState
                searchQuery={searchInput}
                hasActiveFilters={hasActiveFilters}
                onClearFilters={clearAll}
              />
            ) : (
              <div className='flex flex-col gap-10 sm:gap-12'>
                {visibleCategories.map((category, index) => (
                  <PlazaCategorySection
                    key={category}
                    category={category}
                    index={index + 1}
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
