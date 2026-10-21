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
  Book02Icon,
  DashboardSquare01Icon,
  Home01Icon,
  InformationCircleIcon,
  LinkSquare02Icon,
  RankingIcon,
  BrainCircuitIcon,
} from '@hugeicons/core-free-icons'
import type { IconSvgElement } from '@hugeicons/react'

import type { TopNavLink } from '../types'

/**
 * Glyphs for the destinations the top navigation can point at.
 *
 * Keyed by path so the marketing header (`PublicHeader`) and the console
 * header (`TopNav`) draw the same icon for the same destination. Unknown
 * paths resolve to `undefined`, so a backend-configured link degrades to a
 * plain label instead of breaking the header.
 */
const TOP_NAV_ICONS_BY_HREF: Record<string, IconSvgElement> = {
  '/': Home01Icon,
  '/dashboard': DashboardSquare01Icon,
  '/pricing': BrainCircuitIcon,
  '/rankings': RankingIcon,
  '/docs': Book02Icon,
  '/about': InformationCircleIcon,
}

/** Glyph for links that leave the app, e.g. a backend-configured docs URL. */
const EXTERNAL_TOP_NAV_ICON: IconSvgElement = LinkSquare02Icon

/**
 * Resolve the glyph for a single top-nav link.
 *
 * @param href Destination stored on the link.
 * @param external Whether the link opens outside the app.
 * @returns The icon component, or `undefined` when the path is unknown.
 */
export function resolveTopNavIcon(
  href: string,
  external?: boolean
): IconSvgElement | undefined {
  if (external) return EXTERNAL_TOP_NAV_ICON
  return TOP_NAV_ICONS_BY_HREF[href]
}

/**
 * Fill in the `icon` field for every link that does not carry one already.
 *
 * Both headers build their link list from `useTopNavLinks()` with a static
 * fallback, so resolving here keeps the glyph mapping in a single place.
 */
export function withTopNavIcons(links: TopNavLink[]): TopNavLink[] {
  return links.map((link) => ({
    ...link,
    icon: link.icon ?? resolveTopNavIcon(link.href, link.external),
  }))
}
