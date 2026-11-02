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

/** Same aurora rank palette as the console bar chart. */
const AURORA_RANK_COLORS_LIGHT = [
  '#8FCFC4',
  '#9FBFEA',
  '#B9A9E8',
  '#E5B6A7',
  '#8FC8D8',
  '#D2CC9A',
  '#A8B9E0',
  '#D6A9C2',
  '#A8D0A5',
  '#BDB8D0',
]

const AURORA_RANK_COLORS_DARK = [
  '#8CD8C7',
  '#9FC8F4',
  '#C0AEF2',
  '#E9B9AA',
  '#8BD0E1',
  '#D9D19C',
  '#AFC0EA',
  '#DCAAC5',
  '#A7D9A5',
  '#C2BCD8',
]

function getAuroraPalette(isDark = false) {
  return isDark ? AURORA_RANK_COLORS_DARK : AURORA_RANK_COLORS_LIGHT
}

function hashKey(key: string) {
  let hash = 2166136261
  for (const char of key) {
    hash ^= char.charCodeAt(0)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

export function topologyColor(key: string, isDark = false) {
  const palette = getAuroraPalette(isDark)
  return palette[hashKey(key) % palette.length]
}

export function topologyChannelColor(channelId: number, isDark = false) {
  const palette = getAuroraPalette(isDark)
  // Keep the last swatch for overflow, matching the console "Other" bar.
  const usable = palette.length > 1 ? palette.slice(0, -1) : palette
  return usable[(((Math.max(0, channelId) * 4) >>> 0) + 1) % usable.length]
}

export function topologyColorAlpha(color: string, alpha: number) {
  const value = color.replace('#', '')
  const red = Number.parseInt(value.slice(0, 2), 16)
  const green = Number.parseInt(value.slice(2, 4), 16)
  const blue = Number.parseInt(value.slice(4, 6), 16)
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`
}
