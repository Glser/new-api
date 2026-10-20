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
import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

import { StatusBadge } from '@/components/status-badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { UsageLog } from '@/features/usage-logs/data/schema'
import { formatModelName } from '@/features/usage-logs/lib/format'
import { getLogTypeConfig } from '@/features/usage-logs/lib/utils'
import { ModelBadge } from '@/features/usage-logs/components/model-badge'
import { formatLogQuota, formatTimestampToDate, formatTokens } from '@/lib/format'

interface UserConsoleActivityProps {
  logs: UsageLog[]
  loading?: boolean
}

function statusVariant(type: number) {
  if (type === 5) return 'danger' as const
  if (type === 6) return 'info' as const
  return 'success' as const
}

function ActivityRows(props: { logs: UsageLog[]; loading?: boolean }) {
  const { t } = useTranslation()

  if (props.loading) {
    return ['row-1', 'row-2', 'row-3'].map((key) => (
      <TableRow key={key}>
        <TableCell colSpan={4}>
          <Skeleton className='h-6 w-full' />
        </TableCell>
      </TableRow>
    ))
  }

  if (props.logs.length === 0) {
    return (
      <TableRow>
        <TableCell
          colSpan={4}
          className='text-muted-foreground h-16 text-center'
        >
          {t('No request records yet')}
        </TableCell>
      </TableRow>
    )
  }

  return props.logs.map((log) => {
    const model = formatModelName(log)
    const typeConfig = getLogTypeConfig(log.type)
    const tokens = (log.prompt_tokens ?? 0) + (log.completion_tokens ?? 0)

    return (
      <TableRow key={log.id}>
        <TableCell>
          <div className='flex flex-col gap-1'>
            <span className='tabular-nums'>
              {formatTimestampToDate(log.created_at)}
            </span>
            <StatusBadge
              size='sm'
              variant={statusVariant(log.type)}
              copyable={false}
              label={t(typeConfig.label)}
            />
          </div>
        </TableCell>
        <TableCell>
          <ModelBadge modelName={model.name} actualModel={model.actualModel} />
        </TableCell>
        <TableCell className='tabular-nums'>{formatTokens(tokens)}</TableCell>
        <TableCell className='text-end font-medium tabular-nums'>
          {formatLogQuota(log.quota)}
        </TableCell>
      </TableRow>
    )
  })
}

export function UserConsoleActivity(props: UserConsoleActivityProps) {
  const { t } = useTranslation()

  return (
    <section className='bg-card overflow-hidden rounded-2xl border'>
      <div className='flex flex-wrap items-start justify-between gap-3 px-4 py-3 sm:px-5'>
        <div>
          <h3 className='text-sm font-semibold'>{t('Recent activity')}</h3>
          <p className='text-muted-foreground mt-0.5 text-xs'>
            {t('Inspect models, status, and cost line by line')}
          </p>
        </div>
        <Button
          variant='outline'
          size='sm'
          className='h-8'
          render={
            <Link to='/usage-logs/$section' params={{ section: 'common' }} />
          }
        >
          {t('Full logs')} →
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('Time / Status')}</TableHead>
            <TableHead>{t('Model')}</TableHead>
            <TableHead>{t('Usage')}</TableHead>
            <TableHead className='text-end'>{t('Cost')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <ActivityRows logs={props.logs} loading={props.loading} />
        </TableBody>
      </Table>
    </section>
  )
}
