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
import { Wallet } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { IconBadge } from '@/components/ui/icon-badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { getCurrencyDisplay, getCurrencyLabel } from '@/lib/currency'
import { formatQuota, parseQuotaFromDollars } from '@/lib/format'
import { handleServerError } from '@/lib/handle-server-error'

import { adjustUserQuota } from '../api'
import type { QuotaAdjustMode } from '../types'

interface UserQuotaDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  userId: number
  currentQuota: number
  username?: string
  onSuccess: () => void
}

export function UserQuotaDialog(props: UserQuotaDialogProps) {
  const { t } = useTranslation()
  const [mode, setMode] = useState<QuotaAdjustMode>('add')
  const [amount, setAmount] = useState('')
  const [loading, setLoading] = useState(false)

  const { meta: currencyMeta } = getCurrencyDisplay()
  const currencyLabel = getCurrencyLabel()
  const tokensOnly = currencyMeta.kind === 'tokens'

  const amountValue = Number.parseFloat(amount) || 0
  const quotaValue = parseQuotaFromDollars(Math.abs(amountValue))
  const overrideQuota = parseQuotaFromDollars(amountValue)
  const hasAmount = amount.trim() !== ''
  let nextQuota = overrideQuota
  if (mode === 'add') nextQuota = props.currentQuota + quotaValue
  if (mode === 'subtract') nextQuota = props.currentQuota - quotaValue
  const canConfirm =
    !loading && (mode === 'override' ? hasAmount : quotaValue > 0)

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setAmount('')
      setMode('add')
      setLoading(false)
    }
    props.onOpenChange(open)
  }

  const handleConfirm = async () => {
    if (!canConfirm) return

    setLoading(true)
    try {
      const value = mode === 'override' ? overrideQuota : quotaValue
      const result = await adjustUserQuota({
        id: props.userId,
        action: 'add_quota',
        mode,
        value: mode === 'override' ? value : Math.abs(value),
      })
      if (result.success) {
        toast.success(t('Quota adjusted successfully'))
        handleOpenChange(false)
        props.onSuccess()
      } else {
        handleServerError(result, t('Failed to adjust quota'))
      }
    } catch (e: unknown) {
      handleServerError(e, t('Failed to adjust quota'))
    } finally {
      setLoading(false)
    }
  }

  const placeholder = tokensOnly
    ? t('Enter amount in tokens')
    : t('Enter amount in {{currency}}', { currency: currencyLabel })

  return (
    <Dialog open={props.open} onOpenChange={handleOpenChange}>
      <DialogContent
        initialFocus={false}
        className='flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-md'
      >
        <DialogHeader className='flex-row items-center gap-2.5 border-b px-4 py-3'>
          <IconBadge
            size='md'
            className='rounded-full bg-[#c4f82a] text-[#28350a]'
          >
            <Wallet />
          </IconBadge>
          <div className='min-w-0 flex-1 pr-8'>
            <DialogTitle className='truncate text-base font-semibold tracking-tight'>
              {t('Adjust Quota')}
              {props.username ? (
                <span className='text-muted-foreground font-normal'>
                  {' · '}
                  {props.username}
                </span>
              ) : null}
            </DialogTitle>
            <DialogDescription className='sr-only'>
              {t('Select an operation mode and enter the amount')}
            </DialogDescription>
          </div>
        </DialogHeader>

        <div className='flex flex-col gap-4 px-4 py-4'>
          <div className='bg-muted/50 rounded-xl border px-3 py-3'>
            <div className='text-muted-foreground text-xs'>
              {t('Current quota')}
            </div>
            <div className='mt-1 flex min-w-0 items-baseline gap-2'>
              <span className='text-lg font-semibold tabular-nums'>
                {formatQuota(props.currentQuota)}
              </span>
              {hasAmount ? (
                <span className='text-muted-foreground text-sm font-medium tabular-nums'>
                  {mode === 'add'
                    ? `+ ${formatQuota(quotaValue)} = ${formatQuota(nextQuota)}`
                    : null}
                  {mode === 'subtract'
                    ? `- ${formatQuota(quotaValue)} = ${formatQuota(nextQuota)}`
                    : null}
                  {mode === 'override' ? `→ ${formatQuota(nextQuota)}` : null}
                </span>
              ) : null}
            </div>
          </div>

          <div className='space-y-2'>
            <Label>{t('Mode')}</Label>
            <Tabs
              value={mode}
              onValueChange={(value) => {
                if (
                  value !== 'add' &&
                  value !== 'subtract' &&
                  value !== 'override'
                ) {
                  return
                }
                setMode(value)
                setAmount('')
              }}
              className='w-full'
            >
              <TabsList aria-label={t('Mode')} className='h-8 w-full'>
                <TabsTrigger value='add' className='px-2.5 text-xs'>
                  {t('Add')}
                </TabsTrigger>
                <TabsTrigger value='subtract' className='px-2.5 text-xs'>
                  {t('Subtract')}
                </TabsTrigger>
                <TabsTrigger value='override' className='px-2.5 text-xs'>
                  {t('Override')}
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <div className='space-y-2'>
            <Label>
              {t('Amount')} ({currencyLabel})
            </Label>
            <Input
              type='number'
              step={tokensOnly ? 1 : 0.000001}
              min={mode === 'override' ? undefined : 0}
              placeholder={placeholder}
              value={amount}
              autoFocus
              className='h-8 tabular-nums'
              onChange={(e) => setAmount(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleConfirm()
              }}
            />
          </div>
        </div>

        <div className='flex items-center justify-end gap-2 border-t px-4 py-3'>
          <Button
            variant='outline'
            size='sm'
            onClick={() => handleOpenChange(false)}
          >
            {t('Cancel')}
          </Button>
          <Button
            shine
            size='sm'
            onClick={handleConfirm}
            disabled={!canConfirm}
          >
            {loading ? t('Processing...') : t('Confirm')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
