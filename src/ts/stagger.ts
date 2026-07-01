import { UMINATION_EFFECT_CLASSES, UMINATION_STAGGER_CLASS } from './constants.js'

const DELAY_CLASS_PATTERN = /^umn-delay-\d+$/

function getEffectSelector(): string {
  return UMINATION_EFFECT_CLASSES.map((c) => `.${c}`).join(', ')
}

function hasManualDelay(el: Element): boolean {
  return Array.from(el.classList).some((c) => DELAY_CLASS_PATTERN.test(c))
}

export function applyStagger(): void {
  const parents = document.querySelectorAll<HTMLElement>(`.${UMINATION_STAGGER_CLASS}`)
  const effectSelector = getEffectSelector()

  parents.forEach((parent) => {
    let index = 0
    Array.from(parent.children).forEach((child) => {
      if (!(child instanceof HTMLElement)) return
      if (!child.matches(effectSelector)) return

      if (!hasManualDelay(child)) {
        child.style.setProperty('--umn-delay', `calc(var(--umn-stagger-step) * ${index})`)
      }
      index++
    })
  })
}
