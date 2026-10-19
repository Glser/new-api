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
import { useQuery } from '@tanstack/react-query'
import { Link, useSearch } from '@tanstack/react-router'
import { motion } from 'motion/react'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Sparkles, ArrowUpRight, Bot, Coins, Tag, TrendingDown } from 'lucide-react'

import { Skeleton } from '@/components/ui/skeleton'
import { parseModelTags } from '@/features/models/lib/model-utils'
import { getPricing } from '@/features/pricing/api'
import { DEFAULT_TOKEN_UNIT } from '@/features/pricing/constants'
import {
  getDynamicDisplayGroupRatio,
  getDynamicPriceUnitLabelKey,
  getDynamicPricingSummary,
  isFlatPerRequestExpression,
  isUnconfiguredTaskUsageModel,
} from '@/features/pricing/lib/dynamic-price'
import { isTokenBasedModel } from '@/features/pricing/lib/model-helpers'
import { formatPrice, formatRequestPrice } from '@/features/pricing/lib/price'
import { taskPriceLabel, taskUsageUnitLabel } from '@/features/pricing/lib/task-price-display'
import { formatUsdPrice, getOfficialVsSitePrice } from '@/features/pricing/lib/usd-price'
import type { PriceType, PricingModel, PricingVendor, TokenUnit } from '@/features/pricing/types'
import { useStatus } from '@/hooks/use-status'
import { useSystemConfig } from '@/hooks/use-system-config'
import { getLobeIcon } from '@/lib/lobe-icon'
import { cn } from '@/lib/utils'
import { useSystemConfigStore } from '@/stores/system-config-store'

import { TermsFooter } from '../components/terms-footer'
import { UserAuthForm } from './components/user-auth-form'

interface AgentItem {
  id: string
  name: string
  tag: string
  description: string
  guide_url: string
  icon_key: string
  accent_color: string
}

interface ModelCardData {
  id: string
  name: string
  provider: string
  iconKey: string
  tag: string
  specs: string[]
  badgeColor: string
  theme: BadgeTheme
  description?: string
  rawModel: PricingModel
}

const DEFAULT_AGENTS: AgentItem[] = [
  {
    id: 'chatgpt',
    name: 'ChatGPT Work(Codex)',
    tag: 'Codex Agent',
    description: 'OpenAI 官方编程智能体，终端与云端任务一站调度',
    guide_url: 'https://api.oioi.lat/pages/codex-guide/#codex/install',
    icon_key: 'Codex.Color',
    accent_color: '#10a37f',
  },
  {
    id: 'claude-code',
    name: 'Claude Code',
    tag: 'CLI Agent',
    description: 'Anthropic 终端编程智能体，长上下文推理与自动重构',
    guide_url: 'https://api.oioi.lat/pages/codex-guide/#agent/workbuddy',
    icon_key: 'ClaudeCode.Color',
    accent_color: '#d97706',
  },
  {
    id: 'workbuddy',
    name: 'WorkBuddy',
    tag: 'Agent',
    description: '企业协同研发智能体，贯通需求、编码与交付全流程',
    guide_url: 'https://api.oioi.lat/pages/codex-guide/#agent/workbuddy',
    icon_key: 'CodeBuddy.Color',
    accent_color: '#3b82f6',
  },
  {
    id: 'hermes',
    name: 'Hermes',
    tag: 'Autonomous',
    description: '高阶自主智能体，复杂工具调用与多步任务自动执行',
    guide_url: 'https://api.oioi.lat/pages/codex-guide/#agent/hermes',
    icon_key: 'HermesAgent',
    accent_color: '#ec4899',
  },
  {
    id: 'trae',
    name: 'Trae',
    tag: 'AI IDE',
    description: 'AI 原生 IDE，上下文感知的编码、调试与重构体验',
    guide_url: 'https://api.oioi.lat/pages/codex-guide/#agent/trae',
    icon_key: 'Trae.Color',
    accent_color: '#10b981',
  },
  {
    id: 'deepseek-harness',
    name: 'DeepSeek Harness',
    tag: 'Reasoning',
    description: 'DeepSeek 推理加速套件，完整释放长思考链潜能',
    guide_url: 'https://api.oioi.lat/pages/codex-guide/#agent/workbuddy',
    icon_key: 'DeepSeek.Color',
    accent_color: '#0284c7',
  },
]

