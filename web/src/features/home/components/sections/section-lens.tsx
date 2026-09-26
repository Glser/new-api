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
import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { ArrowUpRight, Clapperboard, Film, Play, Sliders, Sparkles } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { AnimateInView } from '@/components/animate-in-view'
import { Button } from '@/components/ui/button'

export function SectionLens() {
  const { t } = useTranslation()
  const [activePreset, setActivePreset] = useState(0)

  const presets = [
    {
      title: t('Cinematic Anamorphic'),
      lens: '50mm Anamorphic • f/1.8',
      motion: t('Slow Truck-in & Orbit'),
      lighting: t('Golden Hour Volumetric'),
      fps: '60 FPS Ultra-fluid',
      aspect: '2.39:1 Widescreen',
      tag: 'Kling 1.5 Pro',
      description: t('Replicates vintage cinematic anamorphic lens flare, deep bokeh, and ultra-smooth mechanical track-in motion.'),
    },
    {
      title: t('Dynamic Drone Hyperlapse'),
      lens: '16mm Ultra-wide • f/4.0',
      motion: t('High Altitude Fast Push'),
      lighting: t('Cyberpunk Neon Glow'),
      fps: '60 FPS High Dynamics',
      aspect: '16:9 Landscape',
      tag: 'Sora / Luma Ray',
      description: t('Simulates sweeping high-speed FPV drone dive across architectural megaliths with coherent depth layers.'),
    },
    {
      title: t('Macro Atmospheric Slow-mo'),
      lens: '100mm Macro • f/2.8',
      motion: t('Subtle Micro Tilt & Pan'),
      lighting: t('Studio Softbox Diffused'),
      fps: '120 FPS High-speed Capture',
      aspect: '9:16 Portrait / Reel',
      tag: 'Runway Gen-3',
      description: t('Captures microscopic liquid ripples, crystalline refraction, and micro-physics with hyper-detailed clarity.'),
    },
  ]

  return (
    <section id='lens' className='relative z-10 border-t border-border/40 px-6 py-20 md:py-28'>
      <div className='mx-auto max-w-6xl'>
        {/* Curatorial Header */}
        <AnimateInView className='mb-14 flex flex-col md:flex-row md:items-end md:justify-between gap-6'>
          <div>
            <div className='mb-3 inline-flex items-center gap-2 font-mono text-xs font-semibold tracking-widest text-emerald-500 uppercase'>
              <span>03 /</span>
              <span>{t('Video & Motion')}</span>
            </div>
            <h2 className='text-3xl font-black tracking-tight sm:text-4xl md:text-5xl'>
              {t('Visuals, Lenses & Cinematic Motion')}
            </h2>
            <p className='text-muted-foreground/80 mt-3 max-w-xl text-sm leading-relaxed md:text-base'>
              {t('Explore physical lighting, dynamic camera movements, and cinematic depth with cutting-edge video generative models.')}
            </p>
          </div>

          <div className='flex items-center gap-3'>
            <Button
              variant='outline'
              className='group h-10 rounded-lg border-border/60 hover:border-border text-xs font-medium'
              render={<Link to='/dashboard' />}
            >
              <span>{t('Access API')}</span>
              <ArrowUpRight className='ml-1.5 size-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5' />
            </Button>
          </div>
        </AnimateInView>

        {/* Visual Showcase Stage */}
        <div className='grid grid-cols-1 gap-8 lg:grid-cols-12 lg:gap-8 items-center'>
          {/* Left: Cinematic Mockup Display */}
          <div className='lg:col-span-7'>
            <div className='relative overflow-hidden rounded-2xl border border-border/60 bg-black/90 p-1 shadow-2xl'>
              {/* Aspect Ratio Screen Frame */}
              <div className='relative aspect-[16/9] w-full overflow-hidden rounded-xl bg-gradient-to-br from-neutral-900 via-neutral-950 to-black flex flex-col justify-between p-6'>
                {/* Visual Glow */}
                <div
                  className='pointer-events-none absolute inset-0 opacity-40 bg-[radial-gradient(circle_at_30%_30%,rgba(16,185,129,0.25),transparent_60%),radial-gradient(circle_at_70%_70%,rgba(59,130,246,0.25),transparent_60%)]'
                />

                {/* Top Overlay Bar */}
                <div className='relative z-10 flex items-center justify-between text-xs font-mono text-white/70'>
                  <div className='flex items-center gap-2'>
                    <span className='size-2 rounded-full bg-red-500 animate-pulse' />
                    <span className='tracking-wider uppercase font-semibold text-white/90'>REC</span>
                    <span>[ 00:04:12 ]</span>
                  </div>
                  <div className='flex items-center gap-3'>
                    <span>{presets[activePreset].aspect}</span>
                    <span>{presets[activePreset].fps}</span>
                  </div>
                </div>

                {/* Center Cinema Viewport Cue */}
                <div className='relative z-10 flex flex-col items-center justify-center my-auto text-center'>
                  <div className='flex size-14 items-center justify-center rounded-full border border-white/20 bg-white/10 backdrop-blur-md shadow-lg transition-transform hover:scale-105 cursor-pointer'>
                    <Play className='size-6 text-white ml-0.5' />
                  </div>
                  <div className='mt-4 font-bold text-white text-base tracking-wide'>
                    {presets[activePreset].title}
                  </div>
                  <div className='text-xs font-mono text-emerald-400 mt-1'>
                    {presets[activePreset].lens}
                  </div>
                </div>

                {/* Bottom Overlay Parameters */}
                <div className='relative z-10 grid grid-cols-2 sm:grid-cols-3 gap-2 border-t border-white/10 pt-3 text-[11px] font-mono text-white/60'>
                  <div>
                    <span className='text-white/40 block'>MOTION:</span>
                    <span className='text-white/80'>{presets[activePreset].motion}</span>
                  </div>
                  <div>
                    <span className='text-white/40 block'>LIGHTING:</span>
                    <span className='text-white/80'>{presets[activePreset].lighting}</span>
                  </div>
                  <div className='hidden sm:block'>
                    <span className='text-white/40 block'>ENGINE:</span>
                    <span className='text-emerald-400 font-semibold'>{presets[activePreset].tag}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Preset Selector Cards */}
          <div className='flex flex-col gap-3.5 lg:col-span-5'>
            {presets.map((preset, idx) => {
              const isSelected = activePreset === idx
              return (
                <div
                  key={preset.title}
                  onClick={() => setActivePreset(idx)}
                  className={`group cursor-pointer rounded-2xl border p-5 transition-all duration-300 ${
                    isSelected
                      ? 'border-emerald-500/60 bg-muted/40 shadow-sm'
                      : 'border-border/50 bg-background/40 hover:border-border hover:bg-background/80'
                  }`}
                >
                  <div className='flex items-center justify-between'>
                    <span className='font-mono text-xs font-semibold text-emerald-500'>
                      0{idx + 1}
                    </span>
                    <span className='rounded-full border border-border/50 bg-muted/30 px-2 py-0.5 text-[10px] font-mono text-muted-foreground'>
                      {preset.tag}
                    </span>
                  </div>
                  <h3 className='mt-2 text-base font-bold text-foreground'>
                    {preset.title}
                  </h3>
                  <p className='text-xs text-muted-foreground/80 mt-1 leading-relaxed'>
                    {preset.description}
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}
