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
import { getModelTokenPrices } from './dynamic-price'

/** Smallest discount worth badging; avoids "-0%" from float drift. */
const MIN_DISCOUNT_PERCENT = 1

export type UsdPriceComparison = {
  /** Official (list) input price in USD, before any group multiplier. */
  officialInputUSD: number | null
  /** Official (list) output price in USD, before any group multiplier. */
  officialOutputUSD: number | null
  /** Site input price in USD after the viewer's group multiplier. */
  siteInputUSD: number | null
  /** Site output price in USD after the viewer's group multiplier. */
  siteOutputUSD: number | null
  /** Discount percentage (0-100). Zero when there is no saving. */
  discountPercent: number
}

export type OfficialVsSiteOptions = {
  /** Used to pick the current time-based tier, matching the card's site price. */
  now?: Date
  /**
   * USD to site currency exchange rate (e.g. 7 for CNY).
   * When provided, site price is compared in local currency to official USD * exchangeRate.
   */
  usdExchangeRate?: number
  /**
   * Price recharge rate (e.g. cost in site currency for 1 USD credit).
   */
  priceRate?: number
  showRechargePrice?: boolean
}

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
    return name.startsWith(p) || name.split(/[/:]/).some((part) => part.startsWith(p))
  })
}

/**
 * Compute the official-vs-site price pair for a model.
 *
 * "Official" is the configured list price at group ratio 1.0 in USD.
 * "Site" is that list price multiplied by the viewer's group ratio.
 *
 * When `usdExchangeRate` is provided, discount calculation converts the official USD
 * price to the site's local currency before comparing with the site's charged price
 * (taking into account user group discount and recharge rate), accurately showing how
 * much cheaper the model is.
 *
 * Returns `null` when there is no comparable token list price (per-request
 * and unreadable expressions).
 */
export function getOfficialVsSitePrice(
  model: PricingModel,
  groupRatioMultiplier: number,
  options?: OfficialVsSiteOptions
): UsdPriceComparison | null {
  const prices = getModelTokenPrices(model, { now: options?.now })
  if (!prices.hasTokenPrices) return null

  const officialInputUSD = readOfficialAmount(prices.officialInputUSD)
  const officialOutputUSD = readOfficialAmount(prices.officialOutputUSD)
  const officialUSD = [officialInputUSD, officialOutputUSD].find(
    (value) => value != null && value > 0
  )
  if (officialUSD == null) return null

  const multiplier =
    Number.isFinite(groupRatioMultiplier) && groupRatioMultiplier > 0
      ? groupRatioMultiplier
      : 1
  const siteInputUSD = scaleOfficialAmount(officialInputUSD, multiplier)
  const siteOutputUSD = scaleOfficialAmount(officialOutputUSD, multiplier)

  const usdExchangeRate =
    typeof options?.usdExchangeRate === 'number' && options.usdExchangeRate > 0
      ? options.usdExchangeRate
      : 1

  // 综合计算有效折扣率：
  // 官方原价是美元定价（例如 1 美元），换算成本地币种相当于 officialUSD * usdExchangeRate（例如 1 * 7 = 7 元）；
  // 站内实付按分组倍率（例如 0.1 元），用户享受到的真实折扣为：
  // 1 - (multiplier / usdExchangeRate) = 1 - 0.1/7 ≈ 98.57% -> -99%
  const effectiveRatio = multiplier / usdExchangeRate
  const rawDiscount = (1 - effectiveRatio) * 100
  const discountPercent =
    rawDiscount >= MIN_DISCOUNT_PERCENT ? Math.round(rawDiscount) : 0

  return {
    officialInputUSD,
    officialOutputUSD,
    siteInputUSD,
    siteOutputUSD,
    discountPercent,
  }
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
