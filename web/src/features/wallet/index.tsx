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
import { useQuery } from '@tanstack/react-query'
import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useTranslation } from 'react-i18next'

import { SectionPageLayout } from '@/components/layout'
import { useSystemConfig } from '@/hooks/use-system-config'
import { getSelf } from '@/lib/api'
import { requireServerSuccess } from '@/lib/server-error-message'

import { AffiliateRewardsCard } from './components/affiliate-rewards-card'
import { BillingHistoryList } from './components/billing-history-list'
import { CreemConfirmDialog } from './components/dialogs/creem-confirm-dialog'
import { RechargeDialog } from './components/dialogs/recharge-dialog'
import { TransferDialog } from './components/dialogs/transfer-dialog'
import { RedemptionCard } from './components/redemption-card'

import '@/styles/wallet.css'
import { SubscriptionPlansCard } from './components/subscription-plans-card'
import { WalletStatsCard } from './components/wallet-stats-card'
import { PAYMENT_TYPES } from './constants'
import {
  useTopupInfo,
  usePayment,
  useAffiliate,
  useRedemption,
  useCreemPayment,
  useWaffoPayment,
  useWaffoPancakePayment,
} from './hooks'
import {
  getDefaultPaymentType,
  getMinTopupAmount,
  getPaymentMethodMinTopup,
  dispatchSelectedPayment,
} from './lib'
import type {
  UserWalletData,
  PaymentMethod,
  PresetAmount,
  CreemProduct,
  WaffoPayMethod,
} from './types'

interface WalletProps {
  initialShowHistory?: boolean
}

