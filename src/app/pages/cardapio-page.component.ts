import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../services/auth.service';
import { ProductCategory, Produto } from '../models/app-data';
import { ProdutoPayload, ProdutosService } from '../services/produtos.service';

interface ProdutoFormModel {
  nome: string;
  descricao: string;
  categoria: ProductCategory;
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
      </section>

      @if (errorMessage && !produtoModalOpen) {
        <div class="form-feedback">{{ errorMessage }}</div>
      }

      @if (successMessage && !produtoModalOpen) {
        <div class="form-feedback success">{{ successMessage }}</div>
      }

      <section class="management-list-card full-management-list">
        <div class="list-card-head">
          <div>
            <h2>Produtos cadastrados</h2>
            <span>{{ produtos.length }} produtos no cardápio</span>
          </div>
        </div>

        <div class="management-table product-table">
          <div class="management-table-head">
            <span>Produto</span>
            <span>Categoria</span>
            <span>Preço</span>
            <span>Status</span>
            <span>Ações</span>
          </div>

          @for (produto of produtos; track produto.id) {
            <div class="management-table-row">
              <div>
                <strong>{{ produto.nome }}</strong>
                <small>{{ produto.descricao || 'Sem descrição' }}</small>
              </div>
              <span>{{ produto.categoria }}</span>
              <span>{{ formatCurrency(produto.preco) }}</span>
              <span class="status-chip" [class.inativa]="!produto.ativo">
                {{ produto.ativo ? 'Ativo' : 'Inativo' }}
              </span>
              <div class="row-actions">
                @if (canWriteCardapio) {
                  <button type="button" (click)="editProduto(produto)">Editar</button>
                  <button class="danger" type="button" (click)="deleteProduto(produto)">Excluir</button>
                } @else {
                  <span class="readonly-chip">Somente leitura</span>
                }
              </div>
            </div>
          } @empty {
            <div class="management-empty-state">
              <strong>Nenhum produto cadastrado</strong>
              <span>Clique em Adicionar produto para montar o cardápio.</span>
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
  private readonly authService = inject(AuthService);

  protected get canWriteCardapio(): boolean {
    return this.authService.canWrite('cardapio');
  }

  protected readonly categories = this.produtosService.categories;
  protected produtos = this.produtosService.getProdutos();
  protected editingProdutoId: string | null = null;
  protected produtoModalOpen = false;
  protected errorMessage = '';
  protected successMessage = '';
  protected form: ProdutoFormModel = this.createEmptyForm();

  protected openCreateModal(): void {
    if (!this.canWriteCardapio) {
      this.errorMessage = 'Você não tem permissão de escrita em Cardápio.';
      return;
    }

    this.editingProdutoId = null;
    this.form = this.createEmptyForm();
    this.errorMessage = '';
    this.successMessage = '';
    this.produtoModalOpen = true;
  }

  protected closeModal(): void {
    this.produtoModalOpen = false;
    this.resetForm();
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
      preco: produto.preco,
      ativo: produto.ativo,
    };
    this.produtoModalOpen = true;
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
      categoria: 'Lanches',
      preco: null,
      ativo: true,
    };
  }
}
