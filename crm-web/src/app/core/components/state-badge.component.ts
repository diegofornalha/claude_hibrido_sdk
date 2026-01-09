import { Component, ChangeDetectionStrategy, computed, input } from '@angular/core';
import { LeadState, LEAD_STATE_CONFIG } from '../models/lead.model';

@Component({
  selector: 'app-state-badge',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span [class]="badgeClass()">
      {{ config().label }}
    </span>
  `
})
export class StateBadgeComponent {
  readonly state = input.required<LeadState>();

  readonly config = computed(() =>
    LEAD_STATE_CONFIG[this.state()] || LEAD_STATE_CONFIG.novo
  );

  readonly badgeClass = computed(() =>
    `px-2 py-1 text-xs font-medium rounded-full ${this.config().bgClass} ${this.config().textClass}`
  );
}
