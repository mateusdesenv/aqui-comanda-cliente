import { Component, Input } from '@angular/core';
import { IconComponent, IconName } from './icon.component';

@Component({
  selector: 'app-stat-card',
  standalone: true,
  imports: [IconComponent],
  template: `
    <article class="stat-card liquid-glass-card liquid-glass-hover">
      <span class="stat-icon {{ variant }}">
        <app-icon [name]="icon" [size]="28" />
      </span>

      <div>
        <span class="stat-label">{{ label }}</span>
        <strong class="stat-value {{ variant }}">{{ value }}</strong>
        <small>{{ helper }}</small>
      </div>
    </article>
  `,
})
export class StatCardComponent {
  @Input({ required: true }) icon!: IconName;
  @Input({ required: true }) label!: string;
  @Input({ required: true }) value!: string | number;
  @Input({ required: true }) helper!: string;
  @Input() variant: 'green' | 'amber' | 'dark' | 'neutral' = 'green';
}
