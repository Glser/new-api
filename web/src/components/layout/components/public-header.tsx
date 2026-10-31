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
import { Link, useNavigate, useRouterState } from '@tanstack/react-router'
import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Dialog } from '@/components/dialog'
import { LanguageSwitcher } from '@/components/language-switcher'
import { NotificationPopover } from '@/components/notification-popover'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { ThemeSwitch } from '@/components/theme-switch'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { TooltipHint } from '@/components/ui/tooltip'
import { useSystemConfig } from '@/hooks/use-system-config'
import { useTopNavLinks } from '@/hooks/use-top-nav-links'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth-store'

import { withTopNavIcons } from '../config/top-nav-icons'
import { defaultTopNavLinks } from '../config/top-nav.config'
import { isTopNavLinkActive } from '../lib/url-utils'
import type { TopNavLink } from '../types'
import { HeaderLogo } from './header-logo'
import { PillNav } from './pill-nav'
import { PillNavSheet } from './pill-nav-sheet'

const AUTH_PROMPT_SECONDS = 5

type AuthPromptTarget = {
  title: string
  href: string
}

export interface PublicHeaderProps {
  navLinks?: TopNavLink[]
  mobileLinks?: TopNavLink[]
  navContent?: React.ReactNode
  showThemeSwitch?: boolean
  showLanguageSwitcher?: boolean
  logo?: React.ReactNode
  siteName?: string
  homeUrl?: string
  leftContent?: React.ReactNode
  rightContent?: React.ReactNode
  showNavigation?: boolean
  showAuthButtons?: boolean
  showNotifications?: boolean
  className?: string
}

