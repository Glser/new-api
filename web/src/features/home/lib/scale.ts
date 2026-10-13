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
 * 首页设计画布基准宽度。
 * 1536px 对齐标准 16:9/16:10 桌面与现代化 2K 屏基准，
 * 使得 16 寸轻薄/高清屏（逻辑视口通常 1280~1440px）自适应缩小（0.83 ~ 0.94），
 * 而 27 寸大屏（1920px+）自适应放大（1.15 ~ 1.25）。
 */
export const HOME_DESIGN_WIDTH = 1536
export const HOME_MIN_SCALE = 0.8
export const HOME_MAX_SCALE = 1.25
export const HOME_SCALE_MOBILE_MAX = 768

/**
 * 计算首页在当前视口宽度下的整体缩放比例 (CSS zoom)。
 *
 * 手机/竖屏（< 768px）保持 1.0，保证移动端交互、可点击热区与原生流式排版；
 * 平板及桌面端按 1536px 画布等比放缩，并钳制在 0.80 ~ 1.25 之间。
 */
export function getHomeScale(viewportWidth: number): number {
  if (viewportWidth < HOME_SCALE_MOBILE_MAX) {
    return 1
  }

  const scale = viewportWidth / HOME_DESIGN_WIDTH
  if (scale < HOME_MIN_SCALE) {
    return HOME_MIN_SCALE
  }
  if (scale > HOME_MAX_SCALE) {
    return HOME_MAX_SCALE
  }
  return scale
}
