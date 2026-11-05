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
import { Outlet } from '@tanstack/react-router'
import { motion, useReducedMotion } from 'motion/react'
import type { ReactNode } from 'react'

import { MOTION_TRANSITION, MOTION_VARIANTS } from '@/lib/motion'

interface PageTransitionProps {
  children: ReactNode
  className?: string
}

export function PageTransition(props: PageTransitionProps) {
  const shouldReduce = useReducedMotion()

  if (shouldReduce) {
    return <div className={props.className}>{props.children}</div>
  }

  return (
    <motion.div
      initial={MOTION_VARIANTS.pageEnter.initial}
      animate={MOTION_VARIANTS.pageEnter.animate}
      transition={MOTION_TRANSITION.default}
      className={props.className}
    >
      {props.children}
    </motion.div>
  )
}

export function AnimatedOutlet() {
  // Console pages are table-heavy. Remounting the outlet with a blur/slide
  // animation forces a full tree rebuild plus a CSS filter on the new page,
  // which is the main hitch when switching between models, channels, etc.
  return (
    <div className='flex min-h-0 flex-1 flex-col'>
      <Outlet />
    </div>
  )
}

interface FadeInProps {
  children: ReactNode
  className?: string
  delay?: number
}

export function FadeIn(props: FadeInProps) {
  const shouldReduce = useReducedMotion()

  if (shouldReduce) {
    return <div className={props.className}>{props.children}</div>
  }

  return (
    <motion.div
      initial={MOTION_VARIANTS.fadeIn.initial}
      animate={MOTION_VARIANTS.fadeIn.animate}
      transition={{
        ...MOTION_TRANSITION.default,
        delay: props.delay,
      }}
      className={props.className}
    >
      {props.children}
    </motion.div>
  )
}
