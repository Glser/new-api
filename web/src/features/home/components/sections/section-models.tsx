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
import { useMemo, useState, useEffect } from "react"
import { getPricing } from "@/features/pricing/api"
import { getPerfMetricsSummary } from "@/features/performance-metrics/api"
import { getSuccessRateDotClass } from "@/features/performance-metrics/lib/format"
import type { PricingModel, PricingVendor } from "@/features/pricing/types"
import { getModelTokenPrices } from "@/features/pricing/lib/dynamic-price"
import { parseModelTags } from "@/features/models/lib/model-utils"
import { Link } from "@tanstack/react-router"
import {
  Activity,
  ArrowRight,
  Building2,
  Coins,
  Gauge,
  Layers,
  Sparkles,
  Tag,
  TrendingDown,
  type LucideIcon,
} from "lucide-react"
import { useTranslation } from "react-i18next"

import {
  SectionBackdrop,
  SectionHeader,
  SectionPrimaryLink,
  SectionDivider,
  SectionScrollCue,
} from "@/features/home/components/section-primitives"
import {
ACCENT_PALETTE,
glassCapsuleClassName,
glassPanelClassName,
compactPanelClassName,
} from "@/features/home/components/section-styles"

import { CopyButton } from "@/components/copy-button"
import { TooltipProvider } from "@/components/ui/tooltip"
import { getLobeIcon } from "@/lib/lobe-icon"
import { cn } from "@/lib/utils"

interface ModelItem {
  id: string
  name: string
  provider: string
  iconKey: string
  /** 右上角徽章：取后台 tags 的第一个，无标签时回退到轮换兜底文案 */
  badge: string
  description: string
  /** 规格胶囊固定三个槽位，值依次取后台 tags 的第 2~4 个（首个已用作徽章），未配时为空 */
  specs: [string, string, string]
  /** 超出徽章与三个规格槽位的多余标签，展示在「推荐适用场景」中 */
  extraTags: string[]
  officialInput: string
  officialOutput: string
  siteInput: string
  siteOutput: string
  siteInputUSD?: number | null
  siteOutputUSD?: number | null
  officialInputUSD?: number | null
  officialOutputUSD?: number | null
  /** 后台配置的标签，用于卡片底部标签行 */
  tags: string[]
  /** 分组最低倍率相对 1.0 的节省比例，无折扣时为 null */
  discountPercent: number | null
  /** 是否取不到 token 价格（按次/任务计费、特殊表达式等），此时不展示价格数值 */
  priceUnavailable: boolean
  /** 最近 24h 请求成功率（可用率），取自模型广场同源的性能监控；无监控数据时为 null */
  successRate: number | null
  accentColor: string
  glowColor: string
}

/** 常见供应商规范品牌名映射 */
const VENDOR_NAME_MAP: Record<string, string> = {
  openai: "OpenAI",
  anthropic: "Anthropic",
  deepseek: "DeepSeek",
  google: "Google",
  xai: "xAI",
  meta: "Meta",
  mistral: "Mistral",
  minimax: "MiniMax",
  moonshot: "Moonshot",
  cohere: "Cohere",
  zhipu: "Zhipu",
  alibaba: "Alibaba",
  qwen: "Qwen",
  baidu: "Baidu",
  tencent: "Tencent",
  bytedance: "ByteDance",
  doubao: "Doubao",
}


/**
 * 格式化供应商名称为规范品牌大小写（如 Anthropic, OpenAI）
 */
function formatProviderName(raw?: string): string {
  if (!raw) return "Anthropic"
  const clean = raw.trim()
  const lower = clean.toLowerCase()
  if (VENDOR_NAME_MAP[lower]) {
    return VENDOR_NAME_MAP[lower]
  }
  // Title Case: 每个单词首字母大写
  return clean.replaceAll(/\b([a-z])/g, (c) => c.toUpperCase())
}

/* 国内供应商集合：官方价按人民币展示，国外供应商按美元展示 */
const DOMESTIC_PROVIDERS = new Set([
  "deepseek",
  "zhipu",
  "qwen",
  "alibaba",
  "baidu",
  "tencent",
  "bytedance",
  "doubao",
  "moonshot",
  "minimax",
  "kimi",
  "yi",
  "360",
  "spark",
  "hunyuan",
  "ernie",
])

/** 判断是否为国内供应商 */
function isDomesticProvider(providerName?: string, modelName?: string): boolean {
  const p = (providerName || "").toLowerCase()
  const m = (modelName || "").toLowerCase()
  for (const domestic of DOMESTIC_PROVIDERS) {
    if (p.includes(domestic) || m.includes(domestic)) {
      return true
    }
  }
  return false
}

/* 站内价固定人民币展示：这是「用户实际支付」的口径，不随后台显示设置变化 */
const SITE_CURRENCY_SYMBOL = "¥"

/**
 * 美元兑人民币汇率，写死为 7.2。
 *
 * 刻意不读后台的 `usd_exchange_rate`：那个字段服务于控制台的配额展示，运营可能
 * 按展示需要调整；而首页的「官方价 vs 站内价」要的是一把稳定的尺子，让折扣比例
 * 可解释、不随后台配置漂移。
 */
const USD_TO_CNY_RATE = 7.2

/**
 * 去掉二进制浮点的累计误差：3 * 0.2 会得到 0.6000000000000001，
 * 直接展示会让用户看到一串无意义的小数。最多保留 4 位，再清掉末尾多余的 0。
 */
function formatPriceAmount(value: number): string {
  if (!Number.isFinite(value)) return "-"
  const rounded = Number(value.toFixed(4))
  return String(rounded)
}

