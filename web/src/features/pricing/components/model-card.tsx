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
import { Check, Copy } from 'lucide-react'
import { memo, useMemo, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import { useCopyToClipboard } from '@/hooks/use-copy-to-clipboard'
import { getLobeIcon } from '@/lib/lobe-icon'
import { cn } from '@/lib/utils'
import { useSystemConfigStore } from '@/stores/system-config-store'

import { DEFAULT_TOKEN_UNIT } from '../constants'
import { useBillingTime } from '../hooks/use-billing-time'
import {
  getCardExamplePrice,
  getDynamicDisplayGroupRatio,
  getDynamicPriceUnitLabelKey,
  getDynamicPricingSummary,
  isFlatPerRequestExpression,
  isUnconfiguredTaskUsageModel,
} from '../lib/dynamic-price'
import { getDisplayGroupRatio, isTokenBasedModel } from '../lib/model-helpers'
import { formatPrice, formatRequestPrice } from '../lib/price'
import { taskPriceLabel, taskUsageUnitLabel } from '../lib/task-price-display'
import { formatUsdPrice, getOfficialVsSitePrice } from '../lib/usd-price'
import type { PricingModel, PriceType, TokenUnit } from '../types'
import { ModelBillingModeBadge } from './model-billing-mode-badge'
import { ModelPerfBadge, type ModelPerfBadgeData } from './model-perf-badge'


const MAX_VISIBLE_CARD_GROUPS = 1

type TokenPricePart = { label: string; text: string }

function toTokenPriceParts(
  inputUSD: number | null | undefined,
  outputUSD: number | null | undefined,
  inputLabel: string,
  outputLabel: string,
  tokenUnit: TokenUnit
): TokenPricePart[] {
  const parts: TokenPricePart[] = []
  if (inputUSD != null) {
    parts.push({ label: inputLabel, text: formatUsdPrice(inputUSD, tokenUnit) })
  }
  if (outputUSD != null) {
    parts.push({
      label: outputLabel,
      text: formatUsdPrice(outputUSD, tokenUnit),
    })
  }
  return parts
}

function TokenUnitMark(props: { unit: string; name: string }) {
  return (
    <span className='inline-flex items-baseline gap-x-[3px]'>
      <span>/{props.unit}</span>
      <span>{props.name}</span>
    </span>
  )
}

function CompactTokenPriceParts(props: {
  parts: TokenPricePart[]
  strike?: boolean
  unit?: string
  unitName?: string
  className?: string
}) {
  const cells = [0, 1].map((index) => {
    const part = props.parts[index]
    if (!part) {
      return <span key={index} />
    }

    return (
      <span
        key={part.label}
        className={cn(
          'flex min-w-0 items-baseline gap-x-[2px] whitespace-nowrap font-mono tabular-nums',
          index === 1 && 'ps-[9px]',
          props.className
        )}
      >
        <span className='text-muted-foreground font-normal'>{part.label}</span>
        <span
          className={cn(
            props.strike &&
              'text-muted-foreground line-through decoration-muted-foreground/50'
          )}
        >
          {part.text}
          {index === props.parts.length - 1 && props.unit && props.unitName ? (
            <TokenUnitMark unit={props.unit} name={props.unitName} />
          ) : null}
        </span>
      </span>
    )
  })

  return <span className='contents'>{cells}</span>
}

export interface ModelCardProps {
  model: PricingModel
  onClick: () => void
  priceRate?: number
  usdExchangeRate?: number
  tokenUnit?: TokenUnit
  showRechargePrice?: boolean
  selectedGroup?: string
  perf?: ModelPerfBadgeData
}

export const ModelCard = memo(function ModelCard(props: ModelCardProps) {
  const { t, i18n } = useTranslation()
  const { copyToClipboard, copiedText } = useCopyToClipboard({
    successMessage: t('Copy model name'),
  })
  const isCopied = copiedText === props.model.model_name
  const tokenUnit = props.tokenUnit ?? DEFAULT_TOKEN_UNIT
  const priceRate = props.priceRate ?? 1
  const usdExchangeRate = props.usdExchangeRate ?? 1
  const showRechargePrice = props.showRechargePrice ?? false
  const isTokenBased = isTokenBasedModel(props.model)
  const tokenUnitName = t('Tokens')
  const groups = props.model.enable_groups || []
  const visibleGroups = groups.slice(0, MAX_VISIBLE_CARD_GROUPS)
  const hiddenGroupCount = Math.max(groups.length - visibleGroups.length, 0)
  const modelIconKey = props.model.icon || props.model.vendor_icon
  const modelIcon = modelIconKey ? getLobeIcon(modelIconKey, 20) : null
  const initial = props.model.model_name?.charAt(0).toUpperCase() || '?'
  const isUnconfiguredTaskUsage = isUnconfiguredTaskUsageModel(props.model)
  const billingTime = useBillingTime(props.model.billing_expr)
  const currency = useSystemConfigStore((state) => state.config.currency)
  // 官方价 vs 站内价：官方价是配置原价（倍率 1 / 表达式基础档），
  // 站内价是当前分组倍率后的实付价（未选分组时用最低可用分组）。
  const officialVsSite = useMemo(
    () =>
      getOfficialVsSitePrice(
        props.model,
        getDisplayGroupRatio(props.model, props.selectedGroup),
        {
          now: billingTime === undefined ? undefined : new Date(billingTime),
        }
      ),
    [props.model, props.selectedGroup, billingTime]
  )
  const officialPriceParts = useMemo(
    () =>
      toTokenPriceParts(
        officialVsSite?.officialInputUSD,
        officialVsSite?.officialOutputUSD,
        t('Input'),
        t('Output'),
        tokenUnit
      ),
    [officialVsSite, t, tokenUnit]
  )
  const sitePriceParts = useMemo(
    () =>
      toTokenPriceParts(
        officialVsSite?.siteInputUSD,
        officialVsSite?.siteOutputUSD,
        t('Input'),
        t('Output'),
        tokenUnit
      ),
    [officialVsSite, t, tokenUnit]
  )
  const siteDiscountPercent = officialVsSite?.discountPercent ?? 0
  const dynamicPriceOptions = useMemo(
    () => ({
      now: billingTime === undefined ? undefined : new Date(billingTime),
      tokenUnit,
      showRechargePrice,
      priceRate,
      usdExchangeRate,
      groupRatioMultiplier: getDynamicDisplayGroupRatio(
        props.model,
        props.selectedGroup
      ),
    }),
    [
      props.model,
      props.selectedGroup,
      billingTime,
      tokenUnit,
      showRechargePrice,
      priceRate,
      usdExchangeRate,
    ]
  )
  const dynamicSummary = useMemo(
    () => getDynamicPricingSummary(props.model, dynamicPriceOptions),
    // Currency is read indirectly by the price formatter.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [props.model, dynamicPriceOptions, currency]
  )
  const cardExamplePrice = useMemo(
    () => getCardExamplePrice(props.model, dynamicPriceOptions),
    // Currency is read indirectly by the price formatter.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [props.model, dynamicPriceOptions, currency]
  )
  let priceSummary: ReactNode
  if (dynamicSummary) {
    if (dynamicSummary.isSpecialExpression) {
      priceSummary = (
        <div className='min-w-0'>
          <span className='text-warning'>
            {t('Special billing expression')}
          </span>
          <code className='text-muted-foreground mt-1 line-clamp-2 block font-mono text-xs break-all'>
            {dynamicSummary.rawExpression}
          </code>
        </div>
      )
    } else if (dynamicSummary.primaryEntries.length > 0) {
      priceSummary = (
        // 多个条目横排且不折行：窄卡片下靠各自 truncate 收缩，
        // 而不是把输入/输出拆成上下两行。
        <div className='flex min-w-0 items-baseline gap-x-2'>
          {dynamicSummary.primaryEntries
            .slice(0, dynamicSummary.providerCount ? 2 : undefined)
            .map((entry) => {
              const unitLabelKey = getDynamicPriceUnitLabelKey(entry)
              const unitLabel = taskUsageUnitLabel(
                entry,
                i18n.language,
                unitLabelKey ? t(unitLabelKey) : `${tokenUnit} ${tokenUnitName}`
              )
              let label: ReactNode = null
              if (entry.labelKind !== 'schema') {
                label = t(entry.shortLabel)
              } else {
                label = taskPriceLabel(
                  entry.description,
                  entry.shortLabel,
                  i18n.language
                )
              }
              return (
                <span
                  key={entry.key}
                  className='flex min-w-0 flex-wrap items-baseline gap-x-1.5 font-mono text-[11px] leading-tight font-semibold tabular-nums'
                >
                  {label && (
                    <span className='text-muted-foreground text-[10px] font-normal'>
                      {label}
                    </span>
                  )}
                  <span>{entry.formattedRange ?? entry.formatted}</span>
                  <span className='text-muted-foreground text-[10px] font-normal whitespace-nowrap'>
                    /{unitLabel}
                  </span>
                </span>
              )
            })}
          {dynamicSummary.isTimePricing && (
            <span className='text-muted-foreground text-[10px]'>
              {t('Current period price')}
            </span>
          )}
          {dynamicSummary.isMixedBilling && (
            <span className='text-muted-foreground text-[10px]'>
              {t('Token or per-call pricing')}
            </span>
          )}
          {cardExamplePrice && (
            <span className='text-muted-foreground text-[10px] break-words'>
              {cardExamplePrice.label} ≈ {cardExamplePrice.formatted}
            </span>
          )}
          {dynamicSummary.isTaskUsage &&
            dynamicSummary.tier?.label &&
            !dynamicSummary.primaryEntries.some(
              (entry) => entry.formattedRange
            ) && (
              <span className='text-muted-foreground text-[10px] break-words'>
                ({dynamicSummary.tier.label})
              </span>
            )}
        </div>
      )
    } else {
      // 徽标已按「表达式是否只是固定单价」分流，价格行沿用同一结论，
      // 避免出现「按次计费 + 动态计费」这种自相矛盾的组合。
      if (dynamicSummary.hasUnconfiguredProviders) {
        priceSummary = (
          <span className='text-muted-foreground text-[10px]'>
            {t('Usage-based billing · price not configured')}
          </span>
        )
      } else if (isFlatPerRequestExpression(props.model.billing_expr)) {
        priceSummary = (
          <span className='font-mono text-[11px] leading-tight font-semibold tabular-nums'>
            {formatRequestPrice(
              props.model,
              showRechargePrice,
              priceRate,
              usdExchangeRate,
              props.selectedGroup
            )}
            <span className='text-muted-foreground ms-1 text-[10px] font-normal'>
              /{t('request')}
            </span>
          </span>
        )
      } else {
        priceSummary = (
          <span className='text-muted-foreground text-[10px]'>
            {t('Dynamic Pricing')}
          </span>
        )
      }
    }
  } else if (isUnconfiguredTaskUsage) {
    priceSummary = (
      <span className='text-muted-foreground text-[10px]'>
        {t('Usage-based billing · price not configured')}
      </span>
    )
  } else if (isTokenBased) {
    const prices: { type: PriceType; label: string }[] = [
      { type: 'input', label: t('Input') },
      { type: 'output', label: t('Output') },
    ]
    priceSummary = (
      <div className='flex min-w-0 items-baseline gap-x-2'>
        {prices.map((price) => (
          <span
            key={price.type}
            className='flex min-w-0 items-baseline gap-x-1 font-mono text-[11px] leading-tight font-semibold tabular-nums'
          >
            <span className='text-muted-foreground text-[10px] font-normal'>
              {price.label}
            </span>
            <span>
              {formatPrice(
                props.model,
                price.type,
                tokenUnit,
                showRechargePrice,
                priceRate,
                usdExchangeRate,
                props.selectedGroup
              )}
            </span>
            <span className='text-muted-foreground text-[10px] font-normal'>
              <TokenUnitMark unit={tokenUnit} name={tokenUnitName} />
            </span>
          </span>
        ))}
      </div>
    )
  } else {
    priceSummary = (
      <span className='flex min-w-0 items-baseline gap-x-1 font-mono text-[11px] leading-tight font-semibold tabular-nums'>
        <span className='text-muted-foreground text-[10px] font-normal'>
          {t('Price')}
        </span>
        <span>
          {formatRequestPrice(
            props.model,
            showRechargePrice,
            priceRate,
            usdExchangeRate,
            props.selectedGroup
          )}
        </span>
        <span className='text-muted-foreground text-[10px] font-normal'>
          /{t('request')}
        </span>
      </span>
    )
  }

  return (
    <Card
      role='button'
      tabIndex={0}
      onClick={props.onClick}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          props.onClick()
        }
      }}
      className='hover:ring-foreground/20 h-full min-w-0 cursor-pointer gap-2 transition-colors'
    >
      <CardHeader className='flex flex-row items-center gap-2'>
        <div
          aria-hidden
          className='bg-muted/50 flex size-8 shrink-0 items-center justify-center rounded-md'
        >
          {modelIcon || (
            <span className='text-muted-foreground text-[10px] font-bold'>
              {initial}
            </span>
          )}
        </div>
        <span
          title={props.model.model_name}
          className='min-w-0 flex-1 truncate font-mono text-xs leading-none font-semibold [overflow-wrap:anywhere]'
        >
          {props.model.model_name}
        </span>
        <button
          type='button'
          onClick={(event) => {
            event.stopPropagation()
            void copyToClipboard(props.model.model_name || '')
          }}
          title={t('Copy model name')}
          aria-label={t('Copy model name')}
          className='text-muted-foreground hover:text-foreground hover:bg-foreground/[0.06] flex size-5 shrink-0 items-center justify-center rounded-md transition-colors'
        >
          {isCopied ? (
            <Check aria-hidden className='size-3' />
          ) : (
            <Copy aria-hidden className='size-3' />
          )}
        </button>
      </CardHeader>
      <CardContent className='flex flex-1 flex-col gap-2'>
        <p className='text-muted-foreground line-clamp-2 min-h-8 text-[11px] leading-4 break-words'>
          {props.model.description || ' '}
        </p>
        <div
          role='group'
          aria-label={t('Pricing')}
          className='mt-auto flex min-w-0 flex-col gap-0.5'
        >
          {officialVsSite ? (
            <div className='grid min-w-0 grid-cols-[auto_auto_minmax(0,1fr)_auto] items-baseline gap-x-1.5 gap-y-0.5'>
              <span className='text-muted-foreground/70 text-[10px] leading-tight'>
                {t('Official price')}:
              </span>
              <CompactTokenPriceParts
                parts={officialPriceParts}
                strike={siteDiscountPercent > 0}
                unit={tokenUnit}
                unitName={tokenUnitName}
                className='text-[10px] font-medium'
              />
              <span />
              <span className='text-muted-foreground text-[10px] leading-tight'>
                {t('Site price')}:
              </span>
              <CompactTokenPriceParts
                parts={sitePriceParts}
                unit={tokenUnit}
                unitName={tokenUnitName}
                className='text-[11px] font-semibold'
              />
              {siteDiscountPercent > 0 ? (
                <span
                  className='bg-destructive/10 text-destructive shrink-0 translate-x-[5px] justify-self-end rounded-full px-1.5 py-px text-[10px] font-semibold tabular-nums'
                  title={`${t('Official price')} · ${t('% off', { percent: siteDiscountPercent })}`}
                >
                  -{siteDiscountPercent}%
                </span>
              ) : (
                <span />
              )}
            </div>
          ) : (
            <div className='min-w-0 font-mono text-[11px] leading-tight font-semibold tabular-nums'>
              {priceSummary}
            </div>
          )}
        </div>
        {/* 计费标签靠左，可用分组靠右；分组过多时收成 +N */}
        <div className='flex min-w-0 items-center justify-between gap-2'>
          <ModelBillingModeBadge
            model={props.model}
            className='bg-foreground/[0.05] border-border/60 text-foreground/75 -ms-1 shrink-0 rounded-md border px-1.5 py-px text-[10px] font-medium'
          />
          {groups.length > 0 && (
            <span
              className='text-muted-foreground flex min-w-0 items-center justify-end gap-1 text-[10px]'
              title={`${t('Available groups')}: ${groups.join(', ')}`}
            >
              <span className='shrink-0'>{t('Available groups')}</span>
              {visibleGroups.map((group) => (
                <span key={group} className='max-w-16 truncate' title={group}>
                  {group}
                </span>
              ))}
              {hiddenGroupCount > 0 ? (
                <span className='text-muted-foreground/80 shrink-0'>
                  +{hiddenGroupCount}
                </span>
              ) : null}
            </span>
          )}
        </div>
      </CardContent>
      <CardFooter className='mt-auto border-0 bg-transparent pt-0'>
        <ModelPerfBadge
          perf={props.perf}
          className='border-border/60 border-t pt-2'
        />
      </CardFooter>
    </Card>
  )
})
