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

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Connection } from '@xyflow/react'
import { Plus } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { EmptyState } from '@/components/empty-state'
import { Main } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { updateChannel } from '@/features/channels/api'
import { ChannelsDialogs } from '@/features/channels/components/channels-dialogs'
import {
  ChannelsProvider,
  useChannels,
} from '@/features/channels/components/channels-provider'
import {
  channelsQueryKeys,
  formatGroupsString,
  formatModelsString,
  parseGroupsList,
  parseModelsList,
} from '@/features/channels/lib'
import { ModelsDialogs } from '@/features/models/components/models-dialogs'
import {
  ModelsProvider,
  useModels,
} from '@/features/models/components/models-provider'
import { modelsQueryKeys } from '@/features/models/lib/query-keys'
import {
  ADMIN_PERMISSION_ACTIONS,
  ADMIN_PERMISSION_RESOURCES,
  hasPermission,
} from '@/lib/admin-permissions'
import { handleServerError } from '@/lib/handle-server-error'
import { useAuthStore } from '@/stores/auth-store'

import { getTopologyGraph, getTopologyLayout, saveTopologyLayout } from './api'
import { TopologyCanvas } from './components/topology-canvas'
import { TopologyOverlays } from './components/topology-overlays'
import { TopologyTrafficProvider } from './components/topology-traffic-provider'
import { addUniqueItem, buildTopologyGraph, removeItem } from './lib/graph'
import { layoutGraphNodes } from './lib/layout'
import {
  TOPOLOGY_LAYOUT_VERSION,
  emptyTopologyLayout,
  parseChannelNodeId,
  parseGroupNodeId,
  parseModelNodeId,
  type TopologyEdge,
  type TopologyFilters,
  type TopologyLayout,
  type TopologyNode,
} from './types'

const topologyQueryKeys = {
  graph: ['topology-graph'] as const,
  layout: ['topology-layout'] as const,
}

function TopologyCanvasBody(props: {
  loading: boolean
  hasChannels: boolean
  graphNodes: TopologyNode[]
  graphEdges: TopologyEdge[]
  layout: TopologyLayout
  canWrite: boolean
  relayoutVersion: number
  onLayoutChange: (patch: Partial<TopologyLayout>) => void
  onConnect: (connection: Connection) => Promise<boolean> | boolean
  onDeleteEdges: (edges: TopologyEdge[]) => Promise<boolean> | boolean
  onNodeClick: (node: TopologyNode) => void
  onCreateChannel: () => void
  showMiniMap?: boolean
}) {
  const { t } = useTranslation()
  if (props.loading) {
    return <Skeleton className='h-full min-h-[28rem] rounded-2xl' />
  }
  if (!props.hasChannels) {
    return (
      <EmptyState
        title={t('No channels yet')}
        description={t('Create a channel to start mapping groups and models')}
        action={
          props.canWrite ? (
            <Button size='sm' onClick={props.onCreateChannel}>
              <Plus data-icon='inline-start' />
              {t('Create Channel')}
            </Button>
          ) : null
        }
      />
    )
  }
  return (
    <TopologyCanvas
      graphNodes={props.graphNodes}
      graphEdges={props.graphEdges}
      layout={props.layout}
      canWrite={props.canWrite}
      relayoutVersion={props.relayoutVersion}
      onLayoutChange={props.onLayoutChange}
      onConnect={props.onConnect}
      onDeleteEdges={props.onDeleteEdges}
      onNodeClick={props.onNodeClick}
      showMiniMap={props.showMiniMap}
    />
  )
}

