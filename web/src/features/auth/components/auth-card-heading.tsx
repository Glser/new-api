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
import { Link } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { Skeleton } from '@/components/ui/skeleton'
import { useSystemConfig } from '@/hooks/use-system-config'
import { cn } from '@/lib/utils'

export function AuthCardHeading(props: {
  title: ReactNode
  children?: ReactNode
  className?: string
}) {
  const { t } = useTranslation()
  const { logo, loading, systemName } = useSystemConfig()

  return (
    <div className={cn('grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-3 gap-y-2 text-left', props.className)}>
      <Link
          to='/'
          aria-label={systemName || t('Logo')}
          className='relative size-9 shrink-0 self-center transition-opacity hover:opacity-85 sm:size-10'
        >
          {loading && <Skeleton className='absolute inset-0 rounded-full' />}
          {!loading && logo === '/logo.png' && (
            <>
              <img
                src='/logo.png'
                alt=''
                className='block size-full rounded-full object-contain dark:hidden'
              />
              <img
                src='/logo-dark.png'
                alt=''
                className='hidden size-full rounded-full object-contain dark:block'
              />
            </>
          )}
          {!loading && logo && logo !== '/logo.png' && (
            <img
              src={logo}
              alt=''
              className='size-full rounded-full object-cover'
            />
          )}
        </Link>
        <h2 className='text-2xl font-bold tracking-tight text-foreground sm:text-3xl'>
          {props.title}
        </h2>
      {props.children ? (
        <div className='col-span-2 space-y-2'>{props.children}</div>
      ) : null}
    </div>
  )
}
