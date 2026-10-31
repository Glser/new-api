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
import type { TFunction } from 'i18next'
import { Box, CreditCard, Layout, Settings, Wrench } from 'lucide-react'

import type { NavCollapsible, NavGroup, NavItem, SidebarView } from '../types'

const STACKED_SECTION_ACTIVE_URLS = [
  '/system-settings/site/notice',
  '/system-settings/site/header-navigation',
  '/system-settings/site/sidebar-modules',
  '/system-settings/site/basic-auth',
  '/system-settings/site/bot-protection',
  '/system-settings/site/oauth',
  '/system-settings/site/passkey',
  '/system-settings/site/custom-oauth',
  '/system-settings/auth/basic-auth',
  '/system-settings/auth/bot-protection',
  '/system-settings/auth/oauth',
  '/system-settings/auth/passkey',
  '/system-settings/auth/custom-oauth',
]

/**
 * Sidebar nav groups for the System Settings nested view.
 *
 * Kept as a single group because the workspace title in the sidebar
 * header already provides top-level context — the inner group label
 * scopes the items as "administration" actions.
 */
function getSystemSettingsNavGroups(t: TFunction): NavGroup[] {
  return [
    {
      id: 'system-administration',
      title: t('System Administration'),
      items: [
        {
          title: t('Site & Authentication'),
          icon: Settings,
          url: '/system-settings/site/system-info',
          activeUrls: STACKED_SECTION_ACTIVE_URLS,
        },
        {
          title: t('Billing & Payment'),
          icon: CreditCard,
          url: '/system-settings/billing/quota',
          activeUrls: [
            '/system-settings/billing/currency',
            '/system-settings/billing/model-pricing',
            '/system-settings/billing/group-pricing',
            '/system-settings/billing/payment',
            '/system-settings/billing/checkin',
          ],
        },
        {
          title: t('Models & Routing'),
          icon: Box,
          url: '/system-settings/models/global',
          activeUrls: [
            '/system-settings/models/routing-reliability',
            '/system-settings/models/gemini',
            '/system-settings/models/claude',
            '/system-settings/models/grok',
            '/system-settings/models/channel-affinity',
            '/system-settings/models/model-deployment',
            '/system-settings/security/rate-limit',
            '/system-settings/security/sensitive-words',
            '/system-settings/security/ssrf',
            '/system-settings/security/token-limits',
          ],
        },
        {
          title: t('Console Content'),
          icon: Layout,
          url: '/system-settings/content/dashboard',
          activeUrls: [
            '/system-settings/content/announcements',
            '/system-settings/content/api-info',
            '/system-settings/content/faq',
            '/system-settings/content/uptime-kuma',
            '/system-settings/content/chat',
            '/system-settings/content/agent',
            '/system-settings/content/drawing',
          ],
        },
        {
          title: t('Operations'),
          icon: Wrench,
          url: '/system-settings/operations/behavior',
          activeUrls: [
            '/system-settings/operations/alerts',
            '/system-settings/operations/email',
            '/system-settings/operations/worker',
            '/system-settings/operations/logs',
            '/system-settings/operations/performance',
            '/system-settings/operations/update-checker',
          ],
        },
      ],
    },
  ]
}

function flattenSettingsCategory(category: NavItem): NavCollapsible['items'] {
  if ('items' in category && category.items) {
    return category.items.map((item) => ({
      ...item,
      icon: category.icon,
    }))
  }

  if ('url' in category && category.url) {
    return [
      {
        title: category.title,
        url: category.url,
        icon: category.icon,
        activeUrls: category.activeUrls,
      },
    ]
  }

  return []
}

/**
 * Flatten every settings section into second-level items for the main console
 * sidebar. Item titles stay short; the parent "System Settings" group already
 * provides the category context.
 */
export function getSystemSettingsNavItems(
  t: TFunction
): NavCollapsible['items'] {
  const settingsGroup = getSystemSettingsNavGroups(t)[0]

  return settingsGroup.items.flatMap((category) =>
    flattenSettingsCategory(category)
  )
}

/**
 * Nested sidebar view for `/system-settings/*`.
 *
 * Activates the Vercel / Cloudflare-style drill-in sidebar:
 * the root navigation is replaced by the system administration
 * groups, with a "Back to Dashboard" affordance in the header.
 */
export const SYSTEM_SETTINGS_VIEW: SidebarView = {
  id: 'system-settings',
  pathPattern: /^\/system-settings(\/|$)/,
  parent: {
    to: '/dashboard/overview',
    label: 'Back to Dashboard',
  },
  getNavGroups: getSystemSettingsNavGroups,
}