export function PublicHeader(props: PublicHeaderProps) {
  const {
    navLinks = defaultTopNavLinks,
    showThemeSwitch = true,
    showLanguageSwitcher = true,
    logo: customLogo,
    siteName: customSiteName,
    homeUrl = '/',
    showAuthButtons = true,
    showNotifications = true,
  } = props

  const { t } = useTranslation()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [authPromptTarget, setAuthPromptTarget] =
    useState<AuthPromptTarget | null>(null)
  const [authPromptSecondsLeft, setAuthPromptSecondsLeft] =
    useState(AUTH_PROMPT_SECONDS)
  const { auth } = useAuthStore()
  const {
    systemName,
    logo: systemLogo,
    loading,
    logoLoaded,
  } = useSystemConfig()
  const dynamicLinks = useTopNavLinks()
  const pathname = useRouterState({ select: (s) => s.location.pathname })

  const user = auth.user
  const isAuthenticated = !!user
  const displaySiteName = customSiteName || systemName
  const links = withTopNavIcons(
    dynamicLinks.length > 0 ? dynamicLinks : navLinks
  )
  let logoContent: React.ReactNode
  if (loading) {
    logoContent = <Skeleton className='size-full rounded-lg' />
  } else if (customLogo) {
    logoContent = customLogo
  } else {
    logoContent = (
      <HeaderLogo
        src={systemLogo}
        alt={displaySiteName}
        loading={loading}
        logoLoaded={logoLoaded}
        className='h-full w-full'
      />
    )
  }

  let authContent: React.ReactNode
  if (loading) {
    authContent = <Skeleton className='h-8 w-20 rounded-full' />
  } else if (isAuthenticated) {
    authContent = <ProfileDropdown />
  } else {
    authContent = (
      <Link
        to='/sign-in'
        className={cn(
          'group relative inline-flex h-8 cursor-pointer items-center justify-center overflow-hidden rounded-full px-4 text-xs font-semibold tracking-tight select-none transition-all duration-300',
          // 质感黑白对比度 + 极细内边框发光设计
          'bg-foreground text-background shadow-[0_1px_2px_rgba(0,0,0,0.1),0_0_0_1px_rgba(0,0,0,0.08)]',
          'hover:-translate-y-px hover:shadow-[0_6px_18px_rgba(0,0,0,0.18)] active:translate-y-px',
          'dark:bg-foreground dark:text-background dark:shadow-[0_1px_2px_rgba(0,0,0,0.5),0_0_0_1px_rgba(255,255,255,0.15)]',
          'dark:hover:shadow-[0_6px_20px_rgba(255,255,255,0.12)]'
        )}
      >
        {/* Luminous overlay wave on hover (与首页进入控制台按钮同款微光波流淌效果) */}
        <span
          aria-hidden='true'
          className='pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 ease-out group-hover:translate-x-full dark:via-black/20'
        />
        <span className='relative z-1 flex items-center gap-1.5'>
          {t('Sign in')}
        </span>
      </Link>
    )
  }

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [mobileOpen])

  useEffect(() => {
    if (!authPromptTarget) return

    const intervalId = window.setInterval(() => {
      setAuthPromptSecondsLeft((seconds) => Math.max(seconds - 1, 0))
    }, 1000)

    const timeoutId = window.setTimeout(() => {
      const redirect = authPromptTarget.href
      setAuthPromptTarget(null)
      navigate({ to: '/sign-in', search: { redirect } })
    }, AUTH_PROMPT_SECONDS * 1000)

    return () => {
      window.clearInterval(intervalId)
      window.clearTimeout(timeoutId)
    }
  }, [authPromptTarget, navigate])

  const closeAuthPrompt = useCallback(() => {
    setAuthPromptTarget(null)
    setAuthPromptSecondsLeft(AUTH_PROMPT_SECONDS)
  }, [])

  const navigateToSignIn = useCallback(() => {
    const redirect = authPromptTarget?.href || '/'
    setAuthPromptTarget(null)
    navigate({ to: '/sign-in', search: { redirect } })
  }, [authPromptTarget?.href, navigate])

  const handleNavLinkClick = useCallback(
    (
      event: React.MouseEvent<HTMLAnchorElement>,
      link: TopNavLink,
      closeMobile = false
    ) => {
      if (link.disabled) {
        event.preventDefault()
        return
      }

      if (link.requiresAuth) {
        event.preventDefault()
        if (closeMobile) {
          setMobileOpen(false)
        }
        setAuthPromptSecondsLeft(AUTH_PROMPT_SECONDS)
        setAuthPromptTarget({
          title: t(link.title),
          href: link.href,
        })
        return
      }

      if (closeMobile) {
        setMobileOpen(false)
      }
    },
    [t]
  )

  return (
    <>
      <header className='pointer-events-none fixed inset-x-0 top-0 z-50'>
        {/* The bar itself is the width-constraining, centred layer — no extra
            wrapper between `header` and the visible nav. */}
        <nav
          className={cn(
            'pointer-events-auto relative mx-auto flex items-center justify-between gap-2 transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]',
            // The bar always carries its own surface: a slightly deeper tint than
            // the page, wrapping brand, links and actions in one layer.
            // `bg-background` alone would make the bar the same colour as the
            // page it floats over, so the bar uses a surface that lifts off it:
            // `--card` in light mode, and a `--foreground` mix in dark mode
            // where `--card` sits too close to `--background` to read as raised.
            'bg-card/70 ring-border/40 h-12 rounded-2xl px-4 ring-[0.5px] backdrop-blur-2xl',
            'dark:bg-foreground/[0.07] dark:ring-white/10',
            'shadow-[0_2px_16px_-6px_rgba(0,0,0,0.08),0_0_0_0.5px_rgba(0,0,0,0.02)] dark:shadow-[0_2px_16px_-6px_rgba(0,0,0,0.4)]',
            'mt-3 max-w-4xl'
          )}
        >
          {/* Logo */}
          <div className='z-1 flex min-w-0 shrink-0 items-center gap-1'>
            <Link
              to={homeUrl}
              className='group flex min-w-0 items-center gap-2'
            >
              <div className='flex size-8 shrink-0 -translate-y-0.5 items-center justify-center transition-all duration-300 group-hover:scale-105'>
                {logoContent}
              </div>
              <TooltipHint content={displaySiteName}>
                <span className='max-w-48 truncate text-[0.9375rem] leading-none font-semibold tracking-tight'>
                  {loading ? (
                    <Skeleton className='h-4 w-16' />
                  ) : (
                    displaySiteName
                  )}
                </span>
              </TooltipHint>
            </Link>
          </div>

          {/* Desktop nav — absolutely centred so it sits in the middle of the
                bar regardless of how wide the brand or the actions grow. */}
          <div className='pointer-events-none absolute inset-0 hidden h-full items-center justify-center lg:flex'>
            <div className='pointer-events-auto flex items-center gap-1'>
              <PillNav
                links={links}
                tone='marketing'
                isActive={(link) => isTopNavLinkActive(pathname, link.href)}
              />
            </div>
          </div>

          {/* Actions */}
          <div className='z-1 ms-auto flex shrink-0 items-center gap-1 lg:gap-0.5'>
            {(showLanguageSwitcher || showThemeSwitch || showNotifications) && (
              <div className='bg-border/40 mx-1 h-4 w-px' />
            )}

            {showLanguageSwitcher && <LanguageSwitcher />}
            {showThemeSwitch && <ThemeSwitch />}
            {showNotifications && <NotificationPopover />}

            {showAuthButtons && (
              <>
                <div className='bg-border/40 mx-1 h-4 w-px' />
                {authContent}
              </>
            )}
          </div>

          {/* Mobile: compact actions + hamburger */}
          <div className='flex shrink-0 items-center gap-0.5 lg:hidden'>
            {showThemeSwitch && <ThemeSwitch />}
            {showAuthButtons && !loading && isAuthenticated && (
              <ProfileDropdown />
            )}
            <Button
              type='button'
              variant='ghost'
              size='icon'
              className='size-9'
              onClick={() => setMobileOpen((v) => !v)}
              aria-label={t('Toggle navigation menu')}
            >
              <div className='relative size-4'>
                <span
                  className={cn(
                    'absolute inset-x-0 block h-[1.5px] origin-center rounded-full bg-current transition-all duration-300',
                    mobileOpen ? 'top-[7px] rotate-45' : 'top-[3px]'
                  )}
                />
                <span
                  className={cn(
                    'absolute inset-x-0 top-[7px] block h-[1.5px] rounded-full bg-current transition-all duration-300',
                    mobileOpen ? 'scale-x-0 opacity-0' : 'opacity-100'
                  )}
                />
                <span
                  className={cn(
                    'absolute inset-x-0 block h-[1.5px] origin-center rounded-full bg-current transition-all duration-300',
                    mobileOpen ? 'top-[7px] -rotate-45' : 'top-[11px]'
                  )}
                />
              </div>
            </Button>
          </div>
        </nav>
      </header>

      {/* Mobile full-screen overlay */}
      <div
        className={cn(
          'bg-background/98 fixed inset-0 z-40 backdrop-blur-2xl transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] lg:pointer-events-none lg:hidden',
          mobileOpen
            ? 'pointer-events-auto opacity-100'
            : 'pointer-events-none opacity-0'
        )}
      >
        <div className='flex h-full flex-col justify-between px-6 pt-20 pb-10 sm:px-8'>
          <PillNavSheet
            links={links}
            open={mobileOpen}
            isActive={(link) => isTopNavLinkActive(pathname, link.href)}
            onLinkClick={(event, link) => handleNavLinkClick(event, link, true)}
          />

          <div
            className={cn(
              'flex flex-col gap-3 transition-all duration-500',
              mobileOpen
                ? 'translate-y-0 opacity-100'
                : 'translate-y-4 opacity-0'
            )}
            style={{ transitionDelay: mobileOpen ? '250ms' : '0ms' }}
          >
            {showAuthButtons && (
              <Link
                to={isAuthenticated ? '/dashboard' : '/sign-in'}
                onClick={() => setMobileOpen(false)}
                className='bg-foreground text-background inline-flex h-10 items-center justify-center rounded-lg text-sm font-medium transition-opacity hover:opacity-90 active:opacity-80'
              >
                {isAuthenticated ? t('Go to Dashboard') : t('Sign in')}
              </Link>
            )}
          </div>
        </div>
      </div>

      <Dialog
        open={!!authPromptTarget}
        onOpenChange={(open) => {
          if (!open) {
            closeAuthPrompt()
          }
        }}
        title={t('Sign in required')}
        description={t('Please sign in to view {{module}}.', {
          module: authPromptTarget?.title || '',
        })}
        contentClassName='sm:max-w-md'
        contentHeight='auto'
        footer={
          <>
            <Button variant='outline' onClick={closeAuthPrompt}>
              {t('Cancel')}
            </Button>
            <Button onClick={navigateToSignIn}>{t('Sign in now')}</Button>
          </>
        }
      >
        <div className='bg-muted/40 text-muted-foreground rounded-lg px-3 py-2 text-sm'>
          {t('Redirecting to sign in in {{seconds}} seconds.', {
            seconds: authPromptSecondsLeft,
          })}
        </div>
      </Dialog>
    </>
  )
}
