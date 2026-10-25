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
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

function ShineAction(props: {
  to: '/keys' | '/pricing' | '/playground'
  children: ReactNode
  solid?: boolean
}) {
  return (
    <Button
      variant={props.solid ? 'default' : 'outline'}
      size='default'
      className={cn(
        'relative h-9 overflow-hidden px-2.5 text-xs shadow-none transition-all duration-300 @min-[48rem]/console:px-3 @min-[48rem]/console:text-sm',
        'hover:-translate-y-px active:translate-y-px',
        props.solid &&
          'bg-foreground text-background hover:bg-foreground [a]:hover:bg-foreground'
      )}
      render={<Link to={props.to} />}
    >
      <span
        aria-hidden
        className={cn(
          'pointer-events-none absolute inset-0 z-[1] -translate-x-full bg-gradient-to-r from-transparent to-transparent transition-transform duration-700 ease-out group-hover/button:translate-x-full',
          props.solid ? 'via-white/25' : 'via-foreground/5'
        )}
      />
      {props.children}
    </Button>
  )
}

export function UserConsoleStart() {
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
