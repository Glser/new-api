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
import { useQueryClient } from '@tanstack/react-query'
import type { ColumnDef, RowSelectionState } from '@tanstack/react-table'
import {
  Check,
  CheckCircle2,
  Copy,
  Gauge,
  Info,
  Loader2,
  Settings,
} from 'lucide-react'
import {
  type ChangeEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import {
  DataTablePagination,
  DataTableView,
  useDataTable,
} from '@/components/data-table'
import {
  sideDrawerContentClassName,
  sideDrawerFooterClassName,
  sideDrawerFormClassName,
  sideDrawerHeaderClassName,
} from '@/components/drawer-layout'
import { StatusBadge } from '@/components/status-badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Combobox } from '@/components/ui/combobox'
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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Switch } from '@/components/ui/switch'
import {
  TooltipHint,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { useCopyToClipboard } from '@/hooks/use-copy-to-clipboard'
import { useIsMobile } from '@/hooks/use-mobile'
import { cn } from '@/lib/utils'

import {
  channelsQueryKeys,
  formatResponseTime,
  handleTestChannel,
} from '../../lib'
import type {
  Channel,
  GetChannelsResponse,
  SearchChannelsResponse,
} from '../../types'
import { useChannels } from '../channels-provider'

type ChannelTestDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

type ChannelTestDialogContentProps = ChannelTestDialogProps & {
  currentRow: Channel
}

type ModelRow = {
  model: string
}

type TestStatus = 'idle' | 'testing' | 'success' | 'error'

type TestResult = {
  status: TestStatus
  responseTime?: number
  completedAt?: number
  error?: string
  errorCode?: string
}

type BatchProgress = {
  total: number
  completed: number
  success: number
  failed: number
}

type ChannelTestCachePatch = {
  responseTime: number
  testTime: number
}

type LatestChannelTestCachePatch = {
  patch: ChannelTestCachePatch
  completedAt: number
}

type ChannelListCache = GetChannelsResponse | SearchChannelsResponse

function createChannelTestCachePatch(
  responseTime?: number,
  completedAt = Date.now()
): ChannelTestCachePatch | undefined {
  if (typeof responseTime !== 'number' || !Number.isFinite(responseTime)) {
    return undefined
  }

  return {
    responseTime,
    testTime: Math.floor(completedAt / 1000),
  }
}

function getLatestChannelTestCachePatch(
  results: TestResult[]
): ChannelTestCachePatch | undefined {
  const latest = results.reduce<LatestChannelTestCachePatch | undefined>(
    (latestPatch, result) => {
      const completedAt = result.completedAt ?? 0
      const patch = createChannelTestCachePatch(
        result.responseTime,
        completedAt
      )
      if (!patch) return latestPatch
      if (!latestPatch || completedAt >= latestPatch.completedAt) {
        return { patch, completedAt }
      }
      return latestPatch
    },
    undefined
  )

  return latest?.patch
}

const endpointTypeOptions: Array<{ value: string; label: string }> = [
  { value: 'auto', label: 'Auto detect (default)' },
  { value: 'openai', label: 'OpenAI (/v1/chat/completions)' },
  { value: 'openai-response', label: 'OpenAI Responses (/v1/responses)' },
  {
    value: 'openai-response-compact',
    label: 'OpenAI Response Compaction (/v1/responses/compact)',
  },
  { value: 'anthropic', label: 'Anthropic (/v1/messages)' },
  {
    value: 'gemini',
    label: 'Gemini (/v1beta/models/{model}:generateContent)',
  },
  { value: 'jina-rerank', label: 'Jina Rerank (/v1/rerank)' },
  {
    value: 'image-generation',
    label: 'Image Generation (/v1/images/generations)',
  },
  { value: 'embeddings', label: 'Embeddings (/v1/embeddings)' },
]

const STREAM_INCOMPATIBLE_ENDPOINTS = new Set([
  'embeddings',
  'image-generation',
  'jina-rerank',
  'openai-response-compact',
])

const MODEL_PRICE_ERROR_CODE = 'model_price_error'
const FAILURE_SUMMARY_MAX_LENGTH = 96
const BATCH_TEST_CONCURRENCY = 5
const BATCH_TEST_DELAY_MS = 100

type FailureStatusDisplay = {
  summary: string
  details?: string
}

type FailureDetailsState = {
  model: string
  summary: string
  details: string
}

function sleep(ms: number) {
  return new Promise<void>((resolve) => window.setTimeout(resolve, ms))
}

function normalizeInlineError(errorText: string) {
  return errorText.replaceAll(/\s+/g, ' ').trim()
}

function getFirstErrorLine(errorText: string) {
  return errorText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find(Boolean)
}

function truncateFailureSummary(summary: string) {
  if (summary.length <= FAILURE_SUMMARY_MAX_LENGTH) {
    return summary
  }

  return `${summary.slice(0, FAILURE_SUMMARY_MAX_LENGTH).trimEnd()}...`
}

function getFailureStatusDisplay({
  errorText,
  fallbackSummary,
  isModelPriceError,
  modelPriceSummary,
}: {
  errorText?: string
  fallbackSummary: string
  isModelPriceError: boolean
  modelPriceSummary: string
}): FailureStatusDisplay {
  const rawError = errorText?.trim()

  if (!rawError) {
    return { summary: fallbackSummary }
  }

  if (isModelPriceError) {
    return {
      summary: modelPriceSummary,
      details: rawError === modelPriceSummary ? undefined : rawError,
    }
  }

  const firstLine = getFirstErrorLine(rawError) ?? rawError
  const summary = truncateFailureSummary(normalizeInlineError(firstLine))
  const normalizedRawError = normalizeInlineError(rawError)

  return {
    summary,
    details: summary === normalizedRawError ? undefined : rawError,
  }
}

function getTestTableColumnClass(
  columnId: string,
  kind: 'header' | 'cell' = 'cell'
) {
  const align =
    kind === 'header'
      ? 'px-2.5 text-center [&>div]:mx-auto [&>div]:text-center'
      : 'px-2.5 py-2.5 text-center'
  switch (columnId) {
    case 'select':
      return cn(align, 'w-10 [&:has([role=checkbox])]:px-2.5')
    case 'model':
      return cn(align, 'w-40 max-w-40')
    case 'status':
      return cn(align, 'w-24 whitespace-nowrap')
    case 'result':
      return cn(align, 'min-w-0 whitespace-normal')
    case 'actions':
      return cn(align, 'w-12')
    default:
      return align
  }
}

export function ChannelTestDialog({
  open,
  onOpenChange,
}: ChannelTestDialogProps) {
  const { currentRow } = useChannels()

  if (!currentRow) {
    return null
  }

  return (
    <ChannelTestDialogContent
      key={currentRow.id}
      open={open}
      onOpenChange={onOpenChange}
      currentRow={currentRow}
    />
  )
}

function ChannelTestDialogContent({
  open,
  onOpenChange,
  currentRow,
}: ChannelTestDialogContentProps) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const currentChannelId = currentRow.id
  const batchStopRequestedRef = useRef(false)
  const batchProgressToastIdRef = useRef<ReturnType<
    typeof toast.loading
  > | null>(null)
  const [endpointType, setEndpointType] = useState('auto')
  const [isStreamTest, setIsStreamTest] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [testResults, setTestResults] = useState<Record<string, TestResult>>({})
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
  const [testingModels, setTestingModels] = useState<Set<string>>(
    () => new Set()
  )
  const [isBatchTesting, setIsBatchTesting] = useState(false)
  const [isBatchStopRequested, setIsBatchStopRequested] = useState(false)
  const [batchProgress, setBatchProgress] = useState<BatchProgress | null>(null)
  const [failureDetails, setFailureDetails] =
    useState<FailureDetailsState | null>(null)
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 30,
  })
  const endpointSelectItems = useMemo(
    () =>
      endpointTypeOptions.map((option) => ({
        value: option.value,
        label: t(option.label),
      })),
    [t]
  )

  const dismissBatchProgressToast = useCallback(() => {
    if (batchProgressToastIdRef.current === null) return

    toast.dismiss(batchProgressToastIdRef.current)
    batchProgressToastIdRef.current = null
  }, [])

  useEffect(() => {
    if (!batchProgress) {
      dismissBatchProgressToast()
      return
    }

    const title = isBatchStopRequested
      ? t('Stopping batch test...')
      : t('Batch testing models...')
    const completedText = t('{{completed}}/{{total}} completed', {
      completed: batchProgress.completed,
      total: batchProgress.total,
    })
    const resultText = t('{{success}} succeeded, {{failed}} failed', {
      success: batchProgress.success,
      failed: batchProgress.failed,
    })

    batchProgressToastIdRef.current = toast.loading(title, {
      id: batchProgressToastIdRef.current ?? undefined,
      description: `${completedText} · ${resultText}`,
    })
  }, [batchProgress, dismissBatchProgressToast, isBatchStopRequested, t])

  useEffect(() => dismissBatchProgressToast, [dismissBatchProgressToast])

  const resetState = useCallback(() => {
    batchStopRequestedRef.current = true
    setEndpointType('auto')
    setIsStreamTest(false)
    setSearchTerm('')
    setTestResults({})
    setRowSelection({})
    setTestingModels(() => new Set())
    setIsBatchTesting(false)
    setIsBatchStopRequested(false)
    setBatchProgress(null)
    setFailureDetails(null)
    setPagination({ pageIndex: 0, pageSize: 30 })
  }, [])

  const streamDisabled = STREAM_INCOMPATIBLE_ENDPOINTS.has(endpointType)
  const effectiveStreamTest = !streamDisabled && isStreamTest

  const handleEndpointTypeChange = useCallback((value: string | null) => {
    if (value === null) return

    setEndpointType(value)
    if (STREAM_INCOMPATIBLE_ENDPOINTS.has(value)) {
      setIsStreamTest(false)
    }
  }, [])

  const handleSearchTermChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setSearchTerm(event.target.value)
      setPagination((prev) =>
        prev.pageIndex === 0 ? prev : { ...prev, pageIndex: 0 }
      )
    },
    []
  )

  const modelsValue = currentRow.models
  const defaultTestModel = currentRow.test_model?.trim()

  const baseModels = useMemo(() => {
    if (!modelsValue) return []
    return modelsValue
      .split(',')
      .map((model) => model.trim())
      .filter(Boolean)
  }, [modelsValue])

  const models = baseModels

  const successModels = useMemo(
    () => models.filter((model) => testResults[model]?.status === 'success'),
    [models, testResults]
  )

  const filteredModels = useMemo(() => {
    if (!searchTerm) return models
    const keyword = searchTerm.toLowerCase()
    return models.filter((model) => model.toLowerCase().includes(keyword))
  }, [models, searchTerm])

  const tableData = useMemo<ModelRow[]>(
    () => filteredModels.map((model) => ({ model })),
    [filteredModels]
  )

  const selectedModels = useMemo(
    () => Object.keys(rowSelection).filter((model) => rowSelection[model]),
    [rowSelection]
  )
  const modelsToTest =
    selectedModels.length > 0 ? selectedModels : filteredModels

  const markModelTesting = useCallback((key: string, isTesting: boolean) => {
    setTestingModels((prev) => {
      const next = new Set(prev)
      if (isTesting) {
        next.add(key)
      } else {
        next.delete(key)
      }
      return next
    })
  }, [])

  const updateTestResult = useCallback((key: string, result: TestResult) => {
    setFailureDetails((current) => (current?.model === key ? null : current))
    setTestResults((prev) => ({
      ...prev,
      [key]: result,
    }))
  }, [])

  const updateChannelTestCache = useCallback(
    (patch?: ChannelTestCachePatch) => {
      if (!patch) return

      queryClient.setQueriesData<ChannelListCache>(
        { queryKey: channelsQueryKeys.lists() },
        (oldData) => {
          const data = oldData?.data
          if (!oldData || !data?.items.length) return oldData

          let changed = false
          const nextItems = data.items.map((channel) => {
            if (channel.id !== currentChannelId) return channel

            changed = true
            return {
              ...channel,
              response_time: patch.responseTime,
              test_time: patch.testTime,
            }
          })

          if (!changed) return oldData

          return {
            ...oldData,
            data: {
              ...data,
              items: nextItems,
            },
          }
        }
      )
    },
    [currentChannelId, queryClient]
  )

  const refreshChannelLists = useCallback(
    (patch?: ChannelTestCachePatch) => {
      updateChannelTestCache(patch)
      void queryClient
        .invalidateQueries({ queryKey: channelsQueryKeys.lists() })
        .then(() =>
          queryClient.invalidateQueries({ queryKey: ['topology-graph'] })
        )
        .then(() => updateChannelTestCache(patch))
        .catch(() => undefined)
    },
    [queryClient, updateChannelTestCache]
  )

  const testSingleModel = useCallback(
    async (
      model: string,
      silent = false,
      refreshList = true
    ): Promise<TestResult | undefined> => {
      if (!currentRow) return

      markModelTesting(model, true)
      updateTestResult(model, { status: 'testing' })
      let finalResult: TestResult | undefined

      try {
        await handleTestChannel(
          currentRow.id,
          {
            channelName: currentRow.name,
            testModel: model,
            endpointType: endpointType === 'auto' ? undefined : endpointType,
            stream: effectiveStreamTest || undefined,
            silent,
          },
          (success, responseTime, error, errorCode) => {
            const completedAt = Date.now()
            finalResult = {
              status: success ? 'success' : 'error',
              responseTime,
              completedAt,
              error,
              errorCode,
            }
            updateTestResult(model, finalResult)
          }
        )
      } catch (error: unknown) {
        finalResult = {
          status: 'error',
          completedAt: Date.now(),
          error: error instanceof Error ? error.message : t('Test failed'),
        }
        updateTestResult(model, finalResult)
      } finally {
        markModelTesting(model, false)
        if (refreshList) {
          refreshChannelLists(
            createChannelTestCachePatch(
              finalResult?.responseTime,
              finalResult?.completedAt
            )
          )
        }
      }
      return finalResult
    },
    [
      currentRow,
      endpointType,
      effectiveStreamTest,
      markModelTesting,
      refreshChannelLists,
      t,
      updateTestResult,
    ]
  )

  const handleStopBatchTest = useCallback(() => {
    if (!isBatchTesting || isBatchStopRequested) return

    batchStopRequestedRef.current = true
    setIsBatchStopRequested(true)
  }, [isBatchStopRequested, isBatchTesting])

  const handleBatchTest = useCallback(
    async (modelsToTest: string[]) => {
      const uniqueModels = [
        ...new Set(modelsToTest.map((model) => model.trim()).filter(Boolean)),
      ]
      if (!uniqueModels.length) return

      batchStopRequestedRef.current = false
      setIsBatchTesting(true)
      setIsBatchStopRequested(false)
      setBatchProgress({
        total: uniqueModels.length,
        completed: 0,
        success: 0,
        failed: 0,
      })

      let resultPatch: ChannelTestCachePatch | undefined
      const results: TestResult[] = []
      let completedCount = 0
      let successCount = 0
      let failedCount = 0

      try {
        const createFallbackResult = (error?: unknown): TestResult => ({
          status: 'error',
          completedAt: Date.now(),
          error: error instanceof Error ? error.message : t('Test failed'),
        })

        const recordBatchResult = (result: TestResult) => {
          results.push(result)
          completedCount += 1
          if (result.status === 'success') {
            successCount += 1
          }
          failedCount = completedCount - successCount

          setBatchProgress({
            total: uniqueModels.length,
            completed: completedCount,
            success: successCount,
            failed: failedCount,
          })
        }

        for (
          let startIndex = 0;
          startIndex < uniqueModels.length;
          startIndex += BATCH_TEST_CONCURRENCY
        ) {
          if (batchStopRequestedRef.current) {
            break
          }

          const batch = uniqueModels.slice(
            startIndex,
            startIndex + BATCH_TEST_CONCURRENCY
          )
          const batchPromises = batch.map(async (modelName) => {
            try {
              const result = await testSingleModel(modelName, true, false)
              const finalResult = result ?? createFallbackResult()
              if (!result) {
                updateTestResult(modelName, finalResult)
              }
              recordBatchResult(finalResult)
              return finalResult
            } catch (error: unknown) {
              const fallbackResult = createFallbackResult(error)
              updateTestResult(modelName, fallbackResult)
              recordBatchResult(fallbackResult)
              return fallbackResult
            }
          })

          await Promise.allSettled(batchPromises)

          if (
            batchStopRequestedRef.current ||
            startIndex + BATCH_TEST_CONCURRENCY >= uniqueModels.length
          ) {
            break
          }

          await sleep(BATCH_TEST_DELAY_MS)
        }

        resultPatch = getLatestChannelTestCachePatch(results)
        const stopped =
          batchStopRequestedRef.current && completedCount < uniqueModels.length

        dismissBatchProgressToast()
        if (stopped) {
          toast.info(
            t(
              'Batch test stopped: {{completed}}/{{total}} completed, {{success}} succeeded, {{failed}} failed',
              {
                completed: completedCount,
                total: uniqueModels.length,
                success: successCount,
                failed: failedCount,
              }
            )
          )
        } else if (failedCount > 0) {
          toast.error(
            t(
              'Batch test completed: {{success}} succeeded, {{failed}} failed',
              {
                success: successCount,
                failed: failedCount,
              }
            )
          )
        } else {
          toast.success(
            t('Batch test completed: {{count}} succeeded', {
              count: successCount,
            })
          )
        }
      } finally {
        batchStopRequestedRef.current = false
        setIsBatchTesting(false)
        setIsBatchStopRequested(false)
        setBatchProgress(null)
        setRowSelection({})
        refreshChannelLists(resultPatch)
      }
    },
    [
      dismissBatchProgressToast,
      refreshChannelLists,
      t,
      testSingleModel,
      updateTestResult,
    ]
  )

  const handleSelectSuccessfulModels = useCallback(() => {
    setRowSelection(() => {
      const next: RowSelectionState = {}
      for (const model of successModels) {
        next[model] = true
      }
      return next
    })
  }, [successModels])

  const handleClose = useCallback(() => {
    resetState()
    onOpenChange(false)
  }, [onOpenChange, resetState])

  const handleDialogOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen) {
        handleClose()
      }
    },
    [handleClose]
  )

  const isAnyTesting = testingModels.size > 0 || isBatchTesting
  const testAllButtonLabel = t('Test {{count}} models', {
    count: modelsToTest.length,
  })

  const columns = useMemo<ColumnDef<ModelRow>[]>(
    () => [
      {
        id: 'select',
        header: ({ table }) => (
          <Checkbox
            checked={table.getIsAllRowsSelected()}
            indeterminate={
              table.getIsSomeRowsSelected() && !table.getIsAllRowsSelected()
            }
            onCheckedChange={(value) => table.toggleAllRowsSelected(!!value)}
            aria-label={t('Select all models')}
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
            aria-label={t('Select model {{model}}', {
              model: row.original.model,
            })}
          />
        ),
        enableSorting: false,
        enableHiding: false,
        size: 40,
      },
      {
        accessorKey: 'model',
        header: t('Model'),
        enableSorting: false,
        cell: ({ row }) => {
          const model = row.original.model
          const isDefault = defaultTestModel === model

          return (
            <div className='mx-auto flex min-w-0 max-w-full items-center justify-center gap-1.5'>
              <TooltipHint content={model}>
                <span className='truncate font-medium'>{model}</span>
              </TooltipHint>
              {isDefault && (
                <StatusBadge
                  label={t('Default')}
                  variant='info'
                  size='sm'
                  copyable={false}
                />
              )}
            </div>
          )
        },
      },
      {
        id: 'status',
        header: t('Status'),
        cell: ({ row }) => {
          const model = row.original.model
          const result = testResults[model]
          return <TestStatusCell result={result} />
        },
        enableSorting: false,
        size: 112,
      },
      {
        id: 'result',
        header: t('Result'),
        cell: ({ row }) => {
          const model = row.original.model
          const result = testResults[model]
          return (
            <TestResultCell
              result={result}
              model={model}
              onOpenDetails={setFailureDetails}
            />
          )
        },
        enableSorting: false,
        size: 320,
      },
      {
        id: 'actions',
        header: t('Actions'),
        cell: ({ row }) => {
          const model = row.original.model
          const isTestingModel = testingModels.has(model)

          return (
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    variant='ghost'
                    size='icon-sm'
                    onClick={() => testSingleModel(model)}
                    disabled={isTestingModel || isBatchTesting}
                    aria-label={t('Test Connection')}
                  />
                }
              >
                {isTestingModel ? (
                  <Loader2 className='size-4 animate-spin' />
                ) : (
                  <Gauge className='size-4' />
                )}
              </TooltipTrigger>
              <TooltipContent>{t('Test Connection')}</TooltipContent>
            </Tooltip>
          )
        },
        enableSorting: false,
      },
    ],
    [
      defaultTestModel,
      isBatchTesting,
      t,
      testResults,
      testingModels,
      testSingleModel,
    ]
  )

  const { table } = useDataTable({
    data: tableData,
    columns,
    rowSelection,
    pagination,
    enableRowSelection: true,
    getRowId: (row) => row.model,
    onRowSelectionChange: setRowSelection,
    onPaginationChange: setPagination,
    withFilteredRowModel: false,
    withSortedRowModel: false,
    withFacetedRowModel: false,
  })

  return (
    <>
      <Dialog open={open} onOpenChange={handleDialogOpenChange}>
        <DialogContent
          initialFocus={false}
          className='flex max-h-[90vh] w-full flex-col gap-0 overflow-hidden p-0 sm:w-[48rem] sm:max-w-[calc(100%-2rem)]'
        >
          <DialogHeader className='flex-row items-center gap-2.5 border-b px-4 py-3'>
            <IconBadge
              size='md'
              className='rounded-full bg-[#c4f82a] text-[#28350a]'
            >
              <Gauge />
            </IconBadge>
            <div className='min-w-0 flex-1 pr-8'>
              <DialogTitle className='truncate text-base font-semibold tracking-tight'>
                {t('Test Channel Connection')}
                <span className='text-muted-foreground font-normal'>
                  {' · '}
                  {currentRow.name}
                </span>
              </DialogTitle>
              <DialogDescription className='sr-only'>
                {t("Run connection tests against this channel's models.")}
              </DialogDescription>
            </div>
          </DialogHeader>

          <div className='flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 py-3'>
            <div className='flex flex-nowrap items-center gap-2'>
              <TooltipHint
                content={t(
                  'Override the endpoint used for testing. Leave empty to auto detect.'
                )}
              >
                <div className='w-52 shrink-0'>
                  <Combobox
                    options={endpointSelectItems}
                    value={endpointType}
                    onValueChange={handleEndpointTypeChange}
                    id='endpoint-type'
                    aria-label={t('Endpoint Type')}
                    className='h-8 w-full min-w-0 rounded-lg'
                    placeholder={t('Auto detect (default)')}
                    openOnFocus={false}
                    showClear={false}
                  />
                </div>
              </TooltipHint>
              <TooltipHint
                content={t('Enable streaming mode for the test request.')}
              >
                <div className='flex h-8 shrink-0 items-center gap-2 rounded-lg border px-2.5'>
                  <Label htmlFor='stream-toggle' className='text-xs'>
                    {t('Stream Mode')}
                  </Label>
                  <Switch
                    id='stream-toggle'
                    checked={effectiveStreamTest}
                    onCheckedChange={setIsStreamTest}
                    disabled={streamDisabled}
                  />
                </div>
              </TooltipHint>
              <Input
                placeholder={t('Filter models...')}
                value={searchTerm}
                onChange={handleSearchTermChange}
                className='h-8 w-48 shrink-0'
              />
              <div className='ml-auto flex shrink-0 items-center gap-2'>
              {isBatchTesting ? (
                <Button
                  variant='outline'
                  size='sm'
                  onClick={handleStopBatchTest}
                  disabled={isBatchStopRequested}
                >
                  {isBatchStopRequested ? t('Stopping...') : t('Stop testing')}
                </Button>
              ) : (
                <>
                  <Button
                    shine
                    size='sm'
                    onClick={() => handleBatchTest(modelsToTest)}
                    disabled={isAnyTesting || modelsToTest.length === 0}
                  >
                    <Gauge data-icon='inline-start' />
                    {testAllButtonLabel}
                  </Button>
                  {successModels.length > 0 && (
                    <Button
                      variant='outline'
                      size='sm'
                      onClick={handleSelectSuccessfulModels}
                    >
                      <CheckCircle2 data-icon='inline-start' />
                      {t('Select successful models ({{count}})', {
                        count: successModels.length,
                      })}
                    </Button>
                  )}
                </>
              )}
              </div>
            </div>

            <div className='min-h-0 flex-1 space-y-2 max-sm:has-[div[role="toolbar"]]:pb-16'>
              <DataTableView
                table={table}
                containerClassName='w-full overflow-hidden rounded-xl border'
                containerProps={{
                  role: 'region',
                  'aria-label': t('Channel models'),
                }}
                tableContainerClassName='max-h-[min(36rem,58dvh)] overflow-auto'
                tableClassName='w-full table-fixed'
                colgroup={
                  <colgroup>
                    <col className='w-10' />
                    <col className='w-40' />
                    <col className='w-24' />
                    <col />
                    <col className='w-12' />
                  </colgroup>
                }
                getColumnClassName={getTestTableColumnClass}
                emptyContent={
                  models.length
                    ? t('No models matched your search.')
                    : t('This channel has no configured models.')
                }
                emptyCellClassName='text-muted-foreground h-16 text-center text-sm'
              />
              <DataTablePagination table={table} />
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <FailureDetailsSheet
        details={failureDetails}
        onOpenChange={(sheetOpen) => {
          if (!sheetOpen) {
            setFailureDetails(null)
          }
        }}
      />
    </>
  )
}