/**
 * 官方价按供应商所在地区选择货币：国外模型展示美元，国内模型本身就是人民币报价。
 *
 * 这里刻意不走 `formatBillingCurrencyFromUSD`：那个函数跟随管理员配置的展示货币
 * （可能是 USD / CNY / 自定义 / 积分），而官方价是一行「原产地标价」，必须按模型
 * 所属地区固定货币，不受后台显示设置影响。
 */
function formatOfficialPrice(valueUSD: number | null | undefined, isDomestic: boolean): string {
  if (valueUSD === null || valueUSD === undefined) return "-"
  if (!isDomestic) {
    return `$${formatPriceAmount(valueUSD)}`
  }
  // 国内厂商在后台配的就是人民币价，无需再折算
  return `${SITE_CURRENCY_SYMBOL}${formatPriceAmount(valueUSD)}`
}

/**
 * 站内价：面向中国区的报价，以人民币展示。
 *
 * 在后台配置的标价基础上乘分组最低倍率——运营在后台调分组价格，这里随之变化。
 * 汇率不参与站内价计算：后台填的 3 就是人民币口径的 3 元，倍率 0.2 即 ¥0.6。
 */
function formatSitePrice(
  valueUSD: number | null | undefined,
  groupRatioMultiplier: number
): string {
  if (valueUSD === null || valueUSD === undefined) return "-"
  return `${SITE_CURRENCY_SYMBOL}${formatPriceAmount(valueUSD * groupRatioMultiplier)}`
}

/** 模型可用分组中的最低倍率，取不到时按 1.0 处理 */
function resolveLowestGroupRatio(
  model: PricingModel,
  groupRatio: Record<string, number>
): number {
  const enableGroups = Array.isArray(model.enable_groups) ? model.enable_groups : []
  let minRatio = Number.POSITIVE_INFINITY
  for (const group of enableGroups) {
    const ratio = groupRatio[group]
    if (typeof ratio === "number" && Number.isFinite(ratio) && ratio < minRatio) {
      minRatio = ratio
    }
  }
  return minRatio === Number.POSITIVE_INFINITY ? 1 : minRatio
}

/**
 * 徽章兜底文案：模型没有配置标签时按展示位置轮换。
 * 配了标签时徽章取第一个标签，见 convertPricingModelToItem。
 */
const BADGES = ["SOTA 推理", "旗舰精选", "高性能模型", "前沿推理"]

function resolveBadge(index: number): string {
  return BADGES[index % BADGES.length]
}

/**
 * 计算折扣：把官方价与站内价换算到同一货币后比较。
 *
 * 官方价是美元、站内价是人民币，按 `USD_TO_CNY_RATE` 把美元折算成人民币再比；
 * 差额同时包含汇率优势与后台分组倍率优惠。国内外厂商同币种时无汇率优势，返回 null。
 */
function resolveExchangeRateDiscount(
  officialInputUSD: number | null | undefined,
  officialOutputUSD: number | null | undefined,
  groupRatioMultiplier: number,
  isDomestic: boolean
): number | null {
  if (isDomestic) return null
  if (officialInputUSD == null || officialOutputUSD == null) return null

  const officialInputCNY = officialInputUSD * USD_TO_CNY_RATE
  const officialOutputCNY = officialOutputUSD * USD_TO_CNY_RATE
  if (officialInputCNY <= 0 || officialOutputCNY <= 0) return null

  const siteInput = officialInputUSD * groupRatioMultiplier
  const siteOutput = officialOutputUSD * groupRatioMultiplier
  const inputDiscount = 1 - siteInput / officialInputCNY
  const outputDiscount = 1 - siteOutput / officialOutputCNY
  // 取输入/输出中较小的折扣，避免用较优的一侧夸大优惠力度
  const discount = Math.min(inputDiscount, outputDiscount)
  if (discount <= 0) return null

  const pct = Math.round(discount * 100)
  return pct > 0 ? pct : null
}

const MODELS: ModelItem[] = [
  {
    id: "claude-opus-5-5",
    name: "Claude Opus 5.5",
    provider: "Anthropic",
    iconKey: "Claude.Color",
    specs: ["", "", ""],
    extraTags: [],
    badge: "SOTA 推理",
    description:
      "Anthropic 旗舰思维模型，具备扩展思维与深度推理能力，在复杂编程、科研分析与多轮 Agent 任务中全面领跑。",
    officialInput: "-",
    officialOutput: "-",
    siteInput: "-",
    siteOutput: "-",
    tags: [],
    discountPercent: null,
    priceUnavailable: true,
    successRate: null,
    accentColor: "rgb(249, 115, 22)",
    glowColor: "rgba(249, 115, 22, 0.22)",
  },
  {
    id: "chatgpt-6-astra",
    name: "ChatGPT 6 Astra",
    provider: "OpenAI",
    iconKey: "Codex.Color",
    specs: ["", "", ""],
    extraTags: [],
    badge: "全感知旗舰",
    description:
      "OpenAI 下一代全模态模型，融合视觉、语音、实时交互与超长上下文，具备接近人类的感知推理与创作能力。",
    officialInput: "-",
    officialOutput: "-",
    siteInput: "-",
    siteOutput: "-",
    tags: [],
    discountPercent: null,
    priceUnavailable: true,
    successRate: null,
    accentColor: "rgb(16, 185, 129)",
    glowColor: "rgba(16, 185, 129, 0.22)",
  },
  {
    id: "deepseek-v4-1-flash",
    name: "DeepSeek v4.1 Flash",
    provider: "DeepSeek",
    iconKey: "DeepSeek.Color",
    specs: ["", "", ""],
    extraTags: [],
    badge: "极速思考链",
    description:
      "DeepSeek 新一代快速推理模型，保留完整思维链能力的同时大幅降低延迟，以极低成本实现顶级推理表现。",
    officialInput: "-",
    officialOutput: "-",
    siteInput: "-",
    siteOutput: "-",
    tags: [],
    discountPercent: null,
    priceUnavailable: true,
    successRate: null,
    accentColor: "rgb(59, 130, 246)",
    glowColor: "rgba(59, 130, 246, 0.22)",
  },
  {
    id: "grok-4-7",
    name: "Grok 4.7",
    provider: "xAI",
    iconKey: "Grok",
    specs: ["", "", ""],
    extraTags: [],
    badge: "前沿推理",
    description:
      "xAI Grok 系列旗舰，配备原生实时 X 平台信息接入与超强数理推理能力，在科学竞赛与复杂分析场景中表现卓越。",
    officialInput: "-",
    officialOutput: "-",
    siteInput: "-",
    siteOutput: "-",
    tags: [],
    discountPercent: null,
    priceUnavailable: true,
    successRate: null,
    accentColor: "rgb(139, 92, 246)",
    glowColor: "rgba(139, 92, 246, 0.22)",
  },
]

