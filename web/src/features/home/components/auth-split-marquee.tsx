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
import { motion } from 'motion/react'
import { useTranslation } from 'react-i18next'
import { Star } from 'lucide-react'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { TermsFooter } from '@/features/auth/components/terms-footer'
import { UserAuthForm } from '@/features/auth/sign-in/components/user-auth-form'
import { useStatus } from '@/hooks/use-status'
import { useSystemConfig } from '@/hooks/use-system-config'
import { cn } from '@/lib/utils'

interface Testimonial {
  name: string
  role: string
  avatar: string
  content: string
  stars: number
}

const TESTIMONIALS_COL_1: Testimonial[] = [
  {
    name: 'Sarah Chen',
    role: 'Staff ML Engineer @ Synthetix',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
    content:
      'The multi-channel routing and failover speed is incredible. Our downstream latency dropped by 38% on day one.',
    stars: 5,
  },
  {
    name: 'Alex Rivera',
    role: 'Founder @ PromptLab',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    content:
      'Unified OpenAI/Claude/Gemini protocol with instant model fallback. Zero maintenance overhead for our AI copilot stack.',
    stars: 5,
  },
  {
    name: 'Elena Rostova',
    role: 'Lead Architect @ DataVenture',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    content:
      'Visual group pricing, automatic channel weight balancing, and granular token quota rules. The ultimate LLM gateway.',
    stars: 5,
  },
  {
    name: 'Marcus Brody',
    role: 'CTO @ NexusFlow AI',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    content:
      'Seamless deployment and top-tier reliability. Our enterprise token consumption monitoring has never been clearer.',
    stars: 5,
  },
]

const TESTIMONIALS_COL_2: Testimonial[] = [
  {
    name: 'David Kim',
    role: 'AI Infrastructure Lead',
    avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80',
    content:
      'Consistently lowest time-to-first-token across all providers. The stream proxy performance is genuinely unmatched.',
    stars: 5,
  },
  {
    name: 'Chloe Dubois',
    role: 'Product Engineer @ LangCraft',
    avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
    content:
      'The UI redesign is stunning. Responsive, intuitive channel configurations, and full control over every token.',
    stars: 5,
  },
  {
    name: 'Wei Zhang',
    role: 'DevOps Principal @ CloudCore',
    avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&auto=format&fit=crop&q=80',
    content:
      'Upstream ratio syncing and fine-grained quota control saved our company thousands in API spend every month.',
    stars: 5,
  },
  {
    name: 'Amina Al-Mansoor',
    role: 'Head of AI @ Cognition Works',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80',
    content:
      'The passkey authentication and security features give us absolute peace of mind for multi-tenant deployments.',
    stars: 5,
  },
]

