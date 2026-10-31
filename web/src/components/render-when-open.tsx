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
import { Suspense, useEffect, useState, type ReactNode } from 'react'

const DEFAULT_EXIT_MS = 250

type RenderWhenOpenProps = {
  open: boolean
  exitMs?: number
  children: ReactNode
}

export function RenderWhenOpen(props: RenderWhenOpenProps) {
  const [mounted, setMounted] = useState(props.open)

  useEffect(() => {
    if (props.open) {
      setMounted(true)
      return
    }

    const timer = window.setTimeout(
      () => setMounted(false),
      props.exitMs ?? DEFAULT_EXIT_MS
    )
    return () => window.clearTimeout(timer)
  }, [props.open, props.exitMs])

  if (!mounted) return null
  return props.children
}

export function LazyWhenOpen(props: RenderWhenOpenProps) {
  return (
    <RenderWhenOpen open={props.open} exitMs={props.exitMs}>
      <Suspense fallback={null}>{props.children}</Suspense>
    </RenderWhenOpen>
  )
}
