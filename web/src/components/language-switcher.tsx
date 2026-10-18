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
import { Languages } from 'lucide-react'
import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import {
  INTERFACE_LANGUAGE_OPTIONS,
  normalizeInterfaceLanguage,
} from '@/i18n/languages'
import { api } from '@/lib/api'
import { useAuthStore } from '@/stores/auth-store'

/**
 * Interface language toggle.
 *
 * The project ships exactly two interface languages, so a menu would only ever
 * offer the one alternative — clicking straight through is faster and clearer.
 */
export function LanguageSwitcher() {
  const { i18n, t } = useTranslation()
  const user = useAuthStore((s) => s.auth.user)

  const [chineseOption, englishOption] = INTERFACE_LANGUAGE_OPTIONS
  const isChinese =
    normalizeInterfaceLanguage(i18n.resolvedLanguage) === chineseOption.code
  const nextLanguage = isChinese ? englishOption.code : chineseOption.code

  const handleToggleLanguage = useCallback(async () => {
    await i18n.changeLanguage(nextLanguage)
    if (user) {
      try {
        await api.put('/api/user/self', { language: nextLanguage })
      } catch {
        // Best-effort persistence; don't block the UI on failure
      }
    }
  }, [i18n, nextLanguage, user])

  return (
    <Button
      type='button'
      variant='ghost'
      size='icon'
      className='size-9'
      onClick={handleToggleLanguage}
      aria-label={t('Change language')}
      title={t('Change language')}
    >
      <Languages className='size-[1.2rem]' />
      <span className='sr-only'>{t('Change language')}</span>
    </Button>
  )
}
