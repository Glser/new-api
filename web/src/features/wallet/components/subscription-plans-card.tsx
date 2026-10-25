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
import { RefreshIcon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { useState, useEffect, useMemo, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { StatusBadge } from '@/components/status-badge'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  getPublicPlans,
  getSelfSubscriptionFull,
  updateBillingPreference,
} from '@/features/subscriptions/api'
import { SubscriptionPurchaseDialog } from '@/features/subscriptions/components/dialogs/subscription-purchase-dialog'
import type {
  PlanRecord,
  UserSubscriptionRecord,
} from '@/features/subscriptions/types'
import { useSystemConfig } from '@/hooks/use-system-config'
import { handleServerError } from '@/lib/handle-server-error'
import { requireServerSuccess } from '@/lib/server-error-message'
import { cn } from '@/lib/utils'

import type { PaymentMethod, TopupInfo } from '../types'
import { SubscriptionPlanOption } from './subscription-plan-option'
import { WalletSubscriptionItem } from './wallet-subscription-item'

interface SubscriptionPlansCardProps {
  topupInfo: TopupInfo | null
  userQuota?: number
  onPurchaseSuccess?: () => void | Promise<void>
}

function getEpayMethods(payMethods: PaymentMethod[] = []): PaymentMethod[] {
  return payMethods.filter(
    (m) => m?.type && m.type !== 'stripe' && m.type !== 'creem'
  )
}

function getBillingPreferenceLabel(
  preference: string,
  t: (key: string) => string
): string {
  switch (preference) {
    case 'subscription_first':
      return t('Subscription First')
    case 'wallet_first':
      return t('Wallet First')
    case 'subscription_only':
      return t('Subscription Only')
    case 'wallet_only':
      return t('Wallet Only')
    default:
      return preference
  }
}

export function SubscriptionPlansCard({
  topupInfo,
  userQuota,
  onPurchaseSuccess,
}: SubscriptionPlansCardProps) {
  const { t } = useTranslation()
  useSystemConfig()

  const [plans, setPlans] = useState<PlanRecord[]>([])
  const [activeSubscriptions, setActiveSubscriptions] = useState<
    UserSubscriptionRecord[]
  >([])
  const [allSubscriptions, setAllSubscriptions] = useState<
    UserSubscriptionRecord[]
  >([])
  const [billingPreference, setBillingPreference] =
    useState('subscription_first')
  const [currentTime, setCurrentTime] = useState(() => Date.now() / 1000)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [savingPreference, setSavingPreference] = useState(false)

  const [selectedTab, setSelectedTab] = useState<string | null>(null)
  const [purchaseOpen, setPurchaseOpen] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<PlanRecord | null>(null)

  const enableStripe = !!topupInfo?.enable_stripe_topup
  const enableCreem = !!topupInfo?.enable_creem_topup
  const enableWaffoPancake = !!topupInfo?.enable_waffo_pancake_topup
  const enableOnlineTopUp = !!topupInfo?.enable_online_topup
  const epayMethods = useMemo(
    () => getEpayMethods(topupInfo?.pay_methods),
    [topupInfo?.pay_methods]
  )

  const fetchPlans = useCallback(async () => {
    try {
      const res = requireServerSuccess(await getPublicPlans())
      if (res.success) {
        setPlans(res.data || [])
      }
    } catch (error) {
      handleServerError(error)
      setPlans([])
    }
  }, [])

  const fetchSelfSubscription = useCallback(async () => {
    try {
      const res = requireServerSuccess(await getSelfSubscriptionFull())
      if (res.success && res.data) {
        setBillingPreference(
          res.data.billing_preference || 'subscription_first'
        )
        setActiveSubscriptions(res.data.subscriptions || [])
        setAllSubscriptions(res.data.all_subscriptions || [])
        setCurrentTime(Date.now() / 1000)
      }
    } catch (error) {
      handleServerError(error)
    }
  }, [])

  useEffect(() => {
    const init = async () => {
      setLoading(true)
      await Promise.all([fetchPlans(), fetchSelfSubscription()])
      setLoading(false)
    }
    init()
  }, [fetchPlans, fetchSelfSubscription])

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      await Promise.all([fetchPlans(), fetchSelfSubscription()])
    } finally {
      setRefreshing(false)
    }
  }

  const handlePreferenceChange = async (pref: string) => {
    const previous = billingPreference
    setBillingPreference(pref)
    setSavingPreference(true)
    try {
      const res = await updateBillingPreference(pref)
      if (res.success) {
        toast.success(t('Updated successfully'))
        const normalized = res.data?.billing_preference || pref
        setBillingPreference(normalized)
      } else {
        handleServerError(res, t('Update failed'))
        setBillingPreference(previous)
      }
    } catch (error) {
      handleServerError(error, t('Request failed'))
      setBillingPreference(previous)
    } finally {
      setSavingPreference(false)
    }
  }

  const hasActive = activeSubscriptions.length > 0
  const hasAny = allSubscriptions.length > 0
  const hasPlans = plans.length > 0
  const isAvailable = loading || hasPlans || hasAny
  let visibleTab = selectedTab ?? (hasActive ? 'subscriptions' : 'plans')
  if (!hasPlans) visibleTab = 'subscriptions'
  if (!hasAny) visibleTab = 'plans'
  const disablePref = !hasActive
  const isSubPref =
    billingPreference === 'subscription_first' ||
    billingPreference === 'subscription_only'

  const planPurchaseCountMap = useMemo(() => {
    const map = new Map<number, number>()
    for (const sub of allSubscriptions) {
      const planId = sub?.subscription?.plan_id
      if (!planId) continue
      map.set(planId, (map.get(planId) || 0) + 1)
    }
    return map
  }, [allSubscriptions])

  const planTitleMap = useMemo(() => {
    const map = new Map<number, string>()
    for (const p of plans) {
      if (p?.plan?.id) {
        map.set(p.plan.id, p.plan.title || '')
      }
    }
    return map
  }, [plans])

  const orderedSubscriptions = useMemo(() => {
    const activeIds = new Set(
      activeSubscriptions.map((item) => item.subscription.id)
    )
    return [...allSubscriptions].sort((a, b) => {
      const activeDifference =
        Number(activeIds.has(b.subscription.id)) -
        Number(activeIds.has(a.subscription.id))
      return (
        activeDifference || b.subscription.end_time - a.subscription.end_time
      )
    })
  }, [activeSubscriptions, allSubscriptions])

  if (loading) {
    return (
      <section className='bg-card flex min-w-0 flex-col gap-5 rounded-2xl border p-5 sm:p-6'>
        <Skeleton className='h-5 w-32' />
        <Skeleton className='h-10 w-full' />
        <Skeleton className='h-24 w-full' />
        <Skeleton className='h-9 w-full' />
      </section>
    )
  }
  if (!isAvailable) return null

  return (
    <>
      <section className='bg-card @container/subscriptions min-w-0 overflow-hidden rounded-2xl border'>
        <div className='flex items-start justify-between gap-3 p-5 pb-4 sm:p-6 sm:pb-5'>
          <div>
            <h3 className='text-base font-semibold'>
              {hasPlans ? t('Subscription Plans') : t('My Subscriptions')}
            </h3>
            {hasPlans && (
              <p className='text-muted-foreground mt-1 text-xs leading-relaxed'>
                {t('Subscribe to a plan for model access')}
              </p>
            )}
          </div>
          <div className='flex shrink-0 items-center gap-2'>
            <StatusBadge
              label={
                hasActive
                  ? `${activeSubscriptions.length} ${t('active')}`
                  : t('No Active')
              }
              variant={hasActive ? 'success' : 'neutral'}
              copyable={false}
            />
            <Button
              variant='ghost'
              size='icon'
              onClick={handleRefresh}
              disabled={refreshing}
              aria-label={t('Refresh')}
              title={t('Refresh')}
            >
              <HugeiconsIcon
                icon={RefreshIcon}
                className={cn(
                  refreshing && 'animate-spin motion-reduce:animate-none'
                )}
                aria-hidden='true'
              />
            </Button>
          </div>
        </div>
        <div className='flex flex-col gap-5 px-5 pb-5 sm:px-6 sm:pb-6'>
          <Tabs
            value={visibleTab}
            onValueChange={setSelectedTab}
            className='gap-5'
          >
            {hasPlans && hasAny && (
              <TabsList className='h-10 w-full @min-[32rem]/subscriptions:w-fit'>
                <TabsTrigger value='plans' className='min-w-0 px-3 text-xs'>
                  {t('Available Plans')} ({plans.length})
                </TabsTrigger>
                <TabsTrigger
                  value='subscriptions'
                  className='min-w-0 px-3 text-xs'
                >
                  {t('My Subscriptions')} ({allSubscriptions.length})
                </TabsTrigger>
              </TabsList>
            )}
            {hasPlans && (
              <TabsContent value='plans'>
                <div className='divide-y'>
                  {plans.map((record) => (
                    <SubscriptionPlanOption
                      key={record.plan.id}
                      record={record}
                      purchaseCount={
                        planPurchaseCountMap.get(record.plan.id) || 0
                      }
                      onSelect={(plan) => {
                        setSelectedPlan(plan)
                        setPurchaseOpen(true)
                      }}
                    />
                  ))}
                </div>
              </TabsContent>
            )}
            {hasAny && (
              <TabsContent value='subscriptions'>
                <div
                  className='max-h-96 divide-y overflow-y-auto pr-1'
                  tabIndex={0}
                  role='region'
                  aria-label={t('My Subscriptions')}
                >
                  {orderedSubscriptions.map((record) => (
                    <WalletSubscriptionItem
                      key={record.subscription.id}
                      record={record}
                      currentTime={currentTime}
                      title={planTitleMap.get(record.subscription.plan_id)}
                    />
                  ))}
                </div>
              </TabsContent>
            )}
          </Tabs>
          <Separator />
          <div>
            <div className='flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4'>
              <Label
                htmlFor='wallet-billing-preference'
                className='text-muted-foreground text-xs'
              >
                {t('Billing Preference')}
              </Label>
              <Select
                items={[
                  {
                    value: 'subscription_first',
                    label: (
                      <>
                        {getBillingPreferenceLabel('subscription_first', t)}
                        {disablePref ? ` (${t('No Active')})` : ''}
                      </>
                    ),
                  },
                  {
                    value: 'wallet_first',
                    label: getBillingPreferenceLabel('wallet_first', t),
                  },
                  {
                    value: 'subscription_only',
                    label: (
                      <>
                        {getBillingPreferenceLabel('subscription_only', t)}
                        {disablePref ? ` (${t('No Active')})` : ''}
                      </>
                    ),
                  },
                  {
                    value: 'wallet_only',
                    label: getBillingPreferenceLabel('wallet_only', t),
                  },
                ]}
                disabled={savingPreference || refreshing}
                value={billingPreference}
                onValueChange={(v) => v !== null && handlePreferenceChange(v)}
              >
                <SelectTrigger
                  id='wallet-billing-preference'
                  className='h-9 w-full text-xs sm:w-44'
                >
                  <SelectValue>
                    {getBillingPreferenceLabel(billingPreference, t)}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent alignItemWithTrigger={false}>
                  <SelectGroup>
                    <SelectItem
                      value='subscription_first'
                      disabled={disablePref}
                    >
                      {getBillingPreferenceLabel('subscription_first', t)}
                      {disablePref ? ` (${t('No Active')})` : ''}
                    </SelectItem>
                    <SelectItem value='wallet_first'>
                      {getBillingPreferenceLabel('wallet_first', t)}
                    </SelectItem>
                    <SelectItem
                      value='subscription_only'
                      disabled={disablePref}
                    >
                      {getBillingPreferenceLabel('subscription_only', t)}
                      {disablePref ? ` (${t('No Active')})` : ''}
                    </SelectItem>
                    <SelectItem value='wallet_only'>
                      {getBillingPreferenceLabel('wallet_only', t)}
                    </SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
            {disablePref && isSubPref && (
              <p className='text-muted-foreground mt-2 text-xs'>
                {billingPreference === 'subscription_only'
                  ? t(
                      'Preference saved as {{pref}}, but no active subscription. Requests will be rejected.',
                      { pref: t('Subscription Only') }
                    )
                  : t(
                      'Preference saved as {{pref}}, but no active subscription. Wallet will be used automatically.',
                      { pref: t('Subscription First') }
                    )}
              </p>
            )}
          </div>
        </div>
      </section>

      <SubscriptionPurchaseDialog
        open={purchaseOpen}
        onOpenChange={(open) => {
          setPurchaseOpen(open)
          if (!open) {
            fetchSelfSubscription()
          }
        }}
        plan={selectedPlan}
        enableStripe={enableStripe}
        enableCreem={enableCreem}
        enableWaffoPancake={enableWaffoPancake}
        enableOnlineTopUp={enableOnlineTopUp}
        epayMethods={epayMethods}
        userQuota={userQuota}
        onPurchaseSuccess={onPurchaseSuccess}
        purchaseLimit={
          selectedPlan?.plan?.max_purchase_per_user
            ? Number(selectedPlan.plan.max_purchase_per_user)
            : undefined
        }
        purchaseCount={
          selectedPlan?.plan?.id
            ? planPurchaseCountMap.get(selectedPlan.plan.id)
            : undefined
        }
      />
    </>
  )
}
