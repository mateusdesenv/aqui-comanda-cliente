import { Injectable, inject } from '@angular/core';
import { lastValueFrom } from 'rxjs';
import { ApiClientService } from '../core/api/api-client.service';
import { Comanda, ItemComanda, ItemPedido, Pedido, Produto } from '../models/app-data';
import { ComandasService } from './comandas.service';
import { PedidosService } from './pedidos.service';
import { ProdutosService } from './produtos.service';
import { StockEntriesService } from './stock-entries.service';

export type DashboardPeriodPreset = 'today' | 'yesterday' | 'last_7' | 'last_30' | 'custom';

export interface DashboardPeriod {
  preset: DashboardPeriodPreset;
  startDate: string;
  endDate: string;
}

export interface DashboardChartItem {
  label: string;
  value: number;
}

export interface DashboardProductMetric {
  productId: string;
  productName: string;
  quantitySold: number;
  salesTotal: number;
  cmvTotal: number;
  grossProfit: number;
  grossMarginPercent: number;
}

export interface DashboardCategoryMetric {
  categoryId: string;
  categoryName: string;
  salesTotal: number;
  cmvTotal: number;
  grossProfit: number;
  grossMarginPercent: number;
}

export type DashboardStockStatus = 'LOW' | 'OUT_OF_STOCK' | 'OK';

export interface DashboardCriticalStockItem {
  productId: string;
  productName: string;
  currentStock: number;
  minimumStock: number;
  status: DashboardStockStatus;
}

export interface DashboardSummary {
  salesTotal: number;
  cmvTotal: number;
  grossProfit: number;
  grossMarginPercent: number;
  averageTicket: number;
  closedOrdersCount: number;
  openCommandsCount: number;
  salesByPeriod: DashboardChartItem[];
  financialComparison: DashboardChartItem[];
  topProductsByProfit: DashboardProductMetric[];
  topProductsByQuantity: DashboardProductMetric[];
  salesByCategory: DashboardCategoryMetric[];
  criticalStock: DashboardCriticalStockItem[];
}

interface DashboardSale {
  id: string;
  closedAt: string;
  total: number;
  cmv: number;
  items: DashboardSaleItem[];
}

