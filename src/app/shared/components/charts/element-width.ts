import { afterNextRender, DestroyRef, ElementRef, inject, signal } from '@angular/core';

/** Signal holding the host element's content width; updates on resize. */
export function elementWidth(fallback = 600) {
  const el = inject(ElementRef<HTMLElement>).nativeElement as HTMLElement;
  const width = signal(fallback);
  let ro: ResizeObserver | undefined;
  afterNextRender(() => {
    width.set(el.clientWidth || fallback);
    ro = new ResizeObserver(([entry]) => {
      const w = Math.round(entry.contentRect.width);
      if (w && w !== width()) width.set(w);
    });
    ro.observe(el);
  });
  inject(DestroyRef).onDestroy(() => ro?.disconnect());
  return width;
}
