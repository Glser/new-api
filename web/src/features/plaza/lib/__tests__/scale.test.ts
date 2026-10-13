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
import { describe, expect, it } from 'vitest'

import {
  getPlazaScale,
  PLAZA_DESIGN_WIDTH,
  PLAZA_MAX_SCALE,
  PLAZA_MIN_SCALE,
  PLAZA_SCALE_MOBILE_MAX,
} from '../scale'

describe('getPlazaScale', () => {
  it('keeps phones at scale 1 so chips stay tappable', () => {
    expect(getPlazaScale(375)).toBe(1)
    expect(getPlazaScale(PLAZA_SCALE_MOBILE_MAX - 1)).toBe(1)
  })

  it('zooms the 1440px canvas to the current viewport from tablet up', () => {
    expect(getPlazaScale(PLAZA_DESIGN_WIDTH)).toBe(1)
    expect(getPlazaScale(1296)).toBe(0.9)
  })

  it('clamps scale on very small tablets and ultra-wide screens', () => {
    expect(getPlazaScale(PLAZA_SCALE_MOBILE_MAX)).toBe(PLAZA_MIN_SCALE)
    expect(getPlazaScale(2400)).toBe(PLAZA_MAX_SCALE)
  })
})
