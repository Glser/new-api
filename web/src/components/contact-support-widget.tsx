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
import { useRouterState } from '@tanstack/react-router'
import { useEffect, useMemo, useRef, useState, type MouseEvent, type PointerEvent } from 'react'
import { useTranslation } from 'react-i18next'

import { useTheme } from '@/context/theme-provider'
import { useStatus } from '@/hooks/use-status'
import {
  loadEmotionBall,
  type EmotionBallInstance,
} from '@/lib/emotion-ball'

const CONTACT_SUPPORT_IMAGE_SRC =
  'https://api.oioi.lat/uploads/wx.jpg?v=20260903'
const POSITION_STORAGE_KEY = 'contact-support-widget-position'
const BUTTON_SIZE = 56
const VIEWPORT_MARGIN = 24
const DRAG_THRESHOLD = 6

type WidgetPosition = {
  x: number
  y: number
}

type DragState = {
  pointerId: number
  startX: number
  startY: number
  originX: number
  originY: number
  moved: boolean
}

function getDefaultPosition(): WidgetPosition {
  if (typeof window === 'undefined') {
    return { x: VIEWPORT_MARGIN, y: VIEWPORT_MARGIN }
  }

  return {
    x: window.innerWidth - BUTTON_SIZE - VIEWPORT_MARGIN,
    y: window.innerHeight - BUTTON_SIZE - VIEWPORT_MARGIN,
  }
}

function clampPosition(position: WidgetPosition): WidgetPosition {
  if (typeof window === 'undefined') {
    return position
  }

  const maxX = Math.max(
    VIEWPORT_MARGIN,
    window.innerWidth - BUTTON_SIZE - VIEWPORT_MARGIN
  )
  const minY = VIEWPORT_MARGIN + 48
  const maxY = Math.max(
    minY,
    window.innerHeight - BUTTON_SIZE - VIEWPORT_MARGIN
  )

  return {
    x: Math.min(Math.max(position.x, VIEWPORT_MARGIN), maxX),
    y: Math.min(Math.max(position.y, minY), maxY),
  }
}

function readStoredPosition(): WidgetPosition | null {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    const raw = window.localStorage.getItem(POSITION_STORAGE_KEY)
    if (!raw) {
      return null
    }

    const parsed = JSON.parse(raw) as Partial<WidgetPosition>
    if (
      typeof parsed?.x !== 'number' ||
      typeof parsed?.y !== 'number' ||
      !Number.isFinite(parsed.x) ||
      !Number.isFinite(parsed.y)
    ) {
      return null
    }

    return { x: parsed.x, y: parsed.y }
  } catch {
    return null
  }
}

function savePosition(position: WidgetPosition) {
  try {
    window.localStorage.setItem(POSITION_STORAGE_KEY, JSON.stringify(position))
  } catch {
    return
  }
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function announcementPlainText(raw: string): string {
  const trimmed = raw.trim()
  if (!trimmed) return ''

  const withBreaks = trimmed
    .replace(/<\s*br\s*\/?>/gi, '\n')
    .replace(/<\s*\/\s*p\s*>/gi, '\n')
    .replace(/<\s*\/\s*div\s*>/gi, '\n')
    .replace(/<\s*\/\s*h[1-6]\s*>/gi, '\n')

  let text = withBreaks
  if (typeof document === 'undefined') {
    text = withBreaks.replace(/<[^>]+>/g, ' ')
  } else {
    const box = document.createElement('div')
    box.innerHTML = withBreaks
    text = box.textContent || ''
  }

  text = text.replace(/!\[[^\]]*\]\([^)]*\)/g, '')
  text = text.replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
  text = text.replace(/https?:\/\/[^\s)]+/gi, '')
  text = text.replace(/^#{1,6}\s+/gm, '')
  text = text.replace(/^>\s+/gm, '')
  text = text.replace(/^[-*+]\s+/gm, '')
  text = text.replace(/^\d+\.\s+/gm, '')
  text = text.replace(/`([^`]+)`/g, '$1')
  text = text.replace(/\*\*([^*]+)\*\*/g, '$1')
  text = text.replace(/__([^_]+)__/g, '$1')
  text = text.replace(/\*([^*]+)\*/g, '$1')
  text = text.replace(/_([^_]+)_/g, '$1')
  text = text.replace(/~~([^~]+)~~/g, '$1')
  text = text.replace(/[#*_~`>|\[\]()]+/g, '')
  return text.replace(/\s+/g, ' ').trim()
}

