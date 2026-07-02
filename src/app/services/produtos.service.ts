import { Injectable, computed, signal } from '@angular/core';
import { ProductCategory, Produto, productCategories } from '../models/app-data';
import { LocalStorageRepository } from './local-storage.repository';

export interface ProdutoPayload {
  nome: string;
  descricao: string;
  categoria: ProductCategory;
  preco: number;
  ativo: boolean;
}

@Injectable({ providedIn: 'root' })
export class ProdutosService {
  readonly categories = productCategories;

  private readonly repository = new LocalStorageRepository<Produto[]>(
    'aqui-comanda:produtos',
    this.createDefaultProdutos(),
  );

  readonly produtos = signal<Produto[]>(this.sortByName(this.repository.read()));
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

  private createDefaultProdutos(): Produto[] {
    const now = new Date().toISOString();

    return [
      {
        id: 'x-burger',
        nome: 'X-Burger',
        descricao: 'Hambúrguer, queijo e molho da casa.',
        categoria: 'Lanches',
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
        preco: 4.5,
        ativo: true,
        createdAt: now,
        updatedAt: now,
      },
    ];
  }
}
