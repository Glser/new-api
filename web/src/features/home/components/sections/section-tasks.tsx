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
import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"

import { AnimateInView } from "@/components/animate-in-view"
import { getUptimeStatus } from "@/features/dashboard/api"
import { getPerfMetricsSummary } from "@/features/performance-metrics/api"
import {
  formatLatency,
  formatUptimePct,
} from "@/features/performance-metrics/lib/format"
import { getPricing } from "@/features/pricing/api"
import {
  SectionBackdrop,
  SectionDivider,
  SectionHeader,
  SectionScrollCue,
} from "@/features/home/components/section-primitives"
import {
ACCENT_PALETTE,
glassPanelClassName,
} from "@/features/home/components/section-styles"


export function SectionTasks() {
  const { t } = useTranslation()

  /**
   * 指标全部取自真实数据源，取不到时展示占位符：
   * - 可用性：数据看板 uptime 监控的均值，未配置监控时回退到性能监控的请求成功率均值
   * - 时延：数据看板性能监控的平均时延
   * - 供应商数量：模型广场 pricing 数据里的供应商
   */
  const [stats, setStats] = useState<{
    uptimePct: number | null
    avgLatencyMs: number | null
    vendorCount: number | null
  }>({ uptimePct: null, avgLatencyMs: null, vendorCount: null })

  useEffect(() => {
    let mounted = true
    Promise.all([
      getUptimeStatus().catch(() => null),
      getPerfMetricsSummary(24).catch(() => null),
      getPricing().catch(() => null),
    ]).then(([uptimeRes, perfRes, pricingRes]) => {
      if (!mounted) return
      const average = (values: number[]) =>
        values.reduce((sum, value) => sum + value, 0) / values.length
      // uptime 监控的值是 0~1 小数，需换算成百分数
      const monitorRates = (uptimeRes?.data ?? [])
        .flatMap((group) => group.monitors ?? [])
        .map((monitor) => Number(monitor.uptime))
        .filter((rate) => Number.isFinite(rate))
      const models = perfRes?.data?.models ?? []
      const successRates = models
        .map((model) => Number(model.success_rate))
        .filter((rate) => Number.isFinite(rate))
      const latencies = models
        .map((model) => Number(model.avg_latency_ms))
        .filter((ms) => Number.isFinite(ms) && ms > 0)
      const vendors =
        pricingRes && Array.isArray(pricingRes.vendors)
          ? pricingRes.vendors
          : []
      setStats({
        uptimePct:
          monitorRates.length > 0
            ? average(monitorRates) * 100
            : successRates.length > 0
              ? average(successRates)
              : null,
        avgLatencyMs: latencies.length > 0 ? average(latencies) : null,
        vendorCount: vendors.length > 0 ? vendors.length : null,
      })
    })
    return () => {
      mounted = false
    }
  }, [])

  const metrics = [
    {
      value: stats.uptimePct != null ? formatUptimePct(stats.uptimePct) : "—",
      label: t("sec_tasks_sla_uptime"),
      detail: "多活容灾与秒级主备切换",
    },
    {
      value:
        stats.avgLatencyMs != null ? formatLatency(stats.avgLatencyMs) : "—",
      label: t("sec_tasks_sla_latency"),
      detail: "零冷启动代理损耗",
    },
    {
      value: stats.vendorCount != null ? String(stats.vendorCount) : "—",
      label: t("sec_tasks_sla_providers"),
      detail: "全网主流大模型供应商接入",
    },
    {
      value: "100%",
      label: t("sec_tasks_sla_compat"),
      detail: "官方标准客户端零侵入接入",
    },
  ]

  return (
    <section
      id="engineering"
      className="home-section-offscreen relative z-10 overflow-hidden px-4 py-20 sm:px-6 md:py-28 lg:px-8"
    >
      <SectionBackdrop />

      <div className="mx-auto max-w-7xl">
        <SectionHeader
          titlePrimary={t("sec_tasks_title_p1")}
          titleSecondary={t("sec_tasks_title_p2")}
          description={t("sec_tasks_desc")}
        />

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {metrics.map((m, idx) => {
            const palette = ACCENT_PALETTE[idx % ACCENT_PALETTE.length]
            return (
              <AnimateInView
                key={m.label}
                delay={idx * 60}
                className={`group relative flex flex-col justify-between overflow-hidden rounded-3xl p-6 transition-all duration-500 hover:-translate-y-1 ${glassPanelClassName}`}
              >
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-0 opacity-40 transition-opacity duration-700 group-hover:opacity-70 dark:opacity-30"
                  style={{
                    background: `radial-gradient(ellipse 70% 55% at 50% 0%, ${palette.glowColor}, transparent 62%)`,
                  }}
                />

                <div className="relative">
                  <div
                    className="font-mono text-3xl font-bold tracking-tighter tabular-nums transition-colors"
                    style={{ color: palette.accentColor }}
                  >
                    {m.value}
                  </div>
                  <div className="mt-3 text-sm font-semibold text-foreground">
                    {m.label}
                  </div>
                </div>

                <div className="relative mt-6 border-t border-slate-900/10 pt-3 font-mono text-[11px] text-muted-foreground/70 dark:border-white/15">
                  {m.detail}
                </div>
              </AnimateInView>
            )
          })}
        </div>
      </div>

      <SectionScrollCue
        target="api"
        cue={t("sec_tasks_scroll_cue")}
        aside={t("sec_tasks_scroll_aside")}
      />
      <SectionDivider />
    </section>
  )
}

