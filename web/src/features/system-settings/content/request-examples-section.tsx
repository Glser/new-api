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
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, RotateCcw, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useId, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import {
  CodeBlock,
  CodeBlockCopyButton,
} from '@/components/ai-elements/code-block'
import { ErrorState } from '@/components/error-state'
import { JsonCodeEditor } from '@/components/json-code-editor'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { usePricingData } from '@/features/pricing/hooks/use-pricing-data'
import { buildCurlSample } from '@/features/pricing/lib/request-example'
import type {
  RequestExample,
  RequestExampleAuth,
} from '@/features/pricing/types'
import { requireServerSuccess } from '@/lib/server-error-message'

import { getDefaultRequestExamples, getRequestExamplePaths } from '../api'
import { SettingsPageFormActions } from '../components/settings-page-context'
import { SettingsSection } from '../components/settings-section'
import { useUpdateOption } from '../hooks/use-update-option'

const OPTION_KEY = 'model_plaza_setting.request_examples'
const PREVIEW_MODEL = 'your-model'
const PREVIEW_BASE_URL = 'https://your-domain.com'
// Same rule as the backend: must match a custom endpoint name on a model.
const CUSTOM_PROTOCOL_PATTERN = /^[a-z0-9][a-z0-9_-]{0,63}$/
const NEW_PROTOCOL_EXAMPLE: RequestExample = {
  auth: 'bearer',
  body: { model: '{{model}}' },
}

const AUTH_OPTIONS: { value: RequestExampleAuth; label: string }[] = [
  { value: 'bearer', label: 'Authorization: Bearer' },
  { value: 'x-api-key', label: 'x-api-key' },
  { value: 'query', label: '?key= (URL)' },
]

const HTTP_METHODS = [
  'GET',
  'POST',
  'PUT',
  'PATCH',
  'DELETE',
  'HEAD',
  'OPTIONS',
]

type Draft = {
  path: string
  method: string
  auth: RequestExampleAuth
  headers: string
  body: string
}

/** JSON with sorted keys so equal objects always serialize the same way. */
function canonical(value: unknown): string {
  return JSON.stringify(value, (_key, item: unknown) => {
    if (item && typeof item === 'object' && !Array.isArray(item)) {
      return Object.fromEntries(
        Object.entries(item).sort(([a], [b]) => a.localeCompare(b))
      )
    }
    return item
  })
}

function normalizeExample(example: RequestExample): RequestExample {
  const headers = example.headers ?? {}
  return {
    path: example.path?.trim() || undefined,
    method: example.method || 'POST',
    auth: example.auth,
    ...(Object.keys(headers).length ? { headers } : {}),
    body: example.body,
  }
}

function sameExample(a: RequestExample, b: RequestExample): boolean {
  return canonical(normalizeExample(a)) === canonical(normalizeExample(b))
}

function toDraft(example: RequestExample): Draft {
  return {
    path: example.path ?? '',
    method: example.method || 'POST',
    auth: example.auth,
    headers: JSON.stringify(example.headers ?? {}, null, 2),
    body: JSON.stringify(example.body, null, 2),
  }
}

function parseObject(text: string): Record<string, unknown> | null {
  try {
    const parsed: unknown = JSON.parse(text || '{}')
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>
    }
  } catch {
    /* handled by caller */
  }
  return null
}

function parseDraft(draft: Draft): RequestExample | null {
  const headers = parseObject(draft.headers)
  const body = parseObject(draft.body)
  if (!headers || !body) return null
  return normalizeExample({
    path: draft.path,
    method: draft.method,
    auth: draft.auth,
    headers: headers as Record<string, string>,
    body,
  })
}

function parseOverrides(raw: string): Record<string, RequestExample> {
  const parsed = parseObject(raw)
  return (parsed ?? {}) as Record<string, RequestExample>
}

interface RequestExamplesSectionProps {
  data?: string
}

