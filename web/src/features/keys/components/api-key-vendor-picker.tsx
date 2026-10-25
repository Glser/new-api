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
import { LayoutGrid, Store } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { PlazaFilterChip } from '@/features/plaza/components/filter-chip'
import { getLobeIcon } from '@/lib/lobe-icon'

import type { ApiKeyVendorOption } from '../lib/vendor-groups'

export function ApiKeyVendorPicker(props: {
  options: ApiKeyVendorOption[]
  value: string | null
  onChange: (value: string) => void
  loading: boolean
  failed: boolean
  onRetry: () => void
}) {
  const { t } = useTranslation()
  return (
    <div className='flex flex-col gap-2.5'>
      <span className='text-sm font-medium'>{t('Vendor')}</span>
      {props.loading && (
        <div role='status' className='flex gap-2'>
          <span className='sr-only'>{t('Loading...')}</span>
          <Skeleton className='h-[25px] w-24 rounded-full' />
          <Skeleton className='h-[25px] w-28 rounded-full' />
          <Skeleton className='h-[25px] w-24 rounded-full' />
        </div>
      )}
      {props.failed && (
        <div className='flex items-center justify-between gap-2'>
          <p className='text-muted-foreground text-xs'>
            {t('Unable to load vendors. You can still select a group.')}
          </p>
          <Button
            type='button'
            variant='ghost'
            size='sm'
            onClick={props.onRetry}
          >
            {t('Retry')}
          </Button>
        </div>
      )}
      {!props.loading && !props.failed && props.options.length === 0 && (
        <p className='text-muted-foreground text-xs'>{t('No vendors found')}</p>
      )}
      {!props.loading && !props.failed && props.options.length > 0 && (
        <div
          role='group'
          aria-label={t('Vendor')}
          className='flex flex-wrap gap-2'
        >
          <PlazaFilterChip
            option={{
              value: 'all',
              label: t('All Vendors'),
              icon: <LayoutGrid aria-hidden='true' />,
            }}
            active={props.value === 'all'}
            onClick={() => props.onChange('all')}
          />
          {props.options.map((option) => (
            <PlazaFilterChip
              key={option.value}
              option={{
                value: option.value,
                label: option.label,
                countLabel: `${option.groups.filter((group) => group.value !== 'auto').length} ${t('Groups')}`,
                icon: option.icon ? (
                  getLobeIcon(option.icon, 20)
                ) : (
                  <Store aria-hidden='true' />
                ),
              }}
              active={props.value === option.value}
              onClick={() => props.onChange(option.value)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
