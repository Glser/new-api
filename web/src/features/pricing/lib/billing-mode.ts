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
import type { PricingModel } from '../types'
import {
  hasTaskUsageSchema,
  isDynamicPricingModel,
  isFlatPerRequestExpression,
  isTokenBasedExpression,
} from './dynamic-price'
import { isTokenBasedModel } from './model-helpers'

export type BillingModeLabelKey =
  | 'Per Request'
  | 'Dynamic Pricing'
  | 'Token-based'
  | 'Task billing'

export function getBillingModeLabelKey(
  model: PricingModel
): BillingModeLabelKey {
  // Task-usage models badge as one business category; the metering unit
  // ($/1M token, $/credit, $/second) is already carried by the price line.
  if (hasTaskUsageSchema(model)) return 'Task billing'
  // Expression billing that prices a flat amount per call (`fixed(1)`,
  // `tier("base", fixed(1))`) is per-request billing in expression clothing,
  // and outranks `quota_type`: these models keep `quota_type: 0` from the
  // ratio era, which alone would mislabel them as token-based.
  if (isFlatPerRequestExpression(model.billing_expr)) return 'Per Request'
  // An expression over token variables (`p * 10 + c * 50`,
  // `u("tokens") * 1 / 1000000`) bills by token just like the ratio fields,
  // so it reads as token-based rather than "dynamic".
  if (isTokenBasedExpression(model.billing_expr)) return 'Token-based'
  if (isDynamicPricingModel(model)) return 'Dynamic Pricing'
  if (isTokenBasedModel(model)) return 'Token-based'
  return 'Per Request'
}
