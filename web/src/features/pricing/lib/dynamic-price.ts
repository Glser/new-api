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
import { formatBillingCurrencyFromUSD } from '@/lib/currency'

import {
  DEFAULT_TOKEN_UNIT,
  QUOTA_TYPE_VALUES,
  TOKEN_UNIT_DIVISORS,
} from '../constants'
import type {
  BillingUsageSchema,
  BillingUsageUnit,
  PricingModel,
  TokenUnit,
} from '../types'
import {
  BILLING_PRICING_VARS,
  getCurrentTimePricingTiers,
  parseTaskTiersFromExpr,
  parseTiersFromExpr,
  splitBillingExprAndRequestRules,
  tryParseRequestRuleExpr,
  type BillingVar,
  type ParsedTaskTier,
  type ParsedTier,
} from './billing-expr'
import { compileBillingExpression } from './billing-expression/parser'
import type {
  CompilationResult,
  ExpressionNode,
} from './billing-expression/types'
import { getDisplayGroupRatio } from './model-helpers'
import { withPluginPricing } from './plugin-pricing'
import {
  evaluateTaskVisualConfig,
  getTaskNumberFields,
  tryParseTaskVisualConfig,
} from './task-expr'

/**
 * Whether an expression is just a flat per-request price.
 *
 * `tier("base", fixed(1))` and a bare `fixed(1)` carry no token or image
 * terms, so they price one call at a constant amount — behaviourally the same
 * as the classic per-request billing the ratio fields describe. Every other
 * shape (`p * 2 + c * 8`, conditions, request multipliers) is genuinely
 * dynamic and must keep the dynamic badge.
 */
export function isFlatPerRequestExpression(
  expression: string | undefined
): boolean {
  const trimmed = expression?.trim()
  if (!trimmed) return false

  let compiled: CompilationResult
  try {
    compiled = compileBillingExpression(trimmed)
  } catch {
    // Unparsable expressions are treated as dynamic rather than per-request:
    // an unreadable config should not be flattened into a simpler badge.
    return false
  }
  if (compiled.status !== 'ready') return false

  // Any variable reference means the price moves with request contents.
  if (compiled.variables.size > 0) return false
  // Request rules reprice specific request shapes.
  if (compiled.requestRules.length > 0) return false

  return isFlatPriceNode(compiled.ast)
}

/**
 * Whether an expression prices by token usage.
 *
 * Two shapes both land here:
 * - `u("tokens") * 1 / 1000000` — a raw usage count
 * - `p * 10 + c * 50` — per-token unit prices (`p` input, `c` output,
 *   `cr` cached read, `cc` cached write, ...)
 *
 * Both scale with how many tokens a request carries, so from the user's side
 * they are the same thing: token-based billing. Only a flat amount per call
 * (`fixed(12)`) or a non-token unit (`u("seconds")`, `u("credits")`) is
 * something else.
 */
export function isTokenBasedExpression(
  expression: string | undefined
): boolean {
  const trimmed = expression?.trim()
  if (!trimmed) return false

  let compiled: CompilationResult
  try {
    compiled = compileBillingExpression(trimmed)
  } catch {
    return false
  }
  if (compiled.status !== 'ready') return false

  return containsTokenPricing(compiled.ast)
}

/** Token-priced variables, plus the `u("tokens")` usage call. */
const TOKEN_PRICING_VARS = new Set(BILLING_PRICING_VARS.map((v) => v.key))

function containsTokenPricing(node: ExpressionNode): boolean {
  switch (node.kind) {
    case 'variable':
      return TOKEN_PRICING_VARS.has(node.name)
    case 'call':
      if (node.name === 'u') {
        return node.args.some(
          (arg) => arg.kind === 'literal' && arg.value === 'tokens'
        )
      }
      return node.args.some((arg) => containsTokenPricing(arg))
    case 'unary':
      return containsTokenPricing(node.operand)
    case 'binary':
      return containsTokenPricing(node.left) || containsTokenPricing(node.right)
    case 'conditional':
      return containsTokenPricing(node.yes) || containsTokenPricing(node.no)
    default:
      return false
  }
}

