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
import { Link2 } from 'lucide-react'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { CopyButton } from '@/components/copy-button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
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
    <div
      className='flex h-8 max-w-[min(100%,28rem)] min-w-0 items-stretch overflow-hidden rounded-md border font-normal tracking-normal'
      aria-label='API Base URL'
    >
      <span className='text-muted-foreground flex shrink-0 items-center gap-1.5 border-r px-2.5 text-xs font-medium'>
        <Link2 className='size-3.5' aria-hidden='true' />
        API Base URL
      </span>
      <Tooltip>
        <TooltipTrigger
          render={
            <code className='text-foreground min-w-0 flex-1 truncate px-2.5 font-mono text-xs leading-8' />
          }
        >
          {baseUrl}
        </TooltipTrigger>
        <TooltipContent>{baseUrl}</TooltipContent>
      </Tooltip>
      <CopyButton
        value={baseUrl}
        size='icon'
        className='size-8 rounded-none border-l'
        iconClassName='size-3.5'
        tooltip={t('Copy to clipboard')}
        aria-label={t('Copy to clipboard')}
      />
    </div>
  )
}
