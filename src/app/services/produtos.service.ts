import { Injectable, computed, signal } from '@angular/core';
import {
  ProductCategory,
  Produto,
  ProdutoTamanho,
  StockEntryItem,
  productCategories,
  produtoTamanhos,
} from '../models/app-data';
import { LocalStorageRepository } from './local-storage.repository';

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

  private readonly repository = new LocalStorageRepository<Produto[]>(
    'aqui-comanda:produtos',
    this.createDefaultProdutos(),
  );

  readonly produtos = signal<Produto[]>(this.sortByName(this.normalizeProdutos(this.repository.read())));
  readonly produtosAtivos = computed(() => this.produtos().filter((produto) => produto.ativo));

  constructor() {
    this.persist();
  }

  getProdutos(): Produto[] {
    return this.produtos();
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
    this.persist();
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
    this.persist();
    return updatedProduto;
  }

  deleteProduto(id: string): void {
    this.produtos.set(this.produtos().filter((produto) => produto.id !== id));
    this.persist();
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
    this.persist();
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
    this.persist();
  }

  private persist(): void {
    this.repository.write(this.produtos());
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
      ...produto,
      tamanho: this.normalizeTamanho((produto as Produto & { tamanho?: string }).tamanho),
      stockQuantity: Number(produto.stockQuantity) || 0,
      costPrice: Number(produto.costPrice) || 0,
      controlaEstoque: produto.controlaEstoque ?? true,
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

  private createDefaultProdutos(): Produto[] {
    const now = new Date().toISOString();

    return [
      {
        id: 'x-burger',
        nome: 'X-Burger',
        descricao: 'Hambúrguer, queijo e molho da casa.',
        categoria: 'Lanches',
        tamanho: 'medio',
        preco: 24.9,
        stockQuantity: 0,
        costPrice: 0,
        ativo: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'x-salada',
        nome: 'X-Salada',
        descricao: 'Hambúrguer, queijo, alface, tomate e maionese.',
        categoria: 'Lanches',
        tamanho: 'medio',
        preco: 26.9,
        stockQuantity: 0,
        costPrice: 0,
        ativo: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'batata-frita',
        nome: 'Batata Frita',
        descricao: 'Porção crocante para compartilhar.',
        categoria: 'Porções',
        tamanho: 'grande',
        preco: 16.9,
        stockQuantity: 0,
        costPrice: 0,
        ativo: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'refrigerante-lata',
        nome: 'Refrigerante Lata',
        descricao: 'Lata 350 ml gelada.',
        categoria: 'Bebidas',
        tamanho: 'pequeno',
        preco: 7.5,
        stockQuantity: 0,
        costPrice: 0,
        ativo: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'suco-natural',
        nome: 'Suco Natural',
        descricao: 'Fruta da estação batida na hora.',
        categoria: 'Bebidas',
        tamanho: 'pequeno',
        preco: 9,
        stockQuantity: 0,
        costPrice: 0,
        ativo: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'agua-mineral',
        nome: 'Água Mineral',
        descricao: 'Garrafa sem gás 500 ml.',
        categoria: 'Bebidas',
        tamanho: 'pequeno',
        preco: 4.5,
        stockQuantity: 0,
        costPrice: 0,
        ativo: true,
        createdAt: now,
        updatedAt: now,
      },
    ];
  }
}
