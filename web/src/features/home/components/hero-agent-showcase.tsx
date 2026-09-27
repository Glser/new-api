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
import { Code2, ExternalLink, Layers, Terminal } from "lucide-react"
import { useTranslation } from "react-i18next"

export interface AgentItem {
  id: string
  name: string
  category: string
  badge: string
  description: string
  url: string
  accentColor: string
  glowColor: string
  linkLabel: string
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
      name: "gpt work",
      category: t("hero_agent_gpt_work_category"),
      badge: t("hero_agent_gpt_work_badge"),
      description: t("hero_agent_gpt_work_description"),
      url: "https://chatgpt.com",
      accentColor: "#10a37f",
      glowColor: "rgba(16, 163, 127, 0.28)",
      linkLabel: t("hero_agent_open"),
      icon: (
        <div className="flex size-11 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
          <OpenAI size={26} />
        </div>
      ),
    },
    {
      id: "claude-code",
      name: "Claude code",
      category: t("hero_agent_claude_code_category"),
      badge: t("hero_agent_claude_code_badge"),
      description: t("hero_agent_claude_code_description"),
      url: "https://claude.ai",
      accentColor: "#d97706",
      glowColor: "rgba(217, 119, 6, 0.28)",
      linkLabel: t("hero_agent_open"),
      icon: (
        <div className="flex size-11 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
          <ClaudeCode.Color size={26} />
        </div>
      ),
    },
    {
      id: "workbuddy",
      name: "workbuddy",
      category: t("hero_agent_workbuddy_category"),
      badge: t("hero_agent_workbuddy_badge"),
      description: t("hero_agent_workbuddy_description"),
      url: "https://workbuddy.ai",
      accentColor: "#3b82f6",
      glowColor: "rgba(59, 130, 246, 0.28)",
      linkLabel: t("hero_agent_open"),
      icon: (
        <div className="flex size-11 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
          <CodeBuddy.Color size={26} />
        </div>
      ),
    },
    {
      id: "deepseek-harness",
      name: "deepseek harness",
      category: t("hero_agent_deepseek_category"),
      badge: t("hero_agent_deepseek_badge"),
      description: t("hero_agent_deepseek_description"),
      url: "https://deepseek.com",
      accentColor: "#0284c7",
      glowColor: "rgba(2, 132, 199, 0.28)",
      linkLabel: t("hero_agent_open"),
      icon: (
        <div className="flex size-11 items-center justify-center rounded-2xl bg-sky-500/10 text-sky-600 dark:text-sky-400">
          <DeepSeek.Color size={26} />
        </div>
      ),
    },
    {
      id: "trae",
      name: "trae",
      category: t("hero_agent_trae_category"),
      badge: t("hero_agent_trae_badge"),
      description: t("hero_agent_trae_description"),
      url: "https://www.trae.ai",
      accentColor: "#10b981",
      glowColor: "rgba(16, 185, 129, 0.28)",
      linkLabel: t("hero_agent_open"),
      icon: (
        <div className="flex size-11 items-center justify-center rounded-2xl bg-teal-500/10 text-teal-600 dark:text-teal-400">
          <Trae.Color size={26} />
        </div>
      ),
    },
    {
      id: "hermes",
      name: "hermes",
      category: t("hero_agent_hermes_category"),
      badge: t("hero_agent_hermes_badge"),
      description: t("hero_agent_hermes_description"),
      url: "https://nousresearch.com",
      accentColor: "#ec4899",
      glowColor: "rgba(236, 72, 153, 0.28)",
      linkLabel: t("hero_agent_open"),
      icon: (
        <div className="flex size-11 items-center justify-center rounded-2xl bg-pink-500/10 text-pink-600 dark:text-pink-400">
          <HermesAgent size={26} />
        </div>
      ),
    },
    {
      id: "zcode",
      name: "zcode",
      category: t("hero_agent_zcode_category"),
      badge: t("hero_agent_zcode_badge"),
      description: t("hero_agent_zcode_description"),
      url: "https://zcode.ai",
      accentColor: "#8b5cf6",
      glowColor: "rgba(139, 92, 246, 0.28)",
      linkLabel: t("hero_agent_open"),
      icon: (
        <div className="flex size-11 items-center justify-center rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
          <div className="relative flex items-center justify-center">
            <Terminal className="size-6 text-purple-600 dark:text-purple-400" />
            <span className="absolute -right-1 -bottom-1 font-mono text-[9px] font-semibold text-purple-600 dark:text-purple-300">
              Z
            </span>
          </div>
        </div>
      ),
    },
    {
      id: "more",
      name: t("hero_agent_more_name"),
      category: t("hero_agent_more_category"),
      badge: t("hero_agent_more_badge"),
      description: t("hero_agent_more_description"),
      url: "https://docs.newapi.pro",
      accentColor: "#64748b",
      glowColor: "rgba(100, 116, 139, 0.22)",
      linkLabel: t("hero_agent_more_link"),
      icon: (
        <div className="bg-muted text-muted-foreground flex size-11 items-center justify-center rounded-2xl">
          <Layers className="size-6" />
        </div>
      ),
    },
  ]

  const total = agents.length

  useEffect(() => {
    if (isPaused) return
    timerRef.current = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % total)
    }, 3600)

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [isPaused, total])

  return (
    <div
      className="relative flex w-full max-w-[580px] flex-col items-center select-none"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="mb-1 flex w-full items-end justify-between px-1">
        <div className="min-w-0">
          <p className="text-muted-foreground/60 font-mono text-[10px] tracking-[0.18em] uppercase">
            {t("hero_clients_kicker")}
          </p>
          <p className="text-foreground mt-1 text-sm">{t("hero_clients_caption")}</p>
        </div>
      </div>

      <div
        className="relative flex h-[318px] w-full items-center justify-center overflow-visible"
        style={{ perspective: "1100px" }}
      >
        {agents.map((agent, index) => {
          let offset = index - activeIndex
          if (offset > total / 2) offset -= total
          if (offset < -total / 2) offset += total

          const isCenter = offset === 0
          const absOffset = Math.abs(offset)
          const isVisible = absOffset <= 3

          const translateX = offset * 118
          const translateY = Math.pow(offset, 2) * 10
          const translateZ = 120 - absOffset * 65
          const rotateY = offset * -14
          const scale = isCenter ? 1.04 : Math.max(0.68, 1 - absOffset * 0.12)
          const opacity = isCenter ? 1 : Math.max(0, 1 - absOffset * 0.3)
          const zIndex = 20 - absOffset

          return (
            <div
              key={agent.id}
              onClick={() => setActiveIndex(index)}
              style={{
                transform: `translateX(${translateX}px) translateY(${translateY}px) translateZ(${translateZ}px) rotateY(${rotateY}deg) scale(${scale})`,
                zIndex,
                opacity: isVisible ? opacity : 0,
                pointerEvents: isVisible ? "auto" : "none",
                boxShadow: isCenter
                  ? `0 28px 60px -32px ${agent.glowColor}, 0 16px 30px -24px rgba(0,0,0,0.35)`
                  : "0 10px 24px -20px rgba(0,0,0,0.28)",
                transition:
                  "transform 480ms cubic-bezier(0.2, 0.85, 0.32, 1.05), opacity 400ms ease, box-shadow 400ms ease",
              }}
              className={`bg-card absolute top-6 flex w-[215px] cursor-pointer flex-col rounded-2xl p-4.5 select-none sm:w-[230px] ${
                isCenter ? "" : "bg-card/90"
              }`}
            >
              <div className="flex items-center justify-between">
                {agent.icon}
                <span
                  className="rounded-full px-2 py-0.5 font-mono text-[9px] font-medium sm:text-[10px]"
                  style={{
                    backgroundColor: isCenter
                      ? `${agent.accentColor}14`
                      : "var(--muted)",
                    color: isCenter ? agent.accentColor : "inherit",
                  }}
                >
                  {agent.badge}
                </span>
              </div>

              <div className="mt-3.5 flex flex-col">
                <h4 className="text-foreground text-sm font-semibold tracking-tight sm:text-[15px]">
                  {agent.name}
                </h4>
                <span className="text-muted-foreground/75 text-[10.5px] font-medium">
                  {agent.category}
                </span>
                <p className="text-muted-foreground mt-2 line-clamp-2 text-[11px] leading-relaxed">
                  {agent.description}
                </p>
              </div>

              <div className="border-border/40 mt-4 flex items-center justify-between border-t pt-2.5">
                <span className="text-muted-foreground/65 font-mono text-[10px]">
                  {t("hero_agent_via")}
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
                  className={`group/btn inline-flex cursor-pointer items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-medium transition-all ${
                    isCenter
                      ? "bg-foreground text-background hover:bg-foreground/90"
                      : "bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <span>{agent.linkLabel}</span>
                  <ExternalLink className="size-3 transition-transform group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5" />
                </a>
              </div>
            </div>
          )
        })}
      </div>

      <div className="mt-1 flex w-full flex-col items-center gap-3">
        <div className="flex items-center gap-1.5">
          {agents.map((agent, index) => (
            <button
              key={agent.id}
              type="button"
              onClick={() => setActiveIndex(index)}
              aria-label={agent.name}
              className={`h-1.5 cursor-pointer rounded-full transition-all duration-300 ${
                index === activeIndex
                  ? "bg-foreground w-6"
                  : "bg-muted-foreground/30 hover:bg-muted-foreground/60 w-1.5"
              }`}
            />
          ))}
        </div>
        <div className="text-muted-foreground flex items-center gap-2 px-2 text-center text-[11px] leading-relaxed">
          <Code2 className="size-3.5 shrink-0 text-emerald-500/80" />
          <span>{t("hero_agent_footer")}</span>
        </div>
      </div>
    </div>
  )
}