function TestStatusCell({ result }: { result?: TestResult }) {
  const { t } = useTranslation()

  if (!result || result.status === 'idle') {
    return (
      <StatusBadge label={t('Not tested')} variant='neutral' copyable={false} />
    )
  }

  if (result.status === 'testing') {
    return (
      <StatusBadge variant='info' copyable={false}>
        <Loader2 className='size-3.5 shrink-0 animate-spin' />
        <span className='min-w-0 truncate leading-normal'>
          {t('Testing...')}
        </span>
      </StatusBadge>
    )
  }

  if (result.status === 'success') {
    return (
      <StatusBadge label={t('Success')} variant='success' copyable={false} />
    )
  }

  return <StatusBadge label={t('Failed')} variant='danger' copyable={false} />
}

function TestResultCell({
  result,
  model,
  onOpenDetails,
}: {
  result?: TestResult
  model: string
  onOpenDetails: (details: FailureDetailsState) => void
}) {
  const { t } = useTranslation()

  if (!result || result.status === 'idle') {
    return <span className='text-muted-foreground text-sm'>-</span>
  }

  if (result.status === 'testing') {
    return (
      <div className='text-muted-foreground inline-flex items-center justify-center gap-1.5 text-sm'>
        <Loader2 className='size-4 shrink-0 animate-spin' />
        <span>{t('Testing...')}</span>
      </div>
    )
  }

  if (result.status === 'success') {
    return typeof result.responseTime === 'number' ? (
      <span className='text-muted-foreground text-sm'>
        {formatResponseTime(result.responseTime, t)}
      </span>
    ) : (
      <span className='text-muted-foreground text-sm'>-</span>
    )
  }

  return (
    <FailureResultContent
      result={result}
      model={model}
      onOpenDetails={onOpenDetails}
    />
  )
}

