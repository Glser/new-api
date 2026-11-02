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
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { ConfirmDialog } from '@/components/confirm-dialog'
import { EmptyState } from '@/components/empty-state'
import { Main } from '@/components/layout'
import { RenderWhenOpen } from '@/components/render-when-open'
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
import { ModelDeleteDialog } from '@/features/models/components/dialogs/model-delete-dialog'
import { ModelsDialogs } from '@/features/models/components/models-dialogs'
import {
  ModelsProvider,
  useModels,
} from '@/features/models/components/models-provider'
import { modelsQueryKeys, vendorsQueryKeys } from '@/features/models/lib/query-keys'
import {
  ADMIN_PERMISSION_ACTIONS,
  ADMIN_PERMISSION_RESOURCES,
  hasPermission,
} from '@/lib/admin-permissions'
import { handleServerError } from '@/lib/handle-server-error'
import { ROLE } from '@/lib/roles'
import { useAuthStore } from '@/stores/auth-store'
import { useTheme } from '@/context/theme-provider'

import { getTopologyGraph, getTopologyLayout, saveTopologyLayout } from './api'
import { GroupMutateDrawer } from './components/group-mutate-drawer'
import { deleteTopologyGroup } from './group-api'
import { TopologyCanvas } from './components/topology-canvas'
import { TopologyNodeActionsProvider } from './components/topology-nodes'
import {
  TopologyGroupingPrompt,
  TopologyOverlays,
} from './components/topology-overlays'
import { TopologyTrafficProvider } from './components/topology-traffic-provider'
import {
  addUniqueItem,
  buildTopologyGraph,
  removeItem,
  resolveTopologyModel,
} from './lib/graph'
import { createClusterBounds, layoutGraphNodes } from './lib/layout'
import {
  TOPOLOGY_LAYOUT_VERSION,
  emptyTopologyLayout,
  clusterNodeId,
  groupNodeId,
  parseChannelNodeId,
  parseClusterNodeId,
  parseGroupNodeId,
  parseModelNodeId,
  type TopologyEdge,
  type TopologyFilters,
  type TopologyGraphPayload,
  type TopologyLayout,
  type TopologyNode,
} from './types'

const topologyQueryKeys = {
  graph: ['topology-graph'] as const,
  layout: ['topology-layout'] as const,
}

