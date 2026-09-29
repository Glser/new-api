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
import { Link } from '@tanstack/react-router'
import { ArrowUpRight, BookOpen, Check, ChevronDown, Copy } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { HeaderLogo } from '@/components/layout/components/header-logo'
import { Button } from '@/components/ui/button'
import { useCopyToClipboard } from '@/hooks/use-copy-to-clipboard'
import { useStatus } from '@/hooks/use-status'
import { useSystemConfig } from '@/hooks/use-system-config'

import { HeroAgentShowcase } from '../hero-agent-showcase'

interface HeroProps {
  className?: string
  isAuthenticated?: boolean
}

function readServerAddress(status: unknown): string {
  if (!status || typeof status !== 'object') return ''
  const record = status as Record<string, unknown>
  if (
    typeof record.server_address === 'string' &&
    record.server_address.trim()
  ) {
    return record.server_address.trim()
  }
  if (record.data && typeof record.data === 'object') {
    const nested = (record.data as Record<string, unknown>).server_address
    if (typeof nested === 'string' && nested.trim()) return nested.trim()
  }
  return ''
}

function toGatewayBaseUrl(origin: string): string {
  const trimmed = origin.replace(/\/+$/, '')
  if (/\/v1$/i.test(trimmed)) return trimmed
  return `${trimmed}/v1`
}

const specs = [
  ['hero_spec_protocol_label', 'hero_spec_protocol_value'],
  ['hero_spec_routing_label', 'hero_spec_routing_value'],
  ['hero_spec_control_label', 'hero_spec_control_value'],
] as const

