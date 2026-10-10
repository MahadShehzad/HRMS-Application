import { Directive, ElementRef, effect, inject, input, OnDestroy } from '@angular/core';

/**
 * Animates a number from its previous value to the new one.
 * Writes straight to the DOM inside requestAnimationFrame — no change detection cost.
 *
 *   <span [appCountUp]="total" format="currency"></span>
 */
@Directive({ selector: '[appCountUp]' })
export class CountUpDirective implements OnDestroy {
  readonly appCountUp = input.required<number>();
  readonly format = input<'number' | 'currency' | 'percent' | 'compact'>('number');
  readonly decimals = input(0);
  readonly currency = input('USD');
  readonly duration = input(700);

  private readonly el = inject(ElementRef<HTMLElement>).nativeElement as HTMLElement;
  private frame = 0;
  private current = 0;
  private readonly reduceMotion =
    typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

  constructor() {
    effect(() => this.animateTo(this.appCountUp() ?? 0));
  }

  ngOnDestroy(): void {
    cancelAnimationFrame(this.frame);
  }

  private animateTo(target: number): void {
    cancelAnimationFrame(this.frame);
    const from = this.current;
    const duration = this.duration();
    if (this.reduceMotion || duration <= 0 || from === target) {
      this.render(target);
      return;
    }
    const start = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      this.render(from + (target - from) * eased);
      if (t < 1) this.frame = requestAnimationFrame(step);
    };
    this.frame = requestAnimationFrame(step);
  }

  private render(value: number): void {
    this.current = value;
    const d = this.decimals();
    const opts: Intl.NumberFormatOptions = { minimumFractionDigits: d, maximumFractionDigits: d };
    switch (this.format()) {
      case 'currency':
        Object.assign(opts, { style: 'currency', currency: this.currency() });
        break;
      case 'percent':
        this.el.textContent = `${value.toFixed(d)}%`;
        return;
      case 'compact':
        Object.assign(opts, { notation: 'compact', maximumFractionDigits: 1 });
        break;
    }
    this.el.textContent = new Intl.NumberFormat('en-US', opts).format(value);
  }
}
