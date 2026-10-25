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
import { Link } from '@tanstack/react-router'
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  HardDriveDownload,
  HardDriveUpload,
  type LucideIcon,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { StatusBadge } from '@/components/status-badge'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { LogTokenCell } from '@/features/usage-logs/components/log-token-cell'
import { ModelBadge } from '@/features/usage-logs/components/model-badge'
import { LOG_TYPE_ENUM } from '@/features/usage-logs/constants'
import type { UsageLog } from '@/features/usage-logs/data/schema'
import {
  formatModelName,
  getReasoningEffortVariant,
  getTieredBillingSummary,
  parseLogOther,
} from '@/features/usage-logs/lib/format'
import { isPerCallBilling } from '@/features/usage-logs/lib/utils'
import type { LogOtherData } from '@/features/usage-logs/types'
import { getUserGroups } from '@/lib/api'
import { formatBillingCurrencyFromUSD } from '@/lib/currency'
import {
  formatLogQuota,
  formatTimestampToDate,
  formatTokens,
} from '@/lib/format'
import { requireServerSuccess } from '@/lib/server-error-message'
import { cn } from '@/lib/utils'

interface UserConsoleActivityProps {
  logs: UsageLog[]
  loading?: boolean
}

type UserGroupInfo = { desc: string; ratio: number | string }
type UserGroupMap = Record<string, UserGroupInfo>

const PRICE_FORMAT_OPTS = {
  digitsLarge: 4,
  digitsSmall: 6,
  abbreviate: false,
} as const

type HitPriceKind = 'input' | 'output' | 'cacheRead' | 'cacheWrite'

type HitPricePart = {
  kind: HitPriceKind
  price: number
}

type HitPriceDisplayPart = {
  key: string
  labelKey: string
  price: number
}

function formatUsdAmount(price: number): string {
  return formatBillingCurrencyFromUSD(price, PRICE_FORMAT_OPTS)
}

function getOfficialUsdParts(other: LogOtherData | null): {
  parts: HitPricePart[]
  perCall: boolean
  displayParts?: HitPriceDisplayPart[]
} | null {
  if (!other) return null
  const summary = getTieredBillingSummary(other, { includeUnusedPrices: true })
  if (summary) {
    const displayParts = summary.priceEntries.map((entry) => ({
      key: entry.field,
      labelKey: entry.shortLabel,
      price: entry.price,
    }))
    const fixed = summary.priceEntries.find(
      (entry) => entry.field === 'fixedPrice'
    )
    if (fixed) {
      return {
        parts: [{ kind: 'input', price: fixed.price }],
        perCall: true,
        displayParts,
      }
    }
    const fieldMap: Record<string, HitPriceKind> = {
      inputPrice: 'input',
      outputPrice: 'output',
      cacheReadPrice: 'cacheRead',
      cacheCreatePrice: 'cacheWrite',
      cacheCreate1hPrice: 'cacheWrite',
    }
    const parts: HitPricePart[] = []
    const seen = new Set<HitPriceKind>()
    for (const entry of summary.priceEntries) {
      const kind = fieldMap[entry.field]
      if (!kind || seen.has(kind)) continue
      seen.add(kind)
      parts.push({ kind, price: entry.price })
    }
    if (displayParts.length > 0) return { parts, perCall: false, displayParts }
  }
  if (isPerCallBilling(other.model_price) && other.model_price != null) {
    return {
      parts: [{ kind: 'input', price: other.model_price }],
      perCall: true,
    }
  }
  if (other.model_ratio != null && Number.isFinite(other.model_ratio)) {
    const inputPrice = other.model_ratio * 2
    const parts: HitPricePart[] = [{ kind: 'input', price: inputPrice }]
    if (
      other.completion_ratio != null &&
      Number.isFinite(other.completion_ratio)
    ) {
      parts.push({ kind: 'output', price: inputPrice * other.completion_ratio })
    }
    if (other.cache_ratio != null && Number.isFinite(other.cache_ratio)) {
      parts.push({ kind: 'cacheRead', price: inputPrice * other.cache_ratio })
    }
    let cacheWriteRatio: number | null = null
    if (
      other.cache_creation_ratio != null &&
      Number.isFinite(other.cache_creation_ratio)
    ) {
      cacheWriteRatio = other.cache_creation_ratio
    } else if (
      other.cache_creation_ratio_1h != null &&
      Number.isFinite(other.cache_creation_ratio_1h)
    ) {
      cacheWriteRatio = other.cache_creation_ratio_1h
    }
    if (cacheWriteRatio != null) {
      parts.push({ kind: 'cacheWrite', price: inputPrice * cacheWriteRatio })
    }
    const displayParts: HitPriceDisplayPart[] = parts
      .filter((part) => part.kind !== 'cacheWrite')
      .map((part) => ({
        key: part.kind,
        labelKey: HIT_PRICE_LABELS[part.kind],
        price: part.price,
      }))
    const cacheWritePrices = [
      {
        key: 'cacheWrite',
        labelKey: 'Cache Write',
        ratio: other.cache_creation_ratio_5m ?? other.cache_creation_ratio,
      },
      {
        key: 'cacheWrite1h',
        labelKey: 'Cache Write (1h)',
        ratio: other.cache_creation_ratio_1h,
      },
    ]
    for (const entry of cacheWritePrices) {
      if (entry.ratio == null || !Number.isFinite(entry.ratio)) continue
      displayParts.push({
        key: entry.key,
        labelKey: entry.labelKey,
        price: inputPrice * entry.ratio,
      })
    }
    return { parts, perCall: false, displayParts }
  }
  return null
}

