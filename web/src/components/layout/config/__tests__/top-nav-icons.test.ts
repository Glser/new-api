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
import { Home01Icon } from '@hugeicons/core-free-icons'
import { describe, expect, it } from 'vitest'

import { resolveTopNavIcon, withTopNavIcons } from '../top-nav-icons'

describe('resolveTopNavIcon', () => {
  it('maps every known internal destination to a glyph', () => {
    for (const href of [
      '/',
      '/dashboard',
      '/pricing',
      '/rankings',
      '/docs',
      '/about',
    ]) {
      expect(resolveTopNavIcon(href)).toBeDefined()
    }
  })

  it('uses the outbound glyph for external links', () => {
    expect(resolveTopNavIcon('https://example.com', true)).toBeDefined()
    // An external link never borrows the glyph of a same-named internal path.
    expect(resolveTopNavIcon('/docs', true)).not.toBe(
      resolveTopNavIcon('/docs')
    )
  })

  it('returns undefined for unknown internal paths so callers can degrade', () => {
    expect(resolveTopNavIcon('/mystery')).toBeUndefined()
  })
})

describe('withTopNavIcons', () => {
  it('fills in the resolved glyph for links that lack one', () => {
    const [link] = withTopNavIcons([{ title: 'Docs', href: '/docs' }])
    expect(link.icon).toBe(resolveTopNavIcon('/docs'))
  })

  it('keeps a caller-provided glyph instead of overriding it', () => {
    const [link] = withTopNavIcons([
      { title: 'Pricing', href: '/pricing', icon: Home01Icon },
    ])
    expect(link.icon).toBe(Home01Icon)
  })

  it('leaves unknown destinations without a glyph', () => {
    const [link] = withTopNavIcons([{ title: 'Custom', href: '/custom' }])
    expect(link.icon).toBeUndefined()
  })
})