function TestimonialCard({ item }: { item: Testimonial }) {
  return (
    <div className='relative mb-4 overflow-hidden rounded-2xl border border-border/60 bg-card/60 p-5 shadow-sm backdrop-blur-xl transition-all duration-300 hover:border-foreground/20 hover:bg-card/90 hover:shadow-md'>
      <div className='flex items-center gap-3'>
        <Avatar className='size-10 border border-border/80'>
          <AvatarImage src={item.avatar} alt={item.name} />
          <AvatarFallback className='text-xs font-semibold'>
            {item.name.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className='min-w-0 flex-1'>
          <h4 className='truncate text-sm font-semibold tracking-tight text-foreground'>
            {item.name}
          </h4>
          <p className='truncate text-xs text-muted-foreground'>{item.role}</p>
        </div>
        <div className='flex items-center gap-0.5 text-amber-500'>
          {Array.from({ length: item.stars }).map((_, i) => (
            <Star key={i} className='size-3.5 fill-current' />
          ))}
        </div>
      </div>
      <p className='mt-3.5 text-xs leading-relaxed text-muted-foreground'>
        &ldquo;{item.content}&rdquo;
      </p>
    </div>
  )
}

function MarqueeColumn({
  items,
  reverse = false,
  duration = 35,
}: {
  items: Testimonial[]
  reverse?: boolean
  duration?: number
}) {
  return (
    <div className='relative h-[680px] w-full overflow-hidden'>
      <motion.div
        className='flex flex-col'
        animate={{
          y: reverse ? ['-50%', '0%'] : ['0%', '-50%'],
        }}
        transition={{
          repeat: Infinity,
          ease: 'linear',
          duration,
        }}
      >
        {[...items, ...items].map((item, idx) => (
          <TestimonialCard key={`${item.name}-${idx}`} item={item} />
        ))}
      </motion.div>
    </div>
  )
}

export function AuthSplitMarquee({
  isAuthenticated,
}: {
  isAuthenticated?: boolean
}) {
  const { t } = useTranslation()
  const { status } = useStatus()
  const { systemName } = useSystemConfig()

  return (
    <section className='relative min-h-[calc(100svh-4rem)] w-full overflow-hidden pt-20 pb-12 sm:pt-24'>
      {/* Background ambient lighting */}
      <div
        aria-hidden='true'
        className='pointer-events-none absolute -top-40 left-1/2 -z-10 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-gradient-to-b from-primary/10 via-primary/5 to-transparent blur-3xl'
      />
      <div
        aria-hidden='true'
        className='pointer-events-none absolute bottom-0 right-0 -z-10 size-[420px] rounded-full bg-primary/5 blur-3xl'
      />

      <div className='container mx-auto grid max-w-7xl items-center gap-12 px-4 lg:grid-cols-12 lg:gap-8'>
        {/* Left Column: Sign-in / Welcome Box */}
        <div className='flex flex-col justify-center lg:col-span-6 xl:col-span-5'>
          <div className='mx-auto w-full max-w-md space-y-6 rounded-3xl border border-border/60 bg-card/70 p-7 shadow-xl shadow-black/[0.03] backdrop-blur-2xl sm:p-9 dark:bg-card/40 dark:shadow-black/30'>
            {/* Header info */}
            <div className='space-y-2 text-left'>
              <div className='inline-flex items-center gap-2 rounded-full border border-border/80 bg-background/80 px-3 py-1 text-xs font-medium text-foreground backdrop-blur-md'>
                <span className='size-1.5 rounded-full bg-emerald-500 animate-pulse' />
                {systemName} • Next-Gen Gateway
              </div>
              <h2 className='text-2xl font-bold tracking-tight text-foreground sm:text-3xl'>
                {isAuthenticated ? t('Welcome Back') : t('Sign in to continue')}
              </h2>
              <p className='text-xs text-muted-foreground sm:text-sm'>
                {isAuthenticated
                  ? t('You are currently signed in. Jump right into your console.')
                  : t('Access your unified model endpoints, keys, and quotas.')}
              </p>
            </div>

            {isAuthenticated ? (
              <div className='space-y-4 pt-4'>
                <Link
                  to='/dashboard'
                  className='group relative inline-flex h-11 w-full cursor-pointer items-center justify-center overflow-hidden rounded-xl bg-foreground px-6 text-sm font-semibold text-background shadow-md transition-all duration-300 hover:-translate-y-px hover:shadow-lg active:translate-y-px'
                >
                  <span
                    aria-hidden='true'
                    className='pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 ease-out group-hover:translate-x-full dark:via-black/20'
                  />
                  <span>{t('Go to Dashboard')}</span>
                </Link>
                <div className='text-center text-xs text-muted-foreground'>
                  <Link
                    to='/profile'
                    className='underline underline-offset-4 hover:text-foreground'
                  >
                    {t('Manage Account')}
                  </Link>
                </div>
              </div>
            ) : (
              <>
                <UserAuthForm redirectTo='/dashboard' />

                {!status?.self_use_mode_enabled &&
                  status?.register_enabled !== false && (
                    <div className='text-center text-xs text-muted-foreground sm:text-sm'>
                      {t("Don't have an account?")}{' '}
                      <Link
                        to='/sign-up'
                        className='font-semibold text-foreground underline underline-offset-4 hover:text-primary'
                      >
                        {t('Sign up')}
                      </Link>
                    </div>
                  )}

                <TermsFooter
                  variant='sign-in'
                  status={status}
                  className='pt-2 text-center text-xs'
                />
              </>
            )}
          </div>
        </div>

        {/* Right Column: Split Testimonials Marquee Showcase */}
        <div className='relative hidden h-[700px] overflow-hidden lg:col-span-6 lg:block xl:col-span-7'>
          {/* Top & Bottom gradient mask for smooth fading */}
          <div className='pointer-events-none absolute inset-x-0 top-0 z-10 h-24 bg-gradient-to-b from-background via-background/80 to-transparent' />
          <div className='pointer-events-none absolute inset-x-0 bottom-0 z-10 h-24 bg-gradient-to-t from-background via-background/80 to-transparent' />

          <div className='grid grid-cols-2 gap-4 px-2'>
            <MarqueeColumn items={TESTIMONIALS_COL_1} duration={40} />
            <MarqueeColumn
              items={TESTIMONIALS_COL_2}
              reverse={true}
              duration={46}
            />
          </div>
        </div>
      </div>
    </section>
  )
}
