/*
Copyright (C) 2023-2026 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.
*/
import { Link } from "@tanstack/react-router"
import { ArrowUpRight } from "lucide-react"
import { useTranslation } from "react-i18next"

import { AnimateInView } from "@/components/animate-in-view"

export function SectionLens() {
  const { t } = useTranslation()

  const scenes = [
    {
      num: "01 / 03",
      concept: "光影与空间",
      title: "把光，组织成画面",
      desc: "让取景框、材质质感与纵深空间形成明确的视觉意图，赋予静态画面叙事力。",
      meta: "Kling 1.5 Pro · 4K Master",
      accent: "from-purple-500/10 to-transparent",
    },
    {
      num: "02 / 03",
      concept: "物理与动态",
      title: "把节奏，放进镜头里",
      desc: "先确立画面重心，再通过动力学模拟让镜头流畅推移，捕捉微妙的时序变化。",
      meta: "Luma Dream Machine · 60 FPS",
      accent: "from-blue-500/10 to-transparent",
    },
    {
      num: "03 / 03",
      concept: "色调与美学",
      title: "风格很多，主张是你的",
      desc: "从电影胶片颗粒到超写实高反差霓虹，将提示词的细腻触觉无损延展至每一帧。",
      meta: "Runway Gen-3 Alpha · Cinematic",
      accent: "from-emerald-500/10 to-transparent",
    },
  ]

  return (
    <section id="lens" className="relative z-10 border-t border-border/40 px-4 sm:px-6 lg:px-8 py-20 md:py-28">
      {/* Atmospheric lighting */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-25 dark:opacity-15"
        style={{
          background: "radial-gradient(ellipse 60% 40% at 15% 25%, rgba(16, 185, 129, 0.12) 0%, transparent 70%)",
        }}
      />
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-[linear-gradient(to_right,var(--border)_1px,transparent_1px),linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] [mask-image:radial-gradient(ellipse_75%_65%_at_45%_35%,black_25%,transparent_100%)] bg-[size:4rem_4rem] opacity-[0.025]"
      />
      <div className="mx-auto max-w-7xl">
        {/* Editorial Section Header */}
        <AnimateInView className="mb-14 flex flex-col items-start justify-between gap-6 md:flex-row md:items-end lg:pl-4 xl:pl-6">
          <div>
            <div className="mb-3 font-mono text-xs font-semibold tracking-[0.2em] text-emerald-500 uppercase">
              {t("sec_lens_kicker")}
            </div>
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl md:text-5xl"><span className="hero-title-shine inline-block">{t("sec_lens_title_p1")}</span><br /><span className="text-foreground/90">{t("sec_lens_title_p2")}</span></h2>
            <div className="mt-4 h-0.5 w-32 sm:w-48 rounded-full bg-gradient-to-r from-emerald-500 via-teal-400 to-transparent" />
            <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted-foreground md:text-base">
              {t("sec_lens_desc")}
            </p>
          </div>

          <div>
            <Link
              to="/models"
              className="group inline-flex items-center gap-1.5 font-mono text-xs font-semibold tracking-wider text-muted-foreground transition-colors hover:text-foreground"
            >
              <span>{t("sec_lens_action")}</span>
              <ArrowUpRight className="size-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </Link>
          </div>
        </AnimateInView>

        {/* Clean Editorial Cards */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {scenes.map((scene, idx) => (
            <AnimateInView
              key={scene.num}
              delay={idx * 80}
              className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-border/50 bg-card/40 p-6 backdrop-blur-md transition-all duration-300 hover:border-emerald-500/30 hover:bg-card/70 hover:shadow-lg"
            >
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-emerald-500/60 via-teal-400/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div>
                <div className="flex items-baseline justify-between border-b border-border/30 pb-3 font-mono text-[11px]">
                  <span className="text-muted-foreground uppercase tracking-wider">
                    {scene.concept}
                  </span>
                  <span className="text-muted-foreground/60">
                    {scene.num}
                  </span>
                </div>

                <h3 className="mt-4 text-xl font-bold tracking-tight text-foreground transition-colors group-hover:text-emerald-500">
                  {scene.title}
                </h3>
                <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                  {scene.desc}
                </p>
              </div>

              <div className="mt-8 flex items-center justify-between border-t border-border/30 pt-4 font-mono text-[11px] text-muted-foreground/70">
                <span>{scene.meta}</span>
                <span className="text-emerald-500 group-hover:translate-x-0.5 transition-transform">↗</span>
              </div>
            </AnimateInView>
          ))}
        </div>
      </div>

      {/* Section divider: layered center-glow line */}
      <div aria-hidden className="pointer-events-none absolute bottom-0 inset-x-0 flex flex-col items-center overflow-hidden">
        {/* Glow bloom */}
        <div
          className="h-[3px] w-64 sm:w-96 rounded-full blur-[4px]"
          style={{ background: "linear-gradient(90deg, transparent, rgba(16,185,129,0.7) 40%, rgba(16,185,129,0.7) 60%, transparent)" }}
        />
        {/* Sharp center line */}
        <div
          className="absolute bottom-0 h-px w-full"
          style={{
            background: "linear-gradient(90deg, transparent 0%, rgba(16,185,129,0.15) 20%, rgba(16,185,129,0.55) 42%, rgba(255,255,255,0.85) 50%, rgba(16,185,129,0.55) 58%, rgba(16,185,129,0.15) 80%, transparent 100%)",
          }}
        />
      </div>
    </section>
  )
}
