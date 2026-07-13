import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IconComponent } from '../components/icon.component';
import { StatCardComponent } from '../components/stat-card.component';
import { AuthService } from '../services/auth.service';
import { CaixaDateFilter, EntradaCaixa, SessaoCaixa } from '../models/app-data';
import { CaixaService } from '../services/caixa.service';

type CaixaTipoFilter = 'todos' | 'comanda';
type CaixaViewMode = 'lista' | 'grid';

@Component({
  selector: 'app-caixa-page',
  standalone: true,
  imports: [FormsModule, IconComponent, StatCardComponent],
  template: `
    <div class="page-stack caixa-page">
      <section class="page-head pedidos-head caixa-head">
        <div>
          <h1>Caixa</h1>
          <p>Acompanhe as entradas financeiras das comandas pagas.</p>
        </div>

        <label class="page-search" aria-label="Buscar entrada por cliente, mesa ou comanda">
          <app-icon name="search" [size]="24" />
          <input
            type="search"
            placeholder="Buscar cliente, mesa ou comanda"
            [(ngModel)]="search"
          />
        </label>
      </section>

      @if (feedbackMessage) {
        <section class="form-feedback success">{{ feedbackMessage }}</section>
      }

      @if (errorMessage) {
        <section class="form-feedback">{{ errorMessage }}</section>
      }

      <section class="caixa-session-card" [class.closed]="!sessaoAberta">
        <div>
          <span class="settings-current-badge">{{ sessaoAberta ? 'Caixa aberto' : 'Caixa fechado' }}</span>
          <h2>{{ sessaoAberta ? 'Sessão de caixa em andamento' : 'Nenhum caixa aberto' }}</h2>
          <p>
            {{ sessaoAberta
              ? 'Pagamentos de comandas finalizadas serão vinculados a esta sessão.'
              : 'Abra o caixa para registrar pagamentos de comandas.' }}
          </p>
          @if (sessaoAberta) {
            <small>
              Aberto em {{ formatDateTime(sessaoAberta.abertoEm) }}
              @if (sessaoAberta.abertoPorNome) {
                · por {{ sessaoAberta.abertoPorNome }}
              }
            </small>
          }
        </div>

        <div class="caixa-session-actions">
          @if (!sessaoAberta) {
            <button class="primary-action-button" type="button" [disabled]="!canWriteCaixa" (click)="openAbrirCaixaModal()">
              Abrir caixa
            </button>
          } @else {
            <button class="secondary-button" type="button" [disabled]="!canWriteCaixa" (click)="openFecharCaixaModal()">
              Fechar caixa
            </button>
          }
          @if (!canWriteCaixa) {
            <span class="readonly-chip">Somente leitura</span>
          }
        </div>
      </section>

      <section class="caixa-filters" aria-label="Filtros do caixa">
        <label>
          Período
          <select name="caixaPeriodo" [(ngModel)]="dateFilter">
            <option value="todas">Todas as entradas</option>
            <option value="hoje">Hoje</option>
            <option value="ultimos_7">Últimos 7 dias</option>
            <option value="ultimos_30">Últimos 30 dias</option>
          </select>
        </label>

        <label>
          Forma de pagamento
          <select name="caixaPagamento" [(ngModel)]="paymentFilter">
            <option value="todos">Todas</option>
            @for (forma of formasPagamento; track forma) {
              <option [value]="forma">{{ forma }}</option>
            }
          </select>
        </label>

        <label>
          Mesa
          <select name="caixaMesa" [(ngModel)]="mesaFilter">
            <option value="todos">Todas</option>
            <option value="rapida">Comanda rápida</option>
            @for (mesa of mesasFiltro; track mesa) {
              <option [value]="mesa">Mesa {{ mesa }}</option>
            }
          </select>
        </label>

        <label>
          Tipo
          <select name="caixaTipo" [(ngModel)]="tipoFilter">
            <option value="todos">Todos</option>
            <option value="comanda">Comanda paga</option>
          </select>
        </label>

        <label>
          Visualização
          <select name="caixaVisualizacao" [(ngModel)]="viewMode">
            <option value="lista">Lista</option>
            <option value="grid">Grid</option>
          </select>
        </label>

        <button class="clear-filters-button" type="button" (click)="clearFilters()">
          Limpar filtros
        </button>
      </section>

      <section class="stats-grid summary-cards-scroll" aria-label="Resumo do caixa">
        <app-stat-card icon="dollar" label="Total recebido" [value]="formatCurrency(totalRecebido)" helper="Entradas filtradas" variant="dark" />
        <app-stat-card icon="register" label="Entradas registradas" [value]="filteredEntradas.length" helper="Movimentos financeiros" variant="green" />
        <app-stat-card icon="check" label="Recebido hoje" [value]="formatCurrency(totalRecebidoHoje)" helper="Entradas da data atual" variant="amber" />
        <app-stat-card icon="receipt" label="Comandas pagas" [value]="totalComandasPagas" helper="Entradas originadas em comanda" variant="neutral" />
      </section>

      <section class="pedidos-list-panel caixa-list-panel" aria-label="Entradas do caixa">
        <div class="quick-comandas-head pedidos-list-head">
          <div>
            <h2>Entradas financeiras</h2>
            <span>{{ filteredEntradas.length }} entradas exibidas · {{ entradas.length }} registradas</span>
          </div>

          <div class="view-toggle-group" aria-label="Alternar visualização do caixa">
            <button type="button" [class.active]="viewMode === 'lista'" (click)="viewMode = 'lista'">Lista</button>
            <button type="button" [class.active]="viewMode === 'grid'" (click)="viewMode = 'grid'">Grid</button>
          </div>
        </div>

        <div class="caixa-entries-list" [class.grid-view]="viewMode === 'grid'">
          @for (entrada of filteredEntradas; track entrada.id) {
            <article class="caixa-entry-card">
              <header>
                <div>
                  <span class="pedido-code">{{ getTipoLabel(entrada) }}</span>
                  <strong>{{ entrada.origemDescricao }}</strong>
                  <small>{{ formatDateTime(entrada.criadaEm) }}</small>
                </div>

                <strong class="caixa-entry-value">{{ formatCurrency(entrada.valor) }}</strong>
              </header>

              <div class="caixa-entry-grid">
                <div>
                  <span>Cliente</span>
                  <strong>{{ entrada.clienteNome || 'Cliente não informado' }}</strong>
                </div>
                <div>
                  <span>Mesa</span>
                  <strong>{{ getMesaLabel(entrada) }}</strong>
                </div>
                <div>
                  <span>Forma de pagamento</span>
                  <strong>{{ entrada.formaPagamento || 'Não informado' }}</strong>
                </div>
                <div>
                  <span>Referência</span>
                  <strong>{{ getShortId(entrada.origemId) }}</strong>
                </div>
              </div>
            </article>
          } @empty {
            <section class="empty-state pedidos-empty-state caixa-empty-state">
              <strong>Nenhuma entrada registrada no caixa.</strong>
              <span>Finalize uma comanda paga para que o lançamento financeiro apareça aqui automaticamente.</span>
            </section>
          }
        </div>
      </section>

      @if (abrirCaixaModalOpen) {
        <div class="comanda-modal-overlay" role="presentation">
          <section class="management-modal-card caixa-session-modal" role="dialog" aria-modal="true" aria-labelledby="abrir-caixa-title">
            <button class="modal-close-button" type="button" aria-label="Cancelar abertura de caixa" (click)="closeCaixaModals()">X</button>
            <header class="management-modal-header">
              <h2 id="abrir-caixa-title">Abrir caixa</h2>
              <p>Confirme a abertura para começar a registrar pagamentos de comandas.</p>
            </header>

            <div class="caixa-session-modal-body">
              <div class="caixa-session-summary">
                <div><span>Data/hora</span><strong>{{ formatDateTime(nowIso) }}</strong></div>
                <div><span>Responsável</span><strong>{{ currentUserName }}</strong></div>
              </div>

              <label class="modal-field-block">
                Observação <span class="optional-label">opcional</span>
                <textarea rows="4" name="observacaoAbertura" placeholder="Ex.: Caixa iniciado no turno da noite" [(ngModel)]="observacaoAbertura"></textarea>
              </label>

              <div class="form-actions">
                <button class="primary-action-button" type="button" (click)="confirmAbrirCaixa()">Abrir caixa</button>
                <button class="ghost-button" type="button" (click)="closeCaixaModals()">Cancelar</button>
              </div>
            </div>
          </section>
        </div>
      }

      @if (fecharCaixaModalOpen && sessaoAberta) {
        <div class="comanda-modal-overlay" role="presentation">
          <section class="management-modal-card caixa-session-modal caixa-close-modal" role="dialog" aria-modal="true" aria-labelledby="fechar-caixa-title">
            <button class="modal-close-button" type="button" aria-label="Cancelar fechamento de caixa" (click)="closeCaixaModals()">X</button>
            <header class="management-modal-header caixa-close-modal-header">
              <span class="settings-current-badge">Conferência final</span>
              <h2 id="fechar-caixa-title">Fechar caixa</h2>
              <p>Confira valores, formas de pagamento e registre uma observação antes de encerrar a sessão.</p>
            </header>

            <div class="caixa-session-modal-body">
              <div class="caixa-close-total-card">
                <span>Total da sessão</span>
                <strong>{{ formatCurrency(totalSessaoAberta) }}</strong>
                <small>{{ entradasSessaoAberta.length }} entrada{{ entradasSessaoAberta.length === 1 ? '' : 's' }} registrada{{ entradasSessaoAberta.length === 1 ? '' : 's' }}</small>
              </div>

              <div class="caixa-close-grid">
                <section class="caixa-close-section">
                  <h3>Sessão</h3>
                  <div class="caixa-session-summary compact">
                    <div><span>Aberto em</span><strong>{{ formatDateTime(sessaoAberta.abertoEm) }}</strong></div>
                    <div><span>Aberto por</span><strong>{{ sessaoAberta.abertoPorNome || 'Não informado' }}</strong></div>
                  </div>
                </section>

                <section class="caixa-close-section">
                  <h3>Pagamentos</h3>
                  @if (entradasPorFormaPagamentoSessao.length > 0) {
                    <div class="caixa-payment-summary compact">
                      @for (item of entradasPorFormaPagamentoSessao; track item.forma) {
                        <div>
                          <span>{{ item.forma }}</span>
                          <strong>{{ formatCurrency(item.total) }}</strong>
                          <small>{{ item.quantidade }} entrada{{ item.quantidade === 1 ? '' : 's' }}</small>
                        </div>
                      }
                    </div>
                  } @else {
                    <div class="caixa-close-empty">Nenhuma entrada vinculada a esta sessão.</div>
                  }
                </section>

                <div class="caixa-close-observation">
                  <label class="modal-field-block">
                    Observação <span class="optional-label">opcional</span>
                    <textarea rows="4" name="observacaoFechamento" placeholder="Ex.: Conferido com operador, sem divergências." [(ngModel)]="observacaoFechamento"></textarea>
                  </label>
                </div>
              </div>

              <div class="form-actions">
                <button class="primary-action-button" type="button" (click)="confirmFecharCaixa()">Fechar caixa</button>
                <button class="ghost-button" type="button" (click)="closeCaixaModals()">Cancelar</button>
              </div>
            </div>
          </section>
        </div>
      }
    </div>
  `,
})
export class CaixaPageComponent {
  private readonly caixaService = inject(CaixaService);
  private readonly authService = inject(AuthService);

