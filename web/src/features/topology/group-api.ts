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
import { t } from 'i18next'
import { z } from 'zod'

import {
  getSystemOptions,
  updateSystemOption,
} from '@/features/system-settings/api'
import { requireServerSuccess } from '@/lib/server-error-message'

import { createGroupFormSchema, type CreateGroupValues } from './lib/group-form'

export class TopologyGroupExistsError extends Error {
  constructor(name: string) {
    super(t('Duplicate group names: {{names}}', { names: name }))
    this.name = 'TopologyGroupExistsError'
  }
}

const ratioMapSchema = z.record(z.string(), z.number().finite().nonnegative())
const usableMapSchema = z.record(z.string(), z.string())

async function getGroupSettings() {
  const options = requireServerSuccess(await getSystemOptions()).data
  const optionMap = new Map(options.map((option) => [option.key, option.value]))
  const readOption = (key: string): unknown => {
    const raw = optionMap.get(key)
    try {
      if (raw === undefined) throw new Error('Missing group setting')
      return JSON.parse(raw)
    } catch {
      throw new Error(t('Failed to load group settings'))
    }
  }

  const ratioResult = ratioMapSchema.safeParse(readOption('GroupRatio'))
  const topupResult = ratioMapSchema.safeParse(readOption('TopupGroupRatio'))
  const usableResult = usableMapSchema.safeParse(readOption('UserUsableGroups'))
  if (!ratioResult.success || !topupResult.success || !usableResult.success) {
    throw new Error(t('Failed to load group settings'))
  }
  return {
    optionMap,
    ratios: ratioResult.data,
    topupRatios: topupResult.data,
    usableGroups: usableResult.data,
  }
}

export async function getTopologyGroup(
  name: string
): Promise<CreateGroupValues> {
  const settings = await getGroupSettings()
  return {
    name,
    ratio: settings.ratios[name] ?? 1,
    topupRatio: Object.hasOwn(settings.topupRatios, name)
      ? String(settings.topupRatios[name])
      : '',
    selectable: Object.hasOwn(settings.usableGroups, name),
    description: settings.usableGroups[name] ?? '',
  }
}

async function saveTopologyGroup(input: CreateGroupValues, groupName?: string) {
  // Group names are referenced by channels, tokens, and users. Editing keeps
  // the original name rather than attempting an incomplete rename.
  const values = createGroupFormSchema(t).parse({
    ...input,
    name: groupName ?? input.name,
  })
  // Always merge into freshly fetched maps so unrelated groups are preserved.
  const { optionMap, ratios, topupRatios, usableGroups } =
    await getGroupSettings()
  if (groupName === undefined && Object.hasOwn(ratios, values.name)) {
    throw new TopologyGroupExistsError(values.name)
  }

  if (values.topupRatio === '') {
    delete topupRatios[values.name]
  } else {
    topupRatios[values.name] = Number(values.topupRatio)
  }
  if (values.selectable) {
    usableGroups[values.name] = values.description
  } else {
    delete usableGroups[values.name]
  }

  const updates = [
    { key: 'TopupGroupRatio', value: JSON.stringify(topupRatios) },
    { key: 'UserUsableGroups', value: JSON.stringify(usableGroups) },
    {
      key: 'GroupRatio',
      value: JSON.stringify({ ...ratios, [values.name]: values.ratio }),
    },
  ]
  // Register the group last. A failed earlier update can be retried without
  // treating the unfinished group as an existing one.
  for (const update of updates) {
    if (update.value === optionMap.get(update.key)) continue
    requireServerSuccess(await updateSystemOption(update))
  }
  return values
}

export async function createTopologyGroup(input: CreateGroupValues) {
  return saveTopologyGroup(input)
}

export async function updateTopologyGroup(
  name: string,
  input: CreateGroupValues
) {
  return saveTopologyGroup(input, name)
}
