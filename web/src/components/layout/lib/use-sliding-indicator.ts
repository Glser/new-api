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
import { useLayoutEffect, useRef, useState } from 'react'

/**
 * Geometry a sliding indicator needs to glide between slots.
 *
 * Offsets are relative to the rail's own box, so the indicator can sit
 * absolutely positioned inside it regardless of axis.
 */
export type SlidingIndicatorState = {
  /** Index of the selected slot, or `-1` when nothing is selected. */
  activeIndex: number
  /** Left offset of the selected slot, in pixels. */
  offsetX: number
  /** Top offset of the selected slot, in pixels. */
  offsetY: number
  /** Width of the selected slot, in pixels. */
  width: number
  /** Height of the selected slot, in pixels. */
  height: number
  /** True until the first measurement lands, so the indicator can start hidden. */
  unmeasured: boolean
}

/**
 * Measure the selected slot of a rail and drive a sliding indicator.
 *
 * The rail registers its slots through `registerItem`; the hook watches the
 * active index and re-measures on resize, font load and slot-count changes so
 * the indicator never drifts out of alignment. Works for both the horizontal
 * pill rail and a vertically stacked mobile list.
 *
 * @param items Slot list; only `key` is read, to detect list changes.
 * @param activeIndex Currently selected slot index, or a negative number.
 */
export function useSlidingIndicator(
  items: readonly { key: string }[],
  activeIndex: number
): {
  state: SlidingIndicatorState
  /** Attach to the rail element that positions the slots. */
  railRef: React.RefObject<HTMLDivElement | null>
  /** Attach to every slot, in order, as a callback ref. */
  registerItem: (index: number) => (element: HTMLElement | null) => void
} {
  const railRef = useRef<HTMLDivElement | null>(null)
  const itemsRef = useRef<HTMLElement[]>([])
  const [state, setState] = useState<SlidingIndicatorState>({
    activeIndex: -1,
    offsetX: 0,
    offsetY: 0,
    width: 0,
    height: 0,
    unmeasured: true,
  })

  const itemsKey = items.map((item) => item.key).join('|')

  const registerItem = (index: number) => (element: HTMLElement | null) => {
    if (element) {
      itemsRef.current[index] = element
      return
    }
    delete itemsRef.current[index]
  }

  useLayoutEffect(() => {
    const rail = railRef.current
    if (!rail || activeIndex < 0) {
      setState((previous) =>
        previous.activeIndex === activeIndex && !previous.unmeasured
          ? previous
          : { ...previous, activeIndex, unmeasured: activeIndex < 0 }
      )
      return
    }

    let frame = 0

    const measure = () => {
      const active = itemsRef.current[activeIndex]
      if (!active) {
        // The slot's callback ref has not run yet on this pass. Layout effects
        // run before refs are attached in some remounts, so retry on the next
        // frame rather than leaving the indicator hidden for good.
        if (!frame) frame = requestAnimationFrame(measure)
        return
      }
      frame = 0
      const activeRect = active.getBoundingClientRect()
      const railRect = rail.getBoundingClientRect()
      if (activeRect.width === 0 || activeRect.height === 0) {
        if (!frame) frame = requestAnimationFrame(measure)
        return
      }
      setState((previous) =>
        previous.unmeasured ||
        previous.activeIndex !== activeIndex ||
        Math.abs(previous.offsetX - (activeRect.left - railRect.left)) > 0.5 ||
        Math.abs(previous.offsetY - (activeRect.top - railRect.top)) > 0.5 ||
        Math.abs(previous.width - activeRect.width) > 0.5 ||
        Math.abs(previous.height - activeRect.height) > 0.5
          ? {
              activeIndex,
              offsetX: activeRect.left - railRect.left,
              offsetY: activeRect.top - railRect.top,
              width: activeRect.width,
              height: activeRect.height,
              unmeasured: false,
            }
          : previous
      )
    }

    measure()

    const observer = new ResizeObserver(measure)
    observer.observe(rail)
    // `itemsRef.current` is sparse: `forEach` skips holes, so a slot that has
    // not registered yet is simply not observed. `measure` retries on the next
    // frame instead, so the indicator still lands once the ref attaches.
    itemsRef.current.forEach((item) => {
      if (item) observer.observe(item)
    })

    // Fonts land after the first paint and change every slot's geometry.
    document.fonts?.ready.then(measure).catch(() => {})

    return () => {
      if (frame) cancelAnimationFrame(frame)
      observer.disconnect()
    }
  }, [activeIndex, itemsKey])

  return { state, railRef, registerItem }
}
