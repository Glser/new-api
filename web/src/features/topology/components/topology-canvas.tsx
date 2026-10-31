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

import {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  Panel,
  ReactFlow,
  applyEdgeChanges,
  applyNodeChanges,
  type Connection,
  type Edge,
  type EdgeChange,
  type NodeChange,
  type OnBeforeDelete,
  type ReactFlowInstance,
} from '@xyflow/react'
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'

import '@xyflow/react/dist/style.css'
import '../topology-flow.css'

import { useFlashingIds } from '../hooks/use-topology-traffic'
import {
  INITIAL_CANVAS_ZOOM,
  applyAutoLayout,
  collectPositions,
  getInitialViewNodes,
} from '../lib/layout'
import {
  TOPOLOGY_LAYOUT_VERSION,
  type TopologyEdge,
  type TopologyLayout,
  type TopologyNode,
  type TopologyViewport,
} from '../types'
import {
  TopologyChannelNode,
  TopologyGroupNode,
  TopologyModelNode,
} from './topology-nodes'

const nodeTypes = {
  userGroup: TopologyGroupNode,
  channel: TopologyChannelNode,
  model: TopologyModelNode,
}

type TopologyCanvasProps = {
  graphNodes: TopologyNode[]
  graphEdges: TopologyEdge[]
  layout: TopologyLayout
  canWrite: boolean
  relayoutVersion: number
  onLayoutChange: (layout: Partial<TopologyLayout>) => void
  onConnect: (connection: Connection) => Promise<boolean> | boolean
  onDeleteEdges: (edges: TopologyEdge[]) => Promise<boolean> | boolean
  onNodeClick: (node: TopologyNode) => void
  showMiniMap?: boolean
  focusNodeId?: string
}

function isValidTopologyConnection(connection: Connection | Edge) {
  const source = connection.source ?? ''
  const target = connection.target ?? ''
  if (source.startsWith('group:') && target.startsWith('channel:')) return true
  if (source.startsWith('channel:') && target.startsWith('model:')) return true
  return false
}

function applyEdgeFlash(edges: TopologyEdge[], flashingIds: Set<string>) {
  return edges.map((edge) => {
    const flash = edge.data?.disabled !== true && flashingIds.has(edge.id)
    const className = flash ? 'topology-flash-edge' : undefined
    if (edge.className === className && Boolean(edge.animated) === flash) {
      return edge
    }
    return { ...edge, className, animated: flash }
  })
}

function mergeGraphNodes(
  current: TopologyNode[],
  incoming: TopologyNode[]
): TopologyNode[] {
  if (current.length === 0) return incoming
  const currentById = new Map(current.map((node) => [node.id, node]))
  return incoming.map((node) => {
    const previous = currentById.get(node.id)
    if (!previous) return node
    const widthChanged = previous.width !== node.width
    return {
      ...node,
      position: previous.position,
      selected: previous.selected,
      dragging: previous.dragging,
      width: node.width ?? previous.width,
      height: node.type === 'model' ? undefined : previous.height,
      measured: widthChanged ? undefined : previous.measured,
    }
  })
}