function TopologyWorkspace() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const { setOpen: setChannelOpen, setCurrentRow: setCurrentChannel } =
    useChannels()
  const { setOpen: setModelOpen, setCurrentRow: setCurrentModel } = useModels()
  const user = useAuthStore((state) => state.auth.user)
  const canWrite = hasPermission(
    user,
    ADMIN_PERMISSION_RESOURCES.CHANNEL,
    ADMIN_PERMISSION_ACTIONS.WRITE
  )
  const [filters, setFilters] = useState<TopologyFilters>({
    search: '',
    group: '',
    status: '',
  })
  const [searchInput, setSearchInput] = useState('')
  const [showMiniMap, setShowMiniMap] = useState(false)
  const [liveTraffic, setLiveTraffic] = useState(true)
  const [selectedNodeId, setSelectedNodeId] = useState<string>()
  const [relayoutVersion, setRelayoutVersion] = useState(0)
  const layoutRef = useRef<TopologyLayout>(emptyTopologyLayout())
  const saveTimer = useRef<number | undefined>(undefined)
  const canWriteRef = useRef(canWrite)
  canWriteRef.current = canWrite

  const graphQuery = useQuery({
    queryKey: topologyQueryKeys.graph,
    queryFn: getTopologyGraph,
    staleTime: 30 * 1000,
  })
  const layoutQuery = useQuery({
    queryKey: topologyQueryKeys.layout,
    queryFn: getTopologyLayout,
    staleTime: 60 * 1000,
  })

  useEffect(() => {
    return queryClient.getQueryCache().subscribe((event) => {
      if (event.type !== 'updated') return
      const key = event.query.queryKey
      if (!Array.isArray(key) || key[0] !== channelsQueryKeys.all[0]) return
      void queryClient.invalidateQueries({ queryKey: topologyQueryKeys.graph })
    })
  }, [queryClient])

  useEffect(() => {
    const handle = window.setTimeout(() => {
      setFilters((current) => ({ ...current, search: searchInput }))
    }, 250)
    return () => window.clearTimeout(handle)
  }, [searchInput])

  useEffect(() => {
    if (layoutQuery.data) layoutRef.current = layoutQuery.data
  }, [layoutQuery.data])

  const selection = useMemo(() => {
    if (!selectedNodeId) return {}
    const channelId = parseChannelNodeId(selectedNodeId)
    const groupName = parseGroupNodeId(selectedNodeId)
    return {
      nodeId: selectedNodeId,
      channelId: channelId ?? undefined,
      groupName: groupName ?? undefined,
    }
  }, [selectedNodeId])

  const graph = useMemo(() => {
    if (!graphQuery.data) {
      return {
        nodes: [] as TopologyNode[],
        edges: [] as TopologyEdge[],
        truncated: false,
        totalModels: 0,
        shownModels: 0,
        stats: { groups: 0, channels: 0, models: 0, connections: 0 },
      }
    }
    return buildTopologyGraph(graphQuery.data, filters, selection)
  }, [filters, graphQuery.data, selection])

  const graphNodes = useMemo(
    () =>
      layoutGraphNodes(graph.nodes, layoutQuery.data ?? emptyTopologyLayout()),
    [graph.nodes, layoutQuery.data]
  )

  const persistLayout = useCallback(
    (next: TopologyLayout, immediate = false) => {
      queryClient.setQueryData(topologyQueryKeys.layout, next)
      if (!canWrite) return
      window.clearTimeout(saveTimer.current)
      const flush = async () => {
        saveTimer.current = undefined
        try {
          await saveTopologyLayout(next)
        } catch (error) {
          handleServerError(error, t('Failed to save layout'))
        }
      }
      if (immediate) {
        void flush()
        return
      }
      saveTimer.current = window.setTimeout(() => {
        void flush()
      }, 800)
    },
    [canWrite, queryClient, t]
  )

  useEffect(() => {
    return () => {
      window.clearTimeout(saveTimer.current)
      if (!canWriteRef.current) return
      const pending = layoutRef.current
      if (Object.keys(pending.positions).length === 0) return
      void saveTopologyLayout(pending).catch(() => undefined)
    }
  }, [])

  const handleLayoutChange = useCallback(
    (patch: Partial<TopologyLayout>) => {
      const current = layoutRef.current
      const next: TopologyLayout = {
        ...current,
        ...patch,
        version: TOPOLOGY_LAYOUT_VERSION,
        positions: patch.positions ?? current.positions,
        viewport: patch.viewport ?? current.viewport,
      }
      layoutRef.current = next
      persistLayout(next)
    },
    [persistLayout]
  )

  const invalidateGraph = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: topologyQueryKeys.graph }),
      queryClient.invalidateQueries({ queryKey: channelsQueryKeys.lists() }),
      queryClient.invalidateQueries({ queryKey: modelsQueryKeys.lists() }),
    ])
  }, [queryClient])

  const bindMutation = useMutation({
    mutationFn: async (input: {
      id: number
      models?: string
      group?: string
    }) => {
      return updateChannel(input.id, input)
    },
    onSuccess: async () => {
      toast.success(t('Binding updated'))
      await invalidateGraph()
    },
    onError: (error: Error) => {
      handleServerError(error, t('Failed to update binding'))
    },
  })

  const findChannel = useCallback(
    (id: number) =>
      graphQuery.data?.channels.find((channel) => channel.id === id),
    [graphQuery.data?.channels]
  )

  const handleConnect = useCallback(
    async (connection: Connection) => {
      const source = connection.source ?? ''
      const target = connection.target ?? ''
      const groupName = parseGroupNodeId(source)
      const channelFromGroup = parseChannelNodeId(target)
      if (groupName && channelFromGroup != null) {
        const channel = findChannel(channelFromGroup)
        if (!channel) return false
        const groups = addUniqueItem(parseGroupsList(channel.group), groupName)
        await bindMutation.mutateAsync({
          id: channel.id,
          group: formatGroupsString(groups),
        })
        return true
      }
      const channelId = parseChannelNodeId(source)
      const modelName = parseModelNodeId(target)
      if (channelId != null && modelName) {
        const channel = findChannel(channelId)
        if (!channel) return false
        const models = addUniqueItem(parseModelsList(channel.models), modelName)
        await bindMutation.mutateAsync({
          id: channel.id,
          models: formatModelsString(models),
        })
        return true
      }
      toast.error(t('Invalid connection'))
      return false
    },
    [bindMutation, findChannel, t]
  )

  const handleDeleteEdges = useCallback(
    async (removed: TopologyEdge[]) => {
      for (const edge of removed) {
        const groupName = parseGroupNodeId(edge.source)
        const channelFromGroup = parseChannelNodeId(edge.target)
        if (groupName && channelFromGroup != null) {
          const channel = findChannel(channelFromGroup)
          if (!channel) continue
          const groups = removeItem(parseGroupsList(channel.group), groupName)
          if (groups.length === 0) {
            toast.error(t('Channel must keep at least one group'))
            return false
          }
          await bindMutation.mutateAsync({
            id: channel.id,
            group: formatGroupsString(groups),
          })
          continue
        }
        const channelId = parseChannelNodeId(edge.source)
        const modelName = parseModelNodeId(edge.target)
        if (channelId != null && modelName) {
          const channel = findChannel(channelId)
          if (!channel) continue
          const models = removeItem(parseModelsList(channel.models), modelName)
          if (models.length === 0) {
            toast.error(t('Channel must keep at least one model'))
            return false
          }
          await bindMutation.mutateAsync({
            id: channel.id,
            models: formatModelsString(models),
          })
        }
      }
      return true
    },
    [bindMutation, findChannel, t]
  )

  const handleNodeClick = useCallback(
    (node: TopologyNode) => {
      setSelectedNodeId(node.id)
      if (node.type === 'channel') {
        const channel = node.data.channel ?? findChannel(node.data.channelId)
        if (!channel) return
        setCurrentChannel(channel)
        setChannelOpen('update-channel')
        return
      }
      if (node.type === 'model') {
        const registryId = node.data.registryId
        const model = graphQuery.data?.models.find(
          (item) => item.id === registryId
        )
        if (!model) {
          toast.message(t('This model is only configured on channels'))
          return
        }
        setCurrentModel(model)
        setModelOpen('update-model')
      }
    },
    [
      findChannel,
      graphQuery.data?.models,
      setChannelOpen,
      setCurrentChannel,
      setCurrentModel,
      setModelOpen,
      t,
    ]
  )

  const handleRelayout = useCallback(() => {
    setRelayoutVersion((value) => value + 1)
  }, [])

  const groupOptions = graphQuery.data?.groups ?? []
  const loading = graphQuery.isLoading || layoutQuery.isLoading
  const stats = graph.stats

  return (
    <Main>
      <TopologyTrafficProvider enabled={liveTraffic}>
        <div className='relative min-h-0 flex-1 overflow-hidden'>
          <TopologyCanvasBody
            loading={loading}
            hasChannels={Boolean(graphQuery.data?.channels.length)}
            graphNodes={graphNodes}
            graphEdges={graph.edges}
            layout={layoutQuery.data ?? emptyTopologyLayout()}
            canWrite={canWrite}
            relayoutVersion={relayoutVersion}
            showMiniMap={showMiniMap}
            onLayoutChange={handleLayoutChange}
            onConnect={handleConnect}
            onDeleteEdges={handleDeleteEdges}
            onNodeClick={handleNodeClick}
            onCreateChannel={() => {
              setCurrentChannel(null)
              setChannelOpen('create-channel')
            }}
          />
          <TopologyOverlays
            search={searchInput}
            onSearchChange={setSearchInput}
            filters={filters}
            onFiltersChange={setFilters}
            groups={groupOptions}
            stats={stats}
            truncated={graph.truncated}
            shownModels={graph.shownModels}
            totalModels={graph.totalModels}
            loading={loading}
            refreshing={graphQuery.isFetching}
            canWrite={canWrite}
            showMiniMap={showMiniMap}
            onToggleMiniMap={() => setShowMiniMap((value) => !value)}
            liveTraffic={liveTraffic}
            onToggleLiveTraffic={() => setLiveTraffic((value) => !value)}
            onRefresh={() => {
              void graphQuery.refetch()
              void layoutQuery.refetch()
            }}
            onRelayout={handleRelayout}
            onCreateChannel={() => {
              setCurrentChannel(null)
              setChannelOpen('create-channel')
            }}
            onCreateModel={() => {
              setCurrentModel(null)
              setModelOpen('create-model')
            }}
          />
        </div>
      </TopologyTrafficProvider>
      <ChannelsDialogs />
      <ModelsDialogs />
    </Main>
  )
}

export function Topology() {
  return (
    <ChannelsProvider>
      <ModelsProvider>
        <TopologyWorkspace />
      </ModelsProvider>
    </ChannelsProvider>
  )
}
