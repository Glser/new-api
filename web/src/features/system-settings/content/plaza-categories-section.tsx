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
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Boxes,
  ChevronDown,
  ChevronUp,
  Plus,
  RotateCcw,
  Trash2,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
} from '@/components/ui/select'
import {
  getPlazaCategoryIcon,
  PLAZA_CATEGORY_ICON_NAMES,
} from '@/features/plaza/lib/category-icons'
import type { PlazaCategoryConfig } from '@/features/pricing/types'
import { requireServerSuccess } from '@/lib/server-error-message'

import { getDefaultPlazaCategories } from '../api'
import { SettingsPageFormActions } from '../components/settings-page-context'
import { SettingsSection } from '../components/settings-section'
import { useUpdateOption } from '../hooks/use-update-option'

const OPTION_KEY = 'model_plaza_setting.categories'
const OTHER_KEY = 'other'
// Same rules as the backend.
const KEY_PATTERN = /^[a-z0-9][a-z0-9_-]{0,31}$/
const MAX_CATEGORIES = 30
const MAX_LABEL_LENGTH = 32

type Row = PlazaCategoryConfig & {
  /** React key only; never saved. */
  rowId: number
  /** Rows loaded from saved settings keep their key so models stay attached. */
  locked: boolean
}

let rowSeq = 0
const nextRowId = () => ++rowSeq

function toRows(categories: PlazaCategoryConfig[]): Row[] {
  return categories.map((category) => ({
    rowId: nextRowId(),
    key: category.key,
    label: category.label,
    icon: category.icon ?? '',
    locked: true,
  }))
}

function serialize(rows: PlazaCategoryConfig[]): string {
  return JSON.stringify(
    rows.map((row) => ({
      key: row.key.trim(),
      label: row.label.trim(),
      ...(row.icon ? { icon: row.icon } : {}),
    }))
  )
}

function parseSaved(raw: string): PlazaCategoryConfig[] | null {
  if (!raw.trim()) return null
  try {
    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as PlazaCategoryConfig[]) : null
  } catch {
    return null
  }
}

function IconSelect(props: {
  value: string
  onChange: (value: string) => void
}) {
  const items = PLAZA_CATEGORY_ICON_NAMES.map((name) => ({
    value: name,
    label: name,
  }))
  const Icon = getPlazaCategoryIcon(props.value)
  return (
    <Select
      items={items}
      value={props.value || 'Boxes'}
      onValueChange={(value) => value && props.onChange(value)}
    >
      <SelectTrigger className='w-16 shrink-0' aria-label='Icon'>
        <Icon className='size-4' />
      </SelectTrigger>
      <SelectContent alignItemWithTrigger={false}>
        <SelectGroup>
          {PLAZA_CATEGORY_ICON_NAMES.map((name) => {
            const ItemIcon = getPlazaCategoryIcon(name)
            return (
              <SelectItem key={name} value={name}>
                <span className='flex items-center gap-2'>
                  <ItemIcon className='size-4' />
                  {name}
                </span>
              </SelectItem>
            )
          })}
        </SelectGroup>
      </SelectContent>
    </Select>
  )
}

interface PlazaCategoriesSectionProps {
  data?: string
}

