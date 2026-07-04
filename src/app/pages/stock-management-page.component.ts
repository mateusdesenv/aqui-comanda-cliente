import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Produto } from '../models/app-data';
import { ProdutosService } from '../services/produtos.service';

type StockStatusFilter = 'todos' | 'com_estoque' | 'sem_estoque' | 'baixo';

@Component({
  selector: 'app-stock-management-page',
  standalone: true,
  imports: [FormsModule, RouterLink],
  template: `
    <div class="page-stack management-page stock-management-page">
      <section class="page-head">
        <div>
          <h1>Gestão de Estoque</h1>
          <p>Acompanhe saldo atual, custo médio e valor de estoque dos produtos cadastrados.</p>
        </div>

        <a class="primary-action-button page-head-action" routerLink="/estoque/entradas">
          Nova entrada
        </a>
      </section>

      <section class="stats-grid" aria-label="Resumo do estoque">
        <article class="stat-card neutral">
          <span class="stat-icon">#</span>
          <div>
            <span class="stat-label">Produtos</span>
            <strong>{{ produtos.length }}</strong>
            <small>Produtos cadastrados</small>
          </div>
        </article>
        <article class="stat-card green">
          <span class="stat-icon">✓</span>
          <div>
            <span class="stat-label">Com estoque</span>
            <strong>{{ produtosComEstoque }}</strong>
            <small>Disponíveis para comanda</small>
          </div>
        </article>
        <article class="stat-card amber">
          <span class="stat-icon">!</span>
          <div>
            <span class="stat-label">Sem estoque</span>
            <strong>{{ produtosSemEstoque }}</strong>
            <small>Bloqueados para venda</small>
          </div>
        </article>
        <article class="stat-card dark">
          <span class="stat-icon">$</span>
          <div>
            <span class="stat-label">Valor em estoque</span>
            <strong>{{ formatCurrency(valorTotalEstoque) }}</strong>
            <small>Saldo pelo custo médio</small>
          </div>
        </article>
      </section>

      <section class="caixa-filters cardapio-filters" aria-label="Filtros do estoque">
        <label>
          Buscar produto
          <input
            type="search"
            placeholder="Nome ou categoria"
            [(ngModel)]="search"
          />
        </label>

        <label>
          Status de estoque
          <select name="stockStatus" [(ngModel)]="statusFilter">
            <option value="todos">Todos</option>
            <option value="com_estoque">Com estoque</option>
            <option value="sem_estoque">Sem estoque</option>
            <option value="baixo">Baixo estoque</option>
          </select>
        </label>

        <label>
          Limite baixo estoque
          <input type="number" min="0" step="1" [(ngModel)]="lowStockLimit" />
        </label>

        <button class="clear-filters-button" type="button" (click)="clearFilters()">
          Limpar filtros
        </button>
      </section>

      <section class="management-list-card full-management-list">
        <div class="list-card-head">
          <div>
            <h2>Produtos em estoque</h2>
            <span>{{ filteredProdutos.length }} exibidos · {{ produtos.length }} produtos cadastrados</span>
          </div>
        </div>

        <div class="management-table stock-management-table">
          <div class="management-table-head">
            <span>Produto</span>
            <span>Categoria</span>
            <span>Estoque atual</span>
            <span>Custo médio</span>
            <span>Valor em estoque</span>
            <span>Status</span>
          </div>

          @for (produto of filteredProdutos; track produto.id) {
            <div class="management-table-row">
              <div>
                <strong>{{ produto.nome }}</strong>
                <small>{{ produto.descricao || 'Sem descrição' }}</small>
              </div>
              <span>{{ produto.categoria }}</span>
              <strong>{{ formatQuantity(produto.stockQuantity) }}</strong>
              <span>{{ formatCurrency(produto.costPrice) }}</span>
              <span>{{ formatCurrency(getStockValue(produto)) }}</span>
              <span
                class="status-chip"
                [class.inativa]="produto.stockQuantity <= 0"
                [class.reservada]="produto.stockQuantity > 0 && produto.stockQuantity <= lowStockLimit"
              >
                {{ getStockStatusLabel(produto) }}
              </span>
            </div>
          } @empty {
            <div class="management-empty-state">
              <strong>Nenhum produto encontrado</strong>
              <span>Ajuste os filtros ou registre uma entrada de estoque.</span>
            </div>
          }
        </div>
      </section>
    </div>
  `,
})
export class StockManagementPageComponent {
  private readonly produtosService = inject(ProdutosService);

  protected produtos = this.produtosService.getProdutos();
  protected search = '';
  protected statusFilter: StockStatusFilter = 'todos';
  protected lowStockLimit = 5;

  protected get filteredProdutos(): Produto[] {
    const normalizedSearch = this.normalizeText(this.search);

    return this.produtos.filter((produto) => {
      if (this.statusFilter === 'com_estoque' && produto.stockQuantity <= 0) {
        return false;
      }

      if (this.statusFilter === 'sem_estoque' && produto.stockQuantity > 0) {
        return false;
      }

      if (
        this.statusFilter === 'baixo' &&
        (produto.stockQuantity <= 0 || produto.stockQuantity > this.lowStockLimit)
      ) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      return this.normalizeText([produto.nome, produto.descricao, produto.categoria].join(' ')).includes(
        normalizedSearch,
      );
    });
  }

  protected get produtosComEstoque(): number {
    return this.produtos.filter((produto) => produto.stockQuantity > 0).length;
  }

  protected get produtosSemEstoque(): number {
    return this.produtos.filter((produto) => produto.stockQuantity <= 0).length;
  }

  protected get valorTotalEstoque(): number {
    return this.produtos.reduce((total, produto) => total + this.getStockValue(produto), 0);
  }

  protected clearFilters(): void {
    this.search = '';
    this.statusFilter = 'todos';
    this.lowStockLimit = 5;
  }

  protected getStockValue(produto: Produto): number {
    return (Number(produto.stockQuantity) || 0) * (Number(produto.costPrice) || 0);
  }

  protected getStockStatusLabel(produto: Produto): string {
    if (produto.stockQuantity <= 0) {
      return 'Sem estoque';
    }

    if (produto.stockQuantity <= this.lowStockLimit) {
      return 'Baixo estoque';
    }

    return 'Disponível';
  }

  protected formatCurrency(value: number): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  }

  protected formatQuantity(value: number): string {
    return new Intl.NumberFormat('pt-BR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 3,
    }).format(value);
  }

  private normalizeText(value: string): string {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }
}
