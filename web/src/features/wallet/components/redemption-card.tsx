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
import {
  ArrowUpRight01Icon,
  GiftIcon,
  RefreshIcon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'

interface RedemptionCardProps {
  code: string
  onCodeChange: (code: string) => void
  onRedeem: () => void
  redeeming: boolean
  enabled: boolean
  loading: boolean
  topupLink?: string
}

const XIANYU_REDEMPTION_URL = 'https://m.tb.cn/h.8IP2BiK?tk=sbDgT7Lla3k'

export function RedemptionCard(props: RedemptionCardProps) {
  const { t } = useTranslation()
  return (
    <section
      className='@container/redemption flex min-w-0 flex-col gap-3 border-t px-5 py-4 sm:px-6 sm:py-5 @min-[56rem]/wallet:border-t-0 @min-[56rem]/wallet:border-l'
      aria-labelledby='wallet-redemption-heading'
    >
      <div>
        <div className='flex min-h-10 items-center gap-2'>
          <HugeiconsIcon
            icon={GiftIcon}
            size={18}
            strokeWidth={1.7}
            aria-hidden='true'
          />
          <h3 id='wallet-redemption-heading' className='text-sm font-medium'>
            {t('Redemption Code')}
          </h3>
        </div>
        {!props.loading && props.enabled && (
          <div className='mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1'>
            <p className='text-muted-foreground text-xs leading-relaxed'>
              {t('Redeem a code to add credit to your wallet.')}
            </p>
            <div className='flex flex-wrap items-center gap-x-3 gap-y-1'>
              <span className='text-muted-foreground text-xs'>
                {t('Need a redemption code?')}
              </span>
              <div className='flex items-center gap-2'>
                {props.topupLink && (
                  <Button
                    render={
                      <a
                        href={props.topupLink}
                        target='_blank'
                        rel='noopener noreferrer'
                      />
                    }
                    variant='link'
                    size='sm'
                    className='h-auto px-0 text-xs'
                  >
                    {t('Get one here')}
                    <HugeiconsIcon
                      icon={ArrowUpRight01Icon}
                      className='size-3.5'
                      aria-hidden='true'
                    />
                  </Button>
                )}
                <Button
                  render={
                    <a
                      href={XIANYU_REDEMPTION_URL}
                      target='_blank'
                      rel='noopener noreferrer'
                    />
                  }
                  variant='ghost'
                  size='icon'
                  aria-label={t('Get a code on Xianyu')}
                  title={t('Get a code on Xianyu')}
                  className='size-7 overflow-hidden p-0'
                >
                  <img
                    src='/xianyu-logo.png'
                    alt=''
                    width={32}
                    height={32}
                    className='size-full object-cover'
                  />
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
      {props.loading && (
        <div className='space-y-3'>
          <Skeleton className='h-4 w-full' />
          <Skeleton className='h-10 w-full' />
        </div>
      )}
      {!props.loading && props.enabled && (
        <div className='flex flex-1 flex-col gap-4'>
          <div className='flex min-h-16 flex-1 flex-col justify-center'>
            <form
              className='flex flex-col gap-2 @min-[18rem]/redemption:flex-row'
              onSubmit={(event) => {
                event.preventDefault()
                if (props.code.trim() && !props.redeeming) props.onRedeem()
              }}
            >
              <Label htmlFor='redemption-code' className='sr-only'>
                {t('Redemption Code')}
              </Label>
              <Input
                id='redemption-code'
                value={props.code}
                onChange={(event) => props.onCodeChange(event.target.value)}
                placeholder={t('Enter your redemption code')}
                autoComplete='off'
                disabled={props.redeeming}
                className='bg-background h-10 flex-1'
              />
              <Button
                type='submit'
                variant='outline'
                className='h-10 px-4'
                disabled={!props.code.trim() || props.redeeming}
              >
                {props.redeeming && (
                  <HugeiconsIcon
                    icon={RefreshIcon}
                    className='size-4 animate-spin motion-reduce:animate-none'
                    aria-hidden='true'
                  />
                )}
                {t('Redeem')}
              </Button>
            </form>
          </div>
        </div>
      )}
      {!props.loading && !props.enabled && (
        <p className='text-muted-foreground text-sm leading-relaxed'>
          {t(
            'Redemption codes are disabled until the administrator confirms compliance terms.'
          )}
        </p>
      )}
    </section>
  )
}
