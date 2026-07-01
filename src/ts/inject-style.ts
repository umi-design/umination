export function injectStyle(css: string): void {
  if (document.querySelector('style[data-umination]')) return

  const style = document.createElement('style')
  style.setAttribute('data-umination', '')
  style.textContent = css
  document.head.appendChild(style)
}
