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
      glowColor: "rgba(16, 163, 127, 0.32)",
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
      glowColor: "rgba(217, 119, 6, 0.32)",
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
      glowColor: "rgba(59, 130, 246, 0.32)",
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
      glowColor: "rgba(236, 72, 153, 0.32)",
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
      glowColor: "rgba(16, 185, 129, 0.32)",
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
      glowColor: "rgba(2, 132, 199, 0.32)",
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
        className="relative flex h-[300px] w-full items-center justify-center overflow-visible"
        style={{ perspective: "1200px" }}
      >
        {agents.map((agent, index) => {
          let offset = index - activeIndex
          if (offset > total / 2) offset -= total
          if (offset < -total / 2) offset += total

          const isCenter = offset === 0
          const absOffset = Math.abs(offset)
          const isVisible = absOffset <= 2

          const translateX = offset * 118
          const translateY = Math.pow(offset, 2) * 8
          const translateZ = 120 - absOffset * 70
          const rotateY = offset * -12
          const scale = isCenter ? 1.02 : Math.max(0.72, 1 - absOffset * 0.12)
          const opacity = isCenter ? 1 : Math.max(0, 0.85 - absOffset * 0.35)
          const zIndex = 20 - absOffset

          return (
            <div
              key={agent.id}
              onClick={() => setActiveIndex(index)}
              style={{
                transform:
                  "translateX(" +
                  translateX +
                  "px) translateY(" +
                  translateY +
                  "px) translateZ(" +
                  translateZ +
                  "px) rotateY(" +
                  rotateY +
                  "deg) scale(" +
                  scale +
                  ")",
                zIndex,
                opacity: isVisible ? opacity : 0,
                pointerEvents: isVisible ? "auto" : "none",
                boxShadow: isCenter
                  ? "0 24px 48px -24px " +
                    agent.glowColor +
                    ", 0 12px 24px -16px rgba(0,0,0,0.22)"
                  : "0 8px 20px -16px rgba(0,0,0,0.18)",
                transition:
                  "transform 520ms cubic-bezier(0.2, 0.85, 0.32, 1.05), opacity 420ms ease, box-shadow 420ms ease",
              }}
              className={
                "group absolute top-4 flex w-[240px] sm:w-[255px] cursor-pointer flex-col rounded-2xl border border-border/70 bg-card/90 p-5 backdrop-blur-md select-none transition-colors " +
                (isCenter
                  ? "border-border/95 bg-card shadow-lg ring-1 ring-border/50"
                  : "hover:border-border/85")
              }
            >
              {/* Header: Clean Icon & Status Indicator */}
              <div className="flex items-center justify-between">
                {agent.icon}
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px] font-medium uppercase tracking-wider text-muted-foreground/60">
                    {agent.tag}
                  </span>
                  <div
                    className="size-2 rounded-full transition-all duration-300"
                    style={{
                      backgroundColor: isCenter ? agent.accentColor : "var(--border)",
                      boxShadow: isCenter ? "0 0 8px " + agent.accentColor : "none",
                    }}
                  />
                </div>
              </div>

              {/* Title & Description */}
              <div className="mt-4.5 flex flex-col">
                <h4 className="text-[15px] font-semibold tracking-tight text-foreground sm:text-base">
                  {agent.name}
                </h4>
                <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-muted-foreground/85">
                  {t(agent.descKey, agent.defaultDesc)}
                </p>
              </div>

              {/* Bottom Subtle Action Strip: 一键配置 */}
              <div className="mt-5 flex items-center justify-between border-t border-border/40 pt-3.5">
                <span className="font-mono text-[10px] tracking-wider text-muted-foreground/50 uppercase">
                  READY TO USE
                </span>
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
                    "group/btn relative inline-flex cursor-pointer items-center gap-1.5 overflow-hidden rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-all duration-200 " +
                    (isCenter
                      ? "bg-foreground text-background shadow-xs hover:bg-foreground/90 hover:shadow-sm"
                      : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground")
                  }
                >
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
