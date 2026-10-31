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
import { isHttpUrl } from '@/lib/content-format'

export function splitHttpUrlList(value: string): string[] {
  return value
    .split(/[,，]/)
    .map((link) => link.trim())
    .filter(Boolean)
}

export function isValidHttpUrl(value: string): boolean {
  return (
    /^https?:\/\//i.test(value) && !/[\s\\]/.test(value) && isHttpUrl(value)
  )
}

export function isValidHttpUrlList(value: string): boolean {
  if (value.trim() === '') return true
  const links = splitHttpUrlList(value)
  return links.length > 0 && links.every(isValidHttpUrl)
}