interface DashboardSaleItem {
  productId: string;
  productName: string;
  categoryName: string;
  quantity: number;
  salesTotal: number;
  cmvTotal: number;
}

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly api = inject(ApiClientService);
  private readonly comandasService = inject(ComandasService);
  private readonly pedidosService = inject(PedidosService);
  private readonly produtosService = inject(ProdutosService);
  private readonly stockEntriesService = inject(StockEntriesService);
  private readonly emptySummary: DashboardSummary = {
    salesTotal: 0,
    cmvTotal: 0,
    grossProfit: 0,
    grossMarginPercent: 0,
    averageTicket: 0,
    closedOrdersCount: 0,
    openCommandsCount: 0,
    salesByPeriod: [],
    financialComparison: [
      { label: 'Faturamento', value: 0 },
      { label: 'CMV', value: 0 },
      { label: 'Lucro bruto', value: 0 },
    ],
    topProductsByProfit: [],
    topProductsByQuantity: [],
    salesByCategory: [],
    criticalStock: [],
  };
  private cachedSummary: DashboardSummary = this.emptySummary;
  private lastRequestKey = '';

  getSummary(period: DashboardPeriod): DashboardSummary {
    const key = JSON.stringify(period);
    if (key !== this.lastRequestKey) {
      this.lastRequestKey = key;
      void this.fetchSummary(period);
    }

    return this.cachedSummary;
  }

  getDefaultPeriod(): DashboardPeriod {
    const today = this.toInputDate(new Date());
    return { preset: 'today', startDate: today, endDate: today };
  }

  private async fetchSummary(period: DashboardPeriod): Promise<void> {
    const data = await lastValueFrom(
      this.api.get<Partial<DashboardSummary>>('/dashboard', {
        preset: period.preset,
        startDate: period.startDate,
        endDate: period.endDate,
      }),
    );
    const salesTotal = Number(data.salesTotal) || 0;
    const cmvTotal = Number(data.cmvTotal) || 0;
    const grossProfit = Number(data.grossProfit) || salesTotal - cmvTotal;

    this.cachedSummary = {
      ...this.emptySummary,
      ...data,
      salesTotal,
      cmvTotal,
      grossProfit,
      grossMarginPercent: Number(data.grossMarginPercent) || (salesTotal > 0 ? this.roundCurrency((grossProfit / salesTotal) * 100) : 0),
      averageTicket: Number(data.averageTicket) || 0,
      closedOrdersCount: Number(data.closedOrdersCount) || 0,
      openCommandsCount: Number(data.openCommandsCount) || 0,
      salesByPeriod: data.salesByPeriod ?? [],
      financialComparison: data.financialComparison ?? [
        { label: 'Faturamento', value: salesTotal },
        { label: 'CMV', value: cmvTotal },
        { label: 'Lucro bruto', value: grossProfit },
      ],
      topProductsByProfit: data.topProductsByProfit ?? [],
      topProductsByQuantity: data.topProductsByQuantity ?? [],
      salesByCategory: data.salesByCategory ?? [],
      criticalStock: data.criticalStock ?? [],
    };
  }

  resolvePreset(preset: DashboardPeriodPreset, currentPeriod?: DashboardPeriod): DashboardPeriod {
    if (preset === 'custom') {
      return currentPeriod?.preset === 'custom'
        ? currentPeriod
        : { preset, startDate: this.toInputDate(new Date()), endDate: this.toInputDate(new Date()) };
    }

    const today = this.startOfDay(new Date());
    const endDate = new Date(today);
    const startDate = new Date(today);

    if (preset === 'yesterday') {
      startDate.setDate(today.getDate() - 1);
      endDate.setDate(today.getDate() - 1);
    }

    if (preset === 'last_7') {
      startDate.setDate(today.getDate() - 6);
    }

    if (preset === 'last_30') {
      startDate.setDate(today.getDate() - 29);
    }

    return {
      preset,
      startDate: this.toInputDate(startDate),
      endDate: this.toInputDate(endDate),
    };
  }

  private getSalesInPeriod(period: DashboardPeriod): DashboardSale[] {
    const rangeStart = this.parseInputDate(period.startDate);
    const rangeEnd = this.endOfDay(this.parseInputDate(period.endDate));

    return [...this.getComandaSales(), ...this.getPedidoSales()]
      .filter((sale) => this.isDateInRange(new Date(sale.closedAt), rangeStart, rangeEnd))
      .sort((first, second) => new Date(first.closedAt).getTime() - new Date(second.closedAt).getTime());
  }

  private getComandaSales(): DashboardSale[] {
    return this.comandasService
      .getComandas()
      .filter((comanda) => comanda.status === 'finalizada' && comanda.paga && Boolean(comanda.finalizadaEm))
      .map((comanda) => ({
        id: comanda.id,
        closedAt: comanda.finalizadaEm!,
        total: Number(comanda.totalFinalizado ?? comanda.total) || 0,
        cmv: this.getComandaCmv(comanda),
        items: (comanda.itens ?? []).map((item) => this.createSaleItemFromComanda(item)),
      }));
  }

  private getPedidoSales(): DashboardSale[] {
    return this.pedidosService
      .getPedidos()
      .filter((pedido) => pedido.status === 'entregue' || pedido.pagamentoConfirmado)
      .map((pedido) => ({
        id: pedido.id,
        closedAt: pedido.updatedAt || pedido.createdAt,
        total: Number(pedido.total) || 0,
        cmv: this.getPedidoCmv(pedido),
        items: (pedido.itens ?? []).map((item) => this.createSaleItemFromPedido(item)),
      }));
  }

  private getComandaCmv(comanda: Comanda): number {
    return this.roundCurrency(
      (comanda.itens ?? []).reduce((total, item) => total + this.getItemComandaCost(item), 0),
    );
  }

  private getPedidoCmv(pedido: Pedido): number {
    return this.roundCurrency(
      (pedido.itens ?? []).reduce((total, item) => total + this.getItemPedidoCost(item), 0),
    );
  }

  private getItemComandaCost(item: ItemComanda): number {
    const quantity = Number(item.quantidade) || 0;
    const totalCost = Number(item.totalCost);

    if (Number.isFinite(totalCost) && totalCost > 0) {
      return totalCost;
    }

    const unitCost = Number(item.unitCost);

    if (Number.isFinite(unitCost) && unitCost > 0) {
      return quantity * unitCost;
    }

    return quantity * this.getCurrentProductCost(item.productId);
  }

  private getItemPedidoCost(item: ItemPedido): number {
    const quantity = Number(item.quantidade) || 0;
    return quantity * this.getCurrentProductCost(item.productId);
  }

  private getCurrentProductCost(productId: string): number {
    const produto = this.produtosService.getProdutoById(productId);
    const productCost = Number(produto?.costPrice) || 0;

    if (productCost > 0) {
      return productCost;
    }

    return this.getAverageCostFromStockEntries(productId);
  }

  private createSaleItemFromComanda(item: ItemComanda): DashboardSaleItem {
    const produto = this.produtosService.getProdutoById(item.productId);
    const quantity = Number(item.quantidade) || 0;
    const salesTotal = Number(item.subtotal) || quantity * (Number(item.precoUnitario) || 0);

    return {
      productId: item.productId,
      productName: item.nome || produto?.nome || 'Produto não identificado',
      categoryName: produto?.categoria ?? 'Sem categoria',
      quantity,
      salesTotal,
      cmvTotal: this.getItemComandaCost(item),
    };
  }

  private createSaleItemFromPedido(item: ItemPedido): DashboardSaleItem {
    const produto = this.produtosService.getProdutoById(item.productId);
    const quantity = Number(item.quantidade) || 0;
    const salesTotal = Number(item.subtotal) || quantity * (Number(item.precoUnitario) || 0);

    return {
      productId: item.productId,
      productName: item.nome || produto?.nome || 'Produto não identificado',
      categoryName: produto?.categoria ?? 'Sem categoria',
      quantity,
      salesTotal,
      cmvTotal: this.getItemPedidoCost(item),
    };
  }

  private getAverageCostFromStockEntries(productId: string): number {
    let totalCost = 0;
    let totalQuantity = 0;

    for (const entry of this.stockEntriesService.getStockEntries()) {
      for (const item of entry.items ?? []) {
        if (item.productId !== productId) {
          continue;
        }

        totalCost += Number(item.totalCost) || (Number(item.quantity) || 0) * (Number(item.unitCost) || 0);
        totalQuantity += Number(item.quantity) || 0;
      }
    }

    return totalQuantity > 0 ? totalCost / totalQuantity : 0;
  }

  private buildSalesChart(sales: DashboardSale[], period: DashboardPeriod): DashboardChartItem[] {
    const shouldGroupByHour = this.getDaysBetween(period.startDate, period.endDate) <= 1;
    const grouped = new Map<string, number>();

    for (const sale of sales) {
      const date = new Date(sale.closedAt);
      const label = shouldGroupByHour
        ? `${String(date.getHours()).padStart(2, '0')}h`
        : new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit' }).format(date);
      grouped.set(label, (grouped.get(label) ?? 0) + sale.total);
    }

    return Array.from(grouped.entries()).map(([label, value]) => ({
      label,
      value: this.roundCurrency(value),
    }));
  }

  private buildTopProductsByProfit(sales: DashboardSale[]): DashboardProductMetric[] {
    return this.buildProductMetrics(sales)
      .sort((first, second) => second.grossProfit - first.grossProfit)
      .slice(0, 5);
  }

  private buildTopProductsByQuantity(sales: DashboardSale[]): DashboardProductMetric[] {
    return this.buildProductMetrics(sales)
      .sort((first, second) => second.quantitySold - first.quantitySold)
      .slice(0, 5);
  }

  private buildProductMetrics(sales: DashboardSale[]): DashboardProductMetric[] {
    const grouped = new Map<string, DashboardProductMetric>();

    for (const item of sales.flatMap((sale) => sale.items)) {
      const current =
        grouped.get(item.productId) ??
        {
          productId: item.productId,
          productName: item.productName,
          quantitySold: 0,
          salesTotal: 0,
          cmvTotal: 0,
          grossProfit: 0,
          grossMarginPercent: 0,
        };

      current.quantitySold += item.quantity;
      current.salesTotal += item.salesTotal;
      current.cmvTotal += item.cmvTotal;
      current.grossProfit = current.salesTotal - current.cmvTotal;
      current.grossMarginPercent =
        current.salesTotal > 0 ? (current.grossProfit / current.salesTotal) * 100 : 0;

      grouped.set(item.productId, current);
    }

    return Array.from(grouped.values()).map((item) => this.roundProductMetric(item));
  }

  private buildSalesByCategory(sales: DashboardSale[]): DashboardCategoryMetric[] {
    const grouped = new Map<string, DashboardCategoryMetric>();

    for (const item of sales.flatMap((sale) => sale.items)) {
      const categoryName = item.categoryName || 'Sem categoria';
      const current =
        grouped.get(categoryName) ??
        {
          categoryId: categoryName,
          categoryName,
          salesTotal: 0,
          cmvTotal: 0,
          grossProfit: 0,
          grossMarginPercent: 0,
        };

      current.salesTotal += item.salesTotal;
      current.cmvTotal += item.cmvTotal;
      current.grossProfit = current.salesTotal - current.cmvTotal;
      current.grossMarginPercent =
        current.salesTotal > 0 ? (current.grossProfit / current.salesTotal) * 100 : 0;

      grouped.set(categoryName, current);
    }

    return Array.from(grouped.values())
      .map((item) => ({
        ...item,
        salesTotal: this.roundCurrency(item.salesTotal),
        cmvTotal: this.roundCurrency(item.cmvTotal),
        grossProfit: this.roundCurrency(item.grossProfit),
        grossMarginPercent: this.roundCurrency(item.grossMarginPercent),
      }))
      .sort((first, second) => second.salesTotal - first.salesTotal);
  }

  private buildCriticalStock(): DashboardCriticalStockItem[] {
    return this.produtosService
      .getProdutos()
      .filter((produto) => produto.ativo && this.produtosService.productControlsStock(produto))
      .map((produto) => this.getCriticalStockItem(produto))
      .filter((item) => item.status !== 'OK')
      .sort((first, second) => {
        const statusWeight: Record<DashboardStockStatus, number> = {
          OUT_OF_STOCK: 0,
          LOW: 1,
          OK: 2,
        };

        return (
          statusWeight[first.status] - statusWeight[second.status] ||
          first.currentStock - second.currentStock ||
          first.productName.localeCompare(second.productName, 'pt-BR')
        );
      })
      .slice(0, 8);
  }

  private getCriticalStockItem(produto: Produto): DashboardCriticalStockItem {
    const extraFields = produto as Produto & { minimumStock?: unknown; estoqueMinimo?: unknown; minStock?: unknown };
    const currentStock = Number(produto.stockQuantity) || 0;
    const minimumStock =
      Number(extraFields.minimumStock ?? extraFields.estoqueMinimo ?? extraFields.minStock) || 5;
    const status: DashboardStockStatus =
      currentStock <= 0 ? 'OUT_OF_STOCK' : currentStock <= minimumStock ? 'LOW' : 'OK';

    return {
      productId: produto.id,
      productName: produto.nome,
      currentStock: this.roundCurrency(currentStock),
      minimumStock,
      status,
    };
  }

  private roundProductMetric(metric: DashboardProductMetric): DashboardProductMetric {
    return {
      ...metric,
      quantitySold: this.roundCurrency(metric.quantitySold),
      salesTotal: this.roundCurrency(metric.salesTotal),
      cmvTotal: this.roundCurrency(metric.cmvTotal),
      grossProfit: this.roundCurrency(metric.grossProfit),
      grossMarginPercent: this.roundCurrency(metric.grossMarginPercent),
    };
  }

  private getDaysBetween(startDate: string, endDate: string): number {
    const start = this.parseInputDate(startDate);
    const end = this.parseInputDate(endDate);
    return Math.max(1, Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1);
  }

  private isDateInRange(date: Date, start: Date, end: Date): boolean {
    const time = date.getTime();
    return time >= start.getTime() && time <= end.getTime();
  }

  private parseInputDate(value: string): Date {
    const [year, month, day] = value.split('-').map(Number);
    return new Date(year, (month || 1) - 1, day || 1);
  }

  private toInputDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private startOfDay(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }

  private endOfDay(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
  }

  private roundCurrency(value: number): number {
    return Math.round((Number(value) || 0) * 100) / 100;
  }
}
