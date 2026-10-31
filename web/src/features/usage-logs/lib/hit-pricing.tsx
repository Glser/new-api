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
/* eslint-disable react-refresh/only-export-components -- hit-price helpers ship with the UI */
import { useTranslation } from 'react-i18next'

import { formatBillingCurrencyFromUSD } from '@/lib/currency'
import { formatLogQuota } from '@/lib/format'
import { cn } from '@/lib/utils'

import type { LogOtherData } from '../types'
import { getTieredBillingSummary } from './format'
import { isPerCallBilling } from './utils'

const PRICE_FORMAT_OPTS = {
  digitsLarge: 12,
  digitsSmall: 12,
  abbreviate: false,
} as const

export type HitPriceKind = 'input' | 'output' | 'cacheRead' | 'cacheWrite'

export type HitPricePart = {
  kind: HitPriceKind
  price: number
}

export type HitPriceDisplayPart = {
  key: string
  labelKey: string
  price: number
  minPrice?: number
  maxPrice?: number
  /** When true, `labelKey` is shown as-is instead of being passed through `t()`. */
  rawLabel?: boolean
}

export function formatUsdAmount(price: number): string {
  return formatBillingCurrencyFromUSD(price, PRICE_FORMAT_OPTS)
}

export function formatHitPriceAmount(
  part: HitPriceDisplayPart,
  ratio: number
): string {
  if (
    part.minPrice != null &&
    part.maxPrice != null &&
    part.minPrice !== part.maxPrice
  ) {
    return `${formatUsdAmount(part.minPrice * ratio)} – ${formatUsdAmount(part.maxPrice * ratio)}`
  }
  return formatUsdAmount(part.price * ratio)
}

export function getHitPriceRatio(other: LogOtherData | null): number {
  const userGroupRatio = other?.user_group_ratio
  if (
    userGroupRatio != null &&
    userGroupRatio !== -1 &&
    Number.isFinite(userGroupRatio)
  ) {
    return userGroupRatio
  }
  if (other?.group_ratio != null && Number.isFinite(other.group_ratio)) {
    return other.group_ratio
  }
  return 1
}

export const HIT_PRICE_LABELS: Record<HitPriceKind, string> = {
  input: 'Input',
  output: 'Output',
  cacheRead: 'Cache Read',
  cacheWrite: 'Cache Write',
}

export function getOfficialUsdParts(other: LogOtherData | null): {
  parts: HitPricePart[]
  perCall: boolean
  displayParts?: HitPriceDisplayPart[]
} | null {
  if (!other) return null
  const summary = getTieredBillingSummary(other, { includeUnusedPrices: true })
  if (summary) {
    const displayParts = summary.priceEntries.map((entry) => ({
      key: entry.field,
      labelKey: entry.shortLabel,
      price: entry.price,
    }))
    const fixed = summary.priceEntries.find(
      (entry) => entry.field === 'fixedPrice'
    )
    if (fixed) {
      return {
        parts: [{ kind: 'input', price: fixed.price }],
        perCall: true,
        displayParts,
      }
    }
    const fieldMap: Record<string, HitPriceKind> = {
      inputPrice: 'input',
      outputPrice: 'output',
      cacheReadPrice: 'cacheRead',
      cacheCreatePrice: 'cacheWrite',
      cacheCreate1hPrice: 'cacheWrite',
    }
    const parts: HitPricePart[] = []
    const seen = new Set<HitPriceKind>()
    for (const entry of summary.priceEntries) {
      const kind = fieldMap[entry.field]
      if (!kind || seen.has(kind)) continue
      seen.add(kind)
      parts.push({ kind, price: entry.price })
    }
    if (displayParts.length > 0) return { parts, perCall: false, displayParts }
  }
  if (isPerCallBilling(other.model_price) && other.model_price != null) {
    return {
      parts: [{ kind: 'input', price: other.model_price }],
      perCall: true,
    }
  }
  if (other.model_ratio != null && Number.isFinite(other.model_ratio)) {
    const inputPrice = other.model_ratio * 2
    const parts: HitPricePart[] = [{ kind: 'input', price: inputPrice }]
    if (
      other.completion_ratio != null &&
      Number.isFinite(other.completion_ratio)
    ) {
      parts.push({ kind: 'output', price: inputPrice * other.completion_ratio })
    }
    if (other.cache_ratio != null && Number.isFinite(other.cache_ratio)) {
      parts.push({ kind: 'cacheRead', price: inputPrice * other.cache_ratio })
    }
    let cacheWriteRatio: number | null = null
    if (
      other.cache_creation_ratio != null &&
      Number.isFinite(other.cache_creation_ratio)
    ) {
      cacheWriteRatio = other.cache_creation_ratio
    } else if (
      other.cache_creation_ratio_1h != null &&
      Number.isFinite(other.cache_creation_ratio_1h)
    ) {
      cacheWriteRatio = other.cache_creation_ratio_1h
    }
    if (cacheWriteRatio != null) {
      parts.push({ kind: 'cacheWrite', price: inputPrice * cacheWriteRatio })
    }
    const displayParts: HitPriceDisplayPart[] = parts
      .filter((part) => part.kind !== 'cacheWrite')
      .map((part) => ({
        key: part.kind,
        labelKey: HIT_PRICE_LABELS[part.kind],
        price: part.price,
      }))
    const cacheWritePrices = [
      {
        key: 'cacheWrite',
        labelKey: 'Cache Write',
        ratio: other.cache_creation_ratio_5m ?? other.cache_creation_ratio,
      },
      {
        key: 'cacheWrite1h',
        labelKey: 'Cache Write (1h)',
        ratio: other.cache_creation_ratio_1h,
      },
    ]
    for (const entry of cacheWritePrices) {
      if (entry.ratio == null || !Number.isFinite(entry.ratio)) continue
      displayParts.push({
        key: entry.key,
        labelKey: entry.labelKey,
        price: inputPrice * entry.ratio,
      })
    }
    return { parts, perCall: false, displayParts }
  }
  return null
}

