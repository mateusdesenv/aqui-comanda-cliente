import { Component, ElementRef, HostListener, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { IconComponent } from './icon.component';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [IconComponent],
  template: `
    <header class="topbar">
      <div class="topbar-actions">
        <label class="topbar-search" aria-label="Buscar no sistema">
          <app-icon name="search" [size]="22" />
          <input type="search" placeholder="Buscar no sistema..." />
        </label>

        <div class="topbar-user-menu">
          <button
            class="topbar-avatar-button"
            type="button"
            aria-label="Abrir menu do usuário"
            [attr.aria-expanded]="userMenuOpen"
            (click)="toggleUserMenu()"
          >
            <app-icon name="users" [size]="22" />
          </button>

          @if (userMenuOpen) {
            <div class="topbar-user-dropdown" role="menu" aria-label="Menu do usuário">
              <button class="topbar-user-item" type="button" disabled aria-disabled="true" role="menuitem">
                Minha conta
              </button>
              <button class="topbar-user-item danger" type="button" role="menuitem" (click)="logout()">
                Sair
              </button>
            </div>
          }
        </div>
      </div>
    </header>
  `,
})
export class HeaderComponent {
  private readonly elementRef = inject(ElementRef<HTMLElement>);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  protected userMenuOpen = false;

  protected toggleUserMenu(): void {
    this.userMenuOpen = !this.userMenuOpen;
  }

  protected async logout(): Promise<void> {
    this.userMenuOpen = false;
    await this.authService.logout();
    await this.router.navigateByUrl('/login');
  }

  @HostListener('document:click', ['$event'])
  protected closeUserMenuOnOutsideClick(event: MouseEvent): void {
    if (!this.userMenuOpen || this.elementRef.nativeElement.contains(event.target as Node)) {
      return;
    }

    this.userMenuOpen = false;
  }

  @HostListener('document:keydown.escape')
  protected closeUserMenuOnEscape(): void {
    this.userMenuOpen = false;
  }
}
