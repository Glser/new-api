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

interface ModelItem {
  id: string
  category: "reasoning" | "video" | "image" | "speed"
  name: string
  provider: string
  summary: string
  edition: string
  context: string
  metric: string
}

export function SectionModels() {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState<"all" | "reasoning" | "video" | "image" | "speed">("all")

  const tabs = [
    { id: "all", label: t("sec_models_tab_all") },
    { id: "reasoning", label: t("sec_models_tab_reasoning") },
    { id: "video", label: t("sec_models_tab_video") },
    { id: "image", label: t("sec_models_tab_image") },
    { id: "speed", label: t("sec_models_tab_speed") },
  ] as const

  const models: ModelItem[] = [
    {
      id: "claude-3-5-sonnet",
      category: "reasoning",
      name: "Claude 3.5 Sonnet",
      provider: "Anthropic",
      summary: "业界公认顶尖的代码架构与复杂推理能力，精准遵循多步逻辑指令。",
      edition: "01",
      context: "200K Context",
      metric: "Top Tier Logic",
    },
    {
      id: "deepseek-r1",
      category: "reasoning",
      name: "DeepSeek R1",
      provider: "DeepSeek",
      summary: "开源前沿长思维链深度推理模型，在数理证明与严谨推导上表现卓越。",
      edition: "02",
      context: "64K Context",
      metric: "Open Thinking",
    },
    {
      id: "kling-1-5",
      category: "video",
      name: "Kling 1.5 Pro",
      provider: "Kuaishou",
      summary: "具备出色物理动力学模拟的电影级长镜头视频生成，镜头运镜平滑流畅。",
      edition: "03",
      context: "1080P / 4K",
      metric: "Cinematic Motion",
    },
    {
      id: "flux-1-pro",
      category: "image",
      name: "FLUX.1 Pro",
      provider: "Black Forest Labs",
      summary: "新一代视觉生成旗舰，逼真的光影质感、人体解剖学结构与英文文字渲染。",
      edition: "04",
      context: "2K / 4K Master",
      metric: "Photorealism",
    },
    {
      id: "gpt-4o",
      category: "reasoning",
      name: "GPT-4o",
      provider: "OpenAI",
      summary: "多模态全能旗舰，图文融合深入理解，高并发与工程生态无缝契合。",
      edition: "05",
      context: "128K Context",
      metric: "Omni Multimodal",
    },
    {
      id: "gemini-2-0-flash",
      category: "speed",
      name: "Gemini 2.0 Flash",
      provider: "Google",
      summary: "兼备毫秒级超低首字延迟与百万上下文吞吐，快速交互的最佳首选。",
      edition: "06",
      context: "1M Context",
      metric: "Sub-second Stream",
    },
  ]

  const filtered = activeTab === "all" ? models : models.filter((m) => m.category === activeTab)

  return (
    <section id="models" className="relative z-10 border-t border-border/40 px-6 py-20 md:py-28">
      <div className="mx-auto max-w-6xl">
        {/* Curatorial Header: Tudouni Editorial Style */}
        <AnimateInView className="mb-14 flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
          <div>
            <div className="mb-3 font-mono text-xs font-semibold tracking-[0.2em] text-emerald-500 uppercase">
              {t("sec_models_kicker")}
            </div>
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl md:text-5xl">
              <span>{t("sec_models_title_p1")}</span>
              <br />
              <span className="text-foreground/90">{t("sec_models_title_p2")}</span>
            </h2>
            <div className="mt-4 h-0.5 w-10 rounded-full bg-emerald-500/80" />
            <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted-foreground md:text-base">
              {t("sec_models_desc")}
            </p>
          </div>

          <div>
            <Link
              to="/pricing"
              className="group inline-flex items-center gap-1.5 font-mono text-xs font-semibold tracking-wider text-muted-foreground transition-colors hover:text-foreground"
            >
              <span>{t("sec_models_view_all")}</span>
              <ArrowUpRight className="size-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </Link>
          </div>
        </AnimateInView>

        {/* Minimalist Filter Navigation */}
        <div className="mb-10 flex flex-wrap items-center gap-1.5 border-b border-border/30 pb-4 font-mono text-xs">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`rounded-md px-3.5 py-1.5 transition-colors cursor-pointer ${
                  isActive
                    ? "bg-foreground text-background font-semibold"
                    : "text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                }`}
              >
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* Clean, High-end Editorial Model Grid - No Clutter */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((item, idx) => (
            <AnimateInView
              key={item.id}
              delay={idx * 50}
              className="group relative flex flex-col justify-between rounded-xl border border-border/50 bg-card/40 p-6 backdrop-blur-xs transition-all duration-300 hover:border-border hover:bg-card/70 hover:shadow-lg"
            >
              <div>
                {/* Clean Top Bar: Provider + Serial Index */}
                <div className="flex items-baseline justify-between border-b border-border/30 pb-3 font-mono text-[11px]">
                  <span className="tracking-wider text-muted-foreground uppercase">
                    {item.provider}
                  </span>
                  <span className="text-muted-foreground/60">
                    / {item.edition}
                  </span>
                </div>

                {/* Model Title */}
                <h3 className="mt-4 text-xl font-bold tracking-tight text-foreground transition-colors group-hover:text-emerald-500">
                  {item.name}
                </h3>

                {/* Summary - Clean typography */}
                <p className="mt-2.5 text-xs leading-relaxed text-muted-foreground">
                  {item.summary}
                </p>
              </div>

              {/* Bottom Meta & Action */}
              <div className="mt-8 flex items-center justify-between border-t border-border/30 pt-4 font-mono text-[11px]">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <span>{item.context}</span>
                  <span className="text-border">·</span>
                  <span className="text-foreground/70">{item.metric}</span>
                </div>

                <Link
                  to="/dashboard"
                  className="inline-flex items-center gap-1 font-sans text-xs font-medium text-emerald-500 transition-transform group-hover:translate-x-0.5"
                >
                  <span>{t("sec_models_explore")}</span>
                  <ArrowUpRight className="size-3" />
                </Link>
              </div>
            </AnimateInView>
          ))}
        </div>
      </div>
    </section>
  )
}
