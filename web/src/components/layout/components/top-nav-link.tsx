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
import { LinkSquare02Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { Link } from '@tanstack/react-router'

import { cn } from '@/lib/utils'

import { resolveTopNavIcon } from '../config/top-nav-icons'
import type { TopNavLink } from '../types'

/**
 * Which header a top-nav link lives in.
 *
 * - `marketing`: the public header. Bordered pills floating on the glass
 *   capsule, with the hover sheen used by the landing page buttons.
 * - `console`: the authenticated header. Compact accent pills that stay
 *   quiet inside the 3rem app bar.
 */
export type TopNavTone = 'marketing' | 'console'

type ToneStyle = {
  /** Shell: height, radius, padding and type size. */
  shell: string
  /** Selected state. */
  active: string
  /** Resting state. */
  inactive: string
  /** Sweep a sheen across the pill on hover. */
  sheen: boolean
  /** Draw the emerald underline that marks the selected pill. */
  accent: boolean
}

const TONE_STYLES: Record<TopNavTone, ToneStyle> = {
  marketing: {
    shell:
      'h-9 gap-1.5 rounded-full border px-3 text-base font-medium tracking-tight',
    active:
      'border-transparent bg-foreground text-background shadow-[0_4px_14px_rgba(0,0,0,0.12)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.18)] dark:shadow-[0_4px_18px_rgba(255,255,255,0.06)]',
    inactive:
      'border-border/70 bg-card/40 text-muted-foreground backdrop-blur-md hover:border-foreground/25 hover:bg-card/80 hover:text-foreground hover:shadow-[0_4px_16px_rgba(0,0,0,0.04)]',
    sheen: true,
    accent: true,
  },
  console: {
    shell:
      'h-8 gap-1.5 rounded-lg px-2.5 text-[0.9375rem] font-medium tracking-tight',
    active: 'bg-accent text-foreground shadow-xs',
    inactive: 'text-muted-foreground hover:bg-accent/60 hover:text-foreground',
    sheen: false,
    accent: false,
  },
}

type TopNavLinkItemProps = {
  link: TopNavLink
  /** Rendered label; callers pass it through `t()` so it follows the locale. */
  label: React.ReactNode
  /** Whether the link points at the current page. */
  active?: boolean
  tone?: TopNavTone
  className?: string
  onClick?: (event: React.MouseEvent<HTMLAnchorElement>) => void
}

/**
 * One top-nav destination: glyph + label inside a pill.
 *
 * Shared by the public header and the console header so both stay in the same
 * visual language, and so icon resolution, disabled handling and external-link
 * attributes live in exactly one place.
 */
export function TopNavLinkItem(props: TopNavLinkItemProps) {
  const { link, label, active = false, tone = 'console', className } = props
  const style = TONE_STYLES[tone]
  const Icon = link.icon ?? resolveTopNavIcon(link.href, link.external)
  const title = typeof label === 'string' ? label : undefined

  const shellClassName = cn(
    'group/top-nav-link relative inline-flex min-w-0 items-center overflow-hidden font-medium transition duration-200',
    style.shell,
    active ? style.active : style.inactive,
    link.disabled && 'pointer-events-none opacity-50',
    className
  )

  const content = (
    <>
      {style.sheen && (
        <span
          aria-hidden='true'
          data-slot='top-nav-sheen'
          className={cn(
            'pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent to-transparent transition-transform duration-700 ease-out group-hover/top-nav-link:translate-x-full',
            active ? 'via-white/25' : 'via-foreground/[0.07]'
          )}
        />
      )}
      {Icon && (
        <HugeiconsIcon
          icon={Icon}
          aria-hidden='true'
          data-slot='top-nav-icon'
          className={cn(
            'size-4 shrink-0',
            tone === 'console' && active && 'text-primary'
          )}
        />
      )}
      <span className='truncate'>{label}</span>
      {style.accent && active && (
        <span
          aria-hidden='true'
          data-slot='top-nav-accent'
          className='pointer-events-none absolute inset-x-3.5 bottom-1 h-px rounded-full bg-gradient-to-r from-transparent via-emerald-400 to-transparent'
        />
      )}
    </>
  )

  if (link.external) {
    return (
      <a
        href={link.href}
        title={title}
        target='_blank'
        rel='noopener noreferrer'
        aria-disabled={link.disabled}
        aria-current={active ? 'page' : undefined}
        tabIndex={link.disabled ? -1 : undefined}
        onClick={props.onClick}
        className={shellClassName}
      >
        {content}
      </a>
    )
  }

  return (
    <Link
      to={link.href}
      title={title}
      disabled={link.disabled}
      aria-current={active ? 'page' : undefined}
      onClick={props.onClick}
      className={shellClassName}
    >
      {content}
    </Link>
  )
}

type TopNavMobileLinkProps = {
  link: TopNavLink
  /** Rendered label; callers pass it through `t()` so it follows the locale. */
  label: React.ReactNode
  /** Whether the link points at the current page. */
  active?: boolean
  /** Extra classes, e.g. the staggered entry animation of the mobile sheet. */
  className?: string
  style?: React.CSSProperties
  onClick?: (event: React.MouseEvent<HTMLAnchorElement>) => void
}

/**
 * Full-width destination row used by the public header's mobile sheet.
 *
 * Same link contract as `TopNavLinkItem`, but laid out as a list row with a
 * glyph tile so the stacked sheet does not read like a row of tiny pills.
 */
export function TopNavMobileLink(props: TopNavMobileLinkProps) {
  const { link, label, active = false, className, style } = props
  const Icon = link.icon ?? resolveTopNavIcon(link.href, link.external)
  const title = typeof label === 'string' ? label : undefined

  const shellClassName = cn(
    'group/top-nav-link relative flex min-w-0 items-center gap-3.5 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]',
    active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
    link.disabled && 'pointer-events-none opacity-50',
    className
  )

  const content = (
    <>
      {active && (
        <span
          aria-hidden='true'
          data-slot='top-nav-mobile-accent'
          className='absolute inset-y-2 left-0 w-0.5 rounded-full bg-gradient-to-b from-emerald-400 to-teal-500'
        />
      )}
      <span
        aria-hidden='true'
        className={cn(
          'flex size-10 shrink-0 items-center justify-center rounded-xl transition-colors duration-200',
          active
            ? 'bg-foreground text-background shadow-[0_4px_14px_rgba(0,0,0,0.12)]'
            : 'bg-muted/60 text-muted-foreground group-hover/top-nav-link:bg-muted group-hover/top-nav-link:text-foreground'
        )}
      >
        {Icon && <HugeiconsIcon icon={Icon} className='size-5' />}
      </span>
      <span className='min-w-0 flex-1 truncate text-lg font-medium tracking-tight'>
        {label}
      </span>
      {link.external && (
        <HugeiconsIcon
          icon={LinkSquare02Icon}
          aria-hidden='true'
          className='size-4 shrink-0 opacity-50'
        />
      )}
    </>
  )

  if (link.external) {
    return (
      <a
        href={link.href}
        title={title}
        target='_blank'
        rel='noopener noreferrer'
        aria-disabled={link.disabled}
        aria-current={active ? 'page' : undefined}
        tabIndex={link.disabled ? -1 : undefined}
        onClick={props.onClick}
        className={shellClassName}
        style={style}
      >
        {content}
      </a>
    )
  }

  return (
    <Link
      to={link.href}
      title={title}
      disabled={link.disabled}
      aria-current={active ? 'page' : undefined}
      onClick={props.onClick}
      className={shellClassName}
      style={style}
    >
      {content}
    </Link>
  )
}
