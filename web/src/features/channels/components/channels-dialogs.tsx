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

import { useChannels } from './channels-provider'
import { BalanceQueryDialog } from './dialogs/balance-query-dialog'
import { CopyChannelDialog } from './dialogs/copy-channel-dialog'
import { EditTagDialog } from './dialogs/edit-tag-dialog'
import { FetchModelsDialog } from './dialogs/fetch-models-dialog'
import { MultiKeyManageDialog } from './dialogs/multi-key-manage-dialog'
import { OllamaModelsDialog } from './dialogs/ollama-models-dialog'
import { TagBatchEditDialog } from './dialogs/tag-batch-edit-dialog'
import { UpstreamUpdateDialog } from './dialogs/upstream-update-dialog'

const ChannelMutateDrawer = lazy(() =>
  import('./drawers/channel-mutate-drawer').then((module) => ({
    default: module.ChannelMutateDrawer,
  }))
)
const ChannelTestDialog = lazy(() =>
  import('./dialogs/channel-test-dialog').then((module) => ({
    default: module.ChannelTestDialog,
  }))
)

export function ChannelsDialogs() {
  const { open, setOpen, currentRow, upstream } = useChannels()
  const isChannelMutateOpen =
    open === 'create-channel' || open === 'update-channel'
  const closeDialog = (nextOpen: boolean) => {
    if (!nextOpen) setOpen(null)
  }

  return (
    <>
      <LazyWhenOpen open={isChannelMutateOpen}>
        <ChannelMutateDrawer
          open={isChannelMutateOpen}
          onOpenChange={closeDialog}
          currentRow={open === 'update-channel' ? currentRow : null}
        />
      </LazyWhenOpen>

      <LazyWhenOpen open={open === 'test-channel'}>
        <ChannelTestDialog
          open={open === 'test-channel'}
          onOpenChange={closeDialog}
        />
      </LazyWhenOpen>

      <RenderWhenOpen open={open === 'balance-query'}>
        <BalanceQueryDialog
          open={open === 'balance-query'}
          onOpenChange={closeDialog}
        />
      </RenderWhenOpen>

      <RenderWhenOpen open={open === 'fetch-models'}>
        <FetchModelsDialog
          open={open === 'fetch-models'}
          onOpenChange={closeDialog}
        />
      </RenderWhenOpen>

      <RenderWhenOpen open={open === 'ollama-models'}>
        <OllamaModelsDialog
          open={open === 'ollama-models'}
          onOpenChange={closeDialog}
        />
      </RenderWhenOpen>

      <RenderWhenOpen open={open === 'copy-channel'}>
        <CopyChannelDialog
          open={open === 'copy-channel'}
          onOpenChange={closeDialog}
        />
      </RenderWhenOpen>

      <RenderWhenOpen open={open === 'multi-key-manage'}>
        <MultiKeyManageDialog
          open={open === 'multi-key-manage'}
          onOpenChange={closeDialog}
        />
      </RenderWhenOpen>

      <RenderWhenOpen open={open === 'tag-batch-edit'}>
        <TagBatchEditDialog
          open={open === 'tag-batch-edit'}
          onOpenChange={closeDialog}
        />
      </RenderWhenOpen>

      <RenderWhenOpen open={open === 'edit-tag'}>
        <EditTagDialog open={open === 'edit-tag'} onOpenChange={closeDialog} />
      </RenderWhenOpen>

      <RenderWhenOpen open={upstream.showModal}>
        <UpstreamUpdateDialog
          open={upstream.showModal}
          addModels={upstream.addModels}
          removeModels={upstream.removeModels}
          preferredTab={upstream.preferredTab}
          confirmLoading={upstream.applyLoading}
          onConfirm={upstream.applyUpdates}
          onCancel={upstream.closeModal}
        />
      </RenderWhenOpen>
    </>
  )
}