  protected search = '';
  protected dateFilter: CaixaDateFilter = 'todas';
  protected paymentFilter = 'todos';
  protected mesaFilter = 'todos';
  protected tipoFilter: CaixaTipoFilter = 'todos';
  protected viewMode: CaixaViewMode = 'lista';
  protected abrirCaixaModalOpen = false;
  protected fecharCaixaModalOpen = false;
  protected observacaoAbertura = '';
  protected observacaoFechamento = '';
  protected feedbackMessage = '';
  protected errorMessage = '';
  protected nowIso = new Date().toISOString();

  protected get canWriteCaixa(): boolean {
    return this.authService.canWrite('caixa');
  }

  protected get currentUserName(): string {
    return this.authService.currentUser()?.nome ?? 'Usuário atual';
  }

  protected get sessaoAberta(): SessaoCaixa | null {
    return this.caixaService.getSessaoAberta();
  }

  protected get entradas(): EntradaCaixa[] {
    return this.caixaService.getEntradas();
  }

  protected get entradasSessaoAberta(): EntradaCaixa[] {
    const sessao = this.sessaoAberta;
    return sessao ? this.caixaService.getEntradasBySessao(sessao.id) : [];
  }

  protected get totalSessaoAberta(): number {
    return this.caixaService.getTotalRecebido(this.entradasSessaoAberta);
  }

