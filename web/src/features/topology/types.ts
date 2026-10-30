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

import type { Edge, Node } from '@xyflow/react'

import type { Channel } from '@/features/channels/types'
import type { Model } from '@/features/models/types'

export type TopologyNodeType = 'userGroup' | 'channel' | 'model'

export type TopologyGroupData = {
  name: string
  channelCount: number
  modelCount: number
  ratio?: number | null
  color: string
}

export type TopologyChannelData = {
  channelId: number
  name: string
  type: number
  status: number
  groupCount: number
  modelCount: number
  pluginKey?: string
  usedQuota: number
  balance: number
  responseTime: number
  color: string
}

export type TopologyModelData = {
  name: string
  registryId?: number
  channelCount: number
  vendorId?: number
  status?: number
  icon?: string
  vendorIcon?: string
  priceText?: string
  priceUnit?: string
  color: string
}

export type TopologyNode =
  | Node<TopologyGroupData, 'userGroup'>
  | Node<TopologyChannelData, 'channel'>
  | Node<TopologyModelData, 'model'>

export type TopologyEdge = Edge

export type TopologyViewport = {
  x: number
  y: number
  zoom: number
}

export type TopologyLayout = {
  version: number
  viewport?: Partial<TopologyViewport>
  positions: Record<string, { x: number; y: number }>
  collapsed?: Record<string, boolean>
}

export type TopologyModelPrice = {
  name: string
  icon?: string
  vendorIcon?: string
  quotaType: number
  priceText: string
  priceUnit: string
}

export type TopologyGraphPayload = {
  channels: Channel[]
  models: Model[]
  groups: string[]
  groupRatio: Record<string, number>
  modelPrices: Record<string, TopologyModelPrice>
}

export type TopologyFilters = {
  search: string
  group: string
  status: string
}

export const TOPOLOGY_LAYOUT_VERSION = 1
export const MAX_VISIBLE_MODELS = 100

export function groupNodeId(name: string) {
  return `group:${name}`
}

export function channelNodeId(id: number) {
  return `channel:${id}`
}

export function modelNodeId(name: string) {
  return `model:${name}`
}

export function parseGroupNodeId(id: string) {
  return id.startsWith('group:') ? id.slice('group:'.length) : null
}

export function parseChannelNodeId(id: string) {
  if (!id.startsWith('channel:')) return null
  const value = Number(id.slice('channel:'.length))
  return Number.isFinite(value) ? value : null
}

export function parseModelNodeId(id: string) {
  return id.startsWith('model:') ? id.slice('model:'.length) : null
}

export function emptyTopologyLayout(): TopologyLayout {
  return {
    version: TOPOLOGY_LAYOUT_VERSION,
    viewport: { x: 0, y: 0, zoom: 1 },
    positions: {},
    collapsed: {},
  }
}
