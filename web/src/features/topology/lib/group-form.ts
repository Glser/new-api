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
import { z } from 'zod'

type Translate = (key: string) => string

export function createGroupFormSchema(t: Translate) {
  return z.object({
    name: z
      .string()
      .trim()
      .min(1, t('Group is required'))
      .refine(
        (name) => !/[,\r\n]/.test(name),
        t('Group names cannot contain commas or line breaks.')
      )
      .refine(
        (name) => name !== 'auto',
        t('The group name "auto" is reserved for automatic routing.')
      ),
    ratio: z.number().finite().min(0, t('Value must be at least 0')),
    topupRatio: z
      .string()
      .trim()
      .refine(
        (value) =>
          value === '' ||
          (Number.isFinite(Number(value)) && Number(value) >= 0),
        t('Value must be at least 0')
      ),
    selectable: z.boolean(),
    description: z.string().trim(),
  })
}

export type CreateGroupValues = z.infer<
  ReturnType<typeof createGroupFormSchema>
>

export const defaultGroupValues: CreateGroupValues = {
  name: '',
  ratio: 1,
  topupRatio: '',
  selectable: true,
  description: '',
}
