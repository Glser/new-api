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

import { StaticDataTable } from '@/components/data-table'
import {
  SideDrawerSection,
  SideDrawerSectionHeader,
  sideDrawerFormClassName,
} from '@/components/drawer-layout'
import { EmptyState } from '@/components/empty-state'
import { GroupBadge } from '@/components/group-badge'
import { StatusBadge } from '@/components/status-badge'

import type { Model } from '../types'
import { ModelSquareStatus } from './model-square-status'

export function ModelConnections(props: { model: Model }) {
  const { t } = useTranslation()
  return (
    <div className={sideDrawerFormClassName('gap-5 px-5 py-5')}>
      <p className='text-muted-foreground text-xs leading-5'>
        {t(
          'Channel availability and group access are derived from enabled channels. Importing metadata does not create a callable channel.'
        )}
      </p>
      <ModelSquareStatus model={props.model} detail />
      <SideDrawerSection>
        <SideDrawerSectionHeader title={t('Bound Channels')} />
        {props.model.bound_channels?.length ? (
          <StaticDataTable
            data={props.model.bound_channels}
            columns={[
              {
                id: 'name',
                header: t('Channel'),
                cell: (channel) => channel.name,
              },
              {
                id: 'type',
                header: t('Type'),
                cell: (channel) => channel.type,
              },
            ]}
          />
        ) : (
          <EmptyState title={t('No available channels')} />
        )}
      </SideDrawerSection>
      <SideDrawerSection>
        <SideDrawerSectionHeader title={t('Enable Groups')} />
        <div className='flex flex-wrap gap-2'>
          {props.model.enable_groups?.map((group) => (
            <GroupBadge key={group} group={group} />
          ))}
          {!props.model.enable_groups?.length && (
            <span className='text-muted-foreground text-xs'>
              {t('No enabled groups')}
            </span>
          )}
        </div>
      </SideDrawerSection>
      <SideDrawerSection>
        <SideDrawerSectionHeader title={t('Supported endpoints')} />
        <div className='flex flex-wrap gap-2'>
          {props.model.supported_endpoints?.map((endpoint) => (
            <StatusBadge key={endpoint} variant='neutral' label={endpoint} />
          ))}
          {!props.model.supported_endpoints?.length && (
            <span className='text-muted-foreground text-xs'>
              {t('No endpoints inferred from channels')}
            </span>
          )}
        </div>
      </SideDrawerSection>
      {props.model.name_rule !== 0 && (
        <SideDrawerSection>
          <SideDrawerSectionHeader title={t('Matched models')} />
          <div className='flex flex-wrap gap-2'>
            {props.model.matched_models?.map((name) => (
              <StatusBadge key={name} variant='neutral' label={name} />
            ))}
          </div>
        </SideDrawerSection>
      )}
    </div>
  )
}
