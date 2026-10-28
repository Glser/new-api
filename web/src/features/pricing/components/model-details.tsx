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
import { useNavigate, useParams, useSearch } from '@tanstack/react-router'
import {
  ArrowLeft,
  CalendarClock,
  Code2,
  FileText,
  HeartPulse,
  Info,
  Layers,
  Maximize2,
  Sparkles,
  Timer,
} from 'lucide-react'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { CopyButton } from '@/components/copy-button'
import { StaticDataTable } from '@/components/data-table'
import {
  sideDrawerContentClassName,
  sideDrawerHeaderClassName,
} from '@/components/drawer-layout'
import { PublicLayout } from '@/components/layout'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { TooltipHint } from '@/components/ui/tooltip'
import { getPerfMetrics } from '@/features/performance-metrics/api'
import {
  formatLatency,
  formatThroughput,
  formatUptimePct,
  getSuccessRateTextClass,
} from '@/features/performance-metrics/lib/format'
import { PluginIcon } from '@/features/task-plugins/components/plugin-icon'
import { getLobeIcon } from '@/lib/lobe-icon'
import { requireServerSuccess } from '@/lib/server-error-message'
import { cn } from '@/lib/utils'
import { useSystemConfigStore } from '@/stores/system-config-store'

import { DEFAULT_TOKEN_UNIT } from '../constants'
import { usePricingData } from '../hooks/use-pricing-data'
import type { ParsedTaskTier } from '../lib/billing-expr'
import { formatBillingCondition } from '../lib/billing-expression/condition-display'
import {
  formatTaskUsageUnitPrice,
  getDynamicPriceEntries,
  getDynamicPriceUnitLabelKey,
  getDynamicPricingTiers,
  getTaskUsageQuantityUnitLabelKey,
  isDynamicPricingModel,
  isUnconfiguredTaskUsageModel,
  type DynamicPriceEntry,
} from '../lib/dynamic-price'
import {
  getAvailableGroups,
  getConfiguredGroupRatio,
  isTokenBasedModel,
} from '../lib/model-helpers'
import { withPluginPricing } from '../lib/plugin-pricing'
import {
  calculateTokenPrice,
  formatFixedPrice,
  formatGroupPrice,
} from '../lib/price'
import {
  evaluateTaskUsageExamples,
  getTaskEnumFields,
  getTaskNumberFields,
} from '../lib/task-expr'
import { getTaskPricingDisplayTiers } from '../lib/task-matrix-display'
import {
  hasSimpleTaskPricing,
  taskPriceLabel,
  taskUsageUnitLabel,
  taskPricingConditions,
} from '../lib/task-price-display'
import { formatOfficialPrice, matchesPrefix } from '../lib/usd-price'
import type {
  ModelCapability,
  PriceType,
  PricingModel,
  PricingUsableGroup,
  TokenUnit,
} from '../types'
import { DynamicPricingBreakdown } from './dynamic-pricing-breakdown'
import { ModelBillingModeBadge } from './model-billing-mode-badge'
import { ModelDetailsApi } from './model-details-api'
import { ModelDetailsPerformance } from './model-details-performance'
import { PriceRatioBadge } from './price-discount'

// ----------------------------------------------------------------------------
// Local UI helpers
// ----------------------------------------------------------------------------

function SectionTitle(props: {
  children: React.ReactNode
  icon?: React.ComponentType<{ className?: string }>
  className?: string
}) {
  const Icon = props.icon
  return (
    <h2
      className={cn(
        'text-foreground mb-3 flex items-center gap-1.5 text-sm font-semibold tracking-tight',
        props.className
      )}
    >
      {Icon ? (
        <Icon className='text-muted-foreground/70 size-3.5 shrink-0' />
      ) : null}
      {props.children}
    </h2>
  )
}

function PricingHeading(props: {
  official?: boolean
  hideTitle?: boolean
  unitHint?: string | null
}) {
  const { t } = useTranslation()
  if (props.hideTitle || !props.official) return null
  return (
    <SectionTitle className='items-baseline gap-2'>
      {t('Official price')}
      {props.unitHint ? (
        <span className='text-muted-foreground translate-y-px text-[10px] font-medium tracking-normal'>
          {props.unitHint}
        </span>
      ) : null}
    </SectionTitle>
  )
}

const TIER_VAR_LABELS: Record<string, string> = {
  p: 'Input',
  c: 'Output',
  len: 'Full input length',
}
const TIER_OP_LABELS: Record<string, string> = {
  '<': '<',
  '<=': '≤',
  '>': '>',
  '>=': '≥',
}

function formatTierSplitDescription(
  conditions: { var: string; op: string; value: number }[] | undefined,
  t: (key: string) => string
): string {
  if (!conditions?.length) return ''
  return conditions
    .map((condition) => {
      const label = t(TIER_VAR_LABELS[condition.var] || condition.var)
      const op = TIER_OP_LABELS[condition.op] || condition.op
      const value =
        formatCatalogTokenCount(condition.value) || String(condition.value)
      return `${label} ${op} ${value}`
    })
    .join(' · ')
}

function DynamicPriceEntryLabel(props: { entry: DynamicPriceEntry }) {
  const { t, i18n } = useTranslation()
  if (props.entry.labelKind === 'schema') {
    return (
      <span className='break-words whitespace-normal'>
        {taskPriceLabel(
          props.entry.description,
          props.entry.shortLabel,
          i18n.language
        )}
      </span>
    )
  }
  return t(props.entry.shortLabel)
}

