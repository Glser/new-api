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
import { GitBranch, Shield, Terminal, Activity } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { AnimateInView } from '@/components/animate-in-view'

export function SectionTasks() {
  const { t } = useTranslation()
  const [activeStep, setActiveStep] = useState(0)

  const steps = [
    {
      step: '01',
      title: t('Multi-node Upstream Routing'),
      desc: t('Smart failover, weighted load balancing and millisecond health polling ensure request delivery across 40+ providers.'),
      icon: GitBranch,
      details: 'Automatic failover under 50ms with live latency tracking',
    },
    {
      step: '02',
      title: t('Enterprise Quota & Shield'),
      desc: t('Multi-tier token buckets, granular group rate limiting, and real-time defense against anomalous traffic surges.'),
      icon: Shield,
      details: 'Sub-millisecond Redis counter evaluation per API Key',
    },
    {
      step: '03',
      title: t('Unified Data Plane & Observability'),
      desc: t('Native support for OpenAI, Claude, and Gemini formats with structured real-time token tracking and analytics.'),
      icon: Activity,
      details: 'Standardized logs and usage telemetry for finance audits',
    },
  ]

  return (
    <section className="relative z-10 border-t border-border/50 bg-background py-20 md:py-28">
      <div className="mx-auto max-w-6xl px-6">
        <AnimateInView animation="fade-up">
          <div className="text-center md:text-left">
            <div className="font-mono text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              04 / {t('High-availability Architecture')}
            </div>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-foreground md:text-3xl">
              {t('Engineered for Mission-Critical Production.')}
            </h2>
            <p className="mt-3 max-w-xl text-sm text-muted-foreground">
              {t('From small developer prototypes to massive production concurrency, our distributed proxy layer provides resilient stability.')}
            </p>
          </div>
        </AnimateInView>

        <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3">
          {steps.map((item, idx) => {
            const Icon = item.icon
            const isSelected = activeStep === idx
            return (
              <AnimateInView key={item.step} animation="fade-up" delay={idx * 120}>
                <div
                  onClick={() => setActiveStep(idx)}
                  className={`group relative flex cursor-pointer flex-col justify-between rounded-2xl border p-6 transition-all duration-300 ${
                    isSelected
                      ? 'border-emerald-500/80 bg-emerald-500/5 shadow-lg shadow-emerald-500/5 ring-1 ring-emerald-500/30'
                      : 'border-border/70 bg-card/60 hover:border-border hover:bg-muted/20'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                        {item.step}
                      </span>
                      <div
                        className={`flex size-10 items-center justify-center rounded-xl transition-colors ${
                          isSelected
                            ? 'bg-emerald-500 text-white'
                            : 'bg-muted/40 text-muted-foreground group-hover:text-foreground'
                        }`}
                      >
                        <Icon className="size-5" />
                      </div>
                    </div>

                    <h3 className="mt-5 text-base font-semibold text-foreground">
                      {item.title}
                    </h3>
                    <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                      {item.desc}
                    </p>
                  </div>

                  <div className="mt-6 border-t border-border/40 pt-4">
                    <div className="flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground/80">
                      <Terminal className="size-3 text-emerald-500" />
                      <span>{item.details}</span>
                    </div>
                  </div>
                </div>
              </AnimateInView>
            )
          })}
        </div>

        {/* Global SLA strip */}
        <AnimateInView animation="fade-up" delay={400}>
          <div className="mt-12 grid grid-cols-2 gap-4 rounded-2xl border border-border/60 bg-muted/15 p-6 backdrop-blur-xs sm:grid-cols-4">
            <div className="text-center sm:text-left">
              <div className="text-2xl font-bold font-mono tracking-tight text-foreground">99.98%</div>
              <div className="text-[11px] text-muted-foreground mt-0.5">{t('Service Uptime SLA')}</div>
            </div>
            <div className="text-center sm:text-left">
              <div className="text-2xl font-bold font-mono tracking-tight text-foreground">&lt; 35ms</div>
              <div className="text-[11px] text-muted-foreground mt-0.5">{t('Average Gateway Overhead')}</div>
            </div>
            <div className="text-center sm:text-left">
              <div className="text-2xl font-bold font-mono tracking-tight text-foreground">40+</div>
              <div className="text-[11px] text-muted-foreground mt-0.5">{t('Upstream AI Providers')}</div>
            </div>
            <div className="text-center sm:text-left">
              <div className="text-2xl font-bold font-mono tracking-tight text-emerald-600 dark:text-emerald-400">100%</div>
              <div className="text-[11px] text-muted-foreground mt-0.5">{t('OpenAI / Anthropic Compatible')}</div>
            </div>
          </div>
        </AnimateInView>
      </div>
    </section>
  )
}
