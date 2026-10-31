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

import { SectionPageLayout } from '@/components/layout'
import { RenderWhenOpen } from '@/components/render-when-open'

import { UserQuotaDialog } from './components/user-quota-dialog'
import { UsersDeleteDialog } from './components/users-delete-dialog'
import { UsersMutateDrawer } from './components/users-mutate-drawer'
import { UsersProvider, useUsers } from './components/users-provider'
import { UsersTable } from './components/users-table'

function UsersContent() {
  const { t } = useTranslation()
  const { open, setOpen, currentRow, triggerRefresh } = useUsers()
  const isMutateOpen = open === 'create' || open === 'update'

  return (
    <>
      <SectionPageLayout fixedContent>
        <SectionPageLayout.Title>
          <span className='truncate text-xl font-bold tracking-tight sm:text-2xl 2xl:text-3xl'>
            {t('Users')}
          </span>
        </SectionPageLayout.Title>
        <SectionPageLayout.Content>
          <UsersTable />
        </SectionPageLayout.Content>
      </SectionPageLayout>

      <RenderWhenOpen open={isMutateOpen}>
        <UsersMutateDrawer
          open={isMutateOpen}
          onOpenChange={(isOpen) => {
            if (!isOpen) setOpen(null)
          }}
          currentRow={open === 'update' ? currentRow || undefined : undefined}
        />
      </RenderWhenOpen>
      <RenderWhenOpen open={open === 'delete'}>
        <UsersDeleteDialog />
      </RenderWhenOpen>
      <RenderWhenOpen open={open === 'adjust-quota'}>
        {currentRow ? (
          <UserQuotaDialog
            open={open === 'adjust-quota'}
            onOpenChange={(isOpen) => {
              if (!isOpen) setOpen(null)
            }}
            userId={currentRow.id}
            currentQuota={currentRow.quota}
            username={currentRow.username}
            onSuccess={triggerRefresh}
          />
        ) : null}
      </RenderWhenOpen>
    </>
  )
}

export function Users() {
  return (
    <UsersProvider>
      <UsersContent />
    </UsersProvider>
  )
}
