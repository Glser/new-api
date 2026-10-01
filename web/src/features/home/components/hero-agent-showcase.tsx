/*
Copyright (C) 2023-2026 QuantumNous
*/
import { useEffect, useRef, useState } from "react"
import {
  ClaudeCode,
  CodeBuddy,
  Codex,
  DeepSeek,
  HermesAgent,
  Trae,
} from "@lobehub/icons"
import { ArrowUpRight } from "lucide-react"
import { useTranslation } from "react-i18next"

export interface AgentItem {
  id: string
  name: string
  tag: string
  descKey: string
  defaultDesc: string
  guideUrl: string
  accentColor: string
  glowColor: string
  icon: React.ReactNode
}

const DEFAULT_GUIDE_URL = "https://api.oioi.lat/pages/codex-guide/#agent/workbuddy"

export function HeroAgentShowcase() {
  const { t } = useTranslation()
  const [activeIndex, setActiveIndex] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const agents: AgentItem[] = [
    {
      id: "chatgpt",
      name: "ChatGPT (codex)",
      tag: "Codex Agent",
      descKey: "hero_agent_chatgpt_desc",
      defaultDesc: "官方架构原生驱动，深度支持 Codex 桌面与智能交互",
      guideUrl: "https://api.oioi.lat/pages/codex-guide/#codex/start",
      accentColor: "#10a37f",
      glowColor: "rgba(16, 163, 127, 0.28)",
      icon: (
        <div className="flex size-11 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 transition-transform duration-300 group-hover:scale-105 dark:text-emerald-400">
          <Codex.Color size={26} />
        </div>
      ),
    },
    {
      id: "claude-code",
      name: "Claude Code",
      tag: "CLI Agent",
      descKey: "hero_agent_claude_code_desc",
      defaultDesc: "命令行原生自主编程 Agent，全流程理解架构与推演",
      guideUrl: DEFAULT_GUIDE_URL,
      accentColor: "#d97706",
      glowColor: "rgba(217, 119, 6, 0.28)",
      icon: (
        <div className="flex size-11 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 transition-transform duration-300 group-hover:scale-105 dark:text-amber-400">
          <ClaudeCode.Color size={26} />
        </div>
      ),
    },
    {
      id: "workbuddy",
      name: "WorkBuddy",
      tag: "Agent",
      descKey: "hero_agent_workbuddy_desc",
      defaultDesc: "企业协同研发与办公智能体，深度融入业务开发流",
      guideUrl: "https://api.oioi.lat/pages/codex-guide/#agent/workbuddy",
      accentColor: "#3b82f6",
      glowColor: "rgba(59, 130, 246, 0.28)",
      icon: (
        <div className="flex size-11 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-600 transition-transform duration-300 group-hover:scale-105 dark:text-blue-400">
          <CodeBuddy.Color size={26} />
        </div>
      ),
    },
    {
      id: "hermes",
      name: "Hermes",
      tag: "Autonomous",
      descKey: "hero_agent_hermes_desc",
      defaultDesc: "高阶自主 Agent 与复杂工具调用核心，敏捷响应任务流",
      guideUrl: "https://api.oioi.lat/pages/codex-guide/#agent/hermes",
      accentColor: "#ec4899",
      glowColor: "rgba(236, 72, 153, 0.28)",
      icon: (
        <div className="flex size-11 items-center justify-center rounded-2xl bg-pink-500/10 text-pink-600 transition-transform duration-300 group-hover:scale-105 dark:text-pink-400">
          <HermesAgent size={26} />
        </div>
      ),
    },
    {
      id: "trae",
      name: "Trae",
      tag: "AI IDE",
      descKey: "hero_agent_trae_desc",
      defaultDesc: "原生智能化 AI IDE，深度集成多模态代码分析与上下文",
      guideUrl: "https://api.oioi.lat/pages/codex-guide/#agent/trae",
      accentColor: "#10b981",
      glowColor: "rgba(16, 185, 129, 0.28)",
      icon: (
        <div className="flex size-11 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 transition-transform duration-300 group-hover:scale-105 dark:text-emerald-400">
          <Trae.Color size={26} />
        </div>
      ),
    },
    {
      id: "deepseek-harness",
      name: "DeepSeek Harness",
      tag: "Reasoning",
      descKey: "hero_agent_deepseek_harness_desc",
      defaultDesc: "深度推理工程驾驭套件，全面激发 R1 满血思考链潜能",
      guideUrl: DEFAULT_GUIDE_URL,
      accentColor: "#0284c7",
      glowColor: "rgba(2, 132, 199, 0.28)",
      icon: (
        <div className="flex size-11 items-center justify-center rounded-2xl bg-sky-500/10 text-sky-600 transition-transform duration-300 group-hover:scale-105 dark:text-sky-400">
          <DeepSeek.Color size={26} />
        </div>
      ),
    },
  ]

  const total = agents.length

  useEffect(() => {
    if (isPaused) return
    timerRef.current = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % total)
    }, 4000)

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [isPaused, total])

  return (
    <div
      className="relative flex w-full max-w-[560px] flex-col items-center select-none"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* 3D Stack Stage */}
      <div
        className="relative flex h-[310px] w-full items-center justify-center overflow-visible"
        style={{ perspective: "1200px" }}
      >
        {agents.map((agent, index) => {
          let offset = index - activeIndex
          if (offset > total / 2) offset -= total
          if (offset < -total / 2) offset += total

          const isCenter = offset === 0
          const absOffset = Math.abs(offset)
          const isVisible = absOffset <= 2

          // Center card stands firmly on top (z-index 40).
          // Immediate adjacent cards (offset +-1) stay at z-index 20.
          // Cards wrapping or further behind drop to 10 or 0.
          const zIndex = isCenter ? 40 : absOffset === 1 ? 20 : 10 - absOffset

          // Exact pixel transforms to maintain 100% crisp vector font rendering on active card
          const translateX = offset * 135
          const translateY = isCenter ? 0 : 14 + absOffset * 4
          const translateZ = isCenter ? 0 : -absOffset * 80
          const rotateY = isCenter ? 0 : offset * -14
          const scale = isCenter ? 1 : 0.88 - (absOffset - 1) * 0.1
          const opacity = isCenter ? 1 : absOffset === 1 ? 0.65 : 0

          return (
            <div
              key={agent.id}
              onClick={() => {
                if (!isCenter) setActiveIndex(index)
              }}
              style={{
                transform: `translate3d(${translateX}px, ${translateY}px, ${translateZ}px) rotateY(${rotateY}deg) scale(${scale})`,
                zIndex,
                opacity: isVisible ? opacity : 0,
                pointerEvents: isCenter ? "auto" : isVisible ? "auto" : "none",
                backfaceVisibility: "hidden",
                WebkitBackfaceVisibility: "hidden",
                boxShadow: isCenter
                  ? `0 20px 45px -18px ${agent.glowColor}, 0 10px 24px -12px rgba(0,0,0,0.18)`
                  : "0 8px 24px -16px rgba(0,0,0,0.14)",
                transition:
                  "transform 560ms cubic-bezier(0.16, 1, 0.3, 1), opacity 450ms ease, box-shadow 450ms ease",
              }}
              className={
                "group absolute top-2 flex w-[260px] sm:w-[275px] flex-col rounded-2xl border p-5 select-none transition-colors " +
                (isCenter
                  ? "border-border bg-card shadow-lg ring-1 ring-border/50 cursor-default"
                  : "border-border/60 bg-card/85 backdrop-blur-sm cursor-pointer hover:border-border/90 hover:opacity-85")
              }
            >
              {/* Header: Clean Icon & Status Indicator */}
              <div className="flex items-center justify-between">
                {agent.icon}
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70">
                    {agent.tag}
                  </span>
                  <div
                    className="size-2 rounded-full transition-all duration-300"
                    style={{
                      backgroundColor: isCenter ? agent.accentColor : "var(--border)",
                      boxShadow: isCenter ? `0 0 8px ${agent.accentColor}` : "none",
                    }}
                  />
                </div>
              </div>

              {/* Title & Description */}
              <div className="mt-4 flex flex-col">
                <h4 className="text-[15px] sm:text-base font-semibold tracking-tight text-foreground antialiased">
                  {agent.name}
                </h4>
                <p className="mt-1.5 line-clamp-2 text-xs sm:text-[13px] leading-relaxed text-muted-foreground antialiased min-h-[38px]">
                  {t(agent.descKey, agent.defaultDesc)}
                </p>
              </div>

              {/* Bottom Subtle Action Strip: 一键配置 */}
              <div className="mt-5 flex items-center justify-end border-t border-border/40 pt-3.5">
                <a
                  href={agent.guideUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(event) => {
                    if (!isCenter) {
                      event.preventDefault()
                      setActiveIndex(index)
                    }
                  }}
                  className={
                    "group/btn relative inline-flex h-8 sm:h-8.5 items-center gap-1.5 overflow-hidden rounded-lg px-3.5 text-xs font-semibold shadow-[0_3px_10px_rgba(0,0,0,0.1)] transition-all duration-300 active:scale-[0.98] cursor-pointer " +
                    (isCenter
                      ? "bg-foreground text-background hover:scale-[1.03] hover:shadow-[0_6px_18px_rgba(0,0,0,0.18)] dark:shadow-[0_3px_12px_rgba(255,255,255,0.06)]"
                      : "bg-foreground/80 text-background opacity-90")
                  }
                >
                  {/* Luminous shimmer overlay on hover */}
                  <span
                    aria-hidden
                    className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 ease-out group-hover/btn:translate-x-full"
                  />
                  <span>{t("hero_agent_configure", "一键配置")}</span>
                  <ArrowUpRight className="size-3.5 transition-transform duration-200 group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5" />
                </a>
              </div>
            </div>
          )
        })}
      </div>

      {/* Indicator & Bottom Footnote */}
      <div className="mt-4 flex w-full flex-col items-center gap-3">
        <div className="flex items-center gap-1.5">
          {agents.map((agent, index) => (
            <button
              key={agent.id}
              type="button"
              onClick={() => setActiveIndex(index)}
              aria-label={agent.name}
              className={
                "h-1.5 cursor-pointer rounded-full transition-all duration-300 " +
                (index === activeIndex
                  ? "w-6 bg-foreground"
                  : "w-1.5 bg-muted-foreground/30 hover:bg-muted-foreground/60")
              }
            />
          ))}
        </div>
        <p className="text-center font-mono text-[11px] text-muted-foreground/65">
          {t("hero_agent_footer")}
        </p>
      </div>
    </div>
  )
}
