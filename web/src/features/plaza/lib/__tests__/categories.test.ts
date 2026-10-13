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
import { describe, expect, it } from 'vitest'

import type { PricingModel } from '@/features/pricing/types'

import {
  getPlazaCategory,
  groupModelsByCategory,
  PLAZA_CATEGORIES,
} from '../categories'

function model(overrides: Partial<PricingModel> = {}): PricingModel {
  return {
    id: 1,
    model_name: 'example',
    quota_type: 0,
    model_ratio: 1,
    completion_ratio: 1,
    enable_groups: ['default'],
    ...overrides,
  }
}

describe('getPlazaCategory', () => {
  it('puts openai and anthropic endpoints in chat', () => {
    expect(
      getPlazaCategory(model({ supported_endpoint_types: ['openai'] }))
    ).toBe(PLAZA_CATEGORIES.CHAT)
    expect(
      getPlazaCategory(model({ supported_endpoint_types: ['anthropic'] }))
    ).toBe(PLAZA_CATEGORIES.CHAT)
  })

  it('puts image-generation endpoints in image even when chat is also listed', () => {
    expect(
      getPlazaCategory(
        model({ supported_endpoint_types: ['openai', 'image-generation'] })
      )
    ).toBe(PLAZA_CATEGORIES.IMAGE)
  })

  it('puts openai-video endpoints in video ahead of image and chat', () => {
    expect(
      getPlazaCategory(
        model({
          supported_endpoint_types: [
            'openai',
            'image-generation',
            'openai-video',
          ],
        })
      )
    ).toBe(PLAZA_CATEGORIES.VIDEO)
  })

  it('falls back to output modalities when endpoints are missing', () => {
    expect(getPlazaCategory(model({ output_modalities: ['image'] }))).toBe(
      PLAZA_CATEGORIES.IMAGE
    )
    expect(getPlazaCategory(model({ output_modalities: ['video'] }))).toBe(
      PLAZA_CATEGORIES.VIDEO
    )
    expect(getPlazaCategory(model({ output_modalities: ['text'] }))).toBe(
      PLAZA_CATEGORIES.CHAT
    )
  })

  it('puts embeddings and rerank endpoints in other', () => {
    expect(
      getPlazaCategory(model({ supported_endpoint_types: ['embeddings'] }))
    ).toBe(PLAZA_CATEGORIES.OTHER)
    expect(
      getPlazaCategory(model({ supported_endpoint_types: ['jina-rerank'] }))
    ).toBe(PLAZA_CATEGORIES.OTHER)
  })

  it('treats models with no endpoints as chat', () => {
    expect(getPlazaCategory(model({ supported_endpoint_types: [] }))).toBe(
      PLAZA_CATEGORIES.CHAT
    )
  })
})

describe('groupModelsByCategory', () => {
  it('keeps models in chat, image, video, and other buckets without dropping any', () => {
    const grouped = groupModelsByCategory([
      model({ id: 1, model_name: 'chat', supported_endpoint_types: ['openai'] }),
      model({
        id: 2,
        model_name: 'image',
        supported_endpoint_types: ['image-generation'],
      }),
      model({
        id: 3,
        model_name: 'video',
        supported_endpoint_types: ['openai-video'],
      }),
      model({
        id: 4,
        model_name: 'embed',
        supported_endpoint_types: ['embeddings'],
      }),
    ])

    expect(grouped.chat.map((item) => item.model_name)).toEqual(['chat'])
    expect(grouped.image.map((item) => item.model_name)).toEqual(['image'])
    expect(grouped.video.map((item) => item.model_name)).toEqual(['video'])
    expect(grouped.other.map((item) => item.model_name)).toEqual(['embed'])
  })
})
