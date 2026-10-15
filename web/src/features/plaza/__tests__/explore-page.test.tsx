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
import { Explore } from '@/features/plaza/explore'
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

function renderExplore() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Explore />
      </TooltipProvider>
    </QueryClientProvider>
  )
}

describe('explore page', () => {
  beforeEach(() => {
    vi.mocked(getPricing).mockResolvedValue(pricingPayload)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('renders the model square heading with the catalog summary', async () => {
    renderExplore()

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Model Square' })
    ).toBeVisible()
    expect(screen.getByText(/5 models/)).toBeVisible()
    expect(screen.getByText(/Browse every model/)).toBeVisible()
  })

  it('keeps the search field in the page header', async () => {
    renderExplore()

    expect(
      await screen.findByRole('textbox', { name: 'Search models' })
    ).toBeVisible()
  })

  it('groups models into chat, image, video, and other sections', async () => {
    renderExplore()

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
  })

  it('lists every vendor with its model count under an all-vendors entry', async () => {
    renderExplore()

    const vendorGroup = await screen.findByRole('group', {
      name: 'Vendor',
    })
    const allEntry = within(vendorGroup).getByRole('button', { name: /All/ })
    expect(allEntry).toHaveAttribute('aria-pressed', 'true')
    expect(allEntry).toHaveTextContent('5')
    expect(
      within(vendorGroup).getByRole('button', { name: /OpenAI/ })
    ).toHaveTextContent('4')
    expect(
      within(vendorGroup).getByRole('button', { name: /Anthropic/ })
    ).toHaveTextContent('1')
  })

  it('lists every price group with its ratio and model count', async () => {
    renderExplore()

    const priceGroup = await screen.findByRole('group', { name: 'Price' })
    const vipEntry = within(priceGroup).getByRole('button', { name: /vip/ })
    expect(vipEntry).toHaveTextContent('\u00d70.5')
    expect(vipEntry).toHaveTextContent('1')

    const defaultEntry = within(priceGroup).getByRole('button', {
      name: /default/,
    })
    expect(defaultEntry).toHaveTextContent('4')
  })

  it('shows only the selected vendor models when a vendor entry is pressed', async () => {
    const user = userEvent.setup()
    renderExplore()

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
    expect(screen.getByRole('region', { name: 'Image' })).toBeVisible()
  })

  it('clears the vendor filter when the pressed entry is clicked again', async () => {
    const user = userEvent.setup()
    renderExplore()

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

  it('narrows the catalog to the selected price group', async () => {
    const user = userEvent.setup()
    renderExplore()

    const priceGroup = await screen.findByRole('group', { name: 'Price' })
    const vip = within(priceGroup).getByRole('button', { name: /vip/ })
    await user.click(vip)
    expect(vip).toHaveAttribute('aria-pressed', 'true')

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

  it('reports the match count in the sidebar footer', async () => {
    renderExplore()

    const sidebar = await screen.findByRole('navigation', { name: 'Filter' })
    expect(within(sidebar).getByText('5 results')).toBeVisible()
  })

  it('clears every filter from the sidebar footer', async () => {
    const user = userEvent.setup()
    renderExplore()

    const vendorGroup = await screen.findByRole('group', {
      name: 'Vendor',
    })
    await user.click(
      within(vendorGroup).getByRole('button', { name: /OpenAI/ })
    )

    const sidebar = screen.getByRole('navigation', { name: 'Filter' })
    await user.click(
      within(sidebar).getByRole('button', { name: /Clear filters/ })
    )

    expect(screen.getByRole('heading', { name: 'claude-opus' })).toBeVisible()
    expect(screen.getByRole('heading', { name: 'gpt-4' })).toBeVisible()
  })

  it('filters the catalog by search text', async () => {
    const user = userEvent.setup()
    renderExplore()

    const search = await screen.findByRole('textbox', { name: 'Search models' })
    await user.type(search, 'claude')

    await waitFor(() => {
      expect(
        screen.queryByRole('heading', { name: 'gpt-4' })
      ).not.toBeInTheDocument()
    })
    expect(screen.getByRole('heading', { name: 'claude-opus' })).toBeVisible()
  })

  it('shows the empty state when nothing matches', async () => {
    const user = userEvent.setup()
    renderExplore()

    const search = await screen.findByRole('textbox', { name: 'Search models' })
    await user.type(search, 'no-such-model')

    expect(
      await screen.findByRole('heading', { name: 'No models found' })
    ).toBeVisible()
  })

  it('keeps the decorative backdrop layers out of the accessibility tree', async () => {
    renderExplore()

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

    renderExplore()

    expect(await screen.findByTestId('plaza-ambient-wash')).toBeInTheDocument()
    expect(screen.getByTestId('plaza-dot-grid')).toBeInTheDocument()
  })
})
