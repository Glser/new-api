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
import type { RequestExample } from '../types'

export const API_KEY_ENV = 'NEW_API_KEY'
const MODEL_PLACEHOLDER = '{{model}}'

/** Replaces every `{{model}}` occurrence inside string values. */
function fillModel(value: unknown, modelName: string): unknown {
  if (typeof value === 'string') {
    return value.replaceAll(MODEL_PLACEHOLDER, modelName)
  }
  if (Array.isArray(value)) {
    return value.map((item) => fillModel(item, modelName))
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        fillModel(item, modelName),
      ])
    )
  }
  return value
}

/** Escapes a value for a single-quoted shell string. */
function shellSingleQuote(value: string): string {
  return value.replaceAll("'", `'\\''`)
}

export function buildCurlSample(params: {
  example: RequestExample
  url: string
  modelName: string
}): string {
  const { example, modelName } = params
  const headers: string[] = []
  let url = params.url

  if (example.auth === 'query') {
    url += `${url.includes('?') ? '&' : '?'}key=$${API_KEY_ENV}`
  } else if (example.auth === 'x-api-key') {
    headers.push(`x-api-key: $${API_KEY_ENV}`)
  } else {
    headers.push(`Authorization: Bearer $${API_KEY_ENV}`)
  }
  for (const [name, value] of Object.entries(example.headers ?? {})) {
    headers.push(`${name}: ${value.replaceAll(/["\\$`]/g, '\\$&')}`)
  }
  headers.push('Content-Type: application/json')

  const body = JSON.stringify(fillModel(example.body, modelName), null, 2)
  return [
    `curl "${url}" \\`,
    ...headers.map((header) => `  -H "${header}" \\`),
    `  -d '${shellSingleQuote(body).replaceAll('\n', '\n     ')}'`,
  ].join('\n')
}
