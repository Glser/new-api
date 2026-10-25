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
import type { PricingModel, PricingVendor } from '@/features/pricing/types'

import type { ApiKeyGroupOption } from '../components/api-key-group-combobox'

export type ApiKeyVendorOption = {
  value: string
  label: string
  icon?: string
  groups: ApiKeyGroupOption[]
}

export function getApiKeyVendorOptions(
  vendors: PricingVendor[],
  models: PricingModel[],
  groups: ApiKeyGroupOption[]
): ApiKeyVendorOption[] {
  const groupsByVendor = new Map<number, Set<string>>()
  for (const model of models) {
    if (model.vendor_id == null) continue
    let vendorGroups = groupsByVendor.get(model.vendor_id)
    if (!vendorGroups) {
      vendorGroups = new Set<string>()
      groupsByVendor.set(model.vendor_id, vendorGroups)
    }
    for (const group of model.enable_groups ?? []) vendorGroups.add(group)
  }

  return vendors.flatMap((vendor) => {
    const available = groupsByVendor.get(vendor.id)
    if (!available) return []
    const vendorGroups = groups.filter((group) => available.has(group.value))
    if (vendorGroups.length === 0) return []
    return [
      {
        value: String(vendor.id),
        label: vendor.name,
        icon: vendor.icon,
        groups: groups.filter(
          (group) => group.value === 'auto' || available.has(group.value)
        ),
      },
    ]
  })
}
