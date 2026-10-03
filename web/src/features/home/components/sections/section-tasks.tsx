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
    <section id="engineering" className="relative z-10 border-t border-border/40 px-4 sm:px-6 lg:px-8 py-20 md:py-28 bg-muted/5">
      {/* Atmospheric lighting */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-25 dark:opacity-15"
        style={{
          background: "radial-gradient(ellipse 60% 40% at 15% 25%, rgba(16, 185, 129, 0.12) 0%, transparent 70%)",
        }}
      />
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-[linear-gradient(to_right,var(--border)_1px,transparent_1px),linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] [mask-image:radial-gradient(ellipse_75%_65%_at_45%_35%,black_25%,transparent_100%)] bg-[size:4rem_4rem] opacity-[0.025]"
      />
      <div className="mx-auto max-w-7xl">
        {/* Editorial Section Header */}
        <AnimateInView className="mb-14 flex flex-col items-start justify-between gap-6 md:flex-row md:items-end lg:pl-4 xl:pl-6">
          <div>
            <div className="mb-3 font-mono text-xs font-semibold tracking-[0.2em] text-emerald-500 uppercase">
              {t("sec_tasks_kicker")}
            </div>
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl md:text-5xl"><span className="hero-title-shine inline-block">{t("sec_tasks_title_p1")}</span><br /><span className="text-foreground/90">{t("sec_tasks_title_p2")}</span></h2>
            <div className="mt-4 h-0.5 w-32 sm:w-48 rounded-full bg-gradient-to-r from-emerald-500 via-teal-400 to-transparent" />
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
              className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-border/50 bg-card/40 p-6 backdrop-blur-md transition-all duration-300 hover:border-emerald-500/30 hover:bg-card/70 hover:shadow-lg"
            >
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-emerald-500/60 via-teal-400/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
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

      {/* Section divider: layered center-glow line */}
      <div aria-hidden className="pointer-events-none absolute bottom-0 inset-x-0 flex flex-col items-center overflow-hidden">
        {/* Glow bloom */}
        <div
          className="h-[3px] w-64 sm:w-96 rounded-full blur-[4px]"
          style={{ background: "linear-gradient(90deg, transparent, rgba(16,185,129,0.7) 40%, rgba(16,185,129,0.7) 60%, transparent)" }}
        />
        {/* Sharp center line */}
        <div
          className="absolute bottom-0 h-px w-full"
          style={{
            background: "linear-gradient(90deg, transparent 0%, rgba(16,185,129,0.15) 20%, rgba(16,185,129,0.55) 42%, rgba(255,255,255,0.85) 50%, rgba(16,185,129,0.55) 58%, rgba(16,185,129,0.15) 80%, transparent 100%)",
          }}
        />
      </div>
    </section>
  )
}
