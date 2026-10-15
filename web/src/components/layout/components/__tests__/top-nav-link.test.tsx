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
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'

import type { TopNavLink } from '../../types'
import { TopNavLinkItem, TopNavMobileLink } from '../top-nav-link'

/**
 * Destinations the internal links under test can point at. Registering them as
 * sibling routes lets TanStack `<Link>` resolve a real `href` inside jsdom.
 * `/custom` intentionally has no glyph mapping so degradation can be checked.
 */
const LINK_TARGETS = [
  '/dashboard',
  '/pricing',
  '/rankings',
  '/docs',
  '/about',
  '/custom',
]

async function renderInRouter(ui: ReactNode, initialPath = '/') {
  const rootRoute = createRootRoute({ component: () => ui })
  const childRoutes = LINK_TARGETS.map((path) =>
    createRoute({
      getParentRoute: () => rootRoute,
      path,
      component: () => null,
    })
  )
  const router = createRouter({
    routeTree: rootRoute.addChildren(childRoutes),
    history: createMemoryHistory({ initialEntries: [initialPath] }),
  })
  const view = render(<RouterProvider router={router} />)
  await router.load()
  return view
}

function topNavLink(overrides: Partial<TopNavLink> & Pick<TopNavLink, 'href'>) {
  return { title: overrides.href, ...overrides }
}