interface BadgeTheme {
  badge: string
  bg: string
  border: string
  iconBg: string
}

const BADGE_THEMES: BadgeTheme[] = [
  {
    badge: 'text-orange-500 bg-orange-500/10 border-orange-500/20',
    bg: 'linear-gradient(135deg, rgba(249,115,22,0.08) 0%, rgba(255,255,255,0.02) 55%, rgba(249,115,22,0.04) 100%)',
    border: 'rgba(249,115,22,0.25)',
    iconBg: 'bg-orange-500',
  },
  {
    badge: 'text-blue-500 bg-blue-500/10 border-blue-500/20',
    bg: 'linear-gradient(135deg, rgba(59,130,246,0.08) 0%, rgba(255,255,255,0.02) 55%, rgba(59,130,246,0.04) 100%)',
    border: 'rgba(59,130,246,0.25)',
    iconBg: 'bg-blue-500',
  },
  {
    badge: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
    bg: 'linear-gradient(135deg, rgba(16,185,129,0.08) 0%, rgba(255,255,255,0.02) 55%, rgba(16,185,129,0.04) 100%)',
    border: 'rgba(16,185,129,0.25)',
    iconBg: 'bg-emerald-500',
  },
  {
    badge: 'text-purple-500 bg-purple-500/10 border-purple-500/20',
    bg: 'linear-gradient(135deg, rgba(168,85,247,0.08) 0%, rgba(255,255,255,0.02) 55%, rgba(168,85,247,0.04) 100%)',
    border: 'rgba(168,85,247,0.25)',
    iconBg: 'bg-purple-500',
  },
  {
    badge: 'text-indigo-500 bg-indigo-500/10 border-indigo-500/20',
    bg: 'linear-gradient(135deg, rgba(99,102,241,0.08) 0%, rgba(255,255,255,0.02) 55%, rgba(99,102,241,0.04) 100%)',
    border: 'rgba(99,102,241,0.25)',
    iconBg: 'bg-indigo-500',
  },
  {
    badge: 'text-cyan-500 bg-cyan-500/10 border-cyan-500/20',
    bg: 'linear-gradient(135deg, rgba(6,182,212,0.08) 0%, rgba(255,255,255,0.02) 55%, rgba(6,182,212,0.04) 100%)',
    border: 'rgba(6,182,212,0.25)',
    iconBg: 'bg-cyan-500',
  },
  {
    badge: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
    bg: 'linear-gradient(135deg, rgba(245,158,11,0.08) 0%, rgba(255,255,255,0.02) 55%, rgba(245,158,11,0.04) 100%)',
    border: 'rgba(245,158,11,0.25)',
    iconBg: 'bg-amber-500',
  },
]

function resolveIconKey(model: PricingModel, vendor?: PricingVendor): string {
  if (model.icon) return model.icon

  const name = (model.model_name || '').toLowerCase()
  if (name.includes('claude')) return 'Claude.Color'
  if (
    name.includes('gpt') ||
    name.includes('o1') ||
    name.includes('o3') ||
    name.includes('chatgpt')
  ) {
    return 'Codex.Color'
  }
  if (name.includes('deepseek')) return 'DeepSeek.Color'
  if (name.includes('grok')) return 'Grok'
  if (name.includes('gemini')) return 'Gemini.Color'
  if (name.includes('qwen')) return 'Qwen.Color'
  if (name.includes('glm')) return 'Zhipu.Color'
  if (name.includes('minimax')) return 'Minimax.Color'
  if (name.includes('moonshot') || name.includes('kimi')) return 'Moonshot'
  if (name.includes('mistral')) return 'Mistral.Color'

  const v = (vendor?.name || '').toLowerCase()
  if (v.includes('anthropic')) return 'Claude.Color'
  if (v.includes('openai')) return 'OpenAI'
  if (v.includes('deepseek')) return 'DeepSeek.Color'
  if (v.includes('xai')) return 'XAI'
  if (v.includes('google')) return 'Gemini.Color'
  return 'Sparkles'
}

