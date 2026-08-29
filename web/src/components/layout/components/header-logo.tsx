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
import { cn } from '@/lib/utils'

import { BrandImage } from './brand-image'

interface HeaderLogoProps {
  src: string
  alt?: string
  loading: boolean
  logoLoaded: boolean
  className?: string
}

/**
 * Logo component for header with loading state
 * Shows image only when fully loaded for smooth UX
 */
export function HeaderLogo(props: HeaderLogoProps) {
  return (
    <BrandImage
      src={props.src}
      alt={props.alt ?? 'logo'}
      className={cn('h-7 w-16', props.className)}
      imageClassName={cn(
        'transition-opacity duration-200',
        !props.loading && props.logoLoaded ? 'opacity-100' : 'opacity-0'
      )}
    />
  )
}
