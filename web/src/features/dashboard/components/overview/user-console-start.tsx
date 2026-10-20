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
import { Grid2x2, KeyRound, Sparkles } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { BrandImage } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { useSystemConfig } from '@/hooks/use-system-config'

export function UserConsoleStart() {
  const { t } = useTranslation()
  const { logo } = useSystemConfig()

  return (
    <div className='flex flex-wrap items-center justify-between gap-3'>
      <div className='flex min-w-0 items-center gap-3'>
        <BrandImage
          src={logo}
          alt={t('Logo')}
          className='size-8 rounded-lg'
        />
        <div className='min-w-0'>
          <div className='truncate text-sm font-semibold'>
            {t('Start the next creation')}
          </div>
          <p className='text-muted-foreground truncate text-xs'>
            {t('Images, video, and API access')}
          </p>
        </div>
      </div>
      <div className='flex flex-wrap items-center gap-2'>
        <Button
          variant='outline'
          size='sm'
          className='h-8'
          render={<Link to='/keys' />}
        >
          <KeyRound data-icon='inline-start' />
          {t('API Key')}
        </Button>
        <Button
          variant='outline'
          size='sm'
          className='h-8'
          render={<Link to='/pricing' />}
        >
          <Grid2x2 data-icon='inline-start' />
          {t('Browse models')}
        </Button>
        <Button size='sm' className='h-8' render={<Link to='/playground' />}>
          <Sparkles data-icon='inline-start' />
          {t('Enter studio')} →
        </Button>
      </div>
    </div>
  )
}