function isFlatPriceNode(node: ExpressionNode): boolean {
  if (node.kind === 'literal') {
    return typeof node.value === 'number' && node.value >= 0
  }
  if (node.kind === 'call') {
    // `fixed(n)` is flat by definition; `tier(label, fixed(n))` is the same
    // price wrapped in a single named branch.
    if (node.name === 'fixed') {
      return node.args.every((arg) => isFlatPriceNode(arg))
    }
    if (node.name === 'tier') {
      return node.args.some((arg) => isFlatPriceNode(arg))
    }
    return false
  }
  // Arithmetic over flat terms stays flat (e.g. `fixed(1) * 2`).
  if (node.kind === 'unary') return isFlatPriceNode(node.operand)
  if (node.kind === 'binary') {
    return isFlatPriceNode(node.left) && isFlatPriceNode(node.right)
  }
  // Conditions make the price depend on request contents.
  return false
}

export type DynamicPriceOptions = {
  tokenUnit: TokenUnit
  showCurrencySymbol?: boolean
  showRechargePrice?: boolean
  priceRate?: number
  usdExchangeRate?: number
  groupRatioMultiplier?: number
  usageSchema?: BillingUsageSchema
  now?: Date
}

export type DynamicPriceLabelKind = 'i18n' | 'schema'

export type DynamicPriceEntry = {
  key: string
  field: string
  label: string
  shortLabel: string
  /** `schema` labels are raw usage-field names and must not go through `t()`. */
  labelKind: DynamicPriceLabelKind
  value: number
  formatted: string
  formattedRange?: string
  minValue?: number
  maxValue?: number
  unit: 'token' | BillingUsageUnit | 'request' | 'image'
  unitLabel?: string | Record<string, string>
  variable?: BillingVar
  description?: string | Record<string, string>
}

export type CardExamplePrice = {
  label: string
  formatted: string
}

export type DynamicPricingTier = ParsedTier | ParsedTaskTier

export type DynamicPricingSummary = {
  tiers: DynamicPricingTier[]
  tier: DynamicPricingTier | null
  tierCount: number
  hasRequestRules: boolean
  isSpecialExpression: boolean
  rawExpression: string
  entries: DynamicPriceEntry[]
  primaryEntries: DynamicPriceEntry[]
  secondaryEntries: DynamicPriceEntry[]
  isTaskUsage: boolean
  isTimePricing?: boolean
  isMixedBilling?: boolean
  providerCount?: number
  hasUnconfiguredProviders?: boolean
}

export function getTaskUsageQuantityUnitLabelKey(
  unit: BillingUsageUnit | undefined
): string {
  if (unit === 'second') return 's'
  if (unit === 'token') return 'token (unit)'
  if (unit === 'credit') return 'credit'
  return 'unit'
}

export function getTaskUsagePriceUnitLabelKey(
  unit: BillingUsageUnit | undefined
): string {
  if (unit === 'second') return 'second'
  if (unit === 'token') return '1M token'
  if (unit === 'credit') return 'credit'
  return 'unit'
}

export function getDynamicPriceUnitLabelKey(
  entry: DynamicPriceEntry
): string | null {
  if (entry.unit === 'second') return 's'
  if (entry.unit === 'count') return 'unit'
  if (entry.unit === 'credit') return 'credit'
  // Chat token entries also use unit 'token' but keep the 1M-token label.
  if (entry.unit === 'token' && !entry.variable) return '1M token'
  if (entry.unit === 'request') return 'request'
  if (entry.unit === 'image') return 'image'
  return null
}

const PRIMARY_DYNAMIC_FIELDS = new Set(['inputPrice', 'outputPrice'])

function isTaskPricingTier(tier: DynamicPricingTier): tier is ParsedTaskTier {
  return (
    Object.hasOwn(tier, 'unitPrices') &&
    typeof (tier as ParsedTaskTier).unitPrices === 'object'
  )
}

export function isDynamicPricingModel(model: PricingModel): boolean {
  if (model.billing_plugin_variants?.length) {
    return model.billing_plugin_variants.some(
      (variant) =>
        variant.billing_mode !== 'ratio' && Boolean(variant.billing_expr)
    )
  }
  return model.billing_mode === 'tiered_expr' && Boolean(model.billing_expr)
}

export function hasTaskUsageSchema(model: PricingModel): boolean {
  return Object.keys(model.billing_usage_schema ?? {}).length > 0
}

