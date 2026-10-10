import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/** Initials avatar with a stable colour derived from the name. */
@Component({
  selector: 'app-avatar',
  template: `{{ initials() }}`,
  styleUrl: './avatar.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class]': '"avatar avatar-" + size()',
    '[style.--avatar-h]': 'hue()',
    '[attr.title]': 'name()',
    role: 'img',
    '[attr.aria-label]': 'name()',
  },
})
export class Avatar {
  readonly name = input.required<string>();
  readonly size = input<'xs' | 'sm' | 'md' | 'lg' | 'xl'>('md');

  protected readonly initials = computed(() => {
    const parts = this.name().trim().split(/\s+/);
    return ((parts[0]?.[0] ?? '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
  });

  protected readonly hue = computed(() => {
    let h = 0;
    for (const ch of this.name()) h = (h * 31 + ch.charCodeAt(0)) % 360;
    return h;
  });
}
