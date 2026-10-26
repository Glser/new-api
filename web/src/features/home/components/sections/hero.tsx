/*
Copyright (C) 2023-2026 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.
*/
import { Link } from '@tanstack/react-router'
import { ArrowUpRight, BookOpen } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { HeaderLogo } from '@/components/layout/components/header-logo'
import { useSystemConfig } from '@/hooks/use-system-config'
import { cn } from '@/lib/utils'

import { HeroAgentShowcase } from '../hero-agent-showcase'
import { SectionDivider, SectionScrollCue } from '../section-primitives'

interface HeroProps {
  className?: string
  isAuthenticated?: boolean
}

export function Hero(props: HeroProps) {
  const { t } = useTranslation()
  const { logo, loading, logoLoaded } = useSystemConfig()

  const docsUrl = 'https://api.oioi.lat/pages/codex-guide/#install'

  const renderDocsButton = () => {
    const className =
      'group relative inline-flex h-11 items-center gap-2 overflow-hidden rounded-xl border border-border/70 bg-card/40 px-5 text-xs sm:text-sm font-medium text-muted-foreground/90 backdrop-blur-md transition-all duration-300 hover:border-foreground/25 hover:bg-card/80 hover:text-foreground hover:shadow-[0_4px_16px_rgba(0,0,0,0.04)] hover:-translate-y-px active:translate-y-px cursor-pointer'
    const content = (
      <>
        <span
          aria-hidden
          className='via-foreground/5 pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent to-transparent transition-transform duration-700 ease-out group-hover:translate-x-full'
        />
        <BookOpen className='text-muted-foreground group-hover:text-foreground size-4 transition-colors duration-200' />
        <span>{t('Docs')}</span>
      </>
    )
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
    <section
      className={cn(
        'relative z-10 flex min-h-[calc(100svh/var(--home-scale,1))] flex-col justify-between overflow-hidden px-4 pt-16 pb-8 sm:px-6 sm:pt-20 sm:pb-10 md:pt-24 md:pb-12 lg:px-8',
        props.className
      )}
    >
      {/* Subtle atmospheric lighting */}
      <div
        aria-hidden
        className='pointer-events-none absolute inset-0 -z-10 opacity-30 dark:opacity-20'
        style={{
          background: [
            'radial-gradient(ellipse 65% 50% at 15% 18%, rgba(16, 185, 129, 0.22) 0%, transparent 70%)',
            'radial-gradient(ellipse 55% 45% at 80% 28%, rgba(59, 130, 246, 0.16) 0%, transparent 70%)',
          ].join(', '),
        }}
      />
      <div
        aria-hidden
        className='absolute inset-0 -z-10 bg-[linear-gradient(to_right,var(--border)_1px,transparent_1px),linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] [mask-image:radial-gradient(ellipse_75%_65%_at_45%_35%,black_25%,transparent_100%)] bg-[size:4rem_4rem] opacity-[0.035]'
      />

      <div className='mx-auto my-auto w-full max-w-7xl py-6 sm:py-8 md:py-10'>
        <div className='grid grid-cols-1 items-center gap-10 lg:grid-cols-12 lg:gap-12 xl:gap-16'>
          {/* Left Column: Shifted leftwards */}
          <div className='flex flex-col items-start text-left lg:col-span-7 lg:pl-4 xl:col-span-7 xl:pl-6'>
            {/* Brand Logo & API Wordmark */}
            <div
              className='landing-animate-fade-up mb-8 inline-flex items-center gap-3 sm:mb-10 sm:gap-4.5'
              style={{ animationDelay: '0ms' }}
            >
              <div className='flex size-18 shrink-0 items-center justify-center transition-transform duration-300 hover:scale-105 sm:size-22'>
                {logo ? (
                  <HeaderLogo
                    src={logo}
                    loading={loading}
                    logoLoaded={logoLoaded}
                    className='size-full object-contain drop-shadow-md select-none'
                  />
                ) : (
                  <div className='size-5 rounded-full bg-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.8)]' />
                )}
              </div>
              <div className='flex items-center select-none'>
                <span className='text-foreground translate-y-1 font-sans text-[2.75rem] leading-none font-black tracking-tight sm:translate-y-1.5 sm:text-[3.5rem]'>
                  API
                </span>
              </div>
            </div>

            {/* High-impact Title with Nuanced Typography */}
            <h1
              className='landing-animate-fade-up my-2 tracking-tight sm:my-3'
              style={{ animationDelay: '30ms' }}
            >
              <span className='hero-title-shine block text-[clamp(2.2rem,4.4vw,3.4rem)] leading-[1.18] font-extrabold'>
                {t('hero_title_p1', '重塑思考的疆界')}
              </span>
              <span className='hero-title-shine-emerald mt-3 block text-[clamp(1.8rem,3.6vw,2.75rem)] leading-[1.22] font-black drop-shadow-[0_2px_18px_rgba(16,185,129,0.2)] filter sm:mt-4'>
                {t('hero_title_p2', '让每一次API调用，皆有回响。')}
              </span>
            </h1>

            {/* Editorial Accent Gradient Bar */}
            <div
              aria-hidden
              className='landing-animate-fade-up mt-6 h-0.5 w-32 rounded-full bg-gradient-to-r from-emerald-500 via-teal-400 to-transparent sm:mt-7 sm:w-48 md:w-56'
              style={{ animationDelay: '70ms' }}
            />

            {/* Rich, Evocative Narrative Copy */}
            <p
              className='landing-animate-fade-up text-muted-foreground mt-6 max-w-2xl text-[14.5px] leading-[1.75] whitespace-pre-line sm:mt-8 sm:text-[16px] sm:leading-[1.8]'
              style={{ animationDelay: '110ms' }}
            >
              {t(
                'hero_subtitle',
                '聚合文本、图像、音频、视频等全球顶尖模型，构建统一API范式。\n一个接口即可调度全球顶尖模型能力，为构建者提供极致稳定的原生 API 服务。'
              )}
            </p>

            {/* Action Buttons */}
            <div
              className='landing-animate-fade-up mt-8 flex flex-wrap items-center gap-3 sm:mt-10 sm:gap-4'
              style={{ animationDelay: '190ms' }}
            >
              {/* Primary Access Button */}
              <Link
                to='/dashboard'
                className='group bg-foreground text-background relative inline-flex h-11 cursor-pointer items-center gap-2 overflow-hidden rounded-xl px-6 text-xs font-semibold shadow-[0_4px_14px_rgba(0,0,0,0.12)] transition-all duration-300 hover:-translate-y-px hover:shadow-[0_8px_24px_rgba(0,0,0,0.18)] active:translate-y-px sm:text-sm dark:shadow-[0_4px_18px_rgba(255,255,255,0.06)]'
              >
                {/* Luminous overlay wave on hover */}
                <span
                  aria-hidden
                  className='pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 ease-out group-hover:translate-x-full'
                />
                <span>{t('hero_cta_access')}</span>
                <ArrowUpRight className='size-4 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5' />
              </Link>

              {/* Secondary Explore Button */}
              <Link
                to='/pricing'
                className='group border-border/70 bg-card/60 text-foreground hover:border-foreground/25 hover:bg-card/90 relative inline-flex h-11 cursor-pointer items-center gap-2 overflow-hidden rounded-xl border px-5 text-xs font-medium backdrop-blur-md transition-all duration-300 hover:-translate-y-px hover:shadow-[0_4px_16px_rgba(0,0,0,0.04)] active:translate-y-px sm:text-sm'
              >
                <span
                  aria-hidden
                  className='via-foreground/5 pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent to-transparent transition-transform duration-700 ease-out group-hover:translate-x-full'
                />
                <span>{t('Model Square', '模型广场')}</span>
              </Link>

              {/* Tertiary Docs Button */}
              {renderDocsButton()}
            </div>
          </div>

          {/* Right Column: 3D Agent Carousel Showcase */}
          <div
            className='landing-animate-fade-up flex w-full justify-center lg:col-span-5 lg:-ml-6 xl:-ml-10'
            style={{ animationDelay: '230ms' }}
          >
            <HeroAgentShowcase />
          </div>
        </div>
      </div>

      {/* Clean Bottom Cue */}
      <SectionScrollCue target='models' />
      {/* Section divider: layered center-glow line */}
      <SectionDivider />
    </section>
  )
}
