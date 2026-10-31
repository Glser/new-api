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
import { Pencil } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { QuotaDetailsPopover } from '@/components/quota-details-popover'
import { StatusBadge } from '@/components/status-badge'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { formatQuotaWithCurrency, getCurrencyDisplay } from '@/lib/currency'
import { cn } from '@/lib/utils'
import { useSystemConfigStore } from '@/stores/system-config-store'

import { isUserDeleted } from '../constants'
import type { User } from '../types'
import { useUsers } from './users-provider'

type UserQuotaCellProps = {
  user: User
}

export function UserQuotaCell(props: UserQuotaCellProps) {
  const { t } = useTranslation()
  const { setOpen, setCurrentRow } = useUsers()
  useSystemConfigStore((state) => state.config.currency)

  const { meta: currency } = getCurrencyDisplay()
  const quotaUnit = currency.kind === 'tokens' ? t('Tokens') : currency.symbol
  const remaining = props.user.quota
  const used = props.user.used_quota
  const hasQuota = remaining !== 0 || used !== 0
  const canAdjust = !isUserDeleted(props.user)
  const formattedRemaining = formatQuotaWithCurrency(remaining, {
    showSymbol: false,
  })
  const formattedUsed = formatQuotaWithCurrency(used, {
    showSymbol: false,
  })

  return (
    <div className='mx-auto flex items-start justify-center gap-0.5'>
      <QuotaDetailsPopover
        title={`${t('Quota')} (${quotaUnit})`}
        triggerLabel={
          hasQuota
            ? `${t('Available Balance')} ${formattedRemaining}; ${t('Used amount')} ${formattedUsed}`
            : t('No Quota')
        }
        details={[
          { label: t('Available Balance'), value: formattedRemaining },
          { label: t('Total Used'), value: formattedUsed },
        ]}
        className='w-auto min-w-0'
        triggerClassName='w-auto justify-center text-center'
      >
        {hasQuota ? (
          <span className='grid w-full grid-cols-1 justify-items-center gap-y-1 text-center text-sm tabular-nums'>
            <span
              className={cn(
                remaining < 0 && 'text-destructive',
                remaining === 0 && 'text-muted-foreground'
              )}
            >
              {formattedRemaining}
            </span>
            <span
              data-table-text='secondary'
              className='text-muted-foreground flex items-baseline justify-center gap-1 text-xs font-normal'
            >
              <span>{t('Used amount')}</span>
              <span>{formattedUsed}</span>
            </span>
          </span>
        ) : (
          <span className='flex w-full justify-center'>
            <StatusBadge
              label={t('No Quota')}
              variant='neutral'
              copyable={false}
              className='font-normal'
            />
          </span>
        )}
      </QuotaDetailsPopover>
      {canAdjust && (
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                type='button'
                variant='ghost'
                size='icon-xs'
                className='text-muted-foreground hover:text-foreground mt-0.5 shrink-0'
                aria-label={t('Adjust Quota')}
                onClick={() => {
                  setCurrentRow(props.user)
                  setOpen('adjust-quota')
                }}
              />
            }
          >
            <Pencil />
          </TooltipTrigger>
          <TooltipContent>{t('Adjust Quota')}</TooltipContent>
        </Tooltip>
      )}
    </div>
  )
}
