import {
  UMINATION_TYPING_CLASS,
  UMINATION_TYPING_CHAR_CLASS,
  UMINATION_TYPING_CURSOR_CLASS,
  UMINATION_TYPING_TYPED_CLASS,
  TYPING_OBSERVER_OPTIONS,
} from './constants.js'

export function splitIntoChars(el: HTMLElement): HTMLElement[] {
  const text = el.textContent ?? ''
  el.textContent = ''
  const chars: HTMLElement[] = []

  for (const ch of text) {
    if (ch === '\n') {
      el.appendChild(document.createElement('br'))
      continue
    }
    const span = document.createElement('span')
    span.className = UMINATION_TYPING_CHAR_CLASS
    span.textContent = ch === ' ' ? ' ' : ch
    el.appendChild(span)
    chars.push(span)
  }

  return chars
}

export function getSelector(): string {
  return `.${UMINATION_TYPING_CLASS}`
}

export function createCursor(): HTMLElement {
  const cursor = document.createElement('span')
  cursor.className = UMINATION_TYPING_CURSOR_CLASS
  cursor.setAttribute('aria-hidden', 'true')
  return cursor
}

function getTypingSpeed(el: HTMLElement): number {
  const value = getComputedStyle(el).getPropertyValue('--umn-typing-speed')
  const parsed = parseFloat(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 45
}

export function typeElement(el: HTMLElement, chars: HTMLElement[], cursor: HTMLElement): void {
  if (chars.length === 0) return

  el.insertBefore(cursor, chars[0])

  const speed = getTypingSpeed(el)
  let index = 0
  let startTime: number | null = null

  function step(timestamp: number): void {
    if (startTime === null) startTime = timestamp
    const elapsed = timestamp - startTime
    const targetIndex = Math.min(chars.length, Math.floor(elapsed / speed) + 1)

    while (index < targetIndex) {
      chars[index].classList.add(UMINATION_TYPING_TYPED_CLASS)
      chars[index].after(cursor)
      index++
    }

    if (index < chars.length) {
      requestAnimationFrame(step)
    } else {
      cursor.remove()
    }
  }

  requestAnimationFrame(step)
}

let observer: IntersectionObserver | null = null
let initialized = false
const processedElements = new WeakSet<Element>()

function onIntersect(entries: IntersectionObserverEntry[]): void {
  for (const entry of entries) {
    if (!entry.isIntersecting) continue
    const el = entry.target as HTMLElement
    observer?.unobserve(el)

    const chars = splitIntoChars(el)
    const cursor = createCursor()
    typeElement(el, chars, cursor)
  }
}

function createObserver(): IntersectionObserver {
  return new IntersectionObserver(onIntersect, TYPING_OBSERVER_OPTIONS)
}

function observeNewElements(): void {
  const elements = document.querySelectorAll<HTMLElement>(getSelector())
  elements.forEach((el) => {
    if (processedElements.has(el)) return
    processedElements.add(el)
    observer!.observe(el)
  })
}

export function initTyping(): void {
  if (initialized) return
  initialized = true

  observer = createObserver()
  observeNewElements()
}

export function refreshTyping(): void {
  if (!observer) return
  observeNewElements()
}

export function destroyTyping(): void {
  observer?.disconnect()
  observer = null
  initialized = false
}
