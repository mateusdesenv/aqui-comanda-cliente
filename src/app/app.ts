import { Component, effect, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AuthService } from './services/auth.service';
import { UiSettingsService } from './services/ui-settings.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: '<router-outlet />',
})
export class App {
  private readonly authService = inject(AuthService);
  private readonly uiSettings = inject(UiSettingsService);

  constructor() {
    effect(() => {
      if (this.authService.isAuthenticated()) {
        void this.uiSettings.ensureLoaded().catch(() => undefined);
      }
    });
  }
}
