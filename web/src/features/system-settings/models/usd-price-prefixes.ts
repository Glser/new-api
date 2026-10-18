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

/**
 * Helpers for the model square USD price prefix setting.
 *
 * Kept out of the settings card so the card file stays component-only, which
 * React Fast Refresh requires.
 */

/** Comma/newline separated input → deduped prefix list. */
export function parsePrefixList(value: string): string[] {
  return [
    ...new Set(
      (value ?? '')
        .split(/[,\n]/)
        .map((item) => item.trim())
        .filter((item) => item !== '')
    ),
  ]
}

/** Prefix list → the textarea's comma separated representation. */
export function formatPrefixList(
  prefixes: readonly string[] | undefined
): string {
  return (prefixes ?? []).join(', ')
}
