import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { UiSettingsService } from './services/ui-settings.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: '<router-outlet />',
})
export class App {
  private readonly uiSettings = inject(UiSettingsService);
}
