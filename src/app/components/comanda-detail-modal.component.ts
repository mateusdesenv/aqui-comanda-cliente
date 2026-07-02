import { Component, EventEmitter, Input, OnChanges, Output, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Comanda, ItemComanda, Mesa, ProductCategory, Produto } from '../models/app-data';
import { ComandasService } from '../services/comandas.service';
import { ProdutosService } from '../services/produtos.service';

type CategoryTab = ProductCategory | 'Todos';

@Component({
  selector: 'app-comanda-detail-modal',
  standalone: true,
  imports: [FormsModule, RouterLink],
  template: `
    <div class="comanda-modal-overlay" role="presentation">
      <section
        class="comanda-modal"
        role="dialog"
        aria-modal="true"
        [attr.aria-labelledby]="'comanda-modal-title-' + mesa.id"
      >
        <button
          class="modal-close-button"
          type="button"
          aria-label="Fechar detalhe da mesa"
          (click)="close.emit()"
        >
          X
        </button>

        <header class="comanda-modal-header">
          <button class="modal-back-button" type="button" (click)="close.emit()">
            ← Voltar ao mapa de comandas
          </button>

          <div class="modal-title-row">
            <h2 [id]="'comanda-modal-title-' + mesa.id">
              Mesa {{ displayMesaNumber }} — {{ statusLabel }}
            </h2>
            <span
              class="modal-status-badge"
              [class.free]="!hasOpenComandas"
              [class.reserved]="!hasOpenComandas && mesa.status === 'reservada'"
            >
              {{ statusBadge }}
            </span>
          </div>

          <p>
            Uma mesa pode ter várias comandas abertas. Os itens só podem ser lançados dentro de uma comanda existente.
          </p>
        </header>

        @if (mesaComandas.length === 0) {
          <section class="mesa-empty-state" aria-label="Mesa sem comandas abertas">
            <div>
              <strong>Nenhuma comanda aberta nesta mesa</strong>
              <span>Para lançar itens, crie uma comanda e associe diretamente à Mesa {{ displayMesaNumber }}.</span>
            </div>
            <button class="modal-primary-action" type="button" (click)="createForMesa.emit(mesa)">
              Criar comanda para esta mesa
            </button>
          </section>
        } @else {
          <div class="mesa-comanda-selector">
            <label>
              Comanda ativa da mesa
              <select name="mesaComanda" [(ngModel)]="selectedComandaId" (ngModelChange)="syncSelectedComandaItems()">
                @for (comanda of mesaComandas; track comanda.id) {
                  <option [value]="comanda.id">
                    {{ getComandaLabel(comanda) }} — {{ formatCurrency(comanda.total) }}
                  </option>
                }
              </select>
            </label>

            <div class="quick-helper-box">
              <strong>{{ mesaComandas.length }} comanda{{ mesaComandas.length === 1 ? '' : 's' }} na mesa</strong>
              <span>Total da mesa: {{ formatCurrency(totalMesa) }}</span>
            </div>
          </div>

          <div class="comanda-detail-grid">
            <section class="detail-panel menu-panel" aria-label="Cardápio">
              <div class="detail-panel-header">
                <h3>Cardápio</h3>
              </div>

              @if (activeProducts.length > 0) {
                <div class="category-tabs" role="tablist" aria-label="Categorias do cardápio">
                  @for (category of categories; track category) {
                    <button
                      class="category-tab"
                      [class.active]="activeCategory === category"
                      type="button"
                      role="tab"
                      [attr.aria-selected]="activeCategory === category"
                      (click)="setActiveCategory(category)"
                    >
                      {{ category }}
                    </button>
                  }
                </div>

                <div class="product-grid">
                  @for (produto of filteredProducts; track produto.id) {
                    <article class="product-card">
                      <div>
                        <strong>{{ produto.nome }}</strong>
                        <p>{{ produto.descricao }}</p>
                      </div>

                      <span class="product-price">{{ formatCurrency(produto.preco) }}</span>

                      <div class="product-actions">
                        <div class="quantity-control" [attr.aria-label]="'Quantidade de ' + produto.nome">
                          <button
                            type="button"
                            aria-label="Diminuir quantidade"
                            [disabled]="getQuantity(produto) === 0"
                            (click)="decrementQuantity(produto)"
                          >
                            -
                          </button>
                          <span>{{ getQuantity(produto) }}</span>
                          <button
                            type="button"
                            aria-label="Aumentar quantidade"
                            (click)="incrementQuantity(produto)"
                          >
                            +
                          </button>
                        </div>

                        <button class="add-product-button" type="button" (click)="addItem(produto)">
                          Adicionar
                        </button>
                      </div>
                    </article>
                  }
                </div>
              } @else {
                <div class="empty-menu-category">
                  <strong>Nenhum produto ativo cadastrado</strong>
                  <span>Cadastre ou ative produtos para lançá-los nas comandas.</span>
                  <a routerLink="/cardapio" (click)="close.emit()">Cadastrar produto</a>
                </div>
              }
            </section>

            <section class="detail-panel order-panel" aria-label="Itens lançados">
              <div class="detail-panel-header order-header">
                <h3>Itens da comanda</h3>
                <button class="clear-order-button" type="button" (click)="clearComanda()">
                  Limpar comanda
                </button>
              </div>

              <div class="order-context-card">
                <span>Comanda selecionada</span>
                <strong>{{ getComandaLabel(selectedComanda) }}</strong>
              </div>

              <div class="order-table" role="table" aria-label="Itens lançados na comanda">
                <div class="order-table-head" role="row">
                  <span role="columnheader">Item</span>
                  <span role="columnheader">Qtd.</span>
                  <span role="columnheader">Valor unit.</span>
                  <span role="columnheader">Subtotal</span>
                  <span role="columnheader">Ação</span>
                </div>

                <div class="order-table-body">
                  @for (item of items; track item.id) {
                    <div class="order-item-row" role="row">
                      <strong role="cell">{{ item.nome }}</strong>
                      <div role="cell" class="inline-quantity-control" [attr.aria-label]="'Quantidade de ' + item.nome">
                        <button type="button" aria-label="Diminuir item" (click)="changeItemQuantity(item, item.quantidade - 1)">-</button>
                        <span>{{ item.quantidade }}</span>
                        <button type="button" aria-label="Aumentar item" (click)="changeItemQuantity(item, item.quantidade + 1)">+</button>
                      </div>
                      <span role="cell">{{ formatCurrency(item.precoUnitario) }}</span>
                      <span role="cell">{{ formatCurrency(item.subtotal) }}</span>
                      <button type="button" (click)="removeItem(item)">Remover</button>
                    </div>
                  } @empty {
                    <div class="empty-order-state">
                      <strong>Nenhum item lançado</strong>
                      <span>Escolha produtos do cardápio para adicionar à comanda selecionada.</span>
                    </div>
                  }
                </div>
              </div>

              <footer class="order-total-panel">
                <span>TOTAL DA COMANDA</span>
                <strong>{{ formatCurrency(getTotal()) }}</strong>
              </footer>
            </section>
          </div>
        }
      </section>
    </div>
  `,
})
export class ComandaDetailModalComponent implements OnChanges {
  @Input({ required: true }) mesa!: Mesa;
  @Output() close = new EventEmitter<void>();
  @Output() createForMesa = new EventEmitter<Mesa>();