export function TopologyCanvas(props: TopologyCanvasProps) {
  const instanceRef = useRef<ReactFlowInstance<
    TopologyNode,
    TopologyEdge
  > | null>(null)
  const fittedRef = useRef(false)
  const focusedNodeRef = useRef<string | undefined>(undefined)
  const viewportReadyRef = useRef(false)
  const migratedRef = useRef(
    (props.layout.version ?? 1) >= TOPOLOGY_LAYOUT_VERSION
  )
  const relayoutSeenRef = useRef(0)
  const onLayoutChangeRef = useRef(props.onLayoutChange)
  const onConnectRef = useRef(props.onConnect)
  const onDeleteEdgesRef = useRef(props.onDeleteEdges)
  const onNodeClickRef = useRef(props.onNodeClick)
  const canWriteRef = useRef(props.canWrite)
  useLayoutEffect(() => {
    onLayoutChangeRef.current = props.onLayoutChange
    onConnectRef.current = props.onConnect
    onDeleteEdgesRef.current = props.onDeleteEdges
    onNodeClickRef.current = props.onNodeClick
    canWriteRef.current = props.canWrite
  }, [
    props.onLayoutChange,
    props.onConnect,
    props.onDeleteEdges,
    props.onNodeClick,
    props.canWrite,
  ])

  const flashingIds = useFlashingIds()
  const draggingRef = useRef(false)
  const [nodes, setNodes] = useState<TopologyNode[]>(props.graphNodes)
  const [edges, setEdges] = useState<TopologyEdge[]>(props.graphEdges)

  useEffect(() => {
    if (draggingRef.current) return
    setNodes((current) => mergeGraphNodes(current, props.graphNodes))
  }, [props.graphNodes])

  useEffect(() => {
    // eslint-disable-next-line react/set-state-in-effect -- Synchronize controlled React Flow edges with the server graph and traffic highlights.
    setEdges(applyEdgeFlash(props.graphEdges, flashingIds))
  }, [flashingIds, props.graphEdges])

  useEffect(() => {
    const id = props.focusNodeId
    if (!id || focusedNodeRef.current === id) return
    if (!props.graphNodes.some((candidate) => candidate.id === id)) return
    let timer: number | undefined
    const focusNode = (attempt = 0) => {
      const instance = instanceRef.current
      const node = instance?.getNode(id)
      // Wait for the controlled nodes and initial viewport to finish updating.
      if (!instance || !node || !viewportReadyRef.current) {
        if (attempt < 40) {
          timer = window.setTimeout(() => focusNode(attempt + 1), 50)
        }
        return
      }
      focusedNodeRef.current = id
      void instance.fitView({
        nodes: [node],
        padding: 0.5,
        maxZoom: 0.9,
        duration: 220,
      })
    }
    focusNode()
    return () => window.clearTimeout(timer)
  }, [props.focusNodeId, props.graphNodes])

  useEffect(() => {
    if (props.graphNodes.length === 0) return
    const staleLayout =
      !migratedRef.current &&
      (props.layout.version ?? 1) < TOPOLOGY_LAYOUT_VERSION
    if (staleLayout) {
      migratedRef.current = true
      setNodes((current) => {
        const next = applyAutoLayout(
          current.length > 0 ? current : props.graphNodes
        )
        onLayoutChangeRef.current({
          version: TOPOLOGY_LAYOUT_VERSION,
          positions: collectPositions(next),
        })
        return next
      })
    }

    if (fittedRef.current && !staleLayout) return
    fittedRef.current = true
    const viewport = props.layout.viewport
    const hasSavedViewport =
      !staleLayout &&
      Object.keys(props.layout.positions).length > 0 &&
      viewport != null &&
      Number.isFinite(viewport.zoom)
    let cancelled = false
    let retryTimer: number | undefined
    const applyViewport = (attempt = 0) => {
      if (cancelled) return
      const instance = instanceRef.current
      const pane = document.querySelector('.topology-flow .react-flow')
      const height = pane?.getBoundingClientRect().height ?? 0
      if (!instance || height < 80) {
        if (attempt < 40) {
          retryTimer = window.setTimeout(() => applyViewport(attempt + 1), 50)
        }
        return
      }
      if (hasSavedViewport) {
        instance.setViewport({
          x: viewport.x ?? 0,
          y: viewport.y ?? 0,
          zoom: viewport.zoom ?? INITIAL_CANVAS_ZOOM,
        })
        viewportReadyRef.current = true
        return
      }
      const currentNodes = instance.getNodes() as TopologyNode[]
      const fitNodes = currentNodes.length > 0 ? currentNodes : props.graphNodes
      void instance
        .fitView({
          nodes: getInitialViewNodes(fitNodes),
          padding: 0.1,
          minZoom: 0.7,
          maxZoom: 0.8,
          duration: 220,
        })
        .then(() => {
          if (cancelled) return
          viewportReadyRef.current = true
          onLayoutChangeRef.current({ viewport: instance.getViewport() })
        })
    }
    const timer = window.setTimeout(() => applyViewport(), 80)
    return () => {
      cancelled = true
      window.clearTimeout(timer)
      if (retryTimer != null) window.clearTimeout(retryTimer)
    }
  }, [props.graphNodes, props.layout])

  useEffect(() => {
    if (props.relayoutVersion === 0) return
    if (props.relayoutVersion === relayoutSeenRef.current) return
    relayoutSeenRef.current = props.relayoutVersion
    setNodes((current) => {
      const next = applyAutoLayout(current)
      onLayoutChangeRef.current({ positions: collectPositions(next) })
      return next
    })
  }, [props.relayoutVersion])

  const onNodesChange = useCallback((changes: NodeChange<TopologyNode>[]) => {
    setNodes((current) => applyNodeChanges(changes, current) as TopologyNode[])
  }, [])

  const onEdgesChange = useCallback((changes: EdgeChange<TopologyEdge>[]) => {
    setEdges((current) => applyEdgeChanges(changes, current) as TopologyEdge[])
  }, [])

  const handleConnect = useCallback(async (connection: Connection) => {
    if (!canWriteRef.current || !isValidTopologyConnection(connection)) return
    await onConnectRef.current(connection)
  }, [])

  const handleBeforeDelete: OnBeforeDelete<TopologyNode, TopologyEdge> =
    useCallback(async ({ nodes: deletedNodes, edges: deletedEdges }) => {
      if (deletedNodes.length > 0) return false
      if (deletedEdges.length === 0) return false
      if (!canWriteRef.current) return false
      return onDeleteEdgesRef.current(deletedEdges)
    }, [])

  const handleNodeDragStart = useCallback(() => {
    draggingRef.current = true
  }, [])

  const handleNodeDragStop = useCallback(() => {
    draggingRef.current = false
    const current = instanceRef.current?.getNodes() ?? []
    onLayoutChangeRef.current({
      positions: collectPositions(current as TopologyNode[]),
    })
  }, [])

  const handleMoveEnd = useCallback(
    (_event: unknown, viewport: TopologyViewport) => {
      if (!viewportReadyRef.current) return
      if (!Number.isFinite(viewport.zoom) || viewport.zoom <= 0) return
      onLayoutChangeRef.current({ viewport })
    },
    []
  )

  return (
    <div className='topology-flow bg-background h-full min-h-0 overflow-hidden'>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onInit={(instance) => {
          instanceRef.current = instance
        }}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={handleConnect}
        onBeforeDelete={handleBeforeDelete}
        onNodeDragStart={handleNodeDragStart}
        onNodeDragStop={handleNodeDragStop}
        autoPanOnNodeDrag={false}
        nodeDragThreshold={6}
        onMoveEnd={handleMoveEnd}
        onNodeClick={(event, node) => {
          const target = event.target
          if (
            target instanceof HTMLElement &&
            target.closest(
              'button,input,textarea,a,[role="combobox"],[role="menuitem"],[data-slot="dropdown-menu-trigger"],[data-topology-action]'
            )
          ) {
            return
          }
          onNodeClickRef.current(node)
        }}
        isValidConnection={isValidTopologyConnection}
        nodesConnectable={props.canWrite}
        elementsSelectable
        onlyRenderVisibleElements
        selectNodesOnDrag={false}
        elevateNodesOnSelect={false}
        deleteKeyCode={['Backspace', 'Delete']}
        proOptions={{ hideAttribution: true }}
        minZoom={0.2}
        maxZoom={1.6}
        defaultViewport={{ x: 48, y: 36, zoom: INITIAL_CANVAS_ZOOM }}
        connectionLineStyle={{ stroke: '#8b5cf6', strokeWidth: 1.6 }}
        defaultEdgeOptions={{
          type: 'default',
          interactionWidth: 24,
        }}
        className='h-full'
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={32}
          size={1}
          className='opacity-30'
        />
        {props.showMiniMap ? (
          <Panel position='bottom-right' className='!m-3 mb-16'>
            <MiniMap
              pannable
              zoomable
              className='!bg-background/90 !m-0 !overflow-hidden !rounded-xl !border'
            />
          </Panel>
        ) : null}
        <Controls
          showInteractive={false}
          className='!bg-background/85 !overflow-hidden !rounded-xl !border !shadow-none backdrop-blur-xl'
        />
      </ReactFlow>
    </div>
  )
}
