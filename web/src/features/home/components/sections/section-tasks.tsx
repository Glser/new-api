/*
Copyright (C) 2023-2026 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.
*/
import { useTranslation } from "react-i18next"

import { AnimateInView } from "@/components/animate-in-view"

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
    <section id="engineering" className="relative z-10 border-t border-border/40 px-6 py-20 md:py-28 bg-muted/5">
      <div className="mx-auto max-w-6xl">
        {/* Editorial Section Header */}
        <AnimateInView className="mb-14 flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
          <div>
            <div className="mb-3 font-mono text-xs font-semibold tracking-[0.2em] text-emerald-500 uppercase">
              {t("sec_tasks_kicker")}
            </div>
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl md:text-5xl">
              <span>{t("sec_tasks_title_p1")}</span>
              <br />
              <span className="text-foreground/90">{t("sec_tasks_title_p2")}</span>
            </h2>
            <div className="mt-4 h-0.5 w-10 rounded-full bg-emerald-500/80" />
            <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted-foreground md:text-base">
              {t("sec_tasks_desc")}
            </p>
          </div>
        </AnimateInView>

        {/* SLA & Engineering Metrics Grid */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {metrics.map((m, idx) => (
            <AnimateInView
              key={m.label}
              delay={idx * 60}
              className="group relative flex flex-col justify-between rounded-xl border border-border/50 bg-card/40 p-6 backdrop-blur-xs transition-all duration-300 hover:border-border hover:bg-card/70 hover:shadow-lg"
            >
              <div>
                <div className="font-mono text-3xl font-bold tracking-tight text-foreground group-hover:text-emerald-500 transition-colors">
                  {m.value}
                </div>
                <div className="mt-3 text-sm font-semibold text-foreground">
                  {m.label}
                </div>
              </div>

              <div className="mt-6 border-t border-border/30 pt-3 font-mono text-[11px] text-muted-foreground/70">
                {m.detail}
              </div>
            </AnimateInView>
          ))}
        </div>
      </div>
    </section>
  )
}
