/*
Copyright (C) 2023-2026 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.
*/
import { useState, useEffect, useRef } from "react"
import { Link } from "@tanstack/react-router"
import { ArrowUpRight, ArrowLeft, ArrowRight, Pause, Play, Check, Zap, Gauge, BoxSelect } from "lucide-react"
import { useTranslation } from "react-i18next"

import { AnimateInView } from "@/components/animate-in-view"

interface ModelItem {
  id: string
  name: string
  provider: string
  category: string
  tag: string
  badge: string
  description: string
  context: string
  latency: string
  strengths: string[]
  accentColor: string
  glowColor: string
}

const MODELS: ModelItem[] = [
  {
    id: 'claude-3-5-sonnet',
    name: 'Claude 3.5 Sonnet',
    provider: 'Anthropic',
    category: 'Reasoning & Coding',
    tag: 'Flagship Logic',
    badge: 'SOTA 架构',
    description: '顶尖代码架构、复杂系统推演与长文本深度推理，极高遵循能力。',
    context: '200K Tokens',
    latency: '< 800ms 首字',
    strengths: ['复杂指令精细遵循', '全栈代码重构与审查', '长链路逻辑推演'],
    accentColor: 'rgb(249, 115, 22)',
    glowColor: 'rgba(249, 115, 22, 0.22)',
  },
  {
    id: 'deepseek-r1',
    name: 'DeepSeek R1',
    provider: 'DeepSeek',
    category: 'Reasoning & Math',
    tag: 'Open Thinking',
    badge: '满血思考链',
    description: '开源前沿长思维链深度推理模型，在数理证明、逻辑论证与算法构思上表现卓越。',
    context: '64K Tokens',
    latency: '深度推导',
    strengths: ['数理化竞赛级证明', '原生 CoT 思考过程展示', '极致推理性价比'],
    accentColor: 'rgb(59, 130, 246)',
    glowColor: 'rgba(59, 130, 246, 0.22)',
  },
  {
    id: 'gpt-4o',
    name: 'GPT-4o',
    provider: 'OpenAI',
    category: 'Omni Multimodal',
    tag: 'Multimodal',
    badge: '全模态旗舰',
    description: '高并发图文多模态全能模型，视觉细节提取与跨语言理解能力敏锐精准。',
    context: '128K Tokens',
    latency: '< 650ms 首字',
    strengths: ['图文混合推理与提取', '高并发工业级可靠性', '复杂格式精准输出'],
    accentColor: 'rgb(16, 185, 129)',
    glowColor: 'rgba(16, 185, 129, 0.22)',
  },
  {
    id: 'gemini-2-0-flash',
    name: 'Gemini 2.0 Flash',
    provider: 'Google',
    category: 'High Speed & Long Context',
    tag: 'Sub-second Stream',
    badge: '百万上下文',
    description: '兼备毫秒级超低首字延迟与百万超大窗口吞吐，敏捷交互与大规模文献速读利器。',
    context: '1M Tokens',
    latency: '< 380ms 首字',
    strengths: ['百万 Token 超长文本速查', '极速流式打字体验', '经济型大吞吐处理'],
    accentColor: 'rgb(6, 182, 212)',
    glowColor: 'rgba(6, 182, 212, 0.22)',
  },
  {
    id: 'flux-1-pro',
    name: 'FLUX.1 Pro',
    category: 'Visual & Image',
    provider: 'Black Forest Labs',
    tag: 'Photorealism',
    badge: '电影画质',
    description: '新一代前沿图像生成旗舰，细腻自然光影、人体微表情与排版文字清晰呈现。',
    context: '2K / 4K Master',
    latency: '极速出图',
    strengths: ['逼真电影级光影质感', '精准排版英文字符', '复杂主体肢体构图'],
    accentColor: 'rgb(168, 85, 247)',
    glowColor: 'rgba(168, 85, 247, 0.22)',
  },
  {
    id: 'kling-1-5',
    name: 'Kling 1.5 Pro',
    category: 'Cinematic Video',
    provider: 'Kuaishou',
    tag: 'Motion Dynamics',
    badge: '高物理保真',
    description: '电影级长镜头视频生成，支持平滑镜头运动轨迹、流体动力学与大尺度动作模拟。',
    context: '1080P / 4K Motion',
    latency: '分布式渲染',
    strengths: ['大动作连续性保持', '真实世界物理规律模拟', '多运镜模式平滑转换'],
    accentColor: 'rgb(236, 72, 153)',
    glowColor: 'rgba(236, 72, 153, 0.22)',
  },
  {
    id: 'claude-3-5-haiku',
    name: 'Claude 3.5 Haiku',
    category: 'High Speed & Code',
    provider: 'Anthropic',
    tag: 'Fast Agent',
    badge: '敏捷轻量',
    description: '极速响应轻量主力模型，在保持高智商水平的同时将调用成本与延迟降至极低。',
    context: '200K Tokens',
    latency: '< 420ms 首字',
    strengths: ['快速工具调用', '高频客服与路由筛选', '高性价比代码编写'],
    accentColor: 'rgb(245, 158, 11)',
    glowColor: 'rgba(245, 158, 11, 0.22)',
  },
  {
    id: 'o3-mini',
    name: 'o3-mini',
    category: 'Reasoning & STEM',
    provider: 'OpenAI',
    tag: 'STEM Specialist',
    badge: '数理推演',
    description: '专注于编程、数学与科学工程推导的小型高智能推理模型，速度与逻辑兼备。',
    context: '128K Tokens',
    latency: '自适应思考',
    strengths: ['竞赛级算法与代码生成', '严密符号数理推演', '结构化精准解析'],
    accentColor: 'rgb(14, 165, 233)',
    glowColor: 'rgba(14, 165, 233, 0.22)',
  },
]

