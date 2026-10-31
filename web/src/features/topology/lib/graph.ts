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

import { CHANNEL_STATUS } from '@/features/channels/constants'
import {
  parseGroupsList,
  parseModelsList,
} from '@/features/channels/lib/channel-utils'
import type { Model } from '@/features/models/types'

import {
  MAX_VISIBLE_MODELS,
  channelNodeId,
  groupNodeId,
  modelNodeId,
  type TopologyChannelData,
  type TopologyEdge,
  type TopologyFilters,
  type TopologyGraphPayload,
  type TopologyGroupData,
  type TopologyModelData,
  type TopologyNode,
} from '../types'
import { topologyColor } from './colors'

export type TopologySelection = {
  nodeId?: string
  channelId?: number
  groupName?: string
}

export function resolveTopologyModel(models: Model[], name: string): Model {
  // Channel-only models all have id 0, so identity must come from the name.
  const model = models.find((candidate) => candidate.model_name === name)
  if (model) return model
  return {
    id: 0,
    model_name: name,
    has_metadata: false,
    status: 1,
    sync_official: 1,
    name_rule: 0,
    created_time: 0,
    updated_time: 0,
  }
}

function uniqueSorted(values: Iterable<string>) {
  return [...new Set(values)].sort((a, b) => {
    if (a === 'default') return -1
    if (b === 'default') return 1
    return a.localeCompare(b)
  })
}

function matchesSearch(text: string, search: string) {
  if (!search) return true
  return text.toLowerCase().includes(search)
}

