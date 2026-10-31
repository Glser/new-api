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
import { HugeiconsIcon } from '@hugeicons/react'
import { Link } from '@tanstack/react-router'
import { motion, useReducedMotion } from 'motion/react'

import { TooltipHint } from '@/components/ui/tooltip'
import { MOTION_TRANSITION } from '@/lib/motion'
import { cn } from '@/lib/utils'

import { useSlidingIndicator } from '../lib/use-sliding-indicator'
import type { TopNavLink } from '../types'

/**
 * Vertical and horizontal breathing room between the sliding indicator and the
 * sheet's edge, so the highlight reads as centred inside each row.
 */
const INDICATOR_INSET = 4

export type PillNavSheetProps = {
  links: TopNavLink[]
  /** Whether the sheet is open; drives the entry and exit animation. */
  open: boolean
  /** Resolve whether a link points at the current page. */
  isActive: (link: TopNavLink) => boolean
  /**
   * Intercept a click before navigation, e.g. to gate an auth-required
   * destination. Return normally to let the link through.
   */
  onLinkClick?: (
    event: React.MouseEvent<HTMLAnchorElement>,
    link: TopNavLink
  ) => void
  /** Extra classes for the stacked list. */
  className?: string
}

/**
 * Mobile destination list for the glass pill navigation.
 *
 * Same link contract, icons and active-state rules as {@link PillNav}, stacked
 * vertically inside one glass capsule so the small-screen sheet reads as the
 * same navigation rather than a different component.
 */
export function PillNavSheet(props: PillNavSheetProps) {
  const { links, open, isActive, onLinkClick, className } = props
  const shouldReduce = useReducedMotion()

  const items = links.map((link) => ({ key: `${link.title}:${link.href}` }))
  const activeIndex = links.findIndex((link) => isActive(link))
  const { state, railRef, registerItem } = useSlidingIndicator(
    items,
    activeIndex
  )

  const showIndicator = state.activeIndex >= 0 && !state.unmeasured

  return (
    <motion.div
      ref={railRef}
      className={cn(
        'bg-muted/40 ring-border/50 relative flex flex-col gap-0.5 rounded-3xl p-1.5 ring-[0.5px] backdrop-blur-md',
        className
      )}
      initial={shouldReduce ? false : { opacity: 0, y: -8 }}
      animate={open ? { opacity: 1, y: 0 } : { opacity: 0, y: -8 }}
      transition={MOTION_TRANSITION.default}
    >
      {showIndicator && (
        <motion.span
          aria-hidden='true'
          data-slot='pill-nav-sheet-indicator'
          className='bg-foreground/[0.05] dark:bg-foreground/[0.10] pointer-events-none absolute top-0 left-0 rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.06)] dark:shadow-[0_1px_3px_rgba(0,0,0,0.3)]'
          initial={false}
          animate={
            shouldReduce
              ? { opacity: 0 }
              : {
                  x: state.offsetX + INDICATOR_INSET,
                  y: state.offsetY + INDICATOR_INSET,
                  width: Math.max(state.width - INDICATOR_INSET * 2, 0),
                  height: Math.max(state.height - INDICATOR_INSET * 2, 0),
                  opacity: 1,
                }
          }
          transition={shouldReduce ? { duration: 0 } : MOTION_TRANSITION.spring}
        />
      )}

      {links.map((link, index) => {
        const active = index === activeIndex
        const Icon = link.icon

        const slotClassName = cn(
          'relative flex min-w-0 items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium whitespace-nowrap transition-colors duration-200',
          active
            ? 'text-foreground'
            : 'text-muted-foreground hover:text-foreground',
          link.disabled && 'pointer-events-none opacity-50'
        )

        const content = (
          <>
            {Icon && (
              <HugeiconsIcon
                icon={Icon}
                aria-hidden='true'
                className='size-5 shrink-0'
              />
            )}
            <span className='min-w-0 flex-1 truncate'>{link.title}</span>
          </>
        )

        if (link.external) {
          return (
            <TooltipHint key={items[index].key} content={link.title}>
              <a
                ref={registerItem(index)}
                href={link.href}
                target='_blank'
                rel='noopener noreferrer'
                aria-disabled={link.disabled}
                aria-current={active ? 'page' : undefined}
                tabIndex={link.disabled ? -1 : undefined}
                onClick={(event) => onLinkClick?.(event, link)}
                className={slotClassName}
              >
                {content}
              </a>
            </TooltipHint>
          )
        }

        return (
          <TooltipHint key={items[index].key} content={link.title}>
            <Link
              ref={registerItem(index)}
              to={link.href}
              disabled={link.disabled}
              aria-current={active ? 'page' : undefined}
              onClick={(event) => onLinkClick?.(event, link)}
              className={slotClassName}
            >
              {content}
            </Link>
          </TooltipHint>
        )
      })}
    </motion.div>
  )
}
