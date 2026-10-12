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
import type { ReactNode } from "react"
import { ArrowDown, ArrowUpRight } from "lucide-react"
import { Link } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"

import { AnimateInView } from "@/components/animate-in-view"
import { cn } from "@/lib/utils"

/**
 * 首页各 section 共用的视觉骨架。
 *
 * 提炼自 section-models，目的是让「新模型」这一节的设计语言（clamp 标题、
 * 光泽渐变、发光分隔线、实底主按钮）在其余 section 复用，避免各节各写一套。
 */

/**
 * 统一的 section 头部：双行大标题 + 渐变短线 + 描述 + 右侧操作。
 * 眉题（kicker）可选，当前各节均未使用。
 */
export function SectionHeader(props: {
  /** 可选的眉题；不传则整行不渲染，标题直接作为视觉起点 */
  kicker?: string
  titlePrimary: string
  titleSecondary: string
  description: string
  action?: ReactNode
}) {
  return (
    <AnimateInView className="mb-7 flex flex-col items-start justify-between gap-4 sm:mb-8 md:flex-row md:items-end lg:pl-4 xl:pl-6">
      <div>
        {props.kicker ? (
          <div className="mb-3 font-mono text-xs font-semibold tracking-[0.2em] text-emerald-500 uppercase">
            {props.kicker}
          </div>
        ) : null}
        <h2 className="flex flex-wrap items-baseline gap-x-2 tracking-tight">
          <span className="hero-title-shine text-[clamp(1.85rem,3.6vw,2.9rem)] font-extrabold leading-tight">
            {props.titlePrimary}
          </span>
          <span className="hero-title-shine-emerald text-[clamp(1.65rem,3.2vw,2.6rem)] font-bold leading-tight">
            {props.titleSecondary}
          </span>
        </h2>
        <div className="mt-3.5 h-0.5 w-32 rounded-full bg-gradient-to-r from-emerald-500 via-teal-400 to-transparent sm:w-48" />
        <p className="mt-3.5 max-w-xl text-sm leading-relaxed text-muted-foreground md:text-base">
          {props.description}
        </p>
      </div>
      {props.action}
    </AnimateInView>
  )
}

/**
 * 主行动按钮：与 hero「进入控制台」同款实底 + 投影 + 悬停光泽。
 * 默认小一号尺寸，供各 section 头部右侧使用。
 */
export function SectionPrimaryLink(props: {
  to: string
  label: string
  className?: string
}) {
  return (
    <Link
      to={props.to}
      className={cn(
        "group relative inline-flex h-9 items-center gap-1.5 overflow-hidden rounded-xl bg-foreground px-4 text-xs font-semibold text-background shadow-[0_4px_14px_rgba(0,0,0,0.12)] transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_8px_24px_rgba(0,0,0,0.18)] dark:shadow-[0_4px_18px_rgba(255,255,255,0.06)] active:scale-[0.98]",
        props.className
      )}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 ease-out group-hover:translate-x-full"
      />
      <span>{props.label}</span>
      <ArrowUpRight className="size-3.5 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
    </Link>
  )
}

/**
 * 次级文字链接：等宽字体 + 箭头位移，用于卡片内的跳转。
 */
export function SectionTextLink(props: {
  to: string
  label: string
  className?: string
}) {
  return (
    <Link
      to={props.to}
      className={cn(
        "group inline-flex items-center gap-1.5 font-mono text-xs font-semibold tracking-wider text-muted-foreground transition-colors hover:text-foreground",
        props.className
      )}
    >
      <span>{props.label}</span>
      <ArrowUpRight className="size-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
    </Link>
  )
}

/**
 * section 之间的分隔线：刻意做成「若隐若现」的淡出渐变，
 * 两端透明、中央仅有一丝微光，不构成视觉断点。
 */
export function SectionDivider() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-center overflow-hidden"
    >
      {/* 中央微光：低透明度 + 大范围模糊，只在正中心留一点亮 */}
      <div
        className="h-16 w-[70%] max-w-3xl opacity-70"
        style={{
          background:
            "radial-gradient(ellipse 42% 100% at 50% 100%, rgba(16,185,129,0.16) 0%, rgba(16,185,129,0.06) 45%, transparent 75%)",
          filter: "blur(12px)",
        }}
      />
      {/* 发丝线：两端完全透明，中央最亮处也只是极淡的一线 */}
      <div
        className="absolute bottom-0 h-px w-full"
        style={{
          background:
            "linear-gradient(90deg, transparent 0%, color-mix(in oklab, var(--border) 55%, transparent) 22%, color-mix(in oklab, var(--foreground) 10%, transparent) 50%, color-mix(in oklab, var(--border) 55%, transparent) 78%, transparent 100%)",
        }}
      />
    </div>
  )
}

/** section 之间的滚动提示：与 hero 底部同款的「动作 / 说明」样式 */
export function SectionScrollCue(props: {
  /** 目标 section 的 id；点击后平滑滚动过去 */
  target: string
  /** 动作文案，默认沿用 hero 的「向下探索」 */
  cue?: string
  /** 说明文案，默认沿用 hero 的「发现模型与能力」 */
  aside?: string
  className?: string
}) {
  const { t } = useTranslation()
  const cue = props.cue ?? t("hero_scroll_cue", "向下探索")
  const aside = props.aside ?? t("hero_scroll_aside", "发现模型与能力")

  return (
    <div
      className={cn(
        // 坐在分隔线之上：分隔线本身只有 1px，中央微光约 24px 高，
        // 这里抬到微光之上，避免和 divider 抢同一行视觉。
        // 左侧对齐，与 hero 底部同款位置。
        "pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-start px-4 pb-9 sm:px-6 lg:px-8",
        props.className
      )}
    >
      <button
        type="button"
        onClick={() => {
          const el = document.querySelector(`#${props.target}`)
          if (el) {
            el.scrollIntoView({ behavior: "smooth", block: "start" })
          }
        }}
        className="group pointer-events-auto inline-flex animate-bounce items-center gap-2 font-mono text-[11px] text-muted-foreground transition-colors hover:text-foreground cursor-pointer motion-reduce:animate-none"
      >
        <ArrowDown className="size-3.5 text-emerald-500/80 transition-transform duration-200 group-hover:translate-y-0.5 motion-reduce:transition-none" />
        <span>{cue}</span>
        <span className="text-muted-foreground/35">/</span>
        <span>{aside}</span>
      </button>
    </div>
  )
}

/** section 背景：网格纹理 + emerald 氛围光 */
export function SectionBackdrop(props: { className?: string }) {
  return (
    <>
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-0 -z-10 opacity-30 dark:opacity-20",
          props.className
        )}
        style={{
          background:
            "radial-gradient(ellipse 65% 50% at 50% 30%, rgba(16, 185, 129, 0.12) 0%, transparent 70%)",
        }}
      />
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-[linear-gradient(to_right,var(--border)_1px,transparent_1px),linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] [mask-image:radial-gradient(ellipse_75%_65%_at_45%_35%,black_25%,transparent_100%)] bg-[size:4rem_4rem] opacity-[0.025]"
      />
    </>
  )
}
