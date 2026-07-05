import { Injectable, signal } from '@angular/core';

export type UiScale = 'mini' | 'tiny' | 'small' | 'medium' | 'large';

const STORAGE_KEY = 'aqui-comanda:ui-scale';
const SCALE_CLASSES: Record<UiScale, string> = {
  mini: 'ui-scale-mini',
  tiny: 'ui-scale-tiny',
  small: 'ui-scale-small',
  medium: 'ui-scale-medium',
  large: 'ui-scale-large',
};

@Injectable({ providedIn: 'root' })
export class UiSettingsService {
  readonly scale = signal<UiScale>(this.loadFromStorage());

  constructor() {
    this.applyScaleClass(this.scale());
  }

  getScale(): UiScale {
    return this.scale();
  }

  setScale(scale: UiScale): void {
    this.scale.set(scale);
    this.persist(scale);
    this.applyScaleClass(scale);
  }

  loadFromStorage(): UiScale {
    if (typeof localStorage === 'undefined') {
      return 'medium';
    }

    const storedScale = localStorage.getItem(STORAGE_KEY);

    if (
      storedScale === 'mini' ||
      storedScale === 'tiny' ||
      storedScale === 'small' ||
      storedScale === 'medium' ||
      storedScale === 'large'
    ) {
      return storedScale;
    }

    return 'medium';
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

  private persist(scale: UiScale): void {
    if (typeof localStorage === 'undefined') {
      return;
    }

    localStorage.setItem(STORAGE_KEY, scale);
  }
}