function UnconfiguredTaskPricingNotice(props: { model: PricingModel }) {
  const { t, i18n } = useTranslation()
  const numberFields = getTaskNumberFields(props.model.billing_usage_schema)
  const enumFields = getTaskEnumFields(props.model.billing_usage_schema)

  return (
    <div className='bg-muted/20 flex flex-col gap-3 rounded-lg border p-3'>
      <p className='text-muted-foreground text-sm'>
        {t(
          'This model is billed by usage, but the administrator has not configured its pricing yet.'
        )}
      </p>
      {numberFields.length + enumFields.length > 0 ? (
        <dl className='grid gap-2 sm:grid-cols-2'>
          {numberFields.map(([field, definition]) => (
            <div
              key={field}
              className='flex items-baseline justify-between gap-3'
            >
              <dt className='text-sm'>
                {taskPriceLabel(definition.description, field, i18n.language)}
              </dt>
              <dd className='text-muted-foreground text-xs'>
                {taskUsageUnitLabel(
                  definition,
                  i18n.language,
                  t(getTaskUsageQuantityUnitLabelKey(definition.unit))
                )}
              </dd>
            </div>
          ))}
          {enumFields.map(([field, definition]) => (
            <div
              key={field}
              className='flex items-baseline justify-between gap-3'
            >
              <dt className='text-sm'>
                <code>{field}</code>
              </dt>
              <dd className='text-muted-foreground text-right text-xs'>
                {(definition.enum ?? []).join(', ')}
              </dd>
            </div>
          ))}
        </dl>
      ) : null}
    </div>
  )
}

const CAPABILITY_LABEL_KEYS: Record<ModelCapability, string> = {
  function_calling: 'Function calling',
  streaming: 'Streaming',
  vision: 'Vision',
  json_mode: 'JSON mode',
  structured_output: 'Structured output',
  reasoning: 'Reasoning',
  tools: 'Tools',
  system_prompt: 'System prompt',
  web_search: 'Web search',
  code_interpreter: 'Code interpreter',
  caching: 'Prompt caching',
  embeddings: 'Embeddings',
}

const MODALITY_LABEL_KEYS: Record<string, string> = {
  text: 'Text',
  image: 'Image',
  audio: 'Audio',
  video: 'Video',
  file: 'File',
}

const TOKEN_FORMAT = new Intl.NumberFormat(undefined, {
  maximumFractionDigits: 1,
})
const MODEL_DETAILS_SKELETON_KEYS = ['first', 'second', 'third', 'fourth']

function formatCatalogTokenCount(tokens: number): string {
  if (!Number.isFinite(tokens) || tokens <= 0) return ''
  if (tokens >= 1_000_000) {
    return `${TOKEN_FORMAT.format(tokens / 1_000_000)}M`
  }
  if (tokens >= 1_000) {
    return `${TOKEN_FORMAT.format(tokens / 1_000)}K`
  }
  return TOKEN_FORMAT.format(tokens)
}

function formatCatalogYearMonth(value?: string): string {
  if (!value) return ''
  const [yearStr, monthStr] = value.split('-')
  const year = Number(yearStr)
  const month = Number(monthStr)
  if (!Number.isFinite(year) || !Number.isFinite(month)) return value
  const date = new Date(Date.UTC(year, month - 1, 1))
  return date.toLocaleString(undefined, { year: 'numeric', month: 'short' })
}

function normalizeCatalogItems(items?: readonly string[]): string[] {
  if (!items) return []
  return items.filter((item) => item.trim().length > 0)
}

function OverviewMetric(props: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: React.ReactNode
  valueClassName?: string
}) {
  const Icon = props.icon

  return (
    <div className='flex min-w-0 items-center gap-2 px-3 py-2'>
      <Icon className='text-muted-foreground/70 size-3.5 shrink-0' />
      <div className='min-w-0 flex-1'>
        <div className='text-muted-foreground truncate text-[10px] font-medium tracking-wider uppercase'>
          {props.label}
        </div>
        <div
          className={cn(
            'text-foreground truncate font-mono text-sm font-semibold tabular-nums',
            props.valueClassName
          )}
        >
          {props.value}
        </div>
      </div>
    </div>
  )
}

function OverviewSummaryGrid(props: { model: PricingModel }) {
  const { t } = useTranslation()
  const metricsQuery = useQuery({
    queryKey: ['perf-metrics', props.model.model_name],
    queryFn: async () =>
      requireServerSuccess(await getPerfMetrics(props.model.model_name, 24)),
    staleTime: 60 * 1000,
  })

  const groups = metricsQuery.data?.data.groups ?? []
  const successRates = groups
    .map((group) => group.success_rate)
    .filter((rate) => Number.isFinite(rate))
  const successRate =
    successRates.length > 0
      ? successRates.reduce((sum, rate) => sum + rate, 0) / successRates.length
      : Number.NaN
  const tpsValues = groups
    .map((group) => group.avg_tps)
    .filter((value) => value > 0)
  const avgTps =
    tpsValues.length > 0
      ? tpsValues.reduce((sum, value) => sum + value, 0) / tpsValues.length
      : 0
  const latencyValues = groups
    .map((group) => group.avg_latency_ms)
    .filter((value) => value > 0)
  const avgLatency =
    latencyValues.length > 0
      ? Math.round(
          latencyValues.reduce((sum, value) => sum + value, 0) /
            latencyValues.length
        )
      : 0

  return (
    <div className='bg-muted/20 grid overflow-hidden rounded-lg border sm:grid-cols-3 sm:divide-x'>
      <OverviewMetric
        icon={Timer}
        label='TPS'
        value={formatThroughput(avgTps)}
      />
      <OverviewMetric
        icon={Timer}
        label={t('Average latency')}
        value={formatLatency(avgLatency)}
      />
      <OverviewMetric
        icon={HeartPulse}
        label={t('Success rate')}
        value={formatUptimePct(successRate)}
        valueClassName={getSuccessRateTextClass(successRate)}
      />
    </div>
  )
}