export function buildTopologyGraph(
  payload: TopologyGraphPayload,
  filters: TopologyFilters,
  selection: TopologySelection = {}
) {
  const search = filters.search.trim().toLowerCase()
  const selectedGroup = filters.group.trim()
  const selectedChannel = filters.channel.trim()
  const selectedModel = filters.model.trim()

  const registryByName = new Map<string, Model>()
  for (const model of payload.models) {
    if (model.model_name) registryByName.set(model.model_name, model)
  }

  const channelGroups = new Map<number, string[]>()
  const channelModels = new Map<number, string[]>()
  const groupChannels = new Map<string, Set<number>>()
  const modelChannels = new Map<string, Set<number>>()

  for (const channel of payload.channels) {
    const groups = parseGroupsList(channel.group)
    const models = parseModelsList(channel.models)
    channelGroups.set(channel.id, groups)
    channelModels.set(channel.id, models)
    for (const group of groups) {
      const set = groupChannels.get(group) ?? new Set<number>()
      set.add(channel.id)
      groupChannels.set(group, set)
    }
    for (const modelName of models) {
      const set = modelChannels.get(modelName) ?? new Set<number>()
      set.add(channel.id)
      modelChannels.set(modelName, set)
    }
  }

  const groupNames = uniqueSorted([...payload.groups, ...groupChannels.keys()])
  const modelNames = uniqueSorted([
    ...registryByName.keys(),
    ...modelChannels.keys(),
  ])

  const visibleChannels = payload.channels.filter((channel) => {
    if (selectedChannel && String(channel.id) !== selectedChannel) return false
    if (
      selectedGroup &&
      !parseGroupsList(channel.group).includes(selectedGroup)
    ) {
      return false
    }
    if (
      selectedModel &&
      !parseModelsList(channel.models).includes(selectedModel)
    ) {
      return false
    }
    if (!search) return true
    const haystack = [
      channel.name,
      channel.group,
      channel.models,
      String(channel.id),
    ].join(' ')
    return matchesSearch(haystack, search)
  })

  const visibleChannelIds = new Set(
    visibleChannels.map((channel) => channel.id)
  )

  const visibleGroups = groupNames.filter((name) => {
    if (selectedGroup && name !== selectedGroup) return false
    const bound = [...(groupChannels.get(name) ?? [])]
    if (search && !matchesSearch(name, search)) {
      return bound.some((id) => visibleChannelIds.has(id))
    }
    if (
      !search &&
      selectedGroup === '' &&
      selectedChannel === '' &&
      selectedModel === ''
    ) {
      return true
    }
    return (
      bound.some((id) => visibleChannelIds.has(id)) ||
      matchesSearch(name, search)
    )
  })

  const relatedModelNames = new Set<string>()
  for (const channel of visibleChannels) {
    for (const modelName of channelModels.get(channel.id) ?? []) {
      relatedModelNames.add(modelName)
    }
  }

  const selectedChannelModels = selection.channelId
    ? new Set(channelModels.get(selection.channelId) ?? [])
    : new Set<string>()

  let visibleModelNames = modelNames.filter((name) => {
    if (selectedModel && name !== selectedModel) return false
    if (search && matchesSearch(name, search)) return true
    if (selectedChannelModels.has(name)) return true
    if (selectedGroup || selectedChannel || selectedModel || search) {
      return relatedModelNames.has(name)
    }
    return relatedModelNames.has(name) || registryByName.has(name)
  })

  const truncated =
    !search &&
    !selection.channelId &&
    !selectedGroup &&
    visibleModelNames.length > MAX_VISIBLE_MODELS

  if (truncated) {
    visibleModelNames = [...visibleModelNames]
      .sort(
        (a, b) =>
          (modelChannels.get(b)?.size ?? 0) - (modelChannels.get(a)?.size ?? 0)
      )
      .slice(0, MAX_VISIBLE_MODELS)
  }

  const visibleModelSet = new Set(visibleModelNames)
  const visibleGroupSet = new Set(visibleGroups)

  const nodes: TopologyNode[] = [
    ...visibleGroups.map((name) => {
      const channelIds = [...(groupChannels.get(name) ?? [])]
      const models = new Set<string>()
      for (const channelId of channelIds) {
        for (const modelName of channelModels.get(channelId) ?? []) {
          models.add(modelName)
        }
      }
      return {
        id: groupNodeId(name),
        type: 'userGroup' as const,
        position: { x: 0, y: 0 },
        data: {
          name,
          channelCount: channelIds.length,
          modelCount: models.size,
          ratio: payload.groupRatio?.[name] ?? null,
          color: topologyColor(`group:${name}`),
        } satisfies TopologyGroupData,
      }
    }),
    ...visibleChannels.map((channel) => ({
      id: channelNodeId(channel.id),
      type: 'channel' as const,
      position: { x: 0, y: 0 },
      data: {
        channelId: channel.id,
        channel,
        color: topologyColor(`channel:${channel.id}`),
      } satisfies TopologyChannelData,
    })),
    ...visibleModelNames.map((name) => {
      const model = registryByName.get(name)
      const price = payload.modelPrices?.[name]
      return {
        id: modelNodeId(name),
        type: 'model' as const,
        position: { x: 0, y: 0 },
        data: {
          name,
          registryId: model && model.id > 0 ? model.id : undefined,
          channelCount: modelChannels.get(name)?.size ?? 0,
          vendorId: model?.vendor_id,
          status: model?.status,
          icon: price?.icon,
          vendorIcon: price?.vendorIcon,
          pricing: price?.pricing,
          color: topologyColor(`model:${name}`),
        } satisfies TopologyModelData,
      }
    }),
  ]

  const edges: TopologyEdge[] = []
  for (const channel of visibleChannels) {
    const channelId = channelNodeId(channel.id)
    const channelDisabled = channel.status !== CHANNEL_STATUS.ENABLED
    for (const group of channelGroups.get(channel.id) ?? []) {
      if (!visibleGroupSet.has(group)) continue
      const color = topologyColor(`group:${group}`)
      edges.push({
        id: `gc:${group}:${channel.id}`,
        source: groupNodeId(group),
        target: channelId,
        sourceHandle: 'out',
        targetHandle: 'in-group',
        type: 'default',
        style: channelDisabled
          ? { stroke: '#94a3b8', strokeWidth: 1.2, opacity: 0.55 }
          : {
              stroke: color,
              strokeWidth: 1.3,
              strokeDasharray: '5 8',
              opacity: 0.5,
            },
        data: { color, disabled: channelDisabled },
      })
    }
    for (const modelName of channelModels.get(channel.id) ?? []) {
      if (!visibleModelSet.has(modelName)) continue
      const color = topologyColor(`channel:${channel.id}`)
      const registeredModel = registryByName.get(modelName)
      const disabled =
        channelDisabled ||
        (registeredModel != null && registeredModel.status !== 1)
      edges.push({
        id: `cm:${channel.id}:${modelName}`,
        source: channelId,
        target: modelNodeId(modelName),
        sourceHandle: 'out-model',
        targetHandle: 'in',
        type: 'default',
        style: disabled
          ? { stroke: '#94a3b8', strokeWidth: 1.2, opacity: 0.55 }
          : {
              stroke: color,
              strokeWidth: 1.3,
              strokeDasharray: '5 8',
              opacity: 0.38,
            },
        data: { color, disabled },
      })
    }
  }

  return {
    nodes,
    edges,
    truncated,
    totalModels: modelNames.length,
    shownModels: visibleModelNames.length,
    stats: {
      groups: groupNames.length,
      channels: payload.channels.length,
      models: modelNames.length,
      connections: edges.length,
    },
  }
}

export function addUniqueItem(list: string[], item: string) {
  if (list.includes(item)) return list
  return [...list, item]
}

export function removeItem(list: string[], item: string) {
  return list.filter((value) => value !== item)
}