export function RequestExamplesSection({ data }: RequestExamplesSectionProps) {
  const { t } = useTranslation()
  const fieldId = useId()
  const queryClient = useQueryClient()
  const updateOption = useUpdateOption()
  const { endpointMap } = usePricingData()

  const { data: defaults } = useQuery({
    queryKey: ['request-example-defaults'],
    queryFn: async () =>
      requireServerSuccess(await getDefaultRequestExamples()).data ?? {},
    staleTime: Infinity,
  })

  const requestPathsQuery = useQuery({
    queryKey: ['request-example-paths'],
    queryFn: async () =>
      requireServerSuccess(await getRequestExamplePaths()).data ?? [],
    staleTime: Infinity,
  })
  const requestPaths = requestPathsQuery.data

  const savedOverrides = useMemo(() => parseOverrides(data ?? ''), [data])
  const [protocol, setProtocol] = useState('openai')
  const [drafts, setDrafts] = useState<Record<string, Draft>>({})
  const [newProtocol, setNewProtocol] = useState('')

  const isBuiltIn = useCallback(
    (type: string) => Boolean(defaults?.[type]),
    [defaults]
  )

  // Built-in protocols first, then custom ones, each alphabetically.
  const protocols = useMemo(() => {
    const builtIn = Object.keys(defaults ?? {}).sort()
    const custom = Object.keys(drafts)
      .filter((type) => !isBuiltIn(type))
      .sort()
    return [...builtIn, ...custom]
  }, [defaults, drafts, isBuiltIn])

  const buildDrafts = useCallback(() => {
    const next: Record<string, Draft> = {}
    for (const [type, example] of Object.entries(defaults ?? {})) {
      const saved = savedOverrides[type]
      next[type] = toDraft(
        saved
          ? {
              ...saved,
              path: saved.path || example.path,
              method: saved.method || example.method,
            }
          : example
      )
    }
    for (const [type, example] of Object.entries(savedOverrides)) {
      if (!next[type]) next[type] = toDraft(example)
    }
    return next
  }, [defaults, savedOverrides])

  useEffect(() => {
    setDrafts(buildDrafts())
  }, [buildDrafts])

  const draft = drafts[protocol]
  const defaultExample = defaults?.[protocol]
  const parsedDraft = draft ? parseDraft(draft) : null

  const requestPathOptions = useMemo(() => {
    const paths = new Map<
      string,
      { value: string; label: string; methods: string[] }
    >()
    for (const endpoint of requestPaths ?? []) {
      paths.set(endpoint.path, {
        value: endpoint.path,
        label: endpoint.path,
        methods: endpoint.methods,
      })
    }
    // Keep older overrides selectable without presenting them as built-in routes.
    const saved = savedOverrides[protocol]
    const savedPath = saved?.path?.trim()
    if (savedPath && !paths.has(savedPath)) {
      paths.set(savedPath, {
        value: savedPath,
        label: t('Saved path: {{path}}', { path: savedPath }),
        methods: [saved.method || 'POST'],
      })
    }
    return [...paths.values()].sort((a, b) => a.value.localeCompare(b.value))
  }, [requestPaths, protocol, savedOverrides, t])

  const isCustomized = (type: string) => {
    const example = drafts[type] ? parseDraft(drafts[type]) : null
    const fallback = defaults?.[type]
    return Boolean(example && fallback && !sameExample(example, fallback))
  }

  const isDirty = useMemo(() => {
    const initial = buildDrafts()
    const initialTypes = Object.keys(initial).sort().join(',')
    if (Object.keys(drafts).sort().join(',') !== initialTypes) return true
    return Object.keys(drafts).some((type) => {
      const current = parseDraft(drafts[type])
      const saved = initial[type] ? parseDraft(initial[type]) : null
      // Unparsable edits still count as changes so the user can see the error on save.
      return !current || !saved || !sameExample(current, saved)
    })
  }, [buildDrafts, drafts])

  const updateDraft = (patch: Partial<Draft>) => {
    setDrafts((prev) => ({
      ...prev,
      [protocol]: { ...prev[protocol], ...patch },
    }))
  }

  const restoreDefault = () => {
    if (defaultExample) {
      setDrafts((prev) => ({ ...prev, [protocol]: toDraft(defaultExample) }))
    }
  }

  const addProtocol = () => {
    const name = newProtocol.trim()
    if (!CUSTOM_PROTOCOL_PATTERN.test(name)) {
      toast.error(
        t(
          'Protocol names may only use lowercase letters, digits, - and _ (up to 64 characters).'
        )
      )
      return
    }
    if (drafts[name]) {
      toast.error(t('This protocol already exists.'))
      return
    }
    setDrafts((prev) => ({ ...prev, [name]: toDraft(NEW_PROTOCOL_EXAMPLE) }))
    setProtocol(name)
    setNewProtocol('')
  }

  const deleteProtocol = () => {
    setDrafts((prev) => {
      const next = { ...prev }
      delete next[protocol]
      return next
    })
    setProtocol('openai')
  }

  const onSave = async () => {
    const overrides: Record<string, RequestExample> = {}
    for (const type of protocols) {
      const example = parseDraft(drafts[type])
      if (!example) {
        setProtocol(type)
        toast.error(
          t('{{protocol}}: headers and body must be JSON objects.', {
            protocol: type,
          })
        )
        return
      }
      if (
        example.path &&
        (!example.path.startsWith('/') ||
          example.path.startsWith('//') ||
          /[\\\s#]/.test(example.path))
      ) {
        setProtocol(type)
        toast.error(
          t(
            'Request paths must start with / and cannot contain a domain, whitespace or fragment.'
          )
        )
        return
      }
      const fallback = defaults?.[type]
      if (!fallback || !sameExample(example, fallback)) {
        overrides[type] = example
      }
    }
    const value = Object.keys(overrides).length ? JSON.stringify(overrides) : ''
    const result = await updateOption.mutateAsync({ key: OPTION_KEY, value })
    if (result.success) {
      queryClient.invalidateQueries({ queryKey: ['pricing'] })
    }
  }

  const preview = useMemo(() => {
    if (!parsedDraft) return ''
    const path = (
      parsedDraft.path ||
      defaults?.[protocol]?.path ||
      endpointMap[protocol]?.path ||
      `/<${protocol}>`
    ).replaceAll('{model}', PREVIEW_MODEL)
    return buildCurlSample({
      example: parsedDraft,
      url: `${PREVIEW_BASE_URL}${path}`,
      modelName: PREVIEW_MODEL,
    })
  }, [defaults, endpointMap, parsedDraft, protocol])

  return (
    <SettingsSection title={t('Model Plaza Code Samples')} className='min-w-0'>
      <p className='text-muted-foreground text-sm'>
        {t(
          'Configure the cURL sample shown in model details for each endpoint protocol. Unchanged protocols keep the built-in sample. This only affects what is displayed, not how requests are handled.'
        )}
      </p>

      {requestPathsQuery.isError && (
        <ErrorState
          title={t('Failed to load request paths')}
          onRetry={() => void requestPathsQuery.refetch()}
        />
      )}
      {(!defaults ||
        !draft ||
        (!requestPaths && !requestPathsQuery.isError)) && (
        <p className='text-muted-foreground text-sm'>{t('Loading...')}</p>
      )}
      {defaults && draft && requestPaths && (
        <div className='grid min-w-0 gap-4 lg:grid-cols-2'>
          <div className='flex min-w-0 flex-col gap-4'>
            <div className='flex items-end gap-2'>
              <div className='flex min-w-0 flex-1 flex-col gap-2'>
                <Label>{t('Endpoint protocol')}</Label>
                <Select
                  items={protocols.map((type) => ({
                    value: type,
                    label: type,
                  }))}
                  value={protocol}
                  onValueChange={(value) => value && setProtocol(value)}
                >
                  <SelectTrigger className='w-full'>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent alignItemWithTrigger={false}>
                    <SelectGroup>
                      {protocols.map((type) => (
                        <SelectItem key={type} value={type}>
                          <span className='flex items-center gap-2'>
                            {type}
                            {!isBuiltIn(type) && (
                              <Badge variant='outline'>{t('Custom')}</Badge>
                            )}
                            {isBuiltIn(type) && isCustomized(type) && (
                              <Badge variant='secondary'>
                                {t('Customized')}
                              </Badge>
                            )}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
              {isBuiltIn(protocol) ? (
                <Button
                  type='button'
                  variant='outline'
                  onClick={restoreDefault}
                  disabled={!isCustomized(protocol)}
                >
                  <RotateCcw data-icon='inline-start' />
                  {t('Restore default')}
                </Button>
              ) : (
                <Button
                  type='button'
                  variant='outline'
                  className='text-destructive hover:text-destructive'
                  onClick={deleteProtocol}
                >
                  <Trash2 data-icon='inline-start' />
                  {t('Delete')}
                </Button>
              )}
            </div>

            <div className='flex flex-col gap-2'>
              <div className='flex items-center gap-2'>
                <Input
                  value={newProtocol}
                  onChange={(event) => setNewProtocol(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault()
                      addProtocol()
                    }
                  }}
                  placeholder={t('Custom protocol name, e.g. my-chat')}
                  className='min-w-0 flex-1'
                />
                <Button
                  type='button'
                  variant='outline'
                  onClick={addProtocol}
                  disabled={!newProtocol.trim()}
                >
                  <Plus data-icon='inline-start' />
                  {t('Add protocol')}
                </Button>
              </div>
            </div>

            <FieldGroup className='gap-4'>
              <Field>
                <FieldLabel htmlFor={`${fieldId}-path`}>
                  {t('Request path')}
                </FieldLabel>
                {isBuiltIn(protocol) ? (
                  <Select
                    items={requestPathOptions}
                    value={draft.path.trim() || defaultExample?.path}
                    onValueChange={(path) => {
                      const selected = requestPathOptions.find(
                        (option) => option.value === path
                      )
                      if (selected) {
                        updateDraft({
                          path: selected.value,
                          method: selected.methods.includes(draft.method)
                            ? draft.method
                            : selected.methods[0] || 'POST',
                        })
                      }
                    }}
                  >
                    <SelectTrigger
                      id={`${fieldId}-path`}
                      className='w-full min-w-0'
                    >
                      <SelectValue className='truncate' />
                    </SelectTrigger>
                    <SelectContent alignItemWithTrigger={false}>
                      <SelectGroup>
                        {requestPathOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    id={`${fieldId}-path`}
                    value={draft.path}
                    onChange={(event) =>
                      updateDraft({ path: event.target.value })
                    }
                    placeholder='/v1/images/generations'
                  />
                )}
                {!isBuiltIn(protocol) && (
                  <FieldDescription>
                    {t(
                      'Use a relative path starting with /. Leave empty to use the protocol default or model endpoint. The {model} placeholder is replaced with the model name.'
                    )}
                  </FieldDescription>
                )}
              </Field>
              <Field>
                <FieldLabel htmlFor={`${fieldId}-method`}>
                  {t('HTTP method')}
                </FieldLabel>
                <Select
                  value={draft.method}
                  onValueChange={(method) => method && updateDraft({ method })}
                >
                  <SelectTrigger id={`${fieldId}-method`} className='w-full'>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent alignItemWithTrigger={false}>
                    <SelectGroup>
                      {HTTP_METHODS.map((method) => (
                        <SelectItem key={method} value={method}>
                          {method}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
            </FieldGroup>

            <div className='flex flex-col gap-2'>
              <Label>{t('API key location')}</Label>
              <Select
                items={AUTH_OPTIONS}
                value={draft.auth}
                onValueChange={(value) =>
                  value && updateDraft({ auth: value as RequestExampleAuth })
                }
              >
                <SelectTrigger className='w-full'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent alignItemWithTrigger={false}>
                  <SelectGroup>
                    {AUTH_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>

            <div className='flex flex-col gap-2'>
              <Label>{t('Extra headers (JSON)')}</Label>
              <JsonCodeEditor
                value={draft.headers}
                onChange={(headers) => updateDraft({ headers })}
                heightClassName='min-h-24'
                placeholder='{"anthropic-version": "2023-06-01"}'
              />
            </div>

            <div className='flex flex-col gap-2'>
              <Label>{t('Request body (JSON)')}</Label>
              <JsonCodeEditor
                value={draft.body}
                onChange={(body) => updateDraft({ body })}
                heightClassName='min-h-64'
              />
              <p className='text-muted-foreground text-xs'>
                {t('In the body,')}{' '}
                <code className='bg-muted rounded px-1 py-0.5 font-mono text-[11px]'>
                  {'{{model}}'}
                </code>{' '}
                {t('is replaced with the model name.')}
              </p>
            </div>
          </div>

          <div className='flex min-w-0 flex-col gap-2'>
            <Label>{t('Preview')}</Label>
            {preview ? (
              <CodeBlock
                code={preview}
                language='bash'
                className='my-0 [&_.cm-content]:pl-4!'
                enableCollapse={false}
              >
                <CodeBlockCopyButton />
              </CodeBlock>
            ) : (
              <p className='text-destructive text-sm'>
                {t('Headers and body must be JSON objects.')}
              </p>
            )}
          </div>
        </div>
      )}

      <SettingsPageFormActions
        onSave={() => void onSave()}
        isSaving={updateOption.isPending}
        isSaveDisabled={!defaults || !requestPaths || !isDirty}
        onReset={() => setDrafts(buildDrafts())}
        isResetDisabled={!isDirty}
      />
    </SettingsSection>
  )
}
