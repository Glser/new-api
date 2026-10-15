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
import { Menu01Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { Link, useRouterState } from '@tanstack/react-router'
import { useMemo } from 'react'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

import { resolveTopNavIcon } from '../config/top-nav-icons'
import { isTopNavLinkActive } from '../lib/url-utils'
import type { TopNavLink } from '../types'
import { TopNavLinkItem } from './top-nav-link'

/** Shared label classes so the dropdown and the inline bar read the same. */
const LABEL_CLASS = 'flex items-center gap-2 [&_svg]:size-4 [&_svg]:shrink-0'

type TopNavProps = React.HTMLAttributes<HTMLElement> & {
  links: TopNavLink[]
}

/**
 * 顶部导航栏组件
 * 在大屏幕显示水平导航，在小屏幕显示下拉菜单
 */
export function TopNav({ className, links, ...props }: TopNavProps) {
  const routerState = useRouterState()
  const pathname = routerState.location.pathname

  // 规范化链接：补齐默认值，并按当前路径推断选中项与图标
  const normalizedLinks = useMemo(
    () =>
      links.map((link) => ({
        ...link,
        isActive: link.isActive ?? isTopNavLinkActive(pathname, link.href),
        disabled: link.disabled ?? false,
        external: link.external ?? false,
        icon: link.icon ?? resolveTopNavIcon(link.href, link.external),
      })),
    [links, pathname]
  )

  return (
    <>
      {/* 移动端下拉菜单 */}
      <div className='lg:hidden'>
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger
            render={<Button size='icon' variant='outline' className='size-7' />}
          >
            <HugeiconsIcon icon={Menu01Icon} className='size-4' />
          </DropdownMenuTrigger>
          <DropdownMenuContent side='bottom' align='start'>
            {normalizedLinks.map(
              ({ title, href, isActive, disabled, external, icon: Icon }) => (
                <DropdownMenuItem
                  key={`${title}-${href}`}
                  render={
                    external ? (
                      <a
                        href={href}
                        target='_blank'
                        rel='noopener noreferrer'
                        className={cn(
                          LABEL_CLASS,
                          !isActive && 'text-muted-foreground'
                        )}
                      >
                        {Icon && (
                          <HugeiconsIcon icon={Icon} aria-hidden='true' />
                        )}
                        {title}
                      </a>
                    ) : (
                      <Link
                        to={href}
                        className={cn(
                          LABEL_CLASS,
                          !isActive && 'text-muted-foreground'
                        )}
                        disabled={disabled}
                      >
                        {Icon && (
                          <HugeiconsIcon icon={Icon} aria-hidden='true' />
                        )}
                        {title}
                      </Link>
                    )
                  }
                />
              )
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* 桌面端水平导航 */}
      <nav
        className={cn(
          'hidden items-center gap-1 lg:flex xl:gap-1.5',
          className
        )}
        {...props}
      >
        {normalizedLinks.map((link) => (
          <TopNavLinkItem
            key={`${link.title}-${link.href}`}
            link={link}
            label={link.title}
            active={link.isActive}
          />
        ))}
      </nav>
    </>
  )
}
