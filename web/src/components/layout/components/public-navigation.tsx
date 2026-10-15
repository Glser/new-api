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
import { useRouterState } from '@tanstack/react-router'

import { useTopNavLinks } from '@/hooks/use-top-nav-links'
import { cn } from '@/lib/utils'

import { withTopNavIcons } from '../config/top-nav-icons'
import { defaultTopNavLinks } from '../config/top-nav.config'
import { isTopNavLinkActive } from '../lib/url-utils'
import type { TopNavLink } from '../types'
import { TopNavLinkItem } from './top-nav-link'

interface PublicNavigationProps {
  /**
   * Custom navigation links
   * If not provided, will use dynamic links from backend or defaults
   */
  links?: TopNavLink[]
  /**
   * Additional className
   */
  className?: string
}

/**
 * Public navigation component that matches Launch UI template styling
 * Used in PublicHeader for desktop navigation
 */
export function PublicNavigation({
  links: providedLinks,
  className,
}: PublicNavigationProps = {}) {
  // Use the same logic as AppHeader: prioritize dynamic links from backend
  const dynamicLinks = useTopNavLinks()
  const defaultLinks = providedLinks || defaultTopNavLinks
  const links = withTopNavIcons(
    dynamicLinks.length > 0 ? dynamicLinks : defaultLinks
  )
  const routerState = useRouterState()
  const pathname = routerState.location.pathname

  return (
    <nav className={cn('hidden items-center gap-1 md:flex', className)}>
      {links.map((link) => (
        <TopNavLinkItem
          key={`${link.title}:${link.href}`}
          link={link}
          tone='marketing'
          label={link.title}
          active={isTopNavLinkActive(pathname, link.href)}
        />
      ))}
    </nav>
  )
}
