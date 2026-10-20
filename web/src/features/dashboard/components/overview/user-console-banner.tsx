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
import { Info } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { getAnnouncementColorClass } from '@/lib/colors'
import { getPreviewText } from '@/features/dashboard/lib'
import type { AnnouncementItem } from '@/features/dashboard/types'
import { cn } from '@/lib/utils'

import { AnnouncementDetailModal } from './announcement-detail-dialog'

interface UserConsoleBannerProps {
  announcement: AnnouncementItem
}

export function UserConsoleBanner(props: UserConsoleBannerProps) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const preview = getPreviewText(props.announcement.content, 80)

  return (
    <>
      <div className='bg-muted/40 flex items-center gap-3 rounded-xl border px-3 py-2 sm:px-4'>
        <span
          className={cn(
            'inline-flex size-5 shrink-0 items-center justify-center rounded-full',
            getAnnouncementColorClass(props.announcement.type)
          )}
          aria-hidden='true'
        >
          <Info className='size-3 text-white' />
        </span>
        <p className='min-w-0 flex-1 truncate text-sm'>{preview}</p>
        <Button
          variant='outline'
          size='sm'
          className='h-7 shrink-0'
          onClick={() => setOpen(true)}
        >
          {t('View full text')}
        </Button>
      </div>
      <AnnouncementDetailModal
        open={open}
        onOpenChange={setOpen}
        announcement={props.announcement}
      />
    </>
  )
}
