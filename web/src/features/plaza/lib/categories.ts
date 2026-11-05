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
import { ENDPOINT_TYPES } from '@/features/pricing/constants'
import type {
  PlazaCategoryConfig,
  PricingModel,
} from '@/features/pricing/types'

/** Fallback bucket; the backend always appends it as the last category. */
export const OTHER_CATEGORY_KEY = 'other'

/**
 * Used only until the pricing response arrives or when an older backend does
 * not send `categories`. The admin-configured list replaces it.
 */
export const FALLBACK_PLAZA_CATEGORIES: PlazaCategoryConfig[] = [
  { key: 'chat', label: 'Chat', icon: 'MessagesSquare' },
  { key: 'image', label: 'Image', icon: 'Image' },
  { key: 'video', label: 'Video', icon: 'Film' },
  { key: OTHER_CATEGORY_KEY, label: 'Other', icon: 'Boxes' },
]

const CHAT_ENDPOINTS = new Set<string>([
  ENDPOINT_TYPES.OPENAI,
  ENDPOINT_TYPES.OPENAI_RESPONSE,
  ENDPOINT_TYPES.ANTHROPIC,
  ENDPOINT_TYPES.GEMINI,
  'openai-response-compact',
  'openai-alpha-search',
])

const IMAGE_ENDPOINTS = new Set<string>([ENDPOINT_TYPES.IMAGE_GENERATION])
const VIDEO_ENDPOINTS = new Set<string>([ENDPOINT_TYPES.OPENAI_VIDEO])
const EMBEDDING_ENDPOINTS = new Set<string>([ENDPOINT_TYPES.EMBEDDINGS])

function hasEndpoint(endpoints: string[], allowed: Set<string>): boolean {
  return endpoints.some((endpoint) => allowed.has(endpoint))
}

/**
 * Guess a category key from the model's endpoints when none is set.
 *
 * Video and image endpoints win over chat: a model that can generate video
 * should sit in Video even if it also exposes a chat completion path.
 */
export function inferPlazaCategory(model: PricingModel): string {
  const endpoints = model.supported_endpoint_types ?? []
  if (hasEndpoint(endpoints, VIDEO_ENDPOINTS)) return 'video'
  if (hasEndpoint(endpoints, IMAGE_ENDPOINTS)) return 'image'
  if (hasEndpoint(endpoints, EMBEDDING_ENDPOINTS)) return 'embedding'
  if (hasEndpoint(endpoints, CHAT_ENDPOINTS)) return 'chat'

  const output = model.output_modalities ?? []
  if (output.includes('video')) return 'video'
  if (output.includes('image')) return 'image'
  if (output.includes('text') || endpoints.length === 0) return 'chat'

  return OTHER_CATEGORY_KEY
}

/**
 * Pick a single display bucket for a model: the category set in model
 * management wins; otherwise infer one from endpoints. A key that is not in
 * the configured list (deleted category, or an inferred one the admin removed)
 * falls back to Other so the model never disappears.
 */
export function getPlazaCategory(
  model: PricingModel,
  validKeys: ReadonlySet<string>
): string {
  const explicit = model.category?.trim()
  if (explicit && validKeys.has(explicit)) return explicit
  const inferred = inferPlazaCategory(model)
  return validKeys.has(inferred) ? inferred : OTHER_CATEGORY_KEY
}

export function groupModelsByCategory(
  models: PricingModel[],
  categories: PlazaCategoryConfig[]
): Map<string, PricingModel[]> {
  const grouped = new Map<string, PricingModel[]>()
  for (const category of categories) grouped.set(category.key, [])
  if (!grouped.has(OTHER_CATEGORY_KEY)) grouped.set(OTHER_CATEGORY_KEY, [])

  const validKeys = new Set(grouped.keys())
  for (const model of models) {
    grouped.get(getPlazaCategory(model, validKeys))?.push(model)
  }
  return grouped
}
