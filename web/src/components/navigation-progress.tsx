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
import { useRouterState } from '@tanstack/react-router'
import { useEffect, useRef } from 'react'
import LoadingBar, { type LoadingBarRef } from 'react-top-loading-bar'

const PENDING_BAR_DELAY_MS = 200

export function NavigationProgress() {
  const ref = useRef<LoadingBarRef>(null)
  const started = useRef(false)
  const status = useRouterState({ select: (s) => s.status })

  useEffect(() => {
    if (status === 'pending') {
      const timer = window.setTimeout(() => {
        started.current = true
        ref.current?.continuousStart()
      }, PENDING_BAR_DELAY_MS)
      return () => window.clearTimeout(timer)
    }
    if (started.current) {
      started.current = false
      ref.current?.complete()
    }
  }, [status])

  return (
    <LoadingBar color='var(--muted-foreground)' ref={ref} shadow height={2} />
  )
}
