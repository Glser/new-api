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
*/
import { useEffect, useMemo, useState } from "react"
import { getPricing } from "@/features/pricing/api"
import { formatPrice } from "@/features/pricing/lib/price"
import type { PricingModel } from "@/features/pricing/types"
import { Link } from "@tanstack/react-router"
import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  Building2,
  Gauge,
  Layers,
  Sparkles,
  type LucideIcon,
} from "lucide-react"
import { useTranslation } from "react-i18next"

import { AnimateInView } from "@/components/animate-in-view"
import { CopyButton } from "@/components/copy-button"
import { Button } from "@/components/ui/button"
import { TooltipProvider } from "@/components/ui/tooltip"
import { getLobeIcon } from "@/lib/lobe-icon"
import { cn } from "@/lib/utils"

interface ModelItem {
  id: string
  name: string
  provider: string
  iconKey: string
  category: string
  badge: string
  description: string
  context: string
  officialInput: string
  officialOutput: string
  siteInput: string
  siteOutput: string
  scenarios: string[]
  tags: string[]
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
    badge: "SOTA 推理",
    description:
      "Anthropic 旗舰思维模型，具备扩展思维与深度推理能力，在复杂编程、科研分析与多轮 Agent 任务中全面领跑。",
    context: "200K Tokens",
    officialInput: "$15.00",
    officialOutput: "$75.00",
    siteInput: "$12.00",
    siteOutput: "$60.00",
    scenarios: ["超长上下文代码架构", "科研级复杂推演", "自主 Agent 工作流编排"],
    tags: ["Reasoning", "Coding", "Agent"],
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
    badge: "全感知旗舰",
    description:
      "OpenAI 下一代全模态模型，融合视觉、语音、实时交互与超长上下文，具备接近人类的感知推理与创作能力。",
    context: "256K Tokens",
    officialInput: "$10.00",
    officialOutput: "$40.00",
    siteInput: "$8.00",
    siteOutput: "$32.00",
    scenarios: ["多模态实时感知交互", "超长跨模态文档理解", "高并发创意生成工作流"],
    tags: ["Multimodal", "Realtime", "Creative"],
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
    badge: "极速思考链",
    description:
      "DeepSeek 新一代快速推理模型，保留完整思维链能力的同时大幅降低延迟，以极低成本实现顶级推理表现。",
    context: "128K Tokens",
    officialInput: "$0.27",
    officialOutput: "$1.10",
    siteInput: "$0.22",
    siteOutput: "$0.88",
    scenarios: ["高并发低成本推理任务", "实时数学与逻辑证明", "轻量 Agent 快速决策"],
    tags: ["Fast", "Reasoning", "Value"],
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
    badge: "前沿推理",
    description:
      "xAI Grok 系列旗舰，配备原生实时 X 平台信息接入与超强数理推理能力，在科学竞赛与复杂分析场景中表现卓越。",
    context: "256K Tokens",
    officialInput: "$3.00",
    officialOutput: "$15.00",
    siteInput: "$2.40",
    siteOutput: "$12.00",
    scenarios: ["实时信息融合推理", "科学竞赛级数理证明", "深度战略分析与规划"],
    tags: ["Realtime", "Science", "Analysis"],
    latency: "深度思维链",
    accentColor: "rgb(139, 92, 246)",
    glowColor: "rgba(139, 92, 246, 0.22)",
  },
]

/* Surfaces are tuned per theme: a near-white card in light mode so the panel
 * reads as raised against the page instead of dissolving into it, and a
 * translucent white veil in dark mode so the accent glow behind it shows. */
const glassPanelClassName =
  "border-slate-900/[0.08] bg-white/85 shadow-[0_1px_2px_rgba(15,23,42,0.05),0_24px_50px_-30px_rgba(15,23,42,0.28)] backdrop-blur-2xl dark:border-white/10 dark:bg-white/[0.05] dark:shadow-[0_18px_50px_-24px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.08)]"