export function isTaskUsagePricingModel(model: PricingModel): boolean {
  return model.billing_mode === 'tiered_expr' && hasTaskUsageSchema(model)
}

export function isUnconfiguredTaskUsageModel(model: PricingModel): boolean {
  if (model.billing_plugin_variants?.length) {
    return model.billing_plugin_variants.every((variant) =>
      variant.billing_mode === 'ratio'
        ? isUnconfiguredTaskUsageModel(withPluginPricing(model, variant))
        : !variant.billing_expr
    )
  }
  return (
    model.quota_type !== 1 &&
    hasTaskUsageSchema(model) &&
    !isDynamicPricingModel(model)
  )
}

export function getTaskPricingUnit(
  model: PricingModel
): BillingUsageUnit | null {
  const primaryField = getTaskNumberFields(model.billing_usage_schema)[0]
  return primaryField?.[1].unit ?? null
}

export function getDynamicDisplayGroupRatio(
  model: PricingModel,
  selectedGroup?: string
): number {
  return getDisplayGroupRatio(model, selectedGroup)
}

function applyRechargeRate(
  price: number,
  showWithRecharge: boolean,
  priceRate: number,
  usdExchangeRate: number
): number {
  if (!showWithRecharge) return price
  return (price * priceRate) / usdExchangeRate
}

export function formatDynamicUnitPrice(
  valuePerMillionTokens: number,
  options: DynamicPriceOptions
): string {
  const groupRatio = options.groupRatioMultiplier ?? 1
  const priceRate = options.priceRate ?? 1
  const usdExchangeRate = options.usdExchangeRate ?? 1
  const priceUSD =
    (valuePerMillionTokens * groupRatio) /
    TOKEN_UNIT_DIVISORS[options.tokenUnit]
  const displayPrice = applyRechargeRate(
    priceUSD,
    options.showRechargePrice ?? false,
    priceRate,
    usdExchangeRate
  )

  return formatBillingCurrencyFromUSD(displayPrice, {
    showSymbol: options.showCurrencySymbol ?? true,
    digitsLarge: 4,
    digitsSmall: 6,
    abbreviate: false,
  })
}

export function formatTaskUsageUnitPrice(
  valuePerUnit: number,
  options: DynamicPriceOptions
): string {
  const groupRatio = options.groupRatioMultiplier ?? 1
  const priceRate = options.priceRate ?? 1
  const usdExchangeRate = options.usdExchangeRate ?? 1
  const priceUSD = valuePerUnit * groupRatio
  const displayPrice = applyRechargeRate(
    priceUSD,
    options.showRechargePrice ?? false,
    priceRate,
    usdExchangeRate
  )

  return formatBillingCurrencyFromUSD(displayPrice, {
    showSymbol: options.showCurrencySymbol ?? true,
    digitsLarge: 4,
    digitsSmall: 6,
    abbreviate: false,
  })
}

export function getDynamicPricingTiers(
  model: PricingModel
): DynamicPricingTier[] {
  if (model.billing_plugin_variants?.length) {
    return model.billing_plugin_variants.flatMap((variant) =>
      getDynamicPricingTiers(withPluginPricing(model, variant))
    )
  }
  if (!isDynamicPricingModel(model)) return []
  const { billingExpr } = splitBillingExprAndRequestRules(
    model.billing_expr || ''
  )
  if (isTaskUsagePricingModel(model)) {
    return parseTaskTiersFromExpr(billingExpr, model.billing_usage_schema, true)
  }
  return parseTiersFromExpr(billingExpr)
}

export function hasDynamicRequestRules(model: PricingModel): boolean {
  if (model.billing_plugin_variants?.length) {
    return model.billing_plugin_variants.some((variant) =>
      hasDynamicRequestRules(withPluginPricing(model, variant))
    )
  }
  if (!isDynamicPricingModel(model)) return false
  const { requestRuleExpr } = splitBillingExprAndRequestRules(
    model.billing_expr || ''
  )
  if (tryParseRequestRuleExpr(requestRuleExpr || '')?.length) return true
  const compiled = compileBillingExpression(model.billing_expr || '')
  return compiled.status === 'ready' && compiled.requestRules.length > 0
}

