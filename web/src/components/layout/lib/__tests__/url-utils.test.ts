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

import { isTopNavLinkActive, normalizeHref } from '../url-utils'

describe('normalizeHref', () => {
  it('strips the query string', () => {
    expect(normalizeHref('/pricing?view=grid')).toBe('/pricing')
  })

  it('drops trailing slashes but keeps the bare root', () => {
    expect(normalizeHref('/pricing/')).toBe('/pricing')
    expect(normalizeHref('/dashboard/usage/')).toBe('/dashboard/usage')
    expect(normalizeHref('/')).toBe('/')
  })
})

describe('isTopNavLinkActive', () => {
  it('matches the destination exactly', () => {
    expect(isTopNavLinkActive('/pricing', '/pricing')).toBe(true)
    expect(isTopNavLinkActive('/dashboard', '/dashboard')).toBe(true)
  })

  it('keeps a parent route highlighted while a child page is open', () => {
    expect(isTopNavLinkActive('/dashboard/overview', '/dashboard')).toBe(true)
    expect(isTopNavLinkActive('/dashboard/usage/logs', '/dashboard')).toBe(true)
  })

  it('only lights the root link on the exact root path', () => {
    expect(isTopNavLinkActive('/', '/')).toBe(true)
    expect(isTopNavLinkActive('/dashboard', '/')).toBe(false)
    expect(isTopNavLinkActive('/anything-else', '/')).toBe(false)
  })

  it('does not light a sibling that merely shares a prefix', () => {
    expect(isTopNavLinkActive('/pricingx', '/pricing')).toBe(false)
    expect(isTopNavLinkActive('/pricing-extra', '/pricing')).toBe(false)
  })

  it('ignores query strings and trailing slashes', () => {
    expect(isTopNavLinkActive('/pricing?view=grid', '/pricing')).toBe(true)
    expect(isTopNavLinkActive('/pricing/', '/pricing')).toBe(true)
  })

  it('leaves unrelated destinations unlit', () => {
    expect(isTopNavLinkActive('/pricing', '/rankings')).toBe(false)
    expect(isTopNavLinkActive('/rankings', '/pricing')).toBe(false)
  })
})
