import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { StatCardComponent } from '../components/stat-card.component';
import {
  DashboardChartItem,
  DashboardCriticalStockItem,
  DashboardPeriod,
  DashboardPeriodPreset,
  DashboardProductMetric,
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
                <h2>Vendas por período</h2>
                <span>{{ salesGroupingLabel }}</span>
              </div>
              <strong>{{ formatCurrency(summary.salesTotal) }}</strong>
            </header>

            @if (summary.salesByPeriod.length > 0) {
              <div class="dashboard-bars sales-bars">
                @for (item of summary.salesByPeriod; track item.label) {
                  <div class="dashboard-bar-row">
                    <span>{{ item.label }}</span>
                    <div class="dashboard-bar-track">
                      <i [style.width.%]="getBarWidth(item.value, summary.salesByPeriod)"></i>
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
                <h2>Faturamento x CMV x lucro bruto</h2>
                <span>Compare quanto vendeu, quanto custou e quanto sobrou</span>
              </div>
              <strong>{{ formatPercent(summary.grossMarginPercent) }}</strong>
            </header>

            <div class="dashboard-column-chart">
              @for (item of summary.financialComparison; track item.label) {
                <div>
                  <div class="dashboard-column-track">
                    <i [style.height.%]="getBarWidth(item.value, summary.financialComparison)" [class.cost]="item.label === 'CMV'" [class.profit]="item.label === 'Lucro bruto'"></i>
                  </div>
                  <strong>{{ item.label }}</strong>
                  <span>{{ formatCurrency(item.value) }}</span>
                </div>
              }
            </div>
          </article>

          <article class="dashboard-chart-panel">
            <header>
              <div>
                <h2>Top 5 por lucro bruto</h2>
                <span>Produtos que mais colocam dinheiro no caixa</span>
              </div>
            </header>

            @if (summary.topProductsByProfit.length > 0) {
              <div class="dashboard-bars dashboard-ranking-bars">
                @for (item of summary.topProductsByProfit; track item.productId) {
                  <div class="dashboard-bar-row">
                    <span>{{ item.productName }}</span>
                    <div class="dashboard-bar-track profit">
                      <i [style.width.%]="getProductMetricWidth(item.grossProfit, summary.topProductsByProfit, 'grossProfit')"></i>
                    </div>
                    <strong>{{ formatCurrency(item.grossProfit) }}</strong>
                    <small>{{ formatQuantity(item.quantitySold) }} vendidos · margem {{ formatPercent(item.grossMarginPercent) }}</small>
                  </div>
                }
              </div>
            } @else {
              <div class="dashboard-empty-chart">
                <strong>Nenhum produto vendido no período</strong>
                <span>Finalize vendas para acompanhar os produtos mais lucrativos.</span>
              </div>
            }
          </article>

          <article class="dashboard-chart-panel">
            <header>
              <div>
                <h2>Top 5 por quantidade vendida</h2>
                <span>Produtos com maior giro operacional</span>
              </div>
            </header>

            @if (summary.topProductsByQuantity.length > 0) {
              <div class="dashboard-bars dashboard-ranking-bars">
                @for (item of summary.topProductsByQuantity; track item.productId) {
                  <div class="dashboard-bar-row">
                    <span>{{ item.productName }}</span>
                    <div class="dashboard-bar-track">
                      <i [style.width.%]="getProductMetricWidth(item.quantitySold, summary.topProductsByQuantity, 'quantitySold')"></i>
                    </div>
                    <strong>{{ formatQuantity(item.quantitySold) }}</strong>
                    <small>{{ formatCurrency(item.salesTotal) }} vendidos · lucro {{ formatCurrency(item.grossProfit) }}</small>
                  </div>
                }
              </div>
            } @else {
              <div class="dashboard-empty-chart">
                <strong>Nenhum produto vendido no período</strong>
                <span>O ranking de giro aparece quando houver vendas concluídas.</span>
              </div>
            }
          </article>

          <article class="dashboard-chart-panel">
            <header>
              <div>
                <h2>Vendas por categoria</h2>
                <span>Categorias que mais puxam o faturamento</span>
              </div>
            </header>

            @if (summary.salesByCategory.length > 0) {
              <div class="dashboard-bars dashboard-ranking-bars">
                @for (item of summary.salesByCategory; track item.categoryId) {
                  <div class="dashboard-bar-row">
                    <span>{{ item.categoryName }}</span>
                    <div class="dashboard-bar-track category">
                      <i [style.width.%]="getCategoryWidth(item.salesTotal)"></i>
                    </div>
                    <strong>{{ formatCurrency(item.salesTotal) }}</strong>
                    <small>Lucro {{ formatCurrency(item.grossProfit) }} · margem {{ formatPercent(item.grossMarginPercent) }}</small>
                  </div>
                }
              </div>
            } @else {
              <div class="dashboard-empty-chart">
                <strong>Nenhuma categoria com venda</strong>
                <span>As categorias aparecem quando houver produtos vendidos no período.</span>
              </div>
            }
          </article>

          <article class="dashboard-chart-panel">
            <header>
              <div>
                <h2>Estoque crítico</h2>
                <span>Produtos que podem prejudicar as próximas vendas</span>
              </div>
              <strong>{{ summary.criticalStock.length }}</strong>
            </header>

            @if (summary.criticalStock.length > 0) {
              <div class="dashboard-critical-list">
                @for (item of summary.criticalStock; track item.productId) {
                  <div class="dashboard-critical-item" [class.out]="item.status === 'OUT_OF_STOCK'">
                    <div>
                      <strong>{{ item.productName }}</strong>
                      <span>{{ getStockStatusLabel(item) }}</span>
                    </div>
                    <em>{{ formatQuantity(item.currentStock) }} / mín. {{ formatQuantity(item.minimumStock) }}</em>
                  </div>
                }
              </div>
            } @else {
              <div class="dashboard-empty-chart">
                <strong>Nenhum produto com estoque crítico</strong>
                <span>Produtos com estoque zerado ou baixo aparecerão aqui.</span>
              </div>
            }
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

  protected getProductMetricWidth(
    value: number,
    items: DashboardProductMetric[],
    key: 'grossProfit' | 'quantitySold',
  ): number {
    const maxValue = Math.max(...items.map((item) => item[key]), 0);

    if (maxValue <= 0) {
      return 0;
    }

    return Math.max(6, Math.round((value / maxValue) * 100));
  }

  protected getCategoryWidth(value: number): number {
    const maxValue = Math.max(...this.summary.salesByCategory.map((item) => item.salesTotal), 0);

    if (maxValue <= 0) {
      return 0;
    }

    return Math.max(6, Math.round((value / maxValue) * 100));
  }

  protected getStockStatusLabel(item: DashboardCriticalStockItem): string {
    return item.status === 'OUT_OF_STOCK' ? 'Sem estoque' : 'Estoque baixo';
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

  protected formatQuantity(value: number): string {
    return new Intl.NumberFormat('pt-BR', {
      maximumFractionDigits: 2,
    }).format(value);
  }

  private isSingleDayPeriod(): boolean {
    return this.period.startDate === this.period.endDate;
  }

  private formatDate(value: string): string {
    const [year, month, day] = value.split('-').map(Number);
    return new Intl.DateTimeFormat('pt-BR').format(new Date(year, (month || 1) - 1, day || 1));
  }
}
