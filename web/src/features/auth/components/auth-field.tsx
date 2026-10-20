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
import type { LucideIcon } from 'lucide-react'
import type { ComponentProps, ReactNode } from 'react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export const AUTH_FIELD_SHELL =
  'group relative flex items-center overflow-hidden rounded-xl border border-border/70 bg-transparent shadow-2xs transition-all duration-200 focus-within:border-foreground/40 focus-within:ring-3 focus-within:ring-foreground/8 hover:border-foreground/25'

export const AUTH_FIELD_INPUT =
  'h-11 min-w-0 flex-1 rounded-none border-0 bg-transparent px-0 pr-3.5 text-sm font-medium shadow-none focus-visible:border-0 focus-visible:ring-0 dark:bg-transparent'

export function AuthIconField(props: {
  icon: LucideIcon
  children: ReactNode
  className?: string
}) {
  const Icon = props.icon
  return (
    <div data-slot='auth-field' className={cn(AUTH_FIELD_SHELL, props.className)}>
      <span className='pointer-events-none flex size-11 shrink-0 items-center justify-center text-muted-foreground transition-colors group-focus-within:text-foreground'>
        <Icon className='size-4.5' aria-hidden />
      </span>
      {props.children}
    </div>
  )
}

export function AuthSubmitButton({
  className,
  children,
  ...props
}: ComponentProps<typeof Button>) {
  return (
    <Button
      className={cn(
        'group relative h-11 w-full justify-center gap-2 overflow-hidden rounded-xl bg-foreground text-sm font-semibold text-background shadow-[0_1px_2px_rgba(0,0,0,0.1),0_0_0_1px_rgba(0,0,0,0.08)] transition-all duration-300 hover:-translate-y-px hover:shadow-[0_6px_18px_rgba(0,0,0,0.18)] active:translate-y-px dark:shadow-[0_1px_2px_rgba(0,0,0,0.5),0_0_0_1px_rgba(255,255,255,0.15)] dark:hover:shadow-[0_6px_20px_rgba(255,255,255,0.12)]',
        className
      )}
      {...props}
    >
      <span
        aria-hidden='true'
        className='pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 ease-out group-hover:translate-x-full dark:via-black/20'
      />
      <span className='relative z-1 flex items-center justify-center gap-2'>
        {children}
      </span>
    </Button>
  )
}
