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
  FIXED_USD_EXCHANGE_RATE,
  formatPriceRatio,
} from '@/features/pricing/lib/usd-price'
import type { GroupPriceCurrency } from '@/features/pricing/types'

const VALID_GROUP_PRICE_CURRENCIES = new Set<string>(['CNY', 'USD', 'MIXED'])

/** Backend strings are untyped at the API boundary; narrow them for display. */
export function isValidGroupPriceCurrency(
  value: string | undefined
): value is GroupPriceCurrency {
  return value !== undefined && VALID_GROUP_PRICE_CURRENCIES.has(value)
}

export function formatGroupRatio(
  ratio: number | undefined
): string | undefined {
  if (ratio == null) return undefined
  const formatted = Number.isInteger(ratio)
    ? ratio.toString()
    : ratio.toFixed(3).replace(/0+$/, '').replace(/\.$/, '')
  return `x${formatted}`
}

/**
 * USD 口径的分组倍率徽章：原始倍率 ÷ 固定汇率，保留两位小数。
 * 两位小数舍入成 0.00 的小倍率退回有效数字表示，避免把 0.04 显示成 0.00。
 */
export function formatUsdGroupRatioBadge(
  ratio: number | undefined
): string | undefined {
  if (ratio == null) return undefined
  const converted = ratio / FIXED_USD_EXCHANGE_RATE
  const twoDecimals = converted.toFixed(2)
  if (twoDecimals === '0.00' && converted > 0) {
    return `x${converted.toPrecision(2)}`
  }
  return `x${twoDecimals}`
}

/**
 * 按分组价格货币模式解析倍率徽章的展示值。
 * CNY/未配置 → 原始倍率；USD → ÷ 固定汇率折算（两位小数）。
 * 返回 null 表示该倍率不需要展示（缺省 1x 或值为空）。
 */
export function resolveGroupRatioBadgeValue(
  ratio: number | string | null | undefined,
  currencyMode: GroupPriceCurrency | undefined
): string | null {
  const numeric = typeof ratio === 'number' ? ratio : Number(ratio)
  if (!Number.isFinite(numeric)) return null
  if (numeric === 1) return null

  if (currencyMode === 'USD') {
    const badge = formatUsdGroupRatioBadge(numeric)
    return badge ? badge.slice(1) : null
  }
  return formatPriceRatio(numeric)
}
