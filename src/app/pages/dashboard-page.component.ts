import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IconComponent, IconName } from '../components/icon.component';
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
  imports: [FormsModule, IconComponent],
  template: `
    <div class="page-stack dashboard-page">
      <section class="page-head dashboard-head">
        <div>
          <h1>Dashboard</h1>
          <p>Acompanhe as principais métricas do seu negócio em tempo real.</p>
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

        <button type="button" class="dashboard-refresh-button" (click)="refreshDashboard()">
          Atualizar dados
        </button>

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
          @for (card of kpiCards; track card.label) {
            <article class="dashboard-kpi-card {{ card.variant }}">
              <span class="dashboard-kpi-icon">
                <app-icon [name]="card.icon" [size]="24" />
              </span>
              <div>
                <span>{{ card.label }}</span>
                <strong>{{ card.value }}</strong>
                <small>{{ card.helper }}</small>
              </div>
            </article>
          }
        </section>

        <section class="dashboard-grid" aria-label="Gráficos do dashboard">
          <article class="dashboard-chart-panel dashboard-sales-panel">
            <header>
              <div>
                <h2>Vendas por período</h2>
                <span>{{ salesGroupingLabel }}</span>
              </div>
              <strong>{{ formatCurrency(summary.salesTotal) }}</strong>
            </header>

            @if (summary.salesByPeriod.length > 0) {
              <div class="dashboard-area-chart">
                <svg viewBox="0 0 1000 300" preserveAspectRatio="none" role="img" aria-label="Gráfico de vendas por período">
                  <path class="dashboard-area-fill" [attr.d]="getAreaPath(summary.salesByPeriod)" />
                  <path class="dashboard-area-line" [attr.d]="getLinePath(summary.salesByPeriod)" />
                  @for (point of getChartPoints(summary.salesByPeriod); track point.label) {
                    <circle [attr.cx]="point.x" [attr.cy]="point.y" r="5" />
                  }
                </svg>
                <div class="dashboard-area-labels">
                  @for (item of summary.salesByPeriod; track item.label) {
                    <span>{{ item.label }}</span>
                  }
                </div>
                <div class="dashboard-chart-legend">
                  <span></span>
                  Faturamento realizado
                </div>
              </div>
            } @else {
              <div class="dashboard-empty-chart">
                <strong>Nenhuma venda no período selecionado.</strong>
                <span>Quando houver comandas ou pedidos finalizados, o gráfico será preenchido.</span>
              </div>
            }
          </article>

          <article class="dashboard-chart-panel dashboard-finance-panel">
            <header>
              <div>
                <h2>Faturamento x CMV x lucro bruto</h2>
                <span>Compare quanto vendeu, quanto custou e quanto sobrou</span>
              </div>
              <strong>{{ formatPercent(summary.grossMarginPercent) }} margem</strong>
            </header>

            @if (summary.salesTotal > 0) {
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
            } @else {
              <div class="dashboard-empty-chart">
                <strong>Nenhum dado financeiro no período.</strong>
                <span>Finalize vendas para comparar faturamento, CMV e lucro bruto.</span>
              </div>
            }
          </article>

          <article class="dashboard-chart-panel dashboard-rank-panel">
            <header>
              <div>
                <h2>Top 5 por lucro bruto</h2>
                <span>Produtos que mais colocam dinheiro no caixa</span>
              </div>
            </header>

            @if (summary.topProductsByProfit.length > 0) {
              <div class="dashboard-ranking-list">
                @for (item of summary.topProductsByProfit; track item.productId; let index = $index) {
                  <div class="dashboard-ranking-item">
                    <em>{{ index + 1 }}</em>
                    <div>
                      <strong>{{ item.productName }}</strong>
                      <small>{{ formatQuantity(item.quantitySold) }} vendidos · margem {{ formatPercent(item.grossMarginPercent) }}</small>
                      <div class="dashboard-bar-track profit">
                        <i [style.width.%]="getProductMetricWidth(item.grossProfit, summary.topProductsByProfit, 'grossProfit')"></i>
                      </div>
                    </div>
                    <span>{{ formatCurrency(item.grossProfit) }}</span>
                  </div>
                }
              </div>
            } @else {
              <div class="dashboard-empty-chart compact">
                <strong>Nenhum produto vendido no período.</strong>
                <span>Finalize vendas para acompanhar os produtos mais lucrativos.</span>
              </div>
            }
          </article>

          <article class="dashboard-chart-panel dashboard-rank-panel">
            <header>
              <div>
                <h2>Top 5 por quantidade vendida</h2>
                <span>Produtos com maior giro operacional</span>
              </div>
            </header>

            @if (summary.topProductsByQuantity.length > 0) {
              <div class="dashboard-ranking-list">
                @for (item of summary.topProductsByQuantity; track item.productId; let index = $index) {
                  <div class="dashboard-ranking-item">
                    <em>{{ index + 1 }}</em>
                    <div>
                      <strong>{{ item.productName }}</strong>
                      <small>{{ formatCurrency(item.salesTotal) }} vendidos · lucro {{ formatCurrency(item.grossProfit) }}</small>
                      <div class="dashboard-bar-track">
                        <i [style.width.%]="getProductMetricWidth(item.quantitySold, summary.topProductsByQuantity, 'quantitySold')"></i>
                      </div>
                    </div>
                    <span>{{ formatQuantity(item.quantitySold) }}</span>
                  </div>
                }
              </div>
            } @else {
              <div class="dashboard-empty-chart compact">
                <strong>Nenhum produto vendido no período.</strong>
                <span>O ranking de giro aparece quando houver vendas concluídas.</span>
              </div>
            }
          </article>

          <article class="dashboard-chart-panel dashboard-category-panel">
            <header>
              <div>
                <h2>Vendas por categoria</h2>
                <span>Categorias que mais puxam o faturamento</span>
              </div>
            </header>

            @if (summary.salesByCategory.length > 0) {
              <div class="dashboard-category-list">
                @for (item of summary.salesByCategory; track item.categoryId) {
                  <div class="dashboard-category-item">
                    <div>
                      <span>{{ item.categoryName }}</span>
                      <strong>{{ formatCurrency(item.salesTotal) }}</strong>
                    </div>
                    <div class="dashboard-bar-track category">
                      <i [style.width.%]="getCategoryWidth(item.salesTotal)"></i>
                    </div>
                    <small>{{ formatPercent(getCategoryPercentage(item.salesTotal)) }} do faturamento · lucro {{ formatCurrency(item.grossProfit) }}</small>
                  </div>
                }
              </div>
            } @else {
              <div class="dashboard-empty-chart compact">
                <strong>Nenhuma categoria com venda no período.</strong>
                <span>As categorias aparecem quando houver produtos vendidos.</span>
              </div>
            }
          </article>

          <article class="dashboard-chart-panel dashboard-critical-panel">
            <header>
              <div>
                <h2>Estoque crítico</h2>
                <span>Produtos que podem prejudicar as próximas vendas</span>
              </div>
              <strong>{{ summary.criticalStock.length }} itens</strong>
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
              <div class="dashboard-empty-chart compact">
                <strong>Nenhum produto em estoque crítico.</strong>
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

  protected get kpiCards(): Array<{
    icon: IconName;
    label: string;
    value: string | number;
    helper: string;
    variant: 'green' | 'amber' | 'dark' | 'neutral' | 'success';
  }> {
    return [
      {
        icon: 'dollar',
        label: 'Vendas do período',
        value: this.formatCurrency(this.summary.salesTotal),
        helper: this.periodLabel,
        variant: 'dark',
      },
      {
        icon: 'register',
        label: 'CMV do período',
        value: this.formatCurrency(this.summary.cmvTotal),
        helper: 'Custo das mercadorias vendidas',
        variant: 'amber',
      },
      {
        icon: 'check',
        label: 'Lucro bruto',
        value: this.formatCurrency(this.summary.grossProfit),
        helper: 'Vendas menos CMV',
        variant: 'success',
      },
      {
        icon: 'cards',
        label: 'Margem bruta',
        value: this.formatPercent(this.summary.grossMarginPercent),
        helper: 'Lucro sobre faturamento',
        variant: 'green',
      },
      {
        icon: 'receipt',
        label: 'Comandas abertas',
        value: this.summary.openCommandsCount,
        helper: 'Em consumo agora',
        variant: 'neutral',
      },
      {
        icon: 'bell',
        label: 'Ticket médio',
        value: this.formatCurrency(this.summary.averageTicket),
        helper: this.ticketHelper,
        variant: 'dark',
      },
    ];
  }

  protected setPreset(preset: DashboardPeriodPreset): void {
    this.period = this.dashboardService.resolvePreset(preset, this.period);
    this.errorMessage = '';
  }

  protected refreshDashboard(): void {
    this.errorMessage = '';
    this.period = { ...this.period };
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

  protected getCategoryPercentage(value: number): number {
    return this.summary.salesTotal > 0 ? (value / this.summary.salesTotal) * 100 : 0;
  }

  protected getChartPoints(items: DashboardChartItem[]): Array<{ label: string; x: number; y: number }> {
    if (items.length === 0) {
      return [];
    }

    const maxValue = Math.max(...items.map((item) => item.value), 1);
    const horizontalStep = items.length === 1 ? 0 : 880 / (items.length - 1);

    return items.map((item, index) => ({
      label: item.label,
      x: items.length === 1 ? 500 : 60 + index * horizontalStep,
      y: 260 - (item.value / maxValue) * 210,
    }));
  }

  protected getLinePath(items: DashboardChartItem[]): string {
    const points = this.getChartPoints(items);

    if (points.length === 0) {
      return '';
    }

    return points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ');
  }

  protected getAreaPath(items: DashboardChartItem[]): string {
    const points = this.getChartPoints(items);

    if (points.length === 0) {
      return '';
    }

    return `${this.getLinePath(items)} L ${points[points.length - 1].x} 280 L ${points[0].x} 280 Z`;
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
