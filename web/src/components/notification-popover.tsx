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
import type { TFunction } from 'i18next'
import { Bell, ChevronLeft, Megaphone } from 'lucide-react'
import { useMemo, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { Dialog } from '@/components/dialog'
import { RichContent } from '@/components/rich-content'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'
import { getAnnouncementKey, useNotifications } from '@/hooks/use-notifications'
import { formatDateTimeObject } from '@/lib/time'
import { cn } from '@/lib/utils'

interface NotificationListItem {
  key: string
  kind: 'notice' | 'announcement'
  title: string
  preview: string
  content: string
  extra?: string
  publishDate?: string | Date
  type?: string
  unread: boolean
}

const TYPE_BADGE_CLASS: Record<string, string> = {
  default: 'bg-muted text-muted-foreground',
  ongoing: 'bg-sky-500/12 text-sky-700 dark:text-sky-300',
  success: 'bg-emerald-500/12 text-emerald-700 dark:text-emerald-300',
  warning: 'bg-amber-500/12 text-amber-700 dark:text-amber-300',
  error: 'bg-destructive/10 text-destructive',
}

function stripMarkup(content: string): string {
  return content
    .replaceAll(/<[^>]*>/g, '')
    .replaceAll(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replaceAll(/[#*_`>]/g, '')
    .replaceAll(/\s+/g, ' ')
    .trim()
}

function getPreviewText(content: string, maxLength = 64): string {
  const plainText = stripMarkup(content)
  if (!plainText) return ''
  return plainText.length > maxLength
    ? `${plainText.slice(0, maxLength)}...`
    : plainText
}

function getListTitle(content: string, fallback: string): string {
  const lines = content
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
  const heading = lines.find((line) => /^#{1,6}\s+/.test(line))
  if (heading) {
    return heading.replace(/^#{1,6}\s+/, '').trim() || fallback
  }
  const first = stripMarkup(lines[0] || '')
  if (!first) return fallback
  return first.length > 42 ? `${first.slice(0, 42)}...` : first
}

function getListPreview(content: string): string {
  const lines = content
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
  const rest = lines.filter((line) => !/^#{1,6}\s+/.test(line)).join(' ')
  return getPreviewText(rest || content, 72)
}

function getRelativeTime(publishDate: string | Date, t: TFunction): string {
  const pubDate = new Date(publishDate)
  if (Number.isNaN(pubDate.getTime())) {
    return typeof publishDate === 'string' ? publishDate : ''
  }

  const diffMs = Date.now() - pubDate.getTime()
  const diffSeconds = Math.floor(diffMs / 1000)
  const diffMinutes = Math.floor(diffSeconds / 60)
  const diffHours = Math.floor(diffMinutes / 60)
  const diffDays = Math.floor(diffHours / 24)
  const diffWeeks = Math.floor(diffDays / 7)
  const diffMonths = Math.floor(diffDays / 30)
  const diffYears = Math.floor(diffDays / 365)

  if (diffMs < 0) return formatDateTimeObject(pubDate)
  if (diffSeconds < 60) return t('Just now')
  if (diffMinutes < 60) {
    return diffMinutes === 1
      ? t('1 minute ago')
      : t('{{count}} minutes ago', { count: diffMinutes })
  }
  if (diffHours < 24) {
    return diffHours === 1
      ? t('1 hour ago')
      : t('{{count}} hours ago', { count: diffHours })
  }
  if (diffDays < 7) {
    return diffDays === 1
      ? t('1 day ago')
      : t('{{count}} days ago', { count: diffDays })
  }
  if (diffWeeks < 4) {
    return diffWeeks === 1
      ? t('1 week ago')
      : t('{{count}} weeks ago', { count: diffWeeks })
  }
  if (diffMonths < 12) {
    return diffMonths === 1
      ? t('1 month ago')
      : t('{{count}} months ago', { count: diffMonths })
  }
  if (diffYears < 2) return t('1 year ago')
  return formatDateTimeObject(pubDate)
}

function getTypeLabel(type: string | undefined, t: TFunction): string {
  switch (type) {
    case 'ongoing':
      return t('Ongoing')
    case 'success':
      return t('Success')
    case 'warning':
      return t('Warning')
    case 'error':
      return t('Error')
    default:
      return t('Normal')
  }
}

function StatusChip({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex h-5 shrink-0 items-center rounded-md px-1.5 text-[11px] leading-none font-medium',
        className
      )}
    >
      {children}
    </span>
  )
}

export function NotificationPopover({ className }: { className?: string }) {
  const { t } = useTranslation()
  const {
    notice,
    announcements,
    loading,
    unreadCount,
    lastReadNotice,
    isAnnouncementRead,
    markNoticeRead,
    markAnnouncementsRead,
  } = useNotifications()
  const [open, setOpen] = useState(false)
  const [selectedKey, setSelectedKey] = useState<string | null>(null)

  const items = useMemo<NotificationListItem[]>(() => {
    const list: NotificationListItem[] = []

    if (notice) {
      list.push({
        key: 'notice',
        kind: 'notice',
        title: getListTitle(notice, t('System Notice')),
        preview: getListPreview(notice),
        content: notice,
        unread: notice !== lastReadNotice,
        type: 'default',
      })
    }

    for (const raw of announcements) {
      const content = String(raw.content ?? '')
      const key = getAnnouncementKey(raw)
      list.push({
        key,
        kind: 'announcement',
        title: getListTitle(content, t('System Announcements')),
        preview: getListPreview(content),
        content,
        extra: raw.extra ? String(raw.extra) : undefined,
        publishDate: raw.publishDate as string | Date | undefined,
        unread: !isAnnouncementRead(key),
        type: String(raw.type ?? 'default'),
      })
    }

    return list
  }, [announcements, isAnnouncementRead, lastReadNotice, notice, t])

  const selected = items.find((item) => item.key === selectedKey) ?? null

  const handleOpenChange = (next: boolean) => {
    setOpen(next)
    if (!next) setSelectedKey(null)
  }

  const handleSelect = (item: NotificationListItem) => {
    setSelectedKey(item.key)
    if (item.kind === 'notice') {
      markNoticeRead(item.content)
      return
    }
    markAnnouncementsRead([item.key])
  }

  let dialogDescription: string | undefined
  if (selected?.publishDate) {
    dialogDescription = getRelativeTime(selected.publishDate, t)
  } else if (selected) {
    dialogDescription = t('System Notice')
  }

  return (
    <>
      <Button
        variant='ghost'
        size='icon'
        className={cn('relative size-9', className)}
        aria-label={t('Notifications')}
        onClick={() => setOpen(true)}
      >
        <Bell className='size-[1.2rem]' />
        {unreadCount > 0 ? (
          <Badge
            variant='destructive'
            className='absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center px-1 text-[10px] font-semibold tabular-nums'
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </Badge>
        ) : null}
      </Button>
      <Dialog
        open={open}
        onOpenChange={handleOpenChange}
        title={
          selected ? (
            <span className='flex items-center gap-1'>
              <button
                type='button'
                onClick={() => setSelectedKey(null)}
                className='text-muted-foreground hover:text-foreground -ml-1 inline-flex items-center gap-0.5 rounded-md px-1 py-0.5 text-sm font-medium transition-colors'
              >
                <ChevronLeft className='size-4' />
                {t('Back')}
              </button>
            </span>
          ) : (
            t('Announcements and activities')
          )
        }
        description={dialogDescription}
        contentClassName='sm:max-w-xl'
        headerClassName='pr-10'
        initialFocus={false}
        contentHeight='auto'
        bodyClassName='p-0'
        footerClassName='bg-transparent -mx-0 -mb-0 rounded-none border-0 p-0 pt-1 sm:mx-0 sm:mb-0 sm:p-0'
        footer={
          <Button
            variant='outline'
            size='sm'
            className='rounded-lg px-4'
            onClick={() => handleOpenChange(false)}
          >
            {t('Close')}
          </Button>
        }
      >
        {selected ? (
          <NotificationDetail item={selected} t={t} />
        ) : (
          <NotificationList
            items={items}
            loading={loading}
            t={t}
            onSelect={handleSelect}
          />
        )}
      </Dialog>
    </>
  )
}

function NotificationList({
  items,
  loading,
  t,
  onSelect,
}: {
  items: NotificationListItem[]
  loading: boolean
  t: TFunction
  onSelect: (item: NotificationListItem) => void
}) {
  if (loading) {
    return (
      <Empty className='min-h-48 border-0 p-4'>
        <EmptyHeader>
          <EmptyMedia variant='icon'>
            <Bell />
          </EmptyMedia>
          <EmptyTitle>{t('Loading...')}</EmptyTitle>
        </EmptyHeader>
      </Empty>
    )
  }

  if (items.length === 0) {
    return (
      <Empty className='min-h-48 border-0 p-4'>
        <EmptyHeader>
          <EmptyMedia variant='icon'>
            <Megaphone />
          </EmptyMedia>
          <EmptyTitle>{t('No notifications')}</EmptyTitle>
          <EmptyDescription>
            {t('Latest platform updates and notices')}
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }

  return (
    <div className='flex flex-col gap-2.5 py-1'>
        {items.map((item) => {
          const created = item.publishDate
            ? formatDateTimeObject(new Date(item.publishDate))
            : ''
          const extraText = item.extra ? stripMarkup(item.extra) : ''

          return (
            <button
              key={item.key}
              type='button'
              onClick={() => onSelect(item)}
              className='border-border/70 bg-card hover:border-border hover:bg-muted/25 focus-visible:ring-ring/40 w-full rounded-2xl border px-3.5 py-3 text-left shadow-[0_1px_0_rgba(0,0,0,0.02)] transition-colors focus-visible:ring-2 focus-visible:outline-none'
            >
              <span className='flex items-start gap-1.5'>
                <span className='flex shrink-0 flex-wrap items-center gap-1.5 pt-0.5'>
                  <StatusChip
                    className={TYPE_BADGE_CLASS[item.type || 'default']}
                  >
                    {getTypeLabel(item.type, t)}
                  </StatusChip>
                  <StatusChip
                    className={
                      item.unread
                        ? 'bg-primary/10 text-primary'
                        : 'bg-muted text-muted-foreground'
                    }
                  >
                    {item.unread ? t('Unread') : t('Read')}
                  </StatusChip>
                </span>
                <span className='text-foreground min-w-0 flex-1 text-[13.5px] leading-snug font-medium'>
                  {item.title}
                </span>
              </span>
              <span className='text-muted-foreground mt-1.5 block text-xs'>
                {t('View full announcement')}
                {created ? ` · ${t('Created:')} ${created}` : null}
              </span>
              {extraText ? (
                <span className='text-muted-foreground mt-2 block text-xs leading-relaxed'>
                  {t('Remarks:')} {extraText}
                </span>
              ) : null}
            </button>
          )
        })}
    </div>
  )
}

function NotificationDetail({
  item,
  t,
}: {
  item: NotificationListItem
  t: TFunction
}) {
  return (
    <div className='space-y-3 py-1'>
        <div className='flex flex-wrap items-center gap-1.5'>
          <StatusChip className={TYPE_BADGE_CLASS[item.type || 'default']}>
            {getTypeLabel(item.type, t)}
          </StatusChip>
          <StatusChip className='bg-muted text-muted-foreground'>
            {t('Read')}
          </StatusChip>
        </div>
        <div className='text-sm leading-relaxed'>
          <RichContent breaks content={item.content} />
        </div>
        {item.extra ? (
          <div className='border-border/60 bg-muted/30 rounded-xl border px-3 py-2.5'>
            <p className='text-muted-foreground mb-1 text-[11px] font-medium'>
              {t('Remarks:')}
            </p>
            <div className='text-muted-foreground text-xs leading-relaxed'>
              <RichContent breaks content={item.extra} />
            </div>
          </div>
        ) : null}
    </div>
  )
}
