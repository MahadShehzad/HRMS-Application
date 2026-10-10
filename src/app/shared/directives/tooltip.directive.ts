import { Directive, effect, ElementRef, inject, input, OnDestroy } from '@angular/core';
import { Tooltip } from 'bootstrap';

/**
 * Bootstrap tooltip wrapper. Created lazily on first hover/focus so long
 * tables don't instantiate hundreds of tooltips up-front.
 *   <button appTooltip="Edit employee" placement="top">…</button>
 */
@Directive({
  selector: '[appTooltip]',
  host: {
    '(mouseenter)': 'init()',
    '(focusin)': 'init()',
  },
})
export class TooltipDirective implements OnDestroy {
  readonly appTooltip = input.required<string>();
  readonly placement = input<'top' | 'bottom' | 'left' | 'right'>('top');

  private readonly el = inject(ElementRef<HTMLElement>).nativeElement as HTMLElement;
  private instance: Tooltip | null = null;

  constructor() {
    effect(() => {
      const title = this.appTooltip();
      this.el.setAttribute('aria-label', title);
      this.instance?.setContent({ '.tooltip-inner': title });
    });
  }

  init(): void {
    if (this.instance || !this.appTooltip()) return;
    this.instance = new Tooltip(this.el, {
      title: this.appTooltip(),
      placement: this.placement(),
      trigger: 'hover focus',
      container: 'body',
    });
    this.instance.show();
  }

  ngOnDestroy(): void {
    this.instance?.dispose();
  }
}
