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
import { useCallback, useEffect, useRef, useState } from 'react'

import '@xyflow/react/dist/style.css'
import '../topology-flow.css'

import { useFlashingIds } from '../hooks/use-topology-traffic'
import { applyAutoLayout, collectPositions } from '../lib/layout'
import type {
  TopologyEdge,
  TopologyLayout,
  TopologyNode,
  TopologyViewport,
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
    const flash = flashingIds.has(edge.id)
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
    return {
      ...node,
      position: previous.position,
      selected: previous.selected,
    }
  })
}

export function TopologyCanvas(props: TopologyCanvasProps) {
  const instanceRef = useRef<ReactFlowInstance<
    TopologyNode,
    TopologyEdge
  > | null>(null)
  const fittedRef = useRef(false)
  const relayoutSeenRef = useRef(0)
  const onLayoutChangeRef = useRef(props.onLayoutChange)
  const onConnectRef = useRef(props.onConnect)
  const onDeleteEdgesRef = useRef(props.onDeleteEdges)
  const onNodeClickRef = useRef(props.onNodeClick)
  const canWriteRef = useRef(props.canWrite)
  onLayoutChangeRef.current = props.onLayoutChange
  onConnectRef.current = props.onConnect
  onDeleteEdgesRef.current = props.onDeleteEdges
  onNodeClickRef.current = props.onNodeClick
  canWriteRef.current = props.canWrite

  const flashingIds = useFlashingIds()
  const [nodes, setNodes] = useState<TopologyNode[]>(props.graphNodes)
  const [edges, setEdges] = useState<TopologyEdge[]>(props.graphEdges)

  useEffect(() => {
    setNodes((current) => mergeGraphNodes(current, props.graphNodes))
    setEdges(applyEdgeFlash(props.graphEdges, flashingIds))
  }, [flashingIds, props.graphEdges, props.graphNodes])

  useEffect(() => {
    if (fittedRef.current) return
    if (props.graphNodes.length === 0) return
    const viewport = props.layout.viewport
    const hasSaved = Object.keys(props.layout.positions).length > 0
    window.setTimeout(() => {
      if (hasSaved && viewport) {
        instanceRef.current?.setViewport({
          x: viewport.x ?? 0,
          y: viewport.y ?? 0,
          zoom: viewport.zoom ?? 1,
        })
      } else {
        instanceRef.current?.fitView({ padding: 0.18, duration: 200 })
      }
    }, 50)
    fittedRef.current = true
  }, [props.graphNodes.length, props.layout.positions, props.layout.viewport])

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

  const handleNodeDragStop = useCallback(() => {
    const current = instanceRef.current?.getNodes() ?? []
    onLayoutChangeRef.current({
      positions: collectPositions(current as TopologyNode[]),
    })
  }, [])

  const handleMoveEnd = useCallback(
    (_event: unknown, viewport: TopologyViewport) => {
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
        onNodeDragStop={handleNodeDragStop}
        onMoveEnd={handleMoveEnd}
        onNodeClick={(event, node) => {
          const target = event.target
          if (
            target instanceof HTMLElement &&
            target.closest('[data-topology-action]')
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
        connectionLineStyle={{ stroke: '#8b5cf6', strokeWidth: 1.6 }}
        defaultEdgeOptions={{
          type: 'default',
          interactionWidth: 24,
        }}
        className='h-full'
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={28}
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
