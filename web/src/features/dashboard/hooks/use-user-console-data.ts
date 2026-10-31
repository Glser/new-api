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
import type {
  QuotaDataItem,
  UserConsoleDateRange,
} from '@/features/dashboard/types'
import {
  getAllLogs,
  getAllMidjourneyLogs,
  getAllTaskLogs,
  getUserLogs,
  getUserMidjourneyLogs,
  getUserTaskLogs,
} from '@/features/usage-logs/api'
import {
  LOG_TYPE_ENUM,
  MJ_TASK_STATUS,
  TASK_STATUS,
} from '@/features/usage-logs/constants'
import type { UsageLog } from '@/features/usage-logs/data/schema'
import type { MidjourneyLog, TaskLog } from '@/features/usage-logs/types'
import { getSelf } from '@/lib/api'
import { requireServerSuccess } from '@/lib/server-error-message'
import { STATUS_QUERY_KEY } from '@/lib/status-query'
import { dateToUnixTimestamp } from '@/lib/time'
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

const ACTIVITY_LOG_LIMIT = 20
const CHART_LOG_PAGE_SIZE = 200

function quotaItemsFromLogs(logs: UsageLog[]): QuotaDataItem[] {
  return logs.map((log) => ({
    model_name: log.model_name,
    created_at: log.created_at,
    quota: log.quota,
    count: 1,
    token_used: (log.prompt_tokens ?? 0) + (log.completion_tokens ?? 0),
  }))
}

function toUnixRange(range: UserConsoleDateRange) {
  return {
    start_timestamp: dateToUnixTimestamp(range.start),
    end_timestamp: dateToUnixTimestamp(range.end),
  }
}

function countInProgressTasks(items: TaskLog[]): number {
  return items.filter((item) => IN_PROGRESS_TASK_STATUSES.has(item.status))
    .length
}

function countInProgressDrawings(items: MidjourneyLog[]): number {
  return items.filter((item) => IN_PROGRESS_DRAWING_STATUSES.has(item.status))
    .length
}

export function useUserConsoleData(
  range: UserConsoleDateRange,
  options?: { siteWide?: boolean }
) {
  const queryClient = useQueryClient()
  const authUser = useAuthStore((state) => state.auth.user)
  const siteWide = options?.siteWide === true
  const unixRange = useMemo(() => toUnixRange(range), [range])
  const granularity = useMemo(() => getUserConsoleGranularity(range), [range])

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
      siteWide ? 'site' : 'self',
      unixRange.start_timestamp,
      unixRange.end_timestamp,
      granularity,
    ],
    queryFn: async () => {
      try {
        const result = await getUserQuotaDates(
          {
            ...unixRange,
            default_time: granularity,
          },
          siteWide
        )
        if (result.success) return result.data ?? []
      } catch {
        // Fall back to live logs when quota_data is unavailable.
      }
      return []
    },
    staleTime: 30 * 1000,
  })

  const logsQuery = useQuery({
    queryKey: [
      'dashboard',
      'user-console',
      'logs',
      siteWide ? 'site' : 'self',
      unixRange.start_timestamp,
      unixRange.end_timestamp,
    ],
    queryFn: async () => {
      const logsRequest = {
        p: 1,
        page_size: CHART_LOG_PAGE_SIZE,
        type: LOG_TYPE_ENUM.CONSUME,
        start_timestamp: unixRange.start_timestamp,
        end_timestamp: unixRange.end_timestamp,
      }
      const result = requireServerSuccess(
        await (siteWide ? getAllLogs(logsRequest) : getUserLogs(logsRequest))
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
      siteWide ? 'site' : 'self',
      unixRange.start_timestamp,
      unixRange.end_timestamp,
    ],
    queryFn: async () => {
      const taskRequest = {
        p: 1,
        page_size: 50,
        start_timestamp: unixRange.start_timestamp,
        end_timestamp: unixRange.end_timestamp,
      }
      const result = requireServerSuccess(
        await (siteWide
          ? getAllTaskLogs(taskRequest)
          : getUserTaskLogs(taskRequest))
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
      siteWide ? 'site' : 'self',
      unixRange.start_timestamp,
      unixRange.end_timestamp,
    ],
    queryFn: async () => {
      const drawingRequest = {
        p: 1,
        page_size: 50,
        start_timestamp: unixRange.start_timestamp * 1000,
        end_timestamp: unixRange.end_timestamp * 1000,
      }
      const result = requireServerSuccess(
        await (siteWide
          ? getAllMidjourneyLogs(drawingRequest)
          : getUserMidjourneyLogs(drawingRequest))
      )
      return result.success ? (result.data?.items ?? []) : []
    },
    staleTime: 30 * 1000,
  })

  const user = selfQuery.data ?? authUser
  const consumeLogs = (logsQuery.data ?? []) as UsageLog[]
  const quotaData = useMemo(() => {
    const aggregated = quotaQuery.data ?? []
    if (aggregated.length > 0) return aggregated
    return quotaItemsFromLogs((logsQuery.data ?? []) as UsageLog[])
  }, [logsQuery.data, quotaQuery.data])
  const stats = useMemo(() => calculateDashboardStats(quotaData), [quotaData])
  const recentLogs = consumeLogs.slice(0, ACTIVITY_LOG_LIMIT)
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
