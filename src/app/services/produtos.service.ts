import { Injectable, computed, inject, signal } from '@angular/core';
import { lastValueFrom } from 'rxjs';
import { ApiClientService } from '../core/api/api-client.service';
import { mapApiEntity, mapApiList } from '../core/api/api-mappers';
import {
  ProductCategory,
  Produto,
  ProdutoTamanho,
  StockEntryItem,
  productCategories,
  produtoTamanhos,
} from '../models/app-data';

export interface ProdutoPayload {
  nome: string;
  descricao: string;
  categoria: ProductCategory;
  tamanho: ProdutoTamanho;
  preco: number;
  ativo: boolean;
}

@Injectable({ providedIn: 'root' })
export class ProdutosService {
  readonly categories = productCategories;
  readonly tamanhos = produtoTamanhos;

  private readonly api = inject(ApiClientService);

  readonly produtos = signal<Produto[]>([]);
  readonly produtosAtivos = computed(() => this.produtos().filter((produto) => produto.ativo));

  constructor() {
    void this.reload().catch(() => undefined);
  }

  getProdutos(): Produto[] {
    return this.produtos();
  }

  clearData(): void {
    this.produtos.set([]);
  }

  getActiveProdutos(): Produto[] {
    return this.produtosAtivos();
  }

  productControlsStock(produto: Produto): boolean {
    return produto.controlaEstoque !== false;
  }

  isProductAvailable(produto: Produto): boolean {
    if (!produto.ativo) {
      return false;
    }

    if (!this.productControlsStock(produto)) {
      return true;
    }

    return (Number(produto.stockQuantity) || 0) > 0;
  }

  getProductUnavailableMessage(produto: Produto): string {
    if (!produto.ativo) {
      return 'Produto inativo.';
    }

    if (!this.productControlsStock(produto)) {
      return '';
    }

    return (Number(produto.stockQuantity) || 0) <= 0
      ? 'Produto sem estoque disponível.'
      : 'Quantidade solicitada maior que o estoque disponível.';
  }

