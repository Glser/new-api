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

import { formatGroupRatio } from '../group-ratio'

describe('formatGroupRatio', () => {
  it('returns undefined when the ratio is missing', () => {
    expect(formatGroupRatio(undefined)).toBeUndefined()
  })

  it('keeps whole numbers without trailing decimals', () => {
    expect(formatGroupRatio(1)).toBe('x1')
    expect(formatGroupRatio(3)).toBe('x3')
  })

  it('trims trailing zeros on fractional ratios', () => {
    expect(formatGroupRatio(0.5)).toBe('x0.5')
    expect(formatGroupRatio(1.25)).toBe('x1.25')
  })
})