export function SectionModels() {
  const { t } = useTranslation()
  const [activeIndex, setActiveIndex] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const [page, setPage] = useState(0)
  const itemsPerPage = 4
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const activeModel = MODELS[activeIndex]
  const totalPages = Math.ceil(MODELS.length / itemsPerPage)

  const currentList = MODELS.slice(page * itemsPerPage, (page + 1) * itemsPerPage)

  useEffect(() => {
    if (isPaused) return
    timerRef.current = setInterval(() => {
      setActiveIndex((prev) => {
        const nextIdx = (prev + 1) % MODELS.length
        if (nextIdx >= (page + 1) * itemsPerPage || nextIdx < page * itemsPerPage) {
          setPage(Math.floor(nextIdx / itemsPerPage))
        }
        return nextIdx
      })
    }, 5000)
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [isPaused, page])

  const handleNextPage = () => {
    setPage((prev) => (prev + 1) % totalPages)
  }

  const handlePrevPage = () => {
    setPage((prev) => (prev - 1 + totalPages) % totalPages)
  }

  return (
    <section id="models" className="relative z-10 border-t border-border/40 px-6 py-20 md:py-28">
      <div className="mx-auto max-w-7xl">
        <AnimateInView className="mb-14 flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl md:text-5xl">
              <span className="hero-title-shine-emerald inline-block">{t("sec_models_title_p1")}</span>
              <br />
              <span className="text-foreground/90">{t("sec_models_title_p2")}</span>
            </h2>
            <div className="mt-4 h-0.5 w-10 rounded-full bg-emerald-500/80" />
            <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted-foreground md:text-base">
              {t("sec_models_desc")}
            </p>
          </div>

          <div className="flex items-center gap-4">
            <Link
              to={"/pricing" as any}
              className="group relative inline-flex h-9 items-center gap-2 overflow-hidden rounded-lg bg-emerald-500/10 px-4 text-xs font-semibold text-emerald-600 transition-all duration-300 hover:bg-emerald-500 hover:text-white hover:shadow-[0_4px_14px_rgba(16,185,129,0.25)] dark:text-emerald-400 dark:hover:bg-emerald-500 dark:hover:text-background cursor-pointer"
            >
              <span>{t("sec_models_view_all")}</span>
              <ArrowUpRight className="size-3.5 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </Link>
          </div>
        </AnimateInView>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:gap-8 xl:gap-10"
             onMouseEnter={() => setIsPaused(true)}
             onMouseLeave={() => setIsPaused(false)}
        >
          {/* Main Showcase Card (Left 5/12) */}
          <div className="lg:col-span-5 relative overflow-hidden rounded-3xl border border-border/60 bg-card/40 backdrop-blur-md shadow-sm transition-all duration-500 flex flex-col min-h-[460px]">
            <div
              className="absolute inset-0 opacity-10 transition-colors duration-700"
              style={{ background: `radial-gradient(circle at 0% 0%, ${activeModel.accentColor}, transparent 70%)` }}
            />
            
            <div className="relative flex-1 p-8 sm:p-10 flex flex-col justify-between">
              <div className="landing-animate-fade-up" key={activeModel.id}>
                <div className="flex items-center gap-3 mb-6">
                  <span className="inline-flex items-center rounded-full border border-border/40 bg-background/50 px-3 py-1 font-mono text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                    {activeModel.provider}
                  </span>
                  <span 
                    className="inline-flex items-center rounded-full px-3 py-1 text-[11px] font-medium tracking-wide shadow-sm"
                    style={{ backgroundColor: activeModel.glowColor, color: activeModel.accentColor, borderColor: activeModel.accentColor, borderWidth: '1px' }}
                  >
                    {activeModel.badge}
                  </span>
                </div>

                <h3 className="text-3xl font-black tracking-tight text-foreground sm:text-4xl mb-4">
                  {activeModel.name}
                </h3>
                
                <p className="text-[15px] leading-relaxed text-muted-foreground sm:text-base">
                  {activeModel.description}
                </p>

                <div className="mt-8 grid grid-cols-2 gap-4 sm:gap-6">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase text-muted-foreground/80">
                      <BoxSelect className="size-3.5" />
                      <span>Context Window</span>
                    </div>
                    <div className="font-medium text-foreground text-sm">
                      {activeModel.context}
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase text-muted-foreground/80">
                      <Gauge className="size-3.5" />
                      <span>Performance</span>
                    </div>
                    <div className="font-medium text-foreground text-sm">
                      {activeModel.latency}
                    </div>
                  </div>
                </div>

                <div className="mt-8 space-y-3">
                  {activeModel.strengths.map((s) => (
                    <div key={s} className="flex items-center gap-2.5 text-sm font-medium text-foreground/80">
                      <div className="flex size-5 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: activeModel.glowColor }}>
                        <Check className="size-3" style={{ color: activeModel.accentColor }} />
                      </div>
                      <span>{s}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-10 flex items-center justify-between border-t border-border/30 pt-6">
                <button
                  type="button"
                  onClick={() => setIsPaused(!isPaused)}
                  className="flex items-center gap-2 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground cursor-pointer"
                >
                  {isPaused ? <Play className="size-4" /> : <Pause className="size-4" />}
                  <span>{t("sec_models_auto_toggle")}</span>
                </button>

                <Link
                  to="/dashboard"
                  search={{ model: activeModel.id } as any}
                  className="group inline-flex items-center gap-1.5 font-sans text-xs font-semibold text-foreground transition-all hover:opacity-80"
                  style={{ color: activeModel.accentColor }}
                >
                  <span>{t("sec_models_explore")}</span>
                  <ArrowUpRight className="size-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </Link>
              </div>
            </div>
          </div>

          {/* List Cards (Right 7/12) */}
          <div className="lg:col-span-7 flex flex-col">
            <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4 lg:gap-5">
              {currentList.map((model) => {
                const isActive = activeModel.id === model.id
                const realIndex = MODELS.findIndex(m => m.id === model.id)
                return (
                  <div
                    key={model.id}
                    onClick={() => setActiveIndex(realIndex)}
                    className={`group relative cursor-pointer overflow-hidden rounded-2xl border p-5 sm:p-6 transition-all duration-300 flex flex-col justify-between ${
                      isActive 
                        ? "border-border shadow-md bg-card/80 scale-[1.02]" 
                        : "border-border/40 bg-card/20 hover:border-border/80 hover:bg-card/50"
                    }`}
                  >
                    {isActive && (
                      <div 
                        className="absolute inset-0 opacity-[0.08] pointer-events-none"
                        style={{ backgroundColor: model.accentColor }}
                      />
                    )}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <span className="font-mono text-[10px] tracking-wider text-muted-foreground uppercase">
                          {model.category}
                        </span>
                        {isActive && (
                          <div className="flex size-2 rounded-full" style={{ backgroundColor: model.accentColor, boxShadow: `0 0 8px ${model.glowColor}` }} />
                        )}
                      </div>
                      <h4 className={`text-lg font-bold tracking-tight mb-2 transition-colors ${isActive ? 'text-foreground' : 'text-foreground/80 group-hover:text-foreground'}`}>
                        {model.name}
                      </h4>
                      <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                        {model.description}
                      </p>
                    </div>
                    
                    <div className="mt-6 flex items-center justify-between text-[11px] font-mono text-muted-foreground/70 border-t border-border/30 pt-3">
                      <span>{model.provider}</span>
                      <span className="flex items-center gap-1">
                        <Zap className="size-3" />
                        {model.tag}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
            
            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="mt-6 flex items-center justify-end gap-3">
                <span className="text-xs font-mono text-muted-foreground">
                  0{page + 1} <span className="opacity-40">/</span> 0{totalPages}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handlePrevPage}
                    className="flex size-8 items-center justify-center rounded-full border border-border/50 bg-background hover:bg-muted transition-colors cursor-pointer"
                    aria-label={t("sec_models_nav_prev")}
                  >
                    <ArrowLeft className="size-3.5 text-foreground/70" />
                  </button>
                  <button
                    type="button"
                    onClick={handleNextPage}
                    className="flex size-8 items-center justify-center rounded-full border border-border/50 bg-background hover:bg-muted transition-colors cursor-pointer"
                    aria-label={t("sec_models_nav_next")}
                  >
                    <ArrowRight className="size-3.5 text-foreground/70" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