export function Hero(props: HeroProps) {
  const { t } = useTranslation()
  const { status } = useStatus()
  const { logo, loading, logoLoaded } = useSystemConfig()
  const { copiedText, copyToClipboard } = useCopyToClipboard({ notify: false })

  const docsUrl =
    (status?.docs_link as string | undefined) || 'https://docs.newapi.pro'
  const configuredOrigin = readServerAddress(status)
  const gatewayOrigin =
    configuredOrigin ||
    (typeof window !== 'undefined' ? window.location.origin : '')
  const gatewayBaseUrl = gatewayOrigin ? toGatewayBaseUrl(gatewayOrigin) : ''
  const endpointCopied = copiedText === gatewayBaseUrl

  const renderDocsButton = () => {
    const className =
      'text-muted-foreground hover:text-foreground inline-flex h-11 items-center gap-1.5 px-2 text-sm font-medium transition-colors'
    const content = (
      <>
        <BookOpen className='size-4' />
        <span>{t('Docs')}</span>
      </>
    )
    if (docsUrl.startsWith('http')) {
      return (
        <a
          href={docsUrl}
          target='_blank'
          rel='noopener noreferrer'
          className={className}
        >
          {content}
        </a>
      )
    }
    return (
      <Link to={docsUrl} className={className}>
        {content}
      </Link>
    )
  }

  return (
    <section className='relative z-10 flex min-h-[calc(100svh-4rem)] flex-col justify-between overflow-hidden px-6 pt-14 pb-6 sm:pt-16 md:pt-20 lg:pt-24'>
      <div
        aria-hidden
        className='pointer-events-none absolute inset-0 -z-10 opacity-20 dark:opacity-[0.1]'
        style={{
          background: [
            'radial-gradient(ellipse 55% 42% at 12% 8%, oklch(0.75 0.12 160 / 45%) 0%, transparent 72%)',
            'radial-gradient(ellipse 42% 36% at 88% 18%, oklch(0.62 0.08 240 / 28%) 0%, transparent 70%)',
          ].join(', '),
        }}
      />
      <div
        aria-hidden
        className='absolute inset-0 -z-10 bg-[linear-gradient(to_right,var(--border)_1px,transparent_1px),linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] [mask-image:radial-gradient(ellipse_68%_55%_at_42%_32%,black_18%,transparent_100%)] bg-[size:4.5rem_4.5rem] opacity-[0.045]'
      />

      <div className='mx-auto my-auto w-full max-w-6xl'>
        <div className='grid grid-cols-1 items-center gap-12 lg:grid-cols-12 lg:gap-8'>
          <div className='flex flex-col items-start text-left lg:col-span-6'>
            <div
              className='landing-animate-fade-up mb-7 inline-flex items-center gap-2.5'
              style={{ animationDelay: '0ms' }}
            >
              <div className='flex size-7 shrink-0 items-center justify-center'>
                {logo ? (
                  <HeaderLogo
                    src={logo}
                    loading={loading}
                    logoLoaded={logoLoaded}
                    className='size-full object-contain'
                  />
                ) : (
                  <div className='size-2 rounded-full bg-emerald-500' />
                )}
              </div>
              <span className='text-foreground font-mono text-[13px] font-medium tracking-tight'>
                oioi-api
              </span>
              <span className='bg-border h-3 w-px' />
              <span className='text-muted-foreground text-[13px]'>
                {t('hero_badge_tag')}
              </span>
            </div>

            <h1
              className='landing-animate-fade-up text-foreground text-[clamp(2.8rem,5.5vw,4.5rem)] leading-[1.02] font-semibold tracking-[-0.045em]'
              style={{ animationDelay: '60ms' }}
            >
              <span className='block'>{t('hero_title_p1')}</span>
              <span className='mt-1 block'>{t('hero_title_p2')}</span>
            </h1>

            <div
              aria-hidden
              className='landing-animate-fade-up mt-6 h-px w-12 bg-emerald-500/80'
              style={{ animationDelay: '100ms' }}
            />

            <p
              className='landing-animate-fade-up text-muted-foreground mt-5 max-w-[34rem] text-[15px] leading-7 sm:text-base'
              style={{ animationDelay: '140ms' }}
            >
              {t('hero_subtitle')}
            </p>

            {gatewayBaseUrl ? (
              <div
                className='landing-animate-fade-up border-border/70 bg-background/70 mt-7 flex w-full max-w-md items-center gap-3 rounded-2xl border px-3.5 py-3 shadow-[0_18px_40px_-28px_rgba(0,0,0,0.45)] backdrop-blur-sm'
                style={{ animationDelay: '170ms' }}
              >
                <div className='min-w-0 flex-1'>
                  <div className='text-muted-foreground/70 font-mono text-[10px] tracking-[0.18em] uppercase'>
                    {t('hero_endpoint_label')}
                  </div>
                  <div className='text-foreground mt-1 truncate font-mono text-[13px]'>
                    {gatewayBaseUrl}
                  </div>
                </div>
                <button
                  type='button'
                  onClick={() => {
                    void copyToClipboard(gatewayBaseUrl)
                  }}
                  className='text-muted-foreground hover:text-foreground hover:bg-muted inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12px] font-medium transition-colors'
                >
                  {endpointCopied ? (
                    <Check className='size-3.5 text-emerald-500' />
                  ) : (
                    <Copy className='size-3.5' />
                  )}
                  <span>{endpointCopied ? t('Copied') : t('Copy')}</span>
                </button>
              </div>
            ) : null}

            <div
              className='landing-animate-fade-up mt-7 flex flex-wrap items-center gap-3'
              style={{ animationDelay: '200ms' }}
            >
              <Button
                className='group bg-foreground text-background hover:bg-foreground/90 h-11 rounded-xl px-5 text-sm font-medium shadow-sm'
                render={<Link to='/dashboard' />}
              >
                <span>{t('hero_cta_access')}</span>
                <ArrowUpRight className='ml-1.5 size-4 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5' />
              </Button>

              {props.isAuthenticated ? (
                <Button
                  variant='outline'
                  className='border-border/70 hover:bg-muted/50 h-11 rounded-xl px-4.5 text-sm font-medium'
                  render={<Link to='/playground' />}
                >
                  <span>{t('Open Playground')}</span>
                </Button>
              ) : (
                <Button
                  variant='outline'
                  className='border-border/70 hover:bg-muted/50 h-11 rounded-xl px-4.5 text-sm font-medium'
                  render={<Link to='/pricing' />}
                >
                  <span>{t('hero_cta_models')}</span>
                </Button>
              )}

              {renderDocsButton()}
            </div>

            <dl
              className='landing-animate-fade-up border-border/60 mt-9 grid w-full max-w-lg grid-cols-1 gap-4 border-t pt-5 sm:grid-cols-3'
              style={{ animationDelay: '240ms' }}
            >
              {specs.map(([labelKey, valueKey]) => (
                <div key={labelKey}>
                  <dt className='text-muted-foreground/60 font-mono text-[10px] tracking-[0.16em] uppercase'>
                    {t(labelKey)}
                  </dt>
                  <dd className='text-foreground mt-1.5 text-[13px] leading-snug font-medium'>
                    {t(valueKey)}
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          <div
            className='landing-animate-fade-up flex w-full justify-center lg:col-span-6'
            style={{ animationDelay: '280ms' }}
          >
            <HeroAgentShowcase />
          </div>
        </div>
      </div>

      <div className='border-border/40 mx-auto mt-8 flex w-full max-w-6xl items-center justify-between border-t pt-4 text-xs'>
        <a
          href='#features'
          className='text-muted-foreground hover:text-foreground group flex items-center gap-2 font-mono text-[11px] transition-colors'
        >
          <ChevronDown className='size-3.5 text-emerald-500/80' />
          <span>{t('hero_scroll_cue')}</span>
          <span className='text-muted-foreground/35'>/</span>
          <span>{t('hero_scroll_aside')}</span>
        </a>
        <div className='text-muted-foreground/55 hidden items-center gap-5 font-mono text-[11px] sm:flex'>
          <span>01 {t('hero_index_1')}</span>
          <span>02 {t('hero_index_2')}</span>
          <span>03 {t('hero_index_3')}</span>
        </div>
      </div>
    </section>
  )
}
