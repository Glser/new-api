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
import { useQuery } from '@tanstack/react-query'
import {
  ArrowUpCircle,
  CheckCircle2,
  Download,
  TriangleAlert,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { TooltipHint } from '@/components/ui/tooltip'
import { getChannelTypeLabel } from '@/features/channels/lib'
import { resolveLocalizedText } from '@/lib/localized-text'
import { cn } from '@/lib/utils'

import {
  findMarketplaceVersion,
  marketplaceBuiltInVersion,
  resolvePluginSourceUrl,
  type InstallState,
} from '../lib/marketplace'
import { fetchPluginIconDataUri } from '../lib/plugin-icon-file'
import type { MarketplacePlugin, TaskPluginListItem } from '../types'
import { PluginIcon } from './plugin-icon'

type MarketplacePluginCardProps = {
  plugin: MarketplacePlugin
  /** Index URL the plugin came from; sidecar logos resolve against it. */
  indexUrl?: string
  installState: InstallState
  installed?: TaskPluginListItem
  onInstall: () => void
}

export function MarketplacePluginCard(props: MarketplacePluginCardProps) {
  const { t, i18n } = useTranslation()
  const plugin = props.plugin
  const description = resolveLocalizedText(plugin.description, i18n.language)
  const channelTypes = plugin.channelTypes ?? []
  const latestEntry = findMarketplaceVersion(plugin, plugin.latest)
  const builtInVersion = marketplaceBuiltInVersion(props.installed)
  // Same-origin-as-index rule as the source itself: a logo is only ever
  // fetched from the repository the administrator chose to trust.
  const iconUrl =
    plugin.iconFile && props.indexUrl
      ? resolvePluginSourceUrl(props.indexUrl, plugin.iconFile.path)
      : null

  let statusNote = <span className='invisible'>-</span>
  if (!latestEntry?.sha256) {
    statusNote = (
      <div className='text-destructive flex min-w-0 items-center gap-1'>
        <TriangleAlert className='size-3 shrink-0' aria-hidden='true' />
        <span className='truncate'>{t('No integrity hash')}</span>
      </div>
    )
  } else if (builtInVersion) {
    statusNote = (
      <span className='text-muted-foreground truncate font-mono'>
        {t('Built-in v{{factory}} / marketplace v{{market}}', {
          factory: builtInVersion,
          market: plugin.latest,
        })}
      </span>
    )
  }

  return (
    <Card
      data-card-hover='false'
      size='sm'
      className={cn(
        'group/plugin-card min-w-0 gap-3 py-3.5 ring-inset transition-[translate,box-shadow] duration-500 hover:-translate-y-1 hover:shadow-[0_1px_2px_rgba(15,23,42,0.05),0_16px_36px_-24px_rgba(15,23,42,0.22)] dark:hover:shadow-[0_18px_50px_-24px_rgba(0,0,0,0.6)]'
      )}
    >
      <CardHeader className='flex flex-row items-center gap-3 px-4'>
        <div className='flex size-8 shrink-0 items-center justify-center'>
          {iconUrl ? (
            <MarketplacePluginLogo
              plugin={plugin}
              iconUrl={iconUrl}
              sha256={plugin.iconFile?.sha256}
            />
          ) : (
            <PluginIcon plugin={plugin} size={20} />
          )}
        </div>
        <div className='min-w-0 flex-1 overflow-hidden'>
          <TooltipHint content={plugin.name}>
            <span className='min-w-0 truncate py-px text-base leading-snug font-semibold'>
              {plugin.name}
            </span>
          </TooltipHint>
          <div className='text-muted-foreground truncate font-mono text-xs'>
            {plugin.key}
          </div>
        </div>
        <div className='-mr-1 shrink-0'>
          <InstallStateBadge state={props.installState} />
        </div>
      </CardHeader>

      <CardContent className='flex flex-col gap-2.5 px-4'>
        <p className='text-muted-foreground line-clamp-2 h-10 text-sm leading-5 break-words'>
          {description || '\u00a0'}
        </p>

        <div className='text-muted-foreground flex h-6 min-w-0 items-center justify-between gap-3 text-xs'>
          <span className='min-w-0 truncate font-mono'>v{plugin.latest}</span>
          <span className='min-w-0 truncate'>
            {channelTypes.length > 0
              ? t(getChannelTypeLabel(channelTypes[0]))
              : t('Task Plugin')}
          </span>
          <span className='shrink-0 tabular-nums'>
            {t('Models')} {plugin.models?.length ?? 0}
          </span>
        </div>

        <div className='flex h-4 min-w-0 items-center text-xs'>
          {statusNote}
        </div>

        <Button
          size='sm'
          variant={
            props.installState.status === 'up_to_date' ? 'outline' : 'default'
          }
          className='mt-auto h-8 w-full'
          onClick={props.onInstall}
        >
          <Download />
          {t('Install')}
        </Button>
      </CardContent>
    </Card>
  )
}

function InstallStateBadge({ state }: { state: InstallState }) {
  const { t } = useTranslation()
  if (state.status === 'not_installed') {
    return <Badge variant='outline'>{t('Not installed')}</Badge>
  }
  if (state.status === 'up_to_date') {
    return (
      <Badge variant='secondary'>
        <CheckCircle2 aria-hidden='true' />
        {t('Up to date')}
      </Badge>
    )
  }
  if (state.status === 'upgradable') {
    return (
      <Badge
        aria-label={t('Upgrade available: v{{installed}} to v{{latest}}', {
          installed: state.installedVersion,
          latest: state.latestVersion,
        })}
      >
        <ArrowUpCircle aria-hidden='true' />
        <span className='font-mono'>
          v{state.installedVersion} → v{state.latestVersion}
        </span>
      </Badge>
    )
  }
  return (
    <Badge variant='destructive'>
      {t('Installed v{{installed}} not listed', {
        installed: state.installedVersion,
      })}
    </Badge>
  )
}

type MarketplacePluginLogoProps = {
  plugin: MarketplacePlugin
  iconUrl: string
  sha256?: string
}

/**
 * Loads the sidecar logo through fetch and shows it as a data URI. Linking the
 * raw file with `<img src>` fails on hosts that serve SVG as text/plain with
 * nosniff (raw.githubusercontent.com does), and fetching also lets the index
 * digest be checked before anything is displayed. Until the bytes arrive, or if
 * they never do, the manifest icon or text avatar renders instead.
 */
function MarketplacePluginLogo(props: MarketplacePluginLogoProps) {
  const iconQuery = useQuery({
    queryKey: [
      'task-plugin-marketplace-icon',
      props.iconUrl,
      props.sha256 ?? '',
    ],
    queryFn: () =>
      fetchPluginIconDataUri(props.iconUrl, { sha256: props.sha256 }),
    staleTime: Number.POSITIVE_INFINITY,
    retry: false,
    meta: { errorToast: false },
  })
  return (
    <PluginIcon
      plugin={{ ...props.plugin, iconSrc: iconQuery.data ?? undefined }}
      size={20}
    />
  )
}
