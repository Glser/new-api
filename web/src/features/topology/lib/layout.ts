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

import type { TopologyLayout, TopologyNode } from '../types'

const COLUMN_X = {
  userGroup: 48,
  channel: 340,
  model: 680,
} as const

const COLUMN_WIDTH = {
  userGroup: 260,
  channel: 300,
  model: 260,
} as const

const NODE_HEIGHT = {
  userGroup: 76,
  channel: 92,
  model: 76,
} as const

const START_Y = 24
const GAP_Y = 12

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
  for (const type of ['userGroup', 'channel', 'model'] as const) {
    let y = START_Y
    for (const node of buckets[type]) {
      result.push({
        ...node,
        position: { x: COLUMN_X[type], y },
        style: { width: COLUMN_WIDTH[type] },
        width: COLUMN_WIDTH[type],
        height: NODE_HEIGHT[type],
      })
      y += NODE_HEIGHT[type] + GAP_Y
    }
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
  if (relayout) return arranged
  return mergeLayoutPositions(arranged, layout)
}