function CatalogPillList(props: { items: string[] }) {
  return (
    <div role='list' className='flex min-w-0 flex-wrap gap-1.5'>
      {props.items.map((item) => (
        <span
          key={item}
          role='listitem'
          className='border-border/70 bg-muted/40 text-foreground inline-flex min-w-0 items-center rounded-md border px-2 py-0.5 text-xs font-medium'
        >
          <span className='min-w-0 break-words'>{item}</span>
        </span>
      ))}
    </div>
  )
}

function CatalogTextValue(props: { children: React.ReactNode }) {
  return (
    <span className='text-foreground min-w-0 truncate text-sm font-semibold'>
      {props.children}
    </span>
  )
}

function CatalogInfoCell(props: { label: string; children: React.ReactNode }) {
  return (
    <div className='bg-card flex min-w-0 flex-col gap-1 px-3 py-2.5'>
      <span className='text-muted-foreground text-[10px] font-medium tracking-wider uppercase'>
        {props.label}
      </span>
      {props.children}
    </div>
  )
}

function ModalityLabels(props: { items: string[] }) {
  const { t } = useTranslation()
  if (props.items.length === 0) return null

  return (
    <span className='inline-flex items-center gap-1 align-middle'>
      {props.items.map((item) => (
        <span key={item} className='font-medium'>
          {t(MODALITY_LABEL_KEYS[item] ?? item)}
        </span>
      ))}
    </span>
  )
}

function ModelBackendQuickStats(props: { model: PricingModel }) {
  const { t } = useTranslation()
  const model = props.model
  const inputModalities = normalizeCatalogItems(model.input_modalities)
  const outputModalities = normalizeCatalogItems(model.output_modalities)
  const contextLength = model.context_length ?? 0
  const maxOutput = model.max_output_tokens ?? 0
  const knowledgeCutoff = formatCatalogYearMonth(model.knowledge_cutoff)
  const releaseDate = formatCatalogYearMonth(model.release_date)

  const stats: {
    key: string
    icon: React.ComponentType<{ className?: string }>
    label: string
    value: React.ReactNode
    hint?: string
  }[] = []

  if (contextLength > 0) {
    stats.push({
      key: 'context',
      icon: Layers,
      label: t('Context'),
      value: formatCatalogTokenCount(contextLength),
      hint: t('Maximum input window'),
    })
  }

  if (maxOutput > 0) {
    stats.push({
      key: 'max-output',
      icon: Maximize2,
      label: t('Max output'),
      value: formatCatalogTokenCount(maxOutput),
      hint: t('Maximum tokens per response'),
    })
  }

  if (inputModalities.length > 0 || outputModalities.length > 0) {
    stats.push({
      key: 'modalities',
      icon: FileText,
      label: t('Modalities'),
      value: (
        <span className='inline-flex items-center gap-1'>
          <ModalityLabels items={inputModalities} />
          {inputModalities.length > 0 && outputModalities.length > 0 && (
            <span className='text-muted-foreground/40'>→</span>
          )}
          <ModalityLabels items={outputModalities} />
        </span>
      ),
    })
  }

  if (knowledgeCutoff) {
    stats.push({
      key: 'knowledge',
      icon: Sparkles,
      label: t('Knowledge cutoff'),
      value: knowledgeCutoff,
    })
  }

  if (releaseDate) {
    stats.push({
      key: 'release',
      icon: CalendarClock,
      label: t('Released'),
      value: releaseDate,
    })
  }

  if (stats.length === 0) return null

  return (
    <div className='bg-muted/20 grid grid-cols-2 gap-px overflow-hidden rounded-lg border @md/details:grid-cols-3 @2xl/details:grid-cols-5'>
      {stats.map((stat) => {
        const Icon = stat.icon
        return (
          <div
            key={stat.key}
            className='bg-background flex min-w-0 flex-col gap-0.5 px-3 py-2.5'
          >
            <span className='text-muted-foreground inline-flex min-w-0 items-center gap-1 text-[10px] font-medium tracking-wider uppercase'>
              <Icon className='size-3 shrink-0' />
              <span className='truncate'>{stat.label}</span>
            </span>
            <span className='text-foreground truncate text-sm font-semibold tabular-nums'>
              {stat.value}
            </span>
            {stat.hint && (
              <span className='text-muted-foreground/60 truncate text-[10px]'>
                {stat.hint}
              </span>
            )}
          </div>
        )
      })}
    </div>
  )
}

function ModelBackendSignalsSection(props: { model: PricingModel }) {
  const { t } = useTranslation()
  const capabilities = normalizeCatalogItems(props.model.capabilities)
  const inputModalities = normalizeCatalogItems(props.model.input_modalities)
  const outputModalities = normalizeCatalogItems(props.model.output_modalities)

  if (
    capabilities.length === 0 &&
    inputModalities.length === 0 &&
    outputModalities.length === 0
  ) {
    return null
  }

  return (
    <>
      {capabilities.length > 0 ? (
        <section>
          <SectionTitle icon={Sparkles}>
            {t('Capabilities')}
            <span className='text-muted-foreground text-[10px] font-medium tabular-nums'>
              {capabilities.length}
            </span>
          </SectionTitle>
          <CatalogPillList
            items={capabilities.map((capability) =>
              t(
                CAPABILITY_LABEL_KEYS[capability as ModelCapability] ??
                  capability
              )
            )}
          />
        </section>
      ) : null}
      {(inputModalities.length > 0 || outputModalities.length > 0) && (
        <section>
          <SectionTitle icon={FileText}>
            {t('Supported modalities')}
          </SectionTitle>
          <div className='border-border/60 bg-border/60 grid grid-cols-1 gap-px overflow-hidden rounded-lg border sm:grid-cols-2'>
            {inputModalities.length > 0 && (
              <CatalogInfoCell label={t('Input')}>
                <CatalogTextValue>
                  <ModalityLabels items={inputModalities} />
                </CatalogTextValue>
              </CatalogInfoCell>
            )}
            {outputModalities.length > 0 && (
              <CatalogInfoCell label={t('Output')}>
                <CatalogTextValue>
                  <ModalityLabels items={outputModalities} />
                </CatalogTextValue>
              </CatalogInfoCell>
            )}
          </div>
        </section>
      )}
    </>
  )
}

