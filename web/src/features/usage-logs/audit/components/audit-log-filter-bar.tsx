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
import type { Table } from '@tanstack/react-table'
import type { KeyboardEvent } from 'react'
import { useTranslation } from 'react-i18next'

import { DateRangePickerButton } from '@/components/date-range-picker'
import { Combobox } from '@/components/ui/combobox'

import {
  LogsFilterField,
  LogsFilterInput,
  LogsFilterToolbar,
} from '../../components/logs-filter-toolbar'
import type { AuditFilters, AuditLog } from '../api'

function AuditFilterCombobox(props: {
  label: string
  value: string
  options: { value: string; label: string; disabled?: boolean }[]
  onChange: (value: string) => void
}) {
  return (
    <LogsFilterField>
      <Combobox
        options={props.options.filter(
          (option) => option.value !== 'all' && option.value !== ''
        )}
        fitContentWidth
        aria-label={props.label}
        placeholder={props.label}
        className='h-8 min-w-0 text-sm leading-5'
        value={props.value === 'all' ? '' : props.value}
        onValueChange={(value) => props.onChange(value || 'all')}
      />
    </LogsFilterField>
  )
}

export function AuditLogFilterBar(props: {
  table: Table<AuditLog>
  filters: AuditFilters
  onChange: (patch: Partial<AuditFilters>) => void
  scope: 'all' | 'self'
  accessOnly?: boolean
  tokenScope: string
  currentTokenRef?: string
  onTokenScopeChange: (value: string) => void
  isFetching: boolean
  onSearch: () => void
  onReset: () => void
}) {
  const { t } = useTranslation()
  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') props.onSearch()
  }
  const dateFilter = (
    <DateRangePickerButton
      start={
        props.filters.start_timestamp === undefined
          ? undefined
          : new Date(props.filters.start_timestamp * 1000)
      }
      end={
        props.filters.end_timestamp === undefined
          ? undefined
          : new Date(props.filters.end_timestamp * 1000)
      }
      showTime
      disableFuture
      align='start'
      onApply={({ start, end }) =>
        props.onChange({
          start_timestamp: Math.floor(start.getTime() / 1000),
          end_timestamp: Math.floor(end.getTime() / 1000),
        })
      }
    />
  )
  const mainFilters = (
    <>
      <AuditFilterCombobox
        label={t('Result')}
        value={props.filters.success ?? 'all'}
        options={[
          { value: 'true', label: t('Success') },
          { value: 'false', label: t('Failed') },
        ]}
        onChange={(value) =>
          props.onChange({ success: value === 'all' ? undefined : value })
        }
      />
      {props.accessOnly ? (
        <AuditFilterCombobox
          label={t('Token scope')}
          value={props.tokenScope}
          options={[
            {
              value: 'current',
              label: t('Current token'),
              disabled: !props.currentTokenRef,
            },
            {
              value: 'historical',
              label: t('Historical tokens'),
              disabled: props.currentTokenRef === undefined,
            },
          ]}
          onChange={props.onTokenScopeChange}
        />
      ) : (
        <AuditFilterCombobox
          label={t('Category')}
          value={props.filters.category ?? 'all'}
          options={[
            { value: 'login', label: t('Login') },
            { value: 'security', label: t('Account security') },
            { value: 'operation', label: t('Operation audit') },
            { value: 'access_token', label: t('Access Token') },
          ]}
          onChange={(value) =>
            props.onChange({ category: value === 'all' ? undefined : value })
          }
        />
      )}
    </>
  )
  const advancedFilters =
    !props.accessOnly || props.scope === 'all' ? (
      <>
        {!props.accessOnly && (
          <>
            <LogsFilterField>
              <LogsFilterInput
                aria-label={t('Token identifier')}
                placeholder={t('Token identifier')}
                value={props.filters.token_ref ?? ''}
                onChange={(event) =>
                  props.onChange({ token_ref: event.target.value || undefined })
                }
                onKeyDown={handleKeyDown}
              />
            </LogsFilterField>
            <LogsFilterField>
              <LogsFilterInput
                aria-label={t('Request ID')}
                placeholder={t('Request ID')}
                value={props.filters.request_id ?? ''}
                onChange={(event) =>
                  props.onChange({
                    request_id: event.target.value || undefined,
                  })
                }
                onKeyDown={handleKeyDown}
              />
            </LogsFilterField>
          </>
        )}
        {props.scope === 'all' && (
          <LogsFilterField>
            <LogsFilterInput
              aria-label={t('Username')}
              placeholder={t('Username')}
              value={props.filters.username ?? ''}
              onChange={(event) =>
                props.onChange({ username: event.target.value || undefined })
              }
              onKeyDown={handleKeyDown}
            />
          </LogsFilterField>
        )}
      </>
    ) : undefined
  const advancedCount = [
    props.filters.token_ref,
    props.filters.request_id,
    props.filters.username,
  ].filter(Boolean).length
  const filterCount =
    advancedCount +
    [
      props.filters.success,
      props.filters.category,
      props.tokenScope !== 'all',
    ].filter(Boolean).length
  const hasFilters = filterCount > 0

  return (
    <LogsFilterToolbar
      table={props.table}
      compactMobile
      showViewOptions={false}
      startFilters={dateFilter}
      primaryFilters={
        <>
          {mainFilters}
          {advancedFilters}
        </>
      }
      mobilePinnedFilters={dateFilter}
      mobileFilters={
        <>
          {mainFilters}
          {advancedFilters}
        </>
      }
      mobileFilterCount={filterCount}
      advancedFilterCount={advancedCount}
      hasActiveFilters={hasFilters}
      hasAdvancedActiveFilters={advancedCount > 0}
      searchLoading={props.isFetching}
      onSearch={props.onSearch}
      onReset={props.onReset}
    />
  )
}
