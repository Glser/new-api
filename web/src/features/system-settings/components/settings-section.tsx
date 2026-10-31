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
import { useState } from 'react'

import { cn } from '@/lib/utils'

import {
  SettingsSectionChromeProvider,
  useSuppressSettingsSectionHeader,
} from './settings-page-context'

type SettingsSectionProps = {
  title: string
  titleProps?: React.HTMLAttributes<HTMLHeadingElement>
  children: React.ReactNode
  className?: string
}

export function SettingsSection({
  title,
  titleProps,
  children,
  className,
}: SettingsSectionProps) {
  const suppressHeader = useSuppressSettingsSectionHeader()
  const [actionsContainer, setActionsContainer] =
    useState<HTMLDivElement | null>(null)
  const [statusContainer, setStatusContainer] =
    useState<HTMLSpanElement | null>(null)
  const showHeader = !suppressHeader

  const content = (
    <section
      className={cn(
        'flex flex-col gap-4',
        showHeader && 'bg-card rounded-xl border p-3 sm:p-4',
        className
      )}
    >
      {showHeader ? (
        <div className='flex flex-wrap items-center justify-between gap-2'>
          <span className='inline-flex min-w-0 items-center gap-2'>
            <h3
              {...titleProps}
              className={cn('text-base font-semibold', titleProps?.className)}
            >
              {title}
            </h3>
            <span
              ref={setStatusContainer}
              className='inline-flex min-w-0 shrink-0 items-center'
            />
          </span>
          <div
            ref={setActionsContainer}
            className='flex flex-wrap items-center justify-end gap-2'
          />
        </div>
      ) : null}
      {children}
    </section>
  )

  if (!showHeader) return content

  return (
    <SettingsSectionChromeProvider
      actionsContainer={actionsContainer}
      statusContainer={statusContainer}
    >
      {content}
    </SettingsSectionChromeProvider>
  )
}
