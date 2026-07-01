import {
  UMINATION_EFFECT_CLASSES,
  UMINATION_READY_CLASS,
  UMINATION_VISIBLE_CLASS,
  OBSERVER_OPTIONS,
} from './constants.js'
import { applyStagger } from './stagger.js'

let observer: IntersectionObserver | null = null
let initialized = false
const observedElements = new WeakSet<Element>()

function getSelector(): string {
  return UMINATION_EFFECT_CLASSES.map((c) => `.${c}`).join(', ')
}

function onIntersect(entries: IntersectionObserverEntry[]): void {
  for (const entry of entries) {
    if (entry.isIntersecting) {
      entry.target.classList.add(UMINATION_VISIBLE_CLASS)
      observer?.unobserve(entry.target)
    }
  }
}

function createObserver(): IntersectionObserver {
  return new IntersectionObserver(onIntersect, OBSERVER_OPTIONS)
}

export function initObserver(): void {
  if (initialized) return
  initialized = true

  document.documentElement.classList.add(UMINATION_READY_CLASS)
  applyStagger()
  observer = createObserver()

  const elements = document.querySelectorAll(getSelector())
  elements.forEach((el) => {
    observedElements.add(el)
    observer!.observe(el)
  })
}

export function refreshObserver(): void {
  if (!observer) return

  applyStagger()
  const elements = document.querySelectorAll(getSelector())
  elements.forEach((el) => {
    if (!observedElements.has(el)) {
      observedElements.add(el)
      observer!.observe(el)
    }
  })
}

export function destroyObserver(): void {
  if (observer) {
    observer.disconnect()
    observer = null
  }
  initialized = false
  // is-visible が付いた要素は残す（WeakSet はリセットのみ）
}
