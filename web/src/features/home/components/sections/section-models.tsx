/*
Copyright (C) 2023-2026 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.
*/
import { useEffect, useState } from "react"
import { Link } from "@tanstack/react-router"
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  BoxSelect,
  Check,
  CircleDollarSign,
  Copy,
  Gauge,
  Pause,
  Play,
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
  contextNote: string
  pricing: string
  pricingNote: string
  sitePrice: string
  sitePriceNote: string
  scenarios: string[]
  latency: string
  strengths: string[]
  accentColor: string
  glowColor: string
}

const ITEMS_PER_PAGE = 4

const MODELS: ModelItem[] = [
  {
    id: "claude-3-5-sonnet",
    name: "Claude 3.5 Sonnet",
    provider: "Anthropic",
    iconKey: "Claude.Color",
    category: "Reasoning & Coding",
    tag: "Flagship Logic",
    badge: "SOTA 架构",
    description: "顶尖代码架构、复杂系统推演与长文本深度推理，极高遵循能力。",
    context: "200K Tokens",
    contextNote: "约 15 万中文字符吞吐",
    pricing: "$3.00 / 1M",
    pricingNote: "输入 $3 · 输出 $15",
    sitePrice: "$2.40 / 1M",
    sitePriceNote: "输入 $2.4 · 输出 $12",
    scenarios: ["全栈代码架构重构", "长文档严谨推演", "复杂自主 Agent 编排"],
    latency: "< 800ms 首字",
    strengths: ["复杂指令精细遵循", "全栈代码重构与审查", "长链路逻辑推演"],
    accentColor: "rgb(249, 115, 22)",
    glowColor: "rgba(249, 115, 22, 0.22)",
  },
  {
    id: "deepseek-r1",
    name: "DeepSeek R1",
    provider: "DeepSeek",
    iconKey: "DeepSeek.Color",
    category: "Reasoning & Math",
    tag: "Open Thinking",
    badge: "满血思考链",
    description: "开源前沿长思维链深度推理模型，在数理证明、逻辑论证与算法构思上表现卓越。",
    context: "64K Tokens",
    contextNote: "原生 CoT 深度展开",
    pricing: "$0.55 / 1M",
    pricingNote: "输入 $0.55 · 输出 $2.19",
    sitePrice: "$0.44 / 1M",
    sitePriceNote: "输入 $0.44 · 输出 $1.75",
    scenarios: ["数理竞赛级论证证明", "算法难题与动态规划", "深度逻辑探索分析"],
    latency: "深度推导",
    strengths: ["数理化竞赛级证明", "原生 CoT 思考过程展示", "极致推理性价比"],
    accentColor: "rgb(59, 130, 246)",
    glowColor: "rgba(59, 130, 246, 0.22)",
  },
  {
    id: "gpt-4o",
    name: "GPT-4o",
    provider: "OpenAI",
    iconKey: "OpenAI.Color",
    category: "Omni Multimodal",
    tag: "Multimodal",
    badge: "全模态旗舰",
    description: "高并发图文多模态全能模型，视觉细节提取与跨语言理解能力敏锐精准。",
    context: "128K Tokens",
    contextNote: "高并发图文混合理解",
    pricing: "$2.50 / 1M",
    pricingNote: "输入 $2.5 · 输出 $10",
    sitePrice: "$2.00 / 1M",
    sitePriceNote: "输入 $2.0 · 输出 $8",
    scenarios: ["复杂商业图文解析", "高并发企业级接口", "跨语言交互全能助手"],
    latency: "< 650ms 首字",
    strengths: ["图文混合推理与提取", "高并发工业级可靠性", "复杂格式精准输出"],
    accentColor: "rgb(16, 185, 129)",
    glowColor: "rgba(16, 185, 129, 0.22)",
  },
  {
    id: "gemini-2-0-flash",
    name: "Gemini 2.0 Flash",
    provider: "Google",
    iconKey: "Gemini.Color",
    category: "High Speed & Long Context",
    tag: "Sub-second Stream",
    badge: "百万上下文",
    description: "兼备毫秒级超低首字延迟与百万超大窗口吞吐，敏捷交互与大规模文献速读利器。",
    context: "1M Tokens",
    contextNote: "超百万 Token 全库检索",
    pricing: "$0.10 / 1M",
    pricingNote: "输入 $0.1 · 输出 $0.4",
    sitePrice: "$0.08 / 1M",
    sitePriceNote: "输入 $0.08 · 输出 $0.32",
    scenarios: ["海量长篇文献与年报速读", "超大代码仓库全库索引", "低延迟实时流式问答"],
    latency: "< 380ms 首字",
    strengths: ["百万 Token 超长文本速查", "极速流式打字体验", "经济型大吞吐处理"],
    accentColor: "rgb(6, 182, 212)",
    glowColor: "rgba(6, 182, 212, 0.22)",
  },
  {
    id: "flux-1-pro",
    name: "FLUX.1 Pro",
    provider: "Black Forest Labs",
    iconKey: "Flux.Color",
    category: "Visual & Image",
    tag: "Photorealism",
    badge: "电影画质",
    description: "新一代前沿图像生成旗舰，细腻自然光影、人体微表情与排版文字清晰呈现。",
    context: "2K / 4K Master",
    contextNote: "影院级细腻光影质感",
    pricing: "$0.04 / 张",
    pricingNote: "商业高分辨率标准出图",
    sitePrice: "$0.032 / 张",
    sitePriceNote: "平台优惠定价",
    scenarios: ["电影级商业海报原画", "高精排版英文字符渲染", "艺术概念主体视觉设计"],
    latency: "极速出图",
    strengths: ["逼真电影级光影质感", "精准排版英文字符", "复杂主体肢体构图"],
    accentColor: "rgb(168, 85, 247)",
    glowColor: "rgba(168, 85, 247, 0.22)",
  },
  {
    id: "kling-1-5",
    name: "Kling 1.5 Pro",
    provider: "Kuaishou",
    iconKey: "Kling.Color",
    category: "Cinematic Video",
    tag: "Motion Dynamics",
    badge: "高物理保真",
    description: "电影级长镜头视频生成，支持平滑镜头运动轨迹、流体动力学与大尺度动作模拟。",
    context: "1080P / 4K Motion",
    contextNote: "物理规律高仿真动力学",
    pricing: "$0.12 / 秒",
    pricingNote: "按生成高清视频秒数计费",
    sitePrice: "$0.096 / 秒",
    sitePriceNote: "平台优惠定价",
    scenarios: ["高保真影视动态运镜", "流体动力与大动作模拟", "连贯多镜头创意短片"],
    latency: "分布式渲染",
    strengths: ["大动作连续性保持", "真实世界物理规律模拟", "多运镜模式平滑转换"],
    accentColor: "rgb(236, 72, 153)",
    glowColor: "rgba(236, 72, 153, 0.22)",
  },
  {
    id: "claude-3-5-haiku",
    name: "Claude 3.5 Haiku",
    provider: "Anthropic",
    iconKey: "Claude.Color",
    category: "High Speed & Code",
    tag: "Fast Agent",
    badge: "敏捷轻量",
    description: "极速响应轻量主力模型，在保持高智商水平的同时将调用成本与延迟降至极低。",
    context: "200K Tokens",
    contextNote: "敏捷轻量大窗口吞吐",
    pricing: "$0.80 / 1M",
    pricingNote: "输入 $0.8 · 输出 $4",
    sitePrice: "$0.64 / 1M",
    sitePriceNote: "输入 $0.64 · 输出 $3.2",
    scenarios: ["高频自动化客服筛选", "轻量代码编写与转换", "高并发分类与路由管道"],
    latency: "< 420ms 首字",
    strengths: ["快速工具调用", "高频客服与路由筛选", "高性价比代码编写"],
    accentColor: "rgb(245, 158, 11)",
    glowColor: "rgba(245, 158, 11, 0.22)",
  },
  {
    id: "o3-mini",
    name: "o3-mini",
    provider: "OpenAI",
    iconKey: "OpenAI.Color",
    category: "Reasoning & STEM",
    tag: "STEM Specialist",
    badge: "数理推演",
    description: "专注于编程、数学与科学工程推导的小型高智能推理模型，速度与逻辑兼备。",
    context: "128K Tokens",
    contextNote: "高密度算法与逻辑验证",
    pricing: "$1.10 / 1M",
    pricingNote: "输入 $1.1 · 输出 $4.4",
    sitePrice: "$0.88 / 1M",
    sitePriceNote: "输入 $0.88 · 输出 $3.52",
    scenarios: ["严密数学与物理推导", "竞赛级工程代码求解", "复杂 JSON 逻辑验证提取"],
    latency: "自适应思考",
    strengths: ["竞赛级算法与代码生成", "严密符号数理推演", "结构化精准解析"],
    accentColor: "rgb(14, 165, 233)",
    glowColor: "rgba(14, 165, 233, 0.22)",
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
  const [isPaused, setIsPaused] = useState(false)
  const { copiedText, copyToClipboard } = useCopyToClipboard({
    notify: true,
    successMessage: t("sec_models_copied"),
  })

  const activeModel = MODELS[activeIndex] ?? MODELS[0]
  const totalPages = Math.ceil(MODELS.length / ITEMS_PER_PAGE)
  const page = Math.floor(activeIndex / ITEMS_PER_PAGE)
  const currentList = MODELS.slice(page * ITEMS_PER_PAGE, (page + 1) * ITEMS_PER_PAGE)
  const copied = copiedText === activeModel.id

  useEffect(() => {
    if (isPaused) return
    const timer = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % MODELS.length)
    }, 5000)
    return () => clearInterval(timer)
  }, [isPaused])

  const goToPage = (nextPage: number) => {
    const bounded = (nextPage + totalPages) % totalPages
    setActiveIndex(bounded * ITEMS_PER_PAGE)
  }

  return (
    <section id="models" className="relative z-10 border-t border-border/40 px-4 sm:px-6 lg:px-8 py-14 md:py-20">
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
        {/* Section Header */}
        <AnimateInView className="mb-8 flex flex-col items-start justify-between gap-6 md:flex-row md:items-end lg:pl-4 xl:pl-6">
          <div>
            <h2 className="flex flex-wrap items-baseline gap-x-3 tracking-tight">
              <span className="hero-title-shine text-[clamp(2rem,4vw,3.2rem)] font-extrabold leading-tight">
                {t("sec_models_title_p1")}
              </span>
              <span className="hero-title-shine-emerald text-[clamp(1.4rem,2.8vw,2.2rem)] font-bold leading-tight">
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
        <div
          className="grid grid-cols-1 gap-5 lg:grid-cols-12 lg:gap-6 xl:gap-8"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          {/* ─── Left large showcase card ─── */}
          <div className="relative flex min-h-[480px] flex-col overflow-hidden rounded-3xl border border-border/60 bg-card/40 shadow-sm backdrop-blur-md transition-all duration-500 lg:col-span-6">
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
              {/* Provider + badge row */}
              <div className="landing-animate-fade-up mb-5 flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div
                    className="flex size-12 items-center justify-center rounded-2xl border border-border/50 bg-background/80 shadow-sm"
                    style={{ boxShadow: `0 0 24px ${activeModel.glowColor}` }}
                  >
                    <ProviderGlyph iconKey={activeModel.iconKey} size={26} />
                  </div>
                  <div>
                    <div className="text-sm font-semibold tracking-tight text-foreground">
                      {activeModel.provider}
                    </div>
                    <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <span
                        className="size-1.5 rounded-full"
                        style={{ backgroundColor: activeModel.accentColor, boxShadow: `0 0 6px ${activeModel.glowColor}` }}
                      />
                      {t("sec_models_status_ready")}
                    </div>
                  </div>
                </div>
                <span
                  className="inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-medium tracking-wide"
                  style={{
                    backgroundColor: activeModel.glowColor,
                    color: activeModel.accentColor,
                    border: `1px solid ${activeModel.accentColor}`,
                  }}
                >
                  {activeModel.badge}
                </span>
              </div>

              {/* Model name */}
              <h3 className="landing-animate-fade-up mb-2 text-2xl font-black tracking-tight text-foreground sm:text-3xl">
                {activeModel.name}
              </h3>

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

              {/* ── Bottom bar: copy + controls + CTA ── */}
              <div className="mt-auto flex items-center justify-between gap-3 border-t border-border/30 pt-4">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => copyToClipboard(activeModel.id)}
                    className="inline-flex items-center gap-1.5 rounded-full border border-border/50 bg-background/60 px-3 py-1.5 text-xs transition-colors hover:bg-muted cursor-pointer"
                  >
                    {copied ? <Check className="size-3 text-emerald-500" /> : <Copy className="size-3 text-muted-foreground" />}
                    <span className="font-mono text-[10px] text-foreground/70">{activeModel.id}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsPaused(!isPaused)}
                    className="flex items-center gap-1 text-[11px] text-muted-foreground transition-colors hover:text-foreground cursor-pointer"
                  >
                    {isPaused ? <Play className="size-3" /> : <Pause className="size-3" />}
                  </button>
                </div>

                {/* CTA → 模型广场 */}
                <Link
                  to={"/pricing" as any}
                  className="group inline-flex items-center gap-1.5 rounded-xl border border-border/50 bg-emerald-500/10 px-4 py-2 text-xs font-semibold text-emerald-600 transition-all duration-200 hover:bg-emerald-500 hover:text-white hover:shadow-[0_4px_14px_rgba(16,185,129,0.3)] dark:text-emerald-400 dark:hover:bg-emerald-500 dark:hover:text-background cursor-pointer"
                >
                  <Sparkles className="size-3.5" />
                  <span>前往模型广场</span>
                  <ArrowUpRight className="size-3 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </Link>
              </div>
            </div>
          </div>

          {/* ─── Right: 2×2 model selector cards ─── */}
          <div className="flex flex-col lg:col-span-6">
            <div className="grid flex-1 grid-cols-2 gap-3 lg:grid-cols-2 lg:gap-3.5">
              {currentList.map((model, index) => {
                const realIndex = page * ITEMS_PER_PAGE + index
                const isActive = realIndex === activeIndex
                return (
                  <button
                    key={model.id}
                    type="button"
                    onClick={() => setActiveIndex(realIndex)}
                    aria-pressed={isActive}
                    className={`group relative flex cursor-pointer flex-col overflow-hidden rounded-2xl border p-4 text-left transition-all duration-300 ${
                      isActive
                        ? "border-border bg-card/80 shadow-lg"
                        : "border-border/40 bg-card/20 hover:border-border/70 hover:bg-card/40"
                    }`}
                  >
                    {/* Accent top-bar on active */}
                    <div
                      className="pointer-events-none absolute inset-x-0 top-0 h-0.5 rounded-t-2xl transition-opacity duration-300"
                      style={{
                        background: `linear-gradient(90deg, ${model.accentColor}, transparent)`,
                        opacity: isActive ? 1 : 0,
                      }}
                    />
                    {/* Subtle accent bg glow */}
                    {isActive && (
                      <div
                        className="pointer-events-none absolute inset-0 opacity-[0.07] rounded-2xl"
                        style={{ backgroundColor: model.accentColor }}
                      />
                    )}

                    {/* Provider icon + tag */}
                    <div className="relative flex items-start justify-between gap-2 mb-3">
                      <div
                        className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-border/50 bg-background/80 shadow-sm transition-shadow duration-300"
                        style={isActive ? { boxShadow: `0 0 14px ${model.glowColor}` } : {}}
                      >
                        <ProviderGlyph iconKey={model.iconKey} size={18} />
                      </div>
                      <span
                        className="shrink-0 rounded-full px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-wider"
                        style={{ color: model.accentColor, backgroundColor: model.glowColor }}
                      >
                        {model.tag}
                      </span>
                    </div>

                    {/* Provider name */}
                    <div className="relative text-[10px] font-medium tracking-wide text-muted-foreground/60 mb-0.5">
                      {model.provider}
                    </div>

                    {/* Model name */}
                    <h4
                      className={`relative text-[13px] font-bold leading-snug tracking-tight transition-colors mb-2 ${
                        isActive ? "text-foreground" : "text-foreground/75 group-hover:text-foreground"
                      }`}
                    >
                      {model.name}
                    </h4>

                    {/* Short description */}
                    <p className="relative text-[11px] leading-relaxed text-muted-foreground/70 line-clamp-2 flex-1">
                      {model.description}
                    </p>

                    {/* Footer: context pill */}
                    <div className="relative mt-3 flex items-center justify-between border-t border-border/20 pt-2.5">
                      <div className="flex items-center gap-1.5 font-mono text-[10px] text-muted-foreground/60">
                        <span
                          className="inline-block size-1.5 rounded-full shrink-0"
                          style={{ backgroundColor: model.accentColor, opacity: isActive ? 1 : 0.5 }}
                        />
                        {model.context}
                      </div>
                      <span className="text-[10px] font-semibold" style={{ color: model.accentColor }}>
                        {model.sitePrice}
                      </span>
                    </div>
                  </button>
                )
              })}
            </div>

            {totalPages > 1 && (
              <div className="mt-4 flex items-center justify-end gap-3">
                <span className="font-mono text-xs text-muted-foreground">
                  0{page + 1} <span className="opacity-40">/</span> 0{totalPages}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => goToPage(page - 1)}
                    className="flex size-7 cursor-pointer items-center justify-center rounded-full border border-border/50 bg-background transition-colors hover:bg-muted"
                    aria-label={t("sec_models_nav_prev")}
                  >
                    <ArrowLeft className="size-3 text-foreground/70" />
                  </button>
                  <button
                    type="button"
                    onClick={() => goToPage(page + 1)}
                    className="flex size-7 cursor-pointer items-center justify-center rounded-full border border-border/50 bg-background transition-colors hover:bg-muted"
                    aria-label={t("sec_models_nav_next")}
                  >
                    <ArrowRight className="size-3 text-foreground/70" />
                  </button>
                </div>
              </div>
            )}
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