  normalizeText(value: unknown): string {
    return String(value ?? '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
  }

  productMatchesSearch(produto: Produto, searchTerm: string): boolean {
    const normalizedSearch = this.normalizeText(searchTerm);

    if (!normalizedSearch) {
      return true;
    }

    return this.getProductSearchFields(produto).some((field) =>
      this.normalizeText(field).includes(normalizedSearch),
    );
  }

  createProduto(payload: ProdutoPayload): Produto {
    const now = new Date().toISOString();
    const produto: Produto = {
      ...payload,
      id: this.createId(),
      stockQuantity: 0,
      costPrice: 0,
      createdAt: now,
      updatedAt: now,
    };

    this.produtos.set(this.sortByName([...this.produtos(), produto]));
    void lastValueFrom(this.api.post<Produto>('/produtos', payload)).then((created) => {
      this.produtos.set(this.sortByName([...this.produtos().filter((item) => item.id !== produto.id), this.mapProduto(created)]));
    });
    return produto;
  }

  updateProduto(id: string, payload: ProdutoPayload): Produto | null {
    const updatedAt = new Date().toISOString();
    let updatedProduto: Produto | null = null;

    const produtos = this.produtos().map((produto) => {
      if (produto.id !== id) {
        return produto;
      }

      updatedProduto = { ...produto, ...payload, updatedAt };
      return updatedProduto;
    });

    this.produtos.set(this.sortByName(produtos));
    void lastValueFrom(this.api.put<Produto>(`/produtos/${id}`, payload)).then((updated) => {
      this.produtos.set(this.sortByName(this.produtos().map((produto) => (produto.id === id ? this.mapProduto(updated) : produto))));
    });
    return updatedProduto;
  }

  deleteProduto(id: string): void {
    this.produtos.set(this.produtos().filter((produto) => produto.id !== id));
    void lastValueFrom(this.api.delete(`/produtos/${id}`));
  }

  hasProduto(id: string): boolean {
    return this.produtos().some((produto) => produto.id === id);
  }

  getProdutoById(id: string): Produto | null {
    return this.produtos().find((produto) => produto.id === id) ?? null;
  }

  applyStockEntryItems(items: StockEntryItem[]): void {
    const updatedAt = new Date().toISOString();
    const entryItemsByProduct = new Map(items.map((item) => [item.productId, item]));

    this.produtos.set(
      this.sortByName(
        this.produtos().map((produto) => {
          const item = entryItemsByProduct.get(produto.id);

          if (!item) {
            return produto;
          }

          const currentStock = Number(produto.stockQuantity) || 0;
          const currentCost = Number(produto.costPrice) || 0;
          const entryQuantity = Number(item.quantity) || 0;
          const nextStock = currentStock + entryQuantity;
          const nextCost =
            nextStock > 0
              ? (currentStock * currentCost + entryQuantity * item.unitCost) / nextStock
              : item.unitCost;

          return {
            ...produto,
            stockQuantity: nextStock,
            costPrice: nextCost,
            updatedAt,
          };
        }),
      ),
    );
    void this.reload();
  }

  applyStockDeltas(deltas: Map<string, number>): void {
    if (deltas.size === 0) {
      return;
    }

    const updatedAt = new Date().toISOString();

    this.produtos.set(
      this.sortByName(
        this.produtos().map((produto) => {
          const delta = deltas.get(produto.id) ?? 0;

          if (delta === 0) {
            return produto;
          }

          return {
            ...produto,
            stockQuantity: Math.max(0, (Number(produto.stockQuantity) || 0) + delta),
            updatedAt,
          };
        }),
      ),
    );
    void this.reload();
  }

  private sortByName(produtos: Produto[]): Produto[] {
    return [...produtos].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  }

  private createId(): string {
    return `produto-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  getTamanhoLabel(tamanho?: ProdutoTamanho): string {
    return this.tamanhos.find((option) => option.id === tamanho)?.label ?? 'Médio';
  }

  private getProductSearchFields(produto: Produto): unknown[] {
    const extraFields = produto as Produto & {
      codigo?: unknown;
      code?: unknown;
      sku?: unknown;
      barcode?: unknown;
      codigoBarras?: unknown;
    };

    return [
      produto.nome,
      produto.descricao,
      produto.categoria,
      extraFields.codigo,
      extraFields.code,
      extraFields.sku,
      extraFields.barcode,
      extraFields.codigoBarras,
      this.getTamanhoLabel(produto.tamanho),
    ];
  }

  private normalizeProdutos(produtos: Produto[]): Produto[] {
    return produtos.map((produto) => ({
      ...mapApiEntity(produto),
      tamanho: this.normalizeTamanho((produto as Produto & { tamanho?: string }).tamanho),
      stockQuantity: Number(produto.stockQuantity) || 0,
      costPrice: Number(produto.costPrice) || 0,
      controlaEstoque: produto.controlaEstoque ?? true,
      descricao: produto.descricao ?? '',
      ativo: produto.ativo ?? true,
      createdAt: produto.createdAt ?? new Date().toISOString(),
      updatedAt: produto.updatedAt ?? produto.createdAt ?? new Date().toISOString(),
    }));
  }

  private normalizeTamanho(tamanho?: string): ProdutoTamanho {
    if (this.tamanhos.some((option) => option.id === tamanho)) {
      return tamanho as ProdutoTamanho;
    }

    const normalized = String(tamanho ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '_')
      .replace(/-/g, '_');

    const aliases: Record<string, ProdutoTamanho> = {
      mini: 'mini',
      pp: 'mini',
      muito_pequeno: 'muito_pequeno',
      extra_pequeno: 'muito_pequeno',
      pequeno: 'pequeno',
      p: 'pequeno',
      medio: 'medio',
      m: 'medio',
      grande: 'grande',
      g: 'grande',
    };

    return aliases[normalized] ?? 'medio';
  }

  async reload(): Promise<void> {
    const produtos = await lastValueFrom(this.api.list<Produto>('/produtos', { limit: 1000 }));
    this.produtos.set(this.sortByName(this.normalizeProdutos(mapApiList(produtos))));
  }

  private mapProduto(produto: Produto): Produto {
    return this.normalizeProdutos([produto])[0];
  }
}
