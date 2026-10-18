import Lenis from 'lenis'
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
import { useEffect } from 'react'

/**
 * 为首页启用高帧率平滑动力学滚动 (Lenis)。
 *
 * 优化特性：
 * 1. 拦截鼠标滚轮的步进跳跃，通过 lerp 阻尼插值过渡，实现丝滑流畅的滑动惯性。
 * 2. 尊重操作系统的 `prefers-reduced-motion` 设置，若用户开启减弱动态效果则自动降级为原生滚动。
 * 3. 组件卸载或页面跳出时自动销毁实例并清理 requestAnimationFrame 循环。
 */
export function useLenis() {
  useEffect(() => {
    if (typeof window === 'undefined') return

    // 如果用户设置了偏好减少动画，直接跳过平滑滚动
    const reducedMotion = window.matchMedia?.(
      '(prefers-reduced-motion: reduce)'
    )?.matches
    if (reducedMotion) return

    let lenis: Lenis | null = null
    let rafId: number | null = null

    try {
      lenis = new Lenis({
        lerp: 0.1,
        duration: 1.2,
        smoothWheel: true,
      })

      const raf = (time: number) => {
        lenis?.raf(time)
        rafId = requestAnimationFrame(raf)
      }

      rafId = requestAnimationFrame(raf)
    } catch {
      // 容错降级（如特定环境缺少 API）
    }

    return () => {
      if (rafId !== null) {
        cancelAnimationFrame(rafId)
      }
      lenis?.destroy()
    }
  }, [])
}
