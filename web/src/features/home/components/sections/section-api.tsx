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
import { ArrowUpRight, Check, Copy } from "lucide-react"
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

import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard"
import { cn } from "@/lib/utils"

export function SectionAPI() {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState<"openai" | "anthropic">("openai")
  const { copyToClipboard } = useCopyToClipboard({ notify: false })
  const [codeCopied, setCodeCopied] = useState(false)

  const baseUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/v1`
      : "https://api.example.com/v1"

  const snippets = {
    openai: [
      `curl ${baseUrl}/chat/completions \\`,
      "  -H \"Content-Type: application/json\" \\",
      "  -H \"Authorization: Bearer $YOUR_API_KEY\" \\",
      "  -d '{",
      "    \"model\": \"claude-3-5-sonnet\",",
      "    \"messages\": [{\"role\": \"user\", \"content\": \"Hello\"}]",
      "  }'",
    ].join("\n"),
    anthropic: [
      `curl ${baseUrl}/messages \\`,
      "  -H \"Content-Type: application/json\" \\",
      "  -H \"x-api-key: $YOUR_API_KEY\" \\",
      "  -H \"anthropic-version: 2023-06-01\" \\",
      "  -d '{",
      "    \"model\": \"claude-3-5-sonnet\",",
      "    \"max_tokens\": 1024,",
      "    \"messages\": [{\"role\": \"user\", \"content\": \"Hello\"}]",
      "  }'",
    ].join("\n"),
  }

  const handleCopyCode = async () => {
    await copyToClipboard(snippets[activeTab])
    setCodeCopied(true)
    setTimeout(() => setCodeCopied(false), 2000)
  }

  const steps = [
    {
      step: t("sec_api_step1"),
      desc: "在控制台一键生成专属调用 Token，支持按渠道配额与模型白名单精细约束。",
    },
    {
      step: t("sec_api_step2"),
      desc: "直接将你原有客户端的 Base URL 指向本网关，并配置对应模型标识符。",
    },
    {
      step: t("sec_api_step3"),
      desc: "无需任何 SDK 迁移，立刻享受自动负载均衡、故障转移与用量统计。",
    },
  ]

  return (
    <section
      id="api"
      className="relative z-10 overflow-hidden px-4 py-20 sm:px-6 md:py-28 lg:px-8"
    >
      <SectionBackdrop />

      <div className="mx-auto max-w-7xl">
        <SectionHeader
          titlePrimary={t("sec_api_title_p1")}
          titleSecondary={t("sec_api_title_p2")}
          description={t("sec_api_desc")}
          action={
            <SectionPrimaryLink
              to="/dashboard"
              label={t("sec_api_action")}
            />
          }
        />

        <div className="grid grid-cols-1 items-stretch gap-5 lg:grid-cols-12 lg:gap-6">
          {/* 左：三步接入流程 */}
          <div className="flex flex-col justify-between gap-4 lg:col-span-5">
            <div className="flex flex-col gap-3.5">
              {steps.map((item, idx) => {
                const palette = ACCENT_PALETTE[idx % ACCENT_PALETTE.length]
                return (
                  <div
                    key={item.step}
                    className={cn(
                      "relative overflow-hidden rounded-2xl p-5",
                      compactPanelClassName
                    )}
                  >
                    <div
                      aria-hidden
                      className="pointer-events-none absolute inset-0 opacity-50"
                      style={{
                        background: `radial-gradient(ellipse 60% 45% at 20% 0%, ${palette.glowColor}, transparent 65%)`,
                      }}
                    />
                    <div
                      className="relative font-mono text-xs font-semibold"
                      style={{ color: palette.accentColor }}
                    >
                      {item.step}
                    </div>
                    <div className="relative mt-1.5 text-xs leading-relaxed text-muted-foreground">
                      {item.desc}
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="rounded-2xl border border-slate-900/[0.07] bg-slate-500/[0.04] p-4 font-mono text-[11px] text-muted-foreground/80 backdrop-blur-xl sm:rounded-full dark:border-white/10 dark:bg-white/[0.05]">
              <span>提示：{t("sec_api_copy_hint")}</span>
            </div>
          </div>

          {/* 右：终端预览 */}
          <div className="relative flex flex-col justify-between overflow-hidden rounded-3xl border border-white/10 bg-neutral-950 p-6 shadow-[0_24px_50px_-30px_rgba(0,0,0,0.6)] lg:col-span-7">
            <div>
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab("openai")}
                    aria-pressed={activeTab === "openai"}
                    className={cn(
                      "cursor-pointer font-mono text-xs transition-colors",
                      activeTab === "openai"
                        ? "font-semibold text-emerald-400"
                        : "text-white/40 hover:text-white/70"
                    )}
                  >
                    OpenAI 兼容
                  </button>
                  <span className="text-white/20">/</span>
                  <button
                    type="button"
                    onClick={() => setActiveTab("anthropic")}
                    aria-pressed={activeTab === "anthropic"}
                    className={cn(
                      "cursor-pointer font-mono text-xs transition-colors",
                      activeTab === "anthropic"
                        ? "font-semibold text-emerald-400"
                        : "text-white/40 hover:text-white/70"
                    )}
                  >
                    Anthropic 原生
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleCopyCode}
                  className="flex cursor-pointer items-center gap-1.5 font-mono text-[11px] text-white/50 transition-colors hover:text-white"
                >
                  {codeCopied ? (
                    <>
                      <Check className="size-3 text-emerald-400" />
                      <span className="text-emerald-400">
                        {t("sec_api_copied")}
                      </span>
                    </>
                  ) : (
                    <>
                      <Copy className="size-3" />
                      <span>{t("sec_api_copy_sample")}</span>
                    </>
                  )}
                </button>
              </div>

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
                className="inline-flex items-center gap-1 text-emerald-400 transition-colors hover:text-emerald-300"
              >
                <span>{t("sec_api_go_config")}</span>
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
