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
import { useMemo } from 'react'

import { getPricing } from '@/features/pricing/api'
import { requireServerSuccess } from '@/lib/server-error-message'

export interface ModelIconEntry {
  icon: string
  /** Vendor display name for the tooltip; absent when only a model icon is configured. */
  label?: string
}

/**
 * Model icon lookup backed by the pricing catalog (model management
 * metadata), keyed by the exact model name channels serve. Returns
 * `undefined` while loading or when pricing is unavailable so callers can
 * fall back to their own resolution.
 */
export function useModelIconMap(): Map<string, ModelIconEntry> | undefined {
  const { data } = useQuery({
    queryKey: ['pricing'],
    queryFn: async () => requireServerSuccess(await getPricing()),
    staleTime: 5 * 60 * 1000,
    meta: { errorToast: false },
  })

  return useMemo(() => {
    if (!data?.data || !data.vendors) return undefined

    const vendorMap = new Map(data.vendors.map((vendor) => [vendor.id, vendor]))
    const iconMap = new Map<string, ModelIconEntry>()
    for (const model of data.data) {
      const vendor = model.vendor_id
        ? vendorMap.get(model.vendor_id)
        : undefined
      const icon = model.icon || vendor?.icon
      if (!icon) continue
      iconMap.set(model.model_name, { icon, label: vendor?.name })
    }
    return iconMap
  }, [data])
}
