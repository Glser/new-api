/*
Copyright (C) 2023-2026 QuantumNous
*/
import type { QuotaDataItem } from '@/features/dashboard/types'
import type { PerfModelSummary } from '@/features/performance-metrics/types'

/** Local preview only: fill empty overview widgets so layout can be reviewed. */
export const OVERVIEW_MOCK_ENABLED = import.meta.env.DEV

export const MOCK_USED_QUOTA = 64_300_000
export const MOCK_REQUEST_COUNT = 18_420
export const MOCK_REMAIN_QUOTA = 100_000_000

const MOCK_MODELS = [
  'gpt-4.1',
  'claude-sonnet-4',
  'gemini-2.5-pro',
  'deepseek-v3',
  'gpt-4o-mini',
  'grok-3',
] as const

export function buildMockQuotaSeries(
  start: number,
  end: number
): QuotaDataItem[] {
  const hours = 24
  const span = Math.max(end - start, hours)
  const step = span / hours

  return Array.from({ length: hours }, (_, index) => {
    const wave = 0.55 + 0.45 * Math.sin((index / hours) * Math.PI * 2 - 0.7)
    const rushHour = index >= 9 && index <= 18 ? 1.25 : 0.85
    const quota = Math.round((160_000 + index * 14_000) * wave * rushHour)
    const count = Math.round((32 + index * 4) * wave * rushHour)

    return {
      created_at: Math.floor(start + step * (index + 0.5)),
      quota,
      count,
      token_used: quota * 2,
      model_name: MOCK_MODELS[index % MOCK_MODELS.length],
      username: 'demo',
    }
  })
}

export const MOCK_PERF_MODELS: PerfModelSummary[] = [
  {
    model_name: 'gpt-4.1',
    avg_latency_ms: 428,
    success_rate: 99.2,
    avg_tps: 38.4,
    request_count: 6240,
  },
  {
    model_name: 'claude-sonnet-4',
    avg_latency_ms: 672,
    success_rate: 98.7,
    avg_tps: 22.1,
    request_count: 4180,
  },
  {
    model_name: 'gemini-2.5-pro',
    avg_latency_ms: 512,
    success_rate: 97.4,
    avg_tps: 31.8,
    request_count: 2910,
  },
  {
    model_name: 'deepseek-v3',
    avg_latency_ms: 286,
    success_rate: 99.6,
    avg_tps: 54.2,
    request_count: 2630,
  },
  {
    model_name: 'gpt-4o-mini',
    avg_latency_ms: 178,
    success_rate: 99.8,
    avg_tps: 66.5,
    request_count: 1870,
  },
  {
    model_name: 'grok-3',
    avg_latency_ms: 894,
    success_rate: 96.1,
    avg_tps: 17.6,
    request_count: 590,
  },
]
