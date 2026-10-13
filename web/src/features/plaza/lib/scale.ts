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

/** Layout is authored at this width, then zoomed to the current viewport. */
export const PLAZA_DESIGN_WIDTH = 1440
export const PLAZA_MIN_SCALE = 0.8
export const PLAZA_MAX_SCALE = 1.25
export const PLAZA_SCALE_MOBILE_MAX = 768

/**
 * Map a viewport width to the plaza zoom factor.
 *
 * Phones keep scale 1 so type and chips stay tappable. From tablet up, the
 * page is treated as a 1440px canvas and zoomed to the window, clamped so
 * ultra-wide screens do not blow type up past 125%.
 */
export function getPlazaScale(viewportWidth: number): number {
  if (viewportWidth < PLAZA_SCALE_MOBILE_MAX) {
    return 1
  }

  const scale = viewportWidth / PLAZA_DESIGN_WIDTH
  if (scale < PLAZA_MIN_SCALE) {
    return PLAZA_MIN_SCALE
  }
  if (scale > PLAZA_MAX_SCALE) {
    return PLAZA_MAX_SCALE
  }
  return scale
}