  private readonly comandasService = inject(ComandasService);
  private readonly produtosService = inject(ProdutosService);

  protected activeCategory: CategoryTab = 'Todos';
  protected selectedComandaId = '';
  protected items: ItemComanda[] = [];
  protected productQuantities: Record<string, number> = {};

  ngOnChanges(): void {
    this.syncSelectedComandaItems();

    this.productQuantities = this.activeProducts.reduce<Record<string, number>>((quantities, produto) => {
      quantities[produto.id] = this.productQuantities[produto.id] ?? 1;
      return quantities;
    }, {});

    if (!this.categories.includes(this.activeCategory)) {
      this.activeCategory = 'Todos';
    }
  }

  protected get mesaComandas(): Comanda[] {
    return this.comandasService.getOpenComandasForMesa(this.mesa.id);
  }

  protected get selectedComanda(): Comanda | null {
    return this.mesaComandas.find((comanda) => comanda.id === this.selectedComandaId) ?? null;
  }

  protected get totalMesa(): number {
    return this.mesaComandas.reduce((total, comanda) => total + comanda.total, 0);
  }

  protected get activeProducts(): Produto[] {
    return this.produtosService.produtosAtivos();
  }

  protected get categories(): CategoryTab[] {
    const categorySet = new Set<ProductCategory>(
      this.activeProducts.map((produto) => produto.categoria),
    );

    return ['Todos', ...Array.from(categorySet)];
  }

