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
import { ArrowUpRight, GitBranch, Shield, Zap, Terminal, Activity } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { AnimateInView } from '@/components/animate-in-view'
import { Button } from '@/components/ui/button'

export function SectionTasks() {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState(0)

  const capabilities = [
    {
      title: t('Organize Solutions'),
      icon: GitBranch,
      desc: t('Transform abstract problems into structured dependency graphs.'),
      steps: [
        'Analyze Constraints & Edge Cases',
        'Decompose into Sub-tasks',
        'Map Data Flow & Interfaces'
      ],
      mockCode: '{\n  "phase": "Architecture Setup",\n  "dependencies": ["DB Design", "API Gateway"],\n  "status": "Ready to execute"\n}'
    },
    {
      title: t('Write Logic'),
      icon: Terminal,
      desc: t('Generate production-grade code with error handling and types.'),
      steps: [
        'Scaffold Components & Services',
        'Implement Business Logic',
        'Write Unit Tests & Mocks'
      ],
      mockCode: 'async function fetchPipeline(id: string): Promise<Result> {\n  const res = await api.get(`/v1/pipelines/${id}`)\n  if (!res.ok) throw new Error("Pipeline fetch failed")\n  return res.json()\n}'
    },
    {
      title: t('Refine Copywriting'),
      icon: Shield,
      desc: t('Polish technical docs, commit messages, and user-facing copy.'),
      steps: [
        'Adjust Tone & Voice',
        'Ensure Technical Accuracy',
        'Format Markdown & Diagrams'
      ],
      mockCode: '## Pipeline API Reference\n\nRetrieves the execution status of a specific pipeline.\n\n### Authentication\nRequires a valid Bearer token.'
    }
  ]

  return (
    <section id='tasks' className='relative z-10 border-t border-border/40 px-6 py-20 md:py-28 bg-background'>
      <div className='mx-auto max-w-6xl'>
        {/* Curatorial Header */}
        <AnimateInView className='mb-14 flex flex-col md:flex-row md:items-end md:justify-between gap-6'>
          <div>
            <div className='mb-3 inline-flex items-center gap-2 font-mono text-xs font-semibold tracking-widest text-emerald-500 uppercase'>
              <span>04 /</span>
              <span>{t('Logic & Disassembly')}</span>
            </div>
            <h2 className='text-3xl font-black tracking-tight sm:text-4xl md:text-5xl'>
              {t('Systematic Logic & Code Refinement')}
            </h2>
            <p className='text-muted-foreground/80 mt-3 max-w-xl text-sm leading-relaxed md:text-base'>
              {t('Break down complex engineering tasks into executable steps. Model logic capabilities mapped to practical software development workflows.')}
            </p>
          </div>

          <div className='flex items-center gap-3'>
            <Button
              variant='outline'
              className='group h-10 rounded-lg border-border/60 hover:border-border text-xs font-medium'
              render={<Link to='/dashboard' />}
            >
              <span>{t('Explore in Console')}</span>
              <ArrowUpRight className='ml-1.5 size-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5' />
            </Button>
          </div>
        </AnimateInView>

        {/* Interactive Engineering Tabs */}
        <div className='grid grid-cols-1 gap-12 lg:grid-cols-12 items-start'>
          {/* Left: Tab List */}
          <div className='flex flex-col gap-2 lg:col-span-5'>
            {capabilities.map((cap, idx) => {
              const Icon = cap.icon
              const isSelected = activeTab === idx
              return (
                <button
                  key={cap.title}
                  onClick={() => setActiveTab(idx)}
                  className={`group relative flex items-start gap-4 rounded-2xl border p-4 text-left transition-all duration-300 ${
                    isSelected
                      ? 'border-emerald-500/50 bg-muted/40 shadow-sm'
                      : 'border-border/40 bg-transparent hover:border-border/80 hover:bg-muted/20'
                  }`}
                >
                  <div className={`mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg border transition-colors ${
                    isSelected ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-500' : 'border-border/60 bg-muted text-muted-foreground group-hover:text-foreground'
                  }`}>
                    <Icon className='size-4' />
                  </div>
                  <div>
                    <h3 className={`text-base font-bold transition-colors ${isSelected ? 'text-foreground' : 'text-foreground/80'}`}>
                      {cap.title}
                    </h3>
                    <p className='text-xs text-muted-foreground/80 mt-1 leading-relaxed'>
                      {cap.desc}
                    </p>
                  </div>
                </button>
              )
            })}
          </div>

          {/* Right: Code Execution Demo */}
          <div className='lg:col-span-7'>
            <div className='relative overflow-hidden rounded-2xl border border-border/60 bg-neutral-950 shadow-2xl'>
              {/* Window Header */}
              <div className='flex items-center gap-2 border-b border-white/10 bg-neutral-900/50 px-4 py-3'>
                <div className='flex gap-1.5'>
                  <div className='size-3 rounded-full bg-red-500/80' />
                  <div className='size-3 rounded-full bg-amber-500/80' />
                  <div className='size-3 rounded-full bg-emerald-500/80' />
                </div>
                <div className='ml-3 flex items-center gap-2 font-mono text-[10px] text-white/50'>
                  <Activity className='size-3 text-emerald-400' />
                  <span>task_runner_v2.sh</span>
                </div>
              </div>

              {/* Window Content */}
              <div className='flex flex-col md:flex-row'>
                {/* Plan View */}
                <div className='flex-1 border-b border-white/5 bg-neutral-900/30 p-5 md:border-b-0 md:border-r'>
                  <div className='mb-4 font-mono text-[10px] font-bold tracking-wider text-white/40 uppercase'>
                    EXECUTION PLAN
                  </div>
                  <ul className='space-y-4'>
                    {capabilities[activeTab].steps.map((step, stepIdx) => (
                      <li key={step} className='flex items-start gap-3'>
                        <div className='mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 font-mono text-[9px]'>
                          {stepIdx + 1}
                        </div>
                        <span className='font-mono text-[11px] text-white/70'>
                          {step}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
                {/* Editor View */}
                <div className='flex-[1.5] p-5'>
                  <div className='mb-4 font-mono text-[10px] font-bold tracking-wider text-white/40 uppercase'>
                    OUTPUT BUFFER
                  </div>
                  <pre className='overflow-x-auto text-[11px] leading-relaxed text-emerald-400/90 font-mono'>
                    {capabilities[activeTab].mockCode}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
