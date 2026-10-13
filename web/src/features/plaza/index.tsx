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
  PlazaCategorySection,
  PlazaGroupRow,
  PlazaLoadingSkeleton,
  PlazaScaleFrame,
  PlazaVendorRow,
} from './components'
import { usePlazaFilters } from './hooks/use-plaza-filters'
import {
  groupModelsByCategory,
  PLAZA_CATEGORY_ORDER,
} from './lib/categories'

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
        ? models.find((model) => model.model_name === selectedModelName) ||
          null
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
        <PlazaScaleFrame>
          <div className='mx-auto w-full max-w-[1440px] px-3 pt-16 pb-8 sm:px-6 sm:pt-20 sm:pb-10 xl:px-8'>
            <PlazaLoadingSkeleton />
          </div>
        </PlazaScaleFrame>
      </PublicLayout>
    )
  }

  return (
    <PublicLayout showMainContainer={false}>
      <PlazaScaleFrame className='relative'>
        <div
          aria-hidden
          className='pointer-events-none absolute inset-x-0 top-0 h-[480px] opacity-20 dark:opacity-[0.10]'
          style={{
            background: [
              'radial-gradient(ellipse 60% 50% at 20% 20%, oklch(0.72 0.18 250 / 80%) 0%, transparent 70%)',
              'radial-gradient(ellipse 50% 40% at 80% 15%, oklch(0.65 0.15 200 / 60%) 0%, transparent 70%)',
              'radial-gradient(ellipse 40% 35% at 50% 70%, oklch(0.70 0.12 280 / 40%) 0%, transparent 70%)',
            ].join(', '),
            maskImage: 'linear-gradient(to bottom, black 40%, transparent 100%)',
            WebkitMaskImage:
              'linear-gradient(to bottom, black 40%, transparent 100%)',
          }}
        />
        <PageTransition className='relative mx-auto w-full max-w-[1440px] px-3 pt-16 pb-8 sm:px-6 sm:pt-20 sm:pb-10 xl:px-8'>
          <header className='mx-auto mb-6 max-w-3xl pt-5 sm:mb-8 sm:pt-8'>
            <SearchBar
              value={searchInput}
              onChange={setSearchInput}
              onClear={clearSearch}
              placeholder={t(
                'Search model name, provider, endpoint, or tag...'
              )}
              className='mx-auto max-w-2xl'
            />
          </header>

          <div className='flex flex-col gap-5'>
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

            {filteredModels.length === 0 ? (
              <EmptyState
                searchQuery={searchInput}
                hasActiveFilters={hasActiveFilters}
                onClearFilters={clearAll}
              />
            ) : (
              <div className='flex flex-col gap-10'>
                {PLAZA_CATEGORY_ORDER.map((category) => (
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
