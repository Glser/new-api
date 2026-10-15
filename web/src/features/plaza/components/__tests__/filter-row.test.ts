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
  plazaFilterRowChipsClassName,
  plazaFilterRowClassName,
  plazaFilterRowLabelClassName,
} from '../filter-row'

describe('plaza filter row layout', () => {
  it('keeps the label on the same row as the chips', () => {
    expect(plazaFilterRowClassName.split(' ')).toEqual(
      expect.arrayContaining(['flex', 'items-start'])
    )
    expect(plazaFilterRowClassName.split(' ')).not.toContain('flex-col')
  })

  it('pins the label to chip height so it stays vertically aligned', () => {
    expect(plazaFilterRowLabelClassName.split(' ')).toEqual(
      expect.arrayContaining(['h-9', 'items-center', 'shrink-0'])
    )
  })

  it('lets chips wrap instead of forcing a horizontal scrollbar', () => {
    expect(plazaFilterRowChipsClassName.split(' ')).toEqual(
      expect.arrayContaining(['flex-wrap', 'flex-1'])
    )
    expect(plazaFilterRowChipsClassName.split(' ')).not.toContain(
      'overflow-x-auto'
    )
  })
})