export function getDynamicPriceEntries(
  tier: DynamicPricingTier | null,
  options: DynamicPriceOptions
): DynamicPriceEntry[] {
  if (!tier) return []
  if (
    !isTaskPricingTier(tier) &&
    tier.billingUnit === 'request' &&
    typeof tier.fixedPrice === 'number'
  ) {
    return [
      {
        key: 'fixed',
        field: 'fixedPrice',
        label: tier.imageCount ? 'Price per image' : 'Price per request',
        shortLabel: tier.imageCount ? 'Per image' : 'Per-call',
        labelKind: 'i18n',
        value: tier.fixedPrice,
        formatted: formatTaskUsageUnitPrice(tier.fixedPrice, options),
        unit: tier.imageCount ? 'image' : 'request',
      },
    ]
  }

  if (isTaskPricingTier(tier) && options.usageSchema) {
    const usageEntries: DynamicPriceEntry[] = getTaskNumberFields(
      options.usageSchema
    ).flatMap(([field, definition]) => {
      const value = Number(tier.unitPrices[field])
      if (!Number.isFinite(value) || value < 0 || !definition.unit) return []
      return [
        {
          key: field,
          field,
          label: field,
          shortLabel: field,
          labelKind: 'schema',
          value,
          formatted: formatTaskUsageUnitPrice(value, options),
          unit: definition.unit,
          unitLabel: definition.unitLabel,
          description: definition.description,
        } satisfies DynamicPriceEntry,
      ]
    })
    if (tier.constant > 0) {
      usageEntries.push({
        key: 'constant',
        field: 'constant',
        label: 'Additional charge',
        shortLabel: 'Additional charge',
        labelKind: 'i18n',
        value: tier.constant,
        formatted: formatTaskUsageUnitPrice(tier.constant, options),
        unit: 'request',
      })
    }
    return usageEntries
  }

  return BILLING_PRICING_VARS.flatMap((variable) => {
    if (!variable.field) return []
    const value = Number((tier as ParsedTier)[variable.field])
    if (!Number.isFinite(value) || value < 0) return []
    // Same-price reads can stay in the expression to preserve accounting for
    // overlapping usage. They do not need a separate displayed price. Keep
    // explicit zero prices visible, even when the input itself is free.
    if (
      variable.key === 'cr' &&
      value !== 0 &&
      value === (tier as ParsedTier).inputPrice
    ) {
      return []
    }

    return [
      {
        key: variable.key,
        field: variable.field,
        label:
          variable.key === 'cc' &&
          typeof (tier as ParsedTier).cacheCreate1hPrice === 'number'
            ? 'Cache Creation (5m)'
            : variable.label,
        shortLabel:
          variable.key === 'cc' &&
          typeof (tier as ParsedTier).cacheCreate1hPrice === 'number'
            ? 'Cache Write (5m)'
            : variable.shortLabel,
        labelKind: 'i18n' as const,
        value,
        formatted: formatDynamicUnitPrice(value, options),
        unit: 'token' as const,
        variable,
      },
    ]
  }).sort((a, b) => {
    const aPrimary = PRIMARY_DYNAMIC_FIELDS.has(a.field)
    const bPrimary = PRIMARY_DYNAMIC_FIELDS.has(b.field)
    if (aPrimary !== bPrimary) return aPrimary ? -1 : 1
    return 0
  })
}

