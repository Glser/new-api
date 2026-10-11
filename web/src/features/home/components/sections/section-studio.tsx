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
import { useState } from "react"
import { Link } from "@tanstack/react-router"
import { ArrowUpRight } from "lucide-react"
import { useTranslation } from "react-i18next"

import {
  SectionBackdrop,
  SectionDivider,
  SectionHeader,
  SectionPrimaryLink,
} from "@/features/home/components/section-primitives"
import {
ACCENT_PALETTE,
compactPanelClassName,
} from "@/features/home/components/section-styles"

import { cn } from "@/lib/utils"

export function SectionStudio() {
  const { t } = useTranslation()
  const [activeStep, setActiveStep] = useState(0)

  const steps = [
    {
      num: "01",
      stepLabel: t("sec_studio_step1_label"),
      title: t("sec_studio_step1_title"),
      desc: t("sec_studio_step1_desc"),
      code: [
        "// 01 · 灵感起点与角色指令",
        "Role: 资深视觉概念架构师",
        "Scene: 赛博雨夜霓虹纵深街区",
        "Atmosphere: 丁达尔光束、潮湿反光沥青、85mm 景深",
        "Output: 结构化分镜提示词与光影参数分解",
      ].join("\n"),
    },
    {
      num: "02",
      stepLabel: t("sec_studio_step2_label"),
      title: t("sec_studio_step2_title"),
      desc: t("sec_studio_step2_desc"),
      code: [
        "// 02 · 多模型并行分发与对照",
        "[Branch A / Claude 3.5]: 负责深度叙事台词与世界观严谨设定",
        "[Branch B / DeepSeek R1]: 验证逻辑推导严密性与时序一致性",
        "[Branch C / FLUX.1]: 实时渲染核心视觉情绪板与关键帧",
      ].join("\n"),
    },
    {
      num: "03",
      stepLabel: t("sec_studio_step3_label"),
      title: t("sec_studio_step3_title"),
      desc: t("sec_studio_step3_desc"),
      code: [
        "// 03 · 标准化生产交付",
        "POST /v1/chat/completions (OpenAI Compatible)",
        "POST /v1/messages (Claude Native Protocol)",
        "POST /v1/images/generations (FLUX / Midjourney)",
        "Status: 200 OK • Gateway Stream Overhead: 18ms",
      ].join("\n"),
    },
  ]

  return (
    <section
      id="studio"
      className="relative z-10 overflow-hidden border-t border-border/40 px-4 py-20 sm:px-6 md:py-28 lg:px-8"
    >
      <SectionBackdrop />

      <div className="mx-auto max-w-7xl">
        <SectionHeader
          titlePrimary={t("sec_studio_title_p1")}
          titleSecondary={t("sec_studio_title_p2")}
          description={t("sec_studio_desc")}
          action={
            <SectionPrimaryLink
              to="/dashboard"
              label={t("sec_studio_action")}
            />
          }
        />

        {/* 左：步骤选择；右：预览面板 */}
        <div className="grid grid-cols-1 items-stretch gap-5 lg:grid-cols-12 lg:gap-6">
          <div className="flex flex-col gap-3.5 lg:col-span-5">
            {steps.map((step, idx) => {
              const isActive = activeStep === idx
              const palette = ACCENT_PALETTE[idx % ACCENT_PALETTE.length]
              return (
                <button
                  key={step.num}
                  type="button"
                  onClick={() => setActiveStep(idx)}
                  aria-pressed={isActive}
                  className={cn(
                    "group relative flex w-full flex-col items-start gap-2 rounded-2xl p-5 text-left transition-all duration-400 ease-[cubic-bezier(0.16,1,0.3,1)]",
                    compactPanelClassName,
                    isActive
                      ? "-translate-y-1 scale-[1.01]"
                      : "hover:-translate-y-1 hover:scale-[1.01]"
                  )}
                  style={
                    isActive
                      ? {
                          borderColor: `${palette.accentColor}66`,
                          boxShadow: `0 18px 36px -16px ${palette.glowColor}, 0 0 0 1px ${palette.accentColor}33`,
                        }
                      : undefined
                  }
                >
                  <span
                    className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em]"
                    style={{
                      color: isActive
                        ? palette.accentColor
                        : "var(--muted-foreground)",
                    }}
                  >
                    {step.stepLabel}
                  </span>
                  <span className="text-base font-bold tracking-tight text-foreground">
                    {step.title}
                  </span>
                  <span className="text-xs leading-relaxed text-muted-foreground">
                    {step.desc}
                  </span>
                </button>
              )
            })}
          </div>

          {/* 右侧预览：暗色终端面板 */}
          <div className="relative flex flex-col justify-between overflow-hidden rounded-3xl border border-white/10 bg-neutral-950 p-6 shadow-[0_24px_50px_-30px_rgba(0,0,0,0.6)] lg:col-span-7">
            <div>
              <div className="flex items-center justify-between border-b border-white/10 pb-4 font-mono text-xs">
                <div className="flex items-center gap-2">
                  <div
                    className="size-2 rounded-full"
                    style={{
                      backgroundColor:
                        ACCENT_PALETTE[activeStep % ACCENT_PALETTE.length]
                          .accentColor,
                    }}
                  />
                  <span className="tracking-wider text-white/60 uppercase">
                    {steps[activeStep].stepLabel}
                  </span>
                </div>
                <span className="text-[11px] text-white/40">
                  {t("sec_studio_workflow_pipeline")}
                </span>
              </div>

              <div className="mt-5 font-mono text-xs leading-relaxed text-white/80">
                <pre className="overflow-x-auto font-sans text-xs whitespace-pre-wrap sm:text-[13px] sm:leading-7">
                  <code>{steps[activeStep].code}</code>
                </pre>
              </div>
            </div>

            <div className="mt-8 flex items-center justify-between border-t border-white/10 pt-4 font-mono text-[11px] text-white/50">
              <span>{t("sec_studio_ready")}</span>
              <Link
                to="/dashboard"
                className="inline-flex items-center gap-1 text-emerald-400 transition-colors hover:text-emerald-300"
              >
                <span>{t("sec_studio_run_now")}</span>
                <ArrowUpRight className="size-3" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      <SectionDivider />
    </section>
  )
}
