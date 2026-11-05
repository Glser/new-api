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
import type { ColumnDef } from '@tanstack/react-table'
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  GitBranch,
  HardDriveDownload,
  HardDriveUpload,
  KeyRound,
  Sparkles,
  type LucideIcon,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { GroupBadge } from '@/components/group-badge'
import { StatusBadge, type StatusBadgeProps } from '@/components/status-badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  TooltipHint,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { getUserGroups } from '@/lib/api'
import { getUserAvatarFallback, getUserAvatarStyle } from '@/lib/avatar'
import {
  formatLogQuota,
  formatTimestampToDate,
  formatTokens,
} from '@/lib/format'
import { requireServerSuccess } from '@/lib/server-error-message'
import { cn } from '@/lib/utils'

import { LOG_TYPE_ALL_VALUE } from '../../constants'
import type { UsageLog } from '../../data/schema'
import {
  formatModelName,
  parseLogOther,
  getReasoningEffortVariant,
} from '../../lib/format'
import {
  CostFormula,
  getHitPriceRatio,
  getOfficialUsdParts,
  HitPriceConfig,
} from '../../lib/hit-pricing'
import {
  isDisplayableLogType,
  isTimingLogType,
  getLogTypeConfig,
} from '../../lib/utils'
import type { LogOtherData } from '../../types'
import { DetailsDialog } from '../dialogs/details-dialog'
import { LogCostDisplay } from '../log-cost-display'
import { LogTokenCell } from '../log-token-cell'
import { ModelBadge } from '../model-badge'
import { TimingMetricsCell, StreamTpsCell } from '../timing-metrics-cell'
import { useUsageLogsContext } from '../usage-logs-provider'

function formatRatioCompact(ratio: number | undefined): string {
  if (ratio == null || !Number.isFinite(ratio)) return '-'
  return ratio % 1 === 0
    ? String(ratio)
    : ratio.toFixed(4).replace(/\.?0+$/, '')
}

function getGroupRatio(other: LogOtherData | null): number | null {
  const userGroupRatio = other?.user_group_ratio
  if (
    userGroupRatio != null &&
    userGroupRatio !== -1 &&
    Number.isFinite(userGroupRatio)
  ) {
    return userGroupRatio
  }

  const groupRatio = other?.group_ratio
  if (groupRatio != null && groupRatio !== 1 && Number.isFinite(groupRatio)) {
    return groupRatio
  }

  return null
}

function renderTokenUsageStat({
  icon: Icon,
  value,
  className,
}: {
  icon: LucideIcon
  value: number
  className: string
}) {
  if (value <= 0) return null

  return (
    <span
      className={cn('inline-flex items-center gap-0.5 tabular-nums', className)}
    >
      <Icon className='size-3 shrink-0' aria-hidden='true' />
      <span>{formatTokens(value)}</span>
    </span>
  )
}

