import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IconComponent, IconName } from '../components/icon.component';
import { AuthService } from '../services/auth.service';

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

      <section class="login-panel" aria-label="Área de login">
        <div class="ambient ambient-one"></div>
        <div class="ambient ambient-two"></div>

        <form class="login-card" aria-labelledby="login-title" (ngSubmit)="login()">
          <div class="mobile-logo">
            <img src="assets/logo.png" alt="Aqui Comanda" />
          </div>

          <div class="login-brand-icon">
            <img src="assets/icon-only.png" alt="" />
          </div>

          <h2 id="login-title">Entrar</h2>
          <p>Acesse o painel operacional do Aqui Comanda.</p>

          <div class="login-fields">
            <label for="usuario">Usuário</label>
            <div class="input-control">
              <app-icon name="users" />
              <input
                id="usuario"
                name="usuario"
                type="text"
                placeholder="admin"
                autocomplete="username"
                [(ngModel)]="usuario"
              />
            </div>

            <label for="password">Senha</label>
            <div class="input-control">
              <app-icon name="lock" />
              <input
                id="password"
                name="password"
                type="password"
                placeholder="admin"
                autocomplete="current-password"
                [(ngModel)]="senha"
              />
              <span class="input-action">
                <app-icon name="eye" />
              </span>
            </div>
          </div>

          @if (errorMessage) {
            <div class="form-feedback login-feedback">{{ errorMessage }}</div>
          }

          <div class="form-options">
            <label class="remember-option" for="remember">
              <input id="remember" type="checkbox" />
              <span>Lembrar de mim</span>
            </label>

            <a href="#forgot-password" (click)="$event.preventDefault()">Esqueci minha senha</a>
          </div>

          <button class="primary-button" type="submit">Entrar</button>

          <div class="divider">
            <span></span>
            <small>acesso padrão</small>
            <span></span>
          </div>

          <button class="google-button" type="button" disabled>
            <app-icon name="shield" />
            <span>admin / admin</span>
          </button>
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
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  protected usuario = 'admin';
  protected senha = 'admin';
  protected errorMessage = '';

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

  protected login(): void {
    this.errorMessage = '';

    if (!this.usuario.trim() || !this.senha.trim()) {
      this.errorMessage = 'Informe usuário e senha.';
      return;
    }

    const logged = this.authService.login(this.usuario, this.senha);

    if (!logged) {
      this.errorMessage = 'Usuário, senha ou status inválido.';
      return;
    }

    this.router.navigateByUrl(this.authService.getFirstAllowedPath());
  }
}
