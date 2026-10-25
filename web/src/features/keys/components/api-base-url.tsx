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
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { CopyButton } from '@/components/copy-button'
import { useStatus } from '@/hooks/use-status'

function readServerAddress(status: unknown): string | undefined {
  if (!status || typeof status !== 'object') return undefined
  const value = status as Record<string, unknown>
  const direct = value.server_address ?? value.serverAddress
  if (typeof direct === 'string' && direct.trim()) return direct.trim()
  const nested = value.data
  if (nested && typeof nested === 'object') {
    const nestedValue = nested as Record<string, unknown>
    const candidate = nestedValue.server_address ?? nestedValue.serverAddress
    if (typeof candidate === 'string' && candidate.trim()) {
      return candidate.trim()
    }
  }
  return undefined
}

export function ApiBaseUrl() {
  const { t } = useTranslation()
  const { status } = useStatus()
  const baseUrl = useMemo(() => {
    const configured = readServerAddress(status)
    if (configured) return configured.replace(/\/+$/, '')
    if (typeof window !== 'undefined') return window.location.origin
    return ''
  }, [status])

  if (!baseUrl) return null

  return (
    <div className='text-muted-foreground ml-1 flex min-w-0 items-center gap-2 text-sm font-normal tracking-normal'>
      <span className='shrink-0'>API Base URL:</span>
      <code className='bg-muted/60 text-foreground min-w-0 truncate rounded px-1.5 py-0.5 font-mono text-sm font-normal'>
        {baseUrl}
      </code>
      <CopyButton
        value={baseUrl}
        size='icon'
        className='size-6'
        iconClassName='size-3'
        tooltip={t('Copy to clipboard')}
        aria-label={t('Copy to clipboard')}
      />
    </div>
  )
}
