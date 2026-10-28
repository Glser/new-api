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
import { Megaphone } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { getPreviewText } from '@/features/dashboard/lib'
import type { AnnouncementItem } from '@/features/dashboard/types'

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
      <div className='bg-card flex min-w-0 items-center gap-2 rounded-xl border border-foreground/15 px-3 py-2.5 shadow-sm @min-[48rem]/console:gap-3 @min-[48rem]/console:px-4'>
        <span
          className='bg-lime-400 text-black inline-flex size-8 shrink-0 items-center justify-center rounded-full @min-[48rem]/console:size-9'
          aria-hidden='true'
        >
          <Megaphone className='size-4 @min-[48rem]/console:size-[18px]' />
        </span>
        <p className='min-w-0 flex-1 truncate text-xs font-medium @min-[48rem]/console:text-sm'>{preview}</p>
        <Button
          variant='outline'
          size='default'
          className='border-foreground/35 hover:bg-muted h-8 shrink-0 px-2.5 text-xs font-medium @min-[48rem]/console:px-3 @min-[48rem]/console:text-sm'
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