describe('TopNavLinkItem', () => {
  it('renders the label and a glyph for a known destination', async () => {
    await renderInRouter(
      <TopNavLinkItem link={topNavLink({ href: '/docs' })} label='Docs' />
    )

    const link = screen.getByRole('link', { name: 'Docs' })
    expect(link).toHaveAttribute('href', '/docs')
    expect(link.querySelector("[data-slot='top-nav-icon']")).not.toBeNull()
  })

  it('marks the active link with aria-current and leaves the rest unmarked', async () => {
    await renderInRouter(
      <>
        <TopNavLinkItem
          link={topNavLink({ href: '/docs' })}
          label='Docs'
          active
        />
        <TopNavLinkItem link={topNavLink({ href: '/about' })} label='About' />
      </>
    )

    expect(screen.getByRole('link', { name: 'Docs' })).toHaveAttribute(
      'aria-current',
      'page'
    )
    expect(screen.getByRole('link', { name: 'About' })).not.toHaveAttribute(
      'aria-current'
    )
  })

  it('draws the emerald accent only under the active marketing pill', async () => {
    await renderInRouter(
      <>
        <TopNavLinkItem
          tone='marketing'
          link={topNavLink({ href: '/docs' })}
          label='Docs'
          active
        />
        <TopNavLinkItem
          tone='marketing'
          link={topNavLink({ href: '/about' })}
          label='About'
        />
      </>
    )

    expect(
      screen
        .getByRole('link', { name: 'Docs' })
        .querySelector("[data-slot='top-nav-accent']")
    ).not.toBeNull()
    expect(
      screen
        .getByRole('link', { name: 'About' })
        .querySelector("[data-slot='top-nav-accent']")
    ).toBeNull()
  })

  it('shows the hover sheen in the marketing tone but not the console tone', async () => {
    await renderInRouter(
      <>
        <TopNavLinkItem
          tone='marketing'
          link={topNavLink({ href: '/docs' })}
          label='Docs'
        />
        <TopNavLinkItem
          tone='console'
          link={topNavLink({ href: '/about' })}
          label='About'
        />
      </>
    )

    expect(
      screen
        .getByRole('link', { name: 'Docs' })
        .querySelector("[data-slot='top-nav-sheen']")
    ).not.toBeNull()
    expect(
      screen
        .getByRole('link', { name: 'About' })
        .querySelector("[data-slot='top-nav-sheen']")
    ).toBeNull()
  })

  it('tints the console icon with the primary color only when active', async () => {
    await renderInRouter(
      <>
        <TopNavLinkItem
          link={topNavLink({ href: '/docs' })}
          label='Docs'
          active
        />
        <TopNavLinkItem link={topNavLink({ href: '/about' })} label='About' />
      </>
    )

    const activeIcon = screen
      .getByRole('link', { name: 'Docs' })
      .querySelector("[data-slot='top-nav-icon']")
    const idleIcon = screen
      .getByRole('link', { name: 'About' })
      .querySelector("[data-slot='top-nav-icon']")
    expect(activeIcon?.getAttribute('class')).toContain('text-primary')
    expect(idleIcon?.getAttribute('class')).not.toContain('text-primary')
  })

  it('renders external links as safe new-tab anchors', async () => {
    await renderInRouter(
      <TopNavLinkItem
        link={topNavLink({ href: 'https://docs.example.com', external: true })}
        label='Docs'
      />
    )

    const link = screen.getByRole('link', { name: 'Docs' })
    expect(link).toHaveAttribute('href', 'https://docs.example.com')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('marks a disabled internal link as non-interactive', async () => {
    await renderInRouter(
      <TopNavLinkItem
        link={topNavLink({ href: '/docs', disabled: true })}
        label='Docs'
      />
    )

    const link = screen.getByRole('link', { name: 'Docs' })
    expect(link).toHaveAttribute('aria-disabled', 'true')
    expect(link.getAttribute('class')).toContain('pointer-events-none')
    // A disabled internal link drops its href, so there is nothing to follow.
    expect(link).not.toHaveAttribute('href')
  })

  it('marks a disabled external link as non-interactive and unfocusable', async () => {
    await renderInRouter(
      <TopNavLinkItem
        link={topNavLink({
          href: 'https://docs.example.com',
          external: true,
          disabled: true,
        })}
        label='Docs'
      />
    )

    const link = screen.getByRole('link', { name: 'Docs' })
    expect(link).toHaveAttribute('aria-disabled', 'true')
    expect(link).toHaveAttribute('tabindex', '-1')
    expect(link.getAttribute('class')).toContain('pointer-events-none')
  })

  it('degrades to a plain label when the destination has no glyph', async () => {
    await renderInRouter(
      <TopNavLinkItem link={topNavLink({ href: '/custom' })} label='Custom' />
    )

    const link = screen.getByRole('link', { name: 'Custom' })
    expect(link).toHaveAttribute('href', '/custom')
    expect(link.querySelector("[data-slot='top-nav-icon']")).toBeNull()
  })

  it('forwards clicks to the caller handler', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn((event: React.MouseEvent<HTMLAnchorElement>) => {
      event.preventDefault()
    })
    await renderInRouter(
      <TopNavLinkItem
        link={topNavLink({ href: '/docs' })}
        label='Docs'
        onClick={onClick}
      />
    )

    await user.click(screen.getByRole('link', { name: 'Docs' }))
    expect(onClick).toHaveBeenCalledTimes(1)
  })
})

describe('TopNavMobileLink', () => {
  it('renders a full-width row with the label and a glyph', async () => {
    await renderInRouter(
      <TopNavMobileLink link={topNavLink({ href: '/docs' })} label='Docs' />
    )

    const link = screen.getByRole('link', { name: 'Docs' })
    expect(link).toHaveAttribute('href', '/docs')
    // The only inline SVG in a non-external row is the glyph.
    expect(link.querySelector('svg')).not.toBeNull()
  })

  it('marks the active row and draws the emerald rail', async () => {
    await renderInRouter(
      <TopNavMobileLink
        link={topNavLink({ href: '/docs' })}
        label='Docs'
        active
      />
    )

    const link = screen.getByRole('link', { name: 'Docs' })
    expect(link).toHaveAttribute('aria-current', 'page')
    expect(
      link.querySelector("[data-slot='top-nav-mobile-accent']")
    ).not.toBeNull()
  })

  it('omits the rail and the current marker when inactive', async () => {
    await renderInRouter(
      <TopNavMobileLink link={topNavLink({ href: '/docs' })} label='Docs' />
    )

    const link = screen.getByRole('link', { name: 'Docs' })
    expect(link).not.toHaveAttribute('aria-current')
    expect(link.querySelector("[data-slot='top-nav-mobile-accent']")).toBeNull()
  })

  it('renders external rows as safe new-tab anchors', async () => {
    await renderInRouter(
      <TopNavMobileLink
        link={topNavLink({ href: 'https://docs.example.com', external: true })}
        label='Docs'
      />
    )

    const link = screen.getByRole('link', { name: 'Docs' })
    expect(link).toHaveAttribute('href', 'https://docs.example.com')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('marks a disabled row as non-interactive', async () => {
    await renderInRouter(
      <TopNavMobileLink
        link={topNavLink({ href: '/docs', disabled: true })}
        label='Docs'
      />
    )

    const link = screen.getByRole('link', { name: 'Docs' })
    expect(link).toHaveAttribute('aria-disabled', 'true')
    expect(link.getAttribute('class')).toContain('pointer-events-none')
  })

  it('applies caller className and inline style for the staggered entry', async () => {
    await renderInRouter(
      <TopNavMobileLink
        link={topNavLink({ href: '/docs' })}
        label='Docs'
        className='py-3 opacity-0'
        style={{ transitionDelay: '150ms' }}
      />
    )

    const link = screen.getByRole('link', { name: 'Docs' })
    expect(link.getAttribute('class')).toContain('py-3')
    expect(link.getAttribute('class')).toContain('opacity-0')
    expect(link.style.transitionDelay).toBe('150ms')
  })
})
