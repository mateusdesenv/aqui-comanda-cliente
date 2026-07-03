import { Component, EventEmitter, Input, OnChanges, Output, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Comanda, ItemComanda, Mesa, ProductCategory, Produto } from '../models/app-data';
import { ComandasService } from '../services/comandas.service';
import { CaixaService } from '../services/caixa.service';
import { ProdutosService } from '../services/produtos.service';

type CategoryTab = ProductCategory | 'Todos';
type MenuViewMode = 'grid' | 'lista';

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
              [class.free]="isMesaLivre"
              [class.reserved]="isMesaReservada"
              [class.pending-release]="canReleaseMesa"
            >
              {{ statusBadge }}
            </span>
          </div>

          <p>
            Selecione uma comanda para lançar itens ou use o card de nova comanda para iniciar outro
            consumo nesta mesa.
          </p>

          @if (mesaComandas.length > 0) {
            <div class="mesa-release-action-bar">
              <div>
                <strong>Liberar mesa</strong>
                <span>{{
                  canReleaseMesa
                    ? 'Todas as comandas estão pagas. A mesa pode ser liberada.'
                    : 'Finalize todas as comandas abertas para liberar a mesa.'
                }}</span>
              </div>
              <button
                class="mesa-release-button"
                type="button"
                [disabled]="!canWrite || !canReleaseMesa"
                (click)="openReleaseMesaConfirmation()"
              >
                Liberar mesa
              </button>
            </div>
          }
        </header>

        @if (modalFeedback) {
          <div class="quick-form-feedback success-feedback">{{ modalFeedback }}</div>
        }

        <section class="mesa-comandas-cards-section" aria-label="Comandas da mesa">
          <div class="mesa-comandas-card-grid" [class.empty-grid]="mesaComandas.length === 0">
            @for (comanda of mesaComandas; track comanda.id) {
              <button
                class="mesa-comanda-card"
                [class.active]="isSelectedComanda(comanda)"
                [class.finalized]="isFinalized(comanda)"
                type="button"
                (click)="selectComanda(comanda)"
              >
                <div class="mesa-comanda-card-head">
                  <strong>{{ getComandaCardTitle(comanda) }}</strong>
                  <span class="mesa-comanda-status" [class.finalized]="isFinalized(comanda)">
                    {{ getComandaStatusLabel(comanda) }}
                  </span>
                </div>

                <span
                  class="mesa-comanda-client"
                  [class.registered-client-name]="isRegisteredClienteComanda(comanda)"
                >{{
                  comanda.clienteNome || 'Cliente não informado'
                }}</span>

                <div class="mesa-comanda-card-meta">
                  <span
                    >{{ comanda.itens.length }} item{{
                      comanda.itens.length === 1 ? '' : 's'
                    }}</span
                  >
                  <strong>{{ formatCurrency(getComandaTotal(comanda)) }}</strong>
                </div>

                <small>Criada em {{ formatDateTime(comanda.createdAt) }}</small>
              </button>
            }

            @if (canWrite) {
              <button
                class="mesa-add-comanda-card"
                type="button"
                aria-label="Adicionar nova comanda para esta mesa"
                (click)="createComandaForMesa()"
              >
                <span aria-hidden="true">+</span>
                <strong>Nova comanda</strong>
              </button>
            } @else if (mesaComandas.length === 0) {
              <article class="mesa-readonly-empty-card">
                <strong>Nenhuma comanda nesta mesa</strong>
                <span>Você tem permissão apenas para visualizar.</span>
              </article>
            }
          </div>
        </section>

        @if (selectedComanda; as activeComanda) {
          @if (isFinalized(activeComanda)) {
            <div class="readonly-comanda-alert">
              <strong>Comanda paga/finalizada</strong>
              <span
                >Esta comanda está bloqueada para novos itens. Para o mesmo cliente consumir
                novamente, crie uma nova comanda para esta mesa.</span
              >
            </div>
          }

          <div class="comanda-detail-grid">
            <section class="detail-panel menu-panel" aria-label="Cardápio">
              <div class="detail-panel-header menu-panel-toolbar">
                <div>
                  <h3>Cardápio</h3>
                  <span>Alterne a visualização para operar com mais rapidez.</span>
                </div>
                <div class="view-toggle" aria-label="Visualização do cardápio">
                  <button
                    type="button"
                    [class.active]="menuViewMode === 'lista'"
                    (click)="setMenuViewMode('lista')"
                  >
                    Lista
                  </button>
                  <button
                    type="button"
                    [class.active]="menuViewMode === 'grid'"
                    (click)="setMenuViewMode('grid')"
                  >
                    Grid
                  </button>
                </div>
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

                <div class="product-grid" [class.product-list-view]="menuViewMode === 'lista'">
                  @for (produto of filteredProducts; track produto.id) {
                    <article
                      class="product-card"
                      [class.product-card-disabled]="!canEditSelectedComanda"
                    >
                      <div>
                        <strong>{{ produto.nome }}</strong>
                        <p>{{ produto.descricao }}</p>
                        <span class="product-size-chip quick-product-size">{{ getProdutoTamanhoLabel(produto) }}</span>
                      </div>

                      <span class="product-price">{{ formatCurrency(produto.preco) }}</span>

                      <div class="product-actions">
                        <div
                          class="quantity-control"
                          [attr.aria-label]="'Quantidade de ' + produto.nome"
                        >
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

                        <button
                          class="add-product-button"
                          type="button"
                          [disabled]="!canEditSelectedComanda"
                          (click)="addItem(produto)"
                        >
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
                  @if (canEditSelectedComanda && items.length > 0) {
                    <button
                      class="finish-comanda-button"
                      type="button"
                      (click)="openFinishConfirmation(activeComanda)"
                    >
                      Finalizar comanda
                    </button>
                  }
                  <button
                    class="clear-order-button"
                    type="button"
                    [disabled]="!canEditSelectedComanda"
                    (click)="clearComanda()"
                  >
                    Limpar comanda
                  </button>
                </div>
              </div>

              <div class="order-context-card">
                <span>Comanda selecionada</span>
                <strong [class.registered-client-name]="isRegisteredClienteComanda(activeComanda)">{{ getComandaLabel(activeComanda) }}</strong>
                <em>{{ getComandaStatusLabel(activeComanda) }}</em>
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
                      <div
                        role="cell"
                        class="inline-quantity-control"
                        [attr.aria-label]="'Quantidade de ' + item.nome"
                      >
                        <button
                          type="button"
                          aria-label="Diminuir item"
                          [disabled]="!canEditSelectedComanda"
                          (click)="changeItemQuantity(item, item.quantidade - 1)"
                        >
                          -
                        </button>
                        <span>{{ item.quantidade }}</span>
                        <button
                          type="button"
                          aria-label="Aumentar item"
                          [disabled]="!canEditSelectedComanda"
                          (click)="changeItemQuantity(item, item.quantidade + 1)"
                        >
                          +
                        </button>
                      </div>
                      <span role="cell">{{ formatCurrency(item.precoUnitario) }}</span>
                      <span role="cell">{{ formatCurrency(item.subtotal) }}</span>
                      <button
                        type="button"
                        [disabled]="!canEditSelectedComanda"
                        (click)="removeItem(item)"
                      >
                        Remover
                      </button>
                    </div>
                  } @empty {
                    <div class="empty-order-state">
                      <strong>Nenhum item lançado</strong>
                      <span
                        >Escolha produtos do cardápio para adicionar à comanda selecionada.</span
                      >
                    </div>
                  }
                </div>
              </div>

              <footer class="order-total-panel">
                <span>{{
                  isFinalized(activeComanda) ? 'TOTAL FINALIZADO' : 'TOTAL DA COMANDA'
                }}</span>
                <strong>{{ formatCurrency(getTotal()) }}</strong>
                @if (activeComanda.finalizadaEm; as finalizadaEm) {
                  <small>Finalizada em {{ formatDateTime(finalizadaEm) }}</small>
                }
              </footer>
            </section>
          </div>
        }
      </section>

      @if (finishCandidate) {
        <section
          class="confirmation-dialog"
          role="dialog"
          aria-modal="true"
          aria-labelledby="finish-comanda-title"
        >
          <div class="confirmation-card">
            <h3 id="finish-comanda-title">Finalizar comanda</h3>
            <p>
              Confirme o encerramento. Depois de paga, esta comanda não poderá receber novos itens
              ou alterações.
            </p>

            <div class="confirmation-summary">
              <span>Cliente</span>
              <strong [class.registered-client-name]="isRegisteredClienteComanda(finishCandidate)">{{ finishCandidate.clienteNome || 'Cliente não informado' }}</strong>

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
              <button
                class="modal-secondary-action"
                type="button"
                (click)="cancelFinishConfirmation()"
              >
                Cancelar
              </button>
              <button class="modal-primary-action" type="button" (click)="confirmFinishComanda()">
                Encerrar e marcar como paga
              </button>
            </div>
          </div>
        </section>
      }

      @if (releaseMesaConfirmationOpen) {
        <section
          class="confirmation-dialog"
          role="dialog"
          aria-modal="true"
          aria-labelledby="release-mesa-title"
        >
          <div class="confirmation-card">
            <h3 id="release-mesa-title">Liberar mesa</h3>
            <p>
              Todas as comandas desta mesa estão pagas. Deseja liberar a mesa para um novo
              atendimento?
            </p>

            <div class="confirmation-summary">
              <span>Mesa</span>
              <strong>Mesa {{ displayMesaNumber }}</strong>

              <span>Comandas pagas</span>
              <strong>{{ mesaComandas.length }}</strong>

              <span>Histórico</span>
              <strong>Será preservado</strong>
            </div>

            <p class="confirmation-note">
              As entradas já registradas no caixa não serão alteradas.
            </p>

            <div class="confirmation-actions">
              <button
                class="modal-secondary-action"
                type="button"
                (click)="cancelReleaseMesaConfirmation()"
              >
                Cancelar
              </button>
              <button class="modal-primary-action" type="button" (click)="confirmReleaseMesa()">
                Liberar mesa
              </button>
            </div>
          </div>
        </section>
      }
    </div>
  `,
})
export class ComandaDetailModalComponent implements OnChanges {
  private lastMesaId = '';
  @Input({ required: true }) mesa!: Mesa;
  @Input() canWrite = true;
  @Output() close = new EventEmitter<void>();
  @Output() createForMesa = new EventEmitter<Mesa>();

  private readonly comandasService = inject(ComandasService);
  private readonly caixaService = inject(CaixaService);
  private readonly produtosService = inject(ProdutosService);

  protected activeCategory: CategoryTab = 'Todos';
  protected menuViewMode: MenuViewMode = 'grid';
  protected selectedComandaId = '';
  protected items: ItemComanda[] = [];
  protected productQuantities: Record<string, number> = {};
  protected finishCandidate: Comanda | null = null;
  protected releaseMesaConfirmationOpen = false;
  protected modalFeedback = '';

  ngOnChanges(): void {
    const mesaChanged = this.mesa.id !== this.lastMesaId;
    this.lastMesaId = this.mesa.id;

    if (mesaChanged || !this.isSelectedComandaFromCurrentMesa()) {
      this.selectFirstOpenComandaForMesa();
    }

    this.syncSelectedComandaItems();

    this.productQuantities = this.activeProducts.reduce<Record<string, number>>(
      (quantities, produto) => {
        quantities[produto.id] = this.productQuantities[produto.id] ?? 1;
        return quantities;
      },
      {},
    );

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

  protected get selectedComanda(): Comanda | null {
    return this.mesaComandas.find((comanda) => comanda.id === this.selectedComandaId) ?? null;
  }

  protected get canEditSelectedComanda(): boolean {
    return (
      this.canWrite &&
      Boolean(this.selectedComanda) &&
      this.comandasService.isComandaAberta(this.selectedComanda!)
    );
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

  protected get hasMesaComandas(): boolean {
    return this.mesaComandas.length > 0;
  }

  protected get canReleaseMesa(): boolean {
    return this.comandasService.canReleaseMesa(this.mesa.id);
  }

  protected get isMesaLivre(): boolean {
    return this.statusLabel === 'Livre';
  }

  protected get isMesaReservada(): boolean {
    return this.statusLabel === 'Reservada';
  }

  protected get statusLabel(): string {
    if (this.hasMesaComandas) {
      return 'Ocupada';
    }

    return this.mesa.status === 'reservada' ? 'Reservada' : 'Livre';
  }

  protected get statusBadge(): string {
    if (this.canReleaseMesa) {
      return 'TODAS PAGAS';
    }

    return this.statusLabel.toUpperCase();
  }

  protected setActiveCategory(category: CategoryTab): void {
    this.activeCategory = category;
  }

  protected setMenuViewMode(mode: MenuViewMode): void {
    this.menuViewMode = mode;
  }

  protected selectComanda(comanda: Comanda): void {
    this.selectedComandaId = comanda.id;
    this.syncSelectedComandaItems();
  }

  protected isSelectedComanda(comanda: Comanda): boolean {
    return this.selectedComandaId === comanda.id;
  }

  protected createComandaForMesa(): void {
    if (!this.canWrite) {
      return;
    }

    this.createForMesa.emit(this.mesa);
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
        tamanho: produto.tamanho,
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
    const selected = this.selectedComanda;

    if (!selected) {
      this.selectedComandaId = '';
      this.items = [];
      this.modalFeedback = '';
      return;
    }

    this.items = selected.itens.map((item) => ({ ...item }));
    this.modalFeedback = '';
  }

  protected getComandaLabel(comanda: Comanda | null): string {
    if (!comanda) {
      return 'Nenhuma comanda selecionada';
    }

    if (comanda.clienteNome) {
      return comanda.clienteNome;
    }

    return this.getComandaCardTitle(comanda);
  }

  protected getComandaCardTitle(comanda: Comanda): string {
    const index = this.mesaComandas.findIndex((item) => item.id === comanda.id) + 1;
    return `Comanda ${index || 1}`;
  }

  protected getComandaStatusLabel(comanda: Comanda): string {
    return this.comandasService.isComandaFinalizada(comanda) ? 'Paga' : 'Aberta';
  }

  protected getComandaTotal(comanda: Comanda): number {
    return this.comandasService.isComandaFinalizada(comanda)
      ? (comanda.totalFinalizado ?? comanda.total)
      : comanda.total;
  }

  protected isFinalized(comanda: Comanda): boolean {
    return this.comandasService.isComandaFinalizada(comanda);
  }

  protected isRegisteredClienteComanda(comanda: Comanda | null): boolean {
    return Boolean(comanda?.clienteId);
  }


  protected openFinishConfirmation(comanda: Comanda): void {
    if (!this.canEditSelectedComanda || this.items.length === 0) {
      return;
    }

    this.finishCandidate = {
      ...comanda,
      itens: this.items.map((item) => ({ ...item })),
      total: this.getTotal(),
    };
  }

  protected cancelFinishConfirmation(): void {
    this.finishCandidate = null;
  }

  protected confirmFinishComanda(): void {
    if (!this.finishCandidate || !this.canWrite) {
      return;
    }

    if (!this.caixaService.hasCaixaAberto()) {
      this.finishCandidate = null;
      this.modalFeedback = 'Abra o caixa antes de registrar pagamentos.';
      return;
    }

    const finalized = this.comandasService.finalizeComandaById(this.finishCandidate.id);
    this.finishCandidate = null;

    if (!finalized) {
      this.modalFeedback =
        'Não foi possível finalizar esta comanda. Verifique se ela ainda está aberta e possui itens.';
      this.syncSelectedComandaItems();
      return;
    }

    this.selectedComandaId = finalized.id;
    this.items = finalized.itens.map((item) => ({ ...item }));
    this.modalFeedback = `Comanda de ${finalized.clienteNome ?? 'cliente'} finalizada, marcada como paga e registrada no caixa.`;
  }

  protected openReleaseMesaConfirmation(): void {
    if (!this.canWrite || !this.canReleaseMesa) {
      return;
    }

    this.releaseMesaConfirmationOpen = true;
  }

  protected cancelReleaseMesaConfirmation(): void {
    this.releaseMesaConfirmationOpen = false;
  }

  protected confirmReleaseMesa(): void {
    if (!this.canWrite || !this.canReleaseMesa) {
      return;
    }

    const released = this.comandasService.releaseMesa(this.mesa.id);
    this.releaseMesaConfirmationOpen = false;

    if (!released) {
      this.modalFeedback =
        'Não foi possível liberar a mesa. Verifique se todas as comandas estão pagas.';
      return;
    }

    this.selectedComandaId = '';
    this.items = [];
    this.finishCandidate = null;
    this.modalFeedback = 'Mesa liberada para um novo atendimento. O histórico pago foi preservado.';
  }

  protected getTotal(): number {
    return this.items.reduce((total, item) => total + item.subtotal, 0);
  }

  protected getProdutoTamanhoLabel(produto: Produto): string {
    return this.produtosService.getTamanhoLabel(produto.tamanho);
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

  private isSelectedComandaFromCurrentMesa(): boolean {
    if (!this.selectedComandaId) {
      return true;
    }

    return this.mesaComandas.some((comanda) => comanda.id === this.selectedComandaId);
  }

  private selectFirstOpenComandaForMesa(): void {
    const firstOpenComanda = this.openMesaComandas[0];
    this.selectedComandaId = firstOpenComanda?.id ?? '';
  }

  private persistItems(): void {
    if (!this.selectedComandaId || !this.canEditSelectedComanda) {
      return;
    }

    const currentId = this.selectedComandaId;
    this.comandasService.saveItemsForComanda(currentId, this.items);

    if (
      !this.comandasService
        .getComandasForMesa(this.mesa.id)
        .some((comanda) => comanda.id === currentId)
    ) {
      this.selectedComandaId = '';
    }
  }
}
