import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IconComponent } from '../components/icon.component';
import { StatCardComponent } from '../components/stat-card.component';
import { CaixaDateFilter, EntradaCaixa } from '../models/app-data';
import { CaixaService } from '../services/caixa.service';

type CaixaTipoFilter = 'todos' | 'comanda';

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

        <button class="clear-filters-button" type="button" (click)="clearFilters()">
          Limpar filtros
        </button>
      </section>

      <section class="stats-grid" aria-label="Resumo do caixa">
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
        </div>

        <div class="caixa-entries-list">
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
    </div>
  `,
})
export class CaixaPageComponent {
  private readonly caixaService = inject(CaixaService);

  protected search = '';
  protected dateFilter: CaixaDateFilter = 'todas';
  protected paymentFilter = 'todos';
  protected mesaFilter = 'todos';
  protected tipoFilter: CaixaTipoFilter = 'todos';

  protected get entradas(): EntradaCaixa[] {
    return this.caixaService.getEntradas();
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
}
