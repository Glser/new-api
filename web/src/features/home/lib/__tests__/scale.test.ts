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
import { describe, expect, it } from "vitest"

import {
  getHomeScale,
  HOME_DESIGN_WIDTH,
  HOME_MAX_SCALE,
  HOME_MIN_SCALE,
  HOME_SCALE_MOBILE_MAX,
} from "../scale"

describe("getHomeScale", () => {
  it("keeps phones at scale 1 so chips and links stay tappable", () => {
    expect(getHomeScale(375)).toBe(1)
    expect(getHomeScale(HOME_SCALE_MOBILE_MAX - 1)).toBe(1)
  })

  it("scales the 1536px canvas proportionally across laptop and desktop screens", () => {
    expect(getHomeScale(HOME_DESIGN_WIDTH)).toBe(1)
    // 16-inch laptop typical viewport (e.g. 1382.4px or 1280px)
    expect(getHomeScale(1382.4)).toBeCloseTo(0.9, 2)
    // 27-inch 1080p/2K typical viewport (1920px)
    expect(getHomeScale(1920)).toBe(1.25)
  })

  it("clamps scale between MIN_SCALE and MAX_SCALE on tablet and ultrawide", () => {
    expect(getHomeScale(HOME_SCALE_MOBILE_MAX)).toBe(HOME_MIN_SCALE)
    expect(getHomeScale(2560)).toBe(HOME_MAX_SCALE)
  })
})
