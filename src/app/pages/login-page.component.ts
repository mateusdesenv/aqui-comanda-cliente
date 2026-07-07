import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IconComponent, IconName } from '../components/icon.component';
import { AuthService } from '../services/auth.service';
import { FiliaisService } from '../services/filiais.service';
import { formatCpf, isValidCpf, normalizeCpf } from '../utils/cpf';

interface Feature {
  title: string;
  description: string;
  icon: IconName;
}

interface PreviewTable {
  number: string;
  status: string;
  variant: string;
}

type AuthMode = 'login' | 'register' | 'reset';

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [FormsModule, IconComponent],
  template: `
    <main class="login-page">
      <section class="brand-panel" aria-label="Apresentação do Aqui Comanda">
        <div class="brand-panel-content">
          <img class="brand-logo" src="assets/logo-reversed.png" alt="Aqui Comanda" />

          <div class="hero-copy">
            <p class="eyebrow">SaaS para atendimento e comandas</p>
            <h1>Controle sua operação sem papel</h1>
            <p>Acesse o sistema e gerencie comandas, mesas e pedidos com mais agilidade.</p>
          </div>

          <div class="feature-list">
            @for (feature of features; track feature.title) {
              <div class="feature-item">
                <div class="feature-icon">
                  <app-icon [name]="feature.icon" />
                </div>
                <div>
                  <strong>{{ feature.title }}</strong>
                  <span>{{ feature.description }}</span>
                </div>
              </div>
            }
          </div>

          <div class="security-note">
            <span class="shield-icon">✓</span>
            <div>
              <strong>Seguro. Simples. Completo.</strong>
              <span>Pensado para o dia a dia do seu negócio.</span>
            </div>
          </div>
        </div>

        <div class="preview-stack" aria-hidden="true">
          <div class="restaurant-line-art"></div>

          <div class="tables-card glass-card">
            <div class="card-header">
              <span class="menu-line"></span>
              <strong>Mesas</strong>
              <span class="dots">•••</span>
            </div>

            <div class="tables-grid">
              @for (table of previewTables; track table.number) {
                <div class="table-pill">
                  <div class="table-topline">
                    <strong>{{ table.number }}</strong>
                    <span class="status-dot {{ table.variant }}"></span>
                  </div>
                  <small>{{ table.status }}</small>
                </div>
              }
            </div>
          </div>

          <div class="order-card glass-card">
            <div class="order-title">Comanda #0458</div>
            <div class="order-line">
              <span>Hambúrguer Clássico</span>
              <b>1</b>
              <strong>R$ 28,90</strong>
            </div>
            <div class="order-line">
              <span>Batata Frita</span>
              <b>1</b>
              <strong>R$ 16,90</strong>
            </div>
            <div class="order-line">
              <span>Refrigerante</span>
              <b>1</b>
              <strong>R$ 7,50</strong>
            </div>
            <div class="order-total">
              <span>Total</span>
              <strong>R$ 53,30</strong>
            </div>
          </div>
        </div>
      </section>

      <section class="login-panel" aria-label="Área de autenticação">
        <div class="ambient ambient-one"></div>
        <div class="ambient ambient-two"></div>

        <form class="login-card" aria-labelledby="login-title" (ngSubmit)="submit()">
          <div class="mobile-logo">
            <img src="assets/logo.png" alt="Aqui Comanda" />
          </div>

          <div class="login-brand-icon">
            <img src="assets/icon-only.png" alt="" />
          </div>

          @if (authService.isLoadingAuth()) {
            <div class="auth-skeleton" aria-live="polite">
              <span></span>
              <span></span>
              <span></span>
            </div>
          } @else {
            <div class="auth-tabs" aria-label="Escolha o fluxo de autenticação">
              <button type="button" [class.active]="mode === 'login'" (click)="setMode('login')">Entrar</button>
              <button type="button" [class.active]="mode === 'register'" (click)="setMode('register')">Cadastrar</button>
            </div>

            <h2 id="login-title">{{ title }}</h2>
            <p>{{ subtitle }}</p>

            <div class="login-fields">
              @if (mode === 'register') {
                <label for="name">Nome</label>
                <div class="input-control">
                  <app-icon name="users" />
                  <input
                    id="name"
                    name="name"
                    type="text"
                    placeholder="Seu nome"
                    autocomplete="name"
                    [disabled]="isSubmitting"
                    [(ngModel)]="name"
                  />
                </div>
              }

              <label for="email">{{ mode === 'login' ? 'CPF' : 'E-mail' }}</label>
              <div class="input-control">
                <app-icon [name]="mode === 'login' ? 'users' : 'mail'" />
                @if (mode === 'login') {
                  <input
                    id="email"
                    name="cpf"
                    type="text"
                    inputmode="numeric"
                    maxlength="14"
                    placeholder="000.000.000-00"
                    autocomplete="username"
                    [disabled]="isSubmitting"
                    [(ngModel)]="cpf"
                    (ngModelChange)="onCpfChange($event)"
                  />
                } @else {
                  <input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="voce@empresa.com"
                    autocomplete="email"
                    [disabled]="isSubmitting"
                    [(ngModel)]="email"
                  />
                }
              </div>

              @if (mode !== 'reset') {
                <label for="password">Senha</label>
                <div class="input-control">
                  <app-icon name="lock" />
                  <input
                    id="password"
                    name="password"
                    type="password"
                    placeholder="Mínimo de 6 caracteres"
                    autocomplete="current-password"
                    [disabled]="isSubmitting"
                    [(ngModel)]="password"
                  />
                </div>
              }

              @if (mode === 'register') {
                <label for="confirmPassword">Confirmar senha</label>
                <div class="input-control">
                  <app-icon name="lock" />
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    placeholder="Repita sua senha"
                    autocomplete="new-password"
                    [disabled]="isSubmitting"
                    [(ngModel)]="confirmPassword"
                  />
                </div>
              }
            </div>

            @if (errorMessage) {
              <div class="form-feedback login-feedback">{{ errorMessage }}</div>
            }

            @if (successMessage) {
              <div class="form-feedback success login-feedback">{{ successMessage }}</div>
            }

            <div class="form-options">
              @if (mode === 'login') {
                <label class="remember-option" for="remember">
                  <input id="remember" type="checkbox" checked disabled />
                  <span>Sessão persistente</span>
                </label>

                <button class="link-button" type="button" [disabled]="isSubmitting" (click)="setMode('reset')">
                  Esqueci minha senha
                </button>
              } @else {
                <button class="link-button" type="button" [disabled]="isSubmitting" (click)="setMode('login')">
                  Voltar para login
                </button>
              }
            </div>

            <button class="primary-button" type="submit" [disabled]="isSubmitting">
              {{ isSubmitting ? loadingLabel : primaryLabel }}
            </button>

            @if (mode !== 'reset') {
              <div class="divider">
                <span></span>
                <small>ou</small>
                <span></span>
              </div>

              <button class="google-button" type="button" [disabled]="isSubmitting" (click)="loginWithGoogle()">
                <app-icon name="google" />
                <span>Entrar com Google</span>
              </button>
            }
          }
        </form>

        <div class="protected-note">
          <app-icon name="lock" />
          <span>Seus dados estão protegidos</span>
        </div>
      </section>
    </main>
  `,
})
export class LoginPageComponent {
  protected readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly filiaisService = inject(FiliaisService);

