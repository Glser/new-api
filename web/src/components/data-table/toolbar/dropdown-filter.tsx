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
import type { Column } from '@tanstack/react-table'
import { useTranslation } from 'react-i18next'

import { Combobox } from '@/components/ui/combobox'
import { cn } from '@/lib/utils'

const ALL_VALUE = 'all'

type FilterOption = {
  label: string
  value: string
}

function getSelectedValue<TData, TValue>(
  column: Column<TData, TValue> | undefined,
  allValue: string
) {
  const filterValue = column?.getFilterValue()
  const selected = Array.isArray(filterValue) ? filterValue[0] : filterValue
  if (
    typeof selected !== 'string' ||
    selected === '' ||
    selected === allValue
  ) {
    return ''
  }
  return selected
}

function setColumnFilter<TData, TValue>(
  column: Column<TData, TValue> | undefined,
  value: string | null,
  allValue: string
) {
  if (!value || value === allValue) {
    column?.setFilterValue(undefined)
    return
  }
  column?.setFilterValue([value])
}

export function DataTableComboboxFilter<TData, TValue>(props: {
  column?: Column<TData, TValue>
  title: string
  options: FilterOption[]
  allValue?: string
  emptyText?: string
  className?: string
}) {
  const { t } = useTranslation()
  const allValue = props.allValue ?? ALL_VALUE
  const selectedValue = getSelectedValue(props.column, allValue)
  const options = props.options.filter(
    (option) => option.value !== allValue && option.value !== ''
  )

  return (
    <div className={cn('w-36 shrink-0', props.className)}>
      <Combobox
        options={options}
        fitContentWidth
        aria-label={props.title}
        emptyText={props.emptyText ?? t('No results found.')}
        placeholder={props.title}
        className='h-8 w-full min-w-0 text-sm leading-5'
        value={selectedValue}
        onValueChange={(value) =>
          setColumnFilter(props.column, value, allValue)
        }
      />
    </div>
  )
}