/* Agent 工具卡片 */
function AgentCardItem({ item }: { item: AgentItem }) {
  const { t } = useTranslation()

  return (
    <div className='relative mb-4 flex min-h-[185px] flex-col justify-between overflow-hidden rounded-2xl border border-border/60 bg-card/65 p-4.5 shadow-sm backdrop-blur-xl transition-all duration-300 hover:border-foreground/25 hover:bg-card/90 hover:shadow-md'>
      <div>
        <div className='flex items-start justify-between gap-3'>
          <div className='flex items-center gap-3 min-w-0'>
            <div className='flex size-10 shrink-0 items-center justify-center rounded-xl border border-border/80 bg-background/90 p-2 shadow-xs'>
              {getLobeIcon(item.icon_key, 24)}
            </div>
            <div className='min-w-0'>
              <h4 className='truncate text-sm font-semibold tracking-tight text-foreground'>
                {item.name}
              </h4>
              <span className='inline-flex items-center gap-1 font-mono text-[10px] text-muted-foreground'>
                <Bot className='size-2.5 text-primary/70' />
                {item.tag}
              </span>
            </div>
          </div>
          <div
            className='size-2 shrink-0 rounded-full mt-1'
            style={{
              backgroundColor: item.accent_color || '#3b82f6',
              boxShadow: `0 0 8px ${item.accent_color || '#3b82f6'}`,
            }}
          />
        </div>

        <p className='mt-3 line-clamp-2 text-xs leading-relaxed text-muted-foreground'>
          {item.description}
        </p>
      </div>

      {item.guide_url && (
        <div className='flex items-center justify-end border-t border-border/40 pt-2.5 mt-2'>
          <a
            href={item.guide_url}
            target='_blank'
            rel='noopener noreferrer'
            className='inline-flex items-center gap-1 text-[11px] font-medium text-foreground/80 hover:text-foreground'
          >
            <span>{t('查看教程')}</span>
            <ArrowUpRight className='size-3 text-muted-foreground' />
          </a>
        </div>
      )}
    </div>
  )
}

