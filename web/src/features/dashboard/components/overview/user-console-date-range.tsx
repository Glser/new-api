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
import { useTranslation } from 'react-i18next'

import { DateRangePickerButton } from '@/components/date-range-picker'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { USER_CONSOLE_RANGE_PRESETS } from '@/features/dashboard/constants'
import {
  getUserConsolePresetRange,
  matchUserConsolePreset,
} from '@/features/dashboard/lib'
import type {
  UserConsoleDateRange,
  UserConsoleRangePreset,
} from '@/features/dashboard/types'

interface UserConsoleDateRangeProps {
  range: UserConsoleDateRange
  onChange: (range: UserConsoleDateRange) => void
}

export function UserConsoleDateRangeControl(props: UserConsoleDateRangeProps) {
  const { t } = useTranslation()

  const handlePreset = (preset: UserConsoleRangePreset) => {
    if (preset === 'custom') return
    const next = getUserConsolePresetRange(preset)
    props.onChange({
      preset,
      start: next.start,
      end: next.end,
    })
  }

  return (
    <div className='flex min-w-0 flex-wrap items-center justify-start gap-2 @min-[64rem]/console:justify-end'>
      <Tabs
        value={props.range.preset}
        onValueChange={(value) => {
          if (value !== 'custom') {
            handlePreset(value as UserConsoleRangePreset)
          }
        }}
        className='shrink-0'
      >
        <TabsList aria-label={t('Time range')}>
          {USER_CONSOLE_RANGE_PRESETS.map((preset) => (
            <TabsTrigger
              key={preset.value}
              value={preset.value}
              className='px-2.5 text-xs'
            >
              {t(preset.labelKey)}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <DateRangePickerButton
        start={props.range.start}
        end={props.range.end}
        showTime
        disableFuture
        triggerClassName='@min-[48rem]/console:min-w-56'
        onApply={({ start, end }) => {
          props.onChange({
            preset: matchUserConsolePreset(start, end),
            start,
            end,
          })
        }}
      />
    </div>
  )
}
