import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  inject,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Cliente, Comanda, ItemComanda, Mesa, ProductCategory, Produto } from '../models/app-data';
import { ClientesService } from '../services/clientes.service';
import { ComandasService } from '../services/comandas.service';
import { MesasService } from '../services/mesas.service';
import { ProdutosService } from '../services/produtos.service';

type CategoryTab = ProductCategory | 'Todos';
type ClienteComandaMode = 'cadastrado' | 'manual';
type QuickComandaStep = 'cliente' | 'produtos' | 'resumo';
type ProductViewMode = 'lista' | 'grid';
type StockFilterMode = 'in_stock' | 'all';

interface QuickComandaWorkflowTab {
  id: QuickComandaStep;
  label: string;
  helper: string;
}

@Component({
  selector: 'app-quick-comanda-modal',
  standalone: true,
  imports: [FormsModule, RouterLink],
  template: `
    <div class="comanda-modal-overlay quick-comanda-fullscreen-overlay" role="presentation">
      <section
        class="comanda-modal quick-comanda-modal quick-comanda-tabs-modal liquid-glass-modal"
        role="dialog"
        aria-modal="true"
        [attr.aria-label]="modalTitle"
      >
        <button
          class="modal-close-button"
          type="button"
          aria-label="Fechar modal de comanda"
          (click)="close.emit()"
        >
          X
        </button>

        <nav class="quick-workflow-tabs" aria-label="Etapas da criação de comanda">
          @for (tab of workflowTabs; track tab.id; let index = $index) {
            <button
              class="quick-workflow-tab"
              type="button"
              [class.active]="activeStep === tab.id"
              [class.completed]="isStepCompleted(tab.id)"
              [class.locked]="!canSelectStep(tab.id)"
              [attr.aria-selected]="activeStep === tab.id"
              [attr.aria-controls]="'quick-comanda-step-' + tab.id"
              role="tab"
              (click)="selectStep(tab.id)"
            >
              <span class="quick-tab-index">{{ isStepCompleted(tab.id) ? '✓' : index + 1 }}</span>
              <span>
                <strong>{{ tab.label }}</strong>
                <small>{{ tab.helper }}</small>
              </span>
            </button>
          }
        </nav>

        @if (errorMessage) {
          <div class="quick-form-feedback quick-tabs-feedback">{{ errorMessage }}</div>
        }

        <div class="quick-step-shell">
          @if (activeStep === 'cliente') {
            <section
              id="quick-comanda-step-cliente"
              class="quick-step-panel quick-customer-step"
              role="tabpanel"
              aria-label="Cliente e mesa"
            >
              <div class="quick-step-intro">
                <span>Etapa 1</span>
                <strong>Defina o responsável e o destino da comanda.</strong>
              </div>

              <div class="quick-identification-grid">
                <section class="quick-ident-card quick-client-card" aria-label="Cliente da comanda">
                  <header class="quick-ident-card-header">
                    <span>01</span>
                    <div>
                      <h3>Cliente da comanda</h3>
                      <p>
                        Digite o nome do responsável. Se ele existir no cadastro, o vínculo é feito
                        automaticamente.
                      </p>
                    </div>
                  </header>

                  <div class="smart-client-field">
                    <label class="quick-form-field">
                      Cliente responsável
                      <input
                        type="text"
                        name="clienteResponsavel"
                        list="quick-comanda-clientes"
                        autocomplete="off"
                        placeholder="Digite nome ou CPF"
                        [(ngModel)]="clienteSearchTerm"
                        [disabled]="!canEditComanda"
                        (ngModelChange)="onClienteSearchChange($event)"
                      />
                    </label>

                    <datalist id="quick-comanda-clientes">
                      @for (cliente of clientes; track cliente.id) {
                        <option [value]="getClienteOptionLabel(cliente)">
                          {{ cliente.nome }} - {{ cliente.cpf }}
                        </option>
                      }
                    </datalist>

                    <small class="smart-client-note">
                      Selecione uma sugestão para vincular ao cadastro ou continue com o nome
                      digitado.
                    </small>
                  </div>

                  <div class="customer-link-indicator" [class.manual]="clienteMode === 'manual'">
                    {{ clienteMode === 'manual' ? 'Nome livre' : 'Cadastro vinculado' }}
                  </div>
                </section>

                <section
                  class="quick-ident-card quick-destination-card"
                  aria-label="Destino da comanda"
                >
                  <header class="quick-ident-card-header">
                    <span>02</span>
                    <div>
                      <h3>Destino da comanda</h3>
                      <p>Defina se o consumo vai para uma mesa ou ficará como comanda rápida.</p>
                    </div>
                  </header>

                  @if (isMesaPreselected) {
                    <article class="linked-mesa-card locked">
                      <span>Mesa vinculada</span>
                      <strong>{{ selectedMesaLabel }}</strong>
                      <p>Esta comanda será criada dentro desta mesa.</p>
                    </article>
                  } @else {
                    <label class="quick-form-field">
                      Mesa vinculada <span class="optional-label">opcional</span>
                      <select
                        name="mesa"
                        [(ngModel)]="selectedMesaId"
                        [disabled]="!canEditComanda"
                        (ngModelChange)="clearStepFeedback()"
                      >
                        <option value="">Sem mesa — comanda rápida</option>
                        @for (mesa of mesasDisponiveis; track mesa.id) {
                          <option [value]="mesa.id">
                            Mesa {{ formatMesaNumber(mesa)
                            }}{{ mesa.nome ? ' — ' + mesa.nome : '' }}
                          </option>
                        }
                      </select>
                    </label>

                    <article class="linked-mesa-card" [class.quick]="!selectedMesaId">
                      <span>{{
                        selectedMesaId ? 'Destino selecionado' : 'Sem mesa vinculada'
                      }}</span>
                      <strong>{{ selectedMesaLabel }}</strong>
                      <p>
                        {{
                          selectedMesaId
                            ? 'A comanda será vinculada à mesa escolhida.'
                            : 'Sem mesa, ela ficará como comanda rápida em aberto.'
                        }}
                      </p>
                    </article>
                  }
                </section>
              </div>

              @if (clientes.length === 0) {
                <div class="quick-helper-box quick-client-helper">
                  <div>
                    <strong>Nenhum cliente cadastrado</strong>
                    <span>Você ainda pode digitar um nome livre para esta comanda.</span>
                  </div>
                  <a routerLink="/clientes" (click)="close.emit()">Ir para Clientes</a>
                </div>
              }
            </section>
          }

          @if (activeStep === 'produtos') {
            <section
              id="quick-comanda-step-produtos"
              class="quick-step-panel"
              role="tabpanel"
              aria-label="Produtos"
            >
              <div class="quick-step-intro quick-products-intro">
                <span>Etapa 2</span>
                <strong>Lance os produtos consumidos e acompanhe o total em tempo real.</strong>
              </div>

              <div class="quick-products-toolbar" aria-label="Busca e filtros do cardápio">
                <label class="quick-product-search">
                  Buscar produto
                  <input
                    type="search"
                    name="productSearch"
                    placeholder="Digite nome, descrição ou categoria"
                    [(ngModel)]="productSearch"
                    (ngModelChange)="clearStepFeedback()"
                  />
                </label>

                <div class="quick-category-filter">
                  <span class="quick-filter-label">Categorias</span>
                  <div
                    class="category-tabs quick-category-tabs"
                    role="tablist"
                    aria-label="Categorias do cardápio"
                  >
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
                </div>

                <div class="quick-product-toolbar-actions">
                  <div
                    class="view-toggle stock-filter-toggle"
                    role="group"
                    aria-label="Filtro de estoque"
                  >
                    <button
                      type="button"
                      [class.active]="stockFilterMode === 'in_stock'"
                      (click)="setStockFilterMode('in_stock')"
                    >
                      Em estoque
                    </button>
                    <button
                      type="button"
                      [class.active]="stockFilterMode === 'all'"
                      (click)="setStockFilterMode('all')"
                    >
                      Todos
                    </button>
                  </div>

                  <div
                    class="view-toggle quick-product-view-toggle"
                    role="group"
                    aria-label="Visualização dos produtos"
                  >
                    <button
                      type="button"
                      [class.active]="productViewMode === 'lista'"
                      (click)="setProductViewMode('lista')"
                    >
                      Lista
                    </button>
                    <button
                      type="button"
                      [class.active]="productViewMode === 'grid'"
                      (click)="setProductViewMode('grid')"
                    >
                      Grid
                    </button>
                  </div>
                </div>
              </div>

              <div class="comanda-detail-grid quick-products-step-grid">
                <section class="detail-panel menu-panel" aria-label="Cardápio">
                  <div class="detail-panel-header">
                    <div>
                      <h3>Produtos disponíveis</h3>
                      <span>{{ filteredProducts.length }} resultado(s)</span>
                    </div>
                  </div>

                  @if (activeProducts.length > 0) {
                    <div
                      class="product-grid quick-product-results"
                      [class.product-list-view]="productViewMode === 'lista'"
                      [class.product-grid-view]="productViewMode === 'grid'"
                    >
                      @for (produto of filteredProducts; track produto.id) {
                        <article
                          class="product-card"
                          [class.selected]="isProductSelected(produto)"
                          [class.product-card-disabled]="
                            !canEditComanda || !hasProductStock(produto)
                          "
                        >
                          <div>
                            <strong>{{ produto.nome }}</strong>
                            <p>{{ produto.descricao }}</p>
                            <span class="product-size-chip quick-product-size">{{
                              getProdutoTamanhoLabel(produto)
                            }}</span>
                            <span
                              class="stock-availability-chip"
                              [class.out]="!hasProductStock(produto)"
                            >
                              {{ getStockBadgeLabel(produto) }}
                            </span>
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
                                [disabled]="!canEditComanda || getQuantity(produto) === 0"
                                (click)="decrementQuantity(produto)"
                              >
                                -
                              </button>
                              <span>{{ getQuantity(produto) }}</span>
                              <button
                                type="button"
                                aria-label="Aumentar quantidade"
                                [disabled]="!canEditComanda || !canIncreaseProduct(produto)"
                                (click)="incrementQuantity(produto)"
                              >
                                +
                              </button>
                            </div>

                            <button
                              class="add-product-button"
                              type="button"
                              [disabled]="!canEditComanda || !canAddProduct(produto)"
                              (click)="addItem(produto)"
                            >
                              {{ getAddProductLabel(produto) }}
                            </button>
                          </div>
                        </article>
                      } @empty {
                        <div class="empty-menu-category quick-empty-products">
                          <strong>{{ emptyProductsTitle }}</strong>
                          <span>{{ emptyProductsDescription }}</span>
                        </div>
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

                <section
                  class="detail-panel order-panel quick-selected-panel"
                  aria-label="Itens selecionados"
                >
                  <div class="detail-panel-header order-header">
                    <div>
                      <h3>Itens da comanda</h3>
                      <span>{{ items.length }} {{ items.length === 1 ? 'item' : 'itens' }}</span>
                    </div>
                    <button
                      class="clear-order-button"
                      type="button"
                      [disabled]="!canEditComanda || items.length === 0"
                      (click)="clearComanda()"
                    >
                      Limpar seleção
                    </button>
                  </div>

                  <div class="order-context-card">
                    <span>Destino</span>
                    <strong>{{ selectedMesaLabel }}</strong>
                    <em>{{ selectedClienteLabel }}</em>
                  </div>

                  <div
                    class="order-table compact-order-table"
                    role="table"
                    aria-label="Itens selecionados para a comanda"
                  >
                    <div class="order-table-head" role="row">
                      <span role="columnheader">Item</span>
                      <span role="columnheader">Qtd.</span>
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
                              [disabled]="!canEditComanda"
                              (click)="changeItemQuantity(item, item.quantidade - 1)"
                            >
                              -
                            </button>
                            <span>{{ item.quantidade }}</span>
                            <button
                              type="button"
                              aria-label="Aumentar item"
                              [disabled]="!canEditComanda"
                              (click)="changeItemQuantity(item, item.quantidade + 1)"
                            >
                              +
                            </button>
                          </div>
                          <span role="cell">{{ formatCurrency(item.subtotal) }}</span>
                          <button
                            type="button"
                            [disabled]="!canEditComanda"
                            (click)="removeItem(item)"
                          >
                            Remover
                          </button>
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
                    <span>Total parcial</span>
                    <strong>{{ formatCurrency(getTotal()) }}</strong>
                  </footer>
                </section>
              </div>
            </section>
          }

          @if (activeStep === 'resumo') {
            <section
              id="quick-comanda-step-resumo"
              class="quick-step-panel quick-summary-step"
              role="tabpanel"
              aria-label="Resumo"
            >
              <div class="quick-step-intro">
                <span>Etapa 3</span>
                <strong>Confira cliente, destino, itens e total antes de concluir.</strong>
              </div>

              <div class="quick-summary-grid enhanced-summary-grid">
                <article class="quick-summary-card">
                  <span>Cliente</span>
                  <strong
                    [class.registered-client-name]="
                      clienteMode === 'cadastrado' && !!selectedClienteId
                    "
                    >{{ selectedClienteLabel }}</strong
                  >
                  <em>{{ clienteMode === 'manual' ? 'Nome livre' : 'Cadastro vinculado' }}</em>
                </article>

                <article class="quick-summary-card">
                  <span>Destino</span>
                  <strong>{{ selectedMesaLabel }}</strong>
                  <em>{{
                    selectedMesaId ? 'Comanda vinculada à mesa' : 'Comanda rápida em aberto'
                  }}</em>
                </article>

                <article class="quick-summary-card">
                  <span>Itens</span>
                  <strong>{{ items.length }}</strong>
                  <em>{{ items.length === 1 ? 'item selecionado' : 'itens selecionados' }}</em>
                </article>

                <article class="quick-summary-card total">
                  <span>Total geral</span>
                  <strong>{{ formatCurrency(getTotal()) }}</strong>
                  <em>Valor final da comanda</em>
                </article>
              </div>

              <div class="quick-summary-corrections" aria-label="Ações de correção do resumo">
                <button type="button" (click)="selectStep('cliente')">Alterar cliente</button>
                <button type="button" (click)="selectStep('produtos')">Alterar produtos</button>
              </div>

              <section
                class="detail-panel quick-summary-items"
                aria-label="Resumo dos itens da comanda"
              >
                <div class="detail-panel-header order-header">
                  <h3>Pré-cupom da comanda</h3>
                </div>

                <div class="order-table" role="table" aria-label="Resumo dos itens selecionados">
                  <div class="order-table-head" role="row">
                    <span role="columnheader">Item</span>
                    <span role="columnheader">Qtd.</span>
                    <span role="columnheader">Valor unit.</span>
                    <span role="columnheader">Subtotal</span>
                  </div>

                  <div class="order-table-body">
                    @for (item of items; track item.id) {
                      <div class="order-item-row summary-row" role="row">
                        <strong role="cell">{{ item.nome }}</strong>
                        <span role="cell">{{ item.quantidade }}</span>
                        <span role="cell">{{ formatCurrency(item.precoUnitario) }}</span>
                        <span role="cell">{{ formatCurrency(item.subtotal) }}</span>
                      </div>
                    } @empty {
                      <div class="empty-order-state">
                        <strong>Nenhum item selecionado</strong>
                        <span>Volte para Produtos e adicione ao menos um item.</span>
                      </div>
                    }
                  </div>
                </div>

                <footer class="order-total-panel summary-total-panel">
                  <span>Total da comanda</span>
                  <strong>{{ formatCurrency(getTotal()) }}</strong>
                </footer>
              </section>
            </section>
          }
        </div>

        <footer class="quick-tabs-footer">
          <div class="quick-footer-context">
            <span>Etapa {{ activeStepIndex + 1 }} de 3</span>
            <strong>{{ activeStepLabel }}</strong>
            <small>{{ footerSummaryLabel }}</small>
          </div>

          <div class="quick-tabs-footer-actions">
            <button class="modal-secondary-action" type="button" (click)="close.emit()">
              Cancelar
            </button>

            @if (activeStep !== 'cliente') {
              <button class="modal-secondary-action" type="button" (click)="previousStep()">
                Voltar
              </button>
            }

            @if (activeStep !== 'resumo') {
              <button class="modal-primary-action" type="button" (click)="nextStep()">
                Avançar
              </button>
            } @else {
              <button
                class="modal-primary-action"
                type="button"
                [disabled]="isSavingComanda"
                (click)="saveComanda()"
              >
                {{ isSavingComanda ? 'Salvando...' : primaryActionLabel }}
              </button>
            }
          </div>
        </footer>
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

  protected readonly workflowTabs: QuickComandaWorkflowTab[] = [
    { id: 'cliente', label: 'Cliente e mesa', helper: 'Responsável e destino' },
    { id: 'produtos', label: 'Produtos', helper: 'Cardápio e itens' },
    { id: 'resumo', label: 'Resumo', helper: 'Revisão final' },
  ];

  protected activeStep: QuickComandaStep = 'cliente';
  protected activeCategory: CategoryTab = 'Todos';
  protected productSearch = '';
  protected productViewMode: ProductViewMode = 'lista';
  protected stockFilterMode: StockFilterMode = 'in_stock';
  protected clienteMode: ClienteComandaMode = 'cadastrado';
  protected clienteSearchTerm = '';
  protected selectedClienteId = '';
  protected manualClienteNome = '';
  protected selectedMesaId = '';
  protected errorMessage = '';
  protected isSavingComanda = false;
  protected items: ItemComanda[] = [];

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['editingComanda'] || changes['initialMesaId']) {
      this.initializeForm();
    }
  }

  protected get isEditing(): boolean {
    return Boolean(this.editingComanda);
  }

  protected get isMesaPreselected(): boolean {
    return Boolean(this.initialMesaId && !this.editingComanda);
  }

  protected get modalTitle(): string {
    return this.isEditing ? 'Editar comanda' : 'Criar nova comanda';
  }

  protected get primaryActionLabel(): string {
    if (this.isEditing) {
      return 'Salvar alterações';
    }

    if (this.selectedMesaId) {
      return `Criar comanda na ${this.selectedMesaLabel.replace(' — ', ' - ')}`;
    }

    return 'Criar comanda rápida';
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
    return this.getFilteredProducts();
  }

  protected get emptyProductsTitle(): string {
    return this.produtosService.normalizeText(this.productSearch)
      ? 'Nenhum produto encontrado para essa busca'
      : 'Nenhum produto encontrado';
  }

  protected get emptyProductsDescription(): string {
    return 'Ajuste a busca, categoria ou filtro de estoque selecionado.';
  }

  private getFilteredProducts(): Produto[] {
    return this.activeProducts.filter((produto) => {
      const matchesCategory =
        this.activeCategory === 'Todos' || produto.categoria === this.activeCategory;
      const matchesSearch = this.produtosService.productMatchesSearch(produto, this.productSearch);
      const matchesStockFilter = this.stockFilterMode === 'all' || this.isProductAvailable(produto);

      return matchesCategory && matchesSearch && matchesStockFilter;
    });
  }

  protected get canEditComanda(): boolean {
    return !this.editingComanda || this.comandasService.isComandaAberta(this.editingComanda);
  }

  protected get hasValidCustomer(): boolean {
    if (this.clienteMode === 'manual') {
      return this.getTypedClienteName().length >= 2;
    }

    return Boolean(this.selectedClienteId);
  }

  protected get hasValidItems(): boolean {
    return this.items.length > 0 && this.items.every((item) => item.quantidade > 0);
  }

  protected get canSave(): boolean {
    return this.canEditComanda && this.hasValidCustomer && this.hasValidItems;
  }

  protected get selectedMesaLabel(): string {
    const mesa = this.getSelectedMesa();

    if (!mesa) {
      return 'Comanda rápida sem mesa vinculada';
    }

    return `Mesa ${this.formatMesaNumber(mesa)}${mesa.nome ? ' — ' + mesa.nome : ''}`;
  }

  protected get selectedClienteLabel(): string {
    if (this.clienteMode === 'manual') {
      return this.getTypedClienteName() || 'Cliente não informado';
    }

    const cliente = this.clientes.find(
      (currentCliente) => currentCliente.id === this.selectedClienteId,
    );
    return cliente?.nome ?? 'Cliente não selecionado';
  }

  protected get activeStepIndex(): number {
    return Math.max(
      this.workflowTabs.findIndex((tab) => tab.id === this.activeStep),
      0,
    );
  }

  protected get activeStepLabel(): string {
    return this.workflowTabs[this.activeStepIndex]?.label ?? 'Cliente e mesa';
  }

  protected get footerSummaryLabel(): string {
    const itemLabel = `${this.items.length} ${this.items.length === 1 ? 'item' : 'itens'}`;
    return `${itemLabel} • ${this.formatCurrency(this.getTotal())}`;
  }

  protected clearStepFeedback(): void {
    this.errorMessage = '';
  }

  protected onClienteSearchChange(value: string): void {
    this.errorMessage = '';
    this.clienteSearchTerm = value;

    const selectedCliente = this.findClienteBySearchTerm(value);

    if (selectedCliente) {
      this.clienteMode = 'cadastrado';
      this.selectedClienteId = selectedCliente.id;
      this.manualClienteNome = '';
      return;
    }

    this.clienteMode = 'manual';
    this.selectedClienteId = '';
    this.manualClienteNome = value;
  }

  protected selectStep(step: QuickComandaStep): void {
    if (step === this.activeStep) {
      return;
    }

    if (this.canSelectStep(step)) {
      this.activeStep = step;
      this.errorMessage = '';
      return;
    }

    if (step === 'produtos') {
      this.validateCustomerStep();
      return;
    }

    if (step === 'resumo') {
      if (!this.validateCustomerStep()) {
        return;
      }
      this.validateItemsStep();
    }
  }

  protected canSelectStep(step: QuickComandaStep): boolean {
    if (step === 'cliente') {
      return true;
    }

    if (step === 'produtos') {
      return this.hasValidCustomer;
    }

    return this.hasValidCustomer && this.hasValidItems;
  }

  protected isStepCompleted(step: QuickComandaStep): boolean {
    if (step === 'cliente') {
      return this.hasValidCustomer;
    }

    if (step === 'produtos') {
      return this.hasValidItems;
    }

    return this.canSave;
  }

  protected nextStep(): void {
    if (this.activeStep === 'cliente') {
      if (!this.validateCustomerStep()) {
        return;
      }

      this.activeStep = 'produtos';
      this.errorMessage = '';
      return;
    }

    if (this.activeStep === 'produtos') {
      if (!this.validateItemsStep()) {
        return;
      }

      this.activeStep = 'resumo';
      this.errorMessage = '';
    }
  }

  protected previousStep(): void {
    this.errorMessage = '';

    if (this.activeStep === 'resumo') {
      this.activeStep = 'produtos';
      return;
    }

    if (this.activeStep === 'produtos') {
      this.activeStep = 'cliente';
    }
  }

  protected setActiveCategory(category: CategoryTab): void {
    this.activeCategory = category;
  }

  protected setProductViewMode(viewMode: ProductViewMode): void {
    this.productViewMode = viewMode;
  }

  protected setStockFilterMode(mode: StockFilterMode): void {
    this.stockFilterMode = mode;
    this.errorMessage = '';
  }

  protected isProductSelected(produto: Produto): boolean {
    return this.items.some((item) => item.productId === produto.id);
  }

  protected getQuantity(produto: Produto): number {
    return this.getSelectedQuantity(produto);
  }

  protected incrementQuantity(produto: Produto): void {
    if (!this.canEditComanda || !this.canIncreaseProduct(produto)) {
      if (this.canEditComanda) {
        this.errorMessage = this.getStockErrorMessage(produto);
      }
      return;
    }

    const existingItem = this.items.find((item) => item.productId === produto.id);

    if (existingItem) {
      this.changeItemQuantity(existingItem, existingItem.quantidade + 1);
      return;
    }

    this.addProductWithQuantity(produto, 1);
  }

  protected decrementQuantity(produto: Produto): void {
    if (!this.canEditComanda) {
      return;
    }

    const existingItem = this.items.find((item) => item.productId === produto.id);

    if (!existingItem) {
      return;
    }

    this.changeItemQuantity(existingItem, existingItem.quantidade - 1);
  }

  protected addItem(produto: Produto): void {
    if (!this.canEditComanda) {
      return;
    }

    this.errorMessage = '';

    if (!this.canAddProduct(produto)) {
      this.errorMessage = this.getStockErrorMessage(produto);
      return;
    }

    const existingItem = this.items.find((item) => item.productId === produto.id);

    if (existingItem) {
      this.changeItemQuantity(existingItem, existingItem.quantidade + 1);
      return;
    }

    this.addProductWithQuantity(produto, 1);
  }

  private addProductWithQuantity(produto: Produto, quantidade: number): void {
    this.items = [
      ...this.items,
      {
        id: `${produto.id}-${Date.now()}`,
        productId: produto.id,
        nome: produto.nome,
        tamanho: produto.tamanho,
        quantidade,
        precoUnitario: produto.preco,
        unitCost: produto.costPrice,
        totalCost: quantidade * produto.costPrice,
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

    const produto = this.activeProducts.find(
      (currentProduto) => currentProduto.id === itemToChange.productId,
    );

    if (
      produto &&
      this.produtosService.productControlsStock(produto) &&
      nextQuantity > this.getProductTotalStock(produto)
    ) {
      this.errorMessage = 'Quantidade solicitada maior que o estoque disponível.';
      return;
    }

    this.items = this.items.map((item) =>
      item.id === itemToChange.id
        ? {
            ...item,
            quantidade: nextQuantity,
            totalCost: nextQuantity * (item.unitCost ?? 0),
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

  protected async saveComanda(): Promise<void> {
    this.errorMessage = '';

    if (this.isSavingComanda) {
      return;
    }

    if (!this.canEditComanda) {
      this.errorMessage = 'Esta comanda já foi finalizada e não pode mais ser alterada.';
      this.activeStep = 'resumo';
      return;
    }

    if (!this.validateCustomerStep()) {
      return;
    }

    if (!this.validateItemsStep()) {
      return;
    }

    const selectedCliente =
      this.clientes.find((cliente) => cliente.id === this.selectedClienteId) ??
      this.findClienteBySearchTerm(this.clienteSearchTerm);
    const clienteNome =
      this.clienteMode === 'manual' ? this.getTypedClienteName() : selectedCliente?.nome;

    if (!clienteNome) {
      this.errorMessage =
        this.clienteMode === 'manual'
          ? 'Informe o nome do cliente responsável.'
          : 'Selecione um cliente ou digite um nome para a comanda.';
      this.activeStep = 'cliente';
      return;
    }

    this.isSavingComanda = true;
    const payload = {
      clienteId: this.clienteMode === 'manual' ? undefined : selectedCliente?.id,
      clienteNome,
      clienteManual: this.clienteMode === 'manual',
      items: this.items,
      mesaId: this.selectedMesaId || undefined,
    };

    let comanda: Comanda | null = null;

    try {
      comanda = this.editingComanda
        ? await this.comandasService.updateComanda(this.editingComanda.id, payload)
        : await this.comandasService.createComanda(payload);
    } catch (error) {
      this.isSavingComanda = false;
      this.errorMessage =
        error instanceof Error ? error.message : 'Não foi possível salvar a comanda no banco.';
      this.activeStep = 'produtos';
      return;
    }

    if (!comanda) {
      this.isSavingComanda = false;
      this.errorMessage = 'Não foi possível encontrar a comanda para edição.';
      return;
    }

    this.saved.emit(comanda);
  }

  protected getTotal(): number {
    return this.items.reduce((total, item) => total + item.subtotal, 0);
  }

  protected hasProductStock(produto: Produto): boolean {
    return this.isProductAvailable(produto);
  }

  protected canIncreaseProduct(produto: Produto): boolean {
    if (!this.isProductAvailable(produto)) {
      return false;
    }

    if (!this.produtosService.productControlsStock(produto)) {
      return true;
    }

    return this.getRemainingStock(produto) > 0;
  }

  protected canAddProduct(produto: Produto): boolean {
    if (!this.isProductAvailable(produto)) {
      return false;
    }

    if (!this.produtosService.productControlsStock(produto)) {
      return true;
    }

    return this.getRemainingStock(produto) > 0;
  }

  protected getStockBadgeLabel(produto: Produto): string {
    if (!this.produtosService.productControlsStock(produto)) {
      return 'Disponível';
    }

    const totalStock = this.getProductTotalStock(produto);

    if (totalStock <= 0) {
      return 'Sem estoque';
    }

    return `Estoque: ${totalStock} · Selecionado: ${this.getSelectedQuantity(produto)} · Disponível: ${this.getRemainingStock(produto)}`;
  }

  protected getAddProductLabel(produto: Produto): string {
    if (!this.isProductAvailable(produto)) {
      return 'Sem estoque';
    }

    if (this.produtosService.productControlsStock(produto) && !this.canAddProduct(produto)) {
      return 'Limite atingido';
    }

    return this.getSelectedQuantity(produto) > 0 ? 'Adicionar mais' : 'Adicionar';
  }

  private getStockErrorMessage(produto: Produto): string {
    if (!produto.ativo) {
      return 'Produto inativo.';
    }

    if (!this.produtosService.productControlsStock(produto)) {
      return '';
    }

    return this.getProductTotalStock(produto) <= 0
      ? 'Produto sem estoque disponível.'
      : 'Quantidade solicitada maior que o estoque disponível.';
  }

  private getSelectedQuantity(produto: Produto): number {
    return this.items.find((item) => item.productId === produto.id)?.quantidade ?? 0;
  }

  private getProductTotalStock(produto: Produto): number {
    const selectedQuantity = this.getSelectedQuantity(produto);
    return (Number(produto.stockQuantity) || 0) + (this.isEditing ? selectedQuantity : 0);
  }

  private getRemainingStock(produto: Produto): number {
    if (!this.produtosService.productControlsStock(produto)) {
      return Number.POSITIVE_INFINITY;
    }

    const selectedQuantity = this.getSelectedQuantity(produto);
    const stockQuantity = Number(produto.stockQuantity) || 0;

    return Math.max(0, this.isEditing ? stockQuantity : stockQuantity - selectedQuantity);
  }

  private isProductAvailable(produto: Produto): boolean {
    if (!produto.ativo) {
      return false;
    }

    if (!this.produtosService.productControlsStock(produto)) {
      return true;
    }

    return this.getProductTotalStock(produto) > 0;
  }

  protected formatMesaNumber(mesa: Mesa): string {
    return String(mesa.numero).padStart(2, '0');
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

  private initializeForm(): void {
    this.errorMessage = '';
    this.isSavingComanda = false;
    this.activeStep = 'cliente';
    this.productSearch = '';
    this.productViewMode = 'lista';

    if (this.editingComanda) {
      this.clienteMode =
        this.editingComanda.clienteManual || !this.editingComanda.clienteId
          ? 'manual'
          : 'cadastrado';
      this.selectedClienteId =
        this.clienteMode === 'cadastrado' ? (this.editingComanda.clienteId ?? '') : '';
      this.manualClienteNome =
        this.clienteMode === 'manual' ? (this.editingComanda.clienteNome ?? '') : '';
      this.clienteSearchTerm =
        this.clienteMode === 'cadastrado'
          ? this.getClienteOptionLabelById(this.selectedClienteId)
          : this.manualClienteNome;
      this.selectedMesaId = this.editingComanda.mesaId ?? '';
      this.items = this.editingComanda.itens.map((item) => ({ ...item }));
      return;
    }

    this.clienteMode = 'manual';
    this.clienteSearchTerm = '';
    this.selectedClienteId = '';
    this.manualClienteNome = '';
    this.selectedMesaId = this.initialMesaId || '';
    this.items = [];
  }

  private validateCustomerStep(): boolean {
    if (!this.canEditComanda) {
      this.errorMessage = 'Esta comanda já foi finalizada e não pode mais ser alterada.';
      return false;
    }

    if (this.hasValidCustomer) {
      return true;
    }

    this.activeStep = 'cliente';
    this.errorMessage = 'Informe o cliente responsável para avançar.';
    return false;
  }

  private validateItemsStep(): boolean {
    if (this.hasValidItems) {
      return true;
    }

    this.activeStep = 'produtos';
    this.errorMessage = 'Adicione pelo menos um item à comanda para avançar.';
    return false;
  }

  private getSelectedMesa(): Mesa | undefined {
    return this.mesasDisponiveis.find((mesa) => mesa.id === this.selectedMesaId);
  }

  protected getClienteOptionLabel(cliente: Cliente): string {
    return `${cliente.nome} - ${cliente.cpf}`;
  }

  private getClienteOptionLabelById(clienteId: string): string {
    const cliente = this.clientes.find((currentCliente) => currentCliente.id === clienteId);
    return cliente ? this.getClienteOptionLabel(cliente) : '';
  }

  private findClienteBySearchTerm(value: string): Cliente | undefined {
    const normalizedValue = this.normalizeClienteSearch(value);

    if (!normalizedValue) {
      return undefined;
    }

    return this.clientes.find((cliente) => {
      const optionLabel = this.normalizeClienteSearch(this.getClienteOptionLabel(cliente));
      const nome = this.normalizeClienteSearch(cliente.nome);
      const cpf = this.normalizeClienteSearch(cliente.cpf);

      return optionLabel === normalizedValue || nome === normalizedValue || cpf === normalizedValue;
    });
  }

  private getTypedClienteName(): string {
    return this.clienteSearchTerm.trim();
  }

  private normalizeClienteSearch(value: string): string {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '');
  }
}
