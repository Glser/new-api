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
import { lazy } from 'react'

import { LazyWhenOpen, RenderWhenOpen } from '@/components/render-when-open'

import { DescriptionDialog } from './dialogs/description-dialog'
import { MissingModelsDialog } from './dialogs/missing-models-dialog'
import { PrefillGroupManagement } from './dialogs/prefill-group-management'
import { PriceSyncDialog } from './dialogs/price-sync-dialog'
import { VendorMutateDialog } from './dialogs/vendor-mutate-dialog'
import { useModels } from './models-provider'

const ModelMutateDrawer = lazy(() =>
  import('./drawers/model-mutate-drawer').then((module) => ({
    default: module.ModelMutateDrawer,
  }))
)
const SyncWizardDialog = lazy(() =>
  import('./dialogs/sync-wizard-dialog').then((module) => ({
    default: module.SyncWizardDialog,
  }))
)

export function ModelsDialogs() {
  const {
    open,
    setOpen,
    currentRow,
    currentVendor,
    descriptionData,
    setDescriptionData,
  } = useModels()
  const isModelMutateOpen =
    open === 'create-model' || open === 'update-model' || open === 'price-model'
  const isVendorMutateOpen =
    open === 'create-vendor' || open === 'update-vendor'
  const closeDialog = (nextOpen: boolean) => {
    if (!nextOpen) setOpen(null)
  }

  return (
    <>
      <RenderWhenOpen open={open === 'price-sync'}>
        <PriceSyncDialog
          open={open === 'price-sync'}
          onOpenChange={closeDialog}
        />
      </RenderWhenOpen>

      <LazyWhenOpen open={isModelMutateOpen}>
        <ModelMutateDrawer
          key={
            currentRow && currentRow.id > 0
              ? `metadata:${currentRow.id}`
              : `channel:${currentRow?.model_name ?? ''}`
          }
          open={isModelMutateOpen}
          initialSection={open === 'price-model' ? 'pricing' : 'metadata'}
          onOpenChange={closeDialog}
          currentRow={currentRow}
        />
      </LazyWhenOpen>

      <RenderWhenOpen open={isVendorMutateOpen}>
        <VendorMutateDialog
          key={currentVendor?.id ?? 'new'}
          open={isVendorMutateOpen}
          onOpenChange={closeDialog}
          currentVendor={open === 'update-vendor' ? currentVendor : null}
        />
      </RenderWhenOpen>

      <RenderWhenOpen open={open === 'missing-models'}>
        <MissingModelsDialog
          open={open === 'missing-models'}
          onOpenChange={closeDialog}
        />
      </RenderWhenOpen>

      <LazyWhenOpen open={open === 'sync-wizard'}>
        <SyncWizardDialog
          open={open === 'sync-wizard'}
          onOpenChange={closeDialog}
        />
      </LazyWhenOpen>

      <RenderWhenOpen open={open === 'prefill-groups'}>
        <PrefillGroupManagement
          open={open === 'prefill-groups'}
          onOpenChange={closeDialog}
        />
      </RenderWhenOpen>

      <RenderWhenOpen open={open === 'description'}>
        <DescriptionDialog
          open={open === 'description'}
          onOpenChange={(nextOpen) => {
            if (!nextOpen) {
              setOpen(null)
              setDescriptionData(null)
            }
          }}
          modelName={descriptionData?.modelName || ''}
          description={descriptionData?.description || ''}
        />
      </RenderWhenOpen>
    </>
  )
}