/* 卡片表面与胶囊样式统一从 section-primitives 引入 */
/* 小卡内部胶囊：实底，无模糊（背景色由调用方按需覆盖） */
const compactCapsuleClassName =
  "rounded-2xl border border-slate-900/[0.07] shadow-none sm:rounded-full dark:border-white/10"

function ProviderGlyph(props: { iconKey: string; size?: number }) {
  return (
    <span className="flex shrink-0 items-center justify-center">
      {getLobeIcon(props.iconKey, props.size ?? 20)}
    </span>
  )
}

/** 把 rgb(...) 颜色加上透明度，返回合法的 rgba(...) 字符串 */
function withAlpha(rgbColor: string, alpha: number): string {
  const match = rgbColor.match(/\d+(\.\d+)?/g)
  if (!match || match.length < 3) return rgbColor
  const [r, g, b] = match
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

/** 辅助获取模型图标 key */
/**
 * 解析模型图标：后台给模型配的图标优先，否则按模型名推断。
 *
 * 刻意不继承关联供应商的图标：供应商与模型并非一对一（一个供应商下可以挂不同
 * 厂商的模型），继承会让配错的关联把错误图标放大到卡片上。供应商名只参与推断
 * 的兜底分支。
 */
function resolveIconKey(
  model: PricingModel,
  vendor?: PricingVendor
): string {
  if (model.icon) return model.icon

  const name = (model.model_name || "").toLowerCase()
  if (name.includes("claude")) return "Claude.Color"
  if (name.includes("gpt") || name.includes("o1") || name.includes("o3") || name.includes("chatgpt")) {
    return "Codex.Color"
  }
  if (name.includes("deepseek")) return "DeepSeek.Color"
  if (name.includes("grok")) return "Grok"
  if (name.includes("gemini")) return "Gemini.Color"
  if (name.includes("qwen")) return "Qwen.Color"
  if (name.includes("glm")) return "Zhipu.Color"
  if (name.includes("minimax")) return "Minimax.Color"
  if (name.includes("moonshot") || name.includes("kimi")) return "Moonshot"
  if (name.includes("mistral")) return "Mistral.Color"

  const v = (vendor?.name || "").toLowerCase()
  if (v.includes("anthropic")) return "Claude.Color"
  if (v.includes("openai")) return "OpenAI"
  if (v.includes("deepseek")) return "DeepSeek.Color"
  if (v.includes("xai")) return "XAI"
  if (v.includes("google")) return "Gemini.Color"
  return "Sparkles"
}


/**
 * 将 PricingModel 转换为展示用的 ModelItem
 *
 * 价格统一走定价广场的 `getModelTokenPrices`：动态计费模型取表达式首个 tier 的
 * 输入/输出单价，倍率模型走 model_ratio 推导。官方价按模型所属地区定货币（国外美元、
 * 国内人民币），站内价直接取同一数值以人民币展示（面向中国区运营）。折扣徽章是二者
 * 换算到同一货币后的差额，即汇率带来的优势。取不到 token 价格时不编造数值。
 */
function convertPricingModelToItem(
  model: PricingModel,
  vendors: PricingVendor[],
  groupRatio: Record<string, number>,
  index: number,
  perfRates: Map<string, number>
): ModelItem {
  const vendorObj = vendors.find((v) => v.id === model.vendor_id)
  const rawVendorName = vendorObj?.name || model.vendor_name || (model.model_name.split(/[-_/]/)[0] ?? "AI")
  const provider = formatProviderName(rawVendorName)
  const palette = ACCENT_PALETTE[index % ACCENT_PALETTE.length]

  const prices = getModelTokenPrices(model, { groupRatio })
  const isDomestic = isDomesticProvider(rawVendorName, model.model_name)
  const groupRatioMultiplier = resolveLowestGroupRatio(model, groupRatio)
  const officialInput = formatOfficialPrice(prices.officialInputUSD, isDomestic)
  const officialOutput = formatOfficialPrice(prices.officialOutputUSD, isDomestic)
  const siteInput = formatSitePrice(prices.officialInputUSD, groupRatioMultiplier)
  const siteOutput = formatSitePrice(prices.officialOutputUSD, groupRatioMultiplier)

  const discountPercent = resolveExchangeRateDiscount(
    prices.officialInputUSD,
    prices.officialOutputUSD,
    groupRatioMultiplier,
    isDomestic
  )
  const tags = parseModelTags(model.tags).filter((tag) => tag.toLowerCase() !== "featured")

  return {
    id: model.model_name,
    name: model.model_name,
    provider,
    iconKey: resolveIconKey(model, vendorObj),
    // 徽章取第一个标签；规格胶囊与推荐场景从第二个开始取，避免同一标签重复占槽
    badge: tags[0] || resolveBadge(index),
    specs: [tags[1] ?? "", tags[2] ?? "", tags[3] ?? ""],
    extraTags: tags.slice(4),
    description: model.description || "",
    officialInput,
    officialOutput,
    siteInput,
    siteOutput,
    siteInputUSD: prices.inputUSD,
    siteOutputUSD: prices.outputUSD,
    officialInputUSD: prices.officialInputUSD,
    officialOutputUSD: prices.officialOutputUSD,
    tags,
    discountPercent,
    priceUnavailable: !prices.hasTokenPrices,
    successRate: perfRates.get(model.model_name) ?? null,
    accentColor: palette.accentColor,
    glowColor: palette.glowColor,
  }
}

/** 判断模型 tags 是否包含 'featured' 推荐标记（大小写无关） */
function isFeaturedModel(model: PricingModel): boolean {
  if (!model.tags) return false
  const tags = model.tags.toLowerCase().split(/[,;|\s]+/)
  return tags.includes("featured")
}

function hydrateModels(
  backendModels: PricingModel[],
  vendors: PricingVendor[] = [],
  groupRatio: Record<string, number> = {},
  perfRates: Map<string, number> = new Map()
): ModelItem[] {
  if (!backendModels.length) {
    // 后端不可用时退回静态预设，价格一律标记为不可用，不展示推导数值
    return MODELS
  }

  // 1. 优先筛选后台勾选了 "Featured on Home"（tags 包含 featured）的模型
  const featuredModels = backendModels.filter(isFeaturedModel)
  const normalModels = backendModels.filter((m) => !isFeaturedModel(m))

  // 如果后台有配置 featured 或常规模型，组合出最多 4 个模型
  const candidateModels: PricingModel[] = [...featuredModels, ...normalModels]

  // 如果候选数量少于 4，且有未被完全覆盖的场景，优先尝试匹配并增强已有的 MODELS
  if (featuredModels.length === 0 && candidateModels.length >= 4) {
    // 检查是否有匹配 MODELS 预设的知名模型
    const matchedPresets: ModelItem[] = MODELS.map((preset, idx) => {
      const match = backendModels.find((bm) => {
        const bmName = (bm.model_name || "").toLowerCase()
        const mId = preset.id.toLowerCase()
        const mName = preset.name.toLowerCase()
        return (
          bmName === mId ||
          bmName === mName ||
          bmName.includes(mId.replaceAll("-", "")) ||
          mId.includes(bmName.replaceAll("-", ""))
        )
      })

      if (!match) return preset

      const converted = convertPricingModelToItem(match, vendors, groupRatio, idx, perfRates)
      return {
        ...preset,
        provider: formatProviderName(preset.provider),
        badge: converted.badge,
        officialInput: converted.officialInput,
        officialOutput: converted.officialOutput,
        siteInput: converted.siteInput,
        siteOutput: converted.siteOutput,
        siteInputUSD: converted.siteInputUSD,
        siteOutputUSD: converted.siteOutputUSD,
        officialInputUSD: converted.officialInputUSD,
        officialOutputUSD: converted.officialOutputUSD,
        tags: converted.tags,
        specs: converted.specs,
        extraTags: converted.extraTags,
        discountPercent: converted.discountPercent,
        priceUnavailable: converted.priceUnavailable,
        successRate: converted.successRate,
      }
    })
    return matchedPresets
  }

  // 若有明确后台 featured 标记或无对应 preset 匹配，则直接从后台选前 4 个模型展示
  const selected = candidateModels.slice(0, 4)
  if (selected.length === 0) return MODELS

  return selected.map((model, idx) =>
    convertPricingModelToItem(model, vendors, groupRatio, idx, perfRates)
  )
}

/* One price pair = micro label + value, repeated for input and output.
 * The label is deliberately tiny and wide-tracked so the numeral carries all
 * the visual weight. `showLabels` keeps them visible on the price lane. */
function PricePair(props: {
  input: string
  output: string
  accent?: string
  muted?: boolean
  large?: boolean
  showLabels?: boolean
}) {
  const { t } = useTranslation()

  let sizeClassName = "text-sm sm:text-base text-foreground"
  if (props.large) {
    sizeClassName = "text-lg sm:text-xl lg:text-[1.65rem]"
  } else if (props.muted) {
    sizeClassName = "text-sm sm:text-base text-muted-foreground"
  }

  const labelClassName = cn(
    "text-[10px] font-semibold uppercase tracking-[0.16em] leading-none text-muted-foreground/65",
    !props.showLabels && "sr-only"
  )

  const valueClassName = cn(
    "font-mono font-semibold tabular-nums leading-none tracking-tighter transition-colors",
    sizeClassName,
    props.muted && "text-muted-foreground/80"
  )

  return (
    <div className="flex min-w-0 items-stretch justify-center gap-2.5 sm:gap-3.5">
      <span className="flex min-w-0 items-baseline gap-1.5">
        <span className={labelClassName}>{t("Input")}</span>
        <span
          className={valueClassName}
          style={props.accent ? { color: props.accent } : undefined}
        >
          {props.input}
        </span>
      </span>
      <span aria-hidden className="w-px self-stretch bg-slate-900/10 dark:bg-white/15" />
      <span className="flex min-w-0 items-baseline gap-1.5">
        <span className={labelClassName}>{t("Output")}</span>
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
    <div className="flex min-w-0 items-center justify-center gap-2">
      <dt className="sr-only">{props.label}</dt>
      <span
        className="flex size-6 shrink-0 items-center justify-center rounded-lg"
        style={{ backgroundColor: `${props.accent}14` }}
      >
        <Icon className="size-3.5 shrink-0" style={{ color: props.accent }} aria-hidden />
      </span>
      <dd className="truncate text-xs font-semibold tracking-tight text-foreground">
        {props.value}
      </dd>
    </div>
  )
}

/* 规格胶囊固定三个槽位，保持原有三列布局：值依次取后台 tags，
 * 某个位置没配到时显示占位符，避免布局塌陷。 */
const SPEC_SLOTS: { icon: LucideIcon; labelKey: string }[] = [
  { icon: Layers, labelKey: "sec_models_context" },
  { icon: Gauge, labelKey: "sec_models_performance" },
  { icon: Activity, labelKey: "sec_models_category" },
]

function SpecChips(props: { model: ModelItem }) {
  const { t } = useTranslation()

  return (
    <dl
      className={cn(
        "grid grid-cols-3 items-center px-3 py-2.5 sm:px-4",
        glassCapsuleClassName
      )}
    >
      {SPEC_SLOTS.map((slot, index) => (
        <div
          key={slot.labelKey}
          className={cn(
            "flex min-w-0 items-center justify-center",
            index > 0 && "border-l border-slate-900/10 px-1.5 dark:border-white/15"
          )}
        >
          <SpecChip
            icon={slot.icon}
            label={t(slot.labelKey)}
            value={props.model.specs[index] || "-"}
            accent={props.model.accentColor}
          />
        </div>
      ))}
    </dl>
  )
}

/** 官方参考价格（大卡上半部分）：倍率 1.0 的标价，与站内价同源，仅折扣不同。
 *  取不到 token 价格时同样降级为跳转定价页，两行保持一致的观感。 */
function OfficialPriceCard(props: { model: ModelItem }) {
  const { t } = useTranslation()
  const { model } = props

  if (model.priceUnavailable) {
    return (
      <div
        className={cn(
          "relative flex flex-col gap-1 overflow-hidden px-4 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:px-5 sm:py-3",
          glassCapsuleClassName,
          "border-solid",
          "bg-white dark:bg-white/[0.03]"
        )}
      >
        <div className="flex shrink-0 items-center gap-1.5 text-[10px] text-muted-foreground/80">
          <span className="flex size-5 items-center justify-center rounded-md bg-muted/60 text-muted-foreground">
            <Tag className="size-3" aria-hidden />
          </span>
          <span className="font-semibold tracking-[0.06em]">
            {t("sec_models_official_rate")}
          </span>
        </div>
        <Link
          to="/pricing"
          search={{ search: model.id }}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-foreground/80 underline-offset-4 hover:underline"
        >
          {t("sec_models_price_see_pricing")}
          <ArrowRight className="size-3.5 shrink-0" aria-hidden />
        </Link>
      </div>
    )
  }

  return (
    <div
      className={cn(
        "relative flex flex-col gap-1.5 overflow-hidden px-4 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:px-5 sm:py-3",
        glassCapsuleClassName,
        "border-solid",
        // Light mode gets a real surface so the reference row still reads as a
        // distinct lane; dark mode keeps the misty veil so the card glow shows.
        "bg-white dark:bg-white/[0.03]"
      )}
    >
      <div className="flex shrink-0 items-center gap-1.5 text-[10px] text-muted-foreground/80">
        <span className="flex size-5 items-center justify-center rounded-md bg-muted/60 text-muted-foreground">
          <Tag className="size-3" aria-hidden />
        </span>
        <span className="font-semibold tracking-[0.06em]">
          {t("sec_models_official_rate")}
        </span>
        {/* "/ 1M tokens" 单位说明在窄屏时隐藏，宽屏再显示 */}
        <span className="hidden font-mono text-[9px] opacity-60 sm:inline">
          {t("sec_models_per_million")}
        </span>
      </div>
      <div className="flex items-center justify-end">
        <PricePair
          input={model.officialInput}
          output={model.officialOutput}
          muted
          showLabels
        />
      </div>
    </div>
  )
}

/** 站内成交价：实心渐变胶囊 + 强调色价格，唯一视觉焦点。
 *  取不到 token 价格时降级为跳转定价页的说明，不展示推导数值。 */
function SitePriceCard(props: { model: ModelItem }) {
  const { t } = useTranslation()
  const { model } = props
  const discount = model.discountPercent

  if (model.priceUnavailable) {
    return (
      <div
        className={cn(
          "relative flex flex-col gap-1 overflow-hidden px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5",
          glassCapsuleClassName,
          "border-solid"
        )}
        style={{
          borderColor: `${model.accentColor}33`,
          background: `linear-gradient(135deg, ${model.accentColor}12 0%, rgba(255,255,255,0.04) 55%, ${model.accentColor}08 100%)`,
        }}
      >
        <div className="flex shrink-0 items-center gap-2">
          <span
            className="flex size-5 items-center justify-center rounded-md text-white shadow-2xs"
            style={{ backgroundColor: model.accentColor }}
          >
            <Coins className="size-3" aria-hidden />
          </span>
          <span className="text-xs font-bold tracking-tight text-foreground">
            {t("sec_models_site_rate")}
          </span>
        </div>
        <Link
          to="/pricing"
          search={{ search: model.id }}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-foreground/80 underline-offset-4 hover:underline"
        >
          {t("sec_models_price_see_pricing")}
          <ArrowRight className="size-3.5 shrink-0" aria-hidden />
        </Link>
      </div>
    )
  }

  return (
    <div
      className={cn(
        "relative flex flex-col gap-2 overflow-hidden px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5 sm:py-3.5",
        glassCapsuleClassName,
        "border-solid"
      )}
      style={{
        borderColor: `${model.accentColor}33`,
        background: `linear-gradient(135deg, ${model.accentColor}12 0%, rgba(255,255,255,0.04) 55%, ${model.accentColor}08 100%)`,
        boxShadow: `0 2px 16px -10px ${model.glowColor}, inset 0 1px 0 rgba(255,255,255,0.55)`,
      }}
    >
      <div className="flex shrink-0 items-center gap-2">
        <span
          className="flex size-5 items-center justify-center rounded-md text-white shadow-2xs"
          style={{ backgroundColor: model.accentColor }}
        >
          <Coins className="size-3" aria-hidden />
        </span>
        <span className="text-xs font-bold tracking-tight text-foreground">
          {t("sec_models_site_rate")}
        </span>
        {discount ? (
          <span
            className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-mono text-[10px] font-bold text-white shadow-sm"
            style={{ backgroundColor: model.accentColor }}
          >
            <TrendingDown className="size-2.5" aria-hidden />
            -{discount}%
            <span className="sr-only">{t("sec_models_save")}</span>
          </span>
        ) : null}
        <span className="sr-only">{t("sec_models_pricing")}</span>
        {/* "/ 1M tokens" 单位说明在窄屏时隐藏，宽屏再显示 */}
        <span className="hidden font-mono text-[9px] opacity-60 sm:inline">
          {t("sec_models_per_million")}
        </span>
      </div>
      <div className="flex items-center justify-end">
        <PricePair
          input={model.siteInput}
          output={model.siteOutput}
          accent={model.accentColor}
          large
          showLabels
        />
      </div>
    </div>
  )
}

function FeaturedModelCard(props: { model: ModelItem }) {
  const { t } = useTranslation()
  const model = props.model

  return (
    <article
      className={cn(
        "group relative flex h-full flex-col overflow-hidden rounded-3xl border transition-all duration-500 hover:-translate-y-1",
        glassPanelClassName
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-40 transition-opacity duration-700 dark:opacity-30"
        style={{
          background: `radial-gradient(ellipse 70% 55% at 50% 0%, ${model.glowColor}, transparent 62%), radial-gradient(ellipse 55% 45% at 50% 100%, ${model.glowColor}, transparent 68%)`,
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-0 size-64 -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl opacity-50 transition-colors duration-700"
        style={{ backgroundColor: model.glowColor }}
      />

      <div
        className="relative flex flex-1 flex-col p-5 transition-opacity duration-300 sm:p-6 lg:p-8"
        key={model.id}
      >
        {/* 头部：供应商图标 + 模型标题，右侧：亮点 Badge */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3.5">
            <span
              className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-white/40 p-2 shadow-sm backdrop-blur-md dark:bg-white/10"
              style={{
                filter: `drop-shadow(0 6px 14px ${model.glowColor})`,
                border: `1px solid ${model.accentColor}30`,
              }}
            >
              <ProviderGlyph iconKey={model.iconKey} size={32} />
            </span>
            <div className="min-w-0">
              <h3 className="truncate text-2xl font-bold leading-tight tracking-[-0.02em] text-foreground sm:text-[1.85rem]">
                {model.name}
              </h3>
            </div>
          </div>

          <span
            className="inline-flex max-w-[10rem] shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold"
            style={{
              backgroundColor: `${model.accentColor}18`,
              color: model.accentColor,
              borderColor: `${model.accentColor}35`,
            }}
          >
            <Sparkles className="size-3 shrink-0" aria-hidden />
            <span className="min-w-0 truncate">{model.badge}</span>
          </span>
        </div>

        {/* 描述：限制阅读宽度并做断行优化，长段落更均匀 */}
        <div className="flex flex-1 items-center py-5 sm:py-6">
          <div className="mx-auto w-full max-w-xl px-2 sm:px-4">
            <p className="text-pretty text-left text-sm leading-[1.85] text-muted-foreground sm:text-[0.95rem]">
              {model.description || t("sec_models_no_description")}
            </p>
          </div>
        </div>

        {/* 规格胶囊：固定三列，值依次取后台 tags */}
        <div className="mx-auto mb-4 w-full max-w-xl">
          <SpecChips model={model} />
        </div>

        {/* 价格组件拆分为两个：官方标价在上，站内特权价在下，二者同源仅折扣不同 */}
        <div className="mx-auto flex w-full max-w-xl flex-col gap-2.5">
          <OfficialPriceCard model={model} />
          <SitePriceCard model={model} />
        </div>

        {/* 推荐适用场景：展示超出三个规格槽位的多余标签，没有则不占位 */}
        {model.extraTags.length > 0 && (
          <div className="mx-auto mb-3.5 mt-5 hidden w-full max-w-xl flex-col items-center sm:flex">
            <div className="mb-2.5 flex items-center gap-2">
              <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/70">
                {t("sec_models_scenarios")}
              </span>
              <span aria-hidden className="h-px flex-1 bg-gradient-to-r from-slate-900/10 to-transparent dark:from-white/15" />
            </div>
            <ul className="flex flex-wrap justify-center gap-2">
              {model.extraTags.map((tag) => (
                <li
                  key={tag}
                  className="inline-flex items-center gap-1.5 rounded-full border border-slate-900/[0.08] bg-white/60 px-3 py-1 text-xs font-medium text-foreground/85 backdrop-blur-md dark:border-white/10 dark:bg-white/[0.06]"
                >
                  <span
                    className="size-1.5 shrink-0 rounded-full"
                    style={{ backgroundColor: model.accentColor }}
                  />
                  {tag}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* 底部操作项 */}
        <div className="mt-auto flex w-full flex-wrap items-center justify-between gap-3 border-t border-slate-900/[0.08] pt-4 dark:border-white/10">
          <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
            {/* 供应商名称：放置在左下角，与右侧小卡保持视觉对齐 */}
            <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-900/[0.08] bg-white/60 px-2.5 py-1 text-xs font-medium text-foreground/80 shadow-2xs backdrop-blur-md dark:border-white/10 dark:bg-white/[0.06]">
              <Building2 className="size-3 text-muted-foreground/80" aria-hidden />
              <span>{model.provider}</span>
            </span>

            <TooltipProvider delay={0}>
              <CopyButton
                value={model.id}
                variant="outline"
                size="sm"
                className="h-9 gap-1.5 rounded-full border-slate-900/10 bg-white/60 px-3 font-mono text-xs backdrop-blur-md dark:border-white/10 dark:bg-white/[0.06]"
                tooltip={t("sec_models_copy_id")}
                successTooltip={t("sec_models_copied")}
              >
                <span className="max-w-[12rem] truncate">{model.id}</span>
              </CopyButton>
            </TooltipProvider>

            {/* 可用率：与模型广场同源的 24h 性能监控，无监控数据时展示占位符 */}
            <span
              className="flex items-center gap-1.5 text-[11px] text-muted-foreground/90"
              title={
                model.successRate != null
                  ? t("Availability (last 24h)")
                  : undefined
              }
            >
              <span
                aria-hidden
                className={cn(
                  "size-1.5 shrink-0 rounded-full",
                  model.successRate != null
                    ? getSuccessRateDotClass(model.successRate)
                    : "bg-muted-foreground/40"
                )}
              />
              <span className="hidden sm:inline">
                {t("sec_models_availability")}
              </span>
              <span className="font-mono tabular-nums">
                {model.successRate != null
                  ? `${model.successRate.toFixed(1)}%`
                  : "—"}
              </span>
            </span>
          </div>

          <Link
            to="/pricing"
            search={{ search: model.id }}
            className="group relative inline-flex h-9 items-center gap-1.5 overflow-hidden rounded-xl border border-border/70 bg-card/60 px-4 text-xs font-medium text-foreground backdrop-blur-md transition-all duration-300 hover:border-foreground/25 hover:bg-card/90 hover:shadow-[0_4px_16px_rgba(0,0,0,0.04)] hover:scale-[1.02] active:scale-[0.98]"
          >
            <span
              aria-hidden
              className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-foreground/5 to-transparent transition-transform duration-700 ease-out group-hover:translate-x-full"
            />
            {t("sec_models_view_model")}
            <ArrowRight
              className="size-3.5 shrink-0 transition-transform duration-300 group-hover:translate-x-0.5"
              aria-hidden
            />
          </Link>
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
  const discount = model.discountPercent

  return (
    <button
      type="button"
      onClick={props.onSelect}
      aria-pressed={props.selected}
      aria-label={`${model.name}. ${props.selected ? t("sec_models_showing") : t("sec_models_show")}`}
      className={cn(
        "group relative flex h-full flex-col justify-between overflow-hidden rounded-2xl border p-5 text-left",
        compactPanelClassName,
        // 与「让一张画面」卡片同一套悬浮：整体过渡 + 500ms + 仅抬起。
        "transition-all duration-500 hover:-translate-y-1",
        "active:scale-[0.99]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        props.selected && "-translate-y-1 scale-[1.01]"
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
      {/* 头部：图标 + Eyebrow 供应商与模型名称，右侧徽章 */}
      <div className="w-full">
        <div className="flex items-start justify-between gap-2.5">
          <div className="flex min-w-0 items-center gap-2.5">
            <span
              className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 shadow-none transition-transform duration-400 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-105 dark:bg-white/10"
              style={{
                filter: `drop-shadow(0 3px 8px ${model.glowColor})`,
                border: `1px solid ${model.accentColor}25`,
              }}
            >
              <ProviderGlyph iconKey={model.iconKey} size={22} />
            </span>
            <div className="min-w-0">
              <h4 className="truncate text-[0.95rem] font-bold leading-tight tracking-[-0.01em] text-foreground">
                {model.name}
              </h4>
            </div>
          </div>

          <span
            className="max-w-[7rem] shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold"
            style={{
              color: model.accentColor,
              backgroundColor: `${model.accentColor}18`,
              border: `1px solid ${model.accentColor}30`,
            }}
          >
            <span className="block truncate">{model.badge}</span>
          </span>
        </div>
      </div>

      {/* 描述：两行截断，行高略放大以改善密集度 */}
      <div className="my-3.5 w-full">
        <p className="line-clamp-2 text-left text-[12px] leading-[1.75] text-muted-foreground/90">
          {model.description || t("sec_models_no_description")}
        </p>
      </div>

      {/* 规格胶囊：小卡固定展示前三个标签，三等分排列，未配到时显示占位符 */}
      <div className="mb-2.5 w-full">
        <dl className="grid grid-cols-3 items-center rounded-2xl border border-slate-900/[0.07] bg-slate-100 px-2 py-1.5 dark:border-white/10 dark:bg-white/[0.07]">
          {SPEC_SLOTS.map((slot, index) => (
            <div
              key={slot.labelKey}
              className={cn(
                "flex min-w-0 items-center justify-center",
                index > 0 && "border-l border-slate-900/10 dark:border-white/15"
              )}
            >
              <SpecChip
                icon={slot.icon}
                label={t(slot.labelKey)}
                value={model.specs[index] || "-"}
                accent={model.accentColor}
              />
            </div>
          ))}
        </dl>
      </div>

      {/* 价格栏：实底 accent 胶囊 + 折扣徽章；无 token 价格时引导去定价页查看 */}
      <div
        className={cn(
          "mb-3 flex w-full items-center justify-center gap-2.5 px-3 py-2",
          compactCapsuleClassName
        )}
        style={{
          borderColor: `${model.accentColor}30`,
          backgroundColor: withAlpha(model.accentColor, 0.06),
          boxShadow: `0 2px 12px -8px ${model.glowColor}`,
        }}
      >
        {model.priceUnavailable ? (
          <Link
            to="/pricing"
            search={{ search: model.id }}
            className="text-xs font-semibold text-foreground/80 underline-offset-4 hover:underline"
          >
            {t("sec_models_price_see_pricing")}
          </Link>
        ) : (
          <>
            <PricePair
              input={model.siteInput}
              output={model.siteOutput}
              accent={model.accentColor}
              showLabels
            />
            {discount ? (
              <span
                className="shrink-0 rounded-full px-1.5 py-0.5 font-mono text-[10px] font-bold text-white shadow-xs"
                style={{ backgroundColor: model.accentColor }}
              >
                -{discount}%
                <span className="sr-only">{t("sec_models_save")}</span>
              </span>
            ) : null}
          </>
        )}
      </div>
      {/* 供应商：固定在左下角，降为次要层级（保持 Anthropic 品牌大小写格式） */}
      <div className="mt-auto flex w-full items-center gap-1.5 text-[11px] font-medium tracking-wide text-muted-foreground/70">
        <Building2 className="size-3 shrink-0" aria-hidden />
        <span className="truncate">{model.provider}</span>
      </div>
    </button>
  )
}

const ROTATION_INTERVAL_MS = 7000

export function SectionModels() {
  const { t } = useTranslation()
  const [activeIndex, setActiveIndex] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const [backendData, setBackendData] = useState<{
    models: PricingModel[]
    vendors: PricingVendor[]
    groupRatio: Record<string, number>
  }>({ models: [], vendors: [], groupRatio: {} })
  /** 模型可用率（24h 成功率）：与模型广场同源的性能监控，按模型名索引 */
  const [perfRates, setPerfRates] = useState<Map<string, number>>(
    () => new Map()
  )
  useEffect(() => {
    let mounted = true
    getPricing()
      .then((res) => {
        if (mounted && res?.data && Array.isArray(res.data)) {
          setBackendData({
            models: res.data,
            vendors: Array.isArray(res.vendors) ? res.vendors : [],
            groupRatio: res.group_ratio || {},
          })
        }
      })
      .catch(() => {
        // Silently fallback to static preset models if API fails
      })
    getPerfMetricsSummary(24)
      .then((res) => {
        if (!mounted) return
        const rates = new Map<string, number>()
        for (const item of res?.data?.models ?? []) {
          const rate = item?.success_rate
          if (
            typeof rate === "number" &&
            Number.isFinite(rate) &&
            rate >= 0 &&
            rate <= 100
          ) {
            rates.set(item.model_name, rate)
          }
        }
        setPerfRates(rates)
      })
      .catch(() => {
        // 性能监控不可用时静默降级：可用率展示为占位符
      })
    return () => {
      mounted = false
    }
  }, [])

  const displayModels = useMemo(
    () =>
      hydrateModels(
        backendData.models,
        backendData.vendors,
        backendData.groupRatio,
        perfRates
      ),
    [backendData, perfRates]
  )
  const activeModel = displayModels[activeIndex] ?? displayModels[0]

  // 优化4：轮播展示到左侧大卡，间隔 7 秒，悬浮或交互时暂停
  useEffect(() => {
    if (isPaused || displayModels.length <= 1) return

    const timer = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % displayModels.length)
    }, ROTATION_INTERVAL_MS)

    return () => {
      clearInterval(timer)
    }
  }, [isPaused, displayModels.length])

  return (
    <section
      id="models"
      className="relative overflow-hidden px-4 pt-16 pb-24 sm:px-6 sm:pt-20 sm:pb-28 lg:px-8"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocusCapture={() => setIsPaused(true)}
      onBlurCapture={() => setIsPaused(false)}
    >
      <SectionBackdrop />

      <div className="mx-auto max-w-7xl">
        <SectionHeader
          titlePrimary={t("sec_models_title_p1")}
          titleSecondary={t("sec_models_title_p2")}
          description={t("sec_models_desc")}
          action={
            <SectionPrimaryLink
              to="/pricing"
              label={t("sec_models_view_all")}
            />
          }
        />

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
                onSelect={() => {
                  setActiveIndex(index)
                }}
              />
            ))}
          </div>
        </div>
      </div>

      <SectionScrollCue
        target="studio"
        cue={t("sec_models_scroll_cue")}
        aside={t("sec_models_scroll_aside")}
      />
      <SectionDivider />
    </section>
  )
}