function FailureResultContent({
  result,
  model,
  onOpenDetails,
}: {
  result: TestResult
  model: string
  onOpenDetails: (details: FailureDetailsState) => void
}) {
  const { t } = useTranslation()
  const errorText = result.error?.trim()
  const isModelPriceError = result.errorCode === MODEL_PRICE_ERROR_CODE
  const modelPriceSummary = t(
    'Model price is not configured. Please complete model pricing in settings.'
  )
  const { summary, details } = getFailureStatusDisplay({
    errorText,
    fallbackSummary: t('Test failed'),
    isModelPriceError,
    modelPriceSummary,
  })

  return (
    <div className='mx-auto flex max-w-md flex-col items-center gap-1.5 text-center text-xs'>
      <p className='text-muted-foreground line-clamp-2 leading-snug wrap-break-word'>
        {summary}
      </p>
      <div className='flex flex-wrap items-center justify-center gap-1.5'>
        {isModelPriceError && (
          <Button
            variant='outline'
            size='sm'
            className='h-7 w-fit px-2 text-xs'
            onClick={() =>
              window.open('/system-settings/billing/model-pricing', '_blank')
            }
          >
            <Settings className='mr-1 h-3 w-3 shrink-0' />
            {t('Go to Settings')}
          </Button>
        )}
        {details && (
          <Button
            variant='ghost'
            size='sm'
            className='h-7 w-fit px-2 text-xs'
            aria-haspopup='dialog'
            onClick={() => onOpenDetails({ model, summary, details })}
          >
            <Info className='mr-1 h-3 w-3 shrink-0' />
            {t('Details')}
          </Button>
        )}
      </div>
    </div>
  )
}