function ModelBackendDetailsSection(props: { model: PricingModel }) {
  return (
    <>
      <ModelBackendQuickStats model={props.model} />
      <ModelBackendSignalsSection model={props.model} />
    </>
  )
}

// ----------------------------------------------------------------------------
// Model header (always visible above the detail sections)
// ----------------------------------------------------------------------------

function ModelHeader(props: { model: PricingModel; compact?: boolean }) {
  const { t } = useTranslation()
  const model = props.model
  const modelIconKey = model.icon || model.vendor_icon
  const modelIcon = modelIconKey ? getLobeIcon(modelIconKey, 24) : null
  const initial = model.model_name?.charAt(0).toUpperCase() || '?'
  const description = model.description || model.vendor_description || null

  return (
    <header
      className={cn(
        'relative overflow-hidden',
        props.compact
          ? 'min-w-0'
          : 'border-border/70 bg-card/70 rounded-xl border p-4 shadow-sm sm:p-5'
      )}
    >
      {!props.compact && (
        <div
          aria-hidden='true'
          className='bg-primary/70 absolute inset-y-0 start-0 w-1'
        />
      )}
      <div className='flex min-w-0 items-start gap-3'>
        <div
          className={cn(
            'flex shrink-0 items-center justify-center',
            props.compact ? 'size-8' : 'size-10'
          )}
        >
          {modelIcon || (
            <span className='text-muted-foreground font-mono text-base font-bold'>
              {initial}
            </span>
          )}
        </div>
        <div className='min-w-0 flex-1'>
          <div className='flex min-w-0 items-center gap-1'>
            <h1
              className={cn(
                'min-w-0 font-mono font-bold tracking-tight break-words',
                props.compact ? 'text-lg' : 'text-xl sm:text-2xl'
              )}
            >
              {model.model_name}
            </h1>
            <CopyButton
              value={model.model_name || ''}
              className='size-7 shrink-0'
              iconClassName='size-3.5'
              tooltip={t('Copy model name')}
              successTooltip={t('Copied!')}
              aria-label={t('Copy model name')}
            />
          </div>
          <div className='mt-1.5 flex flex-wrap items-center gap-1.5 text-xs'>
            {model.vendor_name && (
              <span className='border-border/70 bg-muted/40 text-muted-foreground rounded-md border px-2 py-0.5 font-medium'>
                {model.vendor_name}
              </span>
            )}
            <ModelBillingModeBadge model={model} />
          </div>
          {description && (
            <p
              className={cn(
                'text-muted-foreground max-w-3xl text-sm leading-relaxed',
                props.compact ? 'mt-2 line-clamp-2 text-xs' : 'mt-3'
              )}
            >
              {description}
            </p>
          )}
        </div>
      </div>
    </header>
  )
}

// ----------------------------------------------------------------------------
// Tier prices shared by official and group pricing tables
// ----------------------------------------------------------------------------

type DynamicPriceOptions = Parameters<typeof getDynamicPriceEntries>[1]
type DynamicPricingTier = ReturnType<typeof getDynamicPricingTiers>[number]
type DynamicFormattedPricesByTier = Map<DynamicPricingTier, Map<string, string>>

function getDynamicPriceFields(
  tiers: DynamicPricingTier[],
  options: DynamicPriceOptions
) {
  return [
    ...new Map(
      tiers
        .flatMap((tier) => getDynamicPriceEntries(tier, options))
        .map((entry) => [entry.field, entry])
    ).values(),
  ]
}

function formatDetailOfficialPrice(
  amountUSD: number,
  tokenUnit: TokenUnit,
  perToken: boolean,
  usdOfficial: boolean
): string {
  return formatOfficialPrice(amountUSD, usdOfficial, perToken ? tokenUnit : 'M')
}

function getDynamicFormattedPricesByTier(
  tiers: DynamicPricingTier[],
  options: DynamicPriceOptions,
  official = false,
  usdOfficial = false
): DynamicFormattedPricesByTier {
  return new Map(
    tiers.map((tier) => [
      tier,
      new Map(
        getDynamicPriceEntries(tier, options).map((entry) => [
          entry.field,
          official
            ? formatDetailOfficialPrice(
                entry.value,
                options.tokenUnit,
                Boolean(entry.variable),
                usdOfficial
              )
            : entry.formatted,
        ])
      ),
    ])
  )
}

// ----------------------------------------------------------------------------
// Group pricing table
// ----------------------------------------------------------------------------

type GroupPricingSectionProps = {
  official?: boolean
  model: PricingModel
  groupRatio: Record<string, number>
  usableGroup: PricingUsableGroup
  autoGroups: string[]
  priceRate: number
  usdExchangeRate: number
  tokenUnit: TokenUnit
  showRechargePrice?: boolean
}