export function useCommonLogsColumns(
  isAdmin: boolean,
  isRoot: boolean,
  activityStyle = false
): ColumnDef<UsageLog>[] {
  const { t } = useTranslation()
  const { data: userGroups } = useQuery({
    queryKey: ['user-groups'],
    queryFn: async () => requireServerSuccess(await getUserGroups()),
    staleTime: 60 * 1000,
  })
  const groups = userGroups?.data
  return useMemo<ColumnDef<UsageLog>[]>(() => {
    const columns: ColumnDef<UsageLog>[] = [
      {
        accessorKey: 'created_at',
        header: t('Time'),
        cell: ({ row }) => {
          const log = row.original
          const timestamp = row.getValue('created_at') as number
          const config = getLogTypeConfig(log.type)

          return (
            <div className='flex min-w-0 items-center justify-center gap-2'>
              <span className='text-foreground shrink-0 text-[12px]! tabular-nums @min-[48rem]/activity:text-[14px]! @min-[80rem]/activity:text-[15px]!'>
                {formatTimestampToDate(timestamp)}
              </span>
              <StatusBadge
                label={t(config.label)}
                variant={config.color as StatusBadgeProps['variant']}
                size='sm'
                copyable={false}
                className='h-5 shrink-0 rounded px-1 text-[10px]! [&_span]:text-[10px]!'
              />
            </div>
          )
        },
        filterFn: (row, _id, value) => {
          if (!Array.isArray(value) || value.length === 0) return true
          if (value.includes(LOG_TYPE_ALL_VALUE)) return true
          return value.includes(String(row.original.type))
        },
        enableHiding: false,
        size: activityStyle ? 156 : 180,
      },
    ]

    if (isAdmin) {
      columns.push(
        {
          id: 'channel',
          header: t('Channel'),
          accessorFn: (row) => row.channel,
          cell: function ChannelCell({ row }) {
            const {
              sensitiveVisible,
              setAffinityTarget,
              setAffinityDialogOpen,
            } = useUsageLogsContext()
            const log = row.original

            if (!isDisplayableLogType(log.type)) return null

            const other = parseLogOther(log.other)
            const affinity = other?.admin_info?.channel_affinity
            const rawUseChannel = other?.admin_info?.use_channel ?? []
            const useChannel = Array.isArray(rawUseChannel)
              ? rawUseChannel.map(String).filter(Boolean)
              : []
            const hasRetryChain = useChannel.length > 1
            const channelChain = hasRetryChain
              ? useChannel.join(' → ')
              : undefined
            const channelDisplay = log.channel_name
              ? `${log.channel_name} #${log.channel}`
              : `#${log.channel}`
            const channelIdDisplay = `#${log.channel}`
            const channelName = sensitiveVisible ? log.channel_name : '••••'
            const multiKeyIndex = other?.admin_info?.multi_key_index
            const showMultiKeyIndex =
              other?.admin_info?.is_multi_key === true &&
              typeof multiKeyIndex === 'number' &&
              Number.isFinite(multiKeyIndex)

            return (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <div className='mx-auto flex max-w-[160px] flex-col items-center gap-0.5' />
                    }
                  >
                    <div className='relative inline-flex w-fit items-center gap-1'>
                      <StatusBadge
                        label={channelIdDisplay}
                        autoColor={String(log.channel)}
                        copyText={String(log.channel)}
                        size='sm'
                        showDot={false}
                        className='font-mono'
                      />
                      {showMultiKeyIndex && (
                        <StatusBadge
                          label={String(multiKeyIndex)}
                          size='sm'
                          showDot={false}
                          copyable={false}
                          variant='neutral'
                          className='h-5 min-w-5 justify-center rounded-full px-1 font-mono text-xs'
                          aria-label={`${t('Key')} ${multiKeyIndex}`}
                        />
                      )}
                      {hasRetryChain && (
                        <Popover>
                          <PopoverTrigger
                            render={
                              <button
                                type='button'
                                className='text-muted-foreground hover:text-foreground focus-visible:ring-ring inline-flex size-5 shrink-0 items-center justify-center rounded-full transition-colors focus-visible:ring-2 focus-visible:outline-none'
                                aria-label={t('Retry Chain')}
                                onClick={(e) => e.stopPropagation()}
                              />
                            }
                          >
                            <GitBranch
                              className='size-3.5 text-amber-500'
                              aria-hidden='true'
                            />
                          </PopoverTrigger>
                          <PopoverContent
                            side='top'
                            align='start'
                            className='w-64 text-xs'
                          >
                            <div className='flex flex-col gap-1'>
                              <p className='font-medium'>{t('Retry Chain')}</p>
                              <p className='text-muted-foreground font-mono break-all'>
                                {channelChain}
                              </p>
                            </div>
                          </PopoverContent>
                        </Popover>
                      )}
                      {affinity && (
                        <button
                          type='button'
                          className='absolute -top-1 -right-1 leading-none text-amber-500'
                          onClick={(e) => {
                            e.stopPropagation()
                            setAffinityTarget({
                              rule_name: affinity.rule_name || '',
                              using_group:
                                affinity.using_group ||
                                affinity.selected_group ||
                                '',
                              key_hint: affinity.key_hint || '',
                              key_fp: affinity.key_fp || '',
                            })
                            setAffinityDialogOpen(true)
                          }}
                        >
                          <Sparkles className='size-3 fill-current' />
                        </button>
                      )}
                    </div>
                    {log.channel_name && (
                      <span className='text-muted-foreground/70 truncate [font-family:var(--font-body)] !text-xs'>
                        {channelName}
                      </span>
                    )}
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className='space-y-1'>
                      <p>
                        {sensitiveVisible ? channelDisplay : channelIdDisplay}
                      </p>
                      {channelChain && (
                        <p className='text-muted-foreground text-xs'>
                          {t('Chain')}: {channelChain}
                        </p>
                      )}
                      {showMultiKeyIndex && (
                        <p className='text-muted-foreground text-xs'>
                          {t('Key')}: {multiKeyIndex}
                        </p>
                      )}
                      {affinity && (
                        <div className='border-t pt-1 text-xs'>
                          <p className='font-medium'>{t('Channel Affinity')}</p>
                          <p>
                            {t('Rule')}: {affinity.rule_name || '-'}
                          </p>
                          <p>
                            {t('Group')}:{' '}
                            {sensitiveVisible
                              ? affinity.using_group ||
                                affinity.selected_group ||
                                '-'
                              : '••••'}
                          </p>
                        </div>
                      )}
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )
          },
        },
        {
          id: 'user',
          header: t('User'),
          accessorFn: (row) => row.username,
          cell: function UserCell({ row }) {
            const {
              sensitiveVisible,
              setSelectedUserId,
              setUserInfoDialogOpen,
            } = useUsageLogsContext()
            const log = row.original

            if (!log.username) return null

            return (
              <button
                type='button'
                className='mx-auto flex w-fit items-center justify-center gap-1.5'
                onClick={(e) => {
                  e.stopPropagation()
                  setSelectedUserId(log.user_id)
                  setUserInfoDialogOpen(true)
                }}
              >
                <Avatar className='ring-border/60 size-5 ring-1 max-sm:hidden'>
                  <AvatarFallback
                    className={cn(
                      'grid size-full place-items-center text-[10px] leading-none font-semibold',
                      !sensitiveVisible && 'bg-muted text-muted-foreground'
                    )}
                    style={
                      sensitiveVisible
                        ? getUserAvatarStyle(log.username)
                        : undefined
                    }
                  >
                    <span className='leading-none'>
                      {sensitiveVisible
                        ? getUserAvatarFallback(log.username)
                        : '•'}
                    </span>
                  </AvatarFallback>
                </Avatar>
                <TooltipProvider delay={300}>
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <span className='text-muted-foreground max-w-[100px] truncate text-sm hover:underline' />
                      }
                    >
                      {sensitiveVisible ? log.username : '••••'}
                    </TooltipTrigger>
                    {sensitiveVisible && log.username.length > 12 && (
                      <TooltipContent side='top'>{log.username}</TooltipContent>
                    )}
                  </Tooltip>
                </TooltipProvider>
              </button>
            )
          },
        }
      )
    }

    columns.push({
      accessorKey: 'token_name',
      header: t('Token'),
      cell: function TokenNameCell({ row }) {
        const { sensitiveVisible } = useUsageLogsContext()
        const log = row.original
        if (!isDisplayableLogType(log.type)) return null

        const other = parseLogOther(log.other)
        if (activityStyle) {
          return (
            <LogTokenCell
              tokenName={log.token_name}
              group={log.group}
              other={other}
              groups={groups}
              sensitiveVisible={sensitiveVisible}
            />
          )
        }

        const tokenName = log.token_name
        if (!tokenName) return null

        const displayName = sensitiveVisible ? tokenName : '••••'
        let group = log.group
        if (!group) group = other?.group || ''
        const groupRatio = getGroupRatio(other)

        return (
          <div
            className={cn(
              'mx-auto flex max-w-[240px] flex-col items-center justify-center gap-0.5 whitespace-nowrap text-center'
            )}
          >
            <TooltipProvider delay={300}>
              <Tooltip>
                <TooltipTrigger render={<div className='max-w-full min-w-0' />}>
                  {activityStyle ? (
                    <span
                      className='block max-w-[12rem] truncate text-[13px] font-medium @min-[48rem]/activity:text-[15px]'
                      title={sensitiveVisible ? tokenName : undefined}
                    >
                      {displayName}
                    </span>
                  ) : (
                    <StatusBadge
                      label={displayName}
                      icon={KeyRound}
                      copyText={sensitiveVisible ? tokenName : undefined}
                      size='sm'
                      showDot={false}
                      className='border-border/60 bg-muted/30 text-foreground h-6 max-w-full gap-1.5 overflow-hidden rounded-md border px-2 py-0.5 [font-family:var(--font-body)] text-xs!'
                    />
                  )}
                </TooltipTrigger>
                {sensitiveVisible && tokenName.length > 16 && (
                  <TooltipContent side='top' className='max-w-xs break-all'>
                    {tokenName}
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
            {(group || groupRatio != null) && (
              <span
                className={cn(
                  'block max-w-full truncate text-xs leading-none',
                  activityStyle && 'text-[10px] @min-[48rem]/activity:text-xs'
                )}
              >
                {group && !activityStyle ? (
                  <GroupBadge
                    group={group}
                    label={sensitiveVisible ? undefined : '••••'}
                    type='text'
                    size='sm'
                    className='inline max-w-full align-baseline text-xs leading-none whitespace-nowrap [&>span]:leading-none [&>span]:whitespace-nowrap'
                  />
                ) : null}
                {group && groupRatio != null && !activityStyle ? ' ' : null}
                {group && activityStyle ? (
                  <span className='text-muted-foreground max-w-36 truncate align-baseline'>
                    {sensitiveVisible ? group : '••••'}
                  </span>
                ) : null}
                {groupRatio != null ? (
                  <span
                    className={cn(
                      'text-muted-foreground/60 relative top-px align-baseline tabular-nums',
                      activityStyle &&
                        'bg-lime-400 rounded px-1 py-px font-semibold text-black'
                    )}
                  >
                    {formatRatioCompact(groupRatio)}x
                  </span>
                ) : null}
              </span>
            )}
          </div>
        )
      },
      size: activityStyle ? 220 : 200,
    })
    columns.push(
      {
        accessorKey: 'model_name',
        header: t('Model'),
        cell: function ModelCell({ row }) {
          const log = row.original
          if (!isDisplayableLogType(log.type)) return null

          const modelInfo = formatModelName(log)
          const other = parseLogOther(log.other)
          const reasoningEffort = other?.reasoning_effort?.trim()

          return (
            <div className='flex min-w-0 items-center justify-center gap-1.5 overflow-hidden whitespace-nowrap'>
              <ModelBadge
                size={activityStyle ? 'md' : 'sm'}
                className={cn(
                  'max-w-full whitespace-nowrap [&_*]:whitespace-nowrap',
                  activityStyle &&
                    'text-[12px]! @min-[48rem]/activity:text-[14px]! [&_span]:text-[12px]! @min-[48rem]/activity:[&_span]:text-[14px]!'
                )}
                modelName={modelInfo.name}
                actualModel={modelInfo.actualModel}
              />
              {activityStyle && reasoningEffort ? (
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
          )
        },
        size: activityStyle ? 240 : 220,
        meta: { mobileTitle: true },
      },
      {
        accessorKey: 'is_stream',
        header: t('Stream'),
        cell: ({ row }) => {
          const log = row.original
          if (!isTimingLogType(log.type)) return null

          const useTime = row.getValue('use_time') as number
          const other = parseLogOther(log.other)
          const tokensPerSecond =
            useTime > 0 && log.completion_tokens > 0
              ? log.completion_tokens / useTime
              : null

          return (
            <StreamTpsCell
              isStream={log.is_stream}
              isTask={other?.is_task === true}
              tokensPerSecond={tokensPerSecond}
              streamStatus={other?.stream_status}
              className='items-center'
            />
          )
        },
        meta: { label: t('Stream') },
      },
      {
        accessorKey: 'prompt_tokens',
        header: 'Tokens',
        cell: ({ row }) => {
          const log = row.original
          if (!isDisplayableLogType(log.type)) return null

          const other = parseLogOther(log.other)

          const promptTokens = log.prompt_tokens || 0
          const completionTokens = log.completion_tokens || 0
          const cacheReadTokens = other?.cache_tokens || 0
          const cacheWrite5m = other?.cache_creation_tokens_5m || 0
          const cacheWrite1h = other?.cache_creation_tokens_1h || 0
          const hasSplitCache = cacheWrite5m > 0 || cacheWrite1h > 0
          const cacheWriteTokens = hasSplitCache
            ? cacheWrite5m + cacheWrite1h
            : other?.cache_creation_tokens || 0

          if (
            promptTokens === 0 &&
            completionTokens === 0 &&
            cacheReadTokens === 0 &&
            cacheWriteTokens === 0
          ) {
            return <span className='text-muted-foreground text-xs'>-</span>
          }

          if (activityStyle) {
            return (
              <Popover>
                <PopoverTrigger
                  render={
                    <button
                      type='button'
                      className='cursor-pointer rounded-sm underline-offset-2 hover:underline'
                      aria-label={t('Tokens')}
                    />
                  }
                >
                  <div className='flex flex-col items-center gap-0.5 text-xs'>
                    {promptTokens > 0 || completionTokens > 0 ? (
                      <span className='inline-flex items-center justify-center gap-x-2'>
                        {renderTokenUsageStat({
                          icon: ArrowDownToLine,
                          value: promptTokens,
                          className: 'text-sky-600 dark:text-sky-400',
                        })}
                        {renderTokenUsageStat({
                          icon: ArrowUpFromLine,
                          value: completionTokens,
                          className: 'text-emerald-600 dark:text-emerald-400',
                        })}
                      </span>
                    ) : null}
                    {cacheReadTokens > 0 || cacheWriteTokens > 0 ? (
                      <span className='inline-flex items-center justify-center gap-x-2'>
                        {renderTokenUsageStat({
                          icon: HardDriveUpload,
                          value: cacheReadTokens,
                          className: 'text-amber-600 dark:text-amber-400',
                        })}
                        {renderTokenUsageStat({
                          icon: HardDriveDownload,
                          value: cacheWriteTokens,
                          className: 'text-violet-600 dark:text-violet-400',
                        })}
                      </span>
                    ) : null}
                  </div>
                </PopoverTrigger>
                <PopoverContent align='center' className='w-auto p-3 text-xs'>
                  <div className='flex flex-col gap-1 whitespace-nowrap tabular-nums'>
                    <div>
                      {t('Input')}: {formatTokens(promptTokens)}， {t('Output')}
                      : {formatTokens(completionTokens)}
                    </div>
                    <div>
                      {t('Cache Read')}: {formatTokens(cacheReadTokens)}，{' '}
                      {t('Cache Write')}: {formatTokens(cacheWriteTokens)}
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            )
          }

          return (
            <div className='flex flex-col gap-0.5'>
              <span className='font-mono text-xs font-medium tabular-nums'>
                {promptTokens.toLocaleString()} /{' '}
                {completionTokens.toLocaleString()}
              </span>
              {(cacheReadTokens > 0 || cacheWriteTokens > 0) && (
                <div className='flex items-center gap-1 text-[11px]'>
                  {cacheReadTokens > 0 && (
                    <span className='text-muted-foreground/60'>
                      {t('Cache')}↓ {cacheReadTokens.toLocaleString()}
                    </span>
                  )}
                  {cacheWriteTokens > 0 && (
                    <span className='text-muted-foreground/60'>
                      ↑ {cacheWriteTokens.toLocaleString()}
                    </span>
                  )}
                </div>
              )}
            </div>
          )
        },
      },
      {
        accessorKey: 'quota',
        header: t('Cost'),
        cell: ({ row }) => {
          const log = row.original
          if (!isDisplayableLogType(log.type)) return null

          const quota = row.getValue('quota') as number
          const other = parseLogOther(log.other)
          if (!activityStyle) {
            return <LogCostDisplay quota={quota} other={other} />
          }

          const officialPrices = getOfficialUsdParts(other)
          const hitPriceRatio = getHitPriceRatio(other)
          const promptTokens = log.prompt_tokens ?? 0
          const completionTokens = log.completion_tokens ?? 0
          const cacheReadTokens = other?.cache_tokens || 0
          const cacheWrite5m = other?.cache_creation_tokens_5m || 0
          const cacheWrite1h = other?.cache_creation_tokens_1h || 0
          const cacheWriteTokens =
            cacheWrite5m > 0 || cacheWrite1h > 0
              ? cacheWrite5m + cacheWrite1h
              : other?.cache_creation_tokens || 0
          const costClassName =
            'text-[12px]! font-medium tabular-nums @min-[48rem]/activity:text-[14px]! @min-[80rem]/activity:text-[15px]!'

          if (!officialPrices) {
            return (
              <span className={costClassName}>{formatLogQuota(quota)}</span>
            )
          }

          return (
            <Popover>
              <PopoverTrigger
                render={
                  <button
                    type='button'
                    className={cn(
                      costClassName,
                      'hover:text-foreground cursor-pointer underline-offset-2 hover:underline'
                    )}
                  />
                }
              >
                {formatLogQuota(quota)}
              </PopoverTrigger>
              <PopoverContent align='center' className='w-auto max-w-sm p-3'>
                <CostFormula
                  parts={officialPrices.parts}
                  perCall={officialPrices.perCall}
                  ratio={hitPriceRatio}
                  quota={quota}
                  tokens={{
                    input: promptTokens,
                    output: completionTokens,
                    cacheRead: cacheReadTokens,
                    cacheWrite: cacheWriteTokens,
                  }}
                />
              </PopoverContent>
            </Popover>
          )
        },
      },

      {
        accessorKey: 'use_time',
        header: t('Timing'),
        cell: ({ row }) => {
          const log = row.original
          if (!isTimingLogType(log.type)) return null

          const useTime = row.getValue('use_time') as number
          const other = parseLogOther(log.other)

          return (
            <TimingMetricsCell
              useTimeSec={useTime}
              completionTokens={log.completion_tokens}
              frtMs={other?.frt}
              isStream={log.is_stream}
              className='justify-center [&_.text-muted-foreground]:text-xs!'
            />
          )
        },
      },

      {
        accessorKey: 'content',
        header: t('Hit price interval'),
        cell: function DetailsCell({ row }) {
          const { t } = useTranslation()
          const [dialogOpen, setDialogOpen] = useState(false)
          const log = row.original
          const other = parseLogOther(log.other)
          const officialPrices = getOfficialUsdParts(other)
          const hitPriceRatio = getHitPriceRatio(other)

          return (
            <>
              <TooltipHint content={t('Click to view full details')}>
                <button
                  type='button'
                  className='mx-auto flex max-w-full items-center justify-center text-xs! text-black/95 underline-offset-2 hover:underline dark:text-white/95'
                  onClick={() => setDialogOpen(true)}
                >
                  {officialPrices ? (
                    <HitPriceConfig
                      parts={officialPrices.parts}
                      displayParts={officialPrices.displayParts}
                      perCall={officialPrices.perCall}
                      ratio={hitPriceRatio}
                      className='max-w-72 flex-wrap justify-center gap-y-0.5 text-xs! whitespace-normal text-black/95 dark:text-white/95 [&>span]:whitespace-nowrap'
                    />
                  ) : (
                    <span className='text-muted-foreground'>-</span>
                  )}
                </button>
              </TooltipHint>
              <DetailsDialog
                log={log}
                isAdmin={isAdmin}
                isRoot={isRoot}
                open={dialogOpen}
                onOpenChange={setDialogOpen}
              />
            </>
          )
        },
        size: 280,
        maxSize: 420,
      }
    )

    return columns
  }, [activityStyle, groups, isAdmin, isRoot, t])
}
