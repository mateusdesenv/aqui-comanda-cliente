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
    <div class="page-stack management-page">
      <section class="page-head">
        <div>
          <h1>Cardápio</h1>
          <p>Cadastre produtos e mantenha o cardápio disponível para as comandas.</p>
        </div>
      </section>

      <section class="management-grid">
        <form class="management-form-card" (ngSubmit)="saveProduto()">
          <div class="form-card-head">
            <h2>{{ editingProdutoId ? 'Editar produto' : 'Novo produto' }}</h2>
            @if (editingProdutoId) {
              <button class="ghost-button" type="button" (click)="resetForm()">Cancelar edição</button>
            }
          </div>

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

          <button class="primary-action-button" type="submit" [disabled]="!canWriteCardapio">
            {{ editingProdutoId ? 'Salvar alterações' : 'Cadastrar produto' }}
          </button>
        </form>

        <section class="management-list-card">
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
                <span>Use o formulário ao lado para montar o cardápio.</span>
              </div>
            }
          </div>
        </section>
      </section>
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
  protected errorMessage = '';
  protected form: ProdutoFormModel = this.createEmptyForm();

  protected saveProduto(): void {
    if (!this.canWriteCardapio) {
      this.errorMessage = 'Você não tem permissão de escrita em Cardápio.';
      return;
    }

    this.errorMessage = '';

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
    } else {
      this.produtosService.createProduto(payload);
    }

    this.refreshProdutos();
    this.resetForm();
  }

  protected editProduto(produto: Produto): void {
    if (!this.canWriteCardapio) {
      this.errorMessage = 'Você não tem permissão para editar produtos.';
      return;
    }

    this.errorMessage = '';
    this.editingProdutoId = produto.id;
    this.form = {
      nome: produto.nome,
      descricao: produto.descricao,
      categoria: produto.categoria,
      preco: produto.preco,
      ativo: produto.ativo,
    };
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
