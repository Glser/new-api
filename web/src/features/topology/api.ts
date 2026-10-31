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

import { getChannels, getGroups } from '@/features/channels/api'
import type { Channel } from '@/features/channels/types'
import { getModels } from '@/features/models/api'
import type { Model } from '@/features/models/types'
import { getPricing } from '@/features/pricing/api'
import type { PricingModel } from '@/features/pricing/types'
import { api } from '@/lib/api'
import { requireServerSuccess } from '@/lib/server-error-message'

import {
  emptyTopologyLayout,
  type TopologyGraphPayload,
  type TopologyLayout,
  type TopologyModelPrice,
} from './types'

function buildModelPrices(
  models: PricingModel[]
): Record<string, TopologyModelPrice> {
  const prices: Record<string, TopologyModelPrice> = {}
  for (const model of models) {
    if (!model.model_name) continue
    prices[model.model_name] = {
      name: model.model_name,
      icon: model.icon,
      vendorIcon: model.vendor_icon,
      pricing: model,
    }
  }
  return prices
}

const PAGE_SIZE = 100
const MAX_PAGES = 50

async function fetchAllChannels() {
  const first = requireServerSuccess(
    await getChannels({ p: 1, page_size: PAGE_SIZE })
  )
  const items: Channel[] = [...(first.data?.items ?? [])]
  const total = first.data?.total ?? items.length
  let page = 2
  while (items.length < total && page <= MAX_PAGES) {
    const next = requireServerSuccess(
      await getChannels({ p: page, page_size: PAGE_SIZE })
    )
    const batch = next.data?.items ?? []
    if (batch.length === 0) break
    items.push(...batch)
    page += 1
  }
  return items
}

async function fetchAllModels() {
  const first = requireServerSuccess(
    await getModels({
      p: 1,
      page_size: PAGE_SIZE,
      include_channel_models: true,
    })
  )
  const items: Model[] = [...(first.data?.items ?? [])]
  const total = first.data?.total ?? items.length
  let page = 2
  while (items.length < total && page <= MAX_PAGES) {
    const next = requireServerSuccess(
      await getModels({
        p: page,
        page_size: PAGE_SIZE,
        include_channel_models: true,
      })
    )
    const batch = next.data?.items ?? []
    if (batch.length === 0) break
    items.push(...batch)
    page += 1
  }
  return items
}

export async function getTopologyGraph(): Promise<TopologyGraphPayload> {
  const [channels, models, groupsResponse, pricing] = await Promise.all([
    fetchAllChannels(),
    fetchAllModels(),
    getGroups(),
    getPricing().catch(() => null),
  ])
  const groups = requireServerSuccess(groupsResponse).data ?? []
  let groupRatio: Record<string, number> = {}
  let modelPrices = buildModelPrices([])
  if (pricing) {
    try {
      const pricingPayload = requireServerSuccess(pricing)
      groupRatio = pricingPayload.group_ratio ?? {}
      modelPrices = buildModelPrices(pricingPayload.data ?? [])
    } catch {
      /* pricing is optional for the canvas */
    }
  }
  return { channels, models, groups, groupRatio, modelPrices }
}

const layoutRequest = {
  skipErrorHandler: true,
  skipBusinessError: true,
} as const

export async function getTopologyLayout(): Promise<TopologyLayout> {
  try {
    const res = await api.get('/api/channel/topology_layout', layoutRequest)
    const payload = requireServerSuccess(res.data)
    const data = payload.data as TopologyLayout | undefined
    if (!data || typeof data !== 'object') {
      return emptyTopologyLayout()
    }
    return {
      ...emptyTopologyLayout(),
      ...data,
      version: data.version || 1,
      positions: data.positions ?? {},
      collapsed: data.collapsed ?? {},
    }
  } catch {
    return emptyTopologyLayout()
  }
}

export async function saveTopologyLayout(layout: TopologyLayout) {
  const res = await api.put(
    '/api/channel/topology_layout',
    layout,
    layoutRequest
  )
  return requireServerSuccess(res.data)
}
