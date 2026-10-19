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
 * 登录页设计画布基准宽度。
 * 1440px 对齐主流桌面与笔记本基准画布，
 * 在标准 1080p (1920px) 屏自适应放大至 1.25x 饱满呈现，
 * 在 13-14 寸轻薄屏 (1280~1366px) 缩小至 0.88~0.94x，
 * 超宽屏最大限制在 1.35x，避免内容无限扩散。
 */
export const SIGN_IN_DESIGN_WIDTH = 1440
export const SIGN_IN_MIN_SCALE = 0.8
export const SIGN_IN_MAX_SCALE = 1.35
export const SIGN_IN_SCALE_MOBILE_MAX = 1024

/**
 * 计算登录页在当前视口宽度下的缩放比例 (CSS zoom)。
 *
 * 移动端/竖屏（< 1024px，左侧 marquee 隐藏，仅表单居中）保持 1.0 原生流式排版；
 * 桌面端（>= 1024px，左右双列布局）按 1440px 基准等比动态放缩。
 */
export function getSignInScale(viewportWidth: number): number {
  if (viewportWidth < SIGN_IN_SCALE_MOBILE_MAX) {
    return 1
  }

  const scale = viewportWidth / SIGN_IN_DESIGN_WIDTH
  if (scale < SIGN_IN_MIN_SCALE) {
    return SIGN_IN_MIN_SCALE
  }
  if (scale > SIGN_IN_MAX_SCALE) {
    return SIGN_IN_MAX_SCALE
  }
  return scale
}
