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
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { TooltipProvider } from '@/components/ui/tooltip'
import { Plaza } from '@/features/plaza'
import { getPricing } from '@/features/pricing/api'
import type { PricingData, PricingModel } from '@/features/pricing/types'

vi.mock('@/components/layout', () => ({
  PublicLayout: (props: { children: React.ReactNode }) => (
    <div>{props.children}</div>
  ),
}))

vi.mock('@/components/page-transition', () => ({
  PageTransition: (props: { children: React.ReactNode }) => (
    <div>{props.children}</div>
  ),
}))

vi.mock('@/lib/lobe-icon', () => ({
  getLobeIcon: () => null,
}))

vi.mock('@/hooks/use-status', () => ({
  useStatus: () => ({
    status: { price: 1, usd_exchange_rate: 1 },
    isLoading: false,
    error: null,
  }),
}))

vi.mock('@/features/pricing/api', () => ({
  getPricing: vi.fn(),
}))

vi.mock('@/features/pricing/components/model-details', () => ({
  ModelDetailsDrawer: () => null,
}))

vi.mock('@/features/performance-metrics/api', () => ({
  getPerfMetricsSummary: vi.fn(async () => ({
    success: true,
    data: { models: [] },
  })),
}))

function pricingModel(
  overrides: Partial<PricingModel> & Pick<PricingModel, 'id' | 'model_name'>
): PricingModel {
  return {
    quota_type: 0,
    model_ratio: 1,
    completion_ratio: 1,
    enable_groups: ['default'],
    ...overrides,
  }
}

const pricingPayload: PricingData = {
  success: true,
  data: [
    pricingModel({
      id: 1,
      model_name: 'gpt-4',
      vendor_id: 1,
      supported_endpoint_types: ['openai'],
      enable_groups: ['default'],
    }),
    pricingModel({
      id: 2,
      model_name: 'claude-opus',
      vendor_id: 2,
      supported_endpoint_types: ['anthropic'],
      enable_groups: ['vip'],
    }),
    pricingModel({
      id: 3,
      model_name: 'dall-e-3',
      vendor_id: 1,
      supported_endpoint_types: ['image-generation'],
      enable_groups: ['default'],
    }),
    pricingModel({
      id: 4,
      model_name: 'sora',
      vendor_id: 1,
      supported_endpoint_types: ['openai-video'],
      enable_groups: ['default'],
    }),
    pricingModel({
      id: 5,
      model_name: 'text-embedding-3',
      vendor_id: 1,
      supported_endpoint_types: ['embeddings'],
      enable_groups: ['default'],
    }),
  ],
  vendors: [
    { id: 1, name: 'OpenAI' },
    { id: 2, name: 'Anthropic' },
  ],
  group_ratio: { default: 1, vip: 0.5 },
  usable_group: {
    default: { desc: 'default', ratio: 1 },
    vip: { desc: 'vip', ratio: 0.5 },
  },
  supported_endpoint: {},
  auto_groups: [],
}

function renderPlaza() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Plaza />
      </TooltipProvider>
    </QueryClientProvider>
  )
}

