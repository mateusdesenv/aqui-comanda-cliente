import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { MenuOrderService } from '../services/menu-order.service';
import { IconComponent } from './icon.component';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, IconComponent],
  template: `
    <aside class="sidebar" aria-label="Navegação principal">
      <div class="sidebar-brand">
        <img src="assets/logo-reversed.png" alt="QComanda" />
      </div>

      <nav class="sidebar-nav">
        @for (item of visibleMenuItems; track item.path) {
          @if (item.disabled) {
            <button
              type="button"
              class="sidebar-link sidebar-link-disabled"
              disabled
              aria-disabled="true"
              [attr.title]="item.badge || 'Tela em construção'"
            >
              <span class="sidebar-link-icon">
                <app-icon [name]="item.icon" [size]="24" />
              </span>
              <span class="sidebar-link-label">{{ item.label }}</span>
              @if (item.badge) {
                <span class="sidebar-link-badge">{{ item.badge }}</span>
              }
            </button>
          } @else {
            <a
              [routerLink]="item.path"
              routerLinkActive="active"
              [routerLinkActiveOptions]="{ exact: true }"
              class="sidebar-link"
            >
              <span class="sidebar-link-icon">
                <app-icon [name]="item.icon" [size]="24" />
              </span>
              <span class="sidebar-link-label">{{ item.label }}</span>
            </a>
          }
        }
      </nav>

      <div class="sidebar-safe-card">
        <span class="sidebar-safe-icon">
          <app-icon name="shield" [size]="26" />
        </span>
        <div>
          <strong>{{ authService.currentUser()?.nome || 'Usuário' }}</strong>
          <p>{{ authService.currentUser()?.nivel === 'admin' ? 'Acesso administrador' : 'Acesso por permissão' }}</p>
        </div>
      </div>
    </aside>
  `,
})
export class SidebarComponent {
  protected readonly authService = inject(AuthService);
  private readonly menuOrderService = inject(MenuOrderService);

  protected get visibleMenuItems() {
    return this.menuOrderService.menuItems().filter((item) => this.authService.canRead(item.tela));
  }
}
