import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { StatCardComponent } from '../components/stat-card.component';
import {
  DashboardChartItem,
  DashboardPeriod,
  DashboardPeriodPreset,
  DashboardService,
  DashboardSummary,
} from '../services/dashboard.service';

@Component({
  selector: 'app-dashboard-page',
  standalone: true,
  imports: [FormsModule, StatCardComponent],
  template: `
    <div class="page-stack dashboard-page">
      <section class="page-head dashboard-head">
        <div>
          <h1>Dashboard</h1>
          <p>Acompanhe vendas, CMV e lucro bruto do estabelecimento.</p>
        </div>
      </section>

      <section class="dashboard-filters" aria-label="Filtros do dashboard">
        <div class="dashboard-period-buttons" role="group" aria-label="Período">
          @for (option of periodOptions; track option.value) {
            <button
              type="button"
              [class.active]="period.preset === option.value"
              (click)="setPreset(option.value)"
            >
              {{ option.label }}
            </button>
          }
        </div>

        @if (period.preset === 'custom') {
          <div class="dashboard-custom-period">
            <label>
              Início
              <input type="date" name="dashboardStart" [(ngModel)]="period.startDate" (ngModelChange)="normalizeCustomPeriod()" />
            </label>
            <label>
              Fim
              <input type="date" name="dashboardEnd" [(ngModel)]="period.endDate" (ngModelChange)="normalizeCustomPeriod()" />
            </label>
          </div>
        }
      </section>

      @if (isLoading) {
        <section class="settings-card dashboard-state-card">
          <strong>Carregando dados</strong>
          <span>Preparando os indicadores do período selecionado.</span>
        </section>
      } @else if (errorMessage) {
        <section class="settings-card dashboard-state-card error">
          <strong>Erro ao carregar dashboard</strong>
          <span>{{ errorMessage }}</span>
        </section>
      } @else {
        <section class="stats-grid dashboard-stats" aria-label="Indicadores do dashboard">
          <app-stat-card icon="dollar" label="Vendas do período" [value]="formatCurrency(summary.salesTotal)" [helper]="periodLabel" variant="dark" />
          <app-stat-card icon="register" label="CMV do período" [value]="formatCurrency(summary.cmvTotal)" helper="Custo das mercadorias vendidas" variant="amber" />
          <app-stat-card icon="check" label="Lucro bruto" [value]="formatCurrency(summary.grossProfit)" helper="Vendas menos CMV" variant="green" />
          <app-stat-card icon="cards" label="Margem bruta" [value]="formatPercent(summary.grossMarginPercent)" helper="Lucro sobre faturamento" variant="neutral" />
          <app-stat-card icon="receipt" label="Comandas abertas" [value]="summary.openCommandsCount" helper="Em consumo agora" variant="amber" />
          <app-stat-card icon="bell" label="Ticket médio" [value]="formatCurrency(summary.averageTicket)" [helper]="ticketHelper" variant="dark" />
        </section>

        <section class="dashboard-grid" aria-label="Gráficos do dashboard">
          <article class="dashboard-chart-panel">
            <header>
              <div>
                <h2>Vendas do período</h2>
                <span>{{ salesGroupingLabel }}</span>
              </div>
              <strong>{{ formatCurrency(summary.salesTotal) }}</strong>
            </header>

            @if (summary.salesChart.length > 0) {
              <div class="dashboard-bars sales-bars">
                @for (item of summary.salesChart; track item.label) {
                  <div class="dashboard-bar-row">
                    <span>{{ item.label }}</span>
                    <div class="dashboard-bar-track">
                      <i [style.width.%]="getBarWidth(item.value, summary.salesChart)"></i>
                    </div>
                    <strong>{{ formatCurrency(item.value) }}</strong>
                  </div>
                }
              </div>
            } @else {
              <div class="dashboard-empty-chart">
                <strong>Sem vendas no período</strong>
                <span>Quando houver comandas ou pedidos finalizados, o gráfico será preenchido.</span>
              </div>
            }
          </article>

          <article class="dashboard-chart-panel">
            <header>
              <div>
                <h2>CMV e lucro bruto</h2>
                <span>Relação entre faturamento, custo e sobra operacional</span>
              </div>
              <strong>{{ formatPercent(summary.grossMarginPercent) }}</strong>
            </header>

            <div class="dashboard-column-chart">
              @for (item of summary.cmvChart; track item.label) {
                <div>
                  <div class="dashboard-column-track">
                    <i [style.height.%]="getBarWidth(item.value, summary.cmvChart)" [class.cost]="item.label === 'CMV'" [class.profit]="item.label === 'Lucro bruto'"></i>
                  </div>
                  <strong>{{ item.label }}</strong>
                  <span>{{ formatCurrency(item.value) }}</span>
                </div>
              }
            </div>
          </article>
        </section>
      }
    </div>
  `,
})
export class DashboardPageComponent {
  private readonly dashboardService = inject(DashboardService);

  protected readonly periodOptions: Array<{ value: DashboardPeriodPreset; label: string }> = [
    { value: 'today', label: 'Hoje' },
    { value: 'yesterday', label: 'Ontem' },
    { value: 'last_7', label: 'Últimos 7 dias' },
    { value: 'last_30', label: 'Últimos 30 dias' },
    { value: 'custom', label: 'Período personalizado' },
  ];

  protected period: DashboardPeriod = this.dashboardService.getDefaultPeriod();
  protected isLoading = false;
  protected errorMessage = '';

  protected get summary(): DashboardSummary {
    return this.dashboardService.getSummary(this.period);
  }

  protected get periodLabel(): string {
    const optionLabel = this.periodOptions.find((option) => option.value === this.period.preset)?.label;

    if (this.period.preset !== 'custom') {
      return optionLabel ?? 'Período selecionado';
    }

    return `${this.formatDate(this.period.startDate)} até ${this.formatDate(this.period.endDate)}`;
  }

  protected get salesGroupingLabel(): string {
    return this.isSingleDayPeriod() ? 'Agrupado por hora' : 'Agrupado por dia';
  }

  protected get ticketHelper(): string {
    const count = this.summary.closedOrdersCount;
    return `${count} venda${count === 1 ? '' : 's'} concluída${count === 1 ? '' : 's'}`;
  }

  protected setPreset(preset: DashboardPeriodPreset): void {
    this.period = this.dashboardService.resolvePreset(preset, this.period);
    this.errorMessage = '';
  }

  protected normalizeCustomPeriod(): void {
    if (this.period.startDate > this.period.endDate) {
      this.period = { ...this.period, endDate: this.period.startDate };
    }
  }

  protected getBarWidth(value: number, items: DashboardChartItem[]): number {
    const maxValue = Math.max(...items.map((item) => item.value), 0);

    if (maxValue <= 0) {
      return 0;
    }

    return Math.max(6, Math.round((value / maxValue) * 100));
  }

  protected formatCurrency(value: number): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  }

  protected formatPercent(value: number): string {
    return `${new Intl.NumberFormat('pt-BR', {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    }).format(value)}%`;
  }

  private isSingleDayPeriod(): boolean {
    return this.period.startDate === this.period.endDate;
  }

  private formatDate(value: string): string {
    const [year, month, day] = value.split('-').map(Number);
    return new Intl.DateTimeFormat('pt-BR').format(new Date(year, (month || 1) - 1, day || 1));
  }
}