describe('plaza page', () => {
  beforeEach(() => {
    vi.mocked(getPricing).mockResolvedValue(pricingPayload)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('keeps the search field and omits the model square title and sidebar filter', async () => {
    renderPlaza()

    expect(
      await screen.findByRole('textbox', { name: 'Search models' })
    ).toBeVisible()
    expect(
      screen.queryByRole('heading', { name: 'Model Square' })
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('heading', { name: 'Filter' })
    ).not.toBeInTheDocument()
  })

  it('groups models into chat, image, video, and other sections', async () => {
    renderPlaza()

    const chat = await screen.findByRole('region', { name: 'Chat' })
    expect(within(chat).getByRole('heading', { name: 'gpt-4' })).toBeVisible()
    expect(
      within(chat).getByRole('heading', { name: 'claude-opus' })
    ).toBeVisible()

    const image = screen.getByRole('region', { name: 'Image' })
    expect(
      within(image).getByRole('heading', { name: 'dall-e-3' })
    ).toBeVisible()

    const video = screen.getByRole('region', { name: 'Video' })
    expect(within(video).getByRole('heading', { name: 'sora' })).toBeVisible()

    const other = screen.getByRole('region', { name: 'Other' })
    expect(
      within(other).getByRole('heading', { name: 'text-embedding-3' })
    ).toBeVisible()
  })

  it('shows only the selected vendor models when a vendor chip is pressed', async () => {
    const user = userEvent.setup()
    renderPlaza()

    const vendorGroup = await screen.findByRole('group', {
      name: 'Vendor',
    })
    await user.click(
      within(vendorGroup).getByRole('button', { name: /OpenAI/ })
    )

    await waitFor(() => {
      expect(
        screen.queryByRole('heading', { name: 'claude-opus' })
      ).not.toBeInTheDocument()
    })
    expect(screen.getByRole('heading', { name: 'gpt-4' })).toBeVisible()
    expect(screen.getByRole('heading', { name: 'dall-e-3' })).toBeVisible()
    expect(
      within(vendorGroup).getByRole('button', { name: /OpenAI/ })
    ).toHaveAttribute('aria-pressed', 'true')
  })

  it('shows only models in the selected group when a group chip is pressed', async () => {
    const user = userEvent.setup()
    renderPlaza()

    const groupRow = await screen.findByRole('group', { name: 'Price' })
    await user.click(within(groupRow).getByRole('button', { name: /vip/ }))

    await waitFor(() => {
      expect(
        screen.queryByRole('heading', { name: 'gpt-4' })
      ).not.toBeInTheDocument()
    })
    expect(screen.getByRole('heading', { name: 'claude-opus' })).toBeVisible()
    expect(
      screen.queryByRole('region', { name: 'Image' })
    ).not.toBeInTheDocument()
  })

  it('filters the catalog by search text', async () => {
    const user = userEvent.setup()
    renderPlaza()

    const search = await screen.findByRole('textbox', { name: 'Search models' })
    await user.type(search, 'claude')

    await waitFor(() => {
      expect(
        screen.queryByRole('heading', { name: 'gpt-4' })
      ).not.toBeInTheDocument()
    })
    expect(screen.getByRole('heading', { name: 'claude-opus' })).toBeVisible()
  })

  it('places the vendor and price labels on the same row as their chips', async () => {
    renderPlaza()

    const vendorGroup = await screen.findByRole('group', { name: 'Vendor' })
    const vendorRow = vendorGroup.parentElement
    expect(vendorRow).not.toBeNull()
    expect(vendorRow).toHaveClass('flex')
    expect(vendorRow).not.toHaveClass('flex-col')
    expect(vendorRow?.querySelector('p')).toHaveTextContent('Vendor')
    expect(vendorRow?.querySelector('p')).toHaveClass('h-8')

    const priceGroup = screen.getByRole('group', { name: 'Price' })
    const priceRow = priceGroup.parentElement
    expect(priceRow).not.toBeNull()
    expect(priceRow).toHaveClass('flex')
    expect(priceRow).not.toHaveClass('flex-col')
    expect(priceRow?.querySelector('p')).toHaveTextContent('Price')
  })

  it('wraps the filter row icons in a decorative icon badge', async () => {
    renderPlaza()

    const vendorGroup = await screen.findByRole('group', { name: 'Vendor' })
    expect(
      vendorGroup.parentElement?.querySelector('p > span')
    ).toHaveAttribute('aria-hidden', 'true')

    const priceGroup = screen.getByRole('group', { name: 'Price' })
    expect(priceGroup.parentElement?.querySelector('p > span')).toHaveAttribute(
      'aria-hidden',
      'true'
    )
  })

  it('omits the all-vendors chip from the vendor row', async () => {
    renderPlaza()

    const vendorGroup = await screen.findByRole('group', {
      name: 'Vendor',
    })
    expect(
      within(vendorGroup).queryByRole('button', { name: /All/ })
    ).not.toBeInTheDocument()
  })

  it('clears the vendor filter when the pressed chip is clicked again', async () => {
    const user = userEvent.setup()
    renderPlaza()

    const vendorGroup = await screen.findByRole('group', {
      name: 'Vendor',
    })
    const openAI = within(vendorGroup).getByRole('button', { name: /OpenAI/ })
    await user.click(openAI)
    expect(openAI).toHaveAttribute('aria-pressed', 'true')

    await user.click(openAI)
    await waitFor(() => {
      expect(openAI).toHaveAttribute('aria-pressed', 'false')
    })
    expect(screen.getByRole('heading', { name: 'claude-opus' })).toBeVisible()
  })

  it('keeps the decorative backdrop layers out of the accessibility tree', async () => {
    renderPlaza()

    expect(await screen.findByTestId('plaza-ambient-wash')).toHaveAttribute(
      'aria-hidden',
      'true'
    )
    expect(screen.getByTestId('plaza-dot-grid')).toHaveAttribute(
      'aria-hidden',
      'true'
    )
  })

  it('paints the same backdrop while the catalog is still loading', async () => {
    vi.mocked(getPricing).mockReturnValue(new Promise<PricingData>(() => {}))

    renderPlaza()

    expect(await screen.findByTestId('plaza-ambient-wash')).toBeInTheDocument()
    expect(screen.getByTestId('plaza-dot-grid')).toBeInTheDocument()
  })
  it('scales the page from the current viewport width', async () => {
    const originalWidth = window.innerWidth
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      value: 1296,
    })

    try {
      renderPlaza()

      const frame = await screen.findByTestId('plaza-scale-frame')
      expect(frame).toHaveAttribute('data-plaza-scale', '0.9')
      expect(frame).toHaveStyle({ zoom: '0.9' })
    } finally {
      Object.defineProperty(window, 'innerWidth', {
        configurable: true,
        value: originalWidth,
      })
    }
  })
})
