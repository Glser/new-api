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
import { BaseEdge, getBezierPath, type EdgeProps } from '@xyflow/react'
import { memo } from 'react'

function TopologyFlowEdgeComponent(
  props: EdgeProps<{ color?: string; disabled?: boolean }>
) {
  const [path] = getBezierPath({
    sourceX: props.sourceX,
    sourceY: props.sourceY,
    sourcePosition: props.sourcePosition,
    targetX: props.targetX,
    targetY: props.targetY,
    targetPosition: props.targetPosition,
  })
  const color =
    (typeof props.style?.stroke === 'string' && props.style.stroke) ||
    props.data?.color ||
    '#64748b'

  return (
    <>
      {props.selected ? (
        <path
          d={path}
          fill='none'
          stroke={color}
          strokeWidth={12}
          strokeLinecap='round'
          className='topology-edge-halo'
        />
      ) : null}
      <BaseEdge
        id={props.id}
        path={path}
        markerEnd={props.markerEnd}
        style={props.style}
        interactionWidth={28}
      />
    </>
  )
}

export const TopologyFlowEdge = memo(TopologyFlowEdgeComponent)
