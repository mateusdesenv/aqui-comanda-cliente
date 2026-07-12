import { Injectable, inject, signal } from '@angular/core';
import { lastValueFrom } from 'rxjs';
import { ApiClientService } from '../core/api/api-client.service';
import { ApiBackedState } from '../core/api/api-backed-state';

export type UiScale = 'mini' | 'tiny' | 'small' | 'medium' | 'large';

const SCALE_CLASSES: Record<UiScale, string> = {
  mini: 'ui-scale-mini',
  tiny: 'ui-scale-tiny',
  small: 'ui-scale-small',
  medium: 'ui-scale-medium',
  large: 'ui-scale-large',
};

@Injectable({ providedIn: 'root' })
export class UiSettingsService extends ApiBackedState {
  private readonly api = inject(ApiClientService);
  readonly scale = signal<UiScale>('medium');

  constructor() {
    super();
    this.applyScaleClass(this.scale());
  }

  getScale(): UiScale {
    return this.scale();
  }

  clearData(): void {
    super.clearLoadState();
    this.scale.set('medium');
    this.applyScaleClass('medium');
  }

  setScale(scale: UiScale): void {
    this.scale.set(scale);
    this.applyScaleClass(scale);
    void lastValueFrom(this.api.put<{ uiScale: UiScale }>('/configuracoes/ui', { uiScale: scale })).then((settings) => {
      this.scale.set(settings.uiScale);
      this.applyScaleClass(settings.uiScale);
    }).catch(() => this.reload().catch(() => undefined));
  }

  applyScaleClass(scale: UiScale): void {
    if (typeof document === 'undefined') {
      return;
    }

    const body = document.body;
    Object.values(SCALE_CLASSES).forEach((className) => body.classList.remove(className));
    body.classList.add(SCALE_CLASSES[scale]);
  }

  getScaleLabel(scale: UiScale = this.scale()): string {
    const labels: Record<UiScale, string> = {
      mini: 'Mini',
      tiny: 'Muito pequeno',
      small: 'Pequeno',
      medium: 'Médio',
      large: 'Grande',
    };

    return labels[scale];
  }

  protected override async loadFromApi(): Promise<void> {
    const settings = await lastValueFrom(this.api.get<{ uiScale: UiScale }>('/configuracoes/ui'));
    const scale = settings.uiScale ?? 'medium';
    this.scale.set(scale);
    this.applyScaleClass(scale);
  }
}