const HIT_PRICE_LABELS: Record<HitPriceKind, string> = {
  input: 'Input',
  output: 'Output',
  cacheRead: 'Cache Read',
  cacheWrite: 'Cache Write',
}

function CostFormula(props: {
  parts: HitPricePart[]
  perCall: boolean
  ratio: number | null
  quota: number
  tokens: Record<HitPriceKind, number>
}) {
  const { t } = useTranslation()
  const ratio = props.ratio
  if (ratio == null) {
    return <span className='text-muted-foreground'>-</span>
  }

  if (props.perCall) {
    const price = props.parts[0]?.price
    if (price == null) return <span className='text-muted-foreground'>-</span>
    const expr = formatUsdAmount(price * ratio)
    return (
      <span className='block text-xs leading-snug tabular-nums'>
        {expr} = {formatLogQuota(props.quota)}
      </span>
    )
  }

  const terms = props.parts.flatMap((part) => {
    const count = props.tokens[part.kind] ?? 0
    if (count <= 0) return []
    return [
      `${t(HIT_PRICE_LABELS[part.kind])} ${count.toLocaleString()}×${formatUsdAmount(part.price * ratio)}`,
    ]
  })
  if (terms.length === 0) {
    return <span className='text-muted-foreground'>-</span>
  }
  const sum = terms.join(' + ')
  const grouped = terms.length > 1 ? `(${sum})` : sum
  const expr = `${grouped} ÷ 1M`
  return (
    <span className='block text-xs leading-snug break-words tabular-nums'>
      {expr} = {formatLogQuota(props.quota)}
    </span>
  )
}

function HitPriceConfig(props: {
  parts: HitPricePart[]
  displayParts?: HitPriceDisplayPart[]
  perCall: boolean
  ratio: number | null
}) {
  const { t } = useTranslation()
  const ratio = props.ratio
  if (ratio == null) {
    return <span className='text-muted-foreground'>-</span>
  }

  const prices =
    props.displayParts ??
    props.parts.map((part) => ({
      key: part.kind,
      labelKey: HIT_PRICE_LABELS[part.kind],
      price: part.price,
    }))

  return (
    <span className='inline-flex items-center justify-center gap-x-2 whitespace-nowrap'>
      {prices.map((part) => (
        <span key={part.key} className='tabular-nums'>
          {t(part.labelKey)} {formatUsdAmount(part.price * ratio)}
        </span>
      ))}
      {props.perCall || prices.length === 0 ? null : (
        <span className='text-muted-foreground'>/M</span>
      )}
    </span>
  )
}

function UsageStat(props: {
  icon: LucideIcon
  value: number
  className?: string
}) {
  if (props.value <= 0) return null
  const Icon = props.icon
  return (
    <span
      className={cn(
        'inline-flex items-center gap-0.5 tabular-nums',
        props.className
      )}
    >
      <Icon className='size-3 shrink-0' aria-hidden='true' />
      <span>{formatTokens(props.value)}</span>
    </span>
  )
}

function parseConfiguredRatio(
  value: number | string | undefined
): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return null
}

function getGroupRatio(
  other: LogOtherData | null,
  group: string,
  groups: UserGroupMap
): number | null {
  const userGroupRatio = other?.user_group_ratio
  if (
    userGroupRatio != null &&
    userGroupRatio !== -1 &&
    Number.isFinite(userGroupRatio)
  ) {
    return userGroupRatio
  }
  const groupRatio = other?.group_ratio
  if (groupRatio != null && Number.isFinite(groupRatio)) {
    return groupRatio
  }
  return parseConfiguredRatio(groups[group]?.ratio)
}

