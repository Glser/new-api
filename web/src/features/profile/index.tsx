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
import { Settings01Icon, Shield01Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { useNavigate, useSearch } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

import { Main } from '@/components/layout'
import { Button } from '@/components/ui/button'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from '@/components/ui/empty'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Security } from '@/features/security'
import { useIsSidebarModuleVisible } from '@/hooks/use-sidebar-config'
import { useStatus } from '@/hooks/use-status'

import { CheckinCalendarCard } from './components/checkin-calendar-card'
import { LanguagePreferencesCard } from './components/language-preferences-card'
import { ProfileHeader } from './components/profile-header'
import { ProfileSettingsCard } from './components/profile-settings-card'
import { useProfile } from './hooks'

export function Profile() {
  const { t } = useTranslation()
  const { profile, loading, refreshProfile, fetchProfile } = useProfile()
  const { status } = useStatus()
  const search = useSearch({ from: '/_authenticated/profile/' })
  const navigate = useNavigate()
  const securityVisible = useIsSidebarModuleVisible('/security')
  const section =
    securityVisible && search.section === 'security'
      ? 'security'
      : 'preferences'

  return (
    <Main>
      <div className='min-h-0 flex-1 overflow-auto px-3 py-3 sm:px-4 sm:py-5'>
        <div className='mx-auto flex w-full max-w-7xl flex-col gap-5 sm:gap-6'>
          <h1 className='text-base font-bold tracking-tight sm:text-lg'>
            {t('Profile')}
          </h1>
          <ProfileHeader profile={profile} loading={loading} />
          {!loading && !profile ? (
            <Empty>
              <EmptyHeader>
                <EmptyTitle>{t('Failed to load profile')}</EmptyTitle>
                <EmptyDescription>
                  {t('Refresh the list and try again.')}
                </EmptyDescription>
              </EmptyHeader>
              <Button variant='outline' onClick={() => void fetchProfile()}>
                {t('Retry')}
              </Button>
            </Empty>
          ) : (
            <Tabs
              value={section}
              onValueChange={(value) => {
                if (value === 'preferences' || value === 'security') {
                  void navigate({
                    to: '/profile',
                    search: { section: value },
                    replace: true,
                    resetScroll: false,
                  })
                }
              }}
              className='gap-5 sm:gap-6'
            >
              <div className='border-b'>
                <TabsList
                  variant='line'
                  aria-label={t('Profile')}
                  className='max-w-full gap-4 sm:gap-6'
                >
                  <TabsTrigger value='preferences' className='gap-2 px-0 pb-2'>
                    <HugeiconsIcon
                      icon={Settings01Icon}
                      strokeWidth={2}
                      aria-hidden='true'
                    />
                    {t('Settings & Preferences')}
                  </TabsTrigger>
                  {securityVisible && (
                    <TabsTrigger value='security' className='gap-2 px-0 pb-2'>
                      <HugeiconsIcon
                        icon={Shield01Icon}
                        strokeWidth={2}
                        aria-hidden='true'
                      />
                      {t('Security & Access')}
                    </TabsTrigger>
                  )}
                </TabsList>
              </div>
              <TabsContent value='preferences' keepMounted>
                <div className='grid items-start gap-4 sm:gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(360px,0.46fr)]'>
                  <ProfileSettingsCard
                    profile={profile}
                    loading={loading}
                    onProfileUpdate={refreshProfile}
                  />
                  <div className='min-w-0 space-y-4 sm:space-y-5'>
                    <LanguagePreferencesCard
                      profile={profile}
                      onProfileUpdate={refreshProfile}
                    />
                    {status?.checkin_enabled === true && (
                      <CheckinCalendarCard
                        checkinEnabled
                        turnstileEnabled={
                          !!(
                            status.turnstile_check && status.turnstile_site_key
                          )
                        }
                        turnstileSiteKey={status.turnstile_site_key || ''}
                      />
                    )}
                  </div>
                </div>
              </TabsContent>
              {securityVisible && (
                <TabsContent value='security'>
                  <Security
                    profile={profile}
                    loading={loading}
                    onProfileUpdate={refreshProfile}
                    onRetry={() => void fetchProfile()}
                  />
                </TabsContent>
              )}
            </Tabs>
          )}
        </div>
      </div>
    </Main>
  )
}
