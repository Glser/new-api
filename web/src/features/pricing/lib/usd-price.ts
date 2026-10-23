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
import { TOKEN_UNIT_DIVISORS } from '../constants'
import type { PricingModel, TokenUnit } from '../types'
import { getDynamicPricingSummary, getModelTokenPrices } from './dynamic-price'

/** Smallest discount worth badging; avoids "-0%" from float drift. */
const MIN_DISCOUNT_PERCENT = 1

export type UsdPriceComparison = {
  /** Official (list) input price in USD, before any group multiplier. */
  officialInputUSD: number | null
  /** Official (list) output price in USD, before any group multiplier. */
  officialOutputUSD: number | null
  /** Official per-request price in USD, when the model has no token prices. */
  officialRequestUSD: number | null
  /** Site input price in USD after the viewer's group multiplier. */
  siteInputUSD: number | null
  /** Site output price in USD after the viewer's group multiplier. */
  siteOutputUSD: number | null
  /** Site per-request price in USD after the viewer's group multiplier. */
  siteRequestUSD: number | null
  /** Discount percentage (0-100). Zero when there is no saving. */
  discountPercent: number
}

export type OfficialVsSiteOptions = {
  /** Used to pick the current time-based tier, matching the card's site price. */
  now?: Date
}

/** 官方价对比站内价时使用的固定汇率（1 USD = 7 站内币种） */
export const FIXED_USD_EXCHANGE_RATE = 7

/** Check if model name matches any prefix in the list (case-insensitive prefix match). */
export function matchesPrefix(
  modelName: string | undefined | null,
  prefixes: readonly string[] | undefined | null
): boolean {
  if (!modelName || !prefixes || prefixes.length === 0) return false
  const name = modelName.trim().toLowerCase()
  return prefixes.some((prefix) => {
    const p = prefix.trim().toLowerCase()
    if (!p) return false
    // 允许前缀匹配模型名（例如 gpt 匹配 gpt-4o，或 openai/gpt-4o 匹配 gpt）
    return (
      name.startsWith(p) ||
      name.split(/[/:]/).some((part) => part.startsWith(p))
    )
  })
}

/**
 * Compute the official-vs-site price pair for a model.
 *
 * "Official" is the configured list price at group ratio 1.0, shown as USD.
 * "Site" is that list price multiplied by the viewer's group ratio — the same
 * number the rest of the site uses for billing, in the site's display currency.
 *
 * Discount compares those two amounts in the same currency: official USD is
 * converted with a fixed 1 USD = 7 rate, then compared with the site price.
 * Example: official $10 → ¥70, site ¥2 (group 0.2) → (1 - 2/70) ≈ 97% off.
 *
 * Returns `null` when there is no comparable list price (unreadable
 * expressions without token or per-request amounts).
 */
export function getOfficialVsSitePrice(
  model: PricingModel,
  groupRatioMultiplier: number,
  options?: OfficialVsSiteOptions
): UsdPriceComparison | null {
  const multiplier =
    Number.isFinite(groupRatioMultiplier) && groupRatioMultiplier > 0
      ? groupRatioMultiplier
      : 1
  const discountPercent = discountFromMultiplier(multiplier)

  const prices = getModelTokenPrices(model, { now: options?.now })
  const officialInputUSD = readOfficialAmount(prices.officialInputUSD)
  const officialOutputUSD = readOfficialAmount(prices.officialOutputUSD)
  const officialUSD = [officialInputUSD, officialOutputUSD].find(
    (value) => value != null && value > 0
  )
  if (prices.hasTokenPrices && officialUSD != null) {
    return {
      officialInputUSD,
      officialOutputUSD,
      officialRequestUSD: null,
      siteInputUSD: scaleOfficialAmount(officialInputUSD, multiplier),
      siteOutputUSD: scaleOfficialAmount(officialOutputUSD, multiplier),
      siteRequestUSD: null,
      discountPercent,
    }
  }

  const requestUSD = readOfficialAmount(
    getDynamicPricingSummary(model, {
      now: options?.now,
      groupRatioMultiplier: 1,
    })?.primaryEntries.find((entry) => entry.field === 'fixedPrice')?.value
  )
  if (requestUSD == null || requestUSD <= 0) return null

  return {
    officialInputUSD: null,
    officialOutputUSD: null,
    officialRequestUSD: requestUSD,
    siteInputUSD: null,
    siteOutputUSD: null,
    siteRequestUSD: scaleOfficialAmount(requestUSD, multiplier),
    discountPercent,
  }
}

function discountFromMultiplier(multiplier: number): number {
  // Plaza USD-vs-site discount always uses the fixed showcase rate, not the
  // admin quota-display exchange rate (which may be 1 when display is CNY).
  // 官方 $10 → ¥70，站内按倍率实付 ¥2：1 - (multiplier / 7)
  const effectiveRatio = multiplier / FIXED_USD_EXCHANGE_RATE
  const rawDiscount = (1 - effectiveRatio) * 100
  return rawDiscount >= MIN_DISCOUNT_PERCENT ? Math.round(rawDiscount) : 0
}

function scaleOfficialAmount(
  value: number | null,
  multiplier: number
): number | null {
  return value == null ? null : value * multiplier
}

function readOfficialAmount(value: number | null | undefined): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    return null
  }
  return value
}

function removeTrailingZeros(str: string): string {
  if (!str.includes('.')) return str
  return str.replace(/(\.[0-9]*?)0+$/, '$1').replace(/\.$/, '')
}

/**
 * Render a USD amount strictly formatted in USD ($ currency symbol),
 * independent of the site's local display currency.
 */
export function formatUsdPrice(
  amountUSD: number,
  tokenUnit: TokenUnit,
  showCurrencySymbol = true
): string {
  const amount = amountUSD / TOKEN_UNIT_DIVISORS[tokenUnit]
  if (!Number.isFinite(amount)) return '-'

  const abs = Math.abs(amount)
  const digits = abs >= 1 ? 4 : 6
  const numStr = removeTrailingZeros(amount.toFixed(digits))

  return showCurrencySymbol ? `$${numStr}` : numStr
}