export function getDynamicPricingSummary(
  model: PricingModel,
  options: DynamicPriceOptions
): DynamicPricingSummary | null {
  const variants = model.billing_plugin_variants
  if (variants?.length) {
    const summaries = variants.flatMap((variant) => {
      const summary = getDynamicPricingSummary(
        withPluginPricing(model, variant),
        options
      )
      return summary ? [summary] : []
    })
    const perCallEntries: DynamicPriceEntry[] = []
    if (
      model.quota_type === 1 &&
      typeof model.model_price === 'number' &&
      variants.some((variant) => variant.billing_mode === 'ratio')
    ) {
      perCallEntries.push({
        key: 'modelPrice',
        field: 'modelPrice',
        label: 'Price per request',
        shortLabel: 'Per-call',
        labelKind: 'i18n',
        value: model.model_price,
        formatted: formatTaskUsageUnitPrice(model.model_price, options),
        unit: 'request',
      })
    }
    const ranges = new Map<
      string,
      { entry: DynamicPriceEntry; min: number; max: number }
    >()
    for (const providerEntries of [
      ...summaries.map((summary) => summary.entries),
      perCallEntries,
    ]) {
      for (const entry of providerEntries) {
        // Identical field names with different units describe different prices.
        const key = `${entry.field}:${entry.unit}`
        const range = ranges.get(key)
        const merged = range?.entry ?? { ...entry, key }
        if (
          !merged.unitLabel ||
          (typeof merged.unitLabel === 'object' &&
            Object.keys(merged.unitLabel).length === 0)
        ) {
          merged.unitLabel = entry.unitLabel
        }
        ranges.set(key, {
          entry: merged,
          min: Math.min(range?.min ?? Infinity, entry.minValue ?? entry.value),
          max: Math.max(range?.max ?? -Infinity, entry.maxValue ?? entry.value),
        })
      }
    }
    const entries = [...ranges.values()].map(({ entry, min, max }) => ({
      ...entry,
      value: min,
      minValue: min,
      maxValue: max,
      formatted: formatTaskUsageUnitPrice(min, options),
      formattedRange:
        min === max
          ? undefined
          : `${formatTaskUsageUnitPrice(min, options)} – ${formatTaskUsageUnitPrice(max, options)}`,
    }))
    const primaryKeys = new Set(
      summaries.flatMap((summary) =>
        summary.primaryEntries
          .slice(0, 1)
          .map((entry) => `${entry.field}:${entry.unit}`)
      )
    )
    const primary = entries.filter(
      (entry) =>
        (entry.unit !== 'request' && entry.unit !== 'image') ||
        entry.field === 'modelPrice'
    )
    primary.sort(
      (a, b) => Number(primaryKeys.has(b.key)) - Number(primaryKeys.has(a.key))
    )
    const tiers = summaries.flatMap((summary) => summary.tiers)
    return {
      tiers,
      tier: summaries[0]?.tier ?? null,
      tierCount: tiers.length,
      hasRequestRules: summaries.some((summary) => summary.hasRequestRules),
      isSpecialExpression:
        perCallEntries.length === 0 &&
        summaries.length > 0 &&
        summaries.every((summary) => summary.isSpecialExpression),
      rawExpression: summaries[0]?.rawExpression ?? '',
      entries,
      primaryEntries: primary,
      secondaryEntries: entries.filter(
        (entry) =>
          (entry.unit === 'request' || entry.unit === 'image') &&
          entry.field !== 'modelPrice'
      ),
      isTaskUsage: true,
      providerCount: variants.length >= 2 ? variants.length : undefined,
      hasUnconfiguredProviders: variants.some((variant) =>
        variant.billing_mode === 'ratio'
          ? isUnconfiguredTaskUsageModel(withPluginPricing(model, variant))
          : !variant.billing_expr
      ),
    }
  }
  if (!isDynamicPricingModel(model)) return null

  const tiers = getDynamicPricingTiers(model)
  const isTaskUsage = isTaskUsagePricingModel(model)
  const baseExpression = splitBillingExprAndRequestRules(
    model.billing_expr || ''
  ).billingExpr
  const timeTiers = isTaskUsage
    ? null
    : getCurrentTimePricingTiers(baseExpression, options.now ?? new Date())
  const summaryTiers = timeTiers ?? tiers
  const tier = isTaskUsage
    ? (summaryTiers.at(-1) ?? null)
    : (summaryTiers[0] ?? null)
  let entries = getDynamicPriceEntries(tier, {
    ...options,
    usageSchema: model.billing_usage_schema,
  })
  let isMixedBilling = false
  if (!isTaskUsage) {
    const tokenTier = summaryTiers.find(
      (item) => !isTaskPricingTier(item) && item.billingUnit !== 'request'
    )
    const requestTier = summaryTiers.find(
      (item) => !isTaskPricingTier(item) && item.billingUnit === 'request'
    )
    if (tokenTier && requestTier) {
      isMixedBilling = true
      entries = [
        ...getDynamicPriceEntries(tokenTier, options),
        ...getDynamicPriceEntries(requestTier, options),
      ]
    }
  }
  if (isTaskUsage) {
    const priceRanges = new Map<string, { min: number; max: number }>()
    for (const [field] of getTaskNumberFields(model.billing_usage_schema)) {
      let min = Number.POSITIVE_INFINITY
      let max = Number.NEGATIVE_INFINITY
      for (const taskTier of tiers) {
        if (!isTaskPricingTier(taskTier)) continue
        const value = Number(taskTier.unitPrices[field])
        if (!Number.isFinite(value) || value < 0) continue
        min = Math.min(min, value)
        max = Math.max(max, value)
      }
      if (Number.isFinite(min) && Number.isFinite(max)) {
        priceRanges.set(field, { min, max })
      }
    }
    entries = entries.map((entry) => {
      const range = priceRanges.get(entry.field)
      if (!range) return entry
      return {
        ...entry,
        minValue: range.min,
        maxValue: range.max,
        formattedRange:
          range.min === range.max
            ? undefined
            : `${formatTaskUsageUnitPrice(range.min, options)} – ${formatTaskUsageUnitPrice(range.max, options)}`,
      }
    })
  }
  const rawExpression = model.billing_expr || ''

  return {
    tiers,
    tier,
    tierCount: tiers.length,
    hasRequestRules: hasDynamicRequestRules(model),
    isSpecialExpression: rawExpression.trim().length > 0 && tiers.length === 0,
    rawExpression,
    entries,
    primaryEntries: isTaskUsage
      ? entries.filter(
          (entry) => entry.unit !== 'request' && entry.unit !== 'image'
        )
      : entries.filter(
          (entry) =>
            entry.unit === 'request' ||
            entry.unit === 'image' ||
            PRIMARY_DYNAMIC_FIELDS.has(entry.field)
        ),
    secondaryEntries: isTaskUsage
      ? entries.filter(
          (entry) => entry.unit === 'request' || entry.unit === 'image'
        )
      : entries.filter(
          (entry) =>
            entry.unit !== 'request' &&
            entry.unit !== 'image' &&
            !PRIMARY_DYNAMIC_FIELDS.has(entry.field)
        ),
    isTaskUsage,
    isTimePricing: timeTiers !== null,
    ...(isMixedBilling ? { isMixedBilling } : {}),
  }
}