  protected get entradasPorFormaPagamentoSessao(): Array<{ forma: string; total: number; quantidade: number }> {
    return this.caixaService.getEntradasPorFormaPagamento(this.entradasSessaoAberta);
  }

  protected get formasPagamento(): string[] {
    return [...new Set(this.entradas.map((entrada) => entrada.formaPagamento || 'Não informado'))].sort(
      (a, b) => a.localeCompare(b, 'pt-BR'),
    );
  }

  protected get mesasFiltro(): string[] {
    return [...new Set(
      this.entradas
        .filter((entrada) => entrada.mesaNumero !== null && entrada.mesaNumero !== undefined)
        .map((entrada) => String(entrada.mesaNumero).padStart(2, '0')),
    )].sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }

  protected get filteredEntradas(): EntradaCaixa[] {
    const normalizedSearch = this.search.trim().toLowerCase();

    return this.entradas.filter((entrada) => {
      if (!this.matchesDateFilter(entrada)) {
        return false;
      }

      if (this.tipoFilter !== 'todos' && entrada.tipo !== this.tipoFilter) {
        return false;
      }

      const formaPagamento = entrada.formaPagamento || 'Não informado';
      if (this.paymentFilter !== 'todos' && formaPagamento !== this.paymentFilter) {
        return false;
      }

      if (this.mesaFilter === 'rapida' && entrada.mesaNumero) {
        return false;
      }

      if (
        this.mesaFilter !== 'todos' &&
        this.mesaFilter !== 'rapida' &&
        String(entrada.mesaNumero).padStart(2, '0') !== this.mesaFilter
      ) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      const searchBase = [
        entrada.origemId,
        entrada.origemDescricao,
        entrada.clienteNome,
        entrada.mesaNumero ? `Mesa ${entrada.mesaNumero}` : 'Comanda rápida',
        formaPagamento,
        this.getTipoLabel(entrada),
        this.getShortId(entrada.origemId),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return searchBase.includes(normalizedSearch);
    });
  }

  protected get totalRecebido(): number {
    return this.caixaService.getTotalRecebido(this.filteredEntradas);
  }

  protected get totalRecebidoHoje(): number {
    return this.caixaService.getTotalRecebido(this.caixaService.getEntradasHoje(this.filteredEntradas));
  }

  protected get totalComandasPagas(): number {
    return this.filteredEntradas.filter((entrada) => entrada.tipo === 'comanda').length;
  }

  protected clearFilters(): void {
    this.search = '';
    this.dateFilter = 'todas';
    this.paymentFilter = 'todos';
    this.mesaFilter = 'todos';
    this.tipoFilter = 'todos';
  }

  protected openAbrirCaixaModal(): void {
    if (!this.canWriteCaixa) {
      this.errorMessage = 'Você não tem permissão para abrir o caixa.';
      return;
    }

    this.clearMessages();
    this.nowIso = new Date().toISOString();
    this.observacaoAbertura = '';
    this.abrirCaixaModalOpen = true;
  }

  protected openFecharCaixaModal(): void {
    if (!this.canWriteCaixa) {
      this.errorMessage = 'Você não tem permissão para fechar o caixa.';
      return;
    }

    this.clearMessages();
    this.observacaoFechamento = '';
    this.fecharCaixaModalOpen = true;
  }

  protected closeCaixaModals(): void {
    this.abrirCaixaModalOpen = false;
    this.fecharCaixaModalOpen = false;
  }

  protected async confirmAbrirCaixa(): Promise<void> {
    if (!this.canWriteCaixa) {
      this.errorMessage = 'Você não tem permissão para abrir o caixa.';
      return;
    }

    this.closeCaixaModals();

    let sessao = null;
    try {
      sessao = await this.caixaService.abrirCaixa(this.observacaoAbertura, this.authService.currentUser());
    } catch (error) {
      this.errorMessage = error instanceof Error ? error.message : 'Não foi possível abrir o caixa no backend.';
      return;
    }

    if (!sessao) {
      this.errorMessage = 'Já existe um caixa aberto.';
      return;
    }

    this.feedbackMessage = 'Caixa aberto com sucesso.';
  }

  protected async confirmFecharCaixa(): Promise<void> {
    if (!this.canWriteCaixa) {
      this.errorMessage = 'Você não tem permissão para fechar o caixa.';
      return;
    }

    this.closeCaixaModals();

    let sessao = null;
    try {
      sessao = await this.caixaService.fecharCaixa(this.observacaoFechamento, this.authService.currentUser());
    } catch (error) {
      this.errorMessage = error instanceof Error ? error.message : 'Não foi possível fechar o caixa no backend.';
      return;
    }

    if (!sessao) {
      this.errorMessage = 'Não existe caixa aberto para fechar.';
      return;
    }

    this.feedbackMessage = `Caixa fechado com ${this.formatCurrency(sessao.totalEntradas)} em entradas.`;
  }

  protected getTipoLabel(entrada: EntradaCaixa): string {
    return entrada.tipo === 'comanda' ? 'Comanda paga' : entrada.tipo;
  }

  protected getMesaLabel(entrada: EntradaCaixa): string {
    if (!entrada.mesaNumero) {
      return 'Comanda rápida';
    }

    return `Mesa ${String(entrada.mesaNumero).padStart(2, '0')}`;
  }

  protected formatCurrency(value: number): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  }

  protected formatDateTime(value: string): string {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(value));
  }

  protected getShortId(id: string): string {
    const parts = id.split('-').filter(Boolean);
    return parts.slice(-2).join('-') || id;
  }

  private matchesDateFilter(entrada: EntradaCaixa): boolean {
    if (this.dateFilter === 'todas') {
      return true;
    }

    const entradaDate = this.getStartOfDay(new Date(entrada.criadaEm));
    const today = this.getStartOfDay(new Date());

    if (this.dateFilter === 'hoje') {
      return entradaDate.getTime() === today.getTime();
    }

    const days = this.dateFilter === 'ultimos_7' ? 7 : 30;
    const minDate = new Date(today);
    minDate.setDate(minDate.getDate() - (days - 1));

    return entradaDate.getTime() >= minDate.getTime();
  }

  private getStartOfDay(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }

  private clearMessages(): void {
    this.feedbackMessage = '';
    this.errorMessage = '';
  }
}
