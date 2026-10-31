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
import { Popover as PopoverPrimitive } from '@base-ui/react/popover'
import * as React from 'react'

import { cn } from '@/lib/utils'

const PopoverTriggerContext = React.createContext<React.RefObject<
  HTMLElement | null
> | null>(null)

function Popover({
  onOpenChange,
  ...props
}: PopoverPrimitive.Root.Props) {
  const triggerRef = React.useRef<HTMLElement | null>(null)

  return (
    <PopoverTriggerContext.Provider value={triggerRef}>
      <PopoverPrimitive.Root
        data-slot='popover'
        onOpenChange={(open, eventDetails) => {
          if (isPopoverDismissFromTrigger(eventDetails, triggerRef.current)) {
            eventDetails.cancel()
            return
          }
          onOpenChange?.(open, eventDetails)
        }}
        {...props}
      />
    </PopoverTriggerContext.Provider>
  )
}

const PopoverTrigger = React.forwardRef<
  HTMLElement,
  PopoverPrimitive.Trigger.Props
>(function PopoverTrigger(props, ref) {
  const triggerRef = React.useContext(PopoverTriggerContext)
  const setTriggerRef = React.useCallback(
    (element: HTMLElement | null) => {
      if (triggerRef) triggerRef.current = element
      if (typeof ref === 'function') {
        ref(element)
        return
      }
      if (ref) ref.current = element
    },
    [ref, triggerRef]
  )

  return (
    <PopoverPrimitive.Trigger
      data-slot='popover-trigger'
      ref={setTriggerRef}
      {...props}
    />
  )
})

function isPopoverDismissFromTrigger(
  eventDetails: {
    reason: string
    event: Event
    cancel: () => void
  },
  trigger: Element | null
): boolean {
  if (!trigger) {
    return false
  }
  if (
    eventDetails.reason !== 'outside-press' &&
    eventDetails.reason !== 'focus-out'
  ) {
    return false
  }

  const event = eventDetails.event
  if (event.target instanceof Node && trigger.contains(event.target)) {
    return true
  }
  if (
    event instanceof FocusEvent &&
    event.relatedTarget instanceof Node &&
    trigger.contains(event.relatedTarget)
  ) {
    return true
  }
  if (
    typeof event.composedPath === 'function' &&
    event.composedPath().includes(trigger)
  ) {
    return true
  }
  return false
}

function PopoverContent({
  className,
  align = 'center',
  alignOffset = 0,
  side = 'bottom',
  sideOffset = 4,
  collisionPadding,
  collisionBoundary,
  collisionAvoidance,
  anchor,
  animate = true,
  keepMounted = false,
  ...props
}: PopoverPrimitive.Popup.Props &
  Pick<
    PopoverPrimitive.Positioner.Props,
    | 'align'
    | 'alignOffset'
    | 'side'
    | 'sideOffset'
    | 'collisionPadding'
    | 'collisionBoundary'
    | 'collisionAvoidance'
    | 'anchor'
  > & {
    animate?: boolean
    keepMounted?: boolean
  }) {
  return (
    <PopoverPrimitive.Portal keepMounted={keepMounted}>
      <PopoverPrimitive.Positioner
        align={align}
        alignOffset={alignOffset}
        side={side}
        sideOffset={sideOffset}
        collisionPadding={collisionPadding}
        collisionBoundary={collisionBoundary}
        collisionAvoidance={collisionAvoidance}
        anchor={anchor}
        className='isolate z-50'
      >
        <PopoverPrimitive.Popup
          data-slot='popover-content'
          className={cn(
            'bg-popover text-popover-foreground ring-foreground/10 z-50 flex w-72 origin-(--transform-origin) flex-col gap-2.5 rounded-lg p-2.5 text-sm shadow-md ring-1 outline-hidden',
            animate &&
              'data-[side=bottom]:slide-in-from-top-2 data-[side=inline-end]:slide-in-from-left-2 data-[side=inline-start]:slide-in-from-right-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-open:animate-in data-open:fade-in-0 duration-100 data-closed:animate-none data-[instant]:animate-none',
            className
          )}
          {...props}
        />
      </PopoverPrimitive.Positioner>
    </PopoverPrimitive.Portal>
  )
}

function PopoverHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot='popover-header'
      className={cn('flex flex-col gap-0.5 text-sm', className)}
      {...props}
    />
  )
}

function PopoverTitle({ className, ...props }: PopoverPrimitive.Title.Props) {
  return (
    <PopoverPrimitive.Title
      data-slot='popover-title'
      className={cn('font-medium', className)}
      {...props}
    />
  )
}

function PopoverDescription({
  className,
  ...props
}: PopoverPrimitive.Description.Props) {
  return (
    <PopoverPrimitive.Description
      data-slot='popover-description'
      className={cn('text-muted-foreground', className)}
      {...props}
    />
  )
}

export {
  isPopoverDismissFromTrigger,
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
}