  protected get filteredProducts(): Produto[] {
    if (this.activeCategory === 'Todos') {
      return this.activeProducts;
    }

    return this.activeProducts.filter((produto) => produto.categoria === this.activeCategory);
  }

  protected get displayMesaNumber(): string {
    return String(this.mesa.numero).padStart(2, '0');
  }

  protected get hasOpenComandas(): boolean {
    return this.mesaComandas.length > 0;
  }

  protected get statusLabel(): string {
    if (this.hasOpenComandas) {
      return 'Ocupada';
    }

    return this.mesa.status === 'reservada' ? 'Reservada' : 'Livre';
  }

  protected get statusBadge(): string {
    return this.statusLabel.toUpperCase();
  }

  protected setActiveCategory(category: CategoryTab): void {
    this.activeCategory = category;
  }

  protected getQuantity(produto: Produto): number {
    return this.productQuantities[produto.id] ?? 1;
  }

  protected incrementQuantity(produto: Produto): void {
    this.productQuantities = {
      ...this.productQuantities,
      [produto.id]: this.getQuantity(produto) + 1,
    };
  }

  protected decrementQuantity(produto: Produto): void {
    this.productQuantities = {
      ...this.productQuantities,
      [produto.id]: Math.max(this.getQuantity(produto) - 1, 0),
    };
  }

  protected addItem(produto: Produto): void {
    if (!this.selectedComandaId) {
      return;
    }

    const quantidade = Math.max(this.getQuantity(produto), 1);
    const existingItem = this.items.find((item) => item.productId === produto.id);

    if (existingItem) {
      this.changeItemQuantity(existingItem, existingItem.quantidade + quantidade);
      return;
    }

    this.items = [
      ...this.items,
      {
        id: `${produto.id}-${Date.now()}`,
        productId: produto.id,
        nome: produto.nome,
        quantidade,
        precoUnitario: produto.preco,
        subtotal: quantidade * produto.preco,
      },
    ];
    this.persistItems();
  }

  protected changeItemQuantity(itemToChange: ItemComanda, nextQuantity: number): void {
    if (nextQuantity <= 0) {
      this.removeItem(itemToChange);
      return;
    }

    this.items = this.items.map((item) =>
      item.id === itemToChange.id
        ? {
            ...item,
            quantidade: nextQuantity,
            subtotal: nextQuantity * item.precoUnitario,
          }
        : item,
    );
    this.persistItems();
  }

  protected removeItem(itemToRemove: ItemComanda): void {
    this.items = this.items.filter((item) => item.id !== itemToRemove.id);
    this.persistItems();
  }

  protected clearComanda(): void {
    this.items = [];
    this.persistItems();
    this.syncSelectedComandaItems();
  }

  protected syncSelectedComandaItems(): void {
    const currentSelection = this.selectedComanda;
    const selected = currentSelection ?? this.mesaComandas[0] ?? null;
    this.selectedComandaId = selected?.id ?? '';
    this.items = selected ? selected.itens.map((item) => ({ ...item })) : [];
  }

  protected getComandaLabel(comanda: Comanda | null): string {
    if (!comanda) {
      return 'Nenhuma comanda selecionada';
    }

    if (comanda.clienteNome) {
      return comanda.clienteNome;
    }

    return `Comanda ${this.mesaComandas.findIndex((item) => item.id === comanda.id) + 1}`;
  }

  protected getTotal(): number {
    return this.items.reduce((total, item) => total + item.subtotal, 0);
  }

  protected formatCurrency(valor: number): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(valor);
  }

  private persistItems(): void {
    if (!this.selectedComandaId) {
      return;
    }

    const currentId = this.selectedComandaId;
    this.comandasService.saveItemsForComanda(currentId, this.items);

    if (!this.comandasService.getOpenComandasForMesa(this.mesa.id).some((comanda) => comanda.id === currentId)) {
      this.selectedComandaId = '';
    }
  }
}
