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
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { PlazaFilterChip } from '../filter-chip'

describe('plaza filter chip', () => {
  it('lifts on hover with a translate instead of a scale', () => {
    render(
      <PlazaFilterChip
        option={{ value: 'openai', label: 'OpenAI' }}
        active={false}
        onClick={() => {}}
      />
    )

    const classes = screen
      .getByRole('button', { name: 'OpenAI' })
      .className.split(' ')

    expect(classes).toContain('transition')
    expect(classes).toContain('hover:-translate-y-px')
    expect(classes).not.toContain('transition-all')
    // 缩放会让 14px 图标和 11px 文字在 zoom 画布上逐帧重绘而发虚
    expect(classes.some((name) => name.startsWith('hover:scale-'))).toBe(false)
    expect(classes.some((name) => name.startsWith('active:scale-'))).toBe(false)
  })
})
