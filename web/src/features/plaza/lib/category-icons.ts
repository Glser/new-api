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
import {
  AudioLines,
  Binary,
  Bot,
  Boxes,
  Brain,
  Code,
  Eye,
  FileText,
  Film,
  Image,
  Languages,
  Layers,
  MessagesSquare,
  Mic,
  Music,
  Search,
  Sparkles,
  Wand2,
  Workflow,
  type LucideIcon,
} from 'lucide-react'

/**
 * Icons an admin can pick for a plaza category. Stored by name in the
 * category config; an unknown name falls back to Boxes.
 */
export const PLAZA_CATEGORY_ICONS: Record<string, LucideIcon> = {
  MessagesSquare,
  Image,
  Film,
  AudioLines,
  Mic,
  Music,
  Binary,
  Search,
  Brain,
  Bot,
  Code,
  Eye,
  FileText,
  Languages,
  Layers,
  Sparkles,
  Wand2,
  Workflow,
  Boxes,
}

export const PLAZA_CATEGORY_ICON_NAMES = Object.keys(PLAZA_CATEGORY_ICONS)

export function getPlazaCategoryIcon(name?: string): LucideIcon {
  return (name && PLAZA_CATEGORY_ICONS[name]) || Boxes
}
