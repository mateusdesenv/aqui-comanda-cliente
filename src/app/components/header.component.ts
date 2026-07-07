import { Component, ElementRef, HostListener, computed, inject, signal } from '@angular/core';
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
            [attr.aria-label]="'Abrir menu de ' + userName()"
            [attr.aria-expanded]="userMenuOpen"
            (click)="toggleUserMenu()"
          >
            @if (userPhotoUrl()) {
              <img
                class="topbar-avatar-image"
                [src]="userPhotoUrl()!"
                [alt]="userName()"
                referrerpolicy="no-referrer"
                loading="lazy"
                (error)="onAvatarImageError()"
              />
            } @else {
              <span class="topbar-avatar-fallback" aria-hidden="true">{{ userInitials() }}</span>
            }
          </button>

          @if (userMenuOpen) {
            <div class="topbar-user-dropdown" role="menu" aria-label="Menu do usuário">
              <div class="topbar-user-summary" aria-label="Usuário atual">
                @if (userPhotoUrl()) {
                  <img
                    class="topbar-user-summary-image"
                    [src]="userPhotoUrl()!"
                    [alt]="userName()"
                    referrerpolicy="no-referrer"
                    loading="lazy"
                    (error)="onAvatarImageError()"
                  />
                } @else {
                  <span class="topbar-user-summary-fallback" aria-hidden="true">{{ userInitials() }}</span>
                }

                <div class="topbar-user-summary-text">
                  <strong>{{ userName() }}</strong>
                  @if (userEmail()) {
                    <small>{{ userEmail() }}</small>
                  }
                </div>
              </div>

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
  private readonly avatarImageFailed = signal(false);
  protected userMenuOpen = false;

  protected readonly userPhotoUrl = computed(() => {
    if (this.avatarImageFailed()) {
      return null;
    }

    return this.authService.user()?.photoURL || null;
  });

  protected readonly userName = computed(() => {
    const firebaseUser = this.authService.user();
    const membership = this.authService.currentUser();

    return firebaseUser?.displayName || membership?.nome || firebaseUser?.email || 'Usuário';
  });

  protected readonly userEmail = computed(() => {
    const firebaseUser = this.authService.user();
    const membership = this.authService.currentUser();

    return firebaseUser?.email || membership?.usuario || '';
  });

  protected readonly userInitials = computed(() => {
    const name = this.userName().trim();
    const email = this.userEmail().trim();

    if (name && name !== 'Usuário') {
      return name
        .split(/\s+/)
        .slice(0, 2)
        .map((part) => part[0])
        .join('')
        .toUpperCase();
    }

    if (email) {
      return email[0].toUpperCase();
    }

    return 'U';
  });

  protected toggleUserMenu(): void {
    this.userMenuOpen = !this.userMenuOpen;
  }

  protected onAvatarImageError(): void {
    this.avatarImageFailed.set(true);
  }

  protected async logout(): Promise<void> {
    this.userMenuOpen = false;
    this.avatarImageFailed.set(false);
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
