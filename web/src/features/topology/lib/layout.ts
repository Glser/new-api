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
  TOPOLOGY_LAYOUT_VERSION,
  type TopologyLayout,
  type TopologyNode,
} from '../types'

const ROW_ORDER = ['userGroup', 'channel', 'model'] as const

const NODE_WIDTH = {
  userGroup: 380,
  channel: 360,
  model: 380,
} as const

const NODE_HEIGHT = {
  userGroup: 112,
  channel: 252,
  model: 112,
} as const

const START_X = 32
const START_Y = 36
const GAP_X = 24
const ROW_GAP_Y = 160

export const INITIAL_CANVAS_ZOOM = 0.76
const INITIAL_VIEW_WORLD_WIDTH = 1280

export function applyAutoLayout(nodes: TopologyNode[]): TopologyNode[] {
  const buckets: Record<string, TopologyNode[]> = {
    userGroup: [],
    channel: [],
    model: [],
  }
  for (const node of nodes) {
    const type = node.type ?? 'channel'
    buckets[type].push(node)
  }

  const result: TopologyNode[] = []
  let y = START_Y
  for (const type of ROW_ORDER) {
    const row = buckets[type]
    if (row.length === 0) continue
    let x = START_X
    for (const node of row) {
      result.push({
        ...node,
        position: { x, y },
        style: { width: NODE_WIDTH[type] },
        width: NODE_WIDTH[type],
        height: NODE_HEIGHT[type],
      })
      x += NODE_WIDTH[type] + GAP_X
    }
    y += NODE_HEIGHT[type] + ROW_GAP_Y
  }
  return result
}

export function mergeLayoutPositions(
  nodes: TopologyNode[],
  layout: TopologyLayout
): TopologyNode[] {
  return nodes.map((node) => {
    const saved = layout.positions[node.id]
    if (saved && Number.isFinite(saved.x) && Number.isFinite(saved.y)) {
      return { ...node, position: { x: saved.x, y: saved.y } }
    }
    return node
  })
}

export function collectPositions(nodes: TopologyNode[]) {
  const positions: Record<string, { x: number; y: number }> = {}
  for (const node of nodes) {
    positions[node.id] = { x: node.position.x, y: node.position.y }
  }
  return positions
}

export function layoutGraphNodes(
  nodes: TopologyNode[],
  layout: TopologyLayout,
  relayout = false
) {
  const arranged = applyAutoLayout(nodes)
  if (relayout || (layout.version ?? 1) < TOPOLOGY_LAYOUT_VERSION) {
    return arranged
  }
  return mergeLayoutPositions(arranged, layout)
}

export function getInitialViewNodes(nodes: TopologyNode[]): TopologyNode[] {
  if (nodes.length === 0) return nodes
  const minX = Math.min(...nodes.map((node) => node.position.x))
  const visible = nodes.filter(
    (node) => node.position.x <= minX + INITIAL_VIEW_WORLD_WIDTH
  )
  return visible.length > 0 ? visible : nodes
}