const glassCapsuleClassName =
  "rounded-2xl border border-slate-900/[0.07] bg-slate-500/[0.04] shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] backdrop-blur-xl sm:rounded-full dark:border-white/10 dark:bg-white/[0.05] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"

function ProviderGlyph(props: { iconKey: string; size?: number }) {
  return (
    <span className="flex shrink-0 items-center justify-center">
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

function hydrateModels(backendModels: PricingModel[]): ModelItem[] {
  if (!backendModels.length) return MODELS

  return MODELS.map((model) => {
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

    if (!match) return model

    try {
      const inputPrice = formatPrice(match, "input", "M")
      const outputPrice = formatPrice(match, "output", "M")
      if (inputPrice && inputPrice !== "-") {
        return {
          ...model,
          siteInput: inputPrice,
          siteOutput: outputPrice && outputPrice !== "-" ? outputPrice : model.siteOutput,
        }
      }
    } catch {
      return model
    }

    return model
  })
}

function PricePair(props: {
  input: string
  output: string
  accent?: string
  muted?: boolean
}) {
  const { t } = useTranslation()

  const valueClassName = cn(
    "font-semibold tabular-nums tracking-tight",
    props.muted
      ? "text-[13px] text-muted-foreground"
      : "text-base sm:text-lg text-foreground",
    props.accent ? "font-mono" : "font-mono text-[13px]"
  )

  return (
    <div className="flex min-w-0 items-center gap-3 font-mono tabular-nums">
      <span className="flex items-baseline gap-1.5">
        <span className="text-[10px] font-medium text-muted-foreground/70">{t("Input")}</span>
        <span
          className={valueClassName}
          style={props.accent ? { color: props.accent } : undefined}
        >
          {props.input}
        </span>
      </span>
      <span aria-hidden className="h-3 w-px bg-slate-900/10 dark:bg-white/15" />
      <span className="flex items-baseline gap-1.5">
        <span className="text-[10px] font-medium text-muted-foreground/70">{t("Output")}</span>
        <span
          className={valueClassName}
          style={props.accent ? { color: props.accent } : undefined}
        >
          {props.output}
        </span>
      </span>
    </div>
  )
}

/* One spec = icon + value. The label stays in the DOM as an `sr-only`
 * definition term so the strip keeps its meaning for assistive tech while
 * the small 10px label text is gone from the visual design. */
function SpecChip(props: {
  icon: LucideIcon
  label: string
  value: string
  accent: string
}) {
  const Icon = props.icon

  return (
    <div className="flex min-w-0 items-center gap-2">
      <dt className="sr-only">{props.label}</dt>
      <Icon className="size-4 shrink-0" style={{ color: props.accent }} aria-hidden />
      <dd className="truncate text-xs font-semibold text-foreground">{props.value}</dd>
    </div>
  )
}

function PriceLedger(props: { model: ModelItem }) {
  const { t } = useTranslation()
  const model = props.model
  const inDiscount = getDiscountPercent(model.officialInput, model.siteInput)
  const outDiscount = getDiscountPercent(model.officialOutput, model.siteOutput)
  const bestDiscount = inDiscount || outDiscount

  return (
    <div className={cn("relative px-4 py-3.5", glassCapsuleClassName)}>
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <span className="text-[11px] font-medium text-muted-foreground">
          {t("sec_models_pricing")}
        </span>
        <span className="font-mono text-[10px] text-muted-foreground/70">
          {t("sec_models_per_million")}
        </span>
      </div>

      <dl className="grid gap-3 sm:grid-cols-2 sm:gap-0 sm:divide-x sm:divide-slate-900/[0.08] dark:sm:divide-white/10">
        <div className="min-w-0 sm:pr-5">
          <dt className="text-[11px] text-muted-foreground">{t("sec_models_official_rate")}</dt>
          <dd className="mt-1.5">
            <PricePair input={model.officialInput} output={model.officialOutput} muted />
          </dd>
        </div>

        <div className="min-w-0 sm:pl-5">
          <dt className="flex items-center gap-2 text-[11px] font-semibold text-foreground">
            {t("sec_models_site_rate")}
            {bestDiscount ? (
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 font-mono text-[10px] font-bold text-white shadow-sm",
                  // Perched on the seam between the two lanes on desktop so it
                  // reads as the delta between them, not as part of either label.
                  "sm:absolute sm:left-1/2 sm:top-0 sm:-translate-x-1/2 sm:-translate-y-1/2"
                )}
                style={{ backgroundColor: model.accentColor }}
              >
                {bestDiscount}
                <span className="sr-only">{t("sec_models_save")}</span>
              </span>
            ) : null}
          </dt>
          <dd className="mt-1.5">
            <PricePair
              input={model.siteInput}
              output={model.siteOutput}
              accent={model.accentColor}
            />
          </dd>
        </div>
      </dl>
    </div>
  )
}

