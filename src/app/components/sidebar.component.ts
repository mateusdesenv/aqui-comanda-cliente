import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { TelaSistema } from '../models/app-data';
import { AuthService } from '../services/auth.service';
import { IconComponent, IconName } from './icon.component';

interface MenuItem {
  label: string;
  path: string;
  icon: IconName;
  tela: TelaSistema;
  disabled?: boolean;
  badge?: string;
}

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

  private readonly menuItems: MenuItem[] = [
    { label: 'Mapa de Comandas', path: '/mapa', icon: 'commandMap', tela: 'mapa' },
    { label: 'Comandas', path: '/comandas', icon: 'receipt', tela: 'comandas', disabled: true, badge: 'Em breve' },
    { label: 'Mesas', path: '/mesas', icon: 'table', tela: 'mesas' },
    { label: 'Clientes', path: '/clientes', icon: 'users', tela: 'clientes' },
    { label: 'Pedidos', path: '/pedidos', icon: 'bell', tela: 'pedidos' },
    { label: 'Colaboradores', path: '/colaboradores', icon: 'shield', tela: 'colaboradores' },
    { label: 'Caixa', path: '/caixa', icon: 'register', tela: 'caixa', disabled: true, badge: 'Em breve' },
    { label: 'Cardápio', path: '/cardapio', icon: 'cards', tela: 'cardapio' },
    { label: 'Relatórios', path: '/relatorios', icon: 'file', tela: 'relatorios', disabled: true, badge: 'Em breve' },
    { label: 'Configurações', path: '/configuracoes', icon: 'settings', tela: 'configuracoes' },
  ];

  protected get visibleMenuItems(): MenuItem[] {
    return this.menuItems.filter((item) => this.authService.canRead(item.tela));
  }
}