export function getCardExamplePrice(
  model: PricingModel,
  options: DynamicPriceOptions
): CardExamplePrice | null {
  if (model.billing_plugin_variants?.length) {
    const variant = model.billing_plugin_variants.find(
      (provider) => provider.billing_expr
    )
    return variant
      ? getCardExamplePrice(withPluginPricing(model, variant), options)
      : null
  }
  if (!isTaskUsagePricingModel(model)) return null
  const schema = model.billing_usage_schema
  const firstExample = model.billing_usage_examples?.[0]
  if (!schema || !firstExample) return null

  const { billingExpr } = splitBillingExprAndRequestRules(
    model.billing_expr || ''
  )
  const config = tryParseTaskVisualConfig(billingExpr, schema)
  if (!config) return null

  const result = evaluateTaskVisualConfig(config, firstExample.facts, schema)
  if (!result) return null

  return {
    label: firstExample.label,
    formatted: formatTaskUsageUnitPrice(result.total, options),
  }
}

export type ModelTokenPrices = {
  /** USD price per 1M tokens at the lowest group ratio, or null when absent. */
  inputUSD: number | null
  outputUSD: number | null
  /** USD price per 1M tokens before any group discount (ratio 1.0). */
  officialInputUSD: number | null
  officialOutputUSD: number | null
  isDynamic: boolean
  hasTokenPrices: boolean
}

export type ModelTokenPricesOptions = {
  tokenUnit?: TokenUnit
  usdExchangeRate?: number
  /**
   * Group ratios keyed by group name. The backend only sends the top-level
   * `group_ratio` map, so consumers pass it here instead of relying on a
   * per-model field the API never populates.
   */
  groupRatio?: Record<string, number>
  now?: Date
}

/**
 * Resolve a model's per-1M-token prices in USD.
 *
 * `officialInputUSD` / `officialOutputUSD` are the undiscounted list prices at
 * group ratio 1.0. `inputUSD` / `outputUSD` apply the lowest group ratio the
 * model is enabled for, which is what a viewer would actually be charged.
 *
 * Dynamic (expression-driven) models read the first tier's base input/output
 * price, matching the model square's card view. Ratio models keep the
 * `model_ratio * 2` derivation. Models billed per request or per task expose no
 * token price and report `hasTokenPrices: false` so callers can degrade instead
 * of inventing a number.
 */
