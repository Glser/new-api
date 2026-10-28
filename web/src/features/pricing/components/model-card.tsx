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
import { TooltipHint } from '@/components/ui/tooltip'
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
  type DynamicPriceEntry,
} from '../lib/dynamic-price'
import { getDisplayGroupRatio, isTokenBasedModel } from '../lib/model-helpers'
import { formatPrice, formatRequestPrice } from '../lib/price'
import { taskPriceLabel, taskUsageUnitLabel } from '../lib/task-price-display'
import {
  formatOfficialPrice,
  getOfficialVsSitePrice,
  matchesPrefix,
} from '../lib/usd-price'
import type { PricingModel, PriceType, TokenUnit } from '../types'
import { ModelBillingModeBadge } from './model-billing-mode-badge'
import { ModelPerfBadge, type ModelPerfBadgeData } from './model-perf-badge'
import { PriceDiscountHint } from './price-discount'

const MAX_VISIBLE_CARD_GROUPS = 1

type TokenPricePart = { label: string; text: string }

function formatOfficialAmount(
  amountUSD: number,
  tokenUnit: TokenUnit,
  asUsd: boolean
): string {
  return formatOfficialPrice(amountUSD, asUsd, tokenUnit)
}

function toOfficialTokenPriceParts(
  inputUSD: number | null | undefined,
  outputUSD: number | null | undefined,
  inputLabel: string,
  outputLabel: string,
  tokenUnit: TokenUnit,
  asUsd: boolean
): TokenPricePart[] {
  const parts: TokenPricePart[] = []
  if (inputUSD != null) {
    parts.push({
      label: inputLabel,
      text: formatOfficialAmount(inputUSD, tokenUnit, asUsd),
    })
  }
  if (outputUSD != null) {
    parts.push({
      label: outputLabel,
      text: formatOfficialAmount(outputUSD, tokenUnit, asUsd),
    })
  }
  return parts
}

function toSiteTokenPricePartsFromSummary(
  entries: DynamicPriceEntry[],
  inputLabel: string,
  outputLabel: string
): TokenPricePart[] {
  const parts: TokenPricePart[] = []
  const input = entries.find((entry) => entry.field === 'inputPrice')
  const output = entries.find((entry) => entry.field === 'outputPrice')
  if (input) {
    parts.push({
      label: inputLabel,
      text: input.formattedRange ?? input.formatted,
    })
  }
  if (output) {
    parts.push({
      label: outputLabel,
      text: output.formattedRange ?? output.formatted,
    })
  }
  return parts
}

function toSiteTokenPriceParts(
  model: PricingModel,
  inputLabel: string,
  outputLabel: string,
  tokenUnit: TokenUnit,
  showRechargePrice: boolean,
  priceRate: number,
  usdExchangeRate: number,
  selectedGroup?: string
): TokenPricePart[] {
  return [
    {
      label: inputLabel,
      text: formatPrice(
        model,
        'input',
        tokenUnit,
        showRechargePrice,
        priceRate,
        usdExchangeRate,
        selectedGroup
      ),
    },
    {
      label: outputLabel,
      text: formatPrice(
        model,
        'output',
        tokenUnit,
        showRechargePrice,
        priceRate,
        usdExchangeRate,
        selectedGroup
      ),
    },
  ]
}

function TokenUnitMark(props: { unit: string; name?: string }) {
  return (
    <span className='inline-flex items-baseline gap-x-[3px]'>
      <span>/{props.unit}</span>
      {props.name?.trim() ? <span>{props.name}</span> : null}
    </span>
  )
}

