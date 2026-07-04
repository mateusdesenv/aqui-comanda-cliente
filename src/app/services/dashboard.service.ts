import { Injectable, inject } from '@angular/core';
import { Comanda, ItemComanda, ItemPedido, Pedido } from '../models/app-data';
import { ComandasService } from './comandas.service';
import { PedidosService } from './pedidos.service';
import { ProdutosService } from './produtos.service';

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

export interface DashboardSummary {
  salesTotal: number;
  cmvTotal: number;
  grossProfit: number;
  grossMarginPercent: number;
  averageTicket: number;
  closedOrdersCount: number;
  openCommandsCount: number;
  cmvChart: DashboardChartItem[];
  salesChart: DashboardChartItem[];
}

interface DashboardSale {
  id: string;
  closedAt: string;
  total: number;
  cmv: number;
}

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly comandasService = inject(ComandasService);
  private readonly pedidosService = inject(PedidosService);
  private readonly produtosService = inject(ProdutosService);

  getSummary(period: DashboardPeriod): DashboardSummary {
    const sales = this.getSalesInPeriod(period);
    const salesTotal = this.roundCurrency(sales.reduce((total, sale) => total + sale.total, 0));
    const cmvTotal = this.roundCurrency(sales.reduce((total, sale) => total + sale.cmv, 0));
    const grossProfit = this.roundCurrency(salesTotal - cmvTotal);
    const grossMarginPercent = salesTotal > 0 ? this.roundCurrency((grossProfit / salesTotal) * 100) : 0;
    const closedOrdersCount = sales.length;
    const averageTicket = closedOrdersCount > 0 ? this.roundCurrency(salesTotal / closedOrdersCount) : 0;

    return {
      salesTotal,
      cmvTotal,
      grossProfit,
      grossMarginPercent,
      averageTicket,
      closedOrdersCount,
      openCommandsCount: this.comandasService.getOpenComandas().length,
      cmvChart: [
        { label: 'Faturamento', value: salesTotal },
        { label: 'CMV', value: cmvTotal },
        { label: 'Lucro bruto', value: grossProfit },
      ],
      salesChart: this.buildSalesChart(sales, period),
    };
  }

  getDefaultPeriod(): DashboardPeriod {
    const today = this.toInputDate(new Date());
    return { preset: 'today', startDate: today, endDate: today };
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
    return Number(produto?.costPrice) || 0;
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
