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
  Activity,
  ArrowRight,
  ArrowUpRight,
  BadgePercent,
  Check,
  Coins,
  Copy,
  Gauge,
  Layers,
  Sparkles,
  TrendingDown,
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
  officialInput: string
  officialOutput: string
  siteInput: string
  siteOutput: string
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
    officialInput: "$15.00",
    officialOutput: "$75.00",
    siteInput: "$12.00",
    siteOutput: "$60.00",
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
    officialInput: "$10.00",
    officialOutput: "$40.00",
    siteInput: "$8.00",
    siteOutput: "$32.00",
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
    officialInput: "$0.27",
    officialOutput: "$1.10",
    siteInput: "$0.22",
    siteOutput: "$0.88",
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
    officialInput: "$3.00",
    officialOutput: "$15.00",
    siteInput: "$2.40",
    siteOutput: "$12.00",
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

function getDiscountPercent(officialStr: string, siteStr: string): string | null {
  const off = Number.parseFloat(String(officialStr || "").replaceAll(/[^0-9.]/g, ""))
  const site = Number.parseFloat(String(siteStr || "").replaceAll(/[^0-9.]/g, ""))
  if (!off || !site || site >= off) return null
  const pct = Math.round((1 - site / off) * 100)
  return pct > 0 ? `-${pct}%` : null
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
          bmName.includes(mId.replaceAll("-", "")) ||
          mId.includes(bmName.replaceAll("-", ""))
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
              siteInput: inputPrice,
              siteOutput: outputPrice && outputPrice !== "-" ? outputPrice : model.siteOutput,
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
  const activeInDiscount = getDiscountPercent(activeModel.officialInput, activeModel.siteInput)
  const activeOutDiscount = getDiscountPercent(activeModel.officialOutput, activeModel.siteOutput)
  const activeBestDiscount = activeInDiscount || activeOutDiscount

  return (
    <section id="models" className="relative overflow-hidden px-4 sm:px-6 lg:px-8 pt-10 sm:pt-14 pb-20 sm:pb-24">
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
        <AnimateInView className="mb-7 sm:mb-8 flex flex-col items-start justify-between gap-4 md:flex-row md:items-end lg:pl-4 xl:pl-6">
          <div>
            <h2 className="flex flex-wrap items-baseline gap-x-2 tracking-tight">
              <span className="hero-title-shine text-[clamp(1.85rem,3.6vw,2.9rem)] font-extrabold leading-tight">
                {t("sec_models_title_p1")}
              </span>
              <span className="hero-title-shine-emerald text-[clamp(1.65rem,3.2vw,2.6rem)] font-bold leading-tight">
                {t("sec_models_title_p2")}
              </span>
            </h2>
            <div className="mt-3.5 h-0.5 w-32 sm:w-48 rounded-full bg-gradient-to-r from-emerald-500 via-teal-400 to-transparent" />
            <p className="mt-3.5 max-w-xl text-sm leading-relaxed text-muted-foreground md:text-base">
              {t("sec_models_desc")}
            </p>
          </div>

          <Link
            to={"/pricing" as any}
            className="group relative inline-flex h-9.5 items-center gap-2 overflow-hidden rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-4 text-xs font-semibold text-emerald-600 transition-all duration-300 hover:bg-emerald-500 hover:text-white hover:shadow-[0_4px_16px_rgba(16,185,129,0.3)] dark:text-emerald-400 dark:hover:bg-emerald-500 dark:hover:text-background cursor-pointer"
          >
            <span>{t("sec_models_view_all")}</span>
            <ArrowUpRight className="size-3.5 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </Link>
        </AnimateInView>

        {/* 12-Column Precision Grid: Left (7 cols Flagship Studio Panel) + Right (5 cols Model Selector Radar) */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:gap-7">
          {/* Left: Flagship Studio Cockpit Panel (去除套盒嵌套，一体化建筑感暗调面板) */}
          <div className="group relative flex flex-col overflow-hidden rounded-3xl border border-border/70 bg-gradient-to-b from-card/90 via-card/75 to-card/60 shadow-2xl backdrop-blur-xl transition-all duration-500 lg:col-span-7">
            {/* Dynamic ambient backdrop illumination */}
            <div
              className="pointer-events-none absolute inset-0 opacity-25 transition-all duration-700"
              style={{
                background: "radial-gradient(circle 320px at 0% 0%, " + activeModel.accentColor + "25, transparent 75%), radial-gradient(circle 380px at 100% 100%, " + activeModel.glowColor + ", transparent 70%)",
              }}
            />
            <div
              className="pointer-events-none absolute -right-20 -top-20 size-64 rounded-full blur-3xl transition-all duration-700 opacity-60"
              style={{ backgroundColor: activeModel.glowColor }}
            />

            {/* Inner Content Container */}
            <div className="relative flex flex-1 flex-col p-6 sm:p-8 lg:p-9" key={activeModel.id}>
              {/* Header: Provider Glyph + Name + Status Indicator */}
              <div className="landing-animate-fade-up mb-4 flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-center gap-3.5 min-w-0">
                  <div
                    className="flex size-13 shrink-0 items-center justify-center rounded-2xl border border-border/40 bg-background/60 shadow-md backdrop-blur-md transition-transform duration-300 hover:scale-105"
                    style={{ filter: "drop-shadow(0 4px 14px " + activeModel.glowColor + ")" }}
                  >
                    <ProviderGlyph iconKey={activeModel.iconKey} size={32} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-xs font-semibold uppercase tracking-wider text-muted-foreground/80">
                        {activeModel.provider}
                      </span>
                      <span className="text-muted-foreground/30 text-xs">·</span>
                      <div className="flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground/90">
                        <span
                          className="size-1.5 rounded-full animate-pulse"
                          style={{
                            backgroundColor: activeModel.accentColor,
                            boxShadow: "0 0 8px " + activeModel.accentColor,
                          }}
                        />
                        <span>{t("sec_models_status_ready")}</span>
                      </div>
                    </div>
                    <h3 className="text-2xl font-black tracking-tight text-foreground sm:text-3xl leading-tight">
                      {activeModel.name}
                    </h3>
                  </div>
                </div>

                <span
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 font-mono text-xs font-semibold tracking-wide shadow-2xs"
                  style={{
                    backgroundColor: activeModel.accentColor + "15",
                    color: activeModel.accentColor,
                    border: "1px solid " + activeModel.accentColor + "35",
                  }}
                >
                  <Sparkles className="size-3" />
                  {activeModel.badge}
                </span>
              </div>

              {/* Description */}
              <p className="landing-animate-fade-up mb-5 text-[13.5px] leading-relaxed text-muted-foreground sm:text-sm">
                {activeModel.description}
              </p>

              {/* Specs Rail (精细无框分割流) */}
              <div className="landing-animate-fade-up mb-6 grid grid-cols-3 gap-2 rounded-2xl border border-border/50 bg-muted/20 dark:bg-muted/10 p-2.5 backdrop-blur-md">
                {/* Context Window */}
                <div className="flex flex-col gap-0.5 px-2 py-1">
                  <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    <Layers className="size-3.5 shrink-0" style={{ color: activeModel.accentColor }} />
                    <span>{t("sec_models_context")}</span>
                  </div>
                  <span className="font-mono text-xs sm:text-[13px] font-bold text-foreground tabular-nums">
                    {activeModel.context}
                  </span>
                </div>

                {/* Performance / Latency */}
                <div className="flex flex-col gap-0.5 border-x border-border/40 px-2 py-1">
                  <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    <Gauge className="size-3.5 shrink-0" style={{ color: activeModel.accentColor }} />
                    <span>{t("sec_models_performance")}</span>
                  </div>
                  <span className="font-mono text-xs sm:text-[13px] font-bold text-foreground">
                    {activeModel.latency}
                  </span>
                </div>

                {/* Capability Category */}
                <div className="flex flex-col gap-0.5 px-2 py-1">
                  <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    <Activity className="size-3.5 shrink-0" style={{ color: activeModel.accentColor }} />
                    <span>定位领域</span>
                  </div>
                  <span className="text-xs sm:text-[13px] font-bold text-foreground truncate">
                    {activeModel.category}
                  </span>
                </div>
              </div>

              {/* ── Precision Machined Pricing Cockpit (数字机甲级双轨测算台) ── */}
              <div className="landing-animate-fade-up mb-6 relative overflow-hidden rounded-2xl border border-border/60 bg-background/50 dark:bg-background/40 p-4 sm:p-5 backdrop-blur-xl shadow-lg transition-all duration-300">
                {/* Cockpit Header Status Bar */}
                <div className="mb-3.5 flex items-center justify-between border-b border-border/40 pb-3">
                  <div className="flex items-center gap-2">
                    <div
                      className="flex size-6 items-center justify-center rounded-lg shadow-2xs"
                      style={{
                        background: "linear-gradient(135deg, " + activeModel.accentColor + ", " + activeModel.accentColor + "dd)",
                        color: "#ffffff",
                      }}
                    >
                      <Coins className="size-3.5" />
                    </div>
                    <span className="text-xs font-bold tracking-tight text-foreground">
                      {t("sec_models_pricing")}
                    </span>
                    <span className="rounded-md border border-border/60 bg-muted/40 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                      / 1,000,000 Tokens (1M)
                    </span>
                  </div>

                  {activeBestDiscount && (
                    <span
                      className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 font-mono text-[11px] font-extrabold tracking-tight text-white shadow-xs animate-in fade-in"
                      style={{
                        background: activeModel.accentColor,
                        boxShadow: "0 2px 10px " + activeModel.glowColor,
                      }}
                    >
                      <BadgePercent className="size-3.5" />
                      <span>{t("Discount")} {activeBestDiscount}</span>
                    </span>
                  )}
                </div>

                {/* Dual-lane Data Cockpit: Input (Prompt) vs Output (Completion) */}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {/* Lane 1: Input (Prompt) */}
                  <div className="group/lane relative flex flex-col justify-between rounded-xl border border-border/50 bg-card/70 p-3.5 transition-all hover:border-border hover:bg-card/90">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <span
                          className="flex size-5.5 shrink-0 items-center justify-center rounded-md font-mono text-[11px] font-bold text-white shadow-2xs"
                          style={{ background: activeModel.accentColor }}
                        >
                          入
                        </span>
                        <div>
                          <div className="text-xs font-bold text-foreground">
                            {t("Input")}
                          </div>
                          <div className="font-mono text-[10px] text-muted-foreground/75">
                            Prompt Tokens
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 font-mono text-xs text-muted-foreground/80">
                        <span className="text-[10px] text-muted-foreground/60">{t("Official")}</span>
                        <span className="line-through decoration-muted-foreground/60 font-medium tabular-nums">
                          {activeModel.officialInput}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-baseline justify-between gap-1 pt-1 border-t border-border/30">
                      <div className="flex items-baseline gap-1">
                        <span
                          className="font-mono text-2xl sm:text-[26px] font-black tracking-tight tabular-nums leading-none"
                          style={{ color: activeModel.accentColor }}
                        >
                          {activeModel.siteInput}
                        </span>
                        <span className="font-mono text-[11px] text-muted-foreground/70">
                          / 1M
                        </span>
                      </div>

                      {activeInDiscount && (
                        <span className="font-mono text-xs font-bold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                          立省 {activeInDiscount.replace("-", "")}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Lane 2: Output (Completion) */}
                  <div className="group/lane relative flex flex-col justify-between rounded-xl border border-border/50 bg-card/70 p-3.5 transition-all hover:border-border hover:bg-card/90">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <span className="flex size-5.5 shrink-0 items-center justify-center rounded-md border border-border bg-foreground text-background font-mono text-[11px] font-bold shadow-2xs">
                          出
                        </span>
                        <div>
                          <div className="text-xs font-bold text-foreground">
                            {t("Output")}
                          </div>
                          <div className="font-mono text-[10px] text-muted-foreground/75">
                            Completion Tokens
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 font-mono text-xs text-muted-foreground/80">
                        <span className="text-[10px] text-muted-foreground/60">{t("Official")}</span>
                        <span className="line-through decoration-muted-foreground/60 font-medium tabular-nums">
                          {activeModel.officialOutput}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-baseline justify-between gap-1 pt-1 border-t border-border/30">
                      <div className="flex items-baseline gap-1">
                        <span
                          className="font-mono text-2xl sm:text-[26px] font-black tracking-tight tabular-nums leading-none"
                          style={{ color: activeModel.accentColor }}
                        >
                          {activeModel.siteOutput}
                        </span>
                        <span className="font-mono text-[11px] text-muted-foreground/70">
                          / 1M
                        </span>
                      </div>

                      {activeOutDiscount && (
                        <span className="font-mono text-xs font-bold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                          立省 {activeOutDiscount.replace("-", "")}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Sub-lane: Cost Advantage Benchmark Banner */}
                <div className="mt-3 flex items-center justify-between rounded-lg bg-muted/30 px-3 py-1.5 text-[11px] text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <TrendingDown className="size-3.5 text-emerald-500" />
                    <span>原生高可用节点直连 · 计费透明按量抵扣</span>
                  </div>
                  <span className="font-mono font-medium text-foreground/80">
                    无预充值门槛
                  </span>
                </div>
              </div>

              {/* Scenarios capability pills */}
              <div className="landing-animate-fade-up mb-6">
                <div className="mb-2.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground/70">
                  {t("sec_models_scenarios")}
                </div>
                <div className="flex flex-wrap gap-2">
                  {activeModel.scenarios.map((s) => (
                    <div
                      key={s}
                      className="flex items-center gap-2 rounded-xl border border-border/40 bg-background/50 px-3 py-1 text-xs text-foreground/85 transition-colors hover:border-border hover:bg-background"
                    >
                      <span className="size-1.5 shrink-0 rounded-full" style={{ backgroundColor: activeModel.accentColor }} />
                      <span>{s}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Bottom bar: Copy ID + Call to Action */}
              <div className="mt-auto flex items-center justify-between gap-3 border-t border-border/40 pt-4">
                <button
                  type="button"
                  onClick={() => copyToClipboard(activeModel.id)}
                  className="flex items-center gap-2 rounded-xl border border-border/60 bg-background/60 px-3.5 py-2 font-mono text-xs text-muted-foreground transition-all duration-200 hover:border-foreground/30 hover:bg-background hover:text-foreground cursor-pointer"
                  title="点击复制模型 ID 用于代码调用"
                >
                  {copiedText === activeModel.id ? (
                    <>
                      <Check className="size-3.5 text-emerald-500" />
                      <span className="text-emerald-500 font-semibold">{t("sec_models_copied")}</span>
                    </>
                  ) : (
                    <>
                      <Copy className="size-3.5" />
                      <span className="font-semibold text-foreground/90">{activeModel.id}</span>
                    </>
                  )}
                </button>

                <Link
                  to={"/pricing" as any}
                  className="group relative inline-flex h-9.5 items-center gap-1.5 overflow-hidden rounded-xl px-4.5 text-xs font-semibold shadow-md transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                  style={{
                    backgroundColor: activeModel.accentColor,
                    color: "#ffffff",
                    boxShadow: "0 4px 16px " + activeModel.glowColor,
                  }}
                >
                  <Sparkles className="size-3.5 transition-transform duration-300 group-hover:rotate-12" />
                  <span>前往模型广场</span>
                  <ArrowRight className="size-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
                </Link>
              </div>
            </div>
          </div>

          {/* Right: 5-Column High-Clarity Model Selector Radar (精炼高效、高对比度选型矩阵) */}
          <div className="flex flex-col justify-between lg:col-span-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3 sm:gap-3.5 h-full">
              {displayModels.map((model, index) => {
                const isActive = index === activeIndex
                const modelInDiscount = getDiscountPercent(model.officialInput, model.siteInput)
                const modelOutDiscount = getDiscountPercent(model.officialOutput, model.siteOutput)
                const modelBestDiscount = modelInDiscount || modelOutDiscount

                return (
                  <button
                    key={model.id}
                    type="button"
                    onClick={() => setActiveIndex(index)}
                    style={
                      isActive
                        ? {
                            borderColor: model.accentColor + "80",
                            boxShadow: "0 14px 28px -8px " + model.glowColor + ", 0 0 0 1px " + model.accentColor + "40",
                          }
                        : {}
                    }
                    className={"group relative flex flex-col justify-between rounded-2xl border p-4.5 sm:p-5 text-left transition-all duration-300 cursor-pointer " + (
                      isActive
                        ? "bg-card/95 shadow-xl -translate-y-0.5"
                        : "border-border/60 bg-card/40 hover:border-border/90 hover:bg-card/80 hover:shadow-md"
                    )}
                  >
                    {/* Active Edge Indicator Bar (左侧微光锚点) */}
                    {isActive && (
                      <div
                        className="absolute inset-y-0 left-0 w-1 rounded-l-2xl"
                        style={{ backgroundColor: model.accentColor }}
                      />
                    )}

                    {/* Top row: Provider Glyph + Name + Badge */}
                    <div className="relative flex items-center justify-between gap-3 mb-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-border/40 bg-background/50 transition-transform duration-300 group-hover:scale-110"
                          style={{ filter: "drop-shadow(0 2px 6px " + model.glowColor + ")" }}
                        >
                          <ProviderGlyph iconKey={model.iconKey} size={22} />
                        </div>
                        <div className="min-w-0">
                          <h4
                            className={"text-[15px] font-bold leading-tight tracking-tight truncate transition-colors " + (
                              isActive ? "text-foreground" : "text-foreground/90 group-hover:text-foreground"
                            )}
                          >
                            {model.name}
                          </h4>
                          <span className="font-mono text-[11px] text-muted-foreground/75 truncate block">
                            {model.provider} · {model.category}
                          </span>
                        </div>
                      </div>

                      <span
                        className="shrink-0 rounded-full px-2 py-0.5 font-mono text-[10px] font-bold tracking-wide"
                        style={{
                          color: model.accentColor,
                          backgroundColor: model.accentColor + "18",
                          border: "1px solid " + model.accentColor + "30",
                        }}
                      >
                        {model.badge}
                      </span>
                    </div>

                    {/* Mid row: Clean Starting Price & Specs Highlight */}
                    <div className="relative mt-2 flex items-center justify-between rounded-xl border border-border/40 bg-muted/20 dark:bg-muted/10 px-3 py-2">
                      {/* Price Section */}
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-[11px] font-medium text-muted-foreground">起步</span>
                        <span
                          className="font-mono text-base sm:text-lg font-black tracking-tight tabular-nums"
                          style={{ color: model.accentColor }}
                        >
                          {model.siteInput}
                        </span>
                        <span className="font-mono text-[10px] text-muted-foreground/60 line-through tabular-nums">
                          {model.officialInput}
                        </span>
                        <span className="font-mono text-[10px] text-muted-foreground/70">/ 1M</span>
                      </div>

                      {/* Best Discount Pill */}
                      {modelBestDiscount && (
                        <span
                          className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 font-mono text-[10px] font-bold text-white shadow-2xs"
                          style={{ background: model.accentColor }}
                        >
                          <BadgePercent className="size-2.5 shrink-0" />
                          {modelBestDiscount}
                        </span>
                      )}
                    </div>

                    {/* Footer Row: Context Tokens & Active Trigger Status */}
                    <div className="relative mt-3 flex items-center justify-between border-t border-border/30 pt-2.5 text-[11px]">
                      <div className="flex items-center gap-1.5 font-mono text-muted-foreground/80">
                        <Layers className="size-3" style={{ color: model.accentColor }} />
                        <span>{model.context}</span>
                      </div>

                      <div className="flex items-center gap-1.5 font-mono text-[11px]">
                        <span
                          className={"size-1.5 rounded-full transition-transform duration-300 " + (
                            isActive ? "scale-125" : "opacity-40"
                          )}
                          style={{ backgroundColor: model.accentColor }}
                        />
                        <span className={isActive ? "font-semibold text-foreground" : "text-muted-foreground/70"}>
                          {isActive ? "当前聚焦" : "点击切换"}
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
