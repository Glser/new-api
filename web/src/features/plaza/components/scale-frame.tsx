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
import type { CSSProperties, ReactNode } from 'react'

import { cn } from '@/lib/utils'

import { usePlazaScale } from '../hooks/use-plaza-scale'

export function PlazaScaleFrame(props: {
  children: ReactNode
  className?: string
}) {
  const scale = usePlazaScale()
  const style = {
    '--plaza-scale': String(scale),
    ...(scale === 1 ? {} : { zoom: scale }),
  } as CSSProperties

  return (
    <div
      data-testid='plaza-scale-frame'
      data-plaza-scale={String(scale)}
      className={cn('w-full', props.className)}
      style={style}
    >
      {props.children}
    </div>
  )
}