  protected mode: AuthMode = 'login';
  protected name = '';
  protected cpf = '';
  protected email = '';
  protected password = '';
  protected confirmPassword = '';
  protected errorMessage = '';
  protected successMessage = '';
  protected isSubmitting = false;

  protected readonly features: Feature[] = [
    { title: 'Comandas', description: 'Abertura e acompanhamento em tempo real', icon: 'receipt' },
    { title: 'Mesas', description: 'Visualize mesas, status e ocupação', icon: 'table' },
    { title: 'Pedidos', description: 'Envie e acompanhe pedidos com agilidade', icon: 'bell' },
    { title: 'Caixa', description: 'Fechamento de conta e relatórios', icon: 'register' },
  ];

  protected readonly previewTables: PreviewTable[] = [
    { number: '01', status: 'Livre', variant: 'success' },
    { number: '02', status: 'Aberta', variant: 'warning' },
    { number: '03', status: 'Livre', variant: 'success' },
    { number: '04', status: 'Ocupada', variant: 'info' },
    { number: '05', status: 'Aberta', variant: 'warning' },
    { number: '06', status: 'Fechando', variant: 'muted' },
  ];

  protected get title(): string {
    if (this.mode === 'register') {
      return 'Cadastrar';
    }

    if (this.mode === 'reset') {
      return 'Recuperar senha';
    }

    return 'Entrar';
  }

