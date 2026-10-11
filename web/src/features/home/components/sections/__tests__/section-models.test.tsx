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
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

import { TooltipProvider } from '@/components/ui/tooltip'

import { SectionModels } from '../section-models'

vi.mock('@/features/pricing/api', () => ({
  getPricing: vi.fn(() => Promise.resolve({ success: true, data: [] })),
}))

vi.mock('@/lib/lobe-icon', () => ({
  getLobeIcon: vi.fn(() => null),
}))

class IntersectionObserverMock {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

function modelDetailsHref(anchor: HTMLElement): string {
  return anchor.getAttribute('href') ?? ''
}

function featuredDetailsLink(featured: HTMLElement): HTMLElement {
  return within(featured).getByRole('link', {
    name: 'sec_models_view_model',
  })
}

function renderSection() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })
  const rootRoute = createRootRoute({ component: SectionModels })
  const pricingRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/pricing',
    validateSearch: (search: Record<string, unknown>) => ({
      search: typeof search.search === 'string' ? search.search : undefined,
    }),
    component: () => null,
  })
  const router = createRouter({
    routeTree: rootRoute.addChildren([pricingRoute]),
    history: createMemoryHistory({ initialEntries: ['/'] }),
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <RouterProvider router={router} />
      </TooltipProvider>
    </QueryClientProvider>
  )
}