export function Wallet(props: WalletProps) {
  const { t } = useTranslation()
  const {
    data: user = null,
    isPending: userLoading,
    refetch: refetchUser,
  } = useQuery({
    queryKey: ['wallet', 'user'],
    queryFn: async () => {
      const response = requireServerSuccess(await getSelf())
      return (response.data as UserWalletData | undefined) ?? null
    },
  })
  const [topupAmount, setTopupAmount] = useState(0)
  const [selectedPaymentMethod, setSelectedPaymentMethod] =
    useState<PaymentMethod>()
  const [selectedWaffoMethodIndex, setSelectedWaffoMethodIndex] = useState<
    number | null
  >(null)
  const [rechargeDialogOpen, setRechargeDialogOpen] = useState(false)
  const [transferDialogOpen, setTransferDialogOpen] = useState(false)
  const [redemptionCode, setRedemptionCode] = useState('')
  const [historyReloadKey, setHistoryReloadKey] = useState(0)
  const [creemDialogOpen, setCreemDialogOpen] = useState(false)
  const [selectedCreemProduct, setSelectedCreemProduct] =
    useState<CreemProduct | null>(null)

  const { currency } = useSystemConfig()
  const { topupInfo, presetAmounts, loading: topupLoading } = useTopupInfo()

  // Calculate effective exchange rate - when display type is USD, use rate of 1
  const effectiveUsdExchangeRate = useMemo(() => {
    return currency?.quotaDisplayType === 'USD'
      ? 1
      : currency?.usdExchangeRate || 1
  }, [currency?.quotaDisplayType, currency?.usdExchangeRate])
  const {
    amount: paymentAmount,
    calculating,
    processing,
    calculatePaymentAmount,
    processPayment,
  } = usePayment()
  const {
    affiliateLink,
    loading: affiliateLoading,
    transferQuota,
    transferring,
  } = useAffiliate()
  const { redeeming, redeemCode } = useRedemption()
  const { processing: creemProcessing, processCreemPayment } = useCreemPayment()
  const { processing: waffoProcessing, processWaffoPayment } = useWaffoPayment()
  const { processing: pancakeProcessing, processWaffoPancakePayment } =
    useWaffoPancakePayment()

  const fetchUser = useCallback(async () => {
    await refetchUser()
  }, [refetchUser])

  useEffect(() => {
    if (!props.initialShowHistory) return
    const frame = window.requestAnimationFrame(() => {
      document
        .querySelector('#wallet-billing-history')
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      window.history.replaceState({}, '', window.location.pathname)
    })
    return () => window.cancelAnimationFrame(frame)
  }, [props.initialShowHistory])

  // Initialize topup amount when topup info is loaded
  const topupAmountInitializedRef = useRef(false)
  useEffect(() => {
    if (topupInfo && !topupAmountInitializedRef.current) {
      topupAmountInitializedRef.current = true
      const minTopup = getMinTopupAmount(topupInfo)
      setTopupAmount(minTopup)

      // Calculate initial payment amount with default payment type
      const defaultPaymentType = getDefaultPaymentType(topupInfo)
      calculatePaymentAmount(minTopup, defaultPaymentType)
    }
  }, [topupInfo, calculatePaymentAmount])

  // Get current payment type (selected or default)
  const getCurrentPaymentType = useCallback(() => {
    return selectedPaymentMethod?.type || getDefaultPaymentType(topupInfo)
  }, [selectedPaymentMethod, topupInfo])

  // Handle preset selection
  const handleSelectPreset = (preset: PresetAmount) => {
    setTopupAmount(preset.value)
    calculatePaymentAmount(preset.value, getCurrentPaymentType())
  }

  // Handle topup amount change
  const handleTopupAmountChange = (amount: number) => {
    setTopupAmount(amount)
    calculatePaymentAmount(amount, getCurrentPaymentType())
  }

  const handlePaymentMethodSelect = (method: PaymentMethod) => {
    setSelectedPaymentMethod(method)
    setSelectedWaffoMethodIndex(null)
    void calculatePaymentAmount(topupAmount, method.type)
  }

  // Handle payment confirmation
  const handlePaymentConfirm = async () => {
    if (
      !selectedPaymentMethod ||
      calculating ||
      processing ||
      waffoProcessing ||
      pancakeProcessing ||
      !Number.isFinite(paymentAmount) ||
      paymentAmount <= 0 ||
      topupAmount < getPaymentMethodMinTopup(topupInfo, selectedPaymentMethod)
    ) {
      return
    }

    const success = await dispatchSelectedPayment(
      selectedPaymentMethod,
      topupAmount,
      selectedWaffoMethodIndex,
      {
        regular: processPayment,
        waffo: processWaffoPayment,
        waffoPancake: processWaffoPancakePayment,
      }
    )

    if (success) {
      setRechargeDialogOpen(false)
      await fetchUser()
      setHistoryReloadKey((value) => value + 1)
    }
  }

  // Handle redemption
  const handleRedeem = async () => {
    if (!redemptionCode.trim()) return

    const success = await redeemCode(redemptionCode.trim())
    if (success) {
      setRedemptionCode('')
      await fetchUser()
      setHistoryReloadKey((value) => value + 1)
    }
  }

  // Handle transfer
  const handleTransfer = async (amount: number) => {
    const success = await transferQuota(amount)
    if (success) {
      await fetchUser()
    }
    return success
  }

  // Handle Creem product selection
  const handleCreemProductSelect = (product: CreemProduct) => {
    setRechargeDialogOpen(false)
    setSelectedCreemProduct(product)
    setCreemDialogOpen(true)
  }

  // Handle Creem payment confirmation
  const handleCreemConfirm = async () => {
    if (!selectedCreemProduct) return

    const success = await processCreemPayment(selectedCreemProduct.productId)
    if (success) {
      setCreemDialogOpen(false)
      setSelectedCreemProduct(null)
      await fetchUser()
      setHistoryReloadKey((value) => value + 1)
    }
  }

  const handleWaffoMethodSelect = (method: WaffoPayMethod, index: number) => {
    setSelectedPaymentMethod({
      name: method.name,
      type: PAYMENT_TYPES.WAFFO,
      icon: method.icon,
    })
    setSelectedWaffoMethodIndex(index)
    void calculatePaymentAmount(topupAmount, PAYMENT_TYPES.WAFFO)
  }

  return (
    <>
      <SectionPageLayout>
        <SectionPageLayout.Title>
          <span className='truncate text-xl font-bold tracking-tight sm:text-2xl 2xl:text-3xl'>
            {t('Wallet')}
          </span>
        </SectionPageLayout.Title>
        <SectionPageLayout.Content>
          <div className='@container/wallet flex min-w-0 flex-col gap-5 sm:gap-6'>
            <p className='text-muted-foreground text-sm'>
              {t('Balance and top-up management')}
            </p>
            <WalletStatsCard
              user={user}
              loading={userLoading}
              onAddFunds={() => setRechargeDialogOpen(true)}
            >
              <RedemptionCard
                code={redemptionCode}
                onCodeChange={setRedemptionCode}
                onRedeem={handleRedeem}
                redeeming={redeeming}
                enabled={topupInfo?.enable_redemption !== false}
                loading={topupLoading}
                topupLink={topupInfo?.topup_link}
              />
            </WalletStatsCard>

            <SubscriptionPlansCard
              topupInfo={topupInfo}
              userQuota={user?.quota}
              onPurchaseSuccess={fetchUser}
            />

            <AffiliateRewardsCard
              user={user}
              affiliateLink={affiliateLink}
              onTransfer={() => setTransferDialogOpen(true)}
              complianceConfirmed={
                topupInfo?.payment_compliance_confirmed !== false
              }
              loading={affiliateLoading}
            />

            <BillingHistoryList reloadKey={historyReloadKey} />
          </div>
        </SectionPageLayout.Content>
      </SectionPageLayout>

      <RechargeDialog
        open={rechargeDialogOpen}
        onOpenChange={setRechargeDialogOpen}
        topupInfo={topupInfo}
        loading={topupLoading}
        presets={presetAmounts}
        amount={topupAmount}
        onAmountChange={handleTopupAmountChange}
        onPresetSelect={handleSelectPreset}
        paymentAmount={paymentAmount}
        calculating={calculating}
        processing={processing || waffoProcessing || pancakeProcessing}
        selectedMethod={selectedPaymentMethod}
        selectedWaffoIndex={selectedWaffoMethodIndex}
        onMethodSelect={handlePaymentMethodSelect}
        onWaffoSelect={handleWaffoMethodSelect}
        onCreemSelect={handleCreemProductSelect}
        onConfirm={handlePaymentConfirm}
        exchangeRate={effectiveUsdExchangeRate}
      />

      <TransferDialog
        open={transferDialogOpen}
        onOpenChange={setTransferDialogOpen}
        onConfirm={handleTransfer}
        availableQuota={user?.aff_quota ?? 0}
        transferring={transferring}
      />

      <CreemConfirmDialog
        open={creemDialogOpen}
        onOpenChange={setCreemDialogOpen}
        onConfirm={handleCreemConfirm}
        product={selectedCreemProduct}
        processing={creemProcessing}
      />
    </>
  )
}
