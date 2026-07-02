import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HeaderComponent } from './header.component';
import { SidebarComponent } from './sidebar.component';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [RouterOutlet, HeaderComponent, SidebarComponent],
  template: `
    <main class="app-shell">
      <app-sidebar />
      <div class="app-workspace">
        <app-header />
        <section class="app-content">
          <router-outlet />
        </section>
      </div>
    </main>
  `,
})
export class AppLayoutComponent {}