export function CostFormula(props: {
  parts: HitPricePart[]
  perCall: boolean
  ratio: number | null
  quota: number
  tokens: Record<HitPriceKind, number>
}) {
  const { t } = useTranslation()
  const ratio = props.ratio
  if (ratio == null) {
    return <span className='text-muted-foreground'>-</span>
  }

  if (props.perCall) {
    const price = props.parts[0]?.price
    if (price == null) return <span className='text-muted-foreground'>-</span>
    const expr = formatUsdAmount(price * ratio)
    return (
      <span className='block text-xs leading-snug tabular-nums'>
        {expr} = {formatLogQuota(props.quota)}
      </span>
    )
  }

  const terms = props.parts.flatMap((part) => {
    const count = props.tokens[part.kind] ?? 0
    if (count <= 0) return []
    return [
      `${t(HIT_PRICE_LABELS[part.kind])} ${count.toLocaleString()}×${formatUsdAmount(part.price * ratio)}`,
    ]
  })
  if (terms.length === 0) {
    return <span className='text-muted-foreground'>-</span>
  }
  const sum = terms.join(' + ')
  const grouped = terms.length > 1 ? `(${sum})` : sum
  const expr = `${grouped} ÷ 1M`
  return (
    <span className='block text-xs leading-snug break-words tabular-nums'>
      {expr} = {formatLogQuota(props.quota)}
    </span>
  )
}

export function HitPriceConfig(props: {
  parts: HitPricePart[]
  displayParts?: HitPriceDisplayPart[]
  perCall: boolean
  ratio: number | null
  className?: string
}) {
  const { t } = useTranslation()
  const ratio = props.ratio
  if (ratio == null) {
    return <span className='text-muted-foreground'>-</span>
  }

  const prices =
    props.displayParts ??
    props.parts.map(
      (part): HitPriceDisplayPart => ({
        key: part.kind,
        labelKey: HIT_PRICE_LABELS[part.kind],
        price: part.price,
      })
    )

  return (
    <span
      className={cn(
        'inline-flex items-center gap-x-2 whitespace-nowrap',
        props.className
      )}
    >
      {prices.map((part) => (
        <span key={part.key} className='tabular-nums'>
          {part.rawLabel ? part.labelKey : t(part.labelKey)}{' '}
          {formatHitPriceAmount(part, ratio)}
        </span>
      ))}
      {props.perCall || prices.length === 0 ? null : (
        <span className='text-muted-foreground'>/M</span>
      )}
    </span>
  )
}