function GroupPricingSection(props: GroupPricingSectionProps) {
  const { t } = useTranslation()
  const variants = props.model.billing_plugin_variants
  const tokenUnitLabel = props.tokenUnit === 'K' ? '1K' : '1M'
  let unitHint: string | null = null
  if (props.model.billing_usage_schema) {
    unitHint = t('Prices shown per usage unit')
  } else if (isTokenBasedModel(props.model)) {
    unitHint = `${t('Prices shown per')} ${tokenUnitLabel} tokens`
  }
  if (!variants?.length) {
    return <ProviderGroupPricingSection {...props} />
  }
  return (
    <section>
      <PricingHeading official={props.official} unitHint={unitHint} />
      <Tabs key={props.model.model_name} defaultValue={variants[0].plugin_key}>
        <TabsList
          aria-label={t('Provider')}
          className='max-w-full flex-wrap justify-start group-data-horizontal/tabs:h-auto'
        >
          {variants.map((variant) => (
            <TabsTrigger
              key={variant.plugin_key}
              value={variant.plugin_key}
              className='max-w-full min-w-0'
            >
              <PluginIcon
                plugin={{
                  key: variant.plugin_key,
                  name: variant.plugin_name,
                  icon: variant.icon,
                }}
                size={16}
              />
              <TooltipHint content={variant.plugin_name}>
                <span className='truncate'>{variant.plugin_name}</span>
              </TooltipHint>
            </TabsTrigger>
          ))}
        </TabsList>
        {variants.map((variant) => (
          <TabsContent key={variant.plugin_key} value={variant.plugin_key}>
            {variant.billing_expr || variant.billing_mode === 'ratio' ? (
              <ProviderGroupPricingSection
                {...props}
                model={withPluginPricing(props.model, variant)}
                hideTitle
              />
            ) : (
              <UnconfiguredTaskPricingNotice
                model={withPluginPricing(props.model, variant)}
              />
            )}
          </TabsContent>
        ))}
      </Tabs>
    </section>
  )
}

