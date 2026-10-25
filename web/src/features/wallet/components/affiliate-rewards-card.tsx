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
import { useTranslation } from 'react-i18next'

import { CopyButton } from '@/components/copy-button'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { formatQuota } from '@/lib/format'

import type { UserWalletData } from '../types'

interface AffiliateRewardsCardProps {
  user: UserWalletData | null
  affiliateLink: string
  onTransfer: () => void
  complianceConfirmed?: boolean
  loading?: boolean
}

export function AffiliateRewardsCard(props: AffiliateRewardsCardProps) {
  const { t } = useTranslation()
  const hasRewards = (props.user?.aff_quota ?? 0) > 0
  const complianceConfirmed = props.complianceConfirmed !== false

  if (props.loading) {
    return (
      <section className='bg-card overflow-hidden rounded-2xl border'>
        <div className='grid gap-4 px-3 py-3 sm:px-5 lg:grid-cols-[minmax(220px,1fr)_minmax(220px,0.72fr)_minmax(320px,1.15fr)] lg:items-center'>
          <div>
            <Skeleton className='h-4 w-32' />
            <Skeleton className='mt-2 h-3 w-48' />
          </div>
          <Skeleton className='h-14 rounded-lg' />
          <Skeleton className='h-10 rounded-lg' />
        </div>
      </section>
    )
  }

  return (
    <section className='bg-card overflow-hidden rounded-2xl border'>
      <div className='grid gap-3 px-3 py-3 sm:gap-4 sm:px-5 lg:grid-cols-[minmax(200px,1fr)_minmax(180px,0.65fr)_minmax(280px,1fr)] lg:items-center'>
        <div className='min-w-0'>
          <h3 className='text-xs font-semibold @min-[48rem]/wallet:text-sm'>
            {t('Referral Program')}
          </h3>
          <p className='text-muted-foreground mt-0.5 line-clamp-2 text-[11px] @min-[48rem]/wallet:text-xs'>
            {t(
              'Earn rewards when users join through your referral link. Transfer accumulated rewards to your balance anytime.'
            )}
          </p>
        </div>

        <div className='grid grid-cols-3 gap-1.5 text-center'>
          {[
            [t('Pending'), formatQuota(props.user?.aff_quota ?? 0)],
            [
              t('Total Earned'),
              formatQuota(props.user?.aff_history_quota ?? 0),
            ],
            [t('Invites'), String(props.user?.aff_count ?? 0)],
          ].map(([label, value]) => (
            <div key={label}>
              <div className='text-muted-foreground truncate text-[10px] font-medium'>
                {label}
              </div>
              <div className='mt-0.5 truncate font-mono text-sm font-semibold tabular-nums'>
                {value}
              </div>
            </div>
          ))}
        </div>

        <div className='flex items-center gap-2'>
          <Input
            value={props.affiliateLink}
            readOnly
            className='h-8 min-w-0 flex-1 font-mono text-xs'
          />
          <CopyButton
            value={props.affiliateLink}
            variant='outline'
            className='size-8 shrink-0'
            iconClassName='size-3.5'
            tooltip={t('Copy referral link')}
            aria-label={t('Copy referral link')}
          />
          {hasRewards ? (
            <Button
              onClick={props.onTransfer}
              disabled={!complianceConfirmed}
              className='h-8 shrink-0 px-3'
              size='sm'
            >
              {t('Transfer to Balance')}
            </Button>
          ) : null}
        </div>
        {complianceConfirmed === false ? (
          <p className='text-muted-foreground text-xs lg:col-span-3'>
            {t(
              'Referral reward transfer is disabled until the administrator confirms compliance terms.'
            )}
          </p>
        ) : null}
      </div>
    </section>
  )
}
