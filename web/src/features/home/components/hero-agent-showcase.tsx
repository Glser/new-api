import { ArrowUpRight } from 'lucide-react'
/*
Copyright (C) 2023-2026 QuantumNous
*/
import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { useStatus } from '@/hooks/use-status'
import { getLobeIcon } from '@/lib/lobe-icon'

interface AgentItem {
  id: string
  name: string
  tag: string
  description: string
  guide_url: string
  icon_key: string
  accent_color: string
}

const DEFAULT_GUIDE_URL =
  'https://api.oioi.lat/pages/codex-guide/#agent/workbuddy'

const FALLBACK_AGENTS: AgentItem[] = [
  {
    id: 'chatgpt',
    name: 'ChatGPT Work(Codex)',
    tag: 'Codex Agent',
    description: 'OpenAI 官方编程智能体，终端与云端任务一站调度',
    guide_url: 'https://api.oioi.lat/pages/codex-guide/#codex/install',
    icon_key: 'Codex.Color',
    accent_color: '#10a37f',
  },
  {
    id: 'claude-code',
    name: 'Claude Code',
    tag: 'CLI Agent',
    description: 'Anthropic 终端编程智能体，长上下文推理与自动重构',
    guide_url: DEFAULT_GUIDE_URL,
    icon_key: 'ClaudeCode.Color',
    accent_color: '#d97706',
  },
  {
    id: 'workbuddy',
    name: 'WorkBuddy',
    tag: 'Agent',
    description: '企业协同研发智能体，贯通需求、编码与交付全流程',
    guide_url: 'https://api.oioi.lat/pages/codex-guide/#agent/workbuddy',
    icon_key: 'CodeBuddy.Color',
    accent_color: '#3b82f6',
  },
  {
    id: 'hermes',
    name: 'Hermes',
    tag: 'Autonomous',
    description: '高阶自主智能体，复杂工具调用与多步任务自动执行',
    guide_url: 'https://api.oioi.lat/pages/codex-guide/#agent/hermes',
    icon_key: 'HermesAgent',
    accent_color: '#ec4899',
  },
  {
    id: 'trae',
    name: 'Trae',
    tag: 'AI IDE',
    description: 'AI 原生 IDE，上下文感知的编码、调试与重构体验',
    guide_url: 'https://api.oioi.lat/pages/codex-guide/#agent/trae',
    icon_key: 'Trae.Color',
    accent_color: '#10b981',
  },
  {
    id: 'deepseek-harness',
    name: 'DeepSeek Harness',
    tag: 'Reasoning',
    description: 'DeepSeek 推理加速套件，完整释放长思考链潜能',
    guide_url: DEFAULT_GUIDE_URL,
    icon_key: 'DeepSeek.Color',
    accent_color: '#0284c7',
  },
]

