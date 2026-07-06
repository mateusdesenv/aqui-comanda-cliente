import { Injectable, inject, signal } from '@angular/core';
import { lastValueFrom } from 'rxjs';
import { ApiClientService } from '../core/api/api-client.service';
import { mapApiEntity, mapApiList } from '../core/api/api-mappers';
import { StockEntry, StockEntryItem } from '../models/app-data';
import { ProdutosService } from './produtos.service';

export interface StockEntryItemPayload {
  productId: string;
  quantity: number;
  unitCost: number;
}

export interface StockEntryPayload {
  date: string;
  notes?: string;
  supplierName?: string;
  items: StockEntryItemPayload[];
}

@Injectable({ providedIn: 'root' })
export class StockEntriesService {
  private readonly api = inject(ApiClientService);
  private readonly produtosService = inject(ProdutosService);

  readonly stockEntries = signal<StockEntry[]>([]);

  constructor() {
    void this.reload().catch(() => undefined);
  }

  getStockEntries(): StockEntry[] {
    return this.stockEntries();
  }

  clearData(): void {
    this.stockEntries.set([]);
  }

  getStockEntryById(id: string): StockEntry | null {
    return this.stockEntries().find((entry) => entry.id === id) ?? null;
  }

  createStockEntry(payload: StockEntryPayload): StockEntry {
    const normalizedPayload = this.validatePayload(payload);
    const now = new Date().toISOString();
    const items = normalizedPayload.items.map((item): StockEntryItem => {
      const produto = this.produtosService.getProdutoById(item.productId);

      if (!produto) {
        throw new Error('Produto não encontrado para entrada de estoque.');
      }

      return {
        productId: produto.id,
        productName: produto.nome,
        quantity: item.quantity,
        unitCost: item.unitCost,
        totalCost: item.quantity * item.unitCost,
      };
    });
    const totalCost = items.reduce((total, item) => total + item.totalCost, 0);
    const entry: StockEntry = {
      id: this.createId(),
      date: normalizedPayload.date,
      notes: normalizedPayload.notes,
      supplierName: normalizedPayload.supplierName,
      totalCost,
      items,
      createdAt: now,
      updatedAt: now,
    };

    this.stockEntries.set(this.sortEntries([entry, ...this.stockEntries()]));
    void lastValueFrom(this.api.post<StockEntry>('/estoque/entradas', normalizedPayload)).then(async (created) => {
      this.stockEntries.set(this.sortEntries([this.mapStockEntry(created), ...this.stockEntries().filter((item) => item.id !== entry.id)]));
      await this.produtosService.reload();
    });
    return entry;
  }

  private validatePayload(payload: StockEntryPayload): StockEntryPayload {
    if (!payload.date) {
      throw new Error('Informe a data da entrada.');
    }

    if (!Array.isArray(payload.items) || payload.items.length === 0) {
      throw new Error('Adicione pelo menos um item à entrada.');
    }

    const productIds = new Set<string>();
    const items = payload.items.map((item) => {
      const productId = String(item.productId ?? '').trim();
      const quantity = Number(item.quantity);
      const unitCost = Number(item.unitCost);

      if (!productId) {
        throw new Error('Selecione um produto em todos os itens.');
      }

      if (!this.produtosService.hasProduto(productId)) {
        throw new Error('A entrada contém um produto inexistente.');
      }

      if (productIds.has(productId)) {
        throw new Error('Não é permitido lançar o mesmo produto duas vezes na mesma entrada.');
      }

      if (!Number.isFinite(quantity) || quantity <= 0) {
        throw new Error('Informe quantidade maior que zero em todos os itens.');
      }

      if (!Number.isFinite(unitCost) || unitCost < 0) {
        throw new Error('Informe custo unitário maior ou igual a zero em todos os itens.');
      }

      productIds.add(productId);
      return { productId, quantity, unitCost };
    });

    return {
      date: payload.date,
      notes: payload.notes?.trim() || undefined,
      supplierName: payload.supplierName?.trim() || undefined,
      items,
    };
  }

  private normalizeEntries(entries: StockEntry[]): StockEntry[] {
    return entries.map((entry) => ({
      ...entry,
      notes: entry.notes?.trim() || undefined,
      supplierName: entry.supplierName?.trim() || undefined,
      totalCost: Number(entry.totalCost) || 0,
      items: (entry.items ?? []).map((item) => ({
        productId: item.productId,
        productName: item.productName,
        quantity: Number(item.quantity) || 0,
        unitCost: Number(item.unitCost) || 0,
        totalCost: Number(item.totalCost) || (Number(item.quantity) || 0) * (Number(item.unitCost) || 0),
      })),
      createdAt: entry.createdAt ?? new Date().toISOString(),
      updatedAt: entry.updatedAt ?? entry.createdAt ?? new Date().toISOString(),
    }));
  }

  private createId(): string {
    return `stock-entry-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  private sortEntries(entries: StockEntry[]): StockEntry[] {
    return [...entries].sort(
      (first, second) =>
        new Date(second.date).getTime() - new Date(first.date).getTime() ||
        new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime(),
    );
  }

  async reload(): Promise<void> {
    const entries = await lastValueFrom(this.api.list<StockEntry>('/estoque/entradas', { limit: 1000 }));
    this.stockEntries.set(this.sortEntries(this.normalizeEntries(mapApiList(entries))));
  }

  private mapStockEntry(entry: StockEntry): StockEntry {
    return this.normalizeEntries([mapApiEntity(entry)])[0];
  }
}
