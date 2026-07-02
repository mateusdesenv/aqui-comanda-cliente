import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Cliente, Comanda, ItemComanda, Mesa, ProductCategory, Produto } from '../models/app-data';
import { ClientesService } from '../services/clientes.service';
import { ComandasService } from '../services/comandas.service';
import { MesasService } from '../services/mesas.service';
import { ProdutosService } from '../services/produtos.service';

type CategoryTab = ProductCategory | 'Todos';

@Component({
  selector: 'app-quick-comanda-modal',
  standalone: true,
  imports: [FormsModule, RouterLink],
  template: `
    <div class="comanda-modal-overlay" role="presentation">
      <section
        class="comanda-modal quick-comanda-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="quick-comanda-modal-title"
      >
        <button
          class="modal-close-button"
          type="button"
          aria-label="Fechar modal de comanda"
          (click)="close.emit()"
        >
          X
        </button>

        <header class="comanda-modal-header">
          <button class="modal-back-button" type="button" (click)="close.emit()">
            ← Voltar ao mapa de comandas
          </button>

          <div class="modal-title-row">
            <h2 id="quick-comanda-modal-title">{{ modalTitle }}</h2>
            <span class="modal-status-badge free">{{ selectedMesaId ? 'MESA' : 'RÁPIDA' }}</span>
          </div>

          <p>
            {{ isEditing ? 'Edite o cliente, a mesa vinculada e os itens desta comanda.' : 'Selecione um cliente, escolha os itens do cardápio e associe a uma mesa quando necessário.' }}
            Sem mesa, a comanda fica como rápida em aberto.
          </p>
        </header>

        <div class="quick-customer-strip">
          <label>
            Cliente responsável pela comanda
            <select name="cliente" [(ngModel)]="selectedClienteId" [disabled]="!canEditComanda" (ngModelChange)="errorMessage = ''">
              <option value="">Selecione um cliente</option>
              @for (cliente of clientes; track cliente.id) {
                <option [value]="cliente.id">
                  {{ cliente.nome }} — {{ cliente.cpf }}
                </option>
              }
            </select>
          </label>

          <label>
            Mesa vinculada <span class="optional-label">opcional</span>
            <select name="mesa" [(ngModel)]="selectedMesaId" [disabled]="!canEditComanda" (ngModelChange)="errorMessage = ''">
              <option value="">Sem mesa — comanda rápida</option>
              @for (mesa of mesasDisponiveis; track mesa.id) {
                <option [value]="mesa.id">
                  Mesa {{ formatMesaNumber(mesa) }}{{ mesa.nome ? ' — ' + mesa.nome : '' }}
                </option>
              }
            </select>
          </label>

          @if (clientes.length === 0) {
            <div class="quick-helper-box">
              <strong>Nenhum cliente cadastrado</strong>
              <span>Cadastre um cliente antes de criar uma comanda.</span>
              <a routerLink="/clientes" (click)="close.emit()">Ir para Clientes</a>
            </div>
          }
        </div>

        @if (errorMessage) {
          <div class="quick-form-feedback">{{ errorMessage }}</div>
        }

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
                          [disabled]="!canEditComanda || getQuantity(produto) === 0"
                          (click)="decrementQuantity(produto)"
                        >
                          -
                        </button>
                        <span>{{ getQuantity(produto) }}</span>
                        <button
                          type="button"
                          aria-label="Aumentar quantidade"
                          [disabled]="!canEditComanda"
                          (click)="incrementQuantity(produto)"
                        >
                          +
                        </button>
                      </div>

                      <button class="add-product-button" type="button" [disabled]="!canEditComanda" (click)="addItem(produto)">
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

          <section class="detail-panel order-panel" aria-label="Itens selecionados">
            <div class="detail-panel-header order-header">
              <h3>Itens selecionados</h3>
              <button class="clear-order-button" type="button" [disabled]="!canEditComanda" (click)="clearComanda()">
                Limpar seleção
              </button>
            </div>

            <div class="order-context-card">
              <span>Destino da comanda</span>
              <strong>{{ selectedMesaLabel }}</strong>
            </div>

            <div class="order-table" role="table" aria-label="Itens selecionados para a comanda">
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
                      <button type="button" aria-label="Diminuir item" [disabled]="!canEditComanda" (click)="changeItemQuantity(item, item.quantidade - 1)">-</button>
                      <span>{{ item.quantidade }}</span>
                      <button type="button" aria-label="Aumentar item" [disabled]="!canEditComanda" (click)="changeItemQuantity(item, item.quantidade + 1)">+</button>
                    </div>
                    <span role="cell">{{ formatCurrency(item.precoUnitario) }}</span>
                    <span role="cell">{{ formatCurrency(item.subtotal) }}</span>
                    <button type="button" [disabled]="!canEditComanda" (click)="removeItem(item)">Remover</button>
                  </div>
                } @empty {
                  <div class="empty-order-state">
                    <strong>Nenhum item selecionado</strong>
                    <span>Escolha produtos do cardápio para montar a comanda.</span>
                  </div>
                }
              </div>
            </div>

            <footer class="order-total-panel">
              <span>TOTAL DA COMANDA</span>
              <strong>{{ formatCurrency(getTotal()) }}</strong>
            </footer>

            <div class="quick-modal-actions">
              <button class="modal-secondary-action" type="button" (click)="close.emit()">
                Cancelar
              </button>
              <button
                class="modal-primary-action"
                type="button"
                [disabled]="!canSave"
                (click)="saveComanda()"
              >
                {{ primaryActionLabel }}
              </button>
            </div>
          </section>
        </div>
      </section>
    </div>
  `,
})
export class QuickComandaModalComponent implements OnChanges {
  @Input() editingComanda: Comanda | null = null;
  @Input() initialMesaId = '';
  @Output() close = new EventEmitter<void>();
  @Output() saved = new EventEmitter<Comanda>();