/* 模型卡片 */
function ModelCardItem(props: { item: ModelCardData }) {
  const { t, i18n } = useTranslation()
  const tokenUnit: TokenUnit = DEFAULT_TOKEN_UNIT
  const currency = useSystemConfigStore((state) => state.config.currency)
  const isTokenBased = isTokenBasedModel(props.item.rawModel)
  const isUnconfiguredTaskUsage = isUnconfiguredTaskUsageModel(props.item.rawModel)

  const officialVsSite = useMemo(
    () =>
      getOfficialVsSitePrice(
        props.item.rawModel,
        getDynamicDisplayGroupRatio(props.item.rawModel, undefined)
      ),
    [props.item.rawModel]
  )

  const sitePriceParts = useMemo(
    () => {
      const parts: { label: string; text: string }[] = []
      if (officialVsSite?.siteInputUSD != null) {
        parts.push({ label: t('Input'), text: formatUsdPrice(officialVsSite.siteInputUSD, tokenUnit) })
      }
      if (officialVsSite?.siteOutputUSD != null) {
        parts.push({ label: t('Output'), text: formatUsdPrice(officialVsSite.siteOutputUSD, tokenUnit) })
      }
      return parts
    },
    [officialVsSite, t, tokenUnit]
  )

  const siteDiscountPercent = officialVsSite?.discountPercent ?? 0

  const dynamicSummary = useMemo(
    () =>
      getDynamicPricingSummary(props.item.rawModel, {
        tokenUnit,
        groupRatioMultiplier: getDynamicDisplayGroupRatio(props.item.rawModel, undefined),
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [props.item.rawModel, tokenUnit, currency]
  )

  let priceContent: React.ReactNode = null

  if (officialVsSite) {
    priceContent = (
      <div
        className='relative flex items-center justify-between gap-1.5 overflow-hidden rounded-xl border px-2.5 py-1.5 whitespace-nowrap'
        style={{
          background: props.item.theme.bg,
          borderColor: props.item.theme.border,
        }}
      >
        <div className='flex min-w-0 items-center gap-1.5'>
          <span className={cn('flex size-4.5 shrink-0 items-center justify-center rounded-md text-white shadow-2xs', props.item.theme.iconBg)}>
            <Coins className='size-2.5' aria-hidden />
          </span>

          <div className='flex min-w-0 items-center gap-1.5 leading-none'>
            {sitePriceParts.map((p, idx) => (
              <span key={p.label} className='inline-flex items-center gap-0.5 leading-none shrink-0'>
                {idx > 0 && (
                  <span aria-hidden className='text-muted-foreground/30'>
                    /
                  </span>
                )}
                <span className='text-[10px] font-medium text-muted-foreground'>
                  {p.label}
                </span>
                <span className='font-mono text-xs font-bold text-foreground tabular-nums'>
                  {p.text}
                </span>
              </span>
            ))}
            <span className='inline-flex items-center text-[10px] text-muted-foreground leading-none shrink-0'>
              / M Token
            </span>
          </div>
        </div>

        {siteDiscountPercent > 0 && (
          <span className={cn('shrink-0 inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 font-mono text-[9px] font-bold text-white shadow-xs leading-none', props.item.theme.iconBg)}>
            <TrendingDown className='size-2' aria-hidden />
            -{siteDiscountPercent}%
          </span>
        )}
      </div>
    )
  } else if (dynamicSummary) {
    if (dynamicSummary.primaryEntries.length > 0) {
      priceContent = (
        <div className='flex items-center justify-between gap-2 rounded-xl border border-border/40 bg-background/50 px-3 py-2'>
          <div className='flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5'>
            {dynamicSummary.primaryEntries
              .slice(0, dynamicSummary.providerCount ? 2 : undefined)
              .map((entry) => {
                const unitLabelKey = getDynamicPriceUnitLabelKey(entry)
                const unitLabel = taskUsageUnitLabel(
                  entry,
                  i18n.language,
                  unitLabelKey ? t(unitLabelKey) : `${tokenUnit} Token`
                )
                const label =
                  entry.labelKind !== 'schema'
                    ? t(entry.shortLabel)
                    : taskPriceLabel(entry.description, entry.shortLabel, i18n.language)

                return (
                  <span
                    key={entry.key}
                    className='flex items-baseline gap-1 font-mono text-xs font-semibold tabular-nums'
                  >
                    {label && (
                      <span className='text-[10px] font-normal text-muted-foreground'>
                        {label}
                      </span>
                    )}
                    <span className='text-foreground'>{entry.formattedRange ?? entry.formatted}</span>
                    <span className='text-[10px] font-normal text-muted-foreground'>
                      /{unitLabel}
                    </span>
                  </span>
                )
              })}
          </div>
        </div>
      )
    } else if (isFlatPerRequestExpression(props.item.rawModel.billing_expr)) {
      priceContent = (
        <div
          className='flex items-center justify-between rounded-xl border p-2.5 px-3'
          style={{
            background: props.item.theme.bg,
            borderColor: props.item.theme.border,
          }}
        >
          <span className='font-mono text-sm font-bold text-foreground tabular-nums'>
            {formatRequestPrice(props.item.rawModel)}
            <span className='ms-1 text-[10px] font-normal text-muted-foreground'>
              /{t('request')}
            </span>
          </span>
        </div>
      )
    } else {
      priceContent = (
        <div
          className='rounded-xl border p-2.5 px-3 text-xs text-muted-foreground'
          style={{
            background: props.item.theme.bg,
            borderColor: props.item.theme.border,
          }}
        >
          {t('Dynamic Pricing')}
        </div>
      )
    }
  } else if (isUnconfiguredTaskUsage) {
    priceContent = (
      <div
        className='rounded-xl border p-2.5 px-3 text-xs text-muted-foreground'
        style={{
          background: props.item.theme.bg,
          borderColor: props.item.theme.border,
        }}
      >
        {t('Usage-based billing · price not configured')}
      </div>
    )
  } else if (isTokenBased) {
    const prices: { type: PriceType; label: string }[] = [
      { type: 'input', label: t('Input') },
      { type: 'output', label: t('Output') },
    ]
    priceContent = (
      <div
        className='flex items-center justify-between rounded-xl border p-2.5 px-3'
        style={{
          background: props.item.theme.bg,
          borderColor: props.item.theme.border,
        }}
      >
        <div className='flex min-w-0 items-baseline gap-x-2.5'>
          {prices.map((price) => (
            <span
              key={price.type}
              className='flex items-baseline gap-1 font-mono text-xs font-semibold tabular-nums'
            >
              <span className='text-[10px] font-normal text-muted-foreground'>
                {price.label}
              </span>
              <span className='text-foreground'>{formatPrice(props.item.rawModel, price.type, tokenUnit)}</span>
            </span>
          ))}
          <span className='text-[10px] font-normal text-muted-foreground'>
            /Token
          </span>
        </div>
      </div>
    )
  } else {
    priceContent = (
      <div
        className='flex items-center justify-between rounded-xl border p-2.5 px-3'
        style={{
          background: props.item.theme.bg,
          borderColor: props.item.theme.border,
        }}
      >
        <span className='font-mono text-sm font-bold text-foreground tabular-nums'>
          {formatRequestPrice(props.item.rawModel)}
          <span className='ms-1 text-[10px] font-normal text-muted-foreground'>
            /{t('request')}
          </span>
        </span>
      </div>
    )
  }

  return (
    <div className='relative mb-4 flex min-h-[185px] flex-col justify-between overflow-hidden rounded-2xl border border-border/60 bg-card/65 p-4.5 shadow-sm backdrop-blur-xl transition-all duration-300 hover:border-foreground/25 hover:bg-card/90 hover:shadow-md'>
      <div>
        <div className='flex items-start justify-between gap-3'>
          <div className='flex min-w-0 items-center gap-3'>
            <div className='flex size-10 shrink-0 items-center justify-center rounded-xl border border-border/80 bg-background/90 p-2 shadow-xs'>
              {getLobeIcon(props.item.iconKey, 24)}
            </div>
            <div className='min-w-0'>
              <h4 className='truncate text-sm font-semibold tracking-tight text-foreground'>
                {props.item.name}
              </h4>
              <p className='truncate text-xs text-muted-foreground'>
                {props.item.provider}
              </p>
            </div>
          </div>
          {props.item.tag && (
            <span
              className={cn(
                'inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[0.6875rem] font-medium leading-none',
                props.item.badgeColor
              )}
            >
              {props.item.tag}
            </span>
          )}
        </div>

        {props.item.description && (
          <p className='mt-2.5 line-clamp-1 text-xs leading-relaxed text-muted-foreground'>
            {props.item.description}
          </p>
        )}
      </div>

      <div>
        {/* 价格与折扣行 */}
        <div className='mb-2'>
          {priceContent}
        </div>

        {props.item.specs.length > 0 && (
          <div className='flex flex-wrap items-center gap-1.5'>
            {props.item.specs.slice(0, 3).map((spec) => (
              <span
                key={spec}
                className='inline-flex items-center gap-1 rounded-md border border-border/50 bg-background/60 px-1.5 py-0.5 text-[0.6875rem] text-muted-foreground'
              >
                <Tag className='size-2.5 text-primary/70' />
                {spec}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export function SignIn() {
  const { t } = useTranslation()
  const { redirect } = useSearch({ from: '/(auth)/sign-in' })
  const { status } = useStatus()
  const { systemName, logo, loading } = useSystemConfig()

  // 1. 动态读取后台配置的 agents (来自 /api/status 中的 agents 字段)
  const agents: AgentItem[] = useMemo(() => {
    const raw = (status as Record<string, unknown> | null)?.agents
    if (Array.isArray(raw) && raw.length > 0) {
      return raw as AgentItem[]
    }
    return DEFAULT_AGENTS
  }, [status])

  // 2. 动态读取后台模型数据 (/api/pricing)
  const { data: pricingData } = useQuery({
    queryKey: ['pricing'],
    queryFn: getPricing,
    staleTime: 5 * 60 * 1000,
  })

  // 筛选：优先挑选标记为 featured (首页展示) 的模型，若无则展示前列模型
  const modelCards: ModelCardData[] = useMemo(() => {
    const allModels = pricingData?.data || []
    const vendors = pricingData?.vendors || []

    if (!allModels.length) return []

    // 筛选后台配置了 featured 标签的模型，或者前 8 个
    const featured = allModels.filter((m) =>
      parseModelTags(m.tags).some((tag) => tag.toLowerCase() === 'featured')
    )
    const selected = featured.length > 0 ? featured : allModels.slice(0, 8)

    return selected.map((model, idx) => {
      const vendor = vendors.find((v) => v.id === model.vendor_id)
      const provider = vendor?.name || model.vendor_name || 'AI Gateway'
      const iconKey = resolveIconKey(model, vendor)

      const tags = parseModelTags(model.tags).filter(
        (t) => t.toLowerCase() !== 'featured'
      )
      const tag = tags[0] || t('精选')
      const specs = tags.slice(1)

      const theme = BADGE_THEMES[idx % BADGE_THEMES.length]

      return {
        id: model.model_name,
        name: model.model_name,
        provider,
        iconKey,
        tag,
        specs,
        badgeColor: theme.badge,
        theme,
        description: model.description || t('高可用分布式模型路由与负载均衡'),
        rawModel: {
          ...model,
          group_ratio: pricingData?.group_ratio || model.group_ratio,
        },
      }
    })
  }, [pricingData, t])

  return (
    <div className='relative min-h-svh w-full overflow-hidden bg-background'>
      {/* Background ambient lighting */}
      <div
        aria-hidden='true'
        className='pointer-events-none absolute -top-40 right-1/4 -z-10 h-[500px] w-[800px] translate-x-1/2 rounded-full bg-gradient-to-b from-primary/10 via-primary/5 to-transparent blur-3xl'
      />
      <div
        aria-hidden='true'
        className='pointer-events-none absolute bottom-0 left-0 -z-10 size-[480px] rounded-full bg-primary/5 blur-3xl'
      />

      {/* Top brand bar */}
      <header className='absolute top-0 inset-x-0 z-20 flex h-16 items-center px-6 sm:px-10'>
        <Link
          to='/'
          className='flex items-center gap-2.5 transition-opacity hover:opacity-85'
        >
          <div className='relative size-8'>
            {loading && <Skeleton className='absolute inset-0 rounded-full' />}
            {!loading && logo === '/logo.png' && (
              <>
                <img
                  src='/logo.png'
                  alt={t('Logo')}
                  className='block size-full rounded-full object-contain dark:hidden'
                />
                <img
                  src='/logo-dark.png'
                  alt={t('Logo')}
                  className='hidden size-full rounded-full object-contain dark:block'
                />
              </>
            )}
            {!loading && logo !== '/logo.png' && (
              <img
                src={logo}
                alt={t('Logo')}
                className='size-full rounded-full object-cover'
              />
            )}
          </div>
          {loading ? (
            <Skeleton className='h-5 w-24' />
          ) : (
            <span className='text-base font-semibold tracking-tight text-foreground'>
              {systemName}
            </span>
          )}
        </Link>
      </header>

      {/* Main Split Layout: Left is Agent & Models Marquee, Right is Auth Form */}
      <div className='min-h-svh flex flex-col lg:flex-row items-center justify-between pl-6 sm:pl-10 lg:pl-12 pr-6 sm:pr-10 lg:pr-16 pt-20 pb-10 lg:pt-0 gap-10 max-w-[1400px] mx-auto w-full'>
        {/* Left Column: Left sub-col is Agent Tools, Right sub-col is Models - 向左净平移1/4卡片距离 (~72px) */}
        <div className='relative hidden h-[690px] w-full max-w-[640px] overflow-hidden lg:block shrink-0 lg:-ml-18'>
          {/* Top & Bottom gradient mask for smooth fading */}
          <div className='pointer-events-none absolute inset-x-0 top-0 z-10 h-24 bg-gradient-to-b from-background via-background/85 to-transparent' />
          <div className='pointer-events-none absolute inset-x-0 bottom-0 z-10 h-24 bg-gradient-to-t from-background via-background/85 to-transparent' />

          <div className='grid grid-cols-2 gap-4.5'>
            {/* Column 1: Agent Tools (从后台 agents 配置动态生成) */}
            <div className='relative h-[670px] w-full overflow-hidden'>
              <div className='mb-3 flex items-center gap-1.5 px-1 text-xs font-semibold tracking-wider text-muted-foreground uppercase'>
                <Bot className='size-3.5 text-primary' />
                <span>{t('Agent 智能体工具')}</span>
              </div>
              <motion.div
                className='flex flex-col'
                animate={{ y: ['0%', '-50%'] }}
                transition={{
                  repeat: Infinity,
                  ease: 'linear',
                  duration: 38,
                }}
              >
                {[...agents, ...agents].map((agent, idx) => {
                  const key = idx < agents.length ? agent.id : `${agent.id}-dup-${idx}`
                  return <AgentCardItem key={key} item={agent} />
                })}
              </motion.div>
            </div>

            {/* Column 2: Models (从后台模型配置 featured/精选模型动态生成) */}
            <div className='relative h-[670px] w-full overflow-hidden'>
              <div className='mb-3 flex items-center gap-1.5 px-1 text-xs font-semibold tracking-wider text-muted-foreground uppercase'>
                <Sparkles className='size-3.5 text-amber-500' />
                <span>{t('精选推荐模型')}</span>
              </div>
              <motion.div
                className='flex flex-col'
                animate={{ y: ['-50%', '0%'] }}
                transition={{
                  repeat: Infinity,
                  ease: 'linear',
                  duration: 44,
                }}
              >
                {[...modelCards, ...modelCards].map((model, idx) => {
                  const key = idx < modelCards.length ? model.id : `${model.id}-dup-${idx}`
                  return <ModelCardItem key={key} item={model} />
                })}
              </motion.div>
            </div>
          </div>
        </div>

        {/* Right Column: Form Box - 居中视觉区域 */}
        <div className='flex flex-1 justify-center items-center'>
          <div className='w-full max-w-md space-y-7 rounded-3xl border border-border/60 bg-card/75 p-7 shadow-xl shadow-black/[0.03] backdrop-blur-2xl sm:p-9 dark:bg-card/45 dark:shadow-black/30'>
            <div className='space-y-2 text-left'>
              <h2 className='text-2xl font-bold tracking-tight text-foreground sm:text-3xl'>
                {t('Sign in')}
              </h2>
              {!status?.self_use_mode_enabled &&
                status?.register_enabled !== false && (
                  <p className='text-xs text-muted-foreground sm:text-sm'>
                    {t("Don't have an account?")}{' '}
                    <Link
                      to='/sign-up'
                      className='font-semibold text-foreground underline underline-offset-4 hover:text-primary'
                    >
                      {t('Sign up')}
                    </Link>
                  </p>
                )}
            </div>

            <UserAuthForm redirectTo={redirect} />

            <TermsFooter
              variant='sign-in'
              status={status}
              className='pt-1 text-center text-xs'
            />
          </div>
        </div>
      </div>
    </div>
  )
}
