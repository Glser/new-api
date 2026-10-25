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
import { LanguageCircleIcon, Loading03Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { Combobox } from '@/components/ui/combobox'
import { TitledCard } from '@/components/ui/titled-card'
import {
  INTERFACE_LANGUAGE_OPTIONS,
  normalizeInterfaceLanguage,
} from '@/i18n/languages'
import { handleServerError } from '@/lib/handle-server-error'
import { createServerError } from '@/lib/server-error-message'
import { useAuthStore } from '@/stores/auth-store'

import { updateUserLanguage } from '../api'
import { parseUserSettings } from '../lib'
import type { UserProfile } from '../types'

type LanguagePreferencesCardProps = {
  profile: UserProfile | null
  onProfileUpdate: () => void
}

export function LanguagePreferencesCard(props: LanguagePreferencesCardProps) {
  const { t, i18n } = useTranslation()
  const { auth } = useAuthStore()
  const [saving, setSaving] = useState(false)

  const savedLanguage = useMemo(() => {
    const settings = parseUserSettings(props.profile?.setting)
    return normalizeInterfaceLanguage(settings.language || i18n.language)
  }, [props.profile?.setting, i18n.language])

  const [pendingLanguage, setPendingLanguage] = useState<string | null>(null)
  const currentLanguage = pendingLanguage ?? savedLanguage

  const handleLanguageChange = async (language: string | null) => {
    if (!language) return
    const nextLanguage = normalizeInterfaceLanguage(language)
    if (nextLanguage === currentLanguage) return

    const previousLanguage = currentLanguage
    setPendingLanguage(nextLanguage)
    setSaving(true)
    await i18n.changeLanguage(nextLanguage)

    try {
      const response = await updateUserLanguage(nextLanguage)
      if (!response.success) {
        throw createServerError(response, t('Failed to update settings'))
      }

      if (auth.user) {
        const existingSetting =
          typeof auth.user.setting === 'string'
            ? parseUserSettings(auth.user.setting)
            : (auth.user.setting ?? {})
        auth.setUser({
          ...auth.user,
          setting: JSON.stringify({
            ...existingSetting,
            language: nextLanguage,
          }),
        })
      }

      await props.onProfileUpdate()
      toast.success(t('Language preference saved'))
    } catch (error) {
      setPendingLanguage(previousLanguage)
      await i18n.changeLanguage(previousLanguage)
      handleServerError(error, t('Failed to update settings'))
    } finally {
      setPendingLanguage(null)
      setSaving(false)
    }
  }

  return (
    <TitledCard
      title={t('Language Preferences')}
      description={t('Set the language used across the interface')}
      icon={
        <HugeiconsIcon
          icon={LanguageCircleIcon}
          strokeWidth={2}
          aria-hidden='true'
          className='h-4 w-4'
        />
      }
      iconTone='neutral'
      titleClassName='text-sm font-semibold sm:text-sm'
      headerClassName='p-4 !pb-4 sm:p-4 sm:!pb-4'
      contentClassName='p-4 sm:p-4'
      disableHoverEffect
    >
      <div className='flex flex-col gap-4'>
        <div className='space-y-1'>
          <div className='text-sm font-medium'>{t('Interface Language')}</div>
          <p className='text-muted-foreground text-xs sm:text-sm'>
            {t(
              'Language preferences sync across your signed-in devices and affect API error messages.'
            )}
          </p>
        </div>
        <div className='flex items-center gap-2'>
          <Combobox
            options={INTERFACE_LANGUAGE_OPTIONS.map((language) => ({
              value: language.code,
              label: language.label,
            }))}
            value={currentLanguage}
            onValueChange={handleLanguageChange}
            disabled={saving || !props.profile}
            className='w-full'
            placeholder={t('Select language')}
          />
          {saving && (
            <HugeiconsIcon
              icon={Loading03Icon}
              strokeWidth={2}
              aria-hidden='true'
              className='text-muted-foreground size-4 animate-spin'
            />
          )}
        </div>
      </div>
    </TitledCard>
  )
}
