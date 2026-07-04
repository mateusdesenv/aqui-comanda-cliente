import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Produto, StockEntry } from '../models/app-data';
import { AuthService } from '../services/auth.service';
import { ProdutosService } from '../services/produtos.service';
import { StockEntriesService, StockEntryPayload } from '../services/stock-entries.service';

interface StockEntryFormItem {
  productId: string;
  quantity: number | null;
  unitCost: number | null;
}

interface StockEntryForm {
  date: string;
  supplierName: string;
  notes: string;
  items: StockEntryFormItem[];
}

@Component({
  selector: 'app-stock-entries-page',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="page-stack management-page stock-entries-page">
      <section class="page-head">
        <div>
          <h1>Entrada de Estoque</h1>
          <p>Registre compras de produtos já cadastrados e mantenha custo médio e estoque atualizados.</p>
        </div>

        @if (canWriteStock) {
          <button class="primary-action-button page-head-action" type="button" (click)="openCreateModal()">
            Nova entrada
          </button>
        }
      </section>

      @if (errorMessage && !entryModalOpen) {
        <div class="form-feedback">{{ errorMessage }}</div>
      }

      @if (successMessage && !entryModalOpen) {
        <div class="form-feedback success">{{ successMessage }}</div>
      }

      <section class="management-list-card full-management-list">
        <div class="list-card-head">
          <div>
            <h2>Histórico de entradas</h2>
            <span>{{ entries.length }} entrada{{ entries.length === 1 ? '' : 's' }} registrada{{ entries.length === 1 ? '' : 's' }}</span>
          </div>
        </div>

        <div class="management-table stock-entry-table">
          <div class="management-table-head">
            <span>Data</span>
            <span>Itens</span>
            <span>Valor total</span>
            <span>Observação</span>
            <span>Ações</span>
          </div>

          @for (entry of entries; track entry.id) {
            <div class="management-table-row">
              <strong>{{ formatDate(entry.date) }}</strong>
              <span>{{ entry.items.length }} item{{ entry.items.length === 1 ? '' : 's' }}</span>
              <span>{{ formatCurrency(entry.totalCost) }}</span>
              <span>{{ entry.notes || '-' }}</span>
              <div class="row-actions">
                <button type="button" (click)="openDetails(entry)">Visualizar detalhes</button>
              </div>
            </div>
          } @empty {
            <div class="management-empty-state">
              <strong>Nenhuma entrada registrada</strong>
              <span>Use o botão Nova entrada para lançar a primeira compra de mercadorias.</span>
            </div>
          }
        </div>
      </section>

      @if (entryModalOpen) {
        <div class="comanda-modal-overlay" role="presentation">
          <section class="management-modal-card stock-entry-modal" role="dialog" aria-modal="true" aria-labelledby="stock-entry-modal-title">
            <button class="modal-close-button" type="button" aria-label="Fechar entrada de estoque" (click)="closeCreateModal()">
              X
            </button>

            <header class="management-modal-header">
              <h2 id="stock-entry-modal-title">Nova entrada de estoque</h2>
              <p>Selecione produtos cadastrados, informe quantidades compradas e custos unitários.</p>
            </header>

            <form class="management-form-card modal-management-form stock-entry-form" (ngSubmit)="saveEntry()">
              <div class="stock-entry-header-grid">
                <label>
                  Data da entrada
                  <input type="date" name="date" required [(ngModel)]="form.date" />
                </label>

                <label>
                  Fornecedor
                  <input type="text" name="supplierName" placeholder="Opcional" [(ngModel)]="form.supplierName" />
                </label>

                <label class="span-2">
                  Observação
                  <textarea name="notes" rows="3" placeholder="Opcional" [(ngModel)]="form.notes"></textarea>
                </label>
              </div>

              <section class="stock-entry-items" aria-label="Itens da entrada">
                <div class="stock-entry-items-head">
                  <div>
                    <h3>Itens da entrada</h3>
                    <span>Total calculado: {{ formatCurrency(formTotal) }}</span>
                  </div>
                  <button class="ghost-button" type="button" (click)="addItem()">Adicionar item</button>
                </div>

                <div class="stock-entry-item-list">
                  @for (item of form.items; track $index; let index = $index) {
                    <div class="stock-entry-item-row">
                      <label>
                        Produto cadastrado
                        <select
                          [name]="'productId-' + index"
                          required
                          [(ngModel)]="item.productId"
                          (ngModelChange)="handleProductChange(index)"
                        >
                          <option value="">Selecione</option>
                          @for (produto of produtos; track produto.id) {
                            <option [value]="produto.id" [disabled]="isProductSelectedInAnotherItem(produto.id, index)">
                              {{ produto.nome }} · {{ produto.categoria }}
                            </option>
                          }
                        </select>
                      </label>

                      <label>
                        Quantidade
                        <input
                          type="number"
                          min="0.01"
                          step="0.01"
                          [name]="'quantity-' + index"
                          required
                          [(ngModel)]="item.quantity"
                        />
                      </label>

                      <label>
                        Custo unitário
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          [name]="'unitCost-' + index"
                          required
                          [(ngModel)]="item.unitCost"
                        />
                      </label>

                      <div class="stock-entry-item-total">
                        <span>Total do item</span>
                        <strong>{{ formatCurrency(getItemTotal(item)) }}</strong>
                      </div>

                      <button
                        class="clear-order-button"
                        type="button"
                        [disabled]="form.items.length === 1"
                        (click)="removeItem(index)"
                      >
                        Remover
                      </button>
                    </div>
                  }
                </div>
              </section>

              @if (errorMessage) {
                <div class="form-feedback">{{ errorMessage }}</div>
              }

              <div class="form-actions">
                <button class="primary-action-button" type="submit" [disabled]="!canWriteStock">
                  Salvar entrada
                </button>
                <button class="ghost-button" type="button" (click)="closeCreateModal()">Cancelar</button>
              </div>
            </form>
          </section>
        </div>
      }

      @if (detailsEntry; as entry) {
        <div class="comanda-modal-overlay" role="presentation">
          <section class="management-modal-card stock-entry-modal" role="dialog" aria-modal="true" aria-labelledby="stock-entry-details-title">
            <button class="modal-close-button" type="button" aria-label="Fechar detalhes da entrada" (click)="closeDetails()">
              X
            </button>

            <header class="management-modal-header">
              <h2 id="stock-entry-details-title">Detalhes da entrada</h2>
              <p>{{ formatDate(entry.date) }} · {{ entry.items.length }} item{{ entry.items.length === 1 ? '' : 's' }} · {{ formatCurrency(entry.totalCost) }}</p>
            </header>

            <div class="stock-entry-details">
              <div class="confirmation-summary">
                <span>Fornecedor</span>
                <strong>{{ entry.supplierName || '-' }}</strong>
                <span>Observação</span>
                <strong>{{ entry.notes || '-' }}</strong>
                <span>Registrada em</span>
                <strong>{{ formatDateTime(entry.createdAt) }}</strong>
              </div>

              <div class="management-table stock-entry-detail-table">
                <div class="management-table-head">
                  <span>Produto</span>
                  <span>Qtd.</span>
                  <span>Custo unit.</span>
                  <span>Total</span>
                </div>

                @for (item of entry.items; track item.productId) {
                  <div class="management-table-row">
                    <strong>{{ item.productName }}</strong>
                    <span>{{ formatQuantity(item.quantity) }}</span>
                    <span>{{ formatCurrency(item.unitCost) }}</span>
                    <span>{{ formatCurrency(item.totalCost) }}</span>
                  </div>
                }
              </div>

              <div class="stock-entry-details-total">
                <span>Total da entrada</span>
                <strong>{{ formatCurrency(entry.totalCost) }}</strong>
              </div>
            </div>
          </section>
        </div>
      }
    </div>
  `,
})
export class StockEntriesPageComponent {
  private readonly stockEntriesService = inject(StockEntriesService);
  private readonly produtosService = inject(ProdutosService);
  private readonly authService = inject(AuthService);

  protected entries = this.stockEntriesService.getStockEntries();
  protected produtos = this.produtosService.getProdutos();
  protected entryModalOpen = false;
  protected detailsEntry: StockEntry | null = null;
  protected errorMessage = '';
  protected successMessage = '';
  protected form: StockEntryForm = this.createEmptyForm();

  protected get canWriteStock(): boolean {
    return this.authService.canWrite('estoque');
  }

  protected get formTotal(): number {
    return this.form.items.reduce((total, item) => total + this.getItemTotal(item), 0);
  }

  protected openCreateModal(): void {
    if (!this.canWriteStock) {
      this.errorMessage = 'Você não tem permissão de escrita em Entrada de Estoque.';
      return;
    }

    this.errorMessage = '';
    this.successMessage = '';
    this.produtos = this.produtosService.getProdutos();
    this.form = this.createEmptyForm();
    this.entryModalOpen = true;
  }

  protected closeCreateModal(): void {
    this.entryModalOpen = false;
    this.errorMessage = '';
    this.form = this.createEmptyForm();
  }

  protected openDetails(entry: StockEntry): void {
    this.detailsEntry = entry;
  }

  protected closeDetails(): void {
    this.detailsEntry = null;
  }

  protected addItem(): void {
    this.form.items = [...this.form.items, this.createEmptyItem()];
  }

  protected removeItem(index: number): void {
    if (this.form.items.length === 1) {
      return;
    }

    this.form.items = this.form.items.filter((_, itemIndex) => itemIndex !== index);
  }

  protected handleProductChange(index: number): void {
    const selectedProductId = this.form.items[index]?.productId;

    if (!selectedProductId) {
      return;
    }

    const duplicated = this.form.items.some(
      (item, itemIndex) => itemIndex !== index && item.productId === selectedProductId,
    );

    if (duplicated) {
      this.form.items[index].productId = '';
      this.errorMessage = 'Não é permitido lançar o mesmo produto duas vezes na mesma entrada.';
    } else {
      this.errorMessage = '';
    }
  }

  protected isProductSelectedInAnotherItem(productId: string, currentIndex: number): boolean {
    return this.form.items.some((item, index) => index !== currentIndex && item.productId === productId);
  }

  protected saveEntry(): void {
    if (!this.canWriteStock) {
      this.errorMessage = 'Você não tem permissão de escrita em Entrada de Estoque.';
      return;
    }

    this.errorMessage = '';
    this.successMessage = '';

    try {
      const payload: StockEntryPayload = {
        date: this.form.date,
        supplierName: this.form.supplierName,
        notes: this.form.notes,
        items: this.form.items.map((item) => ({
          productId: item.productId,
          quantity: Number(item.quantity),
          unitCost: Number(item.unitCost),
        })),
      };

      this.stockEntriesService.createStockEntry(payload);
      this.entries = this.stockEntriesService.getStockEntries();
      this.produtos = this.produtosService.getProdutos();
      this.entryModalOpen = false;
      this.form = this.createEmptyForm();
      this.successMessage = 'Entrada de estoque registrada com sucesso.';
    } catch (error) {
      this.errorMessage = error instanceof Error ? error.message : 'Não foi possível registrar a entrada.';
    }
  }

  protected getItemTotal(item: StockEntryFormItem): number {
    const quantity = Number(item.quantity) || 0;
    const unitCost = Number(item.unitCost) || 0;
    return quantity * unitCost;
  }

  protected formatCurrency(value: number): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  }

  protected formatDate(value: string): string {
    return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' }).format(new Date(`${value}T00:00:00`));
  }

  protected formatDateTime(value: string): string {
    return new Intl.DateTimeFormat('pt-BR', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(new Date(value));
  }

  protected formatQuantity(value: number): string {
    return new Intl.NumberFormat('pt-BR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 3,
    }).format(value);
  }

  private createEmptyForm(): StockEntryForm {
    return {
      date: new Date().toISOString().slice(0, 10),
      supplierName: '',
      notes: '',
      items: [this.createEmptyItem()],
    };
  }

  private createEmptyItem(): StockEntryFormItem {
    return {
      productId: '',
      quantity: 1,
      unitCost: 0,
    };
  }
}
