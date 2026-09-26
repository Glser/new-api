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
import { ArrowUpRight, Cpu, Sparkles, Video, Image, Zap, Check } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { AnimateInView } from '@/components/animate-in-view'
import { Button } from '@/components/ui/button'

export function SectionModels() {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState<'all' | 'reasoning' | 'video' | 'image' | 'speed'>('all')

  const categories = [
    { id: 'all', label: t('All Models'), icon: Sparkles },
    { id: 'reasoning', label: t('Reasoning & Code'), icon: Cpu },
    { id: 'video', label: t('Video & Motion'), icon: Video },
    { id: 'image', label: t('Image & Canvas'), icon: Image },
    { id: 'speed', label: t('High Speed & Economical'), icon: Zap },
  ] as const

  const models = [
    {
      id: 'claude-3-5-sonnet',
      category: 'reasoning',
      name: 'Claude 3.5 Sonnet',
      provider: 'Anthropic',
      tag: t('Editor Choice'),
      tagColor: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
      description: t('Industry-leading coding, reasoning, and visual comprehension capabilities.'),
      context: '200K Context',
      features: [t('Artifacts Rendering'), t('Code Synthesis'), t('Complex System Design')],
      accentGradient: 'from-amber-500/20 via-orange-500/10 to-transparent',
    },
    {
      id: 'deepseek-r1',
      category: 'reasoning',
      name: 'DeepSeek R1',
      provider: 'DeepSeek',
      tag: t('Flagship Reasoning'),
      tagColor: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
      description: t('Open architecture deep reasoning model with multi-stage thinking chains.'),
      context: '64K Context',
      features: [t('Math Proofs'), t('Long-chain Reasoning'), t('Ultra-low Cost')],
      accentGradient: 'from-blue-500/20 via-indigo-500/10 to-transparent',
    },
    {
      id: 'kling-1-5',
      category: 'video',
      name: 'Kling 1.5 Pro',
      provider: 'Kuaishou',
      tag: t('Cinematic Video'),
      tagColor: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
      description: t('Generates cinematic high-frame-rate video with physical motion simulation.'),
      context: '1080P / 4K Video',
      features: [t('Camera Motion Control'), t('Physical Simulation'), t('Prompt Precision')],
      accentGradient: 'from-purple-500/20 via-pink-500/10 to-transparent',
    },
    {
      id: 'flux-1-pro',
      category: 'image',
      name: 'FLUX.1 Pro',
      provider: 'Black Forest Labs',
      tag: t('Ultra Realism'),
      tagColor: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
      description: t('Top-tier visual generation with exceptional text rendering and realistic lighting.'),
      context: '2K / 4K Raster',
      features: [t('Text Typography'), t('Anatomical Precision'), t('Artistic Lighting')],
      accentGradient: 'from-emerald-500/20 via-teal-500/10 to-transparent',
    },
    {
      id: 'gpt-4o',
      category: 'reasoning',
      name: 'GPT-4o',
      provider: 'OpenAI',
      tag: t('Omni Model'),
      tagColor: 'bg-teal-500/10 text-teal-500 border-teal-500/20',
      description: t('Flagship multimodal model with real-time text, voice, and vision integration.'),
      context: '128K Context',
      features: [t('High Concurrency'), t('Multimodal Vision'), t('Tool Calling')],
      accentGradient: 'from-teal-500/20 via-emerald-500/10 to-transparent',
    },
    {
      id: 'gemini-2-0-flash',
      category: 'speed',
      name: 'Gemini 2.0 Flash',
      provider: 'Google',
      tag: t('Sub-second Latency'),
      tagColor: 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20',
      description: t('Next-generation multimodal powerhouse with lightning-fast streaming speeds.'),
      context: '1M Context',
      features: [t('Streaming Speed'), t('Extreme Context Window'), t('Native Audio/Video')],
      accentGradient: 'from-cyan-500/20 via-blue-500/10 to-transparent',
    },
  ]

  const filteredModels = activeTab === 'all' 
    ? models 
    : models.filter((m) => m.category === activeTab)

  return (
    <section id='models' className='relative z-10 px-6 py-20 md:py-28'>
      <div className='mx-auto max-w-6xl'>
        {/* Curatorial Header */}
        <AnimateInView className='mb-12 flex flex-col md:flex-row md:items-end md:justify-between gap-6'>
          <div>
            <div className='mb-3 inline-flex items-center gap-2 font-mono text-xs font-semibold tracking-widest text-emerald-500 uppercase'>
              <span>01 /</span>
              <span>{t('Curated Models')}</span>
            </div>
            <h2 className='text-3xl font-black tracking-tight sm:text-4xl md:text-5xl'>
              {t('Curated Flagship Matrix')}
            </h2>
            <p className='text-muted-foreground/80 mt-3 max-w-xl text-sm leading-relaxed md:text-base'>
              {t('From deep reasoning to photorealistic visual synthesis, one unified API unlocks all flagship capabilities.')}
            </p>
          </div>

          <div className='flex items-center gap-3'>
            <Button
              variant='outline'
              className='group h-10 rounded-lg border-border/60 hover:border-border text-xs font-medium'
              render={<Link to='/pricing' />}
            >
              <span>{t('View All Supported Models')}</span>
              <ArrowUpRight className='ml-1.5 size-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5' />
            </Button>
          </div>
        </AnimateInView>

        {/* Category Filter Tabs */}
        <div className='mb-8 flex flex-wrap items-center gap-2 border-b border-border/40 pb-4'>
          {categories.map((c) => {
            const Icon = c.icon
            const isActive = activeTab === c.id
            return (
              <button
                key={c.id}
                type='button'
                onClick={() => setActiveTab(c.id)}
                className={`flex items-center gap-2 rounded-full px-4 py-2 text-xs font-medium transition-all duration-200 cursor-pointer ${
                  isActive
                    ? 'bg-foreground text-background shadow-xs'
                    : 'bg-muted/30 text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                <Icon className='size-3.5' />
                <span>{c.label}</span>
              </button>
            )
          })}
        </div>

        {/* Models Grid */}
        <div className='grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3'>
          {filteredModels.map((model, idx) => (
            <AnimateInView
              key={model.id}
              delay={idx * 60}
              className='group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-border/50 bg-background/50 p-6 backdrop-blur-xs transition-all duration-300 hover:border-border hover:shadow-xl hover:-translate-y-1'
            >
              {/* Subtle ambient light on hover */}
              <div
                className={`pointer-events-none absolute -right-16 -top-16 size-48 rounded-full bg-radial ${model.accentGradient} opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-100`}
              />

              <div>
                {/* Top Bar: Provider & Edition Tag */}
                <div className='mb-4 flex items-center justify-between'>
                  <span className='font-mono text-xs font-semibold text-muted-foreground/70 uppercase'>
                    {model.provider}
                  </span>
                  <span
                    className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${model.tagColor}`}
                  >
                    {model.tag}
                  </span>
                </div>

                {/* Model Title & Description */}
                <h3 className='text-xl font-bold tracking-tight text-foreground'>
                  {model.name}
                </h3>
                <p className='text-muted-foreground/80 mt-2 text-xs leading-relaxed'>
                  {model.description}
                </p>

                {/* Feature Chips */}
                <div className='mt-5 flex flex-wrap gap-1.5'>
                  {model.features.map((feat) => (
                    <span
                      key={feat}
                      className='inline-flex items-center gap-1 rounded-md border border-border/40 bg-muted/20 px-2 py-0.5 text-[11px] text-muted-foreground'
                    >
                      <Check className='size-3 text-emerald-500' />
                      <span>{feat}</span>
                    </span>
                  ))}
                </div>
              </div>

              {/* Bottom specs & Quick Action */}
              <div className='mt-6 border-t border-border/40 pt-4 flex items-center justify-between'>
                <span className='font-mono text-[11px] text-muted-foreground/70'>
                  {model.context}
                </span>

                <div className='flex items-center gap-2'>
                  <Button
                    variant='ghost'
                    size='sm'
                    className='h-8 px-3 text-xs font-medium hover:bg-muted'
                    render={<Link to='/dashboard' />}
                  >
                    <span>{t('Access API')}</span>
                    <ArrowUpRight className='ml-1 size-3' />
                  </Button>
                </div>
              </div>
            </AnimateInView>
          ))}
        </div>
      </div>
    </section>
  )
}
