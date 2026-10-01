/*
Copyright (C) 2023-2026 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.
*/
import { Link } from "@tanstack/react-router"
import { ArrowUpRight, BookOpen, ChevronDown } from "lucide-react"
import { useTranslation } from "react-i18next"

import { HeaderLogo } from "@/components/layout/components/header-logo"
import { Button } from "@/components/ui/button"
import { useStatus } from "@/hooks/use-status"
import { useSystemConfig } from "@/hooks/use-system-config"

import { HeroAgentShowcase } from "../hero-agent-showcase"

interface HeroProps {
  className?: string
  isAuthenticated?: boolean
}

export function Hero(props: HeroProps) {
  const { t } = useTranslation()
  const { status } = useStatus()
  const { logo, loading, logoLoaded } = useSystemConfig()

  const docsUrl =
    (status?.docs_link as string | undefined) || "https://docs.newapi.pro"

  const renderDocsButton = () => {
    const className =
      "text-muted-foreground hover:text-foreground inline-flex h-10 items-center gap-1.5 px-3 text-xs font-medium transition-colors cursor-pointer"
    const content = (
      <>
        <BookOpen className="size-4" />
        <span>{t("Docs")}</span>
      </>
    )
    if (docsUrl.startsWith("http")) {
      return (
        <a
          href={docsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={className}
        >
          {content}
        </a>
      )
    }
    return (
      <Link to={docsUrl} className={className}>
        {content}
      </Link>
    )
  }

  return (
    <section className="relative z-10 flex min-h-[calc(100svh-4.5rem)] flex-col justify-between overflow-hidden px-4 sm:px-6 lg:px-8 pt-16 pb-8 sm:pt-20 sm:pb-10 md:pt-24 md:pb-12">
      {/* Subtle atmospheric lighting */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-30 dark:opacity-20"
        style={{
          background: [
            "radial-gradient(ellipse 65% 50% at 15% 18%, rgba(16, 185, 129, 0.22) 0%, transparent 70%)",
            "radial-gradient(ellipse 55% 45% at 80% 28%, rgba(59, 130, 246, 0.16) 0%, transparent 70%)",
          ].join(", "),
        }}
      />
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-[linear-gradient(to_right,var(--border)_1px,transparent_1px),linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] [mask-image:radial-gradient(ellipse_75%_65%_at_45%_35%,black_25%,transparent_100%)] bg-[size:4rem_4rem] opacity-[0.035]"
      />

      <div className="mx-auto my-auto w-full max-w-7xl py-6 sm:py-8 md:py-10">
        <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-12 lg:gap-12 xl:gap-16">
          {/* Left Column: Shifted leftwards */}
          <div className="flex flex-col items-start text-left lg:col-span-7 xl:col-span-7 lg:-ml-2 xl:-ml-4">
            {/* Brand Logo & API Wordmark */}
            <div
              className="landing-animate-fade-up mb-8 sm:mb-10 inline-flex items-center gap-3 sm:gap-4.5"
              style={{ animationDelay: "0ms" }}
            >
              <div className="flex size-18 sm:size-22 shrink-0 items-center justify-center transition-transform duration-300 hover:scale-105">
                {logo ? (
                  <HeaderLogo
                    src={logo}
                    loading={loading}
                    logoLoaded={logoLoaded}
                    className="size-full object-contain select-none drop-shadow-md"
                  />
                ) : (
                  <div className="size-5 rounded-full bg-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.8)]" />
                )}
              </div>
              <div className="flex items-center select-none">
                <span className="font-sans text-[2.75rem] sm:text-[3.5rem] font-black leading-none tracking-tight text-foreground translate-y-1 sm:translate-y-1.5">
                  API
                </span>
              </div>
            </div>

            {/* High-impact Title with Nuanced Typography */}
            <h1 className="landing-animate-fade-up tracking-tight my-2 sm:my-3" style={{ animationDelay: "30ms" }}>
              <span className="hero-title-shine block text-[clamp(2.2rem,4.4vw,3.4rem)] font-extrabold leading-[1.18]">
                {t("hero_title_p1", "重塑思考的疆界")}
              </span>
              <span className="hero-title-shine-emerald mt-3 sm:mt-4 block text-[clamp(1.8rem,3.6vw,2.75rem)] font-black leading-[1.22] filter drop-shadow-[0_2px_18px_rgba(16,185,129,0.2)]">
                {t("hero_title_p2", "让每一次API调用，皆有回响。")}
              </span>
            </h1>

            {/* Editorial Accent Gradient Bar */}
            <div
              aria-hidden
              className="landing-animate-fade-up mt-6 sm:mt-7 h-0.5 w-32 sm:w-48 md:w-56 rounded-full bg-gradient-to-r from-emerald-500 via-teal-400 to-transparent"
              style={{ animationDelay: "70ms" }}
            />

            {/* Rich, Evocative Narrative Copy */}
            <p
              className="landing-animate-fade-up mt-6 sm:mt-8 max-w-2xl text-[14.5px] leading-[1.75] text-muted-foreground sm:text-[16px] sm:leading-[1.8] whitespace-pre-line"
              style={{ animationDelay: "110ms" }}
            >
              {t("hero_subtitle", "聚合全球顶尖模型，覆盖文本、图像、音频、视频等一站式 API 聚合平台。\n一个接口即可调度全球顶尖模型能力，为构建者提供极致稳定的原生 API 服务。")}
            </p>

            {/* Action Buttons */}
            <div
              className="landing-animate-fade-up mt-8 sm:mt-10 flex flex-wrap items-center gap-3.5"
              style={{ animationDelay: "190ms" }}
            >
              <Button
                className="group h-10 rounded-lg bg-foreground px-5 text-xs font-semibold text-background shadow-xs hover:bg-foreground/90 cursor-pointer"
                render={<Link to="/dashboard" />}
              >
                <span>{t("hero_cta_access")}</span>
                <ArrowUpRight className="ml-1.5 size-3.5 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </Button>

              {props.isAuthenticated ? (
                <Button
                  variant="outline"
                  className="h-10 rounded-lg border-border/70 px-4 text-xs font-medium hover:bg-muted/50 cursor-pointer"
                  render={<Link to="/playground" />}
                >
                  <span>{t("Open Playground")}</span>
                </Button>
              ) : (
                <Button
                  variant="outline"
                  className="h-10 rounded-lg border-border/70 px-4 text-xs font-medium hover:bg-muted/50 cursor-pointer"
                  render={<Link to="/pricing" />}
                >
                  <span>{t("hero_cta_models")}</span>
                </Button>
              )}

              {renderDocsButton()}
            </div>
          </div>

          {/* Right Column: 3D Agent Carousel Showcase (Preserved untouched) */}
          <div
            className="landing-animate-fade-up flex w-full justify-center lg:col-span-5"
            style={{ animationDelay: "230ms" }}
          >
            <HeroAgentShowcase />
          </div>
        </div>
      </div>

      {/* Clean Bottom Cue */}
      <div className="mx-auto mt-4 flex w-full max-w-7xl items-center justify-between border-t border-border/40 pt-4 text-xs">
        <a
          href="#models"
          className="group flex items-center gap-2 font-mono text-[11px] text-muted-foreground transition-colors hover:text-foreground"
        >
          <ChevronDown className="size-3.5 text-emerald-500/80 transition-transform duration-200 group-hover:translate-y-0.5" />
          <span>{t("hero_scroll_cue")}</span>
          <span className="text-muted-foreground/35">/</span>
          <span>{t("hero_scroll_aside")}</span>
        </a>
        <div className="hidden items-center gap-5 font-mono text-[11px] text-muted-foreground/55 sm:flex">
          <span>01 {t("hero_index_1")}</span>
          <span>02 {t("hero_index_2")}</span>
          <span>03 {t("hero_index_3")}</span>
        </div>
      </div>
    </section>
  )
}
