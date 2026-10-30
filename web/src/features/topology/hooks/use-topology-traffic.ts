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

import { useQuery } from '@tanstack/react-query'
import { createContext, useContext, useEffect, useRef, useState } from 'react'

import { LOG_TYPE_ENUM } from '@/features/usage-logs/constants'
import type { UsageLog } from '@/features/usage-logs/data/schema'
import { api } from '@/lib/api'

import { channelNodeId, groupNodeId, modelNodeId } from '../types'

const FLASH_MS = 1400
const EMPTY = new Set<string>()

export const TopologyTrafficContext = createContext<Set<string>>(EMPTY)

export function useFlashingIds() {
  return useContext(TopologyTrafficContext)
}

function idsFromLog(log: UsageLog) {
  const ids: string[] = []
  const channelId = log.channel
  const modelName = log.model_name?.trim()
  const groupName = log.group?.trim()
  if (channelId) ids.push(channelNodeId(channelId))
  if (modelName) ids.push(modelNodeId(modelName))
  if (groupName) ids.push(groupNodeId(groupName))
  if (groupName && channelId) ids.push(`gc:${groupName}:${channelId}`)
  if (channelId && modelName) ids.push(`cm:${channelId}:${modelName}`)
  return ids
}

export function useTopologyTraffic(enabled: boolean) {
  const seenRef = useRef<Set<number>>(new Set())
  const primedRef = useRef(false)
  const expiresRef = useRef(new Map<string, number>())
  const [flashing, setFlashing] = useState<Set<string>>(EMPTY)

  const query = useQuery({
    queryKey: ['topology-traffic'],
    enabled,
    queryFn: async () => {
      const res = await api.get('/api/log/', {
        params: { p: 1, page_size: 25, type: LOG_TYPE_ENUM.CONSUME },
        skipErrorHandler: true,
        skipBusinessError: true,
      })
      const items = (res.data?.data?.items ?? []) as UsageLog[]
      return items
    },
    refetchInterval: enabled ? 2000 : false,
    refetchIntervalInBackground: false,
    retry: false,
  })

  useEffect(() => {
    const items = query.data
    if (!items || items.length === 0) return

    if (!primedRef.current) {
      primedRef.current = true
      for (const item of items) seenRef.current.add(item.id)
      return
    }

    const fresh = items.filter((item) => !seenRef.current.has(item.id))
    if (fresh.length === 0) return
    for (const item of fresh) seenRef.current.add(item.id)
    if (seenRef.current.size > 400) {
      seenRef.current = new Set(items.map((item) => item.id))
    }

    const nextIds = fresh.flatMap(idsFromLog)
    if (nextIds.length === 0) return
    const expireAt = Date.now() + FLASH_MS
    for (const id of nextIds) expiresRef.current.set(id, expireAt)
    setFlashing(new Set(expiresRef.current.keys()))
    window.setTimeout(() => {
      const now = Date.now()
      for (const [id, exp] of expiresRef.current) {
        if (exp <= now) expiresRef.current.delete(id)
      }
      setFlashing(
        expiresRef.current.size === 0
          ? EMPTY
          : new Set(expiresRef.current.keys())
      )
    }, FLASH_MS)
  }, [query.data])

  useEffect(() => {
    if (enabled) return
    primedRef.current = false
    seenRef.current.clear()
    expiresRef.current.clear()
    setFlashing(EMPTY)
  }, [enabled])

  return flashing
}