beforeEach(() => {
  vi.stubGlobal('IntersectionObserver', IntersectionObserverMock)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

it('shows the featured model details, spec capsule, and split price capsules', async () => {
  renderSection()

  const featured = await screen.findByRole('article')
  expect(
    within(featured).getByRole('heading', { level: 3, name: 'Claude Opus 5.5' })
  ).toBeInTheDocument()
  expect(within(featured).getByText(/扩展思维与深度推理/)).toBeInTheDocument()
  // 静态兜底没有后台标签，三个规格胶囊固定保留并显示占位符
  expect(within(featured).getAllByText('sec_models_context').length).toBe(1)
  expect(within(featured).getAllByText('sec_models_performance').length).toBe(1)
  expect(within(featured).getAllByText('sec_models_category').length).toBe(1)
  expect(within(featured).getAllByText('-').length).toBeGreaterThan(0)
  expect(within(featured).getByText('sec_models_site_rate')).toBeInTheDocument()
  // 静态兜底没有价格数据来源，两行都不展示推导数值
  expect(
    within(featured).getAllByText('sec_models_price_see_pricing')
  ).toHaveLength(2)
})

it('keeps the featured card free of the tag row', async () => {
  renderSection()

  const featured = await screen.findByRole('article')
  // The reasoning/coding/agent tag row was removed from the featured card.
  expect(within(featured).queryByText('Reasoning')).not.toBeInTheDocument()
  expect(within(featured).queryByText('Coding')).not.toBeInTheDocument()
  expect(within(featured).queryByText('Agent')).not.toBeInTheDocument()
})

it('guides to the pricing plaza instead of showing a price for static fallback cards', async () => {
  renderSection()

  const grokCard = await screen.findByRole('button', { name: /Grok 4\.7/ })
  const link = within(grokCard).getByRole('link', {
    name: 'sec_models_price_see_pricing',
  })
  expect(modelDetailsHref(link)).toContain('search=grok-4-7')
  // No invented price numerals without backend pricing data.
  expect(within(grokCard).queryByText('Input')).not.toBeInTheDocument()
  expect(within(grokCard).queryByText('Output')).not.toBeInTheDocument()
})

it('links the featured model action to the pricing plaza with that model as search', async () => {
  renderSection()

  const featured = await screen.findByRole('article')
  const details = featuredDetailsLink(featured)
  expect(modelDetailsHref(details)).toContain('search=claude-opus-5-5')
})

it('keeps compact cards as a brief description-and-price grid and updates the featured card on select', async () => {
  const user = userEvent.setup()
  renderSection()

  const featured = await screen.findByRole('article')
  expect(
    within(featured).getByRole('heading', { level: 3, name: 'Claude Opus 5.5' })
  ).toBeInTheDocument()

  const grokCard = screen.getByRole('button', { name: /Grok 4\.7/ })
  expect(grokCard).toHaveAttribute('aria-pressed', 'false')
  expect(within(grokCard).getByText(/原生实时 X 平台/)).toBeInTheDocument()
  expect(within(grokCard).queryByText('sec_models_official_rate')).not.toBeInTheDocument()
  expect(within(grokCard).queryByText('科学竞赛级数理证明')).not.toBeInTheDocument()

  await user.click(grokCard)

  expect(grokCard).toHaveAttribute('aria-pressed', 'true')
  expect(
    within(screen.getByRole('article')).getByRole('heading', {
      level: 3,
      name: 'Grok 4.7',
    })
  ).toBeInTheDocument()
  expect(
    modelDetailsHref(featuredDetailsLink(screen.getByRole('article')))
  ).toContain('search=grok-4-7')
})

it('keeps the provider name out of the featured model heading', async () => {
  renderSection()

  const featured = await screen.findByRole('article')
  const heading = within(featured).getByRole('heading', { level: 3 })
  expect(heading).toHaveTextContent('Claude Opus 5.5')
  expect(heading).not.toHaveTextContent('Anthropic')
  // The provider is still available on the card, as provenance metadata in
  // the footer next to the model id and the availability status.
  expect(within(featured).getByText('Anthropic')).toBeInTheDocument()
})

it('exposes spec values as icons with an sr-only label instead of visible micro text', async () => {
  const { getPricing } = await import('@/features/pricing/api')
  vi.mocked(getPricing).mockResolvedValueOnce({
    success: true,
    data: [
      {
        id: 1,
        model_name: 'claude-opus-5-5',
        tags: '200K,深度思维链,Reasoning,featured',
        vendor_id: 1,
        quota_type: 0,
        model_ratio: 2,
        completion_ratio: 1,
        enable_groups: ['default'],
      },
    ],
    vendors: [{ id: 1, name: 'anthropic' }],
    group_ratio: { default: 1 },
    usable_group: { default: { desc: 'default', ratio: 1 } },
    supported_endpoint: {},
    auto_groups: [],
  })

  renderSection()

  const featured = await screen.findByRole('article')
  expect(within(featured).getByText('sec_models_context')).toHaveClass('sr-only')
  expect(within(featured).getByText('sec_models_performance')).toHaveClass('sr-only')
  expect(within(featured).getByText('sec_models_category')).toHaveClass('sr-only')
  // Values stay visible next to their icon.
  expect(within(featured).getAllByText('200K').length).toBeGreaterThan(0)
})

it('hides the discount badge when no group discount applies to static fallback cards', async () => {
  renderSection()

  const featured = await screen.findByRole('article')
  // The static fallback carries no group ratio, so no saving badge is invented.
  expect(within(featured).queryByText(/^-\d+%$/)).not.toBeInTheDocument()
})

it('lifts the selected compact card instead of highlighting its left edge', async () => {
  const user = userEvent.setup()
  renderSection()

  const grokCard = await screen.findByRole('button', { name: /Grok 4\.7/ })
  expect(grokCard).toHaveClass('hover:-translate-y-1')
  expect(grokCard).not.toHaveClass('-translate-y-1')

  await user.click(grokCard)

  expect(grokCard).toHaveClass('-translate-y-1')
  expect(grokCard.querySelector('.inset-y-3')).toBeNull()
})

it('uses a 1+4 split layout with a two-by-two compact grid from the sm breakpoint', async () => {
  const { container } = renderSection()
  await screen.findByRole('article')

  const split = container.querySelector('.lg\\:grid-cols-12')
  expect(split).not.toBeNull()
  expect(split?.firstElementChild).toHaveClass('lg:col-span-6')
  expect(split?.lastElementChild).toHaveClass('sm:grid-cols-2')
  expect(split?.lastElementChild).toHaveClass('lg:col-span-6')
})

it('prioritizes models with the featured tag from backend pricing API', async () => {
  const { getPricing } = await import('@/features/pricing/api')
  vi.mocked(getPricing).mockResolvedValueOnce({
    success: true,
    data: [
      {
        id: 1,
        model_name: 'custom-featured-model',
        description: 'Custom featured model description',
        tags: 'chat,featured,hot',
        vendor_id: 1,
        quota_type: 0,
        model_ratio: 2.5,
        completion_ratio: 2.0,
        enable_groups: ['default'],
      },
      {
        id: 2,
        model_name: 'custom-normal-model',
        description: 'Custom normal model description',
        tags: 'chat',
        vendor_id: 1,
        quota_type: 0,
        model_ratio: 1.0,
        completion_ratio: 1.0,
        enable_groups: ['default'],
      },
    ],
    vendors: [
      {
        id: 1,
        name: 'anthropic',
      },
    ],
    group_ratio: {
      default: 0.8,
    },
    usable_group: {
      default: { desc: 'default', ratio: 1 },
    },
    supported_endpoint: {},
    auto_groups: [],
  })

  renderSection()

  const featured = await screen.findByRole('article')
  expect(
    within(featured).getByRole('heading', {
      level: 3,
      name: 'custom-featured-model',
    })
  ).toBeInTheDocument()
  expect(within(featured).getByText('Anthropic')).toBeInTheDocument()
})

it('shows the tiered billing expression price instead of the model_ratio derivation', async () => {
  const { getPricing } = await import('@/features/pricing/api')
  vi.mocked(getPricing).mockResolvedValueOnce({
    success: true,
    data: [
      {
        id: 1,
        model_name: 'claude-opus-5-5',
        tags: 'featured',
        vendor_id: 1,
        quota_type: 0,
        // A stale ratio that must NOT drive the displayed price.
        model_ratio: 37.5,
        completion_ratio: 1,
        enable_groups: ['default'],
        billing_mode: 'tiered_expr',
        billing_expr:
          'len <= 200000 ? tier("standard", p * 3 + c * 15) : tier("long_context", p * 6 + c * 22.5)',
      },
    ],
    vendors: [{ id: 1, name: 'anthropic' }],
    group_ratio: { default: 1 },
    usable_group: { default: { desc: 'default', ratio: 1 } },
    supported_endpoint: {},
    auto_groups: [],
  })

  renderSection()

  const featured = await screen.findByRole('article')
  // Expression prices are USD per 1M tokens: $3 in / $15 out on the official
  // lane. The platform lane is the China-region CNY price with the same numbers.
  expect(within(featured).getByText('$3')).toBeInTheDocument()
  expect(within(featured).getByText('$15')).toBeInTheDocument()
  expect(within(featured).getByText('¥3')).toBeInTheDocument()
  expect(within(featured).getByText('¥15')).toBeInTheDocument()
  // The model_ratio derivation would have produced $75.
  expect(within(featured).queryByText('$75')).not.toBeInTheDocument()
  // Both price lanes render, driven by the same expression tier.
  expect(within(featured).getByText('sec_models_site_rate')).toBeInTheDocument()
  expect(within(featured).getByText('sec_models_official_rate')).toBeInTheDocument()
  expect(
    within(featured).queryByText('sec_models_price_see_pricing')
  ).not.toBeInTheDocument()
})

it('shows the exchange-rate discount for overseas models', async () => {
  const { getPricing } = await import('@/features/pricing/api')
  vi.mocked(getPricing).mockResolvedValueOnce({
    success: true,
    data: [
      {
        id: 1,
        model_name: 'ratio-model',
        tags: 'featured',
        vendor_id: 1,
        quota_type: 0,
        model_ratio: 5,
        completion_ratio: 2,
        enable_groups: ['default'],
      },
    ],
    vendors: [{ id: 1, name: 'anthropic' }],
    group_ratio: { default: 1 },
    usable_group: { default: { desc: 'default', ratio: 1 } },
    supported_endpoint: {},
    auto_groups: [],
  })

  renderSection()

  const featured = await screen.findByRole('article')
  // model_ratio 5, completion 2 -> $10 in / $20 out at group ratio 1.0.
  expect(within(featured).getByText('$10')).toBeInTheDocument()
  expect(within(featured).getByText('$20')).toBeInTheDocument()
  expect(within(featured).getByText('¥10')).toBeInTheDocument()
  expect(within(featured).getByText('¥20')).toBeInTheDocument()
  // $10 == ¥72 at the hardcoded 7.2 rate, so paying ¥10 is ~86% off.
  expect(within(featured).getByText('-86%')).toBeInTheDocument()
})

it('applies the group ratio to the platform price and its discount', async () => {
  const { getPricing } = await import('@/features/pricing/api')
  vi.mocked(getPricing).mockResolvedValueOnce({
    success: true,
    data: [
      {
        id: 1,
        model_name: 'claude-opus-5-5',
        tags: 'featured',
        vendor_id: 1,
        quota_type: 0,
        model_ratio: 2,
        completion_ratio: 1,
        enable_groups: ['default'],
        billing_mode: 'tiered_expr',
        billing_expr: 'tier("standard", p * 3 + c * 15)',
      },
    ],
    vendors: [{ id: 1, name: 'anthropic' }],
    group_ratio: { default: 0.2 },
    usable_group: { default: { desc: 'default', ratio: 0.2 } },
    supported_endpoint: {},
    auto_groups: [],
  })

  renderSection()

  const featured = await screen.findByRole('article')
  // The admin-set group ratio scales the platform price: ¥0.6 in / ¥3 out.
  expect(within(featured).getByText('$3')).toBeInTheDocument()
  expect(within(featured).getByText('$15')).toBeInTheDocument()
  expect(within(featured).getByText('¥0.6')).toBeInTheDocument()
  expect(within(featured).getByText('¥3')).toBeInTheDocument()
  // $3 == ¥21.6, so paying ¥0.6 is ~97% off.
  expect(within(featured).getByText('-97%')).toBeInTheDocument()
})

it('omits the discount badge for domestic models priced in the same currency', async () => {
  const { getPricing } = await import('@/features/pricing/api')
  vi.mocked(getPricing).mockResolvedValueOnce({
    success: true,
    data: [
      {
        id: 1,
        model_name: 'deepseek-v4-1-flash',
        tags: 'featured',
        vendor_id: 1,
        quota_type: 0,
        model_ratio: 2,
        completion_ratio: 1,
        enable_groups: ['default'],
      },
    ],
    vendors: [{ id: 1, name: 'deepseek' }],
    group_ratio: { default: 1 },
    usable_group: { default: { desc: 'default', ratio: 1 } },
    supported_endpoint: {},
    auto_groups: [],
  })

  renderSection()

  const featured = await screen.findByRole('article')
  // Both lanes are CNY, so there is no exchange-rate advantage to advertise.
  expect(within(featured).queryByText(/^-\d+%$/)).not.toBeInTheDocument()
})

it('shows the official price in USD for overseas vendors', async () => {
  const { getPricing } = await import('@/features/pricing/api')
  vi.mocked(getPricing).mockResolvedValueOnce({
    success: true,
    data: [
      {
        id: 1,
        model_name: 'claude-opus-5-5',
        tags: 'featured',
        vendor_id: 1,
        quota_type: 0,
        model_ratio: 2,
        completion_ratio: 3,
        enable_groups: ['default'],
        billing_mode: 'tiered_expr',
        billing_expr: 'tier("standard", p * 3 + c * 15)',
      },
    ],
    vendors: [{ id: 1, name: 'anthropic' }],
    group_ratio: { default: 1 },
    usable_group: { default: { desc: 'default', ratio: 1 } },
    supported_endpoint: {},
    auto_groups: [],
  })

  renderSection()

  const featured = await screen.findByRole('article')
  // Anthropic is overseas: the official lane is USD, the platform lane is the
  // China-region CNY price with the same numbers.
  expect(within(featured).getByText('$3')).toBeInTheDocument()
  expect(within(featured).getByText('$15')).toBeInTheDocument()
  expect(within(featured).getByText('¥3')).toBeInTheDocument()
  expect(within(featured).getByText('¥15')).toBeInTheDocument()
})

it('shows the official price in CNY for domestic vendors', async () => {
  const { getPricing } = await import('@/features/pricing/api')
  vi.mocked(getPricing).mockResolvedValueOnce({
    success: true,
    data: [
      {
        id: 1,
        model_name: 'deepseek-v4-1-flash',
        tags: 'featured',
        vendor_id: 1,
        quota_type: 0,
        model_ratio: 1,
        completion_ratio: 1,
        enable_groups: ['default'],
      },
    ],
    vendors: [{ id: 1, name: 'deepseek' }],
    group_ratio: { default: 1 },
    usable_group: { default: { desc: 'default', ratio: 1 } },
    supported_endpoint: {},
    auto_groups: [],
  })

  renderSection()

  const featured = await screen.findByRole('article')
  // DeepSeek is domestic: both lanes are CNY with the same numbers.
  // model_ratio 1 -> $2 per 1M, shown as ¥2 on both lanes without conversion.
  expect(within(featured).getAllByText('¥2')).toHaveLength(4)
  expect(within(featured).queryByText(/^\$/)).not.toBeInTheDocument()
})

it('shows backend tags and the no-description fallback', async () => {
  const { getPricing } = await import('@/features/pricing/api')
  vi.mocked(getPricing).mockResolvedValueOnce({
    success: true,
    data: [
      {
        id: 1,
        model_name: 'tagged-model',
        tags: 'chat,featured,hot',
        vendor_id: 1,
        quota_type: 0,
        model_ratio: 2,
        completion_ratio: 1,
        enable_groups: ['default'],
      },
    ],
    vendors: [{ id: 1, name: 'anthropic' }],
    group_ratio: { default: 1 },
    usable_group: { default: { desc: 'default', ratio: 1 } },
    supported_endpoint: {},
    auto_groups: [],
  })

  renderSection()

  const featured = await screen.findByRole('article')
  // `featured` is an internal marker and must not surface as a user-facing tag.
  // The remaining tags fill the spec capsules first, then the tag row.
  expect(within(featured).getAllByText('chat').length).toBeGreaterThan(0)
  expect(within(featured).getAllByText('hot').length).toBeGreaterThan(0)
  expect(within(featured).queryByText('featured')).not.toBeInTheDocument()
  // No backend description: the card degrades instead of inventing copy.
  expect(
    within(featured).getByText('sec_models_no_description')
  ).toBeInTheDocument()
})

it('moves tags beyond the three spec slots into the scenarios row', async () => {
  const { getPricing } = await import('@/features/pricing/api')
  vi.mocked(getPricing).mockResolvedValueOnce({
    success: true,
    data: [
      {
        id: 1,
        model_name: 'many-tags-model',
        tags: 'first,second,third,fourth,fifth,featured',
        vendor_id: 1,
        quota_type: 0,
        model_ratio: 2,
        completion_ratio: 1,
        enable_groups: ['default'],
      },
    ],
    vendors: [{ id: 1, name: 'anthropic' }],
    group_ratio: { default: 1 },
    usable_group: { default: { desc: 'default', ratio: 1 } },
    supported_endpoint: {},
    auto_groups: [],
  })

  renderSection()

  const featured = await screen.findByRole('article')
  // The first three tags fill the fixed spec capsules.
  expect(within(featured).getByText('first')).toBeInTheDocument()
  expect(within(featured).getByText('second')).toBeInTheDocument()
  expect(within(featured).getByText('third')).toBeInTheDocument()
  // The remaining tags surface in the scenarios row instead.
  expect(within(featured).getByText('sec_models_scenarios')).toBeInTheDocument()
  expect(within(featured).getByText('fourth')).toBeInTheDocument()
  expect(within(featured).getByText('fifth')).toBeInTheDocument()
})

it('shows the backend description when the model provides one', async () => {
  const { getPricing } = await import('@/features/pricing/api')
  vi.mocked(getPricing).mockResolvedValueOnce({
    success: true,
    data: [
      {
        id: 1,
        model_name: 'described-model',
        description: 'Backend supplied description.',
        tags: 'featured',
        vendor_id: 1,
        quota_type: 0,
        model_ratio: 2,
        completion_ratio: 1,
        enable_groups: ['default'],
      },
    ],
    vendors: [{ id: 1, name: 'anthropic' }],
    group_ratio: { default: 1 },
    usable_group: { default: { desc: 'default', ratio: 1 } },
    supported_endpoint: {},
    auto_groups: [],
  })

  renderSection()

  const featured = await screen.findByRole('article')
  expect(
    within(featured).getByText('Backend supplied description.')
  ).toBeInTheDocument()
  expect(
    within(featured).queryByText('sec_models_no_description')
  ).not.toBeInTheDocument()
})

it('degrades to a pricing link for per-request models without a token price', async () => {
  const { getPricing } = await import('@/features/pricing/api')
  vi.mocked(getPricing).mockResolvedValueOnce({
    success: true,
    data: [
      {
        id: 1,
        model_name: 'per-call-model',
        tags: 'featured',
        vendor_id: 1,
        quota_type: 1,
        model_price: 0.5,
        model_ratio: 0,
        completion_ratio: 0,
        enable_groups: ['default'],
      },
    ],
    vendors: [{ id: 1, name: 'anthropic' }],
    group_ratio: { default: 1 },
    usable_group: { default: { desc: 'default', ratio: 1 } },
    supported_endpoint: {},
    auto_groups: [],
  })

  renderSection()

  const featured = await screen.findByRole('article')
  // Two degradation links: one replaces the official lane, one the site lane.
  const links = within(featured).getAllByRole('link', {
    name: 'sec_models_price_see_pricing',
  })
  expect(links).toHaveLength(2)
  for (const link of links) {
    expect(modelDetailsHref(link)).toContain('search=per-call-model')
  }
  expect(within(featured).queryByText('Input')).not.toBeInTheDocument()
  expect(within(featured).queryByText('Output')).not.toBeInTheDocument()
})

it('keeps a tag containing spaces as one tag instead of splitting it', async () => {
  const { getPricing } = await import('@/features/pricing/api')
  vi.mocked(getPricing).mockResolvedValueOnce({
    success: true,
    data: [
      {
        id: 1,
        model_name: 'spaced-tag-model',
        tags: '200K Tokens,深度思维链,featured',
        vendor_id: 1,
        quota_type: 0,
        model_ratio: 2,
        completion_ratio: 1,
        enable_groups: ['default'],
      },
    ],
    vendors: [{ id: 1, name: 'anthropic' }],
    group_ratio: { default: 1 },
    usable_group: { default: { desc: 'default', ratio: 1 } },
    supported_endpoint: {},
    auto_groups: [],
  })

  renderSection()

  const featured = await screen.findByRole('article')
  // A space inside a tag must not split it into two spec values.
  expect(within(featured).getByText('200K Tokens')).toBeInTheDocument()
  expect(within(featured).queryByText('200K')).not.toBeInTheDocument()
  expect(within(featured).queryByText('Tokens')).not.toBeInTheDocument()
})

it('styles the full catalogue button like the hero primary CTA while still linking to the plaza', async () => {
  renderSection()

  const catalogue = await screen.findByRole('link', {
    name: 'sec_models_view_all',
  })
  // Navigation stays on the public model plaza.
  expect(modelDetailsHref(catalogue)).toBe('/pricing')
  // Same colours as the hero primary CTA: theme foreground fill, background text.
  expect(catalogue.className).toContain('bg-foreground')
  expect(catalogue.className).toContain('text-background')
  expect(catalogue.className).not.toContain('bg-emerald-600')
  // Shared motion treatment: hover lift, shadow lift and the luminous sweep.
  expect(catalogue.className).toContain('hover:scale-[1.02]')
  expect(catalogue.className).toContain('hover:shadow-[0_8px_24px_rgba(0,0,0,0.18)]')
  expect(catalogue.querySelector('.group-hover\\:translate-x-full')).not.toBeNull()
})

it('does not inherit the linked vendor icon, so a mislinked model keeps its own', async () => {
  const { getPricing } = await import('@/features/pricing/api')
  vi.mocked(getPricing).mockResolvedValueOnce({
    success: true,
    data: [
      {
        id: 1,
        model_name: 'gpt-6-astra',
        tags: 'featured',
        vendor_id: 7,
        quota_type: 0,
        model_ratio: 2,
        completion_ratio: 1,
        enable_groups: ['default'],
      },
    ],
    vendors: [{ id: 7, name: 'Anthropic', icon: 'Claude.Color' }],
    group_ratio: { default: 1 },
    usable_group: { default: { desc: 'default', ratio: 1 } },
    supported_endpoint: {},
    auto_groups: [],
  })

  const { getLobeIcon } = await import('@/lib/lobe-icon')
  renderSection()

  const featured = await screen.findByRole('article')
  await waitFor(() =>
    expect(
      within(featured).getByRole('heading', { level: 3, name: 'gpt-6-astra' })
    ).toBeInTheDocument()
  )

  // The model name identifies it as an OpenAI model, so the committed featured
  // card must not carry the Anthropic vendor icon despite the backend link.
  // (The section first paints static fallback models, so read the last call.)
  const featuredIconCalls = vi
    .mocked(getLobeIcon)
    .mock.calls.filter(([, size]) => size === 32)
    .map(([icon]) => icon)
  expect(featuredIconCalls.at(-1)).toBe('Codex.Color')
  vi.mocked(getLobeIcon).mockClear()
})

it('prefers the model icon over any name-based inference', async () => {
  const { getPricing } = await import('@/features/pricing/api')
  vi.mocked(getPricing).mockResolvedValueOnce({
    success: true,
    data: [
      {
        id: 1,
        model_name: 'claude-opus-5-5',
        icon: 'Sparkles',
        tags: 'featured',
        vendor_id: 7,
        quota_type: 0,
        model_ratio: 2,
        completion_ratio: 1,
        enable_groups: ['default'],
      },
    ],
    vendors: [{ id: 7, name: 'Anthropic', icon: 'Claude.Color' }],
    group_ratio: { default: 1 },
    usable_group: { default: { desc: 'default', ratio: 1 } },
    supported_endpoint: {},
    auto_groups: [],
  })

  const { getLobeIcon } = await import('@/lib/lobe-icon')
  renderSection()

  await screen.findByRole('article')
  expect(getLobeIcon).toHaveBeenCalledWith('Sparkles', expect.anything())
  vi.mocked(getLobeIcon).mockClear()
})
