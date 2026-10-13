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
import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

export const plazaFilterRowClassName = 'flex min-w-0 items-start gap-3'
export const plazaFilterRowLabelClassName =
  'text-foreground flex h-8 shrink-0 items-center text-sm font-medium whitespace-nowrap'
export const plazaFilterRowChipsClassName =
  'flex min-w-0 flex-1 flex-wrap content-start gap-2'

export function PlazaFilterRow(props: {
  label: string
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cn(plazaFilterRowClassName, props.className)}>
      <p className={plazaFilterRowLabelClassName}>{props.label}</p>
      <div
        role='group'
        aria-label={props.label}
        className={plazaFilterRowChipsClassName}
      >
        {props.children}
      </div>
    </div>
  )
}
