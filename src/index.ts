// CSS を inline 文字列として import（JS バンドルに同梱 → head 注入用）
import cssText from './css/index.css?inline'
// CSS を副作用 import（Vite が dist/umination.css として抽出する）
import './css/index.css'

import { injectStyle } from './ts/inject-style.js'
import { initObserver, refreshObserver, destroyObserver } from './ts/observer.js'
export { UMINATION_EFFECT_CLASSES } from './ts/constants.js'

export function initUmination(): void {
  injectStyle(cssText)
  initObserver()
}

export function refreshUmination(): void {
  refreshObserver()
}

export function destroyUmination(): void {
  destroyObserver()
}

// window.Umination を公開（script type="module" では自動 export されないため明示的に代入）
declare global {
  interface Window {
    Umination: {
      init: () => void
      refresh: () => void
      destroy: () => void
    }
  }
}

window.Umination = {
  init: initUmination,
  refresh: refreshUmination,
  destroy: destroyUmination,
}

// 自動初期化（二重 init は initObserver 内部フラグで防ぐ）
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initUmination, { once: true })
} else {
  initUmination()
}