function ActivityRows(props: {
  logs: UsageLog[]
  loading?: boolean
  groups: UserGroupMap
}) {
  const { t, i18n } = useTranslation()
  const isZh = i18n.language?.startsWith('zh')
  const sep = isZh ? '，' : ', '
  const colon = isZh ? '：' : ': '
  const logs = props.logs.filter(
    (log) =>
      log.type === LOG_TYPE_ENUM.CONSUME || log.type === LOG_TYPE_ENUM.ERROR
  )

  if (props.loading) {
    return ['row-1', 'row-2', 'row-3'].map((key) => (
      <TableRow key={key}>
        <TableCell colSpan={6} className='px-4 sm:px-5'>
          <Skeleton className='h-6 w-full' />
        </TableCell>
      </TableRow>
    ))
  }

  if (logs.length === 0) {
    return (
      <TableRow>
        <TableCell
          colSpan={6}
          className='text-muted-foreground h-16 px-4 text-center sm:px-5'
        >
          {t('No request records yet')}
        </TableCell>
      </TableRow>
    )
  }

  return logs.map((log) => {
    const model = formatModelName(log)
    const other = parseLogOther(log.other)
    const promptTokens = log.prompt_tokens ?? 0
    const completionTokens = log.completion_tokens ?? 0
    const cacheReadTokens = other?.cache_tokens || 0
    const cacheWrite5m = other?.cache_creation_tokens_5m || 0
    const cacheWrite1h = other?.cache_creation_tokens_1h || 0
    const cacheWriteTokens =
      cacheWrite5m > 0 || cacheWrite1h > 0
        ? cacheWrite5m + cacheWrite1h
        : other?.cache_creation_tokens || 0
    const group = (log.group || other?.group || '').trim()
    const groupRatio = getGroupRatio(other, group, props.groups)
    const reasoningEffort = other?.reasoning_effort?.trim()
    const officialPrices = getOfficialUsdParts(other)

    return (
      <TableRow key={log.id}>
        <TableCell className='px-3 text-center'>
          <span className='text-foreground shrink-0 text-[12px]! tabular-nums @min-[48rem]/activity:text-[14px]! @min-[80rem]/activity:text-[15px]!'>
            {formatTimestampToDate(log.created_at)}
          </span>
        </TableCell>
        <TableCell className='max-w-0 overflow-hidden px-3 text-center'>
          <LogTokenCell
            tokenName={log.token_name}
            group={log.group}
            other={other}
            groups={props.groups}
          />
        </TableCell>
        <TableCell className='max-w-0 overflow-hidden px-3 text-center'>
          <div className='flex min-w-0 items-center justify-center gap-1.5 overflow-hidden'>
            <ModelBadge
              size='md'
              className='max-w-[min(100%,13rem)] text-[12px]! @min-[48rem]/activity:text-[14px]! @min-[80rem]/activity:text-[15px]! [&_span]:text-[12px]! @min-[48rem]/activity:[&_span]:text-[14px]! @min-[80rem]/activity:[&_span]:text-[15px]!'
              modelName={model.name}
              actualModel={model.actualModel}
            />
            {reasoningEffort ? (
              <StatusBadge
                size='sm'
                copyable={false}
                label={reasoningEffort}
                title={t('Reasoning level: {{level}}', {
                  level: reasoningEffort,
                })}
                variant={getReasoningEffortVariant(reasoningEffort)}
              />
            ) : null}
          </div>
        </TableCell>
        <TableCell className='px-3 text-center text-xs'>
          {promptTokens > 0 ||
          completionTokens > 0 ||
          cacheReadTokens > 0 ||
          cacheWriteTokens > 0 ? (
            <Popover>
              <PopoverTrigger
                render={
                  <button
                    type='button'
                    className='hover:text-foreground cursor-pointer underline-offset-2 hover:underline'
                  />
                }
              >
                <div className='flex flex-col items-center gap-0.5'>
                  {promptTokens > 0 || completionTokens > 0 ? (
                    <span className='inline-flex items-center justify-center gap-x-2'>
                      <UsageStat
                        icon={ArrowDownToLine}
                        value={promptTokens}
                        className='text-sky-600 dark:text-sky-400'
                      />
                      <UsageStat
                        icon={ArrowUpFromLine}
                        value={completionTokens}
                        className='text-emerald-600 dark:text-emerald-400'
                      />
                    </span>
                  ) : null}
                  {cacheReadTokens > 0 || cacheWriteTokens > 0 ? (
                    <span className='inline-flex items-center justify-center gap-x-2'>
                      <UsageStat
                        icon={HardDriveUpload}
                        value={cacheReadTokens}
                        className='text-amber-600 dark:text-amber-400'
                      />
                      <UsageStat
                        icon={HardDriveDownload}
                        value={cacheWriteTokens}
                        className='text-violet-600 dark:text-violet-400'
                      />
                    </span>
                  ) : null}
                </div>
              </PopoverTrigger>
              <PopoverContent align='center' className='w-auto p-3 text-xs'>
                <div className='flex flex-col gap-1 whitespace-nowrap tabular-nums'>
                  <div>
                    {t('Input')}
                    {colon}
                    {formatTokens(promptTokens)}
                    {sep}
                    {t('Output')}
                    {colon}
                    {formatTokens(completionTokens)}
                  </div>
                  <div>
                    {t('Cache Read')}
                    {colon}
                    {formatTokens(cacheReadTokens)}
                    {sep}
                    {t('Cache Write')}
                    {colon}
                    {formatTokens(cacheWriteTokens)}
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          ) : (
            '-'
          )}
        </TableCell>
        <TableCell className='px-3 text-center text-[12px]! font-medium tabular-nums @min-[48rem]/activity:text-[14px]! @min-[80rem]/activity:text-[15px]!'>
          {officialPrices ? (
            <Popover>
              <PopoverTrigger
                render={
                  <button
                    type='button'
                    className='hover:text-foreground cursor-pointer underline-offset-2 hover:underline'
                  />
                }
              >
                {formatLogQuota(log.quota)}
              </PopoverTrigger>
              <PopoverContent align='center' className='w-auto max-w-sm p-3'>
                <CostFormula
                  parts={officialPrices.parts}
                  perCall={officialPrices.perCall}
                  ratio={groupRatio}
                  quota={log.quota}
                  tokens={{
                    input: promptTokens,
                    output: completionTokens,
                    cacheRead: cacheReadTokens,
                    cacheWrite: cacheWriteTokens,
                  }}
                />
              </PopoverContent>
            </Popover>
          ) : (
            formatLogQuota(log.quota)
          )}
        </TableCell>
        <TableCell className='px-3 text-center text-xs'>
          {officialPrices ? (
            <HitPriceConfig
              parts={officialPrices.parts}
              displayParts={officialPrices.displayParts}
              perCall={officialPrices.perCall}
              ratio={groupRatio}
            />
          ) : (
            <span className='text-muted-foreground'>-</span>
          )}
        </TableCell>
      </TableRow>
    )
  })
}

