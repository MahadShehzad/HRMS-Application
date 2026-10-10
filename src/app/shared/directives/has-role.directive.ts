import { Directive, effect, inject, input, TemplateRef, ViewContainerRef } from '@angular/core';
import { AuthService } from '../../core/auth/auth.service';
import { Role } from '../../core/models';

/**
 * Renders its template only for the listed roles.
 *   <button *appHasRole="['admin', 'hr']">Delete</button>
 */
@Directive({ selector: '[appHasRole]' })
export class HasRoleDirective {
  readonly appHasRole = input.required<Role[]>();

  private readonly auth = inject(AuthService);
  private readonly tpl = inject(TemplateRef<unknown>);
  private readonly vcr = inject(ViewContainerRef);
  private shown = false;

  constructor() {
    effect(() => {
      const allowed = this.auth.hasRole(...this.appHasRole());
      if (allowed && !this.shown) this.vcr.createEmbeddedView(this.tpl);
      if (!allowed && this.shown) this.vcr.clear();
      this.shown = allowed;
    });
  }
}
