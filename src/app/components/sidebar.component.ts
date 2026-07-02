import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { MenuOrderService, NavigationMenuItem } from '../services/menu-order.service';
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
        @for (item of visibleMenuItems(); track item.id) {
          @if (item.children?.length) {
            <div class="sidebar-tree">
              <button
                type="button"
                class="sidebar-link sidebar-link-group"
                [class.active]="hasActiveChild(item)"
                [class.expanded]="isExpanded(item.id)"
                (click)="toggleGroup(item.id)"
                [attr.aria-expanded]="isExpanded(item.id)"
              >
                <span class="sidebar-link-icon">
                  <app-icon [name]="item.icon" [size]="24" />
                </span>
                <span class="sidebar-link-label">{{ item.label }}</span>
                <span class="sidebar-link-chevron" aria-hidden="true">
                  <app-icon name="chevron" [size]="18" />
                </span>
              </button>

              @if (isExpanded(item.id)) {
                <div class="sidebar-subnav">
                  @for (child of visibleChildren(item); track child.id) {
                    @if (child.disabled) {
                      <button
                        type="button"
                        class="sidebar-sub-link sidebar-link-disabled"
                        disabled
                        aria-disabled="true"
                        [attr.title]="child.badge || 'Tela em construção'"
                      >
                        <span class="sidebar-sub-dot" aria-hidden="true"></span>
                        <span class="sidebar-link-label">{{ child.label }}</span>
                        @if (child.badge) {
                          <span class="sidebar-link-badge">{{ child.badge }}</span>
                        }
                      </button>
                    } @else {
                      <a
                        [routerLink]="child.path"
                        routerLinkActive="active"
                        [routerLinkActiveOptions]="{ exact: true }"
                        class="sidebar-sub-link"
                      >
                        <span class="sidebar-sub-dot" aria-hidden="true"></span>
                        <span class="sidebar-link-label">{{ child.label }}</span>
                      </a>
                    }
                  }
                </div>
              }
            </div>
          } @else if (item.disabled) {
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
  private readonly router = inject(Router);
  private readonly menuOrderService = inject(MenuOrderService);
  private readonly manuallyExpandedGroups = signal<Set<string>>(new Set());

  protected readonly visibleMenuItems = computed(() =>
    this.menuOrderService
      .menuItems()
      .filter((item) => (item.children?.length ? this.visibleChildren(item).length > 0 : this.authService.canRead(item.tela))),
  );

  protected visibleChildren(item: NavigationMenuItem): NavigationMenuItem[] {
    return (item.children ?? []).filter((child) => this.authService.canRead(child.tela));
  }

  protected toggleGroup(itemId: string): void {
    const expandedGroups = new Set(this.manuallyExpandedGroups());

    if (expandedGroups.has(itemId)) {
      expandedGroups.delete(itemId);
    } else {
      expandedGroups.add(itemId);
    }

    this.manuallyExpandedGroups.set(expandedGroups);
  }

  protected isExpanded(itemId: string): boolean {
    return this.manuallyExpandedGroups().has(itemId) || this.isRouteInsideGroup(itemId);
  }

  protected hasActiveChild(item: NavigationMenuItem): boolean {
    return this.isRouteInsideGroup(item.id);
  }

  private isRouteInsideGroup(itemId: string): boolean {
    if (itemId !== 'configuracoes') {
      return false;
    }

    return this.router.url.startsWith('/configuracoes');
  }
}
