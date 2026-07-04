import {
  UMINATION_TYPING_CLASS,
  UMINATION_TYPING_CHAR_CLASS,
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
