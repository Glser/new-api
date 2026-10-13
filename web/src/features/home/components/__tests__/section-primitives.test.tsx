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
import type { ReactNode } from "react"
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  SectionBackdrop,
  SectionDivider,
  SectionHeader,
  SectionPrimaryLink,
  SectionScrollCue,
  SectionTextLink,
} from '../section-primitives'

class IntersectionObserverMock {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

/**
 * 把被测组件挂到无 path 的根路由上，Link 目标注册为兄弟路由。
 * 返回的 promise 等路由完成首帧匹配，避免断言跑在挂载之前。
 */
async function renderAtRoute(_path: string, element: ReactNode) {
  const rootRoute = createRootRoute({ component: () => element })
  const dashboardRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/dashboard',
    component: () => null,
  })
  const modelsRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/models',
    component: () => null,
  })
  const router = createRouter({
    routeTree: rootRoute.addChildren([dashboardRoute, modelsRoute]),
    history: createMemoryHistory({ initialEntries: ['/'] }),
  })

  const view = render(<RouterProvider router={router} />)
  await router.load()
  return view
}

beforeEach(() => {
  vi.stubGlobal('IntersectionObserver', IntersectionObserverMock)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('SectionHeader', () => {
  it('renders both title lines and the description', async () => {
    await renderAtRoute(
      '/',
      <SectionHeader
        titlePrimary='Primary title'
        titleSecondary='Secondary title'
        description='Section description copy.'
      />
    )

    expect(
      screen.getByRole('heading', { level: 2, name: /Primary title/ })
    ).toBeInTheDocument()
    expect(screen.getByText(/Secondary title/)).toBeInTheDocument()
    expect(screen.getByText('Section description copy.')).toBeInTheDocument()
  })

  it('applies the clamp typography and the shine treatment to both title lines', async () => {
    const { container } = await renderAtRoute(
      '/',
      <SectionHeader
        titlePrimary='Primary title'
        titleSecondary='Secondary title'
        description='Section description copy.'
      />
    )

    const heading = screen.getByRole('heading', { level: 2 })
    const primary = heading.querySelector('.hero-title-shine')
    const secondary = heading.querySelector('.hero-title-shine-emerald')

    expect(primary).not.toBeNull()
    expect(primary?.className).toContain('text-[clamp(1.85rem,3.6vw,2.9rem)]')
    expect(secondary).not.toBeNull()
    expect(secondary?.className).toContain('text-[clamp(1.65rem,3.2vw,2.6rem)]')
    // The emerald gradient rule sits between the title and the description.
    expect(
      container.querySelector('.bg-gradient-to-r.from-emerald-500')
    ).not.toBeNull()
  })
})

describe('SectionPrimaryLink', () => {
  it('uses the hero CTA solid surface and links to the given route', async () => {
    await renderAtRoute(
      '/',
      <SectionPrimaryLink to='/dashboard' label='Go to console' />
    )

    const link = screen.getByRole('link', { name: 'Go to console' })
    expect(link).toHaveAttribute('href', '/dashboard')
    expect(link.className).toContain('bg-foreground')
    expect(link.className).toContain('text-background')
    // Hover lift plus the luminous sweep overlay.
    expect(link.className).toContain('hover:scale-[1.02]')
    expect(link.querySelector('.group-hover\\:translate-x-full')).not.toBeNull()
  })
})

describe('SectionTextLink', () => {
  it('renders a muted mono link with the arrow affordance', async () => {
    await renderAtRoute('/models', <SectionTextLink to='/models' label='Browse models' />)

    const link = screen.getByRole('link', { name: 'Browse models' })
    expect(link).toHaveAttribute('href', '/models')
    expect(link.className).toContain('font-mono')
    expect(link.className).toContain('text-muted-foreground')
    expect(link.querySelector('svg')).not.toBeNull()
  })
})

describe('SectionBackdrop and SectionDivider', () => {
  it('renders the ambient glow, grid texture and divider as decoration only', async () => {
    const { container } = await renderAtRoute(
      '/',
      <>
        <SectionBackdrop />
        <SectionDivider />
      </>
    )

    // Both are aria-hidden so they never reach assistive tech.
    const decorations = container.querySelectorAll('[aria-hidden="true"]')
    expect(decorations.length).toBeGreaterThanOrEqual(3)
    expect(container.querySelector('.bg-\\[size\\:4rem_4rem\\]')).not.toBeNull()
    // The glow is a soft radial wash, blurred well past a hairline so it reads
    // as ambient light rather than a painted band.
    const glow = container.querySelector<HTMLElement>(
      'div[aria-hidden="true"] > div:first-child'
    )
    expect(glow?.style.filter).toContain('blur(12px)')
  })

  it('fades the divider out at both ends instead of drawing a hard rule', async () => {
    const { container } = await renderAtRoute('/', <SectionDivider />)

    const hairline = container.querySelector<HTMLElement>(
      'div[aria-hidden="true"] > div:last-child'
    )
    expect(hairline).not.toBeNull()
    // A hairline, not a band: the old design painted a 3px blurred bar.
    expect(hairline?.className).toContain('h-px')
    // Both ends are fully transparent, so no section boundary is drawn.
    const background = hairline?.style.background ?? ''
    expect(background).toContain('linear-gradient')
    expect(background).toContain('transparent 0%')
    expect(background).toContain('transparent 100%')
  })
})

describe('SectionScrollCue', () => {
  it('scrolls to the target section when clicked', async () => {
    const user = userEvent.setup()
    const target = document.createElement('div')
    target.id = 'studio'
    const scrollIntoView = vi.fn()
    // src/test-setup.ts installs a no-op scrollIntoView; replace it with a spy
    // so the call and its options can be asserted.
    const spy = vi
      .spyOn(HTMLElement.prototype, 'scrollIntoView')
      .mockImplementation(scrollIntoView)
    document.body.appendChild(target)

    try {
      await renderAtRoute(
        '/',
        <SectionScrollCue target='studio' cue='Keep going' aside='Open the studio' />
      )

      const cue = screen.getByRole('button', { name: /Keep going/ })
      await user.click(cue)

      expect(scrollIntoView).toHaveBeenCalledTimes(1)
      expect(scrollIntoView.mock.calls[0][0]).toMatchObject({
        behavior: 'smooth',
        block: 'start',
      })
    } finally {
      spy.mockRestore()
      target.remove()
    }
  })

  it('falls back to the hero scroll copy when no cue text is given', async () => {
    await renderAtRoute('/', <SectionScrollCue target='models' />)

    // Defaults come from the hero keys, so every section reads the same way.
    expect(screen.getByRole('button', { name: /向下探索/ })).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /发现模型与能力/ })
    ).toBeInTheDocument()
  })

  it('sits at the bottom-left and keeps the hero bounce affordance', async () => {
    const { container } = await renderAtRoute(
      '/',
      <SectionScrollCue target='models' />
    )

    const cue = screen.getByRole('button', { name: /向下探索/ })
    // The cue is anchored to the section's bottom-left, aligned with max-w-7xl content.
    expect(cue.className).toContain('animate-bounce')
    const inner = cue.parentElement
    expect(inner?.className).toContain('justify-start')
    expect(inner?.className).toContain('max-w-7xl')
    const outer = inner?.parentElement
    expect(outer?.className).toContain('bottom-0')
    expect(container.querySelector('.animate-bounce')).not.toBeNull()
  })

  it('stops bouncing when the visitor prefers reduced motion', async () => {
    await renderAtRoute('/', <SectionScrollCue target='models' />)

    const cue = screen.getByRole('button', { name: /向下探索/ })
    expect(cue.className).toContain('motion-reduce:animate-none')
  })

  it('does nothing when the target section is absent', async () => {
    const user = userEvent.setup()
    await renderAtRoute('/', <SectionScrollCue target='missing-section' />)

    const cue = screen.getByRole('button')
    await expect(user.click(cue)).resolves.not.toThrow()
  })
})
