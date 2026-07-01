export const UMINATION_READY_CLASS = 'umn-ready'
export const UMINATION_VISIBLE_CLASS = 'is-visible'
export const UMINATION_STAGGER_CLASS = 'umn-stagger'

export const UMINATION_EFFECT_CLASSES = [
  'umn-fade-in',
  'umn-slide-up',
  'umn-slide-down',
  'umn-slide-left',
  'umn-slide-right',
  'umn-blur-in',
  'umn-scale-in',
] as const

export type UminationEffectClass = typeof UMINATION_EFFECT_CLASSES[number]

export const OBSERVER_OPTIONS: IntersectionObserverInit = {
  root: null,
  rootMargin: '0px 0px -10% 0px',
  threshold: 0.1,
}
