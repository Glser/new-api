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

const EMOTION_BALL_SCRIPTS = [
  '/emotion-ball/rings.js',
  '/emotion-ball/emotions.js',
  '/emotion-ball/ball.js',
  '/emotion-ball/engine.js',
] as const

export type EmotionBallInstance = {
  setGaze: (nx: number, ny: number) => unknown
  clearGaze: () => unknown
  spin: (n?: number) => unknown
  destroy: () => void
}

export type EmotionBallApi = {
  create: (
    el: HTMLElement,
    opts?: {
      emotion?: string
      lite?: boolean
      eyeScale?: number
      idle?: boolean | object
      label?: string
      color?: string
      eyeColor?: string
    }
  ) => EmotionBallInstance
}

declare global {
  interface Window {
    EmotionBall?: EmotionBallApi
  }
}

let loadPromise: Promise<EmotionBallApi> | null = null

function loadScript(src: string): Promise<void> {
  const existing = document.querySelector<HTMLScriptElement>(
    `script[data-emotion-ball="${src}"]`
  )
  if (existing) {
    return new Promise((resolve, reject) => {
      if (existing.dataset.emotionBallLoaded === 'true') {
        resolve()
        return
      }
      existing.addEventListener('load', () => resolve(), { once: true })
      existing.addEventListener(
        'error',
        () => reject(new Error(`Failed to load Emotion Ball script: ${src}`)),
        { once: true }
      )
    })
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = src
    script.async = false
    script.setAttribute('data-emotion-ball', src)
    script.addEventListener(
      'load',
      () => {
        script.dataset.emotionBallLoaded = 'true'
        resolve()
      },
      { once: true }
    )
    script.addEventListener(
      'error',
      () => reject(new Error(`Failed to load Emotion Ball script: ${src}`)),
      { once: true }
    )
    document.head.appendChild(script)
  })
}

export function loadEmotionBall(): Promise<EmotionBallApi> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Emotion Ball is only available in the browser'))
  }

  if (window.EmotionBall) {
    return Promise.resolve(window.EmotionBall)
  }

  if (!loadPromise) {
    loadPromise = (async () => {
      try {
        for (const src of EMOTION_BALL_SCRIPTS) {
          await loadScript(src)
        }
        if (!window.EmotionBall) {
          throw new Error('Emotion Ball failed to initialize')
        }
        return window.EmotionBall
      } catch (error) {
        loadPromise = null
        throw error
      }
    })()
  }

  return loadPromise
}