  protected get subtitle(): string {
    if (this.mode === 'register') {
      return 'Crie sua conta para acessar o painel operacional.';
    }

    if (this.mode === 'reset') {
      return 'Informe seu e-mail para receber o link de recuperação.';
    }

    return 'Acesse o painel operacional do Aqui Comanda.';
  }

  protected get primaryLabel(): string {
    if (this.mode === 'register') {
      return 'Criar conta';
    }

    if (this.mode === 'reset') {
      return 'Enviar recuperação';
    }

    return 'Entrar';
  }

  protected get loadingLabel(): string {
    if (this.mode === 'register') {
      return 'Criando conta...';
    }

    if (this.mode === 'reset') {
      return 'Enviando...';
    }

    return 'Entrando...';
  }

  protected setMode(mode: AuthMode): void {
    this.mode = mode;
    this.errorMessage = '';
    this.successMessage = '';
  }

  protected async submit(): Promise<void> {
    this.errorMessage = '';
    this.successMessage = '';

    if (!this.validateForm()) {
      return;
    }

    this.isSubmitting = true;

    try {
      if (this.mode === 'register') {
        await this.authService.registerWithEmail(this.name, this.email, this.password);
        await this.redirectToHome();
        return;
      }

      if (this.mode === 'reset') {
        await this.authService.resetPassword(this.email);
        this.successMessage = 'Enviamos as instruções de recuperação para seu e-mail.';
        this.password = '';
        this.confirmPassword = '';
        return;
      }

      await this.authService.loginWithCpf(normalizeCpf(this.cpf), this.password);
      await this.redirectToHome();
    } catch (error) {
      this.errorMessage = this.authService.getFriendlyErrorMessage(error);
    } finally {
      this.isSubmitting = false;
    }
  }

  protected async loginWithGoogle(): Promise<void> {
    this.errorMessage = '';
    this.successMessage = '';
    this.isSubmitting = true;

    try {
      await this.authService.loginWithGoogle();
      await this.redirectToHome();
    } catch (error) {
      this.errorMessage = this.authService.getFriendlyErrorMessage(error);
    } finally {
      this.isSubmitting = false;
    }
  }

  private validateForm(): boolean {
    if (this.mode === 'login') {
      const cpf = normalizeCpf(this.cpf);

      if (!cpf) {
        this.errorMessage = 'CPF é obrigatório.';
        return false;
      }

      if (!isValidCpf(cpf)) {
        this.errorMessage = 'Informe um CPF válido.';
        return false;
      }

      if (!this.password.trim()) {
        this.errorMessage = 'Informe a senha.';
        return false;
      }

      return true;
    }

    const email = this.email.trim();

    if (!email) {
      this.errorMessage = 'Informe o e-mail.';
      return false;
    }

    if (!this.isValidEmail(email)) {
      this.errorMessage = 'E-mail inválido.';
      return false;
    }

    if (this.mode === 'reset') {
      return true;
    }

    if (!this.password.trim()) {
      this.errorMessage = 'Informe a senha.';
      return false;
    }

    if (this.mode === 'register') {
      if (!this.name.trim()) {
        this.errorMessage = 'Nome obrigatório.';
        return false;
      }

      if (this.password.length < 6) {
        this.errorMessage = 'A senha deve ter pelo menos 6 caracteres.';
        return false;
      }

      if (this.confirmPassword !== this.password) {
        this.errorMessage = 'A confirmação de senha deve ser igual à senha.';
        return false;
      }
    }

    return true;
  }

  private isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  protected onCpfChange(value: string): void {
    this.cpf = formatCpf(value);
    this.errorMessage = '';
    this.successMessage = '';
  }

  private async redirectToHome(): Promise<boolean> {
    await this.filiaisService.reload().catch(() => undefined);
    return this.router.navigateByUrl(
      this.filiaisService.hasFilialCadastrada() ? this.authService.getFirstAllowedPath() : '/configuracoes/filiais',
    );
  }
}
