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

import { cn } from '@/lib/utils'
import { MOTION_TRANSITION } from '@/lib/motion'

import type { TopNavLink } from '../types'
import { useSlidingIndicator } from '../lib/use-sliding-indicator'

/**
 * Which header a pill rail lives in.
 *
 * - `marketing`: the public header. Taller glass capsule that floats over the
 *   page and settles into a floating pill once scrolled.
 * - `console`: the authenticated header. Compact rail inside the app bar.
 */
export type PillNavTone = 'marketing' | 'console'

/**
 * Vertical breathing room between the sliding indicator and the capsule edge.
 *
 * The indicator is sized from the slot's measured box, so subtracting this on
 * both axes keeps it centred inside the slot instead of butting against the
 * rail's border.
 */
const INDICATOR_INSET = 3

type ToneStyle = {
  /**
   * The surface the slots sit on. Empty means the links are drawn straight onto
   * whatever the host header provides, with no capsule of their own.
   */
  rail: string
  /** Height, radius and type size of a single slot. */
  slot: string
  /** The sliding highlight. */
  indicator: string
  /** Label colour for the selected slot. */
  active: string
  /** Label colour for an unselected slot. */
  inactive: string
}

const TONE_STYLES: Record<PillNavTone, ToneStyle> = {
  marketing: {
    // No rail: the public header's own bar is the surface, so the links sit
    // directly on it and only the indicator marks the selection.
    rail: '',
    slot: 'h-9 gap-1.5 rounded-full px-3 text-sm',
    // Light pill on the header bar, mirroring `TabsTrigger`'s selected state: it
    // reads as "raised" without the weight of an inverted dark fill. Mixing
    // toward `--foreground` keeps the pill above the bar in both themes, where
    // plain `bg-background` would invert in dark mode.
    indicator:
      'bg-foreground/[0.06] shadow-[0_1px_3px_rgba(0,0,0,0.06)] dark:bg-foreground/[0.12] dark:shadow-[0_1px_3px_rgba(0,0,0,0.3)]',
    active: 'text-foreground',
    inactive: 'text-muted-foreground hover:text-foreground',
  },
  console: {
    rail: 'bg-muted/50 ring-border/40 rounded-full ring-[0.5px]',
    slot: 'h-8 gap-1.5 rounded-full px-2.5 text-sm',
    // `--background` inverts between themes: it is the lighter surface in light
    // mode and the darker one in dark mode, so `bg-background` alone would read
    // as a hole in the track. Mix toward `--foreground` instead, which lifts the
    // pill above the track in both.
    indicator:
      'bg-foreground/[0.06] shadow-xs ring-border/50 ring-[0.5px] dark:bg-foreground/[0.10] dark:ring-border',
    active: 'text-foreground',
    inactive: 'text-muted-foreground hover:text-foreground',
  },
}

export type PillNavProps = {
  links: TopNavLink[]
  /** Which header the rail is rendered in. */
  tone?: PillNavTone
  /**
   * Resolve whether a link points at the current page. Kept as a prop so each
   * header keeps its own active-route rules.
   */
  isActive: (link: TopNavLink) => boolean
  /** Extra classes for the rail. */
  className?: string
}

/**
 * Glass capsule navigation with a sliding indicator.
 *
 * One rail renders every destination as a pill inside a shared capsule; the
 * selected pill is marked by a highlight that glides between slots rather than
 * each pill carrying its own border and shadow.
 *
 * Links, icons, labels and active-state rules all come from the caller, so this
 * component only owns the visual language — the same rail serves the public
 * header and the console header.
 */
export function PillNav(props: PillNavProps) {
  const { links, tone = 'console', isActive, className } = props
  const style = TONE_STYLES[tone]
  const shouldReduce = useReducedMotion()

  const items = links.map((link) => ({ key: `${link.title}:${link.href}` }))
  const activeIndex = links.findIndex((link) => isActive(link))
  const { state, railRef, registerItem } = useSlidingIndicator(items, activeIndex)

  const showIndicator = state.activeIndex >= 0 && !state.unmeasured

  return (
    <nav
      ref={railRef}
      className={cn(
        'no-scrollbar relative flex max-w-full items-center gap-0.5 overflow-x-auto',
        // Only the capsule tones carry their own inset; a bare rail draws its
        // slots straight onto the host header's surface.
        style.rail && 'p-0.5',
        style.rail,
        className
      )}
    >
      {showIndicator && (
        <motion.span
          aria-hidden='true'
          data-slot='pill-nav-indicator'
          className={cn(
            // `left-0` keeps the transform origin at the rail's border box, so
            // the measured offset is not doubled by the rail's own padding.
            'pointer-events-none absolute top-0 left-0 rounded-full',
            style.indicator
          )}
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
          transition={
            shouldReduce ? { duration: 0 } : MOTION_TRANSITION.spring
          }
        />
      )}

      {links.map((link, index) => {
        const active = index === activeIndex
        const Icon = link.icon

        const slotClassName = cn(
          'group/pill-nav-slot relative inline-flex min-w-0 shrink-0 items-center font-medium whitespace-nowrap transition-colors duration-200',
          style.slot,
          active ? style.active : style.inactive,
          link.disabled && 'pointer-events-none opacity-50',
          !active && 'hover:bg-foreground/[0.04]'
        )

        const content = (
          <>
            {Icon && (
              <HugeiconsIcon
                icon={Icon}
                aria-hidden='true'
                data-slot='pill-nav-icon'
                className='size-4 shrink-0'
              />
            )}
            <span className='truncate'>{link.title}</span>
          </>
        )

        if (link.external) {
          return (
            <a
              key={items[index].key}
              ref={registerItem(index)}
              href={link.href}
              title={link.title}
              target='_blank'
              rel='noopener noreferrer'
              aria-disabled={link.disabled}
              aria-current={active ? 'page' : undefined}
              tabIndex={link.disabled ? -1 : undefined}
              className={slotClassName}
            >
              {content}
            </a>
          )
        }

        return (
          <Link
            key={items[index].key}
            ref={registerItem(index)}
            to={link.href}
            title={link.title}
            disabled={link.disabled}
            aria-current={active ? 'page' : undefined}
            className={slotClassName}
          >
            {content}
          </Link>
        )
      })}
    </nav>
  )
}
