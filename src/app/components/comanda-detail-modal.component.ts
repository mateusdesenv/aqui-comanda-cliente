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

          <div class="modal-title-row modal-title-row-with-action">
            <div class="modal-title-content">
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

            @if (canWrite) {
              <button class="modal-primary-action modal-header-action" type="button" (click)="createForMesa.emit(mesa)">
                Adicionar nova comanda
              </button>
            }
          </div>

          <p>
            Uma mesa pode ter várias comandas. Apenas comandas abertas aceitam lançamento de itens; comandas pagas ficam preservadas como histórico.
          </p>
        </header>

        @if (modalFeedback) {
          <div class="quick-form-feedback success-feedback">{{ modalFeedback }}</div>
        }

        @if (mesaComandas.length === 0) {
          <section class="mesa-empty-state" aria-label="Mesa sem comandas abertas">
            <div>
              <strong>Nenhuma comanda nesta mesa</strong>
              <span>Para lançar itens, crie uma comanda e associe diretamente à Mesa {{ displayMesaNumber }}.</span>
            </div>
            @if (canWrite) {
              <button class="modal-primary-action" type="button" (click)="createForMesa.emit(mesa)">
                Adicionar nova comanda
              </button>
            }
          </section>
        } @else {
          <div class="mesa-comanda-selector">
            <label>
              Comandas da mesa
              <select name="mesaComanda" [(ngModel)]="selectedComandaId" (ngModelChange)="syncSelectedComandaItems()">
                @for (comanda of mesaComandas; track comanda.id) {
                  <option [value]="comanda.id">
                    {{ getComandaLabel(comanda) }} — {{ getComandaStatusLabel(comanda) }} — {{ formatCurrency(getComandaTotal(comanda)) }}
                  </option>
                }
              </select>
            </label>

            <div class="quick-helper-box mesa-totals-box">
              <strong>{{ openComandasCount }} aberta{{ openComandasCount === 1 ? '' : 's' }} · {{ finalizedComandasCount }} paga{{ finalizedComandasCount === 1 ? '' : 's' }}</strong>
              <span>Em aberto: {{ formatCurrency(totalMesaAberto) }}</span>
              <span>Histórico pago: {{ formatCurrency(totalMesaPago) }}</span>
            </div>
          </div>

          @if (selectedComanda && isFinalized(selectedComanda)) {
            <div class="readonly-comanda-alert">
              <strong>Comanda paga/finalizada</strong>
              <span>Esta comanda está bloqueada para novos itens. Para o mesmo cliente consumir novamente, crie uma nova comanda para esta mesa.</span>
            </div>
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
                    <article class="product-card" [class.product-card-disabled]="!canEditSelectedComanda">
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
                            [disabled]="!canEditSelectedComanda || getQuantity(produto) === 0"
                            (click)="decrementQuantity(produto)"
                          >
                            -
                          </button>
                          <span>{{ getQuantity(produto) }}</span>
                          <button
                            type="button"
                            aria-label="Aumentar quantidade"
                            [disabled]="!canEditSelectedComanda"
                            (click)="incrementQuantity(produto)"
                          >
                            +
                          </button>
                        </div>

                        <button class="add-product-button" type="button" [disabled]="!canEditSelectedComanda" (click)="addItem(produto)">
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
                <div class="order-header-actions">
                  @if (selectedComanda && canEditSelectedComanda && items.length > 0) {
                    <button class="finish-comanda-button" type="button" (click)="openFinishConfirmation(selectedComanda)">
                      Finalizar comanda
                    </button>
                  }
                  <button class="clear-order-button" type="button" [disabled]="!canEditSelectedComanda" (click)="clearComanda()">
                    Limpar comanda
                  </button>
                </div>
              </div>

              <div class="order-context-card">
                <span>Comanda selecionada</span>
                <strong>{{ getComandaLabel(selectedComanda) }}</strong>
                @if (selectedComanda) {
                  <em>{{ getComandaStatusLabel(selectedComanda) }}</em>
                }
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
                        <button type="button" aria-label="Diminuir item" [disabled]="!canEditSelectedComanda" (click)="changeItemQuantity(item, item.quantidade - 1)">-</button>
                        <span>{{ item.quantidade }}</span>
                        <button type="button" aria-label="Aumentar item" [disabled]="!canEditSelectedComanda" (click)="changeItemQuantity(item, item.quantidade + 1)">+</button>
                      </div>
                      <span role="cell">{{ formatCurrency(item.precoUnitario) }}</span>
                      <span role="cell">{{ formatCurrency(item.subtotal) }}</span>
                      <button type="button" [disabled]="!canEditSelectedComanda" (click)="removeItem(item)">Remover</button>
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
                <span>{{ selectedComanda && isFinalized(selectedComanda) ? 'TOTAL FINALIZADO' : 'TOTAL DA COMANDA' }}</span>
                <strong>{{ formatCurrency(getTotal()) }}</strong>
                @if (selectedComanda?.finalizadaEm; as finalizadaEm) {
                  <small>Finalizada em {{ formatDateTime(finalizadaEm) }}</small>
                }
              </footer>
            </section>
          </div>
        }
      </section>

      @if (finishCandidate) {
        <section class="confirmation-dialog" role="dialog" aria-modal="true" aria-labelledby="finish-comanda-title">
          <div class="confirmation-card">
            <h3 id="finish-comanda-title">Finalizar comanda</h3>
            <p>Confirme o encerramento. Depois de paga, esta comanda não poderá receber novos itens ou alterações.</p>

            <div class="confirmation-summary">
              <span>Cliente</span>
              <strong>{{ finishCandidate.clienteNome || 'Cliente não informado' }}</strong>

              <span>Mesa</span>
              <strong>Mesa {{ displayMesaNumber }}</strong>

              <span>Total final</span>
              <strong>{{ formatCurrency(getComandaTotal(finishCandidate)) }}</strong>
            </div>

            <div class="confirmation-items">
              @for (item of finishCandidate.itens; track item.id) {
                <div>
                  <span>{{ item.quantidade }}x {{ item.nome }}</span>
                  <strong>{{ formatCurrency(item.subtotal) }}</strong>
                </div>
              }
            </div>

            <div class="confirmation-actions">
              <button class="modal-secondary-action" type="button" (click)="cancelFinishConfirmation()">Cancelar</button>
              <button class="modal-primary-action" type="button" (click)="confirmFinishComanda()">Encerrar e marcar como paga</button>
            </div>
          </div>
        </section>
      }
    </div>
  `,
})
export class ComandaDetailModalComponent implements OnChanges {
  @Input({ required: true }) mesa!: Mesa;
  @Input() canWrite = true;
  @Output() close = new EventEmitter<void>();
  @Output() createForMesa = new EventEmitter<Mesa>();

  private readonly comandasService = inject(ComandasService);
  private readonly produtosService = inject(ProdutosService);

  protected activeCategory: CategoryTab = 'Todos';
  protected selectedComandaId = '';
  protected items: ItemComanda[] = [];
  protected productQuantities: Record<string, number> = {};
  protected finishCandidate: Comanda | null = null;
  protected modalFeedback = '';

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
    return this.comandasService.getComandasForMesa(this.mesa.id);
  }

  protected get openMesaComandas(): Comanda[] {
    return this.comandasService.getOpenComandasForMesa(this.mesa.id);
  }

  protected get finalizedMesaComandas(): Comanda[] {
    return this.comandasService.getFinishedComandasForMesa(this.mesa.id);
  }

  protected get selectedComanda(): Comanda | null {
    return this.mesaComandas.find((comanda) => comanda.id === this.selectedComandaId) ?? null;
  }

  protected get totalMesaAberto(): number {
    return this.openMesaComandas.reduce((total, comanda) => total + comanda.total, 0);
  }

  protected get totalMesaPago(): number {
    return this.finalizedMesaComandas.reduce((total, comanda) => total + this.getComandaTotal(comanda), 0);
  }

  protected get openComandasCount(): number {
    return this.openMesaComandas.length;
  }

  protected get finalizedComandasCount(): number {
    return this.finalizedMesaComandas.length;
  }

  protected get canEditSelectedComanda(): boolean {
    return this.canWrite && Boolean(this.selectedComanda) && this.comandasService.isComandaAberta(this.selectedComanda!);
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
    return this.openMesaComandas.length > 0;
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
    if (!this.canEditSelectedComanda) {
      return;
    }

    this.productQuantities = {
      ...this.productQuantities,
      [produto.id]: this.getQuantity(produto) + 1,
    };
  }

  protected decrementQuantity(produto: Produto): void {
    if (!this.canEditSelectedComanda) {
      return;
    }

    this.productQuantities = {
      ...this.productQuantities,
      [produto.id]: Math.max(this.getQuantity(produto) - 1, 0),
    };
  }

  protected addItem(produto: Produto): void {
    if (!this.canEditSelectedComanda || !this.selectedComandaId) {
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
    if (!this.canEditSelectedComanda) {
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
    this.persistItems();
  }

  protected removeItem(itemToRemove: ItemComanda): void {
    if (!this.canEditSelectedComanda) {
      return;
    }

    this.items = this.items.filter((item) => item.id !== itemToRemove.id);
    this.persistItems();
  }

  protected clearComanda(): void {
    if (!this.canEditSelectedComanda) {
      return;
    }

    this.items = [];
    this.persistItems();
    this.syncSelectedComandaItems();
  }

  protected syncSelectedComandaItems(): void {
    const currentSelection = this.selectedComanda;
    const selected = currentSelection ?? this.mesaComandas[0] ?? null;
    this.selectedComandaId = selected?.id ?? '';
    this.items = selected ? selected.itens.map((item) => ({ ...item })) : [];
    this.modalFeedback = '';
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

  protected getComandaStatusLabel(comanda: Comanda): string {
    return this.comandasService.isComandaFinalizada(comanda) ? 'Paga / finalizada' : 'Aberta';
  }

  protected getComandaTotal(comanda: Comanda): number {
    return this.comandasService.isComandaFinalizada(comanda) ? comanda.totalFinalizado ?? comanda.total : comanda.total;
  }

  protected isFinalized(comanda: Comanda): boolean {
    return this.comandasService.isComandaFinalizada(comanda);
  }

  protected openFinishConfirmation(comanda: Comanda): void {
    if (!this.canEditSelectedComanda || this.items.length === 0) {
      return;
    }

    this.finishCandidate = { ...comanda, itens: this.items.map((item) => ({ ...item })), total: this.getTotal() };
  }

  protected cancelFinishConfirmation(): void {
    this.finishCandidate = null;
  }

  protected confirmFinishComanda(): void {
    if (!this.finishCandidate || !this.canWrite) {
      return;
    }

    const finalized = this.comandasService.finalizeComandaById(this.finishCandidate.id);
    this.finishCandidate = null;

    if (!finalized) {
      this.modalFeedback = 'Não foi possível finalizar esta comanda. Verifique se ela ainda está aberta e possui itens.';
      this.syncSelectedComandaItems();
      return;
    }

    this.selectedComandaId = finalized.id;
    this.items = finalized.itens.map((item) => ({ ...item }));
    this.modalFeedback = `Comanda de ${finalized.clienteNome ?? 'cliente'} finalizada, marcada como paga e registrada no caixa.`;
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

  protected formatDateTime(value: string): string {
    return new Intl.DateTimeFormat('pt-BR', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(new Date(value));
  }

  private persistItems(): void {
    if (!this.selectedComandaId || !this.canEditSelectedComanda) {
      return;
    }

    const currentId = this.selectedComandaId;
    this.comandasService.saveItemsForComanda(currentId, this.items);

    if (!this.comandasService.getComandasForMesa(this.mesa.id).some((comanda) => comanda.id === currentId)) {
      this.selectedComandaId = '';
    }
  }
}