function FeaturedModelCard(props: { model: ModelItem }) {
  const { t } = useTranslation()
  const model = props.model

  return (
    <article
      className={cn(
        "group relative flex h-full flex-col overflow-hidden rounded-3xl border",
        glassPanelClassName
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-40 transition-opacity duration-500 dark:opacity-30"
        style={{
          background: `radial-gradient(ellipse 70% 55% at 0% 0%, ${model.glowColor}, transparent 62%), radial-gradient(ellipse 55% 45% at 100% 100%, ${model.glowColor}, transparent 68%)`,
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 -top-20 size-56 rounded-full blur-3xl opacity-50"
        style={{ backgroundColor: model.glowColor }}
      />

      <div className="relative flex flex-1 flex-col p-5 sm:p-6 lg:p-7" key={model.id}>
        {/* The provider name lives in the footer as provenance so the model
         * name owns this hierarchy. */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3.5">
            <span
              className="flex size-11 shrink-0 items-center justify-center"
              style={{ filter: `drop-shadow(0 6px 14px ${model.glowColor})` }}
            >
              <ProviderGlyph iconKey={model.iconKey} size={30} />
            </span>
            <h3 className="min-w-0 text-2xl font-bold leading-tight tracking-tight text-foreground sm:text-[1.7rem]">
              {model.name}
            </h3>
          </div>

          <span
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold"
            style={{
              backgroundColor: `${model.accentColor}18`,
              color: model.accentColor,
              borderColor: `${model.accentColor}35`,
            }}
          >
            <Sparkles className="size-3" aria-hidden />
            {model.badge}
          </span>
        </div>

        {/* Description owns the free vertical space and stays centered. */}
        <div className="flex flex-1 items-center py-6 sm:py-8">
          <p className="max-w-prose text-sm leading-relaxed text-muted-foreground sm:text-[0.95rem]">
            {model.description}
          </p>
        </div>

        <dl className={cn("mb-3 flex flex-wrap items-center gap-2 px-3 py-2.5", glassCapsuleClassName)}>
          <SpecChip
            icon={Layers}
            label={t("sec_models_context")}
            value={model.context}
            accent={model.accentColor}
          />
          <span aria-hidden className="hidden h-5 w-px bg-slate-900/10 dark:bg-white/15 sm:block" />
          <SpecChip
            icon={Gauge}
            label={t("sec_models_performance")}
            value={model.latency}
            accent={model.accentColor}
          />
          <span aria-hidden className="hidden h-5 w-px bg-slate-900/10 dark:bg-white/15 sm:block" />
          <SpecChip
            icon={Activity}
            label={t("sec_models_category")}
            value={model.category}
            accent={model.accentColor}
          />
        </dl>

        <PriceLedger model={model} />

        <div className="mb-3 mt-4">
          <div className="mb-2 text-[11px] text-muted-foreground">{t("sec_models_scenarios")}</div>
          <ul className="flex flex-wrap gap-2">
            {model.scenarios.map((scenario) => (
              <li
                key={scenario}
                className="inline-flex items-center gap-2 rounded-full border border-slate-900/[0.08] bg-white/60 px-3 py-1 text-xs text-foreground/85 backdrop-blur-md dark:border-white/10 dark:bg-white/[0.06]"
              >
                <span
                  className="size-1.5 shrink-0 rounded-full"
                  style={{ backgroundColor: model.accentColor }}
                />
                {scenario}
              </li>
            ))}
          </ul>
        </div>

        <ul className="mb-5 flex flex-wrap gap-1.5">
          {model.tags.map((tag) => (
            <li
              key={tag}
              className="rounded-full border border-slate-900/[0.08] bg-slate-500/[0.05] px-2.5 py-0.5 font-mono text-[10px] text-muted-foreground dark:border-white/10 dark:bg-white/[0.05]"
            >
              {tag}
            </li>
          ))}
        </ul>

        <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-slate-900/[0.08] pt-4 dark:border-white/10">
          <TooltipProvider delay={0}>
            <CopyButton
              value={model.id}
              variant="outline"
              size="sm"
              className="h-9 gap-1.5 rounded-full border-slate-900/10 bg-white/60 px-3 font-mono text-xs backdrop-blur-md dark:border-white/10 dark:bg-white/[0.06]"
              tooltip={t("sec_models_copy_id")}
              successTooltip={t("sec_models_copied")}
            >
              <span className="max-w-[14rem] truncate">{model.id}</span>
            </CopyButton>
          </TooltipProvider>

          <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <Building2 className="size-3.5 shrink-0" aria-hidden />
            {model.provider}
          </span>
          <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground/90">
            <span
              className="size-1.5 shrink-0 rounded-full"
              style={{
                backgroundColor: model.accentColor,
                boxShadow: `0 0 8px ${model.accentColor}`,
              }}
            />
            {t("sec_models_status_ready")}
          </span>

          <Button
            size="lg"
            className="ml-auto h-9 rounded-full px-4"
            render={<Link to="/pricing" search={{ search: model.id }} />}
          >
            {t("sec_models_view_model")}
            <ArrowRight className="size-3.5" aria-hidden />
          </Button>
        </div>
      </div>
    </article>
  )
}

function CompactModelCard(props: {
  model: ModelItem
  selected: boolean
  onSelect: () => void
}) {
  const { t } = useTranslation()
  const model = props.model
  const inDiscount = getDiscountPercent(model.officialInput, model.siteInput)
  const outDiscount = getDiscountPercent(model.officialOutput, model.siteOutput)
  const bestDiscount = inDiscount || outDiscount

  return (
    <button
      type="button"
      onClick={props.onSelect}
      aria-pressed={props.selected}
      aria-label={`${model.name}. ${props.selected ? t("sec_models_showing") : t("sec_models_show")}`}
      className={cn(
        "group relative flex h-full flex-col overflow-hidden rounded-2xl border p-4 text-left transition-[transform,box-shadow,border-color,background-color] duration-300",
        glassPanelClassName,
        // Selection and hover share one signal: the card lifts off the page.
        "hover:-translate-y-1",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        props.selected && "-translate-y-1"
      )}
      style={
        props.selected
          ? {
              borderColor: `${model.accentColor}66`,
              boxShadow: `0 18px 36px -16px ${model.glowColor}, 0 0 0 1px ${model.accentColor}33`,
            }
          : undefined
      }
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2.5">
          <span style={{ filter: `drop-shadow(0 3px 8px ${model.glowColor})` }}>
            <ProviderGlyph iconKey={model.iconKey} size={22} />
          </span>
          <h4 className="truncate text-sm font-semibold tracking-tight text-foreground">
            {model.name}
          </h4>
        </div>
        <span
          className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold"
          style={{
            color: model.accentColor,
            backgroundColor: `${model.accentColor}18`,
          }}
        >
          {model.badge}
        </span>
      </div>

      <p className="mt-1.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <Building2 className="size-3 shrink-0" aria-hidden />
        {model.provider}
      </p>

      <p className="mt-2.5 line-clamp-2 text-[12px] leading-relaxed text-muted-foreground">
        {model.description}
      </p>

      <dl className={cn("mt-auto flex flex-wrap items-center gap-x-3 gap-y-2 px-3 py-2", glassCapsuleClassName)}>
        <SpecChip
          icon={Layers}
          label={t("sec_models_context")}
          value={model.context}
          accent={model.accentColor}
        />
        <span aria-hidden className="hidden h-4 w-px bg-slate-900/10 dark:bg-white/15 sm:block" />
        <SpecChip
          icon={Gauge}
          label={t("sec_models_performance")}
          value={model.latency}
          accent={model.accentColor}
        />
      </dl>

      <div className={cn("mt-2.5 flex items-center justify-between gap-2 px-3 py-2", glassCapsuleClassName)}>
        <PricePair input={model.siteInput} output={model.siteOutput} accent={model.accentColor} />
        {bestDiscount ? (
          <span
            className="shrink-0 rounded-full px-1.5 py-0.5 font-mono text-[10px] font-bold text-white"
            style={{ backgroundColor: model.accentColor }}
          >
            {bestDiscount}
            <span className="sr-only">{t("sec_models_save")}</span>
          </span>
        ) : null}
      </div>
    </button>
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

  const displayModels = useMemo(() => hydrateModels(backendModels), [backendModels])
  const activeModel = displayModels[activeIndex] ?? displayModels[0]

  return (
    <section id="models" className="relative overflow-hidden px-4 pt-10 pb-20 sm:px-6 sm:pt-14 sm:pb-24 lg:px-8">
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
        <AnimateInView className="mb-7 flex flex-col items-start justify-between gap-4 sm:mb-8 md:flex-row md:items-end lg:pl-4 xl:pl-6">
          <div>
            <h2 className="flex flex-wrap items-baseline gap-x-2 tracking-tight">
              <span className="hero-title-shine text-[clamp(1.85rem,3.6vw,2.9rem)] font-extrabold leading-tight">
                {t("sec_models_title_p1")}
              </span>
              <span className="hero-title-shine-emerald text-[clamp(1.65rem,3.2vw,2.6rem)] font-bold leading-tight">
                {t("sec_models_title_p2")}
              </span>
            </h2>
            <div className="mt-3.5 h-0.5 w-32 rounded-full bg-gradient-to-r from-emerald-500 via-teal-400 to-transparent sm:w-48" />
            <p className="mt-3.5 max-w-xl text-sm leading-relaxed text-muted-foreground md:text-base">
              {t("sec_models_desc")}
            </p>
          </div>

          <Button
            variant="outline"
            size="lg"
            className="h-9 rounded-xl border-emerald-500/25 bg-emerald-500/10 px-4 text-xs font-semibold text-emerald-600 hover:bg-emerald-500 hover:text-white dark:text-emerald-400 dark:hover:bg-emerald-500 dark:hover:text-background"
            render={<Link to="/pricing" />}
          >
            {t("sec_models_view_all")}
            <ArrowUpRight className="size-3.5" aria-hidden />
          </Button>
        </AnimateInView>

        <div className="grid grid-cols-1 items-stretch gap-5 lg:grid-cols-12 lg:gap-6">
          <div className="lg:col-span-6">
            <FeaturedModelCard model={activeModel} />
          </div>

          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:col-span-6">
            {displayModels.map((model, index) => (
              <CompactModelCard
                key={model.id}
                model={model}
                selected={index === activeIndex}
                onSelect={() => setActiveIndex(index)}
              />
            ))}
          </div>
        </div>
      </div>

      <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col items-center overflow-hidden">
        <div
          className="h-[3px] w-64 rounded-full blur-[4px] sm:w-96"
          style={{
            background:
              "linear-gradient(90deg, transparent, rgba(16,185,129,0.7) 40%, rgba(16,185,129,0.7) 60%, transparent)",
          }}
        />
        <div
          className="absolute bottom-0 h-px w-full"
          style={{
            background:
              "linear-gradient(90deg, transparent 0%, rgba(16,185,129,0.15) 20%, rgba(16,185,129,0.55) 42%, rgba(255,255,255,0.85) 50%, rgba(16,185,129,0.55) 58%, rgba(16,185,129,0.15) 80%, transparent 100%)",
          }}
        />
      </div>
    </section>
  )
}
