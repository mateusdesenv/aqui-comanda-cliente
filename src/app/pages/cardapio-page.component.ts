import { Component, HostListener, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../services/auth.service';
import { ProductCategory, Produto, ProdutoTamanho } from '../models/app-data';
import { ProdutoPayload, ProdutosService } from '../services/produtos.service';
import { ProdutoCategoriasService } from '../services/produto-categorias.service';

type ProdutoStatusFilter = 'todos' | 'ativo' | 'inativo';
type ProdutoDescriptionFilter = 'todos' | 'com_descricao' | 'sem_descricao';
type ProdutoSortOption = 'nome_az' | 'nome_za' | 'menor_preco' | 'maior_preco' | 'mais_recentes' | 'mais_antigos' | 'categoria' | 'tamanho';

interface ProdutoFormModel {
  nome: string;
  descricao: string;
  categoria: ProductCategory;
  tamanho: ProdutoTamanho;
  preco: number | null;
  ativo: boolean;
}

@Component({
  selector: 'app-cardapio-page',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="page-stack management-page cardapio-page">
      <section class="page-head">
        <div>
          <h1>Cardápio</h1>
          <p>Cadastre produtos e mantenha o cardápio disponível para as comandas.</p>
        </div>

        <label class="page-search" aria-label="Buscar produto no cardápio">
          <span aria-hidden="true">⌕</span>
          <input
            type="search"
            placeholder="Buscar produto, descrição ou categoria"
            [(ngModel)]="search"
          />
        </label>
      </section>

      @if (errorMessage && !produtoModalOpen) {
        <div class="form-feedback">{{ errorMessage }}</div>
      }

      @if (successMessage && !produtoModalOpen) {
        <div class="form-feedback success">{{ successMessage }}</div>
      }

      <section class="caixa-filters cardapio-filters" aria-label="Filtros do cardápio">
        <label>
          Categoria
          <select name="cardapioCategoria" [(ngModel)]="categoryFilter">
            <option value="todos">Todas</option>
            @for (category of categories; track category) {
              <option [value]="category">{{ category }}</option>
            }
          </select>
        </label>

        <label>
          Tamanho
          <select name="cardapioTamanho" [(ngModel)]="sizeFilter">
            <option value="todos">Todos</option>
            @for (tamanho of tamanhoOptions; track tamanho.id) {
              <option [value]="tamanho.id">{{ tamanho.label }}</option>
            }
          </select>
        </label>

        <label>
          Status
          <select name="cardapioStatus" [(ngModel)]="statusFilter">
            <option value="todos">Todos</option>
            <option value="ativo">Ativos</option>
            <option value="inativo">Inativos</option>
          </select>
        </label>

        <label>
          Descrição
          <select name="cardapioDescricao" [(ngModel)]="descriptionFilter">
            <option value="todos">Todos</option>
            <option value="com_descricao">Com descrição</option>
            <option value="sem_descricao">Sem descrição</option>
          </select>
        </label>

        <label>
          Ordenar
          <select name="cardapioOrdenacao" [(ngModel)]="sortOption">
            <option value="nome_az">Nome A-Z</option>
            <option value="nome_za">Nome Z-A</option>
            <option value="menor_preco">Menor preço</option>
            <option value="maior_preco">Maior preço</option>
            <option value="mais_recentes">Mais recentes</option>
            <option value="mais_antigos">Mais antigos</option>
            <option value="categoria">Categoria</option>
            <option value="tamanho">Tamanho</option>
          </select>
        </label>

        <label>
          Preço mínimo
          <input type="number" min="0" step="0.01" placeholder="R$ 0,00" [(ngModel)]="minPriceFilter" />
        </label>

        <label>
          Preço máximo
          <input type="number" min="0" step="0.01" placeholder="Sem limite" [(ngModel)]="maxPriceFilter" />
        </label>

        <button class="clear-filters-button" type="button" (click)="clearFilters()">
          Limpar filtros
        </button>
      </section>

      <section class="management-list-card full-management-list">
        <div class="list-card-head">
          <div>
            <h2>Produtos cadastrados</h2>
            <span>{{ filteredProdutos.length }} exibidos · {{ produtos.length }} produtos no cardápio</span>
          </div>
        </div>

        <div class="management-table product-table">
          <div class="management-table-head">
            <span>Produto</span>
            <span>Categoria</span>
            <span>Tamanho</span>
            <span>Preço</span>
            <span>Status</span>
            <span>Ações</span>
          </div>

          @for (produto of filteredProdutos; track produto.id) {
            <div class="management-table-row">
              <div>
                <strong>{{ produto.nome }}</strong>
                <small>{{ produto.descricao || 'Sem descrição' }}</small>
              </div>
              <span>{{ produto.categoria }}</span>
              <span class="product-size-chip">{{ getTamanhoLabel(produto.tamanho) }}</span>
              <span>{{ formatCurrency(produto.preco) }}</span>
              <span class="status-chip" [class.inativa]="!produto.ativo">
                {{ produto.ativo ? 'Ativo' : 'Inativo' }}
              </span>
              <div class="row-actions client-more-actions product-more-actions" (click)="$event.stopPropagation()">
                @if (canWriteCardapio) {
                  <button
                    class="more-actions-button"
                    type="button"
                    [attr.aria-label]="'Abrir ações de ' + produto.nome"
                    [attr.aria-expanded]="openedActionMenuProdutoId === produto.id"
                    (click)="toggleProdutoActions(produto.id, $event)"
                  >
                    ⋮
                  </button>

                  @if (openedActionMenuProdutoId === produto.id) {
                    <div class="row-actions-popup" role="menu">
                      <button type="button" role="menuitem" (click)="handleEditProduto(produto)">
                        Editar
                      </button>
                      <button type="button" role="menuitem" (click)="handleToggleProduto(produto)">
                        {{ produto.ativo ? 'Inativar' : 'Ativar' }}
                      </button>
                      <button class="danger" type="button" role="menuitem" (click)="handleDeleteProduto(produto)">
                        Excluir
                      </button>
                    </div>
                  }
                } @else {
                  <span class="readonly-chip">Somente leitura</span>
                }
              </div>
            </div>
          } @empty {
            <div class="management-empty-state">
              <strong>Nenhum produto encontrado</strong>
              <span>Ajuste a busca ou limpe os filtros para ver outros produtos.</span>
            </div>
          }
        </div>
      </section>

      @if (canWriteCardapio) {
        <button
          class="floating-comanda-button floating-management-button"
          type="button"
          aria-label="Adicionar produto"
          (click)="openCreateModal()"
        >
          <span aria-hidden="true">+</span>
          <span>Adicionar produto</span>
        </button>
      }

      @if (produtoModalOpen) {
        <div class="comanda-modal-overlay" role="presentation">
          <section class="management-modal-card" role="dialog" aria-modal="true" aria-labelledby="produto-modal-title">
            <button class="modal-close-button" type="button" aria-label="Fechar modal de produto" (click)="closeModal()">
              X
            </button>

            <header class="management-modal-header">
              <h2 id="produto-modal-title">{{ editingProdutoId ? 'Editar produto' : 'Adicionar produto' }}</h2>
              <p>{{ editingProdutoId ? 'Atualize as informações do produto selecionado.' : 'Cadastre um novo produto para disponibilizar no cardápio.' }}</p>
            </header>

            <form class="management-form-card modal-management-form" (ngSubmit)="saveProduto()">
              <label>
                Nome do produto
                <input
                  type="text"
                  name="nome"
                  required
                  placeholder="Ex.: X-Burger"
                  [(ngModel)]="form.nome"
                />
              </label>

              <label>
                Descrição
                <textarea
                  name="descricao"
                  rows="4"
                  placeholder="Descrição curta exibida na comanda"
                  [(ngModel)]="form.descricao"
                ></textarea>
              </label>

              <label>
                Categoria
                <select name="categoria" [(ngModel)]="form.categoria">
                  @for (category of categories; track category) {
                    <option [value]="category">{{ category }}</option>
                  }
                </select>
              </label>

              <label>
                Tamanho
                <select name="tamanho" [(ngModel)]="form.tamanho">
                  @for (tamanho of tamanhoOptions; track tamanho.id) {
                    <option [value]="tamanho.id">{{ tamanho.label }}</option>
                  }
                </select>
              </label>

              <label>
                Preço
                <input
                  type="number"
                  name="preco"
                  min="0"
                  step="0.01"
                  required
                  placeholder="Ex.: 24.90"
                  [(ngModel)]="form.preco"
                />
              </label>

              <label class="toggle-field">
                <input type="checkbox" name="ativo" [(ngModel)]="form.ativo" />
                <span>Produto ativo no cardápio</span>
              </label>

              @if (errorMessage) {
                <div class="form-feedback">{{ errorMessage }}</div>
              }

              <div class="form-actions">
                <button class="primary-action-button" type="submit" [disabled]="!canWriteCardapio">
                  {{ editingProdutoId ? 'Salvar alterações' : 'Cadastrar produto' }}
                </button>
                <button class="ghost-button" type="button" (click)="closeModal()">Cancelar</button>
              </div>
            </form>
          </section>
        </div>
      }
    </div>
  `,
})
export class CardapioPageComponent {
  private readonly produtosService = inject(ProdutosService);
  private readonly produtoCategoriasService = inject(ProdutoCategoriasService);
  private readonly authService = inject(AuthService);

  protected get canWriteCardapio(): boolean {
    return this.authService.canWrite('cardapio');
  }

  protected readonly tamanhoOptions = this.produtosService.tamanhos;
  protected produtos = this.produtosService.getProdutos();
  protected search = '';
  protected categoryFilter: ProductCategory | 'todos' = 'todos';
  protected sizeFilter: ProdutoTamanho | 'todos' = 'todos';
  protected statusFilter: ProdutoStatusFilter = 'todos';
  protected descriptionFilter: ProdutoDescriptionFilter = 'todos';
  protected sortOption: ProdutoSortOption = 'nome_az';
  protected minPriceFilter: number | null = null;
  protected maxPriceFilter: number | null = null;
  protected openedActionMenuProdutoId: string | null = null;
  protected editingProdutoId: string | null = null;
  protected produtoModalOpen = false;
  protected errorMessage = '';
  protected successMessage = '';
  protected form: ProdutoFormModel = this.createEmptyForm();

  protected get categories(): ProductCategory[] {
    const categoryTitles = this.produtoCategoriasService.getCategoryTitles();
    const productCategories = this.produtos.map((produto) => produto.categoria);
    return Array.from(new Set([...categoryTitles, ...productCategories])).sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }

  @HostListener('document:click')
  protected closeActionMenus(): void {
    this.openedActionMenuProdutoId = null;
  }

  protected get filteredProdutos(): Produto[] {
    const normalizedSearch = this.normalizeText(this.search);
    const minPrice = this.minPriceFilter ?? null;
    const maxPrice = this.maxPriceFilter ?? null;

    const filtered = this.produtos.filter((produto) => {
      if (this.categoryFilter !== 'todos' && produto.categoria !== this.categoryFilter) {
        return false;
      }

      if (this.sizeFilter !== 'todos' && produto.tamanho !== this.sizeFilter) {
        return false;
      }

      if (this.statusFilter === 'ativo' && !produto.ativo) {
        return false;
      }

      if (this.statusFilter === 'inativo' && produto.ativo) {
        return false;
      }

      const hasDescricao = Boolean(produto.descricao?.trim());
      if (this.descriptionFilter === 'com_descricao' && !hasDescricao) {
        return false;
      }

      if (this.descriptionFilter === 'sem_descricao' && hasDescricao) {
        return false;
      }

      if (minPrice !== null && produto.preco < minPrice) {
        return false;
      }

      if (maxPrice !== null && produto.preco > maxPrice) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      const searchBase = this.normalizeText([produto.nome, produto.descricao, produto.categoria, this.getTamanhoLabel(produto.tamanho)].join(' '));
      return searchBase.includes(normalizedSearch);
    });

    return this.sortProdutos(filtered);
  }

  protected clearFilters(): void {
    this.search = '';
    this.categoryFilter = 'todos';
    this.sizeFilter = 'todos';
    this.statusFilter = 'todos';
    this.descriptionFilter = 'todos';
    this.sortOption = 'nome_az';
    this.minPriceFilter = null;
    this.maxPriceFilter = null;
  }

  protected openCreateModal(): void {
    if (!this.canWriteCardapio) {
      this.errorMessage = 'Você não tem permissão de escrita em Cardápio.';
      return;
    }

    this.openedActionMenuProdutoId = null;
    this.editingProdutoId = null;
    this.form = this.createEmptyForm();
    this.errorMessage = '';
    this.successMessage = '';
    this.produtoModalOpen = true;
  }

  protected closeModal(): void {
    this.openedActionMenuProdutoId = null;
    this.produtoModalOpen = false;
    this.resetForm();
  }

  protected toggleProdutoActions(produtoId: string, event: MouseEvent): void {
    event.stopPropagation();
    this.openedActionMenuProdutoId = this.openedActionMenuProdutoId === produtoId ? null : produtoId;
  }

  protected handleEditProduto(produto: Produto): void {
    this.openedActionMenuProdutoId = null;
    this.editProduto(produto);
  }

  protected handleToggleProduto(produto: Produto): void {
    this.openedActionMenuProdutoId = null;
    this.toggleProdutoStatus(produto);
  }

  protected handleDeleteProduto(produto: Produto): void {
    this.openedActionMenuProdutoId = null;
    this.deleteProduto(produto);
  }

  protected saveProduto(): void {
    if (!this.canWriteCardapio) {
      this.errorMessage = 'Você não tem permissão de escrita em Cardápio.';
      return;
    }

    this.errorMessage = '';
    this.successMessage = '';

    if (!this.form.nome.trim()) {
      this.errorMessage = 'Informe o nome do produto.';
      return;
    }

    if (this.form.preco === null || this.form.preco < 0) {
      this.errorMessage = 'Informe um preço válido.';
      return;
    }

    const payload: ProdutoPayload = {
      nome: this.form.nome.trim(),
      descricao: this.form.descricao.trim(),
      categoria: this.form.categoria,
      tamanho: this.form.tamanho,
      preco: this.form.preco,
      ativo: this.form.ativo,
    };

    if (this.editingProdutoId) {
      this.produtosService.updateProduto(this.editingProdutoId, payload);
      this.successMessage = 'Produto atualizado com sucesso.';
    } else {
      this.produtosService.createProduto(payload);
      this.successMessage = 'Produto cadastrado com sucesso.';
    }

    this.refreshProdutos();
    this.produtoModalOpen = false;
    this.clearFormKeepingFeedback();
  }

  protected editProduto(produto: Produto): void {
    if (!this.canWriteCardapio) {
      this.errorMessage = 'Você não tem permissão para editar produtos.';
      return;
    }

    this.errorMessage = '';
    this.successMessage = '';
    this.editingProdutoId = produto.id;
    this.form = {
      nome: produto.nome,
      descricao: produto.descricao,
      categoria: produto.categoria,
      tamanho: produto.tamanho,
      preco: produto.preco,
      ativo: produto.ativo,
    };
    this.produtoModalOpen = true;
  }

  protected toggleProdutoStatus(produto: Produto): void {
    if (!this.canWriteCardapio) {
      this.errorMessage = 'Você não tem permissão para alterar produtos.';
      return;
    }

    this.produtosService.updateProduto(produto.id, {
      nome: produto.nome,
      descricao: produto.descricao,
      categoria: produto.categoria,
      tamanho: produto.tamanho,
      preco: produto.preco,
      ativo: !produto.ativo,
    });
    this.refreshProdutos();
    this.successMessage = produto.ativo ? 'Produto inativado com sucesso.' : 'Produto ativado com sucesso.';
  }

  protected deleteProduto(produto: Produto): void {
    if (!this.canWriteCardapio) {
      this.errorMessage = 'Você não tem permissão para excluir produtos.';
      return;
    }

    if (this.editingProdutoId === produto.id) {
      this.resetForm();
    }

    this.produtosService.deleteProduto(produto.id);
    this.refreshProdutos();
    this.successMessage = 'Produto excluído com sucesso.';
  }

  protected resetForm(): void {
    this.editingProdutoId = null;
    this.errorMessage = '';
    this.form = this.createEmptyForm();
  }

  protected formatCurrency(value: number): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  }

  protected getTamanhoLabel(tamanho?: ProdutoTamanho): string {
    return this.tamanhoOptions.find((option) => option.id === tamanho)?.label ?? 'Médio';
  }

  private refreshProdutos(): void {
    this.produtos = this.produtosService.getProdutos();
  }

  private clearFormKeepingFeedback(): void {
    this.editingProdutoId = null;
    this.errorMessage = '';
    this.form = this.createEmptyForm();
  }

  private createEmptyForm(): ProdutoFormModel {
    return {
      nome: '',
      descricao: '',
      categoria: this.categories[0] ?? 'Lanches',
      tamanho: 'medio',
      preco: null,
      ativo: true,
    };
  }

  private sortProdutos(produtos: Produto[]): Produto[] {
    const sorted = [...produtos];

    switch (this.sortOption) {
      case 'nome_za':
        return sorted.sort((a, b) => b.nome.localeCompare(a.nome, 'pt-BR'));
      case 'menor_preco':
        return sorted.sort((a, b) => a.preco - b.preco);
      case 'maior_preco':
        return sorted.sort((a, b) => b.preco - a.preco);
      case 'mais_recentes':
        return sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      case 'mais_antigos':
        return sorted.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      case 'categoria':
        return sorted.sort((a, b) =>
          a.categoria.localeCompare(b.categoria, 'pt-BR') || a.nome.localeCompare(b.nome, 'pt-BR'),
        );
      case 'tamanho':
        return sorted.sort(
          (a, b) => this.getTamanhoOrder(a.tamanho) - this.getTamanhoOrder(b.tamanho) || a.nome.localeCompare(b.nome, 'pt-BR'),
        );
      case 'nome_az':
      default:
        return sorted.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
    }
  }

  private getTamanhoOrder(tamanho?: ProdutoTamanho): number {
    return this.tamanhoOptions.find((option) => option.id === tamanho)?.ordem ?? 4;
  }

  private normalizeText(value: string): string {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }
}
