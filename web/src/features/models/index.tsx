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
import { useQueryClient } from '@tanstack/react-query'
import { getRouteApi, useNavigate } from '@tanstack/react-router'
import { Plus } from 'lucide-react'
import {
  memo,
  startTransition,
  useCallback,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import { useTranslation } from 'react-i18next'

import { SectionPageLayout } from '@/components/layout'
import { RenderWhenOpen } from '@/components/render-when-open'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { requireServerSuccess } from '@/lib/server-error-message'
import { cn } from '@/lib/utils'

import { listDeployments } from './api'
import { DeploymentAccessGuard } from './components/deployment-access-guard'
import { DeploymentsTable } from './components/deployments-table'
import { CreateDeploymentDrawer } from './components/dialogs/create-deployment-drawer'
import { ModelsDialogs } from './components/models-dialogs'
import { ModelsProvider } from './components/models-provider'
import { ModelsTable } from './components/models-table'
import { VendorsPrimaryButtons } from './components/vendors-primary-buttons'
import { VendorsTable } from './components/vendors-table'
import { useModelDeploymentSettings } from './hooks/use-model-deployment-settings'
import { deploymentsQueryKeys } from './lib'
import {
  type ModelsSectionId,
  MODELS_DEFAULT_SECTION,
  MODELS_SECTION_IDS,
} from './section-registry'

const route = getRouteApi('/_authenticated/models/$section')

const SECTION_META: Record<
  ModelsSectionId,
  { titleKey: string; tabKey: string }
> = {
  metadata: {
    titleKey: 'Model management',
    tabKey: 'Models',
  },
  vendors: { titleKey: 'Vendor management', tabKey: 'Vendors' },
  deployments: {
    titleKey: 'Deployments',
    tabKey: 'Deployments',
  },
}

const MemoModelsTable = memo(ModelsTable)
const MemoVendorsTable = memo(VendorsTable)

function SectionPanel(props: { active: boolean; children: ReactNode }) {
  return (
    <div
      className={cn(
        'h-full min-h-0',
        props.active ? 'flex flex-col' : 'hidden'
      )}
    >
      {props.children}
    </div>
  )
}

function ModelsContent() {
  const { t } = useTranslation()
  const navigate = useNavigate({ from: '/models/$section' })
  const params = route.useParams()
  const routeSection = (params.section ??
    MODELS_DEFAULT_SECTION) as ModelsSectionId
  const [selectedSection, setSelectedSection] =
    useState<ModelsSectionId>(routeSection)
  const [visitedSections, setVisitedSections] = useState(
    () => new Set<ModelsSectionId>([routeSection])
  )

  // Deployment create dialog state
  const [createDeploymentOpen, setCreateDeploymentOpen] = useState(false)

  useEffect(() => {
    setSelectedSection(routeSection)
    setVisitedSections((previous) => {
      if (previous.has(routeSection)) return previous
      const next = new Set(previous)
      next.add(routeSection)
      return next
    })
  }, [routeSection])

  const handleSectionChange = useCallback(
    (section: string) => {
      const next = section as ModelsSectionId
      setSelectedSection(next)
      setVisitedSections((previous) => {
        if (previous.has(next)) return previous
        const nextVisited = new Set(previous)
        nextVisited.add(next)
        return nextVisited
      })
      startTransition(() => {
        void navigate({
          to: '/models/$section',
          params: { section: next },
          search: (previous) => previous,
        })
      })
    },
    [navigate]
  )

  const meta = SECTION_META[selectedSection] ?? SECTION_META.metadata

  let actions: ReactNode = null
  if (selectedSection === 'vendors') {
    actions = <VendorsPrimaryButtons />
  } else if (selectedSection === 'deployments') {
    actions = (
      <Button onClick={() => setCreateDeploymentOpen(true)} size='sm'>
        <Plus className='size-4' />
        {t('Create deployment')}
      </Button>
    )
  }

  return (
    <>
      <SectionPageLayout fixedContent stackActionsOnMobile>
        <SectionPageLayout.Title>{t(meta.titleKey)}</SectionPageLayout.Title>
        <SectionPageLayout.Actions>{actions}</SectionPageLayout.Actions>
        <SectionPageLayout.Content>
          <div className='flex h-full min-h-0 flex-col gap-3'>
            <Tabs value={selectedSection} onValueChange={handleSectionChange}>
              <TabsList>
                {MODELS_SECTION_IDS.map((section) => (
                  <TabsTrigger key={section} value={section}>
                    {t(SECTION_META[section].tabKey)}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
            <div className='relative min-h-0 flex-1'>
              {visitedSections.has('metadata') ? (
                <SectionPanel active={selectedSection === 'metadata'}>
                  <MemoModelsTable />
                </SectionPanel>
              ) : null}
              {visitedSections.has('vendors') ? (
                <SectionPanel active={selectedSection === 'vendors'}>
                  <MemoVendorsTable />
                </SectionPanel>
              ) : null}
              {visitedSections.has('deployments') ? (
                <SectionPanel active={selectedSection === 'deployments'}>
                  <DeploymentsSection />
                </SectionPanel>
              ) : null}
            </div>
          </div>
        </SectionPageLayout.Content>
      </SectionPageLayout>

      <ModelsDialogs />
      <RenderWhenOpen open={createDeploymentOpen}>
        <CreateDeploymentDrawer
          open={createDeploymentOpen}
          onOpenChange={setCreateDeploymentOpen}
        />
      </RenderWhenOpen>
    </>
  )
}

function DeploymentsSection() {
  const queryClient = useQueryClient()
  const {
    loading: deploymentLoading,
    loadingPhase,
    isIoNetEnabled,
    connectionLoading,
    connectionOk,
    connectionError,
    testConnection,
  } = useModelDeploymentSettings()

  // Prefetch deployments list while connection check is in progress.
  useEffect(() => {
    if (isIoNetEnabled && loadingPhase === 'connection') {
      const defaultParams = { p: 1, page_size: 10 }
      queryClient.prefetchQuery({
        queryKey: deploymentsQueryKeys.list(defaultParams),
        queryFn: async () =>
          requireServerSuccess(await listDeployments(defaultParams)),
        staleTime: 30 * 1000,
      })
    }
  }, [isIoNetEnabled, loadingPhase, queryClient])

  return (
    <DeploymentAccessGuard
      loading={deploymentLoading}
      loadingPhase={loadingPhase}
      isEnabled={isIoNetEnabled}
      connectionLoading={connectionLoading}
      connectionOk={connectionOk}
      connectionError={connectionError}
      onRetry={testConnection}
    >
      <DeploymentsTable />
    </DeploymentAccessGuard>
  )
}

export function Models() {
  return (
    <ModelsProvider>
      <ModelsContent />
    </ModelsProvider>
  )
}
