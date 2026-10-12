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
import { useCallback, useMemo, useState } from 'react'

import { FILTER_ALL, SORT_OPTIONS } from '@/features/pricing/constants'
import {
  filterByGroup,
  filterBySearch,
  filterByVendor,
  sortModels,
} from '@/features/pricing/lib/filters'
import type { PricingModel } from '@/features/pricing/types'
import { useDebounce } from '@/hooks/use-debounce'

export function usePlazaFilters(models: PricingModel[]) {
  const [searchInput, setSearchInput] = useState('')
  const [vendorFilter, setVendorFilter] = useState(FILTER_ALL)
  const [groupFilter, setGroupFilter] = useState(FILTER_ALL)
  const debouncedSearch = useDebounce(searchInput, 200)

  const filteredModels = useMemo(() => {
    let result = filterBySearch(models, debouncedSearch)
    result = filterByVendor(result, vendorFilter)
    result = filterByGroup(result, groupFilter)
    return sortModels(result, SORT_OPTIONS.NAME)
  }, [models, debouncedSearch, vendorFilter, groupFilter])

  const hasActiveFilters =
    vendorFilter !== FILTER_ALL ||
    groupFilter !== FILTER_ALL ||
    Boolean(searchInput.trim())

  const clearFilters = useCallback(() => {
    setVendorFilter(FILTER_ALL)
    setGroupFilter(FILTER_ALL)
  }, [])

  const clearSearch = useCallback(() => {
    setSearchInput('')
  }, [])

  const clearAll = useCallback(() => {
    clearFilters()
    clearSearch()
  }, [clearFilters, clearSearch])

  return {
    searchInput,
    vendorFilter,
    groupFilter,
    setSearchInput,
    setVendorFilter,
    setGroupFilter,
    filteredModels,
    hasActiveFilters,
    clearFilters,
    clearSearch,
    clearAll,
  }
}
