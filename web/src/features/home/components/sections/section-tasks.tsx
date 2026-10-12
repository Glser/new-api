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
import { useTranslation } from "react-i18next"

import { AnimateInView } from "@/components/animate-in-view"
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

  const metrics = [
    {
      value: "99.98%",
      label: t("sec_tasks_sla_uptime"),
      detail: "多活容灾与秒级主备切换",
    },
    {
      value: "< 25ms",
      label: t("sec_tasks_sla_latency"),
      detail: "零冷启动代理损耗",
    },
    {
      value: "50+",
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
      className="relative z-10 overflow-hidden px-4 py-20 sm:px-6 md:py-28 lg:px-8"
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
