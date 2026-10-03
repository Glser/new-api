/*
Copyright (C) 2023-2026 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.
*/
import { useState, useEffect, useMemo } from "react"
import { getPricing } from "@/features/pricing/api"
import { formatPrice } from "@/features/pricing/lib/price"
import type { PricingModel } from "@/features/pricing/types"
import { Link } from "@tanstack/react-router"
import {
  ArrowUpRight,
  BoxSelect,
  Check,
  CircleDollarSign,
  Copy,
  Gauge,
  Sparkles,
  Store,
  Tag,
  Zap,
} from "lucide-react"
import { useTranslation } from "react-i18next"

import { AnimateInView } from "@/components/animate-in-view"
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard"
import { getLobeIcon } from "@/lib/lobe-icon"

interface ModelItem {
  id: string
  name: string
  provider: string
  iconKey: string
  category: string
  tag: string
  badge: string
  description: string
  context: string
  pricing: string
  pricingNote: string
  sitePrice: string
  sitePriceNote: string
  scenarios: string[]
  latency: string
  accentColor: string
  glowColor: string
}

const MODELS: ModelItem[] = [
  {
    id: "claude-opus-5-5",
    name: "Claude Opus 5.5",
    provider: "Anthropic",
    iconKey: "Claude.Color",
    category: "Reasoning & Coding",
    tag: "Flagship Opus",
    badge: "SOTA 推理",
    description: "Anthropic 旗舰思维模型，具备扩展思维与深度推理能力，在复杂编程、科研分析与多轮 Agent 任务中全面领跑。",
    context: "200K Tokens",
    pricing: "$15.00 / 1M",
    pricingNote: "输入 $15 · 输出 $75",
    sitePrice: "$12.00 / 1M",
    sitePriceNote: "输入 $12 · 输出 $60",
    scenarios: ["超长上下文代码架构", "科研级复杂推演", "自主 Agent 工作流编排"],
    latency: "深度思维链",
    accentColor: "rgb(249, 115, 22)",
    glowColor: "rgba(249, 115, 22, 0.22)",
  },
  {
    id: "chatgpt-6-astra",
    name: "ChatGPT 6 Astra",
    provider: "OpenAI",
    iconKey: "Codex.Color",
    category: "Omni Multimodal",
    tag: "Next-Gen Omni",
    badge: "全感知旗舰",
    description: "OpenAI 下一代全模态模型，融合视觉、语音、实时交互与超长上下文，具备接近人类的感知推理与创作能力。",
    context: "256K Tokens",
    pricing: "$10.00 / 1M",
    pricingNote: "输入 $10 · 输出 $40",
    sitePrice: "$8.00 / 1M",
    sitePriceNote: "输入 $8 · 输出 $32",
    scenarios: ["多模态实时感知交互", "超长跨模态文档理解", "高并发创意生成工作流"],
    latency: "< 600ms 首字",
    accentColor: "rgb(16, 185, 129)",
    glowColor: "rgba(16, 185, 129, 0.22)",
  },
  {
    id: "deepseek-v4-1-flash",
    name: "DeepSeek v4.1 Flash",
    provider: "DeepSeek",
    iconKey: "DeepSeek.Color",
    category: "Fast Reasoning",
    tag: "Speed Thinking",
    badge: "极速思考链",
    description: "DeepSeek 新一代快速推理模型，保留完整思维链能力的同时大幅降低延迟，以极低成本实现顶级推理表现。",
    context: "128K Tokens",
    pricing: "$0.27 / 1M",
    pricingNote: "输入 $0.27 · 输出 $1.10",
    sitePrice: "$0.22 / 1M",
    sitePriceNote: "输入 $0.22 · 输出 $0.88",
    scenarios: ["高并发低成本推理任务", "实时数学与逻辑证明", "轻量 Agent 快速决策"],
    latency: "< 500ms 首字",
    accentColor: "rgb(59, 130, 246)",
    glowColor: "rgba(59, 130, 246, 0.22)",
  },
  {
    id: "grok-4-7",
    name: "Grok 4.7",
    provider: "xAI",
    iconKey: "Grok",
    category: "Frontier Reasoning",
    tag: "Heavy Thinking",
    badge: "前沿推理",
    description: "xAI Grok 系列旗舰，配备原生实时 X 平台信息接入与超强数理推理能力，在科学竞赛与复杂分析场景中表现卓越。",
    context: "256K Tokens",
    pricing: "$3.00 / 1M",
    pricingNote: "输入 $3 · 输出 $15",
    sitePrice: "$2.40 / 1M",
    sitePriceNote: "输入 $2.4 · 输出 $12",
    scenarios: ["实时信息融合推理", "科学竞赛级数理证明", "深度战略分析与规划"],
    latency: "深度思维链",
    accentColor: "rgb(139, 92, 246)",
    glowColor: "rgba(139, 92, 246, 0.22)",
  },
]

