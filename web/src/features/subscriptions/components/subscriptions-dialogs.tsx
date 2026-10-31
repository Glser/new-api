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
import { RenderWhenOpen } from '@/components/render-when-open'

import { ResetSubscriptionsDialog } from './dialogs/reset-subscriptions-dialog'
import { ToggleStatusDialog } from './dialogs/toggle-status-dialog'
import { SubscriptionsMutateDrawer } from './subscriptions-mutate-drawer'
import { useSubscriptions } from './subscriptions-provider'

export function SubscriptionsDialogs() {
  const { open, setOpen, currentRow } = useSubscriptions()
  const isUpdate = open === 'update'
  const isMutateOpen = open === 'create' || isUpdate

  return (
    <>
      <RenderWhenOpen open={isMutateOpen}>
        <SubscriptionsMutateDrawer
          open={isMutateOpen}
          onOpenChange={(isOpen) => {
            if (!isOpen) setOpen(null)
          }}
          currentRow={isUpdate ? currentRow || undefined : undefined}
        />
      </RenderWhenOpen>
      <RenderWhenOpen open={open === 'toggle-status'}>
        <ToggleStatusDialog />
      </RenderWhenOpen>
      <RenderWhenOpen open={open === 'reset-subscriptions'}>
        <ResetSubscriptionsDialog />
      </RenderWhenOpen>
    </>
  )
}
