/*
Copyright (C) 2023-2026 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.
*/
import { useState } from "react"
import { Link } from "@tanstack/react-router"
import { ArrowUpRight, Check, Copy } from "lucide-react"
import { useTranslation } from "react-i18next"

import { AnimateInView } from "@/components/animate-in-view"
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard"

export function SectionAPI() {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState<"openai" | "anthropic">("openai")
  const { copyToClipboard } = useCopyToClipboard({ notify: false })
  const [codeCopied, setCodeCopied] = useState(false)

  const baseUrl = typeof window !== "undefined" ? `${window.location.origin}/v1` : "https://api.example.com/v1"

  const snippets = {
    openai: [
      `curl ${baseUrl}/chat/completions \\`,
      "  -H \x22Content-Type: application/json\x22 \\",
      "  -H \x22Authorization: Bearer $YOUR_API_KEY\x22 \\",
      "  -d '{",
      "    \x22model\x22: \x22claude-3-5-sonnet\x22,",
      "    \x22messages\x22: [{\x22role\x22: \x22user\x22, \x22content\x22: \x22Hello\x22}]",
      "  }'",
    ].join("\n"),
    anthropic: [
      `curl ${baseUrl}/messages \\`,
      "  -H \x22Content-Type: application/json\x22 \\",
      "  -H \x22x-api-key: $YOUR_API_KEY\x22 \\",
      "  -H \x22anthropic-version: 2023-06-01\x22 \\",
      "  -d '{",
      "    \x22model\x22: \x22claude-3-5-sonnet\x22,",
      "    \x22max_tokens\x22: 1024,",
      "    \x22messages\x22: [{\x22role\x22: \x22user\x22, \x22content\x22: \x22Hello\x22}]",
      "  }'",
    ].join("\n"),
  }

  const handleCopyCode = async () => {
    await copyToClipboard(snippets[activeTab])
    setCodeCopied(true)
    setTimeout(() => setCodeCopied(false), 2000)
  }

  return (
    <section id="api" className="relative z-10 border-t border-border/40 px-4 sm:px-6 lg:px-8 py-20 md:py-28">
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
              {t("sec_api_kicker")}
            </div>
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl md:text-5xl"><span className="hero-title-shine inline-block">{t("sec_api_title_p1")}</span><br /><span className="text-foreground/90">{t("sec_api_title_p2")}</span></h2>
            <div className="mt-4 h-0.5 w-32 sm:w-48 rounded-full bg-gradient-to-r from-emerald-500 via-teal-400 to-transparent" />
            <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted-foreground md:text-base">
              {t("sec_api_desc")}
            </p>
          </div>

          <div>
            <Link
              to="/dashboard"
              className="group inline-flex items-center gap-1.5 font-mono text-xs font-semibold tracking-wider text-muted-foreground transition-colors hover:text-foreground"
            >
              <span>{t("sec_api_action")}</span>
              <ArrowUpRight className="size-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </Link>
          </div>
        </AnimateInView>

        {/* Clean Terminal Box & 3-Step Guides */}
        <div className="grid grid-cols-1 items-stretch gap-8 lg:grid-cols-12 lg:gap-10">
          {/* Left: 3-Step Integration Flow */}
          <div className="flex flex-col justify-between gap-4 lg:col-span-5">
            <div className="flex flex-col gap-3">
              {[
                { step: t("sec_api_step1"), desc: "在控制台一键生成专属调用 Token，支持按渠道配额与模型白名单精细约束。" },
                { step: t("sec_api_step2"), desc: "直接将你原有客户端的 Base URL 指向本网关，并配置对应模型标识符。" },
                { step: t("sec_api_step3"), desc: "无需任何 SDK 迁移，立刻享受自动负载均衡、故障转移与用量统计。" },
              ].map((item) => (<div key={item.id} className="relative overflow-hidden rounded-2xl border border-border/40 bg-card/20 p-5">
                  <div className="font-mono text-xs font-semibold text-emerald-500">
                    {item.step}
                  </div>
                  <div className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                    {item.desc}
                  </div>
                </div>
              ))}
            </div>

            <div className="rounded-xl border border-border/30 bg-muted/10 p-4 font-mono text-[11px] text-muted-foreground/80">
              <span>提示：{t("sec_api_copy_hint")}</span>
            </div>
          </div>

          {/* Right: Clean Terminal Preview */}
          <div className="relative flex flex-col justify-between overflow-hidden rounded-xl border border-border/50 bg-neutral-950 p-6 shadow-xl lg:col-span-7">
            <div>
              {/* Terminal Tabs & Copy */}
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab("openai")}
                    className={`font-mono text-xs cursor-pointer ${
                      activeTab === "openai" ? "font-semibold text-emerald-400" : "text-white/40 hover:text-white/70"
                    }`}
                  >
                    OpenAI 兼容
                  </button>
                  <span className="text-white/20">/</span>
                  <button
                    type="button"
                    onClick={() => setActiveTab("anthropic")}
                    className={`font-mono text-xs cursor-pointer ${
                      activeTab === "anthropic" ? "font-semibold text-emerald-400" : "text-white/40 hover:text-white/70"
                    }`}
                  >
                    Anthropic 原生
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleCopyCode}
                  className="flex items-center gap-1.5 font-mono text-[11px] text-white/50 hover:text-white transition-colors cursor-pointer"
                >
                  {codeCopied ? (
                    <>
                      <Check className="size-3 text-emerald-400" />
                      <span className="text-emerald-400">{t("sec_api_copied")}</span>
                    </>
                  ) : (
                    <>
                      <Copy className="size-3" />
                      <span>{t("sec_api_copy_sample")}</span>
                    </>
                  )}
                </button>
              </div>

              {/* Terminal Snippet Body */}
              <div className="mt-5 font-mono text-xs leading-loose text-white/80">
                <pre className="overflow-x-auto whitespace-pre-wrap">
                  <code>{snippets[activeTab]}</code>
                </pre>
              </div>
            </div>

            <div className="mt-8 flex items-center justify-between border-t border-white/10 pt-4 font-mono text-[11px] text-white/40">
              <span>BASE URL: {baseUrl}</span>
              <Link
                to="/dashboard"
                className="inline-flex items-center gap-1 text-emerald-400 hover:text-emerald-300 transition-colors"
              >
                <span>{t("sec_api_go_config")}</span>
                <ArrowUpRight className="size-3" />
              </Link>
            </div>
          </div>
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


