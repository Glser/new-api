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
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

import { TooltipProvider } from '@/components/ui/tooltip'

import { SectionModels } from '../section-models'

vi.mock('@/features/pricing/api', () => ({
  getPricing: vi.fn(() => Promise.resolve({ success: true, data: [] })),
}))

vi.mock('@/lib/lobe-icon', () => ({
  getLobeIcon: () => null,
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
    <TooltipProvider>
      <RouterProvider router={router} />
    </TooltipProvider>
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
  expect(within(featured).getByText('sec_models_context')).toBeInTheDocument()
  expect(within(featured).getByText('200K Tokens')).toBeInTheDocument()
  expect(within(featured).getByText('sec_models_performance')).toBeInTheDocument()
  expect(within(featured).getByText('深度思维链')).toBeInTheDocument()
  expect(within(featured).getByText('sec_models_category')).toBeInTheDocument()
  expect(within(featured).getByText('Reasoning & Coding')).toBeInTheDocument()
  expect(within(featured).getByText('sec_models_official_rate')).toBeInTheDocument()
  expect(within(featured).getByText('sec_models_site_rate')).toBeInTheDocument()
  expect(within(featured).getByText('$15.00')).toBeInTheDocument()
  expect(within(featured).getByText('$12.00')).toBeInTheDocument()
  expect(within(featured).getByText('超长上下文代码架构')).toBeInTheDocument()
})

it('keeps the featured card free of the tag row and keeps the official price labels readable', async () => {
  renderSection()

  const featured = await screen.findByRole('article')
  // The reasoning/coding/agent tag row was removed from the featured card.
  expect(within(featured).queryByText('Reasoning')).not.toBeInTheDocument()
  expect(within(featured).queryByText('Coding')).not.toBeInTheDocument()
  expect(within(featured).queryByText('Agent')).not.toBeInTheDocument()
  // Both official price lanes show their input/output micro labels.
  const inputLabels = within(featured).getAllByText('Input')
  const outputLabels = within(featured).getAllByText('Output')
  expect(inputLabels).toHaveLength(2)
  expect(outputLabels).toHaveLength(2)
  for (const label of [...inputLabels, ...outputLabels]) {
    expect(label).not.toHaveClass('sr-only')
  }
})

it('labels the input and output prices on the compact cards', async () => {
  renderSection()

  const grokCard = await screen.findByRole('button', { name: /Grok 4\.7/ })
  expect(within(grokCard).getByText('Input')).not.toHaveClass('sr-only')
  expect(within(grokCard).getByText('Output')).not.toHaveClass('sr-only')
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
  expect(within(grokCard).getByText('$2.40')).toBeInTheDocument()
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
  renderSection()

  const featured = await screen.findByRole('article')
  expect(within(featured).getByText('sec_models_context')).toHaveClass('sr-only')
  expect(within(featured).getByText('sec_models_performance')).toHaveClass('sr-only')
  expect(within(featured).getByText('sec_models_category')).toHaveClass('sr-only')
  // Values stay visible next to their icon.
  expect(within(featured).getByText('200K Tokens')).toBeInTheDocument()
  expect(within(featured).getByText('200K Tokens')).not.toHaveClass('sr-only')
})

it('marks the site price as the saving lane with one shared discount badge', async () => {
  renderSection()

  const featured = await screen.findByRole('article')
  expect(within(featured).getByText('sec_models_pricing')).toBeInTheDocument()
  expect(within(featured).getByText('-20%')).toBeInTheDocument()
  expect(within(featured).getAllByText('-20%')).toHaveLength(1)
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