  private readonly clientesService = inject(ClientesService);
  private readonly comandasService = inject(ComandasService);
  private readonly mesasService = inject(MesasService);
  private readonly produtosService = inject(ProdutosService);

  protected activeCategory: CategoryTab = 'Todos';
  protected selectedClienteId = '';
  protected selectedMesaId = '';
  protected errorMessage = '';
  protected items: ItemComanda[] = [];
  protected productQuantities: Record<string, number> = {};

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['editingComanda'] || changes['initialMesaId']) {
      this.initializeForm();
    }
  }

  protected get isEditing(): boolean {
    return Boolean(this.editingComanda);
  }

  protected get modalTitle(): string {
    return this.isEditing ? 'Editar comanda' : 'Criar nova comanda';
  }

  protected get primaryActionLabel(): string {
    return this.isEditing ? 'Salvar alterações' : 'Criar comanda';
  }

  protected get clientes(): Cliente[] {
    return this.clientesService.getClientes();
  }

  protected get mesasDisponiveis(): Mesa[] {
    return this.mesasService.getMesas().filter((mesa) => mesa.status !== 'inativa');
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

  protected get canEditComanda(): boolean {
    return !this.editingComanda || this.comandasService.isComandaAberta(this.editingComanda);
  }

  protected get canSave(): boolean {
    return this.canEditComanda && Boolean(this.selectedClienteId) && this.items.length > 0;
  }

  protected get selectedMesaLabel(): string {
    const mesa = this.getSelectedMesa();

    if (!mesa) {
      return 'Comanda rápida sem mesa vinculada';
    }

    return `Mesa ${this.formatMesaNumber(mesa)}${mesa.nome ? ' — ' + mesa.nome : ''}`;
  }

  protected setActiveCategory(category: CategoryTab): void {
    this.activeCategory = category;
  }

  protected getQuantity(produto: Produto): number {
    return this.productQuantities[produto.id] ?? 1;
  }

  protected incrementQuantity(produto: Produto): void {
    if (!this.canEditComanda) {
      return;
    }

    this.productQuantities = {
      ...this.productQuantities,
      [produto.id]: this.getQuantity(produto) + 1,
    };
  }

  protected decrementQuantity(produto: Produto): void {
    if (!this.canEditComanda) {
      return;
    }

    this.productQuantities = {
      ...this.productQuantities,
      [produto.id]: Math.max(this.getQuantity(produto) - 1, 0),
    };
  }

  protected addItem(produto: Produto): void {
    if (!this.canEditComanda) {
      return;
    }

    this.errorMessage = '';
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
  }

  protected changeItemQuantity(itemToChange: ItemComanda, nextQuantity: number): void {
    if (!this.canEditComanda) {
      return;
    }

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
  }

  protected removeItem(itemToRemove: ItemComanda): void {
    if (!this.canEditComanda) {
      return;
    }

    this.items = this.items.filter((item) => item.id !== itemToRemove.id);
  }

  protected clearComanda(): void {
    if (!this.canEditComanda) {
      return;
    }

    this.items = [];
    this.errorMessage = '';
  }

  protected saveComanda(): void {
    this.errorMessage = '';

    if (!this.canEditComanda) {
      this.errorMessage = 'Esta comanda já foi finalizada e não pode mais ser alterada.';
      return;
    }
    const selectedCliente = this.clientes.find((cliente) => cliente.id === this.selectedClienteId);

    if (!selectedCliente) {
      this.errorMessage = 'Selecione um cliente para vincular à comanda.';
      return;
    }

    if (this.items.length === 0) {
      this.errorMessage = 'Adicione pelo menos um item à comanda.';
      return;
    }

    const payload = {
      clienteId: selectedCliente.id,
      clienteNome: selectedCliente.nome,
      items: this.items,
      mesaId: this.selectedMesaId || undefined,
    };

    const comanda = this.editingComanda
      ? this.comandasService.updateComanda(this.editingComanda.id, payload)
      : this.comandasService.createComanda(payload);

    if (!comanda) {
      this.errorMessage = 'Não foi possível encontrar a comanda para edição.';
      return;
    }

    this.saved.emit(comanda);
  }

  protected getTotal(): number {
    return this.items.reduce((total, item) => total + item.subtotal, 0);
  }

  protected formatMesaNumber(mesa: Mesa): string {
    return String(mesa.numero).padStart(2, '0');
  }

  protected formatCurrency(valor: number): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(valor);
  }

  private initializeForm(): void {
    this.errorMessage = '';
    this.productQuantities = this.activeProducts.reduce<Record<string, number>>((quantities, produto) => {
      quantities[produto.id] = 1;
      return quantities;
    }, {});

    if (this.editingComanda) {
      this.selectedClienteId = this.editingComanda.clienteId ?? '';
      this.selectedMesaId = this.editingComanda.mesaId ?? '';
      this.items = this.editingComanda.itens.map((item) => ({ ...item }));
      return;
    }

    this.selectedClienteId = '';
    this.selectedMesaId = this.initialMesaId || '';
    this.items = [];
  }

  private getSelectedMesa(): Mesa | undefined {
    return this.mesasDisponiveis.find((mesa) => mesa.id === this.selectedMesaId);
  }
}
