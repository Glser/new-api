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
import type { CSSProperties } from 'react'

/**
 * 画布柔光：顶部一团极淡的主题色光晕，叠加一层几乎察觉不到的「上亮下暗」。
 * 纯白画布在长列表里偏刺眼，这两层把底色调成柔和的纸感，
 * 白色卡片也能从底色里轻轻浮出来。
 * 颜色全部由 color-mix 从主题变量派生，切换预设或深浅色时自动跟随。
 */
const plazaAmbientStyle: CSSProperties = {
  backgroundImage: [
    'radial-gradient(115% 62% at 50% 0%, color-mix(in oklch, var(--primary) 10%, var(--background)) 0%, transparent 68%)',
    'linear-gradient(to bottom, color-mix(in oklch, var(--foreground) 3%, var(--background)) 0%, transparent 70%)',
  ].join(', '),
}

/**
 * 点阵纹理：沿用原来的中性网点，但颜色再淡一档、网格再疏一档，
 * 只给柔光加点质地，不再抢卡片的注意力；向下淡出避免和内容争抢。
 */
const plazaDotGridStyle: CSSProperties = {
  backgroundImage:
    'radial-gradient(circle, color-mix(in oklch, var(--border) 65%, transparent) 1px, transparent 1px)',
  backgroundSize: '26px 26px',
  maskImage:
    'radial-gradient(ellipse 75% 100% at 50% 0%, black, transparent 72%)',
  WebkitMaskImage:
    'radial-gradient(ellipse 75% 100% at 50% 0%, black, transparent 72%)',
}

/**
 * /plaza 页面背景：柔光 + 淡点阵。
 * 纯装饰层，aria-hidden 且不接收指针事件，需挂在 relative 容器内使用。
 */
export function PlazaBackdrop() {
  return (
    <>
      <div
        aria-hidden='true'
        data-testid='plaza-ambient-wash'
        className='pointer-events-none absolute inset-0'
        style={plazaAmbientStyle}
      />
      <div
        aria-hidden='true'
        data-testid='plaza-dot-grid'
        className='pointer-events-none absolute inset-x-0 top-0 h-[420px]'
        style={plazaDotGridStyle}
      />
    </>
  )
}
