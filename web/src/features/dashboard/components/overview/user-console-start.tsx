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
import { BrainCircuit, KeyRound, Palette } from 'lucide-react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { ShineButton } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { ConsoleDataScope } from '@/features/dashboard/lib'

function ShineAction(props: {
  to: '/keys' | '/pricing' | '/playground'
  children: ReactNode
  solid?: boolean
}) {
  return (
    <ShineButton
      variant={props.solid ? 'default' : 'outline'}
      size='default'
      className={
        props.solid
          ? 'h-9 bg-[oklch(0.24_0_0)] px-2.5 text-xs font-semibold text-white hover:bg-[oklch(0.30_0_0)] @min-[48rem]/console:px-3 @min-[48rem]/console:text-sm dark:bg-[oklch(0.90_0_0)] dark:text-neutral-950 dark:hover:bg-[oklch(0.84_0_0)] [a]:hover:bg-[oklch(0.30_0_0)] dark:[a]:hover:bg-[oklch(0.84_0_0)]'
          : 'h-9 px-2.5 text-xs @min-[48rem]/console:px-3 @min-[48rem]/console:text-sm'
      }
      render={<Link to={props.to} />}
    >
      {props.children}
    </ShineButton>
  )
}

export function UserConsoleStart(props: {
  showDataScope?: boolean
  dataScope?: ConsoleDataScope
  onDataScopeChange?: (value: ConsoleDataScope) => void
}) {
  const { t } = useTranslation()

  return (
    <div className='flex flex-wrap items-center justify-between gap-3'>
      <div className='flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1 pl-3 @min-[48rem]/console:gap-x-3 @min-[48rem]/console:pl-4'>
        <span className='text-sm font-semibold @min-[48rem]/console:text-base'>
          {t('Start the next creation')}
        </span>
        <span className='text-muted-foreground text-xs @min-[48rem]/console:text-sm'>
          {t('Chat, image, and video API calls')}
        </span>
      </div>
      <div className='flex w-full flex-wrap items-center justify-start gap-2 @min-[48rem]/console:w-auto @min-[48rem]/console:justify-end'>
        {props.showDataScope && props.dataScope && props.onDataScopeChange ? (
          <Tabs
            value={props.dataScope}
            onValueChange={(value) => {
              if (value === 'site' || value === 'self') {
                props.onDataScopeChange(value)
              }
            }}
            className='shrink-0'
          >
            <TabsList aria-label={t('Data scope')}>
              <TabsTrigger value='site' className='px-2.5 text-xs'>
                {t('Site-wide')}
              </TabsTrigger>
              <TabsTrigger value='self' className='px-2.5 text-xs'>
                {t('My data')}
              </TabsTrigger>
            </TabsList>
          </Tabs>
        ) : null}
        <ShineAction to='/keys'>
          <KeyRound data-icon='inline-start' />
          {t('API Key')}
        </ShineAction>
        <ShineAction to='/pricing'>
          <BrainCircuit data-icon='inline-start' />
          {t('Browse models')}
        </ShineAction>
        <ShineAction to='/playground' solid>
          <Palette data-icon='inline-start' />
          {t('Creative workbench')}
        </ShineAction>
      </div>
    </div>
  )
}
