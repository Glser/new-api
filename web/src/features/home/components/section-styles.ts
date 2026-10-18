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

/**
 * 首页各 section 共用的样式常量。
 *
 * 与组件分离存放：同文件混导出常量与组件会破坏 Vite 的 fast refresh。
 */

/** 卡片表面：亮色下近白实底，暗色下半透明纱幕，让卡片从页面中浮起 */
export const glassPanelClassName =
  'border-slate-900/[0.08] bg-white/85 shadow-[0_1px_2px_rgba(15,23,42,0.05),0_24px_50px_-30px_rgba(15,23,42,0.28)] backdrop-blur-2xl dark:border-white/10 dark:bg-white/[0.05] dark:shadow-[0_18px_50px_-24px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.08)]'

/**
 * 小卡表面：与 glassPanelClassName 同一套玻璃质感。
 *
 * 暗色下改用 6% 白色半透明 + 背景模糊，让卡片透出 SectionBackdrop 的氛围光，
 * 与左侧大卡（5%）视觉统一；实底 slate-900 会在深色页面里显得又黑又闷、与背景脱节。
 * 透明度比大卡高半档，用于补偿小字号文字的可读性。
 */
export const compactPanelClassName =
  'border-slate-900/[0.08] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.05),0_16px_36px_-24px_rgba(15,23,42,0.22)] dark:border-white/10 dark:bg-white/[0.06] dark:backdrop-blur-2xl dark:shadow-[0_18px_50px_-24px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.08)]'

/** 卡片内的胶囊容器 */
export const glassCapsuleClassName =
  'rounded-2xl border border-slate-900/[0.07] bg-slate-500/[0.04] shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] backdrop-blur-xl sm:rounded-full dark:border-white/10 dark:bg-white/[0.05] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]'

/** 小卡内部胶囊：实底，无模糊（背景色由调用方按需覆盖） */
export const compactCapsuleClassName =
  'rounded-2xl border border-slate-900/[0.07] shadow-none sm:rounded-full dark:border-white/10'

/** 供应商调色盘：按展示位置轮换，保证同屏卡片颜色有区分 */
export const ACCENT_PALETTE: { accentColor: string; glowColor: string }[] = [
  { accentColor: 'rgb(249, 115, 22)', glowColor: 'rgba(249, 115, 22, 0.22)' },
  { accentColor: 'rgb(16, 185, 129)', glowColor: 'rgba(16, 185, 129, 0.22)' },
  { accentColor: 'rgb(59, 130, 246)', glowColor: 'rgba(59, 130, 246, 0.22)' },
  { accentColor: 'rgb(139, 92, 246)', glowColor: 'rgba(139, 92, 246, 0.22)' },
  { accentColor: 'rgb(236, 72, 153)', glowColor: 'rgba(236, 72, 153, 0.22)' },
  { accentColor: 'rgb(20, 184, 166)', glowColor: 'rgba(20, 184, 166, 0.22)' },
]
