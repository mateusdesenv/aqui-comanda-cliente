import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { IconComponent, IconName } from './icon.component';

interface MenuItem {
  label: string;
  path: string;
  icon: IconName;
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
        @for (item of menuItems; track item.path) {
          <a
            [routerLink]="item.path"
            routerLinkActive="active"
            [routerLinkActiveOptions]="{ exact: true }"
            class="sidebar-link"
          >
            <span class="sidebar-link-icon">
              <app-icon [name]="item.icon" [size]="24" />
            </span>
            <span>{{ item.label }}</span>
          </a>
        }
      </nav>

      <div class="sidebar-safe-card">
        <span class="sidebar-safe-icon">
          <app-icon name="shield" [size]="26" />
        </span>
        <div>
          <strong>Seguro. Simples. Completo.</strong>
          <p>Pensado para o dia a dia do seu negócio.</p>
        </div>
      </div>
    </aside>
  `,
})
export class SidebarComponent {
  protected readonly menuItems: MenuItem[] = [
    { label: 'Mapa de Comandas', path: '/mapa', icon: 'commandMap' },
    { label: 'Comandas', path: '/comandas', icon: 'receipt' },
    { label: 'Mesas', path: '/mesas', icon: 'table' },
    { label: 'Clientes', path: '/clientes', icon: 'users' },
    { label: 'Pedidos', path: '/pedidos', icon: 'bell' },
    { label: 'Caixa', path: '/caixa', icon: 'register' },
    { label: 'Cardápio', path: '/cardapio', icon: 'cards' },
    { label: 'Relatórios', path: '/relatorios', icon: 'file' },
    { label: 'Configurações', path: '/configuracoes', icon: 'settings' },
  ];
}