export function HeroAgentShowcase() {
  const { t } = useTranslation()
  const { status } = useStatus()
  const [activeIndex, setActiveIndex] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // 动态读取后台 /api/status 中配置的 agents 数组
  const agents: AgentItem[] = useMemo(() => {
    const raw = (status as Record<string, unknown> | null)?.agents
    if (Array.isArray(raw) && raw.length > 0) {
      return raw as AgentItem[]
    }
    return FALLBACK_AGENTS
  }, [status])

  const total = agents.length

  useEffect(() => {
    if (isPaused || total <= 1) return
    timerRef.current = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % total)
    }, 6000)

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [isPaused, total])

  return (
    <div
      className='relative flex w-full max-w-[560px] flex-col items-center select-none'
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* 3D Stack Stage */}
      <div
        className='relative flex h-[310px] w-full items-center justify-center overflow-visible'
        style={{ perspective: '1200px' }}
      >
        {agents.map((agent, index) => {
          let offset = index - activeIndex
          if (offset > total / 2) offset -= total
          if (offset < -total / 2) offset += total

          const isCenter = offset === 0
          const absOffset = Math.abs(offset)
          const isVisible = absOffset <= 2

          let zIndex: number
          if (isCenter) {
            zIndex = 40
          } else if (absOffset === 1) {
            zIndex = 20
          } else {
            zIndex = 10 - absOffset
          }

          const translateX = offset * 135
          const translateY = isCenter ? 0 : 14 + absOffset * 4
          const translateZ = isCenter ? 0 : -absOffset * 80
          const rotateY = isCenter ? 0 : offset * -14
          const scale = isCenter ? 1 : 0.88 - (absOffset - 1) * 0.1
          let opacity: number
          if (isCenter) {
            opacity = 1
          } else if (absOffset === 1) {
            opacity = 0.65
          } else {
            opacity = 0
          }

          const accentColor = agent.accent_color || '#3b82f6'

          return (
            <div
              key={agent.id || index}
              onClick={() => {
                if (!isCenter) setActiveIndex(index)
              }}
              style={{
                transform: `translate3d(${translateX}px, ${translateY}px, ${translateZ}px) rotateY(${rotateY}deg) scale(${scale})`,
                zIndex,
                opacity: isVisible ? opacity : 0,
                pointerEvents: isCenter || isVisible ? 'auto' : 'none',
                backfaceVisibility: 'hidden',
                WebkitBackfaceVisibility: 'hidden',
                boxShadow: isCenter
                  ? `0 20px 45px -18px ${accentColor}44, 0 10px 24px -12px rgba(0,0,0,0.18)`
                  : '0 8px 24px -16px rgba(0,0,0,0.14)',
                transition:
                  'transform 560ms cubic-bezier(0.16, 1, 0.3, 1), opacity 450ms ease, box-shadow 450ms ease',
              }}
              className={`group absolute top-2 flex w-[260px] flex-col rounded-2xl border p-5 transition-colors select-none sm:w-[275px] ${isCenter ? 'border-border bg-card ring-border/50 cursor-default shadow-lg ring-1' : 'border-border/60 bg-card/85 hover:border-border/90 cursor-pointer backdrop-blur-sm hover:opacity-85'}`}
            >
              {/* Header: Clean Icon & Centered Name */}
              <div className='flex items-center gap-3'>
                <div className='flex size-11 shrink-0 items-center justify-center rounded-2xl bg-foreground/5 p-2 transition-transform duration-300 group-hover:scale-105'>
                  {getLobeIcon(agent.icon_key, 26)}
                </div>
                <h4
                  className='text-foreground min-w-0 text-[14.5px] font-semibold leading-tight tracking-tight antialiased sm:text-[15px]'
                  title={agent.name}
                >
                  {agent.name}
                </h4>
              </div>

              {/* Description */}
              <div className='mt-3 flex flex-col'>
                <p className='text-muted-foreground line-clamp-2 min-h-[38px] text-xs leading-relaxed antialiased sm:text-[13px]'>
                  {agent.description}
                </p>
              </div>

              {/* Bottom Action Area: 左下角 Tag + 状态小点，右下角一键配置按钮（无灰色分割线） */}
              <div className='mt-5 flex items-center justify-between gap-2'>
                <div className='flex items-center gap-1.5'>
                  <div
                    className='size-1.5 shrink-0 rounded-full transition-all duration-300'
                    style={{
                      backgroundColor: isCenter ? accentColor : 'var(--border)',
                      boxShadow: isCenter ? `0 0 6px ${accentColor}` : 'none',
                    }}
                  />
                  <span className='text-muted-foreground/70 font-mono text-[10px] font-medium tracking-wider uppercase'>
                    {agent.tag}
                  </span>
                </div>

                <a
                  href={agent.guide_url || DEFAULT_GUIDE_URL}
                  target='_blank'
                  rel='noopener noreferrer'
                  onClick={(event) => {
                    if (!isCenter) {
                      event.preventDefault()
                      setActiveIndex(index)
                    }
                  }}
                  className={`group/btn relative inline-flex h-8 cursor-pointer items-center gap-1.5 overflow-hidden rounded-lg px-3.5 text-xs font-semibold shadow-[0_3px_10px_rgba(0,0,0,0.1)] transition-all duration-300 active:translate-y-px sm:h-8.5 ${isCenter ? 'bg-foreground text-background hover:-translate-y-px hover:shadow-[0_6px_18px_rgba(0,0,0,0.18)] dark:shadow-[0_3px_12px_rgba(255,255,255,0.06)]' : 'bg-foreground/80 text-background opacity-90'}`}
                >
                  <span
                    aria-hidden='true'
                    className='pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 ease-out group-hover/btn:translate-x-full'
                  />
                  <span>{t('hero_agent_configure', '一键配置')}</span>
                  <ArrowUpRight className='size-3.5 transition-transform duration-200 group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5' />
                </a>
              </div>
            </div>
          )
        })}
      </div>

      {/* Indicator & Bottom Footnote */}
      <div className='-mt-[72px] flex w-full flex-col items-center gap-2.5'>
        <div className='flex items-center gap-1.5'>
          {agents.map((agent, index) => (
            <button
              key={agent.id || index}
              type='button'
              onClick={() => setActiveIndex(index)}
              aria-label={agent.name}
              className={`h-1.5 cursor-pointer rounded-full transition-all duration-300 ${index === activeIndex ? 'w-6 bg-foreground' : 'w-1.5 bg-muted-foreground/30 hover:bg-muted-foreground/60'}`}
            />
          ))}
        </div>
        <p className='text-muted-foreground/65 text-center font-mono text-[11px]'>
          {t('hero_agent_footer')}
        </p>
      </div>
    </div>
  )
}
