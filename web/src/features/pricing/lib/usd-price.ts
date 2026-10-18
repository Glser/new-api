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
}

/**
 * Compute the official-vs-site price pair for a model.
 *
 * "Official" is the configured list price at group ratio 1.0: ratio models use
 * `model_ratio * 2`, expression / tiered models use the same first-tier
 * input/output the details page shows as Base Price. "Site" is that list
 * price multiplied by the viewer's group ratio.
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
  const siteUSD = officialUSD * multiplier

  const raw = ((officialUSD - siteUSD) / officialUSD) * 100
  const discountPercent = raw >= MIN_DISCOUNT_PERCENT ? Math.round(raw) : 0

  return {
    officialInputUSD,
    officialOutputUSD,
    siteInputUSD: scaleOfficialAmount(officialInputUSD, multiplier),
    siteOutputUSD: scaleOfficialAmount(officialOutputUSD, multiplier),
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

/** Render a USD amount using the site's own precision rules. */
export function formatUsdPrice(
  amountUSD: number,
  tokenUnit: TokenUnit,
  showCurrencySymbol = true
): string {
  const amount = amountUSD / TOKEN_UNIT_DIVISORS[tokenUnit]
  if (!Number.isFinite(amount)) return '-'
  return formatBillingCurrencyFromUSD(amount, {
    showSymbol: showCurrencySymbol,
    digitsLarge: 4,
    digitsSmall: 6,
    abbreviate: false,
  })
}
