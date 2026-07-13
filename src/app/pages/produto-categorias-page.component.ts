import { Component, HostListener, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../services/auth.service';
import { IconComponent, IconName } from '../components/icon.component';
import { ProdutoCategoria } from '../models/app-data';
import { ProdutoCategoriaPayload, ProdutoCategoriasService } from '../services/produto-categorias.service';

interface CategoriaFormModel {
  titulo: string;
  icone: IconName;
  imagem: string;
}

@Component({
  selector: 'app-produto-categorias-page',
  standalone: true,
  imports: [FormsModule, IconComponent],
  template: `
    <div class="page-stack management-page produto-categorias-page">
      <section class="page-head">
        <div>
          <h1>Categorias de produtos</h1>
          <p>Cadastre os grupos disponíveis no cardápio com ícone e título.</p>
        </div>

        <label class="page-search" aria-label="Buscar categoria de produto">
          <span aria-hidden="true">⌕</span>
          <input
            type="search"
            placeholder="Buscar categoria"
            [(ngModel)]="search"
          />
        </label>
      </section>

      @if (errorMessage && !categoriaModalOpen) {
        <div class="form-feedback">{{ errorMessage }}</div>
      }

      @if (successMessage && !categoriaModalOpen) {
        <div class="form-feedback success">{{ successMessage }}</div>
      }

      <section class="management-list-card full-management-list">
        <div class="list-card-head">
          <div>
            <h2>Categorias cadastradas</h2>
            <span>{{ filteredCategorias.length }} exibidas · {{ categorias.length }} categorias no cardápio</span>
          </div>
        </div>

        <div class="management-table category-management-table">
          <div class="management-table-head">
            <span>Categoria</span>
            <span>Ícone</span>
            <span>Ações</span>
          </div>

          @for (categoria of filteredCategorias; track categoria.id) {
            <div class="management-table-row">
              <div>
                <strong>{{ categoria.titulo }}</strong>
                <small>Disponível para cadastro de produtos</small>
              </div>
              <span class="category-icon-badge">
                @if (categoria.imagem) {
                  <img [src]="categoria.imagem" [alt]="'Imagem da categoria ' + categoria.titulo" width="34" height="34" loading="lazy" />
                } @else {
                  <app-icon [name]="asIconName(categoria.icone)" [size]="18" />
                }
                {{ categoria.imagem ? 'Imagem personalizada' : getIconLabel(categoria.icone) }}
              </span>
              <div class="row-actions client-more-actions" (click)="$event.stopPropagation()">
                @if (canWriteCardapio) {
                  <button
                    class="more-actions-button"
                    type="button"
                    [attr.aria-label]="'Abrir ações de ' + categoria.titulo"
                    [attr.aria-expanded]="openedActionMenuCategoriaId === categoria.id"
                    (click)="toggleCategoriaActions(categoria.id, $event)"
                  >
                    ⋮
                  </button>

                  @if (openedActionMenuCategoriaId === categoria.id) {
                    <div class="row-actions-popup" role="menu">
                      <button type="button" role="menuitem" (click)="handleEditCategoria(categoria)">
                        Editar
                      </button>
                      <button class="danger" type="button" role="menuitem" (click)="handleDeleteCategoria(categoria)">
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
              <strong>Nenhuma categoria encontrada</strong>
              <span>Ajuste a busca ou cadastre uma nova categoria.</span>
            </div>
          }
        </div>
      </section>

      @if (canWriteCardapio) {
        <button
          class="floating-comanda-button floating-management-button"
          type="button"
          aria-label="Adicionar categoria"
          (click)="openCreateModal()"
        >
          <span aria-hidden="true">+</span>
          <span>Adicionar categoria</span>
        </button>
      }

      @if (categoriaModalOpen) {
        <div class="comanda-modal-overlay" role="presentation">
          <section class="management-modal-card" role="dialog" aria-modal="true" aria-labelledby="categoria-modal-title">
            <button class="modal-close-button" type="button" aria-label="Fechar modal de categoria" (click)="closeModal()">
              X
            </button>

            <header class="management-modal-header">
              <h2 id="categoria-modal-title">{{ editingCategoriaId ? 'Editar categoria' : 'Adicionar categoria' }}</h2>
              <p>{{ editingCategoriaId ? 'Atualize o título e ícone da categoria.' : 'Crie uma categoria para organizar os produtos do cardápio.' }}</p>
            </header>

            <form class="management-form-card modal-management-form" (ngSubmit)="saveCategoria()">
              <label>
                Título da categoria
                <input
                  type="text"
                  name="titulo"
                  required
                  placeholder="Ex.: Pizzas"
                  [(ngModel)]="form.titulo"
                />
              </label>

              <label>
                Ícone de fallback
                <select name="icone" required [(ngModel)]="form.icone">
                  @for (icon of iconOptions; track icon.id) {
                    <option [value]="icon.id">{{ icon.label }}</option>
                  }
                </select>
              </label>

              <label>
                Imagem da categoria
                <select name="imagem" [(ngModel)]="form.imagem">
                  <option value="">Usar apenas ícone</option>
                  @for (image of imageOptions; track image.path) {
                    <option [value]="image.path">{{ image.label }}</option>
                  }
                </select>
              </label>

              <div class="category-icon-preview" aria-label="Prévia do ícone selecionado">
                <span>
                  @if (form.imagem) {
                    <img [src]="form.imagem" alt="" width="42" height="42" />
                  } @else {
                    <app-icon [name]="form.icone" [size]="22" />
                  }
                </span>
                <strong>{{ form.titulo || 'Nova categoria' }}</strong>
              </div>

              @if (errorMessage) {
                <div class="form-feedback">{{ errorMessage }}</div>
              }

              <div class="form-actions">
                <button class="primary-action-button" type="submit" [disabled]="!canWriteCardapio">
                  {{ editingCategoriaId ? 'Salvar alterações' : 'Cadastrar categoria' }}
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
export class ProdutoCategoriasPageComponent {
  private readonly categoriasService = inject(ProdutoCategoriasService);
  private readonly authService = inject(AuthService);

  protected readonly iconOptions: Array<{ id: IconName; label: string }> = [
    { id: 'cards', label: 'Cardápio' },
    { id: 'receipt', label: 'Comanda' },
    { id: 'table', label: 'Mesa' },
    { id: 'bell', label: 'Atendimento' },
    { id: 'register', label: 'Caixa' },
    { id: 'dollar', label: 'Preço' },
    { id: 'file', label: 'Arquivo' },
    { id: 'shield', label: 'Especial' },
    { id: 'check', label: 'Confirmado' },
    { id: 'menu', label: 'Lista' },
  ];
  protected readonly imageOptions = [
    { label: 'Bebidas', path: 'assets/category-icons/bebidas.webp' },
    { label: 'Sinuca', path: 'assets/category-icons/sinuca.webp' },
    { label: 'Petiscos', path: 'assets/category-icons/petiscos.webp' },
    { label: 'Lanches', path: 'assets/category-icons/lanches.webp' },
    { label: 'Drinks', path: 'assets/category-icons/drinks.webp' },
    { label: 'Cervejas', path: 'assets/category-icons/cervejas.webp' },
    { label: 'Chopp', path: 'assets/category-icons/chopp.webp' },
    { label: 'Extras', path: 'assets/category-icons/extras.webp' },
    { label: 'Destilados', path: 'assets/category-icons/destilados.webp' },
    { label: 'Porções', path: 'assets/category-icons/porcoes.webp' },
    { label: 'Sobremesas', path: 'assets/category-icons/sobremesas.webp' },
  ];

  protected search = '';
  protected openedActionMenuCategoriaId: string | null = null;
  protected editingCategoriaId: string | null = null;
  protected categoriaModalOpen = false;
  protected errorMessage = '';
  protected successMessage = '';
  protected form: CategoriaFormModel = this.createEmptyForm();

  protected get canWriteCardapio(): boolean {
    return this.authService.canWrite('cardapio');
  }

  protected get categorias(): ProdutoCategoria[] {
    return this.categoriasService.getCategorias();
  }

  protected get filteredCategorias(): ProdutoCategoria[] {
    const normalizedSearch = this.normalizeText(this.search);

    if (!normalizedSearch) {
      return this.categorias;
    }

    return this.categorias.filter((categoria) => this.normalizeText(categoria.titulo).includes(normalizedSearch));
  }

  @HostListener('document:click')
  protected closeActionMenus(): void {
    this.openedActionMenuCategoriaId = null;
  }

  protected openCreateModal(): void {
    if (!this.canWriteCardapio) {
      this.errorMessage = 'Você não tem permissão de escrita em Cardápio.';
      return;
    }

    this.openedActionMenuCategoriaId = null;
    this.editingCategoriaId = null;
    this.form = this.createEmptyForm();
    this.errorMessage = '';
    this.successMessage = '';
    this.categoriaModalOpen = true;
  }

  protected closeModal(): void {
    this.openedActionMenuCategoriaId = null;
    this.categoriaModalOpen = false;
    this.resetForm();
  }

  protected toggleCategoriaActions(categoriaId: string, event: MouseEvent): void {
    event.stopPropagation();
    this.openedActionMenuCategoriaId = this.openedActionMenuCategoriaId === categoriaId ? null : categoriaId;
  }

  protected handleEditCategoria(categoria: ProdutoCategoria): void {
    this.openedActionMenuCategoriaId = null;
    this.editCategoria(categoria);
  }

  protected handleDeleteCategoria(categoria: ProdutoCategoria): void {
    this.openedActionMenuCategoriaId = null;
    this.deleteCategoria(categoria);
  }

  protected saveCategoria(): void {
    if (!this.canWriteCardapio) {
      this.errorMessage = 'Você não tem permissão de escrita em Cardápio.';
      return;
    }

    this.errorMessage = '';
    this.successMessage = '';

    const titulo = this.form.titulo.trim();

    if (!titulo) {
      this.errorMessage = 'Informe o título da categoria.';
      return;
    }

    const duplicatedCategory = this.categorias.find(
      (categoria) => categoria.id !== this.editingCategoriaId && this.normalizeText(categoria.titulo) === this.normalizeText(titulo),
    );

    if (duplicatedCategory) {
      this.errorMessage = 'Já existe uma categoria com esse título.';
      return;
    }

    const payload: ProdutoCategoriaPayload = {
      titulo,
      icone: this.form.icone,
      imagem: this.form.imagem,
    };

    if (this.editingCategoriaId) {
      this.categoriasService.updateCategoria(this.editingCategoriaId, payload);
      this.successMessage = 'Categoria atualizada com sucesso.';
    } else {
      this.categoriasService.createCategoria(payload);
      this.successMessage = 'Categoria cadastrada com sucesso.';
    }

    this.categoriaModalOpen = false;
    this.clearFormKeepingFeedback();
  }

  protected editCategoria(categoria: ProdutoCategoria): void {
    if (!this.canWriteCardapio) {
      this.errorMessage = 'Você não tem permissão para editar categorias.';
      return;
    }

    this.errorMessage = '';
    this.successMessage = '';
    this.editingCategoriaId = categoria.id;
    this.form = {
      titulo: categoria.titulo,
      icone: this.asIconName(categoria.icone),
      imagem: categoria.imagem ?? '',
    };
    this.categoriaModalOpen = true;
  }

  protected deleteCategoria(categoria: ProdutoCategoria): void {
    if (!this.canWriteCardapio) {
      this.errorMessage = 'Você não tem permissão para excluir categorias.';
      return;
    }

    if (!window.confirm(`Excluir a categoria "${categoria.titulo}"? Produtos existentes continuarão com esse nome de categoria.`)) {
      return;
    }

    if (this.editingCategoriaId === categoria.id) {
      this.resetForm();
    }

    this.categoriasService.deleteCategoria(categoria.id);
    this.successMessage = 'Categoria excluída com sucesso.';
  }

  protected asIconName(icon: string): IconName {
    return this.iconOptions.find((option) => option.id === icon)?.id ?? 'cards';
  }

  protected getIconLabel(icon: string): string {
    return this.iconOptions.find((option) => option.id === icon)?.label ?? 'Cardápio';
  }

  private resetForm(): void {
    this.editingCategoriaId = null;
    this.errorMessage = '';
    this.form = this.createEmptyForm();
  }

  private clearFormKeepingFeedback(): void {
    this.editingCategoriaId = null;
    this.errorMessage = '';
    this.form = this.createEmptyForm();
  }

  private createEmptyForm(): CategoriaFormModel {
    return {
      titulo: '',
      icone: 'cards',
      imagem: '',
    };
  }

  private normalizeText(value: string): string {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }
}