function TopologyCanvasBody(props: {
  loading: boolean
  graphNodes: TopologyNode[]
  graphEdges: TopologyEdge[]
  layout: TopologyLayout
  canWrite: boolean
  relayoutVersion: number
  onLayoutChange: (patch: Partial<TopologyLayout>) => void
  onConnect: (connection: Connection) => Promise<boolean> | boolean
  onDeleteEdges: (edges: TopologyEdge[]) => Promise<boolean> | boolean
  onNodeClick: (node: TopologyNode) => void
  onSelectionChange?: (nodeIds: string[]) => void
  onSelectionComplete?: (payload: {
    nodeIds: string[]
    clientX: number
    clientY: number
  }) => void
  onCreateChannel: () => void
  showMiniMap?: boolean
  focusNodeId?: string
  groupingMode?: boolean
  selectionResetKey?: number
}) {
  const { t } = useTranslation()
  if (props.loading) {
    return <Skeleton className='h-full min-h-[28rem] rounded-2xl' />
  }
  if (props.graphNodes.length === 0) {
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
      onSelectionChange={props.onSelectionChange}
      showMiniMap={props.showMiniMap}
      focusNodeId={props.focusNodeId}
      groupingMode={props.groupingMode}
      onSelectionComplete={props.onSelectionComplete}
      selectionResetKey={props.selectionResetKey}
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
    channel: '',
    model: '',
  })
  const [searchInput, setSearchInput] = useState('')
  const [showMiniMap, setShowMiniMap] = useState(false)
  const [liveTraffic, setLiveTraffic] = useState(true)
  const [groupDrawerOpen, setGroupDrawerOpen] = useState(false)
  const [editingGroupName, setEditingGroupName] = useState<string>()
  const [focusNodeId, setFocusNodeId] = useState<string>()
  const [selectedNodeId, setSelectedNodeId] = useState<string>()
  const [groupingMode, setGroupingMode] = useState(false)
  const [selectionResetKey, setSelectionResetKey] = useState(0)
  const [pendingCluster, setPendingCluster] = useState<{
    memberIds: string[]
    x: number
    y: number
  }>()
  const [relayoutVersion] = useState(0)
  const [pendingGroupDelete, setPendingGroupDelete] = useState<string>()
  const [pendingModelDelete, setPendingModelDelete] = useState<string>()
  const layoutRef = useRef<TopologyLayout>(emptyTopologyLayout())
  const saveTimer = useRef<number | undefined>(undefined)
  const canWriteRef = useRef(canWrite)
  useLayoutEffect(() => {
    canWriteRef.current = canWrite
  }, [canWrite])

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
      if (
        !Array.isArray(key) ||
        (key[0] !== channelsQueryKeys.all[0] &&
          key[0] !== modelsQueryKeys.all[0] &&
          key[0] !== vendorsQueryKeys.all[0] &&
          key[0] !== 'system-options')
      ) {
        return
      }
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

  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'
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
    return buildTopologyGraph(graphQuery.data, filters, selection, isDark)
  }, [filters, graphQuery.data, isDark, selection])

  const handleChannelStatusChanged = useCallback(
    (channelId: number, status: number) => {
      queryClient.setQueryData<TopologyGraphPayload>(
        topologyQueryKeys.graph,
        (current) =>
          current
            ? {
                ...current,
                channels: current.channels.map((channel) =>
                  channel.id === channelId ? { ...channel, status } : channel
                ),
              }
            : current
      )
      void queryClient.invalidateQueries({
        queryKey: topologyQueryKeys.graph,
      })
    },
    [queryClient]
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

  const handleDeleteGroup = useCallback((name: string) => {
    setPendingGroupDelete(name)
  }, [])

  const handleDeleteModel = useCallback((name: string) => {
    setPendingModelDelete(name)
  }, [])

  const clearCanvasSelection = useCallback(() => {
    setSelectionResetKey((key) => key + 1)
  }, [])

  const exitGroupingMode = useCallback(() => {
    setGroupingMode(false)
    setPendingCluster(undefined)
    clearCanvasSelection()
  }, [clearCanvasSelection])

  const handleSelectionComplete = useCallback(
    (payload: { nodeIds: string[]; clientX: number; clientY: number }) => {
      if (!groupingMode) return
      const memberIds = payload.nodeIds.filter((id) => !parseClusterNodeId(id))
      if (memberIds.length < 2) {
        setPendingCluster(undefined)
        return
      }
      setPendingCluster({
        memberIds,
        x: payload.clientX,
        y: payload.clientY,
      })
    },
    [groupingMode]
  )

  const confirmPendingCluster = useCallback(() => {
    const memberIds = pendingCluster?.memberIds ?? []
    if (memberIds.length < 2) return
    const clusterId = clusterNodeId(`g${Date.now()}`)
    const layout = layoutRef.current
    const nextClusters = { ...layout.clusters }
    for (const [id, cluster] of Object.entries(nextClusters)) {
      const remaining = cluster.memberIds.filter(
        (memberId) => !memberIds.includes(memberId)
      )
      if (remaining.length < 2) {
        delete nextClusters[id]
        continue
      }
      nextClusters[id] = { ...cluster, memberIds: remaining }
    }
    nextClusters[clusterId] = {
      name: t('Card group'),
      memberIds,
    }
    persistLayout({
      ...layout,
      clusters: nextClusters,
    })
    exitGroupingMode()
  }, [exitGroupingMode, pendingCluster, persistLayout, t])

  useEffect(() => {
    if (!groupingMode) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      exitGroupingMode()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [exitGroupingMode, groupingMode])

  const handleDeleteCluster = useCallback(
    (clusterId: string) => {
      const layout = layoutRef.current
      const clusters = { ...layout.clusters }
      delete clusters[clusterId]
      persistLayout({ ...layout, clusters })
    },
    [persistLayout]
  )

  const graphNodes = useMemo(() => {
    const layout = layoutQuery.data ?? emptyTopologyLayout()
    const actionNodes = layoutGraphNodes(graph.nodes, layout).map((node) => ({
      ...node,
      zIndex: 1,
    }))
    const clusterNodes: TopologyNode[] = []
    for (const [clusterId, cluster] of Object.entries(layout.clusters ?? {})) {
      const memberIds = cluster.memberIds.filter((id) =>
        actionNodes.some((node) => node.id === id)
      )
      if (memberIds.length < 2) continue
      const bounds = createClusterBounds(actionNodes, memberIds)
      clusterNodes.push({
        id: clusterNodeId(clusterId),
        type: 'cluster',
        position: { x: bounds.x, y: bounds.y },
        style: { width: bounds.width, height: bounds.height },
        width: bounds.width,
        height: bounds.height,
        zIndex: 0,
        selectable: false,
        connectable: false,
        dragHandle: '.topology-cluster-handle',
        data: {
          name: cluster.name,
          memberIds,
          color: '#64748b',
        },
      })
    }
    return [...clusterNodes, ...actionNodes]
  }, [graph.nodes, layoutQuery.data])

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
      if (groupingMode) return
      setSelectedNodeId(node.id)
      if (node.type === 'userGroup') {
        if (user?.role !== ROLE.SUPER_ADMIN) {
          toast.message(
            t('Group settings are managed by a super administrator.')
          )
          return
        }
        setEditingGroupName(node.data.name)
        setGroupDrawerOpen(true)
        return
      }
      if (node.type === 'channel') {
        const channel = node.data.channel ?? findChannel(node.data.channelId)
        if (!channel) return
        setCurrentChannel(channel)
        setChannelOpen('update-channel')
        return
      }
      if (node.type === 'model') {
        setCurrentModel(
          resolveTopologyModel(graphQuery.data?.models ?? [], node.data.name)
        )
        setModelOpen('update-model')
      }
    },
    [
      findChannel,
      graphQuery.data,
      setChannelOpen,
      setCurrentChannel,
      setCurrentModel,
      setModelOpen,
      groupingMode,
      t,
      user?.role,
    ]
  )


  const groupOptions = graphQuery.data?.groups ?? []
  const loading = graphQuery.isLoading || layoutQuery.isLoading
  const stats = graph.stats
  return (
    <Main>
      <TopologyTrafficProvider enabled={liveTraffic}>
        <TopologyNodeActionsProvider
          value={{
            canWrite,
            onStatusChanged: handleChannelStatusChanged,
            onDeleteGroup: handleDeleteGroup,
            onDeleteModel: handleDeleteModel,
            onDeleteCluster: handleDeleteCluster,
          }}
        >
        <div className='relative min-h-0 flex-1 overflow-hidden'>
          <TopologyCanvasBody
            loading={loading}
            graphNodes={graphNodes}
            graphEdges={graph.edges}
            layout={layoutQuery.data ?? emptyTopologyLayout()}
            canWrite={canWrite}
            relayoutVersion={relayoutVersion}
            showMiniMap={showMiniMap}
            focusNodeId={focusNodeId}
            onLayoutChange={handleLayoutChange}
            onConnect={handleConnect}
            onDeleteEdges={handleDeleteEdges}
            onNodeClick={handleNodeClick}
            onSelectionComplete={handleSelectionComplete}
            groupingMode={groupingMode}
            selectionResetKey={selectionResetKey}
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
            channels={graphQuery.data?.channels ?? []}
            models={
              graphQuery.data?.models
                .map((model) => model.model_name)
                .filter(Boolean) ?? []
            }
            stats={stats}
            truncated={graph.truncated}
            shownModels={graph.shownModels}
            totalModels={graph.totalModels}
            loading={loading}
            refreshing={graphQuery.isFetching}
            canWrite={canWrite}
            canCreateGroup={user?.role === ROLE.SUPER_ADMIN}
            showMiniMap={showMiniMap}
            onToggleMiniMap={() => setShowMiniMap((value) => !value)}
            liveTraffic={liveTraffic}
            onToggleLiveTraffic={() => setLiveTraffic((value) => !value)}
            onRefresh={() => {
              void graphQuery.refetch()
              void layoutQuery.refetch()
            }}
            canCreateCluster={canWrite}
            groupingMode={groupingMode}
            onCreateCluster={() => {
              if (groupingMode) {
                exitGroupingMode()
                return
              }
              setPendingCluster(undefined)
              setGroupingMode(true)
              toast.message(t('Drag a box to select cards'))
            }}
            onCreateGroup={() => {
              setEditingGroupName(undefined)
              setGroupDrawerOpen(true)
            }}
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
        </TopologyNodeActionsProvider>
      </TopologyTrafficProvider>
      <ChannelsDialogs />
      <ModelsDialogs />
      <TopologyGroupingPrompt
        open={pendingCluster != null}
        count={pendingCluster?.memberIds.length ?? 0}
        x={pendingCluster?.x ?? 0}
        y={pendingCluster?.y ?? 0}
        onConfirm={confirmPendingCluster}
        onCancel={() => {
          setPendingCluster(undefined)
          clearCanvasSelection()
        }}
      />
      <ConfirmDialog
        open={pendingGroupDelete != null}
        onOpenChange={(open) => {
          if (!open) setPendingGroupDelete(undefined)
        }}
        title={t('Delete group')}
        desc={t(
          'Are you sure you want to delete group "{{name}}"? This action cannot be undone.',
          { name: pendingGroupDelete ?? '' }
        )}
        confirmText={t('Delete')}
        destructive
        handleConfirm={() => {
          if (!pendingGroupDelete) return
          const groupName = pendingGroupDelete
          const boundChannels = (graphQuery.data?.channels ?? []).filter(
            (channel) => parseGroupsList(channel.group).includes(groupName)
          )
          void Promise.all(
            boundChannels.map((channel) =>
              updateChannel(channel.id, {
                group: formatGroupsString(
                  removeItem(parseGroupsList(channel.group), groupName)
                ),
              })
            )
          )
            .then(() => deleteTopologyGroup(groupName))
            .then(async () => {
              toast.success(t('Group deleted'))
              setPendingGroupDelete(undefined)
              await queryClient.invalidateQueries({
                queryKey: topologyQueryKeys.graph,
              })
            })
            .catch((error: Error) => {
              handleServerError(error, t('Failed to delete group'))
            })
        }}
      />
      {pendingModelDelete ? (
        <ModelDeleteDialog
          models={[
            resolveTopologyModel(
              graphQuery.data?.models ?? [],
              pendingModelDelete
            ),
          ]}
          onClose={() => setPendingModelDelete(undefined)}
          onSuccess={() => {
            setPendingModelDelete(undefined)
            void queryClient.invalidateQueries({
              queryKey: topologyQueryKeys.graph,
            })
          }}
        />
      ) : null}
      {user?.role === ROLE.SUPER_ADMIN && (
        <RenderWhenOpen open={groupDrawerOpen}>
          <GroupMutateDrawer
            key={
              editingGroupName === undefined
                ? 'create'
                : `edit:${editingGroupName}`
            }
            open={groupDrawerOpen}
            groupName={editingGroupName}
            onOpenChange={setGroupDrawerOpen}
            onSaved={(name) => {
              setSearchInput('')
              setFilters({ search: '', group: '', channel: '', model: '' })
              setSelectedNodeId(groupNodeId(name))
              setFocusNodeId(groupNodeId(name))
            }}
          />
        </RenderWhenOpen>
      )}
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
