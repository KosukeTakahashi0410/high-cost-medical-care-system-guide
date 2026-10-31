/** 要素の先頭が見える位置までスクロールする。onlyIfAbove なら、先頭が画面より上にあるときだけ動かす */
export function scrollToElement(el: HTMLElement | null, onlyIfAbove = false) {
  if (!el || typeof window.scrollTo !== 'function') return;
  const top = el.getBoundingClientRect().top;
  if (onlyIfAbove && top >= 0) return;
  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  window.scrollTo({ top: Math.max(0, top + window.scrollY - 24), behavior: reduce ? 'auto' : 'smooth' });
}
