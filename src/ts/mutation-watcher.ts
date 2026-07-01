let observer: MutationObserver | null = null
let scheduled = false

export function initMutationWatcher(onMutate: () => void): void {
  if (observer) return

  observer = new MutationObserver(() => {
    if (scheduled) return
    scheduled = true
    queueMicrotask(() => {
      scheduled = false
      onMutate()
    })
  })

  observer.observe(document.body, { childList: true, subtree: true })
}

export function destroyMutationWatcher(): void {
  observer?.disconnect()
  observer = null
  scheduled = false
}
