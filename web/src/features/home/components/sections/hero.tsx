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
import { useState, useCallback } from "react"
import { CherryStudio } from "@lobehub/icons"
import { Link } from "@tanstack/react-router"
import { ArrowUpRight, BookOpen, Check, Copy, Sparkles, Terminal, ChevronDown } from "lucide-react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { useStatus } from "@/hooks/use-status"
import { useSystemConfig } from "@/hooks/use-system-config"

import { HeroTerminalDemo } from "../hero-terminal-demo"

interface HeroProps {
  className?: string
  isAuthenticated?: boolean
}

// Stylized three-dots indicator representing "More"
const MoreIcon = () => (
  <svg
    className="text-muted-foreground/60 group-hover:text-foreground size-5 shrink-0 transition-colors"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <circle cx="6" cy="12" r="2" fill="currentColor" />
    <circle cx="12" cy="12" r="2" fill="currentColor" />
    <circle cx="18" cy="12" r="2" fill="currentColor" />
  </svg>
)

export function Hero(props: HeroProps) {
  const { t } = useTranslation()
  const { status } = useStatus()
  const { systemName } = useSystemConfig()
  const [copied, setCopied] = useState(false)

  const docsUrl =
    (status?.docs_link as string | undefined) || "https://docs.newapi.pro"

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "https://api.example.com"

  const handleCopyBaseUrl = useCallback(() => {
    navigator.clipboard.writeText(baseUrl)
    setCopied(true)
    toast.success(t("Base URL copied to clipboard"))
    setTimeout(() => setCopied(false), 2000)
  }, [baseUrl, t])

  const renderDocsButton = () => {
    const isExternal = docsUrl.startsWith("http")
    if (isExternal) {
      return (
        <Button
          variant="outline"
          className="group border-border/60 hover:border-border hover:bg-muted/40 inline-flex h-11 items-center gap-1.5 rounded-lg px-4 text-sm font-medium transition-all"
          render={
            <a href={docsUrl} target="_blank" rel="noopener noreferrer" />
          }
        >
          <BookOpen className="text-muted-foreground/80 group-hover:text-foreground size-4 transition-colors" />
          <span>{t("Docs")}</span>
          <ArrowUpRight className="text-muted-foreground/60 group-hover:text-foreground size-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </Button>
      )
    }
    return (
      <Button
        variant="outline"
        className="group border-border/60 hover:border-border hover:bg-muted/40 inline-flex h-11 items-center gap-1.5 rounded-lg px-4 text-sm font-medium transition-all"
        render={<Link to={docsUrl} />}
      >
        <BookOpen className="text-muted-foreground/80 group-hover:text-foreground size-4 transition-colors" />
        <span>{t("Docs")}</span>
        <ArrowUpRight className="text-muted-foreground/60 group-hover:text-foreground size-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
      </Button>
    )
  }

  return (
    <section className="relative z-10 overflow-hidden px-6 pt-24 pb-14 md:pt-32 md:pb-20 lg:pt-36 lg:pb-24">
      {/* Studio / Editorial Ambient Light Glows */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-30 dark:opacity-[0.14]"
        style={{
          background: [
            "radial-gradient(ellipse 70% 50% at 15% 15%, oklch(0.75 0.19 150 / 60%) 0%, transparent 70%)",
            "radial-gradient(ellipse 60% 45% at 85% 18%, oklch(0.65 0.18 240 / 55%) 0%, transparent 70%)",
            "radial-gradient(ellipse 50% 40% at 50% 85%, oklch(0.70 0.16 280 / 35%) 0%, transparent 70%)",
          ].join(", "),
        }}
      />
      {/* Editorial Grid overlay */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-[linear-gradient(to_right,var(--border)_1px,transparent_1px),linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] [mask-image:radial-gradient(ellipse_70%_60%_at_50%_35%,black_25%,transparent_100%)] bg-[size:4rem_4rem] opacity-[0.07]"
      />

      <div className="mx-auto max-w-6xl">
        <div className="grid grid-cols-1 items-start gap-12 lg:grid-cols-12 lg:gap-8">
          {/* Left Column: Editorial Kicker, Brand Headline, Direct Action Bar */}
          <div className="flex flex-col items-start text-left lg:col-span-6">
            {/* Curatorial Kicker / System Wordmark */}
            <div
              className="landing-animate-fade-up mb-4 inline-flex items-center gap-2 rounded-full border border-border/80 bg-background/80 px-3.5 py-1 text-xs font-semibold tracking-wide backdrop-blur-md shadow-xs"
              style={{ animationDelay: "0ms" }}
            >
              <span className="flex size-2 rounded-full bg-emerald-500 ring-2 ring-emerald-500/20 animate-pulse" />
              <span className="text-foreground/90 font-mono tracking-tight uppercase">
                {systemName || "TuDouNi-API"}
              </span>
              <span className="text-muted-foreground/60">/</span>
              <span className="text-muted-foreground text-[11px] font-normal">
                {t("Multi-protocol API Aggregation")}
              </span>
            </div>

            {/* Editorial Poetic Headline */}
            <h1
              className="landing-animate-fade-up text-[clamp(2.4rem,4.8vw,3.6rem)] leading-[1.12] font-black tracking-tight"
              style={{ animationDelay: "60ms" }}
            >
              <span>{t("Connect to Models.")}</span>
              <br />
              <span className="bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-500 bg-clip-text text-transparent dark:from-emerald-400 dark:via-teal-300 dark:to-cyan-400">
                {t("Unleash Creativity.")}
              </span>
            </h1>

            {/* Description Lead */}
            <p
              className="landing-animate-fade-up text-muted-foreground/90 mt-5 max-w-xl text-base leading-relaxed opacity-0 md:text-[15.5px]"
              style={{ animationDelay: "120ms" }}
            >
              <span className="font-semibold text-foreground/95">
                {t("Text, video, image, and voice — One-stop API aggregation.")}
              </span>
              <br className="hidden sm:inline" />
              <span className="text-muted-foreground/80 mt-1 inline-block">
                {t("Connect to your favorite applications, or start creating directly.")}
              </span>
            </p>

            {/* Interactive Hero Action Area: Direct access to API & Console */}
            <div
              className="landing-animate-fade-up mt-8 flex w-full flex-wrap items-center gap-3.5 opacity-0"
              style={{ animationDelay: "180ms" }}
            >
              {/* Primary: 接入 API (点击直接跳转控制台 /dashboard) */}
              <Button
                className="group relative h-11 bg-foreground text-background hover:bg-foreground/90 rounded-lg px-5 text-sm font-semibold shadow-md transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0"
                render={<Link to="/dashboard" />}
              >
                <span>{t("Access API")}</span>
                <ArrowUpRight className="ml-1.5 size-4 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </Button>

              {/* Secondary: 游乐场 / 模型广场 */}
              {props.isAuthenticated ? (
                <Button
                  variant="outline"
                  className="group border-border/70 hover:border-border hover:bg-muted/50 h-11 rounded-lg px-4.5 text-sm font-medium transition-all"
                  render={<Link to="/playground" />}
                >
                  <Sparkles className="text-muted-foreground/80 group-hover:text-foreground size-4 mr-1.5 transition-colors" />
                  <span>{t("Open Playground")}</span>
                </Button>
              ) : (
                <Button
                  variant="outline"
                  className="group border-border/70 hover:border-border hover:bg-muted/50 h-11 rounded-lg px-4.5 text-sm font-medium transition-all"
                  render={<Link to="/pricing" />}
                >
                  <span>{t("Model Square")}</span>
                  <ArrowUpRight className="ml-1 size-3.5 text-muted-foreground/70 group-hover:text-foreground transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </Button>
              )}

              {renderDocsButton()}
            </div>

            {/* Minimal Base URL Interactive Copy Widget */}
            <div
              className="landing-animate-fade-up mt-6 flex w-full max-w-xl items-center gap-2 rounded-lg border border-border/60 bg-muted/20 px-3 py-2 backdrop-blur-xs transition-colors hover:border-border/90 opacity-0"
              style={{ animationDelay: "220ms" }}
            >
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-mono shrink-0 pl-1">
                <Terminal className="size-3.5 text-emerald-500" />
                <span>Base URL:</span>
              </div>
              <code className="text-foreground/80 select-all truncate font-mono text-xs flex-1">
                {baseUrl}
              </code>
              <button
                type="button"
                onClick={handleCopyBaseUrl}
                className="text-muted-foreground hover:text-foreground hover:bg-muted/60 flex items-center gap-1 rounded px-2 py-1 text-[11px] font-medium transition-colors cursor-pointer"
                title={t("Copy Base URL")}
              >
                {copied ? (
                  <>
                    <Check className="size-3 text-emerald-500" />
                    <span className="text-emerald-500 text-[11px]">{t("Base URL copied to clipboard")}</span>
                  </>
                ) : (
                  <>
                    <Copy className="size-3" />
                    <span>{t("Copy")}</span>
                  </>
                )}
              </button>
            </div>

            {/* Supported Apps Section */}
            <div
              className="landing-animate-fade-up mt-8 w-full max-w-xl opacity-0"
              style={{ animationDelay: "260ms" }}
            >
              <div className="mb-3 flex items-center justify-between">
                <span className="text-muted-foreground/60 text-[11px] font-semibold tracking-wider uppercase font-mono">
                  {t("Supported Applications")}
                </span>
                <span className="text-muted-foreground/50 text-[11px]">
                  {t("Supports OpenAI, Claude, Gemini and other standard protocols.")}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2.5">
                {/* Cherry Studio */}
                <a
                  href="https://cherry-ai.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group border-border/50 bg-muted/15 text-foreground/80 hover:border-border hover:bg-muted/30 hover:text-foreground flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-medium backdrop-blur-xs transition-all duration-200 hover:-translate-y-0.5"
                >
                  <CherryStudio.Color size={18} className="shrink-0" />
                  <span>Cherry Studio</span>
                  <ArrowUpRight className="text-muted-foreground/40 group-hover:text-foreground size-3 transition-colors" />
                </a>

                {/* CC Switch */}
                <a
                  href="https://ccswitch.io"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group border-border/50 bg-muted/15 text-foreground/80 hover:border-border hover:bg-muted/30 hover:text-foreground flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-medium backdrop-blur-xs transition-all duration-200 hover:-translate-y-0.5"
                >
                  <img
                    src="https://ccswitch.io/favicon.png"
                    alt="CC Switch"
                    className="size-4 shrink-0 rounded-sm object-contain"
                    onError={(e) => {
                      e.currentTarget.style.display = "none"
                      const fallback = e.currentTarget.nextSibling as HTMLElement
                      if (fallback) fallback.style.display = "flex"
                    }}
                  />
                  <span
                    style={{ display: "none" }}
                    className="size-4 shrink-0 items-center justify-center rounded bg-blue-500/10 text-[9px] font-bold text-blue-600 dark:bg-blue-400/10 dark:text-blue-400"
                  >
                    CC
                  </span>
                  <span>CC Switch</span>
                  <ArrowUpRight className="text-muted-foreground/40 group-hover:text-foreground size-3 transition-colors" />
                </a>

                {/* More Apps */}
                <div className="border-border/40 bg-muted/10 text-muted-foreground/70 flex cursor-default items-center gap-1.5 rounded-full border px-3.5 py-2 text-xs font-medium">
                  <MoreIcon />
                  <span>{t("More Apps")}</span>
                </div>
              </div>
            </div>

          </div>

          {/* Right Column: Hero Terminal API Demo */}
          <div
            className="landing-animate-fade-up flex w-full justify-center opacity-0 lg:col-span-6"
            style={{ animationDelay: "320ms" }}
          >
            <HeroTerminalDemo className="mt-4 lg:mt-0" />
          </div>
        </div>

        {/* Bottom Scroll Cue */}
        <div className="mt-14 flex items-center justify-between border-t border-border/40 pt-6 text-xs text-muted-foreground">
          <a
            href="#features"
            className="group flex items-center gap-2 font-mono text-[11px] hover:text-foreground transition-colors"
          >
            <ChevronDown className="size-3.5 animate-bounce text-emerald-500" />
            <span>{t("Scroll to explore")}</span>
            <span className="text-muted-foreground/40">/</span>
            <span className="text-muted-foreground/80">{t("Explore Models")}</span>
          </a>
          <div className="hidden sm:flex items-center gap-6 font-mono text-[11px] text-muted-foreground/60">
            <span>01 / {t("High-speed & Reliable")}</span>
            <span>02 / {t("Multi-protocol Compatible")}</span>
            <span>03 / {t("Full-category Matrix")}</span>
          </div>
        </div>

      </div>
    </section>
  )
}
