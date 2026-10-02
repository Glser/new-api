/*
Copyright (C) 2023-2026 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.
*/
import { useState } from "react"
import { Link } from "@tanstack/react-router"
import { ArrowUpRight } from "lucide-react"
import { useTranslation } from "react-i18next"

import { AnimateInView } from "@/components/animate-in-view"

export function SectionStudio() {
  const { t } = useTranslation()
  const [activeStep, setActiveStep] = useState(0)

  const steps = [
    {
      num: "01",
      stepLabel: t("sec_studio_step1_label"),
      title: t("sec_studio_step1_title"),
      desc: t("sec_studio_step1_desc"),
      code: [
        "// 01 · 灵感起点与角色指令",
        "Role: 资深视觉概念架构师",
        "Scene: 赛博雨夜霓虹纵深街区",
        "Atmosphere: 丁达尔光束、潮湿反光沥青、85mm 景深",
        "Output: 结构化分镜提示词与光影参数分解",
      ].join("\n"),
    },
    {
      num: "02",
      stepLabel: t("sec_studio_step2_label"),
      title: t("sec_studio_step2_title"),
      desc: t("sec_studio_step2_desc"),
      code: [
        "// 02 · 多模型并行分发与对照",
        "[Branch A / Claude 3.5]: 负责深度叙事台词与世界观严谨设定",
        "[Branch B / DeepSeek R1]: 验证逻辑推导严密性与时序一致性",
        "[Branch C / FLUX.1]: 实时渲染核心视觉情绪板与关键帧",
      ].join("\n"),
    },
    {
      num: "03",
      stepLabel: t("sec_studio_step3_label"),
      title: t("sec_studio_step3_title"),
      desc: t("sec_studio_step3_desc"),
      code: [
        "// 03 · 标准化生产交付",
        "POST /v1/chat/completions (OpenAI Compatible)",
        "POST /v1/messages (Claude Native Protocol)",
        "POST /v1/images/generations (FLUX / Midjourney)",
        "Status: 200 OK • Gateway Stream Overhead: 18ms",
      ].join("\n"),
    },
  ]

  return (
    <section id="studio" className="relative z-10 border-t border-border/40 px-4 sm:px-6 lg:px-8 py-20 md:py-28 bg-muted/5">
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
              {t("sec_studio_kicker")}
            </div>
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl md:text-5xl"><span className="hero-title-shine inline-block">{t("sec_studio_title_p1")}</span><br /><span className="text-foreground/90">{t("sec_studio_title_p2")}</span></h2>
            <div className="mt-4 h-0.5 w-32 sm:w-48 rounded-full bg-gradient-to-r from-emerald-500 via-teal-400 to-transparent" />
            <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted-foreground md:text-base">
              {t("sec_studio_desc")}
            </p>
          </div>

          <div>
            <Link
              to="/dashboard"
              className="group inline-flex items-center gap-1.5 font-mono text-xs font-semibold tracking-wider text-muted-foreground transition-colors hover:text-foreground"
            >
              <span>{t("sec_studio_action")}</span>
              <ArrowUpRight className="size-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </Link>
          </div>
        </AnimateInView>

        {/* Interactive Steps Grid */}
        <div className="grid grid-cols-1 items-stretch gap-8 lg:grid-cols-12 lg:gap-10">
          {/* Left Step Selectors */}
          <div className="flex flex-col gap-3 lg:col-span-5">
            {steps.map((step, idx) => {
              const isActive = activeStep === idx
              return (
                <div
                  key={step.num}
                  onClick={() => setActiveStep(idx)}
                  className={`group relative flex cursor-pointer flex-col rounded-xl border p-5 transition-all duration-300 ${
                    isActive ? "border-foreground/40 bg-card/80 shadow-md ring-1 ring-border/80" : "border-border/40 bg-card/20 hover:border-border/70 hover:bg-card/40"
                  }`}
                >
                  <div className="flex items-center justify-between font-mono text-xs">
                    <span className={isActive ? "font-semibold text-emerald-500" : "text-muted-foreground"}>
                      {step.stepLabel}
                    </span>
                  </div>
                  <h3 className="mt-2 text-base font-semibold text-foreground">
                    {step.title}
                  </h3>
                  <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                    {step.desc}
                  </p>
                </div>
              )
            })}
          </div>

          {/* Right Preview Card - Clean Code Surface */}
          <div className="relative flex flex-col justify-between overflow-hidden rounded-xl border border-border/50 bg-neutral-950 p-6 shadow-xl lg:col-span-7">
            <div>
              <div className="flex items-center justify-between border-b border-white/10 pb-4 font-mono text-xs">
                <div className="flex items-center gap-2">
                  <div className="size-2 rounded-full bg-emerald-500" />
                  <span className="text-white/60 tracking-wider uppercase">
                    {steps[activeStep].stepLabel}
                  </span>
                </div>
                <span className="text-white/40 text-[11px]">
                  {t("sec_studio_workflow_pipeline")}
                </span>
              </div>

              <div className="mt-5 font-mono text-xs leading-relaxed text-white/80">
                <pre className="overflow-x-auto whitespace-pre-wrap font-sans text-xs sm:text-[13px] sm:leading-7">
                  <code>{steps[activeStep].code}</code>
                </pre>
              </div>
            </div>

            <div className="mt-8 flex items-center justify-between border-t border-white/10 pt-4 font-mono text-[11px] text-white/50">
              <span>{t("sec_studio_ready")}</span>
              <Link
                to="/dashboard"
                className="inline-flex items-center gap-1 text-emerald-400 hover:text-emerald-300 transition-colors"
              >
                <span>{t("sec_studio_run_now")}</span>
                <ArrowUpRight className="size-3" />
              </Link>
            </div>
          </div>
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


