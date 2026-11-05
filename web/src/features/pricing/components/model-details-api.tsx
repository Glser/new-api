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
import { ChevronRight, KeyRound, ScrollText, Zap } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import {
  CodeBlock,
  CodeBlockCopyButton,
} from '@/components/ai-elements/code-block'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useStatus } from '@/hooks/use-status'

import { usePricingData } from '../hooks/use-pricing-data'
import { replaceModelInPath } from '../lib/model-helpers'
import { API_KEY_ENV, buildCurlSample } from '../lib/request-example'
import type { PricingModel } from '../types'

// ---------------------------------------------------------------------------
// Code samples section
// ---------------------------------------------------------------------------

function CodeSamplesSection(props: {
  model: PricingModel
  endpointMap: Record<string, { path?: string; method?: string }>
}) {
  const { t } = useTranslation()
  const { status } = useStatus()
  const { requestExamples } = usePricingData()

  const baseUrl = useMemo(() => {
    const candidate =
      (status as Record<string, unknown> | null)?.server_address ??
      (status as Record<string, unknown> | null)?.serverAddress ??
      (status?.data as Record<string, unknown> | undefined)?.server_address ??
      (status?.data as Record<string, unknown> | undefined)?.serverAddress
    if (candidate && typeof candidate === 'string') {
      return candidate.replace(/\/$/, '')
    }
    if (typeof window !== 'undefined') return window.location.origin
    return 'https://api.example.com'
  }, [status])

  const endpoints = useMemo(() => {
    const types = props.model.supported_endpoint_types || []
    return types
      .map((type) => {
        const info = props.endpointMap[type] || {}
        let path = info.path || ''
        if (path && path.includes('{model}')) {
          path = replaceModelInPath(path, props.model.model_name || '')
        }
        return { type, path, method: info.method || 'POST' }
      })
      .filter((e) => Boolean(e.path) && Boolean(requestExamples[e.type]))
  }, [props.model, props.endpointMap, requestExamples])

  const [endpointType, setEndpointType] = useState<string>(
    endpoints[0]?.type ?? ''
  )

  const activeEndpoint = useMemo(() => {
    return endpoints.find((e) => e.type === endpointType) ?? endpoints[0]
  }, [endpointType, endpoints])

  if (endpoints.length === 0 || !activeEndpoint) {
    return null
  }

  const code = buildCurlSample({
    example: requestExamples[activeEndpoint.type],
    url: `${baseUrl}${activeEndpoint.path}`,
    modelName: props.model.model_name || '',
  })

  return (
    <section>
      <SectionTitle icon={ScrollText}>{t('Code samples')}</SectionTitle>

      {endpoints.length > 1 && (
        <Tabs value={endpointType} onValueChange={setEndpointType}>
          <TabsList className='bg-muted/40 h-8 p-0.5'>
            {endpoints.map((ep) => (
              <TabsTrigger
                key={ep.type}
                value={ep.type}
                className='h-7 px-2.5 text-xs'
              >
                {ep.type}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      )}

      <div className={endpoints.length > 1 ? 'mt-3' : undefined}>
        <CodeBlock
          code={code}
          language='bash'
          className='[&_.cm-content]:pl-4!'
        >
          <CodeBlockCopyButton />
        </CodeBlock>
      </div>

      <p className='text-muted-foreground mt-2 text-xs'>
        {t('Replace')}{' '}
        <code className='bg-muted rounded px-1 py-0.5 font-mono text-[11px]'>
          {`$${API_KEY_ENV}`}
        </code>{' '}
        {t('with the API key from your token settings.')}
      </p>
    </section>
  )
}

// ---------------------------------------------------------------------------
// Authentication preview
// ---------------------------------------------------------------------------

function AuthSection() {
  const { t } = useTranslation()
  return (
    <section>
      <SectionTitle icon={KeyRound}>{t('Authentication')}</SectionTitle>
      <div className='border-border/60 bg-muted/20 flex items-start gap-2 rounded-lg border p-3'>
        <ChevronRight className='text-muted-foreground mt-0.5 size-3.5 shrink-0' />
        <div className='space-y-1.5 text-xs leading-relaxed'>
          <p>
            {t('All requests must include')}{' '}
            <code className='bg-muted rounded px-1 py-0.5 font-mono text-[11px]'>
              Authorization: Bearer &lt;TOKEN&gt;
            </code>{' '}
            {t('header. Anthropic-formatted endpoints accept the')}{' '}
            <code className='bg-muted rounded px-1 py-0.5 font-mono text-[11px]'>
              x-api-key
            </code>{' '}
            {t('header instead.')}
          </p>
          <p className='text-muted-foreground'>
            {t(
              'Generate tokens from the Tokens page; you can scope them to specific models, groups, IPs, and rate-limits.'
            )}
          </p>
        </div>
      </div>
    </section>
  )
}

// ---------------------------------------------------------------------------
// Composite API tab
// ---------------------------------------------------------------------------

export function ModelDetailsApi(props: {
  model: PricingModel
  endpointMap: Record<string, { path?: string; method?: string }>
}) {
  return (
    <div className='space-y-6'>
      <CodeSamplesSection model={props.model} endpointMap={props.endpointMap} />
      <AuthSection />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Local UI helpers
// ---------------------------------------------------------------------------

function SectionTitle(props: {
  children: React.ReactNode
  icon: React.ComponentType<{ className?: string }>
}) {
  const Icon = props.icon
  return (
    <h3 className='text-foreground mb-3 flex items-center gap-1.5 text-sm font-semibold'>
      <Icon className='text-muted-foreground/70 size-3.5' />
      {props.children}
    </h3>
  )
}

// Re-export so the parent can keep its own SectionTitle if it wants:
export { Zap as ApiTabIcon }