function FailureDetailsSheet({
  details,
  onOpenChange,
}: {
  details: FailureDetailsState | null
  onOpenChange: (open: boolean) => void
}) {
  const { t } = useTranslation()
  const isMobile = useIsMobile()
  const { copiedText, copyToClipboard } = useCopyToClipboard({ notify: false })

  return (
    <Sheet open={Boolean(details)} onOpenChange={onOpenChange}>
      <SheetContent
        side={isMobile ? 'bottom' : 'right'}
        className={
          isMobile
            ? sideDrawerContentClassName('h-auto max-h-[85dvh] rounded-t-xl')
            : sideDrawerContentClassName('sm:max-w-lg')
        }
      >
        {details && (
          <>
            <SheetHeader className={sideDrawerHeaderClassName('sm:px-5')}>
              <SheetTitle className='pr-10'>{t('Details')}</SheetTitle>
              <SheetDescription className='pr-10 wrap-break-word'>
                {details.model}
              </SheetDescription>
            </SheetHeader>
            <div className={sideDrawerFormClassName('gap-4 sm:px-5')}>
              <section className='space-y-1'>
                <div className='text-muted-foreground text-xs font-medium'>
                  {t('Model')}
                </div>
                <p className='text-sm font-medium break-all'>{details.model}</p>
              </section>
              <section className='space-y-1'>
                <div className='text-muted-foreground text-xs font-medium'>
                  {t('Failed')}
                </div>
                <p className='text-muted-foreground text-sm leading-relaxed wrap-break-word'>
                  {details.summary}
                </p>
              </section>
              <section className='space-y-2'>
                <div className='text-muted-foreground text-xs font-medium'>
                  {t('Details')}
                </div>
                <pre className='bg-muted/30 text-muted-foreground m-0 max-w-full rounded-md border p-3 text-xs leading-relaxed wrap-break-word whitespace-pre-wrap'>
                  {details.details}
                </pre>
              </section>
            </div>
            <SheetFooter className={sideDrawerFooterClassName('sm:px-5')}>
              <Button
                variant='outline'
                className='w-full sm:w-auto'
                onClick={() => copyToClipboard(details.details)}
              >
                {copiedText === details.details ? (
                  <Check className='mr-2 h-4 w-4 text-green-600' />
                ) : (
                  <Copy className='mr-2 h-4 w-4' />
                )}
                {t('Copy')}
              </Button>
            </SheetFooter>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
