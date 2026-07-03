import { Injectable, computed, signal } from '@angular/core';
import {
  ProductCategory,
  Produto,
  ProdutoTamanho,
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

  createProduto(payload: ProdutoPayload): Produto {
    const now = new Date().toISOString();
    const produto: Produto = {
      ...payload,
      id: this.createId(),
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

  private normalizeProdutos(produtos: Produto[]): Produto[] {
    return produtos.map((produto) => ({
      ...produto,
      tamanho: this.normalizeTamanho((produto as Produto & { tamanho?: string }).tamanho),
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
        ativo: true,
        createdAt: now,
        updatedAt: now,
      },
    ];
  }
}
