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
 * 点阵纹理：一层极淡的中性网点，只给纯白画布加点质地，
 * 不再用主题色光晕——那块渐变色在白底上偏脏，也盖过了卡片本身。
 * 颜色由 color-mix 从主题变量派生，切换预设或深浅色时自动跟随；
 * 向下淡出避免和内容争抢。
 */
const plazaDotGridStyle: CSSProperties = {
  backgroundImage:
    'radial-gradient(circle, color-mix(in oklch, var(--border) 55%, transparent) 1px, transparent 1px)',
  backgroundSize: '32px 32px',
  maskImage:
    'radial-gradient(ellipse 70% 90% at 50% 0%, black, transparent 70%)',
  WebkitMaskImage:
    'radial-gradient(ellipse 70% 90% at 50% 0%, black, transparent 70%)',
}

/**
 * /plaza 页面背景：淡点阵，铺在页面自带的底色上。
 * 纯装饰层，aria-hidden 且不接收指针事件，需挂在 relative 容器内使用。
 */
export function PlazaBackdrop() {
  return (
    <div
      aria-hidden='true'
      data-testid='plaza-dot-grid'
      className='pointer-events-none absolute inset-0'
      style={plazaDotGridStyle}
    />
  )
}
