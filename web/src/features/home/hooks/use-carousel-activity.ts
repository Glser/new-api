/*
Copyright (C) 2023-2026 QuantumNous
*/
import { useEffect, useRef, useState } from 'react'

import { useMediaQuery } from '@/hooks/use-media-query'

/** Only advance a home carousel while it is visible and motion is allowed. */
export function useCarouselActivity<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [isVisible, setIsVisible] = useState(false)
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)')

  useEffect(() => {
    const element = ref.current
    if (!element) return

    let isIntersecting = false
    const updateVisibility = () => {
      setIsVisible(isIntersecting && document.visibilityState === 'visible')
    }
    const observer = new IntersectionObserver(([entry]) => {
      isIntersecting = entry.isIntersecting && entry.intersectionRatio > 0
      updateVisibility()
    })

    observer.observe(element)
    document.addEventListener('visibilitychange', updateVisibility)
    return () => {
      observer.disconnect()
      document.removeEventListener('visibilitychange', updateVisibility)
    }
  }, [])

  return { ref, isActive: isVisible && !reducedMotion }
}