function CompactTokenPricePart(props: {
  part: TokenPricePart
  strike?: boolean
  unit?: string
  unitName?: string
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex items-baseline gap-x-1 whitespace-nowrap',
        props.className
      )}
    >
      <span
        className={cn(
          'text-[11px] leading-none font-medium',
          props.strike
            ? 'text-muted-foreground line-through decoration-muted-foreground/50'
            : 'text-muted-foreground'
        )}
      >
        {props.part.label}
      </span>
      <span
        className={cn(
          'font-mono text-xs leading-none font-semibold tabular-nums tracking-tight',
          props.strike &&
            'text-muted-foreground line-through decoration-muted-foreground/50'
        )}
      >
        {props.part.text}
      </span>
      {props.unit ? (
        <span
          className={cn(
            'text-[10px] leading-none font-normal',
            props.strike
              ? 'text-muted-foreground line-through decoration-muted-foreground/50'
              : 'text-muted-foreground/75'
          )}
        >
          <TokenUnitMark unit={props.unit} name={props.unitName} />
        </span>
      ) : null}
    </span>
  )
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
  const prefixes = currency.modelSquareUsdPricePrefixes
  // 前缀名单只决定「官方」这一行要不要改成美元展示；原价/站内对比
  // 对能算出标价的按量模型都展示，不要求模型名写进名单。
  const showUsdOfficial = useMemo(
    () => matchesPrefix(props.model.model_name, prefixes),
    [props.model.model_name, prefixes]
  )
  const groupMultiplier = getDisplayGroupRatio(props.model, props.selectedGroup)
  const officialVsSite = useMemo(
    () =>
      isTokenBased
        ? getOfficialVsSitePrice(props.model, groupMultiplier, {
            now: billingTime === undefined ? undefined : new Date(billingTime),
            usdOfficial: showUsdOfficial,
          })
        : null,
    [isTokenBased, props.model, groupMultiplier, billingTime, showUsdOfficial]
  )
  const officialPriceParts = useMemo(() => {
    if (officialVsSite?.officialRequestUSD != null) {
      return [
        {
          label: t('Per-call'),
          text: formatOfficialAmount(
            officialVsSite.officialRequestUSD,
            'M',
            showUsdOfficial
          ),
        },
      ]
    }
    return toOfficialTokenPriceParts(
      officialVsSite?.officialInputUSD,
      officialVsSite?.officialOutputUSD,
      t('Input'),
      t('Output'),
      tokenUnit,
      showUsdOfficial
    )
  }, [officialVsSite, showUsdOfficial, t, tokenUnit])
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
  const sitePriceParts = useMemo(() => {
    if (!officialVsSite) return []
    if (officialVsSite.officialRequestUSD != null) {
      const fixed = dynamicSummary?.primaryEntries.find(
        (entry) => entry.field === 'fixedPrice'
      )
      if (fixed) {
        return [
          {
            label: t('Per-call'),
            text: fixed.formattedRange ?? fixed.formatted,
          },
        ]
      }
    }
    const fromExpr = toSiteTokenPricePartsFromSummary(
      dynamicSummary?.primaryEntries ?? [],
      t('Input'),
      t('Output')
    )
    if (fromExpr.length > 0) return fromExpr
    return toSiteTokenPriceParts(
      props.model,
      t('Input'),
      t('Output'),
      tokenUnit,
      showRechargePrice,
      priceRate,
      usdExchangeRate,
      props.selectedGroup
    )
  }, [
    officialVsSite,
    dynamicSummary,
    props.model,
    t,
    tokenUnit,
    showRechargePrice,
    priceRate,
    usdExchangeRate,
    props.selectedGroup,
  ])
  const siteDiscountPercent = officialVsSite?.discountPercent ?? 0
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
            className='inline-flex min-w-0 items-baseline gap-x-1 overflow-hidden whitespace-nowrap'
          >
            <span className='text-muted-foreground shrink-0 text-[11px] leading-none font-medium'>
              {price.label}
            </span>
            <span className='min-w-0 truncate font-mono text-xs leading-none font-semibold tracking-tight tabular-nums'>
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
            <span className='text-muted-foreground/75 shrink-0 text-[10px] leading-none font-normal'>
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

  const requestPriceUnit =
    officialVsSite?.officialRequestUSD != null ? t('request') : tokenUnit
  const requestPriceUnitName =
    officialVsSite?.officialRequestUSD != null ? undefined : tokenUnitName

  return (
    <div
      role='button'
      tabIndex={0}
      onClick={props.onClick}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          props.onClick()
        }
      }}
      className='group/plaza-card relative z-0 min-w-0 cursor-pointer self-start hover:z-10'
    >
      <Card
        data-card-hover='false'
        className={cn(
          'min-w-0 gap-2',
          // 热区留在外层，避免抬起把鼠标移出卡片后反复进入退出。
          // 广场页套在非整数 zoom 上，再 scale 会把文字重新栅格化变虚；
          // 只走 translate + 阴影，合成层平移，字号保持清晰。
          'transition-[translate,box-shadow] duration-500',
          'group-hover/plaza-card:-translate-y-1',
          'group-hover/plaza-card:shadow-[0_1px_2px_rgba(15,23,42,0.05),0_16px_36px_-24px_rgba(15,23,42,0.22)]',
          'dark:group-hover/plaza-card:shadow-[0_18px_50px_-24px_rgba(0,0,0,0.6)]'
        )}
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
          <TooltipHint content={props.model.model_name}>
            <span className='min-w-0 flex-1 truncate font-mono text-base leading-none font-semibold [overflow-wrap:anywhere]'>
              {props.model.model_name}
            </span>
          </TooltipHint>
          <TooltipHint content={t('Copy model name')}>
            <button
              type='button'
              onClick={(event) => {
                event.stopPropagation()
                void copyToClipboard(props.model.model_name || '')
              }}
              aria-label={t('Copy model name')}
              className='text-muted-foreground hover:text-foreground hover:bg-foreground/[0.06] flex size-5 shrink-0 items-center justify-center rounded-md transition-colors'
            >
              {isCopied ? (
                <Check aria-hidden className='size-3' />
              ) : (
                <Copy aria-hidden className='size-3' />
              )}
            </button>
          </TooltipHint>
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
            {officialVsSite && officialPriceParts.length > 0 ? (
              <div className='grid min-w-0 grid-cols-[max-content_max-content_minmax(0,1fr)_max-content_max-content] items-baseline gap-x-1.5 gap-y-0.5'>
                <span className='text-muted-foreground/70 col-start-1 row-start-1 text-left text-[11px] leading-none'>
                  {t('Official price')}
                </span>
                {officialPriceParts[0] && (
                  <CompactTokenPricePart
                    part={officialPriceParts[0]}
                    strike={siteDiscountPercent > 0}
                    unit={
                      officialPriceParts.length === 1
                        ? requestPriceUnit
                        : undefined
                    }
                    unitName={
                      officialPriceParts.length === 1
                        ? requestPriceUnitName
                        : undefined
                    }
                    className='col-start-2 row-start-1 justify-self-start'
                  />
                )}
                {officialPriceParts[1] && (
                  <CompactTokenPricePart
                    part={officialPriceParts[1]}
                    strike={siteDiscountPercent > 0}
                    unit={requestPriceUnit}
                    unitName={requestPriceUnitName}
                    className='col-start-4 row-start-1 justify-self-start'
                  />
                )}
                {siteDiscountPercent > 0 ? (
                  <PriceDiscountHint
                    groupRatio={groupMultiplier}
                    usdOfficial={showUsdOfficial}
                  >
                    <span
                      tabIndex={0}
                      className='bg-destructive/10 text-destructive focus-visible:outline-ring col-start-5 row-start-1 inline-flex shrink-0 cursor-help justify-self-end rounded-full px-1.5 py-px text-[10px] font-semibold whitespace-nowrap tabular-nums focus-visible:outline-2'
                    >
                      -{siteDiscountPercent}%
                    </span>
                  </PriceDiscountHint>
                ) : null}
                <span className='text-muted-foreground col-start-1 row-start-2 text-left text-[11px] leading-none'>
                  {t('Site price')}
                </span>
                {sitePriceParts[0] && (
                  <CompactTokenPricePart
                    part={sitePriceParts[0]}
                    unit={
                      sitePriceParts.length === 1 ? requestPriceUnit : undefined
                    }
                    unitName={
                      sitePriceParts.length === 1
                        ? requestPriceUnitName
                        : undefined
                    }
                    className='col-start-2 row-start-2 justify-self-start'
                  />
                )}
                {sitePriceParts[1] && (
                  <CompactTokenPricePart
                    part={sitePriceParts[1]}
                    unit={requestPriceUnit}
                    unitName={requestPriceUnitName}
                    className='col-start-4 row-start-2 justify-self-start'
                  />
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
              <TooltipHint
                content={`${t('Available groups')}: ${groups.join(', ')}`}
              >
                <span className='text-muted-foreground flex min-w-0 items-center justify-end gap-1 text-[10px]'>
                  <span className='shrink-0'>{t('Available groups')}</span>
                  {visibleGroups.map((group) => (
                    <TooltipHint key={group} content={group}>
                      <span className='max-w-16 truncate'>{group}</span>
                    </TooltipHint>
                  ))}
                  {hiddenGroupCount > 0 ? (
                    <span className='text-muted-foreground/80 shrink-0'>
                      +{hiddenGroupCount}
                    </span>
                  ) : null}
                </span>
              </TooltipHint>
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
    </div>
  )
})
