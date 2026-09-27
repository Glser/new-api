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
import { ArrowUpRight, Play } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { AnimateInView } from '@/components/animate-in-view'
import { Button } from '@/components/ui/button'

export function SectionLens() {
  const { t } = useTranslation()

  const filmWorks = [
    {
      id: 1,
      title: t('Cyber Horizon 2049'),
      director: 'Luma Dream Machine + Claude-3.5',
      aspect: '21:9 Cinematic',
      fps: '60 FPS Ultra',
      tags: ['Sci-Fi', 'Film Grain', '4K Master'],
      thumbnail: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80',
      description: t('Full cinematic sequence generated via prompt orchestration and multi-modal continuity.'),
    },
    {
      id: 2,
      title: t('Bio-Mechanical Metamorphosis'),
      director: 'Kling 1.5 + Midjourney v6',
      aspect: '16:9 Macro',
      fps: '30 FPS Organic',
      tags: ['Surrealism', 'Biotech', 'Hyper-detail'],
      thumbnail: 'https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?auto=format&fit=crop&w=1200&q=80',
      description: t('Organic macro movement and lighting simulation driven by physics-informed video diffusion.'),
    },
    {
      id: 3,
      title: t('Neon Tokyo: Rain & Reflections'),
      director: 'Runway Gen-3 Alpha',
      aspect: '9:16 Vertical',
      fps: '60 FPS Direct',
      tags: ['Atmospheric', 'Ray-tracing', 'Cityscape'],
      thumbnail: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=1200&q=80',
      description: t('Complex water surface reflections and ambient dynamic neon lighting rendered frame by frame.'),
    },
  ]

  return (
    <section className="relative z-10 border-t border-border/50 bg-background/50 py-20 md:py-28">
      <div className="mx-auto max-w-6xl px-6">
        <AnimateInView animation="fade-up">
          <div className="mb-12 flex flex-col items-start justify-between gap-4 md:flex-row md:items-end">
            <div>
              <div className="font-mono text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                03 / {t('Generative Video & Cinema')}
              </div>
              <h2 className="mt-2 text-2xl font-bold tracking-tight text-foreground md:text-3xl">
                {t('Motion & Light in Pure Latent Space.')}
              </h2>
            </div>
            <p className="max-w-md text-sm text-muted-foreground">
              {t('Explore how video generation models transform structured prompts into fluid cinematic experiences.')}
            </p>
          </div>
        </AnimateInView>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {filmWorks.map((work, index) => (
            <AnimateInView key={work.id} animation="fade-up" delay={index * 100}>
              <div
                className="group relative flex flex-col overflow-hidden rounded-2xl border border-border/70 bg-card/60 transition-all duration-300 hover:-translate-y-1 hover:border-border hover:shadow-xl"
              >
                {/* Visual Thumbnail */}
                <div className="relative aspect-video w-full overflow-hidden bg-muted/40">
                  <img
                    src={work.thumbnail}
                    alt={work.title}
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                  {/* Play icon indicator */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                    <div className="flex size-12 items-center justify-center rounded-full bg-white/20 backdrop-blur-md text-white shadow-lg transition-transform duration-300 group-hover:scale-110">
                      <Play className="ml-1 size-5 fill-white" />
                    </div>
                  </div>

                  {/* Top badges */}
                  <div className="absolute top-3 left-3 flex items-center gap-1.5">
                    <span className="rounded bg-black/60 px-2 py-0.5 font-mono text-[10px] text-white/90 backdrop-blur-xs">
                      {work.aspect}
                    </span>
                    <span className="rounded bg-black/60 px-2 py-0.5 font-mono text-[10px] text-white/90 backdrop-blur-xs">
                      {work.fps}
                    </span>
                  </div>
                </div>

                {/* Content info */}
                <div className="flex flex-1 flex-col justify-between p-5">
                  <div>
                    <h3 className="text-base font-semibold text-foreground group-hover:text-emerald-500 transition-colors">
                      {work.title}
                    </h3>
                    <p className="mt-1 font-mono text-xs text-muted-foreground/80">
                      {work.director}
                    </p>
                    <p className="mt-3 text-xs text-muted-foreground leading-relaxed">
                      {work.description}
                    </p>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-1.5 border-t border-border/40 pt-3">
                    {work.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-md bg-muted/30 px-2 py-0.5 text-[10.5px] font-mono text-muted-foreground"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </AnimateInView>
          ))}
        </div>

        {/* Bottom CTA bar */}
        <AnimateInView animation="fade-up" delay={300}>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-between rounded-xl border border-border/60 bg-muted/20 px-6 py-4 backdrop-blur-xs">
            <div className="text-xs text-muted-foreground text-center sm:text-left mb-3 sm:mb-0">
              <span className="font-semibold text-foreground">
                {t('Ready to synthesize video & visual art?')}
              </span>{' '}
              {t('High-bandwidth GPU clusters with zero queue degradation.')}
            </div>
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 text-xs font-medium"
              render={<Link to="/pricing" />}
            >
              <span>{t('View Video Models')}</span>
              <ArrowUpRight className="size-3.5" />
            </Button>
          </div>
        </AnimateInView>
      </div>
    </section>
  )
}
