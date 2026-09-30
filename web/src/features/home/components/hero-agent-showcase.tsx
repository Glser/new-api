/*
Copyright (C) 2023-2026 QuantumNous
*/
import { useEffect, useRef, useState } from "react"
import {
  ClaudeCode,
  CodeBuddy,
  DeepSeek,
  HermesAgent,
  OpenAI,
  Trae,
} from "@lobehub/icons"
import { ArrowUpRight, Terminal } from "lucide-react"
import { useTranslation } from "react-i18next"

export interface AgentItem {
  id: string
  name: string
  description: string
  url: string
  accentColor: string
  glowColor: string
  icon: React.ReactNode
}

export function HeroAgentShowcase() {
  const { t } = useTranslation()
  const [activeIndex, setActiveIndex] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const agents: AgentItem[] = [
    {
      id: "gpt-work",
      name: "GPT-4o / Omni",
      description: t("hero_agent_gpt_work_description"),
      url: "https://chatgpt.com",
      accentColor: "#10a37f",
      glowColor: "rgba(16, 163, 127, 0.32)",
      icon: (
        <div className="flex size-11 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 transition-transform duration-300 group-hover:scale-105 dark:text-emerald-400">
          <OpenAI size={26} />
        </div>
      ),
    },
    {
      id: "claude-code",
      name: "Claude 3.5 Sonnet",
      description: t("hero_agent_claude_code_description"),
      url: "https://claude.ai",
      accentColor: "#d97706",
      glowColor: "rgba(217, 119, 6, 0.32)",
      icon: (
        <div className="flex size-11 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 transition-transform duration-300 group-hover:scale-105 dark:text-amber-400">
          <ClaudeCode.Color size={26} />
        </div>
      ),
    },
    {
      id: "deepseek-harness",
      name: "DeepSeek R1 / V3",
      description: t("hero_agent_deepseek_description"),
      url: "https://deepseek.com",
      accentColor: "#0284c7",
      glowColor: "rgba(2, 132, 199, 0.32)",
      icon: (
        <div className="flex size-11 items-center justify-center rounded-2xl bg-sky-500/10 text-sky-600 transition-transform duration-300 group-hover:scale-105 dark:text-sky-400">
          <DeepSeek.Color size={26} />
        </div>
      ),
    },
    {
      id: "trae",
      name: "Trae / Claude Code",
      description: t("hero_agent_trae_description"),
      url: "https://www.trae.ai",
      accentColor: "#10b981",
      glowColor: "rgba(16, 185, 129, 0.32)",
      icon: (
        <div className="flex size-11 items-center justify-center rounded-2xl bg-teal-500/10 text-teal-600 transition-transform duration-300 group-hover:scale-105 dark:text-teal-400">
          <Trae.Color size={26} />
        </div>
      ),
    },
    {
      id: "workbuddy",
      name: "WorkBuddy Agent",
      description: t("hero_agent_workbuddy_description"),
      url: "https://workbuddy.ai",
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
      name: "Nous Hermes 3",
      description: t("hero_agent_hermes_description"),
      url: "https://nousresearch.com",
      accentColor: "#ec4899",
      glowColor: "rgba(236, 72, 153, 0.32)",
      icon: (
        <div className="flex size-11 items-center justify-center rounded-2xl bg-pink-500/10 text-pink-600 transition-transform duration-300 group-hover:scale-105 dark:text-pink-400">
          <HermesAgent size={26} />
        </div>
      ),
    },
    {
      id: "zcode",
      name: "Enterprise Agent",
      description: t("hero_agent_zcode_description"),
      url: "https://zcode.ai",
      accentColor: "#8b5cf6",
      glowColor: "rgba(139, 92, 246, 0.32)",
      icon: (
        <div className="flex size-11 items-center justify-center rounded-2xl bg-purple-500/10 text-purple-600 transition-transform duration-300 group-hover:scale-105 dark:text-purple-400">
          <Terminal className="size-6" />
        </div>
      ),
    },
  ]

  const total = agents.length

  useEffect(() => {
    if (isPaused) return
    timerRef.current = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % total)
    }, 3800)

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
      {/* Clean top kicker in tudouni aesthetic */}
      

      {/* 3D Stack Stage */}
      <div
        className="relative flex h-[290px] w-full items-center justify-center overflow-visible"
        style={{ perspective: "1200px" }}
      >
        {agents.map((agent, index) => {
          let offset = index - activeIndex
          if (offset > total / 2) offset -= total
          if (offset < -total / 2) offset += total

          const isCenter = offset === 0
          const absOffset = Math.abs(offset)
          const isVisible = absOffset <= 2

          const translateX = offset * 115
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
                transform: "translateX(" + translateX + "px) translateY(" + translateY + "px) translateZ(" + translateZ + "px) rotateY(" + rotateY + "deg) scale(" + scale + ")",
                zIndex,
                opacity: isVisible ? opacity : 0,
                pointerEvents: isVisible ? "auto" : "none",
                boxShadow: isCenter
                  ? "0 24px 48px -24px " + agent.glowColor + ", 0 12px 24px -16px rgba(0,0,0,0.25)"
                  : "0 8px 20px -16px rgba(0,0,0,0.2)",
                transition: "transform 520ms cubic-bezier(0.2, 0.85, 0.32, 1.05), opacity 420ms ease, box-shadow 420ms ease",
              }}
              className={"group absolute top-4 flex w-[230px] sm:w-[245px] cursor-pointer flex-col rounded-2xl border border-border/60 bg-card/90 p-5 backdrop-blur-md select-none transition-colors " +
                (isCenter ? "border-border/90 bg-card shadow-lg" : "hover:border-border/80")
              }
            >
              {/* Header: Clean Icon & Status Indicator */}
              <div className="flex items-center justify-between">
                {agent.icon}
                <div
                  className="size-2 rounded-full transition-all duration-300"
                  style={{
                    backgroundColor: isCenter ? agent.accentColor : "var(--border)",
                    boxShadow: isCenter ? "0 0 8px " + agent.accentColor : "none",
                  }}
                />
              </div>

              {/* Clean Title & Description without noisy badges */}
              <div className="mt-4 flex flex-col">
                <h4 className="text-[15px] font-semibold tracking-tight text-foreground sm:text-base">
                  {agent.name}
                </h4>
                <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-muted-foreground/80">
                  {agent.description}
                </p>
              </div>

              {/* Bottom Subtle Action Strip */}
              <div className="mt-5 flex items-center justify-between border-t border-border/40 pt-3">
                <span className="font-mono text-[10px] tracking-wider text-muted-foreground/60 uppercase">
                  MODEL AGENT
                </span>
                <a
                  href={agent.url}
                  target={agent.url.startsWith("http") ? "_blank" : undefined}
                  rel="noopener noreferrer"
                  onClick={(event) => {
                    if (!isCenter) {
                      event.preventDefault()
                      setActiveIndex(index)
                    }
                  }}
                  className={"inline-flex cursor-pointer items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium transition-all " +
                    (isCenter
                      ? "text-foreground hover:text-emerald-500"
                      : "text-muted-foreground/60 hover:text-foreground")
                  }
                >
                  <span>{t("hero_agent_open")}</span>
                  <ArrowUpRight className="size-3 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </a>
              </div>
            </div>
          )
        })}
      </div>

      {/* Indicator & Bottom Footnote */}
      <div className="mt-3 flex w-full flex-col items-center gap-3.5">
        <div className="flex items-center gap-1.5">
          {agents.map((agent, index) => (
            <button
              key={agent.id}
              type="button"
              onClick={() => setActiveIndex(index)}
              aria-label={agent.name}
              className={"h-1.5 cursor-pointer rounded-full transition-all duration-300 " +
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