export function ContactSupportWidget() {
  const { t } = useTranslation()
  const { resolvedTheme } = useTheme()
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const isDark = resolvedTheme === 'dark'
  const [imageFailed, setImageFailed] = useState(false)
  const [open, setOpen] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [typedText, setTypedText] = useState('')
  const { status } = useStatus()
  const docsLine = t('For AI tool setup issues, check the docs first')
  const contactLine = t('Got a question? Click me to contact support')
  const speechLines = useMemo(() => {
    const announcementsEnabled = status?.announcements_enabled ?? false
    const announcements = announcementsEnabled
      ? ((status?.announcements || []) as Record<string, unknown>[]).slice(0, 3)
      : []
    const lines = announcements
      .map((item) => announcementPlainText(String(item?.content || '')))
      .filter((line) => line.length > 0)
    return [...lines, docsLine, contactLine]
  }, [status, docsLine, contactLine])
  const [position, setPosition] = useState<WidgetPosition>(() =>
    clampPosition(readStoredPosition() ?? getDefaultPosition())
  )
  const dragRef = useRef<DragState | null>(null)
  const suppressClickRef = useRef(false)
  const ballHostRef = useRef<HTMLSpanElement>(null)
  const ballRef = useRef<EmotionBallInstance | null>(null)

  useEffect(() => {
    const handleResize = () => {
      setPosition((current) => clampPosition(current))
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    if (pathname.startsWith('/setup')) return
    if (speechLines.length === 0) return

    const reduceMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches
    let cancelled = false
    let lineIndex = 0
    let charIndex = 0
    let timer = 0

    const nextLine = () => {
      if (cancelled) return
      lineIndex = (lineIndex + 1) % speechLines.length
      startLine()
    }

    const typeNext = () => {
      if (cancelled) return
      const line = speechLines[lineIndex] || ''
      const chars = Array.from(line)
      charIndex += 1
      setTypedText(chars.slice(0, charIndex).join(''))
      if (charIndex < chars.length) {
        timer = window.setTimeout(typeNext, 90)
        return
      }
      timer = window.setTimeout(nextLine, 5000)
    }

    const startLine = () => {
      if (cancelled) return
      const line = speechLines[lineIndex] || ''
      if (reduceMotion || line.length === 0) {
        setTypedText(line)
        timer = window.setTimeout(nextLine, 5000)
        return
      }
      charIndex = 0
      setTypedText('')
      timer = window.setTimeout(typeNext, 240)
    }

    startLine()
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [pathname, speechLines])

  useEffect(() => {
    if (pathname.startsWith('/setup')) {
      ballRef.current?.destroy()
      ballRef.current = null
      return
    }

    let cancelled = false

    loadEmotionBall()
      .then((api) => {
        if (cancelled || !ballHostRef.current) return
        ballRef.current?.destroy()
        ballRef.current = api.create(ballHostRef.current, {
          emotion: '03',
          lite: true,
          eyeScale: 1.7,
          idle: true,
          label: 'Contact Support',
          color: isDark ? '#F5F5F5' : '#111111',
          eyeColor: isDark ? '#111111' : '#FFFFFF',
        })
        const svg = ballHostRef.current.querySelector('svg')
        if (svg) {
          svg.setAttribute('width', '100%')
          svg.setAttribute('height', '100%')
          svg.style.width = '100%'
          svg.style.height = '100%'
          svg.style.display = 'block'
        }
      })
      .catch(() => {
        return
      })

    return () => {
      cancelled = true
      ballRef.current?.destroy()
      ballRef.current = null
    }
  }, [pathname, isDark])

  useEffect(() => {
    let rect: DOMRect | null = null
    let measuredAt = 0

    const handlePointerMove = (event: globalThis.PointerEvent) => {
      const host = ballHostRef.current
      const ball = ballRef.current
      if (!host || !ball) return

      const now = performance.now()
      if (!rect || now - measuredAt > 200) {
        rect = host.getBoundingClientRect()
        measuredAt = now
      }
      if (!rect.width || !rect.height) return

      const nx = clamp((event.clientX - (rect.left + rect.width / 2)) / rect.width, -0.6, 0.6) / 0.6
      const ny = clamp((event.clientY - (rect.top + rect.height / 2)) / rect.height, -0.6, 0.6) / 0.6
      ball.setGaze(nx, ny)
    }

    const handlePointerLeave = () => {
      ballRef.current?.clearGaze()
    }

    window.addEventListener('pointermove', handlePointerMove, { passive: true })
    document.addEventListener('pointerleave', handlePointerLeave)
    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      document.removeEventListener('pointerleave', handlePointerLeave)
    }
  }, [])

  if (pathname.startsWith('/setup')) return null

  const handlePointerDown = (event: PointerEvent<HTMLButtonElement>) => {
    if (event.button !== 0) return

    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: position.x,
      originY: position.y,
      moved: false,
    }
    suppressClickRef.current = false
    setIsDragging(true)
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const handlePointerMove = (event: PointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return

    const dx = event.clientX - drag.startX
    const dy = event.clientY - drag.startY

    if (!drag.moved) {
      if (Math.hypot(dx, dy) < DRAG_THRESHOLD) return
      drag.moved = true
    }

    setPosition(
      clampPosition({
        x: drag.originX + dx,
        y: drag.originY + dy,
      })
    )
  }

  const endDrag = (event: PointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return

    if (drag.moved) {
      suppressClickRef.current = true
      setOpen(false)
      setPosition((current) => {
        const next = clampPosition(current)
        savePosition(next)
        return next
      })
    }

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }

    dragRef.current = null
    setIsDragging(false)
  }

  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault()
    event.stopPropagation()
    if (suppressClickRef.current || dragRef.current?.moved) {
      return
    }
    setOpen((current) => !current)
    if (!open) {
      ballRef.current?.spin(1)
    }
  }

  return (
    <div
      className='fixed z-40'
      style={{ left: position.x, top: position.y, width: BUTTON_SIZE, height: BUTTON_SIZE }}
    >
      {!open && (
        <div
          className='pointer-events-none absolute bottom-full left-1/2 mb-2 w-max max-w-52 -translate-x-1/2'
          aria-hidden='true'
        >
          <div className='bg-popover text-popover-foreground ring-foreground/10 relative rounded-2xl px-3 py-2 text-xs leading-5 font-medium shadow-md ring-1'>
            <span>{typedText}</span>
            <span className='bg-foreground/80 ml-0.5 inline-block h-3 w-px animate-pulse align-[-1px]' />
            <span className='bg-popover ring-foreground/10 absolute top-full left-1/2 size-2 -translate-x-1/2 -translate-y-1 rotate-45 ring-1' />
          </div>
        </div>
      )}
      <button
        type='button'
        className={`pointer-events-auto overflow-visible touch-none rounded-full border-0 bg-transparent p-0 shadow-none transition-transform select-none hover:scale-105 motion-reduce:transition-none motion-reduce:hover:scale-100 ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
        style={{ width: BUTTON_SIZE, height: BUTTON_SIZE }}
        aria-label={t('Contact Support')}
        aria-expanded={open}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onClick={handleClick}
      >
        <span
          ref={ballHostRef}
          className='pointer-events-none block h-full w-full'
          aria-hidden='true'
        />
      </button>
      {open && (
        <div className='bg-popover text-popover-foreground ring-foreground/10 pointer-events-auto absolute right-0 bottom-full mb-3 w-72 rounded-xl p-3 shadow-md ring-1'>
          <div className='mb-2'>
            <div className='text-sm font-medium'>{t('Contact Support')}</div>
            <p className='text-muted-foreground text-xs'>
              {t('Scan with WeChat to contact us')}
            </p>
          </div>
          {imageFailed ? (
            <p className='text-muted-foreground text-xs'>
              {t('Add your contact image at public/contact-support.png')}
            </p>
          ) : (
            <img
              src={CONTACT_SUPPORT_IMAGE_SRC}
              alt={t('Contact information')}
              className='h-auto w-full rounded-md object-contain'
              onError={() => setImageFailed(true)}
            />
          )}
        </div>
      )}
    </div>
  )
}
