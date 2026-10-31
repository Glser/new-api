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
import { getAuthSectionContent } from '../auth/section-registry.tsx'
import {
  SettingsStack,
  SettingsStackRow,
} from '../components/settings-form-layout'
import { SystemInfoSection } from '../general/system-info-section'
import {
  parseHeaderNavModules,
  parseSidebarModulesAdmin,
  serializeHeaderNavModules,
  serializeSidebarModulesAdmin,
} from '../maintenance/config'
import { HeaderNavigationSection } from '../maintenance/header-navigation-section'
import { NoticeSection } from '../maintenance/notice-section'
import { SidebarModulesSection } from '../maintenance/sidebar-modules-section'
import type { AuthSettings, SiteSettings } from '../types'
import { createSectionRegistry } from '../utils/section-registry'

export type SitePageSettings = SiteSettings & AuthSettings

const SITE_SECTION_ALIASES = {
  notice: 'system-info',
  'header-navigation': 'system-info',
  'sidebar-modules': 'system-info',
  'basic-auth': 'system-info',
  'bot-protection': 'system-info',
  oauth: 'system-info',
  passkey: 'system-info',
  'custom-oauth': 'system-info',
} as const

const SITE_SECTIONS = [
  {
    id: 'system-info',
    titleKey: 'Site & Authentication',
    stacked: true,
    build: (settings: SitePageSettings) => {
      const headerNavConfig = parseHeaderNavModules(settings.HeaderNavModules)
      const headerNavSerialized = serializeHeaderNavModules(headerNavConfig)
      const sidebarConfig = parseSidebarModulesAdmin(
        settings.SidebarModulesAdmin
      )
      const sidebarSerialized = serializeSidebarModulesAdmin(sidebarConfig)

      return (
        <SettingsStack>
          <SettingsStackRow>
            <SystemInfoSection
              defaultValues={{
                SystemName: settings.SystemName,
                Logo: settings.Logo,
                ServerAddress: settings.ServerAddress,
                TaskPublicAddress: settings.TaskPublicAddress,
                general_setting: {
                  docs_link: settings['general_setting.docs_link'],
                  studio_url: settings['general_setting.studio_url'],
                  video_explore_url:
                    settings['general_setting.video_explore_url'],
                  contact_support_image_url:
                    settings['general_setting.contact_support_image_url'],
                },
              }}
            />
            <NoticeSection defaultValue={settings.Notice ?? ''} />
          </SettingsStackRow>
          <SettingsStackRow>
            <HeaderNavigationSection
              config={headerNavConfig}
              initialSerialized={headerNavSerialized}
            />
            <SidebarModulesSection
              config={sidebarConfig}
              initialSerialized={sidebarSerialized}
            />
          </SettingsStackRow>
          {getAuthSectionContent('basic-auth', settings)}
          <SettingsStackRow>
            {getAuthSectionContent('bot-protection', settings)}
            {getAuthSectionContent('custom-oauth', settings)}
          </SettingsStackRow>
          {getAuthSectionContent('oauth', settings)}
          {getAuthSectionContent('passkey', settings)}
        </SettingsStack>
      )
    },
  },
] as const

export type SiteSectionId = (typeof SITE_SECTIONS)[number]['id']

const siteRegistry = createSectionRegistry<SiteSectionId, SitePageSettings>({
  sections: SITE_SECTIONS,
  defaultSection: 'system-info',
  basePath: '/system-settings/site',
  urlStyle: 'path',
})

export const SITE_SECTION_IDS = siteRegistry.sectionIds
export const SITE_DEFAULT_SECTION = siteRegistry.defaultSection
export const getSiteSectionNavItems = siteRegistry.getSectionNavItems
export const getSiteSectionContent = siteRegistry.getSectionContent
export const getSiteSectionMeta = siteRegistry.getSectionMeta

export function resolveSiteSectionId(section: string): SiteSectionId {
  if ((SITE_SECTION_IDS as readonly string[]).includes(section)) {
    return section as SiteSectionId
  }

  if (section in SITE_SECTION_ALIASES) {
    return SITE_SECTION_ALIASES[section as keyof typeof SITE_SECTION_ALIASES]
  }

  return SITE_DEFAULT_SECTION
}
