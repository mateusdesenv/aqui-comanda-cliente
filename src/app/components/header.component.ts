import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { IconComponent } from './icon.component';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [IconComponent],
  template: `
    <header class="topbar">
      <button class="establishment-selector" type="button" aria-label="Selecionar estabelecimento">
        <span>Bar do Centro</span>
        <app-icon name="chevron" [size]="18" />
      </button>

      <div class="topbar-actions">
        <label class="topbar-search" aria-label="Buscar no sistema">
          <app-icon name="search" [size]="22" />
          <input type="search" placeholder="Buscar no sistema..." />
        </label>

        <button class="topbar-button" type="button">
          <app-icon name="users" [size]="22" />
          <span>{{ authService.currentUser()?.usuario || 'Usuário' }}</span>
        </button>

        <button class="topbar-button" type="button" (click)="logout()">
          <app-icon name="logout" [size]="22" />
          <span>Sair</span>
        </button>
      </div>
    </header>
  `,
})
export class HeaderComponent {
  protected readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  protected logout(): void {
    this.authService.logout();
    this.router.navigateByUrl('/login');
  }
}
