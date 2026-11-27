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
import type * as React from 'react'

export type DropdownMenuItemSelectEvent = React.MouseEvent<HTMLElement> & {
  preventBaseUIHandler?: () => void
}

export type DropdownMenuItemSelectHandler = (
  event: DropdownMenuItemSelectEvent
) => void

export function handleDropdownMenuItemSelect(
  event: DropdownMenuItemSelectEvent,
  onClick?: React.MouseEventHandler<HTMLElement>,
  onSelect?: DropdownMenuItemSelectHandler
) {
  // 菜单经 Portal 渲染到 body，DOM 冒泡不经过触发容器，但 React 合成
  // 事件仍沿 React 树冒泡（Portal 的经典陷阱）。菜单项点击不应激活外层
  // 容器的 onClick（如渠道卡片的「点击进编辑」），故在入口统一阻断。
  event.stopPropagation()
  onClick?.(event)

  if (!event.defaultPrevented) {
    onSelect?.(event)
  }

  if (event.defaultPrevented) {
    event.preventBaseUIHandler?.()
  }
}
