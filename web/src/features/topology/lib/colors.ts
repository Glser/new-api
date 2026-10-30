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

const PALETTE = [
  '#5b7cfa',
  '#8b5cf6',
  '#10b981',
  '#ec4899',
  '#06b6d4',
  '#f59e0b',
  '#6366f1',
  '#14b8a6',
]

export function topologyColor(key: string) {
  let hash = 0
  for (const char of key) {
    hash = (hash * 33 + char.charCodeAt(0)) >>> 0
  }
  return PALETTE[hash % PALETTE.length]
}

export function topologyColorAlpha(color: string, alpha: number) {
  const value = color.replace('#', '')
  const red = Number.parseInt(value.slice(0, 2), 16)
  const green = Number.parseInt(value.slice(2, 4), 16)
  const blue = Number.parseInt(value.slice(4, 6), 16)
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`
}