export function PlazaCategoriesSection({ data }: PlazaCategoriesSectionProps) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const updateOption = useUpdateOption()

  const { data: defaults } = useQuery({
    queryKey: ['plaza-category-defaults'],
    queryFn: async () =>
      requireServerSuccess(await getDefaultPlazaCategories()).data ?? [],
    staleTime: Infinity,
  })

  const saved = useMemo(() => parseSaved(data ?? ''), [data])
  const buildRows = useCallback(
    () => toRows(saved ?? defaults ?? []),
    [defaults, saved]
  )
  const [rows, setRows] = useState<Row[]>([])

  useEffect(() => {
    setRows(buildRows())
  }, [buildRows])

  const isDirty = serialize(rows) !== serialize(buildRows())
  const matchesDefaults =
    defaults !== undefined && serialize(rows) === serialize(defaults)

  const updateRow = (index: number, patch: Partial<Row>) => {
    setRows((prev) =>
      prev.map((row, i) => (i === index ? { ...row, ...patch } : row))
    )
  }

  const moveRow = (index: number, offset: -1 | 1) => {
    setRows((prev) => {
      const target = index + offset
      if (target < 0 || target >= prev.length) return prev
      const next = [...prev]
      ;[next[index], next[target]] = [next[target], next[index]]
      return next
    })
  }

  const removeRow = (index: number) => {
    setRows((prev) => prev.filter((_, i) => i !== index))
  }

  const addRow = () => {
    setRows((prev) => [
      ...prev,
      { rowId: nextRowId(), key: '', label: '', icon: 'Boxes', locked: false },
    ])
  }

  const validate = (): string | null => {
    if (rows.length > MAX_CATEGORIES) {
      return t('At most {{count}} categories.', { count: MAX_CATEGORIES })
    }
    const seen = new Set<string>()
    for (const row of rows) {
      const key = row.key.trim()
      if (!KEY_PATTERN.test(key)) {
        return t(
          'Category key "{{key}}" may only use lowercase letters, digits, - and _ (up to 32 characters).',
          { key }
        )
      }
      if (key === OTHER_KEY) {
        return t('"other" is the built-in fallback category.')
      }
      if (seen.has(key)) {
        return t('Duplicate category key: {{key}}', { key })
      }
      seen.add(key)
      const label = row.label.trim()
      if (!label) {
        return t('Category {{key}} needs a name.', { key })
      }
      if (label.length > MAX_LABEL_LENGTH) {
        return t('Category names can be at most {{count}} characters.', {
          count: MAX_LABEL_LENGTH,
        })
      }
    }
    return null
  }

  const onSave = async () => {
    const error = validate()
    if (error) {
      toast.error(error)
      return
    }
    // Save an empty value while the list equals the built-in one, so future
    // built-in changes still reach this site.
    const value = matchesDefaults ? '' : serialize(rows)
    const result = await updateOption.mutateAsync({ key: OPTION_KEY, value })
    if (result.success) {
      queryClient.invalidateQueries({ queryKey: ['pricing'] })
    }
  }

  return (
    <SettingsSection title={t('Model Plaza Categories')} className='min-w-0'>
      <p className='text-muted-foreground text-sm'>
        {t(
          'Sections shown in the model plaza, in this order. Set a model category in model management; models without one are placed by their endpoints. Models whose category is missing here go to Other.'
        )}
      </p>

      {!defaults ? (
        <p className='text-muted-foreground text-sm'>{t('Loading...')}</p>
      ) : (
        <div className='flex flex-col gap-2'>
          <div className='text-muted-foreground grid grid-cols-[4rem_minmax(0,10rem)_minmax(0,1fr)_auto] gap-2 px-1 text-xs'>
            <span>{t('Icon')}</span>
            <span>{t('Key')}</span>
            <span>{t('Name')}</span>
            <span className='w-[6.5rem]' />
          </div>

          {rows.map((row, index) => (
            <div
              key={row.rowId}
              className='grid grid-cols-[4rem_minmax(0,10rem)_minmax(0,1fr)_auto] items-center gap-2'
            >
              <IconSelect
                value={row.icon ?? ''}
                onChange={(icon) => updateRow(index, { icon })}
              />
              <Input
                value={row.key}
                onChange={(event) =>
                  updateRow(index, { key: event.target.value })
                }
                disabled={row.locked}
                placeholder='audio'
                className='font-mono'
              />
              <Input
                value={row.label}
                onChange={(event) =>
                  updateRow(index, { label: event.target.value })
                }
                placeholder={t('Audio')}
              />
              <div className='flex items-center gap-0.5'>
                <Button
                  type='button'
                  variant='ghost'
                  size='icon-sm'
                  onClick={() => moveRow(index, -1)}
                  disabled={index === 0}
                  aria-label={t('Move up')}
                >
                  <ChevronUp />
                </Button>
                <Button
                  type='button'
                  variant='ghost'
                  size='icon-sm'
                  onClick={() => moveRow(index, 1)}
                  disabled={index === rows.length - 1}
                  aria-label={t('Move down')}
                >
                  <ChevronDown />
                </Button>
                <Button
                  type='button'
                  variant='ghost'
                  size='icon-sm'
                  className='text-destructive hover:text-destructive'
                  onClick={() => removeRow(index)}
                  aria-label={t('Delete')}
                >
                  <Trash2 />
                </Button>
              </div>
            </div>
          ))}

          <div className='text-muted-foreground grid grid-cols-[4rem_minmax(0,10rem)_minmax(0,1fr)_auto] items-center gap-2 opacity-70'>
            <span className='flex h-9 w-16 items-center justify-center'>
              <Boxes className='size-4' />
            </span>
            <Input value={OTHER_KEY} disabled className='font-mono' />
            <Input value={t('Other')} disabled />
            <span className='w-[6.5rem] text-xs'>{t('Always last')}</span>
          </div>

          <div className='flex flex-wrap items-center gap-2 pt-1'>
            <Button
              type='button'
              variant='outline'
              size='sm'
              onClick={addRow}
              disabled={rows.length >= MAX_CATEGORIES}
            >
              <Plus data-icon='inline-start' />
              {t('Add category')}
            </Button>
            <Button
              type='button'
              variant='outline'
              size='sm'
              onClick={() => setRows(toRows(defaults))}
              disabled={matchesDefaults}
            >
              <RotateCcw data-icon='inline-start' />
              {t('Restore default')}
            </Button>
          </div>
          <p className='text-muted-foreground text-xs'>
            {t(
              'Keys of saved categories cannot be changed, because models refer to them. Delete the row and add a new one instead.'
            )}
          </p>
        </div>
      )}

      <SettingsPageFormActions
        onSave={() => void onSave()}
        isSaving={updateOption.isPending}
        isSaveDisabled={!defaults || !isDirty}
        onReset={() => setRows(buildRows())}
        isResetDisabled={!isDirty}
      />
    </SettingsSection>
  )
}