function ProviderGroupPricingSection(
  props: GroupPricingSectionProps & { hideTitle?: boolean }
) {
  const { t, i18n } = useTranslation()
  const showRechargePrice = props.showRechargePrice ?? false
  const currency = useSystemConfigStore((state) => state.config.currency)
  const showUsdOfficial = matchesPrefix(
    props.model.model_name,
    currency.modelSquareUsdPricePrefixes
  )
  const availableGroups = useMemo(
    () =>
      props.official
        ? ['_official']
        : getAvailableGroups(props.model, props.usableGroup || {}),
    [props.official, props.model, props.usableGroup]
  )

  const isTokenBased = isTokenBasedModel(props.model)
  const tokenUnitLabel = props.tokenUnit === 'K' ? '1K' : '1M'
  const tokenUnitHint = `${t('Prices shown per')} ${tokenUnitLabel} tokens`

  const extraPriceTypes = useMemo(() => {
    const types: { label: string; type: PriceType }[] = []
    if (props.model.cache_ratio != null) {
      types.push({ label: t('Cache'), type: 'cache' })
    }
    if (props.model.create_cache_ratio != null) {
      types.push({ label: t('Cache Write'), type: 'create_cache' })
    }
    if (props.model.image_ratio != null) {
      types.push({ label: t('Image'), type: 'image' })
    }
    if (props.model.audio_ratio != null) {
      types.push({ label: t('Audio In'), type: 'audio_input' })
    }
    if (
      props.model.audio_ratio != null &&
      props.model.audio_completion_ratio != null
    ) {
      types.push({ label: t('Audio Out'), type: 'audio_output' })
    }
    return types
  }, [props.model, t])

  if (availableGroups.length === 0) {
    return (
      <section>
        <PricingHeading
          official={props.official}
          hideTitle={props.hideTitle}
          unitHint={isTokenBased ? tokenUnitHint : null}
        />
        <p className='text-muted-foreground text-sm'>
          {t(
            'This model is not available in any group, or no group pricing information is configured.'
          )}
        </p>
      </section>
    )
  }

  const thClass = cn(
    'text-muted-foreground py-2 text-xs font-medium whitespace-normal break-words',
    !props.model.billing_usage_schema && 'tracking-wider uppercase'
  )
  const priceHeadClass = cn(thClass, 'text-center')
  const priceCellClass = 'py-2.5 text-center font-mono'

  if (isDynamicPricingModel(props.model)) {
    const dynamicTiers = props.model.billing_usage_schema
      ? getTaskPricingDisplayTiers(
          props.model.billing_expr,
          props.model.billing_usage_schema
        )
      : getDynamicPricingTiers(props.model)
    const hasRequestPrice = dynamicTiers.some(
      (tier) => !('unitPrices' in tier) && tier.billingUnit === 'request'
    )
    const dynamicUnitHint = dynamicTiers.some(
      (tier) => 'unitPrices' in tier || tier.billingUnit === 'request'
    )
      ? t('Prices shown per usage unit')
      : tokenUnitHint

    if (dynamicTiers.length === 0) {
      return (
        <section>
          <PricingHeading
            official={props.official}
            hideTitle={props.hideTitle}
            unitHint={dynamicUnitHint}
          />
          <div className='rounded-lg border border-amber-200/70 bg-amber-50/70 p-3 dark:border-amber-500/20 dark:bg-amber-500/10'>
            <div className='text-sm font-medium text-amber-800 dark:text-amber-200'>
              {t('Special billing expression')}
            </div>
            <p className='text-muted-foreground mt-1 text-xs'>
              {t(
                'Group prices cannot be expanded because this expression is not a standard tiered pricing expression.'
              )}
            </p>
            <div className='mt-3'>
              <div className='text-muted-foreground mb-1 text-[10px] font-medium tracking-wider uppercase'>
                {t('Raw expression')}
              </div>
              <code className='text-muted-foreground bg-background/80 block max-h-28 overflow-auto rounded-md border px-2 py-1.5 font-mono text-xs break-all'>
                {props.model.billing_expr}
              </code>
            </div>
          </div>
        </section>
      )
    }

    const usageExampleRows = evaluateTaskUsageExamples(
      props.model.billing_expr,
      props.model.billing_usage_schema,
      props.model.billing_usage_examples
    )
    const priceFields = getDynamicPriceFields(dynamicTiers, {
      tokenUnit: props.tokenUnit,
      showRechargePrice,
      priceRate: props.priceRate,
      usdExchangeRate: props.usdExchangeRate,
      groupRatioMultiplier: 1,
      usageSchema: props.model.billing_usage_schema,
    })
    const formattedPricesByGroup = new Map(
      availableGroups.map((group) => {
        const ratio = props.official
          ? 1
          : getConfiguredGroupRatio(props.groupRatio, group)
        return [
          group,
          getDynamicFormattedPricesByTier(
            dynamicTiers,
            {
              tokenUnit: props.tokenUnit,
              showRechargePrice,
              priceRate: props.priceRate,
              usdExchangeRate: props.usdExchangeRate,
              groupRatioMultiplier: ratio,
              usageSchema: props.model.billing_usage_schema,
            },
            props.official,
            showUsdOfficial
          ),
        ] as const
      })
    )

    return (
      <section>
        <PricingHeading
          official={props.official}
          hideTitle={props.hideTitle}
          unitHint={dynamicUnitHint}
        />
        <div className='space-y-3'>
          {availableGroups.map((group) => {
            const ratio = props.official
              ? 1
              : getConfiguredGroupRatio(props.groupRatio, group)
            const formattedPricesByTier =
              formattedPricesByGroup.get(group) ??
              new Map<DynamicPricingTier, Map<string, string>>()

            return (
              <div key={group} className='space-y-2'>
                {!props.official && (
                  <div className='flex items-center justify-between gap-3'>
                    <span className='text-sm font-medium'>{group}</span>
                    <PriceRatioBadge
                      groupRatio={ratio}
                      usdOfficial={showUsdOfficial}
                    />
                  </div>
                )}
                <StaticDataTable
                  tableClassName='text-sm'
                  headerRowClassName='hover:bg-transparent'
                  data={dynamicTiers}
                  getRowKey={(tier, tierIndex) =>
                    `${group}-${tier.label || tierIndex}`
                  }
                  columns={[
                    ...(hasSimpleTaskPricing(props.model)
                      ? []
                      : [
                          {
                            id: 'tier',
                            header: props.model.billing_usage_schema
                              ? t('Applicable conditions')
                              : t('Tier'),
                            className: thClass,
                            cellClassName:
                              'text-muted-foreground py-2.5 whitespace-normal break-words',
                            cell: (tier: DynamicPricingTier) => {
                              if ('unitPrices' in tier) {
                                return (
                                  taskPricingConditions(
                                    (tier as ParsedTaskTier).conditions,
                                    props.model.billing_usage_schema,
                                    i18n.language,
                                    t
                                  ) ||
                                  t(
                                    dynamicTiers.length > 1
                                      ? 'Other cases'
                                      : 'All requests'
                                  )
                                )
                              }
                              const split =
                                (tier.conditionText
                                  ? formatBillingCondition(
                                      tier.conditionText,
                                      t,
                                      i18n.language
                                    )
                                  : null) ||
                                formatTierSplitDescription(tier.conditions, t)
                              const label = tier.label || t('Default')
                              if (!split) return label
                              return (
                                <div className='flex min-w-0 flex-col gap-0.5'>
                                  <span className='text-foreground font-medium'>
                                    {label}
                                  </span>
                                  <span
                                    data-table-text='secondary'
                                    className='text-muted-foreground text-[10px]! leading-4 font-normal!'
                                  >
                                    {split}
                                  </span>
                                </div>
                              )
                            },
                          },
                        ]),
                    ...priceFields.map((fieldEntry) => {
                      const unitLabelKey =
                        getDynamicPriceUnitLabelKey(fieldEntry)
                      let unitLabel = taskUsageUnitLabel(
                        fieldEntry,
                        i18n.language,
                        unitLabelKey ? t(unitLabelKey) : ''
                      )
                      if (!unitLabel && hasRequestPrice) {
                        unitLabel = t('{{unit}} tokens', {
                          unit: tokenUnitLabel,
                        })
                      }
                      const fieldLabel =
                        fieldEntry.labelKind === 'schema' ? (
                          <DynamicPriceEntryLabel entry={fieldEntry} />
                        ) : (
                          t(fieldEntry.shortLabel)
                        )
                      return {
                        id: fieldEntry.field,
                        header: unitLabel ? (
                          <>
                            {fieldLabel}
                            {` / ${unitLabel}`}
                          </>
                        ) : (
                          fieldLabel
                        ),
                        className: priceHeadClass,
                        cellClassName: priceCellClass,
                        cell: (tier: (typeof dynamicTiers)[number]) =>
                          formattedPricesByTier
                            .get(tier)
                            ?.get(fieldEntry.field) ?? '-',
                      }
                    }),
                  ]}
                />
                {usageExampleRows.length > 0 ? (
                  <div className='space-y-2'>
                    <div className='text-muted-foreground text-[10px] font-medium tracking-wider uppercase'>
                      {t('Price examples')}
                    </div>
                    <StaticDataTable
                      tableClassName='text-sm'
                      headerRowClassName='hover:bg-transparent'
                      data={usageExampleRows}
                      getRowKey={(row) => `${group}-${row.label}`}
                      columns={[
                        {
                          id: 'spec',
                          header: t('Spec'),
                          className: thClass,
                          cellClassName: 'text-muted-foreground py-2.5',
                          cell: (row) => row.label,
                        },
                        {
                          id: 'price',
                          header: t('Example price'),
                          className: priceHeadClass,
                          cellClassName: priceCellClass,
                          cell: (row) => {
                            if (props.official) {
                              return `≈ ${formatDetailOfficialPrice(row.total, props.tokenUnit, false, showUsdOfficial)}`
                            }
                            return `≈ ${formatTaskUsageUnitPrice(row.total, {
                              tokenUnit: props.tokenUnit,
                              showRechargePrice,
                              priceRate: props.priceRate,
                              usdExchangeRate: props.usdExchangeRate,
                              groupRatioMultiplier: ratio,
                            })}`
                          },
                        },
                      ]}
                    />
                    <p className='text-muted-foreground/40 text-[10px]'>
                      {t('Approximate prices for common specs.')}
                    </p>
                  </div>
                ) : null}
              </div>
            )
          })}
        </div>
      </section>
    )
  }

  if (isUnconfiguredTaskUsageModel(props.model)) {
    return (
      <section>
        <PricingHeading
          official={props.official}
          hideTitle={props.hideTitle}
          unitHint={isTokenBased ? tokenUnitHint : null}
        />
        <UnconfiguredTaskPricingNotice model={props.model} />
      </section>
    )
  }

  const renderGroupPrice = (group: string, type: PriceType) => {
    if (props.official) {
      return formatDetailOfficialPrice(
        calculateTokenPrice(props.model, type, 1),
        props.tokenUnit,
        true,
        showUsdOfficial
      )
    }
    return formatGroupPrice(
      props.model,
      group,
      type,
      props.tokenUnit,
      showRechargePrice,
      props.priceRate,
      props.usdExchangeRate,
      props.groupRatio
    )
  }
  const renderFixedGroupPrice = (group: string) => {
    if (props.official) {
      return formatDetailOfficialPrice(
        props.model.model_price ?? Number.NaN,
        props.tokenUnit,
        false,
        showUsdOfficial
      )
    }
    return formatFixedPrice(
      props.model,
      group,
      showRechargePrice,
      props.priceRate,
      props.usdExchangeRate,
      props.groupRatio
    )
  }

  return (
    <section>
      <PricingHeading
        official={props.official}
        hideTitle={props.hideTitle}
        unitHint={isTokenBased ? tokenUnitHint : null}
      />
      <StaticDataTable
        tableClassName='text-sm'
        headerRowClassName='hover:bg-transparent'
        data={availableGroups}
        getRowKey={(group) => group}
        columns={[
          ...(!props.official
            ? [
                {
                  id: 'group',
                  header: t('Group'),
                  className: thClass,
                  cellClassName: 'py-2.5',
                  cell: (group: string) => group,
                },
              ]
            : []),
          ...(isTokenBased
            ? [
                {
                  id: 'input',
                  header: t('Input'),
                  className: priceHeadClass,
                  cellClassName: priceCellClass,
                  cell: (group: string) => renderGroupPrice(group, 'input'),
                },
                {
                  id: 'output',
                  header: t('Output'),
                  className: priceHeadClass,
                  cellClassName: priceCellClass,
                  cell: (group: string) => renderGroupPrice(group, 'output'),
                },
                ...extraPriceTypes.map((ep) => ({
                  id: ep.type,
                  header: ep.label,
                  className: priceHeadClass,
                  cellClassName: priceCellClass,
                  cell: (group: string) => renderGroupPrice(group, ep.type),
                })),
              ]
            : [
                {
                  id: 'price',
                  header: t('Price'),
                  className: priceHeadClass,
                  cellClassName: priceCellClass,
                  cell: renderFixedGroupPrice,
                },
              ]),
          ...(!props.official
            ? [
                {
                  id: 'ratio',
                  header: t('Group discount'),
                  className: cn(thClass, 'text-center'),
                  cellClassName: 'text-muted-foreground py-2.5 text-center font-mono',
                  cell: (group: string) => (
                    <PriceRatioBadge
                      groupRatio={getConfiguredGroupRatio(
                        props.groupRatio,
                        group
                      )}
                      usdOfficial={showUsdOfficial}
                    />
                  ),
                },
              ]
            : []),
        ]}
      />
    </section>
  )
}