function ProviderGlyph(props: { iconKey: string; size?: number; className?: string }) {
  return (
    <span className={`flex shrink-0 items-center justify-center ${props.className ?? ""}`}>
      {getLobeIcon(props.iconKey, props.size ?? 20)}
    </span>
  )
}

export function SectionModels() {
  const { t } = useTranslation()
  const [activeIndex, setActiveIndex] = useState(0)
  const [backendModels, setBackendModels] = useState<PricingModel[]>([])

  useEffect(() => {
    let mounted = true
    getPricing()
      .then((res) => {
        if (mounted && res?.data && Array.isArray(res.data)) {
          setBackendModels(res.data)
        }
      })
      .catch(() => {
        // Silently fallback to static preset models if API fails
      })
    return () => {
      mounted = false
    }
  }, [])

  // Hydrate sitePrice dynamically from backend pricing data when matched
  const displayModels = useMemo(() => {
    if (!backendModels.length) return MODELS

    return MODELS.map((model) => {
      // Find matching model by id or name
      const match = backendModels.find((bm) => {
        const bmName = (bm.model_name || "").toLowerCase()
        const mId = model.id.toLowerCase()
        const mName = model.name.toLowerCase()
        return (
          bmName === mId ||
          bmName === mName ||
          bmName.includes(mId.replace(/-/g, "")) ||
          mId.includes(bmName.replace(/-/g, ""))
        )
      })

      if (match) {
        try {
          const inputPrice = formatPrice(match, "input", "M")
          const outputPrice = formatPrice(match, "output", "M")
          if (inputPrice && inputPrice !== "-") {
            return {
              ...model,
              sitePrice: `${inputPrice} / 1M`,
              sitePriceNote: `输入 ${inputPrice} · 输出 ${outputPrice}`,
            }
          }
        } catch {
          // ignore formatting fallback
        }
      }
      return model
    })
  }, [backendModels])
  const { copiedText, copyToClipboard } = useCopyToClipboard({
    notify: true,
    successMessage: t("sec_models_copied"),
  })

  const activeModel = displayModels[activeIndex] ?? displayModels[0]

  return (
    <section id="models" className="relative overflow-hidden px-4 sm:px-6 lg:px-8 py-20 sm:py-24">
      {/* Background glow and subtle grid */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-30 dark:opacity-20"
        style={{
          background:
            "radial-gradient(ellipse 65% 50% at 50% 30%, rgba(16, 185, 129, 0.12) 0%, transparent 70%)",
        }}
      />
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-[linear-gradient(to_right,var(--border)_1px,transparent_1px),linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] [mask-image:radial-gradient(ellipse_75%_65%_at_45%_35%,black_25%,transparent_100%)] bg-[size:4rem_4rem] opacity-[0.025]"
      />

      <div className="mx-auto max-w-7xl">
        {/* Section Header */}
        <AnimateInView className="mb-8 flex flex-col items-start justify-between gap-6 md:flex-row md:items-end lg:pl-4 xl:pl-6">
          <div>
            <h2 className="flex flex-wrap items-baseline gap-x-2 tracking-tight">
              <span className="hero-title-shine text-[clamp(2rem,4vw,3.2rem)] font-extrabold leading-tight">
                {t("sec_models_title_p1")}
              </span>
              <span className="hero-title-shine-emerald text-[clamp(1.75rem,3.5vw,2.9rem)] font-bold leading-tight">
                {t("sec_models_title_p2")}
              </span>
            </h2>
            <div className="mt-4 h-0.5 w-32 sm:w-48 rounded-full bg-gradient-to-r from-emerald-500 via-teal-400 to-transparent" />
            <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted-foreground md:text-base">
              {t("sec_models_desc")}
            </p>
          </div>

          <Link
            to={"/pricing" as any}
            className="group relative inline-flex h-9 items-center gap-2 overflow-hidden rounded-lg bg-emerald-500/10 px-4 text-xs font-semibold text-emerald-600 transition-all duration-300 hover:bg-emerald-500 hover:text-white hover:shadow-[0_4px_14px_rgba(16,185,129,0.25)] dark:text-emerald-400 dark:hover:bg-emerald-500 dark:hover:text-background cursor-pointer"
          >
            <span>{t("sec_models_view_all")}</span>
            <ArrowUpRight className="size-3.5 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </Link>
        </AnimateInView>

        {/* Main grid: left big card + right 2x2 small cards */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-12 lg:gap-6 xl:gap-8">
          {/* Left: Featured active model detail card */}
          <div className="group relative flex flex-col overflow-hidden rounded-3xl border border-border/70 bg-card/60 shadow-xl backdrop-blur-md transition-all duration-500 lg:col-span-6 xl:col-span-6">
            {/* Atmospheric glow */}
            <div
              className="pointer-events-none absolute inset-0 opacity-20 transition-colors duration-700"
              style={{
                background: `radial-gradient(circle at 0% 0%, ${activeModel.accentColor}, transparent 58%), radial-gradient(circle at 100% 100%, ${activeModel.glowColor}, transparent 46%)`,
              }}
            />
            <div
              className="pointer-events-none absolute -right-16 -top-16 size-48 rounded-full blur-3xl transition-colors duration-700"
              style={{ backgroundColor: activeModel.glowColor }}
            />

            <div className="relative flex flex-1 flex-col p-6 sm:p-8" key={activeModel.id}>
              {/* Icon + Model name + badge row */}
              <div className="landing-animate-fade-up mb-4 flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="flex size-12 shrink-0 items-center justify-center rounded-2xl border border-border/50 bg-background/80 shadow-sm"
                    style={{ boxShadow: `0 0 24px ${activeModel.glowColor}` }}
                  >
                    <ProviderGlyph iconKey={activeModel.iconKey} size={26} />
                  </div>
                  <h3 className="text-2xl font-black tracking-tight text-foreground sm:text-3xl leading-tight">
                    {activeModel.name}
                  </h3>
                </div>
                <span
                  className="inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-[10px] font-medium tracking-wide"
                  style={{
                    backgroundColor: activeModel.glowColor,
                    color: activeModel.accentColor,
                    border: `1px solid ${activeModel.accentColor}`,
                  }}
                >
                  {activeModel.badge}
                </span>
              </div>

              {/* Provider + status row */}
              <div className="landing-animate-fade-up mb-5 flex items-center gap-2">
                <span className="text-xs font-semibold tracking-wide text-muted-foreground/80">
                  {activeModel.provider}
                </span>
                <span className="text-muted-foreground/30 text-sm">·</span>
                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <span
                    className="size-1.5 rounded-full"
                    style={{ backgroundColor: activeModel.accentColor, boxShadow: `0 0 6px ${activeModel.glowColor}` }}
                  />
                  {t("sec_models_status_ready")}
                </div>
              </div>

              {/* Description */}
              <p className="landing-animate-fade-up mb-5 text-sm leading-relaxed text-muted-foreground">
                {activeModel.description}
              </p>

              {/* ── Params pill row ── */}
              <div className="landing-animate-fade-up mb-5 flex flex-wrap gap-2">
                {/* Context */}
                <div
                  className="flex items-center gap-1.5 rounded-full border border-border/50 bg-background/60 px-3 py-1.5"
                  style={{ borderColor: `${activeModel.accentColor}33` }}
                >
                  <BoxSelect className="size-3.5" style={{ color: activeModel.accentColor }} />
                  <span className="font-mono text-[11px] text-muted-foreground">{t("sec_models_context")}</span>
                  <span className="text-[11px] font-semibold text-foreground">{activeModel.context}</span>
                </div>
                {/* Latency */}
                <div
                  className="flex items-center gap-1.5 rounded-full border border-border/50 bg-background/60 px-3 py-1.5"
                  style={{ borderColor: `${activeModel.accentColor}33` }}
                >
                  <Gauge className="size-3.5" style={{ color: activeModel.accentColor }} />
                  <span className="font-mono text-[11px] text-muted-foreground">{t("sec_models_performance")}</span>
                  <span className="text-[11px] font-semibold text-foreground">{activeModel.latency}</span>
                </div>
                {/* Category */}
                <div
                  className="flex items-center gap-1.5 rounded-full border border-border/50 bg-background/60 px-3 py-1.5"
                  style={{ borderColor: `${activeModel.accentColor}33` }}
                >
                  <Zap className="size-3.5" style={{ color: activeModel.accentColor }} />
                  <span className="text-[11px] font-semibold text-foreground">{activeModel.category}</span>
                </div>
              </div>

              {/* ── Pricing comparison ── */}
              <div className="landing-animate-fade-up mb-5 overflow-hidden rounded-2xl border border-border/40 bg-background/30">
                {/* Header */}
                <div className="flex items-center gap-2 border-b border-border/30 px-4 py-2.5">
                  <CircleDollarSign className="size-3.5 text-muted-foreground" />
                  <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{t("sec_models_pricing")}</span>
                </div>
                <div className="grid grid-cols-2 divide-x divide-border/30">
                  {/* Official price */}
                  <div className="px-4 py-3">
                    <div className="mb-1 flex items-center gap-1.5">
                      <Tag className="size-3 text-muted-foreground/60" />
                      <span className="text-[10px] text-muted-foreground/70">官方定价</span>
                    </div>
                    <div className="text-base font-bold text-foreground/70 line-through decoration-muted-foreground/40">
                      {activeModel.pricing}
                    </div>
                    <div className="mt-0.5 text-[10px] text-muted-foreground/60">{activeModel.pricingNote}</div>
                  </div>
                  {/* Site price */}
                  <div className="relative px-4 py-3">
                    <div
                      className="pointer-events-none absolute inset-0 opacity-[0.06]"
                      style={{ backgroundColor: activeModel.accentColor }}
                    />
                    <div className="relative mb-1 flex items-center gap-1.5">
                      <Store className="size-3" style={{ color: activeModel.accentColor }} />
                      <span className="text-[10px] font-medium" style={{ color: activeModel.accentColor }}>平台价格</span>
                    </div>
                    <div className="relative text-base font-bold text-foreground" style={{ color: activeModel.accentColor }}>
                      {activeModel.sitePrice}
                    </div>
                    <div className="relative mt-0.5 text-[10px] text-muted-foreground/70">{activeModel.sitePriceNote}</div>
                  </div>
                </div>
              </div>

              {/* ── Scenarios ── */}
              <div className="landing-animate-fade-up mb-6">
                <div className="mb-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground/70">
                  {t("sec_models_scenarios")}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {activeModel.scenarios.map((s) => (
                    <div
                      key={s}
                      className="flex items-center gap-1.5 rounded-full border border-border/30 bg-background/40 px-2.5 py-1 text-[11px] text-foreground/80"
                    >
                      <span className="size-1 shrink-0 rounded-full" style={{ backgroundColor: activeModel.accentColor }} />
                      {s}
                    </div>
                  ))}
                </div>
              </div>

              {/* ── Bottom bar: copy + CTA ── */}
              <div className="mt-auto flex items-center justify-between gap-3 border-t border-border/30 pt-4">
                <button
                  type="button"
                  onClick={() => copyToClipboard(activeModel.id)}
                  className="flex items-center gap-2 rounded-xl border border-border/50 bg-background/50 px-3.5 py-2 font-mono text-xs text-muted-foreground transition-all duration-200 hover:border-foreground/30 hover:bg-background hover:text-foreground cursor-pointer"
                >
                  {copiedText === activeModel.id ? (
                    <>
                      <Check className="size-3.5 text-emerald-500" />
                      <span className="text-emerald-500 font-semibold">{t("sec_models_copied")}</span>
                    </>
                  ) : (
                    <>
                      <Copy className="size-3.5" />
                      <span className="font-semibold text-foreground/80">{activeModel.id}</span>
                    </>
                  )}
                </button>

                <Link
                  to={"/pricing" as any}
                  className="group relative inline-flex h-9 items-center gap-1.5 overflow-hidden rounded-xl px-4 text-xs font-semibold shadow-sm transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                  style={{
                    backgroundColor: activeModel.accentColor,
                    color: "#ffffff",
                    boxShadow: `0 4px 14px ${activeModel.glowColor}`,
                  }}
                >
                  <Sparkles className="size-3.5 transition-transform duration-300 group-hover:rotate-12" />
                  <span>前往模型广场</span>
                  <ArrowUpRight className="size-3.5 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </Link>
              </div>
            </div>
          </div>

          {/* Right: 2x2 clickable model cards grid */}
          <div className="flex flex-col justify-between lg:col-span-6 xl:col-span-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5 h-full">
              {displayModels.map((model, index) => {
                const isActive = index === activeIndex
                return (
                  <button
                    key={model.id}
                    type="button"
                    onClick={() => setActiveIndex(index)}
                    className={`group relative flex flex-col justify-between rounded-2xl border p-5 sm:p-5.5 text-left transition-all duration-300 cursor-pointer min-h-[190px] sm:min-h-[210px] ${
                      isActive
                        ? "border-border bg-card shadow-xl ring-2 ring-border/80"
                        : "border-border/60 bg-card/45 hover:border-border hover:bg-card/75 hover:shadow-md"
                    }`}
                  >
                    {/* Top Row: Provider Icon + Model Name on left, Provider Pill on right */}
                    <div className="relative flex items-center justify-between gap-3 mb-3.5">
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className="flex size-10 sm:size-11 shrink-0 items-center justify-center rounded-2xl border border-border/50 bg-background/80 shadow-sm transition-transform duration-300 group-hover:scale-105"
                          style={isActive ? { boxShadow: `0 0 16px ${model.glowColor}` } : {}}
                        >
                          <ProviderGlyph iconKey={model.iconKey} size={22} />
                        </div>
                        <h4
                          className={`text-[15px] sm:text-base font-bold leading-snug tracking-tight truncate transition-colors ${
                            isActive ? "text-foreground" : "text-foreground/85 group-hover:text-foreground"
                          }`}
                        >
                          {model.name}
                        </h4>
                      </div>

                      {/* Provider name replaces FLAGSHIP tag */}
                      <span
                        className="shrink-0 rounded-full px-2.5 py-1 font-mono text-[10px] sm:text-[11px] font-semibold tracking-wide"
                        style={{ color: model.accentColor, backgroundColor: model.glowColor, border: `1px solid ${model.accentColor}33` }}
                      >
                        {model.provider}
                      </span>
                    </div>

                    {/* Short description */}
                    <p className="relative text-xs sm:text-[12.5px] leading-relaxed text-muted-foreground/80 line-clamp-3 flex-1 mb-3">
                      {model.description}
                    </p>

                    {/* Footer: context pill + site price badge */}
                    <div className="relative mt-auto flex items-center justify-between border-t border-border/30 pt-3">
                      <div className="flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground">
                        <span
                          className="inline-block size-1.5 rounded-full shrink-0"
                          style={{ backgroundColor: model.accentColor, opacity: isActive ? 1 : 0.6 }}
                        />
                        {model.context}
                      </div>
                      <div className="flex items-center gap-1 text-xs">
                        <span className="text-[11px] text-muted-foreground">站内</span>
                        <span className="font-bold tracking-tight" style={{ color: model.accentColor }}>
                          {model.sitePrice}
                        </span>
                      </div>
                    </div>
                  </button>
                )
              })}
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
