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
import {
  getDynamicPricingSummary,
  isUnconfiguredTaskUsageModel,
  type DynamicPriceEntry,
} from '@/features/pricing/lib/dynamic-price'
import { isTokenBasedModel } from '@/features/pricing/lib/model-helpers'
import { calculateTokenPrice } from '@/features/pricing/lib/price'
import type { PricingModel } from '@/features/pricing/types'
import {
  HIT_PRICE_LABELS,
  type HitPriceDisplayPart,
  type HitPriceKind,
  type HitPricePart,
} from '@/features/usage-logs/lib/hit-pricing'

const TOKEN_FIELD_KIND: Record<string, HitPriceKind> = {
  inputPrice: 'input',
  outputPrice: 'output',
  cacheReadPrice: 'cacheRead',
  cacheCreatePrice: 'cacheWrite',
  cacheCreate1hPrice: 'cacheWrite',
}

const CACHE_FIELDS = new Set([
  'cacheReadPrice',
  'cacheCreatePrice',
  'cacheCreate1hPrice',
])

export type ModelHitPriceEmptyStatus =
  | 'unset'
  | 'not-configured'
  | 'special'
  | 'dynamic-empty'

export type ModelHitPriceResult =
  | { status: ModelHitPriceEmptyStatus }
  | {
      status: 'ready'
      parts: HitPricePart[]
      displayParts: HitPriceDisplayPart[]
      perCall: boolean
    }

export type ModelHitPriceOptions = {
  now?: Date
}

function finitePrice(value: number): number | null {
  if (!Number.isFinite(value) || value < 0) return null
  return value
}

function partsFromEntries(entries: DynamicPriceEntry[]): HitPricePart[] {
  const parts: HitPricePart[] = []
  const seen = new Set<HitPriceKind>()
  for (const entry of entries) {
    const kind = TOKEN_FIELD_KIND[entry.field]
    if (!kind || seen.has(kind)) continue
    const price = finitePrice(entry.value)
    if (price == null) continue
    seen.add(kind)
    parts.push({ kind, price })
  }
  return parts
}

function displayPartFromEntry(
  entry: DynamicPriceEntry
): HitPriceDisplayPart | null {
  const price = finitePrice(entry.value)
  if (price == null) return null
  const minPrice = finitePrice(entry.minValue ?? entry.value)
  const maxPrice = finitePrice(entry.maxValue ?? entry.value)
  const part: HitPriceDisplayPart = {
    key: entry.key,
    labelKey: entry.shortLabel,
    price,
    rawLabel: entry.labelKind === 'schema',
  }
  if (minPrice != null && maxPrice != null && minPrice !== maxPrice) {
    part.minPrice = minPrice
    part.maxPrice = maxPrice
  }
  return part
}

function dynamicDisplayEntries(
  primary: DynamicPriceEntry[],
  secondary: DynamicPriceEntry[],
  isTaskUsage: boolean
): DynamicPriceEntry[] {
  if (isTaskUsage) return primary
  const extra = secondary.filter((entry) => CACHE_FIELDS.has(entry.field))
  if (extra.length === 0) return primary
  return [...primary, ...extra]
}

function tokenDisplayParts(model: PricingModel): {
  parts: HitPricePart[]
  displayParts: HitPriceDisplayPart[]
} | null {
  const input = finitePrice(calculateTokenPrice(model, 'input', 1))
  if (input == null) return null
  const parts: HitPricePart[] = [{ kind: 'input', price: input }]
  const displayParts: HitPriceDisplayPart[] = [
    { key: 'input', labelKey: HIT_PRICE_LABELS.input, price: input },
  ]
  const output = finitePrice(calculateTokenPrice(model, 'output', 1))
  if (output != null) {
    parts.push({ kind: 'output', price: output })
    displayParts.push({
      key: 'output',
      labelKey: HIT_PRICE_LABELS.output,
      price: output,
    })
  }
  const cacheRead = finitePrice(calculateTokenPrice(model, 'cache', 1))
  if (cacheRead != null) {
    parts.push({ kind: 'cacheRead', price: cacheRead })
    displayParts.push({
      key: 'cacheRead',
      labelKey: HIT_PRICE_LABELS.cacheRead,
      price: cacheRead,
    })
  }
  const cacheWrite = finitePrice(calculateTokenPrice(model, 'create_cache', 1))
  if (cacheWrite != null) {
    parts.push({ kind: 'cacheWrite', price: cacheWrite })
    displayParts.push({
      key: 'cacheWrite',
      labelKey: HIT_PRICE_LABELS.cacheWrite,
      price: cacheWrite,
    })
  }
  return { parts, displayParts }
}

export function getModelHitPriceParts(
  model: PricingModel,
  options: ModelHitPriceOptions = {}
): ModelHitPriceResult {
  const dynamic = getDynamicPricingSummary(model, {
    tokenUnit: 'M',
    now: options.now,
  })
  if (dynamic) {
    if (dynamic.isSpecialExpression) return { status: 'special' }
    const entries = dynamicDisplayEntries(
      dynamic.primaryEntries,
      dynamic.secondaryEntries,
      dynamic.isTaskUsage
    )
    const displayParts = entries.flatMap((entry) => {
      const part = displayPartFromEntry(entry)
      return part ? [part] : []
    })
    if (displayParts.length === 0) {
      if (dynamic.hasUnconfiguredProviders) return { status: 'not-configured' }
      return { status: 'dynamic-empty' }
    }
    return {
      status: 'ready',
      parts: partsFromEntries(entries),
      displayParts,
      perCall: !entries.some((entry) => entry.unit === 'token'),
    }
  }

  if (isUnconfiguredTaskUsageModel(model)) return { status: 'not-configured' }

  if (!isTokenBasedModel(model)) {
    const price = finitePrice(Number(model.model_price))
    if (price == null) return { status: 'unset' }
    return {
      status: 'ready',
      parts: [{ kind: 'input', price }],
      displayParts: [{ key: 'perCall', labelKey: 'Per-call', price }],
      perCall: true,
    }
  }

  const tokenPrices = tokenDisplayParts(model)
  if (!tokenPrices) return { status: 'unset' }
  return {
    status: 'ready',
    parts: tokenPrices.parts,
    displayParts: tokenPrices.displayParts,
    perCall: false,
  }
}
