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
import { ArrowUpRight, Compass, Layers, Wand2, ArrowRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { AnimateInView } from '@/components/animate-in-view'
import { Button } from '@/components/ui/button'

export function SectionStudio() {
  const { t } = useTranslation()
  const [activeStep, setActiveStep] = useState(0)

  const steps = [
    {
      num: '01',
      title: t('Find the Starting Point'),
      subtitle: t('Structured Inspiration & Prompts'),
      desc: t('Start from curated industry templates, systemic system prompts, or multi-role personas to quickly shape concrete ideas.'),
      icon: Compass,
      tags: [t('System Prompt'), t('Role Persona'), t('Domain Template')],
      demo: {
        tag: 'PROMPT DRAFT',
        title: 'Cinematic Cyberpunk Neon Alley',
        code: `// Creative Directive\nRole: Lead Concept Artist\nScene: Neon-drenched subterranean alleyway\nAtmosphere: Volumetric fog, retro-futuristic rain, 85mm lens\nOutput: Ultra-dense prompt & lighting breakdown`,
      },
    },
    {
      num: '02',
      title: t('Expand Thinking'),
      subtitle: t('Multi-model Parallel Exploration'),
      desc: t('Fan out one concept to multiple frontier models concurrently. Compare reasoning logic, framing varieties, and tone with zero friction.'),
      icon: Layers,
      tags: [t('Parallel Compare'), t('Branch Iteration'), t('Cross Validation')],
      demo: {
        tag: 'MULTI-BRANCH EXPLORATION',
        title: 'Branch Analysis & Comparison',
        code: `[Branch A / Claude 3.5]: Deep narrative script & character dialogue\n[Branch B / DeepSeek R1]: Complex plot consistency & logical timelines\n[Branch C / FLUX.1]: Visual moodboard & keyframe cues`,
      },
    },
    {
      num: '03',
      title: t('Continuous Creation'),
      subtitle: t('Full Lifecycle Pipeline Delivery'),
      desc: t('From prompt to image, video motion simulation, and API deployment. Seamless pipeline to production ready services.'),
      icon: Wand2,
      tags: [t('Pipeline Automation'), t('High Concurrency'), t('Direct Integration')],
      demo: {
        tag: 'PRODUCTION DEPLOYMENT',
        title: 'Production Ready API Endpoints',
        code: `POST /v1/chat/completions (OpenAI Compatible)\nPOST /v1/messages (Claude Compatible)\nPOST /v1/images/generations\nStatus: 200 OK • Stream Latency: 18ms`,
      },
    },
  ]

  return (
    <section id='studio' className='relative z-10 border-t border-border/40 px-6 py-20 md:py-28 bg-muted/5'>
      <div className='mx-auto max-w-6xl'>
        {/* Curatorial Header */}
        <AnimateInView className='mb-14 flex flex-col md:flex-row md:items-end md:justify-between gap-6'>
          <div>
            <div className='mb-3 inline-flex items-center gap-2 font-mono text-xs font-semibold tracking-widest text-emerald-500 uppercase'>
              <span>02 /</span>
              <span>{t('Inspiration Studio')}</span>
            </div>
            <h2 className='text-3xl font-black tracking-tight sm:text-4xl md:text-5xl'>
              {t('Inspiration Studio & Creative Workflow')}
            </h2>
            <p className='text-muted-foreground/80 mt-3 max-w-xl text-sm leading-relaxed md:text-base'>
              {t('A step-by-step workflow designed for creators and engineers: from prompt inception to high-performance production.')}
            </p>
          </div>

          <div className='flex items-center gap-3'>
            <Button
              className='group h-10 rounded-lg text-xs font-semibold'
              render={<Link to='/dashboard' />}
            >
              <span>{t('Access API')}</span>
              <ArrowUpRight className='ml-1.5 size-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5' />
            </Button>
          </div>
        </AnimateInView>

        {/* 3 Step Interactive Workflow */}
        <div className='grid grid-cols-1 gap-8 lg:grid-cols-12 lg:gap-10 items-stretch'>
          {/* Left Step Selectors */}
          <div className='flex flex-col gap-4 lg:col-span-5'>
            {steps.map((step, idx) => {
              const Icon = step.icon
              const isSelected = activeStep === idx
              return (
                <div
                  key={step.num}
                  onClick={() => setActiveStep(idx)}
                  className={`group relative cursor-pointer rounded-2xl border p-5 transition-all duration-300 ${
                    isSelected
                      ? 'border-emerald-500/50 bg-background shadow-md'
                      : 'border-border/50 bg-background/40 hover:border-border hover:bg-background/80'
                  }`}
                >
                  <div className='flex items-start gap-4'>
                    <div
                      className={`flex size-10 shrink-0 items-center justify-center rounded-xl border text-sm font-mono font-bold transition-colors ${
                        isSelected
                          ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-500'
                          : 'border-border/60 bg-muted/30 text-muted-foreground group-hover:text-foreground'
                      }`}
                    >
                      {step.num}
                    </div>
                    <div className='flex-1 min-w-0'>
                      <div className='flex items-center justify-between'>
                        <h3 className={`text-base font-bold transition-colors ${isSelected ? 'text-foreground' : 'text-foreground/80'}`}>
                          {step.title}
                        </h3>
                        <Icon className={`size-4 transition-colors ${isSelected ? 'text-emerald-500' : 'text-muted-foreground/60'}`} />
                      </div>
                      <p className='text-xs font-medium text-muted-foreground/70 mt-0.5'>
                        {step.subtitle}
                      </p>
                      <p className='text-muted-foreground/80 mt-2 text-xs leading-relaxed'>
                        {step.desc}
                      </p>
                      <div className='mt-3 flex flex-wrap gap-1.5'>
                        {step.tags.map((tag) => (
                          <span
                            key={tag}
                            className='inline-flex items-center rounded-md border border-border/40 bg-muted/20 px-2 py-0.5 text-[10px] text-muted-foreground'
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Right Live Stage & Terminal Canvas */}
          <div className='flex flex-col lg:col-span-7'>
            <div className='relative flex flex-1 flex-col overflow-hidden rounded-2xl border border-border/60 bg-background shadow-xl'>
              {/* Studio Canvas Header */}
              <div className='flex items-center justify-between border-b border-border/50 bg-muted/20 px-4 py-3'>
                <div className='flex items-center gap-2'>
                  <span className='size-2.5 rounded-full bg-emerald-500/80 animate-pulse' />
                  <span className='font-mono text-xs font-bold uppercase tracking-wider text-muted-foreground'>
                    {steps[activeStep].demo.tag}
                  </span>
                </div>
                <div className='font-mono text-[11px] text-muted-foreground/60'>
                  STAGE 0{activeStep + 1} / 03
                </div>
              </div>

              {/* Studio Live Board */}
              <div className='flex-1 p-6 flex flex-col justify-between'>
                <div>
                  <h4 className='text-lg font-bold text-foreground mb-3'>
                    {steps[activeStep].demo.title}
                  </h4>
                  <div className='relative rounded-xl border border-border/50 bg-muted/30 p-4 font-mono text-xs text-foreground/90'>
                    <pre className='whitespace-pre-wrap leading-relaxed overflow-x-auto'>
                      {steps[activeStep].demo.code}
                    </pre>
                  </div>
                </div>

                <div className='mt-6 flex items-center justify-between border-t border-border/40 pt-4 text-xs text-muted-foreground'>
                  <span>{t('Instant execution via API')}</span>
                  <Link
                    to='/dashboard'
                    className='inline-flex items-center gap-1 font-semibold text-emerald-500 hover:text-emerald-400 transition-colors'
                  >
                    <span>{t('Experience in Console')}</span>
                    <ArrowRight className='size-3' />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
