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
import { Check, ChevronsUpDown } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { cn } from '@/lib/utils'

import { GroupRatioBadge } from './auto-group-visuals'

export type ApiKeyGroupOption = {
  value: string
  label: string
  desc?: string
  ratio?: number | string
}

type ApiKeyGroupComboboxProps = {
  options: ApiKeyGroupOption[]
  value?: string
  onValueChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
}

export function ApiKeyGroupCombobox({
  options,
  value,
  onValueChange,
  placeholder,
  disabled,
}: ApiKeyGroupComboboxProps) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [searchValue, setSearchValue] = useState('')
  const selectedOption = options.find((option) => option.value === value)
  const isAutoSelected = selectedOption?.value === 'auto'

  const filteredOptions = useMemo(() => {
    const search = searchValue.trim().toLowerCase()
    if (!search) return options

    return options.filter((option) => {
      const ratioText = String(option.ratio ?? '').toLowerCase()
      return (
        option.value.toLowerCase().includes(search) ||
        option.label.toLowerCase().includes(search) ||
        option.desc?.toLowerCase().includes(search) ||
        ratioText.includes(search)
      )
    })
  }, [options, searchValue])

  const handleSelect = (selectedValue: string) => {
    onValueChange(selectedValue)
    setOpen(false)
    setSearchValue('')
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            type='button'
            variant='outline'
            role='combobox'
            aria-expanded={open}
            disabled={disabled}
            className='h-auto min-h-11 w-full justify-between gap-2 rounded-lg px-3 py-2 text-start shadow-none'
          />
        }
      >
        <span className='flex min-w-0 flex-1 items-center justify-between gap-2 sm:gap-3'>
          <span className='min-w-0'>
            <span className='block truncate font-medium'>
              {selectedOption?.label || placeholder || t('Select a group')}
            </span>
            {selectedOption?.desc &&
              selectedOption.desc !== selectedOption.label && (
                <span className='text-muted-foreground mt-0.5 block text-xs leading-5 font-normal break-words whitespace-normal'>
                  {selectedOption.desc}
                </span>
              )}
          </span>
          <span className='shrink-0'>
            <GroupRatioBadge
              ratio={selectedOption?.ratio}
              isAuto={isAutoSelected}
              shouldReduceMotion
            />
          </span>
        </span>
        <ChevronsUpDown
          aria-hidden='true'
          className='size-4 shrink-0 opacity-50'
        />
      </PopoverTrigger>
      <PopoverContent
        className='w-[var(--anchor-width)] overflow-hidden rounded-xl p-0'
        onWheel={(event) => event.stopPropagation()}
        onTouchMove={(event) => event.stopPropagation()}
        onPointerDown={(event) => event.stopPropagation()}
      >
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={t('Search...')}
            value={searchValue}
            onValueChange={setSearchValue}
          />
          <CommandList className='max-h-[360px]'>
            <CommandEmpty>{t('No group found.')}</CommandEmpty>
            <CommandGroup>
              {filteredOptions.map((option) => {
                const isAutoOption = option.value === 'auto'

                return (
                  <CommandItem
                    key={option.value}
                    value={option.value}
                    onSelect={() => handleSelect(option.value)}
                    className='items-center gap-2 rounded-lg px-2 py-2.5'
                  >
                    <Check
                      aria-hidden='true'
                      className={cn(
                        'size-3.5 shrink-0',
                        value === option.value ? 'opacity-100' : 'opacity-0'
                      )}
                    />
                    <span className='min-w-0 flex-1'>
                      <span className='block truncate font-medium'>
                        {option.label}
                      </span>
                      {option.desc && option.desc !== option.label && (
                        <span className='text-muted-foreground mt-0.5 block text-xs leading-5 font-normal break-words whitespace-normal'>
                          {option.desc}
                        </span>
                      )}
                    </span>
                    <GroupRatioBadge
                      ratio={option.ratio}
                      isAuto={isAutoOption}
                      shouldReduceMotion
                    />
                  </CommandItem>
                )
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
