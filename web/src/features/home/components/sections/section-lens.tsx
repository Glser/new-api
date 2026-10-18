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
import { useTranslation } from 'react-i18next'

import { AnimateInView } from '@/components/animate-in-view'
import {
  SectionBackdrop,
  SectionDivider,
  SectionHeader,
  SectionPrimaryLink,
  SectionScrollCue,
} from '@/features/home/components/section-primitives'
import {
  ACCENT_PALETTE,
  glassPanelClassName,
} from '@/features/home/components/section-styles'
import { cn } from '@/lib/utils'

export function SectionLens() {
  const { t } = useTranslation()

  const scenes = [
    {
      num: '01 / 03',
      concept: '光影与空间',
      title: '把光，组织成画面',
      desc: '让取景框、材质质感与纵深空间形成明确的视觉意图，赋予静态画面叙事力。',
      meta: 'Kling 1.5 Pro · 4K Master',
    },
    {
      num: '02 / 03',
      concept: '物理与动态',
      title: '把节奏，放进镜头里',
      desc: '先确立画面重心，再通过动力学模拟让镜头流畅推移，捕捉微妙的时序变化。',
      meta: 'Luma Dream Machine · 60 FPS',
    },
    {
      num: '03 / 03',
      concept: '色调与美学',
      title: '风格很多，主张是你的',
      desc: '从电影胶片颗粒到超写实高反差霓虹，将提示词的细腻触觉无损延展至每一帧。',
      meta: 'Runway Gen-3 Alpha · Cinematic',
    },
  ]

  return (
    <section
      id='lens'
      className='home-section-offscreen relative z-10 overflow-hidden px-4 py-20 sm:px-6 md:py-28 lg:px-8'
    >
      <SectionBackdrop />

      <div className='mx-auto max-w-7xl'>
        <SectionHeader
          titlePrimary={t('sec_lens_title_p1')}
          titleSecondary={t('sec_lens_title_p2')}
          description={t('sec_lens_desc')}
          action={
            <SectionPrimaryLink to='/models' label={t('sec_lens_action')} />
          }
        />

        <div className='grid grid-cols-1 gap-5 md:grid-cols-3'>
          {scenes.map((scene, idx) => {
            const palette = ACCENT_PALETTE[idx % ACCENT_PALETTE.length]
            return (
              <AnimateInView
                key={scene.num}
                delay={idx * 80}
                className={cn(
                  'group relative flex flex-col justify-between overflow-hidden rounded-3xl p-6 transition-all duration-500 hover:-translate-y-1',
                  glassPanelClassName
                )}
              >
                {/* 强调色氛围光：随卡片位置轮换 */}
                <div
                  aria-hidden
                  className='pointer-events-none absolute inset-0 opacity-40 transition-opacity duration-700 group-hover:opacity-70 dark:opacity-30'
                  style={{
                    background: `radial-gradient(ellipse 70% 55% at 50% 0%, ${palette.glowColor}, transparent 62%)`,
                  }}
                />

                <div className='relative'>
                  <div className='flex items-baseline justify-between border-b border-slate-900/10 pb-3 font-mono text-[11px] dark:border-white/15'>
                    <span className='text-muted-foreground tracking-wider uppercase'>
                      {scene.concept}
                    </span>
                    <span className='text-muted-foreground/60'>
                      {scene.num}
                    </span>
                  </div>

                  <h3 className='text-foreground mt-4 text-xl font-bold tracking-tight'>
                    {scene.title}
                  </h3>
                  <p className='text-muted-foreground mt-3 text-xs leading-relaxed'>
                    {scene.desc}
                  </p>
                </div>

                <div className='text-muted-foreground/70 relative mt-8 flex items-center justify-between border-t border-slate-900/10 pt-4 font-mono text-[11px] dark:border-white/15'>
                  <span>{scene.meta}</span>
                  <span
                    className='transition-transform group-hover:translate-x-0.5'
                    style={{ color: palette.accentColor }}
                  >
                    ↗
                  </span>
                </div>
              </AnimateInView>
            )
          })}
        </div>
      </div>

      <SectionScrollCue
        target='engineering'
        cue={t('sec_lens_scroll_cue')}
        aside={t('sec_lens_scroll_aside')}
      />
      <SectionDivider />
    </section>
  )
}
