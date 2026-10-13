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
import type { PricingModel } from '@/features/pricing/types'

export const PLAZA_CATEGORIES = {
  CHAT: 'chat',
  IMAGE: 'image',
  VIDEO: 'video',
  OTHER: 'other',
} as const

export type PlazaCategory =
  (typeof PLAZA_CATEGORIES)[keyof typeof PLAZA_CATEGORIES]

export const PLAZA_CATEGORY_ORDER: PlazaCategory[] = [
  PLAZA_CATEGORIES.CHAT,
  PLAZA_CATEGORIES.IMAGE,
  PLAZA_CATEGORIES.VIDEO,
  PLAZA_CATEGORIES.OTHER,
]

const CHAT_ENDPOINTS = new Set([
  ENDPOINT_TYPES.OPENAI,
  ENDPOINT_TYPES.OPENAI_RESPONSE,
  ENDPOINT_TYPES.ANTHROPIC,
  ENDPOINT_TYPES.GEMINI,
  'openai-response-compact',
  'openai-alpha-search',
])

const IMAGE_ENDPOINTS = new Set([ENDPOINT_TYPES.IMAGE_GENERATION])
const VIDEO_ENDPOINTS = new Set([ENDPOINT_TYPES.OPENAI_VIDEO])

export const PLAZA_CATEGORY_LABEL_KEYS: Record<PlazaCategory, string> = {
  [PLAZA_CATEGORIES.CHAT]: 'Chat',
  [PLAZA_CATEGORIES.IMAGE]: 'Image',
  [PLAZA_CATEGORIES.VIDEO]: 'Video',
  [PLAZA_CATEGORIES.OTHER]: 'Other',
}

function hasEndpoint(endpoints: string[], allowed: Set<string>): boolean {
  return endpoints.some((endpoint) => allowed.has(endpoint))
}

/**
 * Pick a single display bucket for a model.
 *
 * Video and image endpoints win over chat: a model that can generate video
 * should sit in Video even if it also exposes a chat completion path.
 */
export function getPlazaCategory(model: PricingModel): PlazaCategory {
  const endpoints = model.supported_endpoint_types ?? []
  if (hasEndpoint(endpoints, VIDEO_ENDPOINTS)) {
    return PLAZA_CATEGORIES.VIDEO
  }
  if (hasEndpoint(endpoints, IMAGE_ENDPOINTS)) {
    return PLAZA_CATEGORIES.IMAGE
  }
  if (hasEndpoint(endpoints, CHAT_ENDPOINTS)) {
    return PLAZA_CATEGORIES.CHAT
  }

  const output = model.output_modalities ?? []
  if (output.includes('video')) {
    return PLAZA_CATEGORIES.VIDEO
  }
  if (output.includes('image')) {
    return PLAZA_CATEGORIES.IMAGE
  }
  if (output.includes('text') || endpoints.length === 0) {
    return PLAZA_CATEGORIES.CHAT
  }

  return PLAZA_CATEGORIES.OTHER
}

export function groupModelsByCategory(
  models: PricingModel[]
): Record<PlazaCategory, PricingModel[]> {
  const grouped: Record<PlazaCategory, PricingModel[]> = {
    [PLAZA_CATEGORIES.CHAT]: [],
    [PLAZA_CATEGORIES.IMAGE]: [],
    [PLAZA_CATEGORIES.VIDEO]: [],
    [PLAZA_CATEGORIES.OTHER]: [],
  }

  for (const model of models) {
    grouped[getPlazaCategory(model)].push(model)
  }

  return grouped
}