export function getModelTokenPrices(
  model: PricingModel,
  options: ModelTokenPricesOptions = {}
): ModelTokenPrices {
  const tokenUnit = options.tokenUnit ?? DEFAULT_TOKEN_UNIT
  const groupRatioMultiplier = resolveGroupRatioMultiplier(
    model,
    options.groupRatio
  )

  if (isDynamicPricingModel(model)) {
    const summary = getDynamicPricingSummary(model, {
      tokenUnit,
      usdExchangeRate: options.usdExchangeRate,
      groupRatioMultiplier,
      now: options.now,
    })

    if (!summary || summary.isSpecialExpression) {
      return {
        inputUSD: null,
        outputUSD: null,
        officialInputUSD: null,
        officialOutputUSD: null,
        isDynamic: true,
        hasTokenPrices: false,
      }
    }

    const entries = summary.isTaskUsage
      ? summary.entries
      : summary.primaryEntries
    const inputEntry = entries.find((entry) => entry.field === 'inputPrice')
    const outputEntry = entries.find((entry) => entry.field === 'outputPrice')
    // `entry.value` is the raw expression price: the group ratio is only applied
    // when the entry is formatted, so it has to be applied here explicitly.
    const officialInputUSD = readTokenPrice(inputEntry)
    const officialOutputUSD = readTokenPrice(outputEntry)
    const inputUSD =
      officialInputUSD === null ? null : officialInputUSD * groupRatioMultiplier
    const outputUSD =
      officialOutputUSD === null
        ? null
        : officialOutputUSD * groupRatioMultiplier

    return {
      inputUSD,
      outputUSD,
      officialInputUSD,
      officialOutputUSD,
      isDynamic: true,
      hasTokenPrices: inputUSD !== null || outputUSD !== null,
    }
  }

  // Per-request and task-usage models never expose a per-token price.
  if (model.quota_type === QUOTA_TYPE_VALUES.REQUEST) {
    return {
      inputUSD: null,
      outputUSD: null,
      officialInputUSD: null,
      officialOutputUSD: null,
      isDynamic: false,
      hasTokenPrices: false,
    }
  }

  const ratio = Number(model.model_ratio)
  if (!Number.isFinite(ratio) || ratio <= 0) {
    return {
      inputUSD: null,
      outputUSD: null,
      officialInputUSD: null,
      officialOutputUSD: null,
      isDynamic: false,
      hasTokenPrices: false,
    }
  }

  const officialInputUSD = ratio * 2
  const completionRatio = Number(model.completion_ratio)
  const officialOutputUSD =
    officialInputUSD * (Number.isFinite(completionRatio) ? completionRatio : 1)

  return {
    inputUSD: officialInputUSD * groupRatioMultiplier,
    outputUSD: officialOutputUSD * groupRatioMultiplier,
    officialInputUSD,
    officialOutputUSD,
    isDynamic: false,
    hasTokenPrices: true,
  }
}

function readTokenPrice(entry: DynamicPriceEntry | undefined): number | null {
  if (!entry) return null
  const value = Number(entry.value)
  return Number.isFinite(value) && value >= 0 ? value : null
}

/**
 * Lowest group ratio across the model's enabled groups, defaulting to 1.
 * Mirrors `getDisplayGroupRatio` without a selected group, but reads ratios from
 * the caller-supplied map because the pricing API has no per-model ratios.
 */
function resolveGroupRatioMultiplier(
  model: PricingModel,
  groupRatio?: Record<string, number>
): number {
  const enableGroups = Array.isArray(model.enable_groups)
    ? model.enable_groups
    : []
  const ratios = groupRatio ?? {}

  let minRatio = Number.POSITIVE_INFINITY
  for (const group of enableGroups) {
    const ratio = ratios[group]
    if (
      typeof ratio === 'number' &&
      Number.isFinite(ratio) &&
      ratio < minRatio
    ) {
      minRatio = ratio
    }
  }

  return minRatio === Number.POSITIVE_INFINITY ? 1 : minRatio
}
