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
import { cn } from '@/lib/utils'

const IDENTITY_COLUMNS = new Set(['model_name', 'name'])

export const MODELS_TABLE_CLASS_NAME =
  '@container/models [&_[data-slot=table]]:min-w-[64rem] [&_[data-slot=table]]:table-auto [&_[data-slot=table]_thead]:bg-(--table-header) [&_[data-slot=table]_th]:bg-(--table-header) [&_[data-slot=table]_th]:h-10 [&_[data-slot=table]_th]:px-3 [&_[data-slot=table]_th]:text-xs [&_[data-slot=table]_td]:px-3 [&_[data-slot=table]_td]:text-xs @min-[48rem]/models:[&_[data-slot=table]_td]:text-sm @min-[48rem]/models:[&_[data-slot=table]_th]:text-sm'

export function modelsTableColumnClassName(
  columnId: string,
  kind: 'header' | 'cell'
) {
  if (IDENTITY_COLUMNS.has(columnId)) {
    const align = kind === 'header' ? 'text-left' : 'py-2.5 text-left'
    if (columnId === 'model_name') {
      // Match the icon (size-6) + gap-2.5 in the model cell so the title
      // lines up with the model name rather than the icon.
      return cn(
        align,
        'max-w-60 whitespace-normal',
        kind === 'header' && '[&>div]:pl-[2.125rem]'
      )
    }
    return align
  }
  if (kind === 'header') {
    return 'text-center [&>div]:mx-auto [&>div]:justify-center'
  }
  return 'py-2.5 text-center [&>*]:mx-auto [&>div]:justify-center'
}
