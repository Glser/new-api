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
import {
  DEFAULT_FAVICON,
  DEFAULT_LOGO,
  LEGACY_DEFAULT_LOGO,
} from '@/lib/constants'

function resolveUrl(url: string): string {
  const base =
    typeof window === 'undefined' ? 'http://localhost/' : window.location.href
  return new URL(url, base).href
}

/** Whether a URL points to the bundled favicon, regardless of cache-busting query. */
function isBundledFaviconUrl(url: string): boolean {
  try {
    const base =
      typeof window === 'undefined' ? 'http://localhost/' : window.location.href
    const resolved = new URL(url, base)
    const current = new URL(base)
    return (
      resolved.origin === current.origin && resolved.pathname === '/favicon.png'
    )
  } catch {
    return false
  }
}

/** Whether a URL points at one of the bundled default brand assets. */
export function isDefaultLogoUrl(url: string): boolean {
  if (!url) return false

  try {
    const resolved = resolveUrl(url)
    return [DEFAULT_LOGO, LEGACY_DEFAULT_LOGO].some(
      (defaultLogo) => resolveUrl(defaultLogo) === resolved
    )
  } catch {
    return false
  }
}

export function applyFaviconToDom(url?: string | null) {
  if (typeof document === 'undefined') return
  try {
    const isDefaultFavicon =
      !url || isDefaultLogoUrl(url) || isBundledFaviconUrl(url)
    const faviconUrl = isDefaultFavicon ? DEFAULT_FAVICON : url
    const next = resolveUrl(faviconUrl)
    const existing =
      document.querySelectorAll<HTMLLinkElement>('link[rel~="icon"]')
    if (existing.length === 1 && existing[0].href === next) return
    const link = document.createElement('link')
    link.rel = 'icon'
    if (isDefaultFavicon) {
      link.type = 'image/png'
      link.setAttribute('sizes', '128x128')
    }
    link.href = faviconUrl
    existing.forEach((l) => l.remove())
    document.head.appendChild(link)
  } catch {
    // Ignore malformed URLs
  }
}
