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
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useMemo } from 'react'

import { getUserQuotaDates } from '@/features/dashboard/api'
import {
  calculateDashboardStats,
  getUserConsoleGranularity,
} from '@/features/dashboard/lib'
import type { UserConsoleDateRange } from '@/features/dashboard/types'
import {
  LOG_TYPE_ENUM,
  MJ_TASK_STATUS,
  TASK_STATUS,
} from '@/features/usage-logs/constants'
import {
  getUserLogs,
  getUserMidjourneyLogs,
  getUserTaskLogs,
} from '@/features/usage-logs/api'
import type { UsageLog } from '@/features/usage-logs/data/schema'
import type { MidjourneyLog, TaskLog } from '@/features/usage-logs/types'
import { getSelf } from '@/lib/api'
import { dateToUnixTimestamp } from '@/lib/time'
import { requireServerSuccess } from '@/lib/server-error-message'
import { STATUS_QUERY_KEY } from '@/lib/status-query'
import { useAuthStore, type AuthUser } from '@/stores/auth-store'

const IN_PROGRESS_TASK_STATUSES = new Set<string>([
  TASK_STATUS.NOT_START,
  TASK_STATUS.SUBMITTED,
  TASK_STATUS.IN_PROGRESS,
  TASK_STATUS.QUEUED,
])

const IN_PROGRESS_DRAWING_STATUSES = new Set<string>([
  MJ_TASK_STATUS.NOT_START,
  MJ_TASK_STATUS.SUBMITTED,
  MJ_TASK_STATUS.IN_PROGRESS,
  MJ_TASK_STATUS.MODAL,
])

function toUnixRange(range: UserConsoleDateRange) {
  return {
    start_timestamp: dateToUnixTimestamp(range.start),
    end_timestamp: dateToUnixTimestamp(range.end),
  }
}

function countInProgressTasks(items: TaskLog[]): number {
  return items.filter((item) => IN_PROGRESS_TASK_STATUSES.has(item.status)).length
}

function countInProgressDrawings(items: MidjourneyLog[]): number {
  return items.filter((item) => IN_PROGRESS_DRAWING_STATUSES.has(item.status))
    .length
}

export function useUserConsoleData(range: UserConsoleDateRange) {
  const queryClient = useQueryClient()
  const authUser = useAuthStore((state) => state.auth.user)
  const unixRange = useMemo(() => toUnixRange(range), [range])
  const granularity = useMemo(
    () => getUserConsoleGranularity(range),
    [range]
  )

  const selfQuery = useQuery({
    queryKey: ['dashboard', 'user-console', 'self'],
    queryFn: async () => {
      const result = requireServerSuccess(await getSelf())
      if (!result.success || result.data == null) return null
      return result.data as AuthUser
    },
    staleTime: 30 * 1000,
  })

  const quotaQuery = useQuery({
    queryKey: [
      'dashboard',
      'user-console',
      'quota',
      unixRange.start_timestamp,
      unixRange.end_timestamp,
      granularity,
    ],
    queryFn: async () => {
      const result = requireServerSuccess(
        await getUserQuotaDates(
          {
            ...unixRange,
            default_time: granularity,
          },
          false
        )
      )
      return result.success ? (result.data ?? []) : []
    },
    staleTime: 30 * 1000,
  })

  const logsQuery = useQuery({
    queryKey: [
      'dashboard',
      'user-console',
      'logs',
      unixRange.start_timestamp,
      unixRange.end_timestamp,
    ],
    queryFn: async () => {
      const result = requireServerSuccess(
        await getUserLogs({
          p: 1,
          page_size: 8,
          type: LOG_TYPE_ENUM.CONSUME,
          start_timestamp: unixRange.start_timestamp,
          end_timestamp: unixRange.end_timestamp,
        })
      )
      return result.success ? (result.data?.items ?? []) : []
    },
    staleTime: 30 * 1000,
  })

  const taskQuery = useQuery({
    queryKey: [
      'dashboard',
      'user-console',
      'tasks',
      unixRange.start_timestamp,
      unixRange.end_timestamp,
    ],
    queryFn: async () => {
      const result = requireServerSuccess(
        await getUserTaskLogs({
          p: 1,
          page_size: 50,
          start_timestamp: unixRange.start_timestamp,
          end_timestamp: unixRange.end_timestamp,
        })
      )
      return result.success ? (result.data?.items ?? []) : []
    },
    staleTime: 30 * 1000,
  })

  const drawingQuery = useQuery({
    queryKey: [
      'dashboard',
      'user-console',
      'drawings',
      unixRange.start_timestamp,
      unixRange.end_timestamp,
    ],
    queryFn: async () => {
      const result = requireServerSuccess(
        await getUserMidjourneyLogs({
          p: 1,
          page_size: 50,
          start_timestamp: unixRange.start_timestamp * 1000,
          end_timestamp: unixRange.end_timestamp * 1000,
        })
      )
      return result.success ? (result.data?.items ?? []) : []
    },
    staleTime: 30 * 1000,
  })

  const user = selfQuery.data ?? authUser
  const stats = useMemo(
    () => calculateDashboardStats(quotaQuery.data ?? []),
    [quotaQuery.data]
  )
  const quotaData = quotaQuery.data ?? []
  const recentLogs = (logsQuery.data ?? []) as UsageLog[]
  const inProgressCount =
    countInProgressTasks((taskQuery.data ?? []) as TaskLog[]) +
    countInProgressDrawings((drawingQuery.data ?? []) as MidjourneyLog[])

  const refresh = useCallback(() => {
    void queryClient.invalidateQueries({
      queryKey: ['dashboard', 'user-console'],
    })
    void queryClient.invalidateQueries({
      queryKey: STATUS_QUERY_KEY,
    })
  }, [queryClient])

  return {
    user,
    quotaData,
    stats,
    recentLogs,
    inProgressCount,
    granularity,
    loading:
      quotaQuery.isLoading ||
      selfQuery.isLoading ||
      logsQuery.isLoading ||
      taskQuery.isLoading ||
      drawingQuery.isLoading,
    refreshing:
      quotaQuery.isFetching ||
      selfQuery.isFetching ||
      logsQuery.isFetching ||
      taskQuery.isFetching ||
      drawingQuery.isFetching,
    refresh,
  }
}