const TAB_VALUES = ['overview', 'performance', 'api'] as const
type TabValue = (typeof TAB_VALUES)[number]

const TAB_META: Record<
  TabValue,
  { icon: React.ComponentType<{ className?: string }>; labelKey: string }
> = {
  overview: { icon: Info, labelKey: 'Overview' },
  performance: { icon: HeartPulse, labelKey: 'Performance' },
  api: { icon: Code2, labelKey: 'API' },
}

export interface ModelDetailsContentProps {
  model: PricingModel
  groupRatio: Record<string, number>
  usableGroup: PricingUsableGroup
  endpointMap: Record<string, { path?: string; method?: string }>
  autoGroups: string[]
  priceRate: number
  usdExchangeRate: number
  tokenUnit: TokenUnit
  showRechargePrice?: boolean
  hideHeader?: boolean
}

export function ModelDetailsContent(props: ModelDetailsContentProps) {
  const { t } = useTranslation()
  const showRechargePrice = props.showRechargePrice ?? false

  return (
    <div className='@container/details space-y-5'>
      {!props.hideHeader && <ModelHeader model={props.model} />}

      <Tabs defaultValue='overview' className='gap-4'>
        <TabsList className='border-border/70 bg-muted/30 grid w-full grid-cols-3 gap-1 rounded-lg border p-1 group-data-horizontal/tabs:h-auto'>
          {TAB_VALUES.map((value) => {
            const Icon = TAB_META[value].icon
            return (
              <TabsTrigger
                key={value}
                value={value}
                className='data-[state=active]:bg-background h-8 min-w-0 gap-1.5 rounded-md px-3 text-xs data-[state=active]:shadow-xs sm:text-sm'
              >
                <Icon className='size-3.5' />
                <span className='truncate'>{t(TAB_META[value].labelKey)}</span>
              </TabsTrigger>
            )
          })}
        </TabsList>

        <TabsContent value='overview' className='space-y-6 outline-none'>
          <OverviewSummaryGrid model={props.model} />

          <GroupPricingSection
            official
            model={props.model}
            groupRatio={props.groupRatio}
            usableGroup={props.usableGroup}
            autoGroups={props.autoGroups}
            priceRate={props.priceRate}
            usdExchangeRate={props.usdExchangeRate}
            tokenUnit={props.tokenUnit}
            showRechargePrice={showRechargePrice}
          />
          <GroupPricingSection
            model={props.model}
            groupRatio={props.groupRatio}
            usableGroup={props.usableGroup}
            autoGroups={props.autoGroups}
            priceRate={props.priceRate}
            usdExchangeRate={props.usdExchangeRate}
            tokenUnit={props.tokenUnit}
            showRechargePrice={showRechargePrice}
          />
          <DynamicPricingBreakdown
            billingExpr={props.model.billing_expr}
            usageSchema={props.model.billing_usage_schema}
            rulesOnly
            compact
          />

          <ModelBackendDetailsSection model={props.model} />
        </TabsContent>

        <TabsContent value='performance' className='outline-none'>
          <ModelDetailsPerformance model={props.model} />
        </TabsContent>

        <TabsContent value='api' className='outline-none'>
          <ModelDetailsApi
            model={props.model}
            endpointMap={props.endpointMap}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}

// ----------------------------------------------------------------------------
// Drawer & page wrappers
// ----------------------------------------------------------------------------

export interface ModelDetailsDrawerProps extends ModelDetailsContentProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ModelDetailsDrawer(props: ModelDetailsDrawerProps) {
  const { t } = useTranslation()
  const { open, onOpenChange, ...contentProps } = props

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side='right'
        className={sideDrawerContentClassName('sm:max-w-xl lg:max-w-2xl')}
      >
        <SheetHeader
          className={sideDrawerHeaderClassName(
            'bg-muted/20 pr-14 sm:px-5 sm:py-4'
          )}
        >
          <SheetTitle className='sr-only'>{props.model.model_name}</SheetTitle>
          <SheetDescription className='sr-only'>
            {t('Model details')}
          </SheetDescription>
          <ModelHeader model={props.model} compact />
        </SheetHeader>
        <div className='min-h-0 flex-1 overflow-y-auto'>
          <div className='px-4 py-4 sm:px-5 sm:py-5'>
            <ModelDetailsContent {...contentProps} hideHeader />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

export function ModelDetails() {
  const { t } = useTranslation()
  const { modelId } = useParams({ from: '/pricing/$modelId/' })
  const search = useSearch({ from: '/pricing/$modelId/' })
  const navigate = useNavigate()

  const {
    models,
    groupRatio,
    usableGroup,
    endpointMap,
    autoGroups,
    isLoading,
    priceRate,
    usdExchangeRate,
  } = usePricingData()

  const tokenUnit: TokenUnit =
    search.tokenUnit === 'K' ? 'K' : DEFAULT_TOKEN_UNIT

  const model = useMemo(() => {
    if (!models || !modelId) return null
    return models.find((m) => m.model_name === modelId) || null
  }, [models, modelId])

  const handleBack = () => {
    navigate({ to: '/pricing', search })
  }

  if (isLoading) {
    return (
      <PublicLayout>
        <div className='mx-auto max-w-5xl px-4 sm:px-6'>
          <Skeleton className='mb-4 h-5 w-16' />
          <div className='space-y-2'>
            <Skeleton className='h-7 w-64' />
            <Skeleton className='h-4 w-40' />
            <Skeleton className='h-4 w-full max-w-md' />
          </div>
          <div className='mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4'>
            {MODEL_DETAILS_SKELETON_KEYS.map((key) => (
              <Skeleton key={`metric-${key}`} className='h-16 w-full' />
            ))}
          </div>
          <div className='mt-6 space-y-3'>
            {MODEL_DETAILS_SKELETON_KEYS.map((key) => (
              <Skeleton key={`section-${key}`} className='h-24 w-full' />
            ))}
          </div>
        </div>
      </PublicLayout>
    )
  }

  if (!model) {
    return (
      <PublicLayout>
        <div className='mx-auto max-w-2xl px-4 text-center sm:px-6'>
          <h2 className='mb-1 text-base font-semibold'>
            {t('Model not found')}
          </h2>
          <p className='text-muted-foreground mb-4 text-sm'>
            {t("The model you're looking for doesn't exist.")}
          </p>
          <Button onClick={handleBack} variant='outline' size='sm'>
            {t('Back to Models')}
          </Button>
        </div>
      </PublicLayout>
    )
  }

  return (
    <PublicLayout>
      <div className='mx-auto max-w-5xl px-4 sm:px-6'>
        <Button
          variant='ghost'
          size='sm'
          onClick={handleBack}
          className='text-muted-foreground hover:text-foreground mb-4 h-auto gap-1 px-0 py-1 text-xs'
        >
          <ArrowLeft className='size-3.5' />
          {t('Back')}
        </Button>

        <ModelDetailsContent
          model={model}
          groupRatio={groupRatio || {}}
          usableGroup={usableGroup || {}}
          autoGroups={autoGroups || []}
          priceRate={priceRate ?? 1}
          usdExchangeRate={usdExchangeRate ?? 1}
          tokenUnit={tokenUnit}
          showRechargePrice={search.rechargePrice ?? false}
          endpointMap={
            (endpointMap as Record<
              string,
              { path?: string; method?: string }
            >) || {}
          }
        />
      </div>
    </PublicLayout>
  )
}