export function UserConsoleActivity(props: UserConsoleActivityProps) {
  const { t } = useTranslation()
  const groupsQuery = useQuery({
    queryKey: ['user-groups'],
    queryFn: async () => requireServerSuccess(await getUserGroups()),
    staleTime: 60 * 1000,
  })
  const groups = groupsQuery.data?.data ?? {}

  return (
    <section className='bg-card @container/activity min-w-0 overflow-hidden rounded-2xl border'>
      <div className='flex flex-wrap items-start justify-between gap-2 px-3 py-3 @min-[48rem]/console:gap-3 @min-[48rem]/console:px-5'>
        <div>
          <h3 className='text-xs font-semibold @min-[48rem]/console:text-sm'>
            {t('Recent activity')}
          </h3>
          <p className='text-muted-foreground mt-0.5 text-[11px] @min-[48rem]/console:text-xs'>
            {t('Inspect models, status, and cost line by line')}
          </p>
        </div>
        <Button
          variant='outline'
          size='sm'
          className='h-8 text-xs @min-[48rem]/console:text-sm'
          render={
            <Link to='/usage-logs/$section' params={{ section: 'common' }} />
          }
        >
          {t('Full logs')} →
        </Button>
      </div>

      <Table className='min-w-[56rem] table-auto @min-[48rem]/activity:min-w-[68rem] [&_td]:px-2 [&_td]:text-xs @min-[48rem]/activity:[&_td]:text-sm @min-[80rem]/activity:[&_td]:px-3 [&_th]:px-2 [&_th]:text-xs @min-[48rem]/activity:[&_th]:text-sm @min-[80rem]/activity:[&_th]:px-3'>
        <colgroup>
          <col className='w-36 @min-[48rem]/activity:w-44 @min-[80rem]/activity:w-[14%]' />
          <col className='w-32 @min-[48rem]/activity:w-40 @min-[80rem]/activity:w-[12%]' />
          <col className='w-48 @min-[48rem]/activity:w-60 @min-[80rem]/activity:w-[18%]' />
          <col className='w-32 @min-[48rem]/activity:w-40 @min-[80rem]/activity:w-[14%]' />
          <col className='w-24 @min-[48rem]/activity:w-32 @min-[80rem]/activity:w-[10%]' />
          <col className='@min-[80rem]/activity:w-[32%]' />
        </colgroup>
        <TableHeader>
          <TableRow>
            <TableHead className='px-3 text-center'>{t('Time')}</TableHead>
            <TableHead className='px-3 text-center'>{t('Token')}</TableHead>
            <TableHead className='px-3 text-center'>{t('Model')}</TableHead>
            <TableHead className='px-3 text-center'>{t('Usage')}</TableHead>
            <TableHead className='px-3 text-center'>{t('Cost')}</TableHead>
            <TableHead className='px-3 text-center'>
              {t('Hit price interval')}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <ActivityRows
            logs={props.logs}
            loading={props.loading}
            groups={groups}
          />
        </TableBody>
      </Table>
    </section>
  )
}
