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
import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import * as z from 'zod'

import { JsonCodeEditor } from '@/components/json-code-editor'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'

import { SettingsForm } from '../components/settings-form-layout'
import { SettingsPageFormActions } from '../components/settings-page-context'
import { SettingsSection } from '../components/settings-section'
import { useUpdateOption } from '../hooks/use-update-option'
import { formatJsonForEditor, normalizeJsonString } from './utils'

interface AgentShowcaseItem {
  id: string
  name: string
  tag: string
  description: string
  guide_url: string
  icon_key: string
  accent_color: string
}

const DEFAULT_AGENTS: AgentShowcaseItem[] = [
  {
    id: 'chatgpt',
    name: 'ChatGPT Work(Codex)',
    tag: 'Codex Agent',
    description: 'OpenAI 官方编程智能体，终端与云端任务一站调度',
    guide_url: 'https://api.oioi.lat/pages/codex-guide/#codex/install',
    icon_key: 'Codex.Color',
    accent_color: '#10a37f',
  },
  {
    id: 'claude-code',
    name: 'Claude Code',
    tag: 'CLI Agent',
    description: 'Anthropic 终端编程智能体，长上下文推理与自动重构',
    guide_url: 'https://api.oioi.lat/pages/codex-guide/#agent/workbuddy',
    icon_key: 'ClaudeCode.Color',
    accent_color: '#d97706',
  },
  {
    id: 'workbuddy',
    name: 'WorkBuddy',
    tag: 'Agent',
    description: '企业协同研发智能体，贯通需求、编码与交付全流程',
    guide_url: 'https://api.oioi.lat/pages/codex-guide/#agent/workbuddy',
    icon_key: 'CodeBuddy.Color',
    accent_color: '#3b82f6',
  },
  {
    id: 'hermes',
    name: 'Hermes',
    tag: 'Autonomous',
    description: '高阶自主智能体，复杂工具调用与多步任务自动执行',
    guide_url: 'https://api.oioi.lat/pages/codex-guide/#agent/hermes',
    icon_key: 'HermesAgent',
    accent_color: '#ec4899',
  },
  {
    id: 'trae',
    name: 'Trae',
    tag: 'AI IDE',
    description: 'AI 原生 IDE，上下文感知的编码、调试与重构体验',
    guide_url: 'https://api.oioi.lat/pages/codex-guide/#agent/trae',
    icon_key: 'Trae.Color',
    accent_color: '#10b981',
  },
  {
    id: 'deepseek-harness',
    name: 'DeepSeek Harness',
    tag: 'Reasoning',
    description: 'DeepSeek 推理加速套件，完整释放长思考链潜能',
    guide_url: 'https://api.oioi.lat/pages/codex-guide/#agent/workbuddy',
    icon_key: 'DeepSeek.Color',
    accent_color: '#0284c7',
  },
]

const createAgentSchema = (t: (key: string) => string) =>
  z.object({
    Agents: z.string().superRefine((value, ctx) => {
      try {
        const parsed = JSON.parse(value || '[]')
        if (!Array.isArray(parsed)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: t('Expected a JSON array.'),
          })
          return
        }
        for (const item of parsed) {
          if (!item || typeof item !== 'object' || Array.isArray(item)) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: t('Each item must be an object.'),
            })
            return
          }
          if (!item.name) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: t('Agent item must have a name.'),
            })
            return
          }
        }
      } catch {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: t('Invalid JSON format.'),
        })
      }
    }),
  })

type AgentFormValues = z.infer<ReturnType<typeof createAgentSchema>>

interface AgentSettingsSectionProps {
  defaultValue?: string
}

export function AgentSettingsSection({
  defaultValue,
}: AgentSettingsSectionProps) {
  const { t } = useTranslation()
  const updateOption = useUpdateOption()

  const initialJson = defaultValue
    ? formatJsonForEditor(defaultValue)
    : formatJsonForEditor(JSON.stringify(DEFAULT_AGENTS))

  const form = useForm<AgentFormValues>({
    resolver: zodResolver(createAgentSchema(t)),
    defaultValues: {
      Agents: initialJson,
    },
  })

  useEffect(() => {
    if (defaultValue) {
      form.reset({
        Agents: formatJsonForEditor(defaultValue),
      })
    }
  }, [defaultValue, form])

  const onSubmit = async (values: AgentFormValues) => {
    const normalized = normalizeJsonString(values.Agents)
    const result = await updateOption.mutateAsync({
      key: 'Agents',
      value: normalized,
    })
    if (result.success) {
      form.reset({
        Agents: formatJsonForEditor(normalized),
      })
    }
  }

  return (
    <SettingsSection
      title={t('Agent Showcase Configuration')}
      className='min-w-0'
    >
      <p className='text-muted-foreground text-sm'>
        {t(
          'Configure external AI coding agents, CLI tools and IDE extensions displayed on the landing hero and sign-in page.'
        )}
      </p>
      <Form {...form}>
        <SettingsForm
          onSubmit={form.handleSubmit(onSubmit)}
          className='flex flex-1 flex-col gap-2'
        >
          <FormField
            control={form.control}
            name='Agents'
            render={({ field }) => (
              <FormItem className='flex flex-1 flex-col'>
                <FormLabel>{t('Agent List (JSON)')}</FormLabel>
                <FormControl>
                  <JsonCodeEditor
                    value={field.value}
                    onChange={field.onChange}
                    className='flex flex-1 flex-col [&>div:first-child]:shrink-0'
                    heightClassName='min-h-96 flex-1 [contain:size]'
                    placeholder='[{"id": "...", "name": "...", "tag": "...", "guide_url": "...", "icon_key": "..."}]'
                  />
                </FormControl>
                <FormDescription>
                  {t(
                    'Fields: id, name, tag, description, guide_url, icon_key (from @lobehub/icons), accent_color.'
                  )}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <SettingsPageFormActions
            onSave={form.handleSubmit(onSubmit)}
            isSaving={updateOption.isPending}
            isSaveDisabled={!form.formState.isDirty}
            onReset={() => form.reset()}
          />
        </SettingsForm>
      </Form>
    </SettingsSection>
  )
}
