/*
Copyright (C) 2023-2026 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.
*/
import { useTranslation } from 'react-i18next'

import { cn } from '@/lib/utils'

type ApiKeyGroupCellProps = {
  crossGroupRetry: boolean
  group: string
  ratio?: number | string | null
  shouldReduceMotion?: boolean
}

function formatRatioCompact(value: number | string | null | undefined) {
  const ratio = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(ratio)) return null
  return ratio % 1 === 0
    ? String(ratio)
    : ratio.toFixed(4).replace(/\.?0+$/, '')
}

export function ApiKeyGroupCell(props: ApiKeyGroupCellProps) {
  const { t } = useTranslation()
  const group = props.group?.trim() || ''
  let label = group || t('User Group')
  if (group === 'auto') {
    label = props.crossGroupRetry ? t('Cross-group') : t('Auto')
  }
  const ratio = formatRatioCompact(props.ratio)
  const showRatio = ratio != null && ratio !== '1'

  return (
    <div className='mx-auto flex max-w-[160px] items-center justify-center gap-1.5 text-center'>
      <span
        className={cn(
          'text-muted-foreground max-w-36 truncate text-xs',
          '@min-[48rem]/keys:text-sm'
        )}
      >
        {label}
      </span>
      {showRatio && (
        <span className='shrink-0 rounded bg-lime-400 px-1 py-px text-[10px] leading-none font-semibold text-black tabular-nums @min-[48rem]/keys:text-xs'>
          {ratio}x
        </span>
      )}
    </div>
  )
}
