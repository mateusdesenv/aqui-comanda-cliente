import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { IconComponent } from '../components/icon.component';
import { StatCardComponent } from '../components/stat-card.component';
import {
  Cliente,
  ItemPedido,
  Pedido,
  PedidoPaymentMethod,
  PedidoStatus,
  ProductCategory,
  Produto,
} from '../models/app-data';
import { ClientesService } from '../services/clientes.service';
import { PedidoPayload, PedidosService } from '../services/pedidos.service';
import { ProdutosService } from '../services/produtos.service';

type CategoryTab = ProductCategory | 'Todos';

interface PedidoFormModel {
  clienteId: string;
  clienteNome: string;
  telefone: string;
  enderecoEntrega: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  observacoesEntrega: string;
  formaPagamento: '' | PedidoPaymentMethod;
  trocoPara: number | null;
  observacoesPedido: string;
}

@Component({
  selector: 'app-pedidos-page',
  standalone: true,
  imports: [FormsModule, RouterLink, IconComponent, StatCardComponent],
  template: `
    <div class="page-stack pedidos-page">
      <section class="page-head pedidos-head">
        <div>
          <h1>Pedidos</h1>
          <p>Gerencie os pedidos para entrega sem misturar delivery com mesas e comandas.</p>
        </div>

        <label class="page-search" aria-label="Buscar pedido por cliente, código ou endereço">
          <app-icon name="search" [size]="24" />
          <input
            type="search"
            placeholder="Buscar pedido, cliente ou endereço"
            [(ngModel)]="search"
          />
        </label>
      </section>

      @if (feedbackMessage) {
        <section class="map-feedback">{{ feedbackMessage }}</section>
      }

      <section class="stats-grid" aria-label="Resumo dos pedidos">
        <app-stat-card icon="receipt" label="Abertos" [value]="totalByStatus('aberto')" helper="Pedidos aguardando preparo" variant="green" />
        <app-stat-card icon="cards" label="Em preparo" [value]="totalByStatus('em_preparo')" helper="Pedidos na cozinha" variant="amber" />
        <app-stat-card icon="bell" label="Em entrega" [value]="totalByStatus('saiu_entrega')" helper="Pedidos a caminho" variant="neutral" />
        <app-stat-card icon="dollar" label="Total ativo" [value]="formatCurrency(totalAtivo)" helper="Aberto + preparo + entrega" variant="dark" />
      </section>

      <section class="pedidos-list-panel" aria-label="Lista de pedidos para entrega">
        <div class="quick-comandas-head pedidos-list-head">
          <div>
            <h2>Pedidos para entrega</h2>
            <span>{{ filteredPedidos.length }} pedidos encontrados · {{ pedidos.length }} cadastrados</span>
          </div>

          <button class="modal-primary-action pedidos-head-action" type="button" (click)="openCreateModal()">
            Novo pedido
          </button>
        </div>

        <div class="pedidos-list">
          @for (pedido of filteredPedidos; track pedido.id) {
            <article class="pedido-card">
              <header class="pedido-card-header">
                <div>
                  <span class="pedido-code">{{ pedido.codigo }}</span>
                  <strong>{{ pedido.clienteNome }}</strong>
                  <small>{{ formatDateTime(pedido.createdAt) }}</small>
                </div>

                <span
                  class="pedido-status"
                  [class.aberto]="pedido.status === 'aberto'"
                  [class.em-preparo]="pedido.status === 'em_preparo'"
                  [class.saiu-entrega]="pedido.status === 'saiu_entrega'"
                  [class.entregue]="pedido.status === 'entregue'"
                  [class.cancelado]="pedido.status === 'cancelado'"
                >
                  {{ getStatusLabel(pedido.status) }}
                </span>
              </header>

              <div class="pedido-card-body">
                <div class="pedido-info-line">
                  <span>Endereço</span>
                  <strong>{{ formatAddress(pedido) }}</strong>
                </div>

                <div class="pedido-info-grid">
                  <div>
                    <span>Telefone</span>
                    <strong>{{ pedido.telefone || '-' }}</strong>
                  </div>
                  <div>
                    <span>Itens</span>
                    <strong>{{ getItemsCount(pedido) }}</strong>
                  </div>
                  <div>
                    <span>Total</span>
                    <strong>{{ formatCurrency(pedido.total) }}</strong>
                  </div>
                </div>
              </div>

              <footer class="pedido-card-actions">
                <button type="button" (click)="openDetails(pedido)">Visualizar</button>
                <button type="button" [disabled]="!canEdit(pedido)" (click)="openEditModal(pedido)">Editar</button>
                <select
                  class="pedido-status-select"
                  name="status-{{ pedido.id }}"
                  [ngModel]="pedido.status"
                  (ngModelChange)="changeStatus(pedido, $event)"
                  aria-label="Alterar status do pedido"
                >
                  @for (status of statusOptions; track status.value) {
                    <option [value]="status.value">{{ status.label }}</option>
                  }
                </select>
                <button class="danger" type="button" [disabled]="pedido.status === 'cancelado'" (click)="cancelPedido(pedido)">Cancelar</button>
                <button class="success" type="button" [disabled]="pedido.status === 'entregue'" (click)="markAsDelivered(pedido)">Entregue</button>
              </footer>
            </article>
          } @empty {
            <section class="empty-state pedidos-empty-state">
              <strong>Nenhum pedido para entrega cadastrado ainda.</strong>
              <span>Crie o primeiro pedido para controlar cliente, endereço, itens, pagamento e status.</span>
              <button type="button" (click)="openCreateModal()">Criar primeiro pedido</button>
            </section>
          }
        </div>
      </section>

      <button
        class="floating-comanda-button"
        type="button"
        aria-label="Criar novo pedido para entrega"
        (click)="openCreateModal()"
      >
        <app-icon name="bell" [size]="22" />
        <span>Novo pedido</span>
      </button>

      @if (pedidoModalOpen) {
        <div class="comanda-modal-overlay" role="presentation">
          <section
            class="comanda-modal pedido-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="pedido-modal-title"
          >
            <button
              class="modal-close-button"
              type="button"
              aria-label="Fechar modal de pedido"
              (click)="closePedidoModal()"
            >
              X
            </button>

            <header class="comanda-modal-header">
              <button class="modal-back-button" type="button" (click)="closePedidoModal()">
                ← Voltar para pedidos
              </button>

              <div class="modal-title-row">
                <h2 id="pedido-modal-title">{{ editingPedido ? 'Editar pedido' : 'Novo pedido para entrega' }}</h2>
                <span class="modal-status-badge free">DELIVERY</span>
              </div>

              <p>
                Informe cliente, endereço de entrega, pagamento e selecione os itens do cardápio.
                Pedido de entrega é independente de mesas e comandas.
              </p>
            </header>

            <div class="pedido-form-strip">
              <section class="pedido-form-card">
                <h3>Cliente e entrega</h3>

                <div class="pedido-form-grid">
                  <label>
                    Cliente
                    <select name="cliente" [(ngModel)]="form.clienteId" (ngModelChange)="onClienteChange($event)">
                      <option value="">Selecione um cliente</option>
                      @for (cliente of clientes; track cliente.id) {
                        <option [value]="cliente.id">{{ cliente.nome }} — {{ cliente.cpf }}</option>
                      }
                    </select>
                  </label>

                  <label>
                    Telefone <span class="optional-label">opcional</span>
                    <input
                      type="tel"
                      name="telefone"
                      placeholder="(00) 00000-0000"
                      [(ngModel)]="form.telefone"
                    />
                  </label>

                  <label class="span-2">
                    Endereço de entrega
                    <input
                      type="text"
                      name="enderecoEntrega"
                      required
                      placeholder="Rua, avenida, travessa..."
                      [(ngModel)]="form.enderecoEntrega"
                      (ngModelChange)="errorMessage = ''"
                    />
                  </label>

                  <label>
                    Número <span class="optional-label">opcional</span>
                    <input type="text" name="numero" placeholder="Ex.: 120" [(ngModel)]="form.numero" />
                  </label>

                  <label>
                    Bairro <span class="optional-label">opcional</span>
                    <input type="text" name="bairro" placeholder="Ex.: Centro" [(ngModel)]="form.bairro" />
                  </label>

                  <label>
                    Cidade <span class="optional-label">opcional</span>
                    <input type="text" name="cidade" placeholder="Ex.: Criciúma" [(ngModel)]="form.cidade" />
                  </label>

                  <label>
                    Complemento <span class="optional-label">opcional</span>
                    <input type="text" name="complemento" placeholder="Apto, bloco, referência..." [(ngModel)]="form.complemento" />
                  </label>

                  <label class="span-2">
                    Observações da entrega <span class="optional-label">opcional</span>
                    <textarea
                      name="observacoesEntrega"
                      rows="3"
                      placeholder="Ex.: entregar na portaria, tocar campainha, referência..."
                      [(ngModel)]="form.observacoesEntrega"
                    ></textarea>
                  </label>
                </div>

                @if (clientes.length === 0) {
                  <div class="quick-helper-box pedido-helper-box">
                    <div>
                      <strong>Nenhum cliente cadastrado</strong>
                      <span>Cadastre um cliente antes de criar pedidos para entrega.</span>
                    </div>
                    <a routerLink="/clientes" (click)="closePedidoModal()">Ir para Clientes</a>
                  </div>
                }
              </section>

              <section class="pedido-form-card">
                <h3>Pagamento e observações</h3>

                <div class="pedido-form-grid">
                  <label>
                    Forma de pagamento <span class="optional-label">opcional</span>
                    <select name="formaPagamento" [(ngModel)]="form.formaPagamento">
                      <option value="">Não informado</option>
                      @for (payment of paymentOptions; track payment.value) {
                        <option [value]="payment.value">{{ payment.label }}</option>
                      }
                    </select>
                  </label>

                  @if (form.formaPagamento === 'dinheiro') {
                    <label>
                      Troco para quanto? <span class="optional-label">opcional</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        name="trocoPara"
                        placeholder="Ex.: 100.00"
                        [(ngModel)]="form.trocoPara"
                      />
                    </label>
                  }

                  <label class="span-2">
                    Observações do pedido <span class="optional-label">opcional</span>
                    <textarea
                      name="observacoesPedido"
                      rows="4"
                      placeholder="Ex.: sem cebola, levar maquininha, cliente pediu embalagem separada..."
                      [(ngModel)]="form.observacoesPedido"
                    ></textarea>
                  </label>
                </div>
              </section>
            </div>

            @if (errorMessage) {
              <div class="quick-form-feedback">{{ errorMessage }}</div>
            }

            <div class="comanda-detail-grid pedido-detail-grid">
              <section class="detail-panel menu-panel" aria-label="Cardápio do pedido">
                <div class="detail-panel-header">
                  <h3>Cardápio</h3>
                </div>

                @if (activeProducts.length > 0) {
                  <label class="pedido-product-search">
                    <app-icon name="search" [size]="20" />
                    <input
                      type="search"
                      name="productSearch"
                      placeholder="Buscar produto"
                      [(ngModel)]="productSearch"
                    />
                  </label>

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
                    <span>Cadastre ou ative produtos para adicioná-los aos pedidos.</span>
                    <a routerLink="/cardapio" (click)="closePedidoModal()">Cadastrar produto</a>
                  </div>
                }
              </section>

              <section class="detail-panel order-panel" aria-label="Resumo do pedido">
                <div class="detail-panel-header order-header">
                  <h3>Resumo do pedido</h3>
                  <button class="clear-order-button" type="button" (click)="clearPedido()">
                    Limpar itens
                  </button>
                </div>

                <div class="order-context-card">
                  <span>Entrega para</span>
                  <strong>{{ selectedClienteLabel }}</strong>
                </div>

                <div class="order-table pedido-order-table" role="table" aria-label="Itens selecionados para o pedido">
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
                        <strong>Nenhum item selecionado</strong>
                        <span>Escolha produtos do cardápio para montar o pedido.</span>
                      </div>
                    }
                  </div>
                </div>

                <footer class="order-total-panel">
                  <span>TOTAL DO PEDIDO</span>
                  <strong>{{ formatCurrency(getTotal()) }}</strong>
                </footer>

                <div class="quick-modal-actions">
                  <button class="modal-secondary-action" type="button" (click)="closePedidoModal()">
                    Cancelar
                  </button>
                  <button
                    class="modal-primary-action"
                    type="button"
                    [disabled]="!canSave"
                    (click)="savePedido()"
                  >
                    {{ editingPedido ? 'Salvar alterações' : 'Criar pedido' }}
                  </button>
                </div>
              </section>
            </div>
          </section>
        </div>
      }

      @if (detailsPedido) {
        <div class="comanda-modal-overlay" role="presentation">
          <section class="comanda-modal pedido-details-modal" role="dialog" aria-modal="true" aria-labelledby="pedido-details-title">
            <button
              class="modal-close-button"
              type="button"
              aria-label="Fechar detalhes do pedido"
              (click)="closeDetails()"
            >
              X
            </button>

            <header class="comanda-modal-header">
              <button class="modal-back-button" type="button" (click)="closeDetails()">
                ← Voltar para pedidos
              </button>

              <div class="modal-title-row">
                <h2 id="pedido-details-title">{{ detailsPedido.codigo }}</h2>
                <span
                  class="pedido-status"
                  [class.aberto]="detailsPedido.status === 'aberto'"
                  [class.em-preparo]="detailsPedido.status === 'em_preparo'"
                  [class.saiu-entrega]="detailsPedido.status === 'saiu_entrega'"
                  [class.entregue]="detailsPedido.status === 'entregue'"
                  [class.cancelado]="detailsPedido.status === 'cancelado'"
                >
                  {{ getStatusLabel(detailsPedido.status) }}
                </span>
              </div>

              <p>Detalhes completos do pedido para entrega.</p>
            </header>

            <div class="pedido-details-grid">
              <section class="pedido-details-card">
                <h3>Cliente e entrega</h3>
                <dl>
                  <div><dt>Cliente</dt><dd>{{ detailsPedido.clienteNome }}</dd></div>
                  <div><dt>Telefone</dt><dd>{{ detailsPedido.telefone || '-' }}</dd></div>
                  <div><dt>Endereço</dt><dd>{{ formatAddress(detailsPedido) }}</dd></div>
                  <div><dt>Observações da entrega</dt><dd>{{ detailsPedido.observacoesEntrega || '-' }}</dd></div>
                  <div><dt>Criado em</dt><dd>{{ formatDateTime(detailsPedido.createdAt) }}</dd></div>
                </dl>
              </section>

              <section class="pedido-details-card">
                <h3>Pagamento</h3>
                <dl>
                  <div><dt>Forma de pagamento</dt><dd>{{ getPaymentLabel(detailsPedido.formaPagamento) }}</dd></div>
                  <div><dt>Troco para</dt><dd>{{ detailsPedido.trocoPara ? formatCurrency(detailsPedido.trocoPara) : '-' }}</dd></div>
                  <div><dt>Observações do pedido</dt><dd>{{ detailsPedido.observacoesPedido || '-' }}</dd></div>
                  <div><dt>Total</dt><dd>{{ formatCurrency(detailsPedido.total) }}</dd></div>
                </dl>
              </section>
            </div>

            <section class="pedido-details-card pedido-details-items">
              <h3>Itens</h3>
              <div class="pedido-items-list">
                @for (item of detailsPedido.itens; track item.id) {
                  <div>
                    <strong>{{ item.nome }}</strong>
                    <span>{{ item.quantidade }}x · {{ formatCurrency(item.precoUnitario) }}</span>
                    <em>{{ formatCurrency(item.subtotal) }}</em>
                  </div>
                }
              </div>
            </section>
          </section>
        </div>
      }
    </div>
  `,
})
export class PedidosPageComponent {
  private readonly pedidosService = inject(PedidosService);
  private readonly clientesService = inject(ClientesService);
  private readonly produtosService = inject(ProdutosService);

  protected search = '';
  protected feedbackMessage = '';
  protected errorMessage = '';
  protected pedidoModalOpen = false;
  protected editingPedido: Pedido | null = null;
  protected detailsPedido: Pedido | null = null;
  protected activeCategory: CategoryTab = 'Todos';
  protected productSearch = '';
  protected items: ItemPedido[] = [];
  protected productQuantities: Record<string, number> = {};
  protected form: PedidoFormModel = this.createEmptyForm();

  protected readonly statusOptions: { value: PedidoStatus; label: string }[] = [
    { value: 'aberto', label: 'Aberto' },
    { value: 'em_preparo', label: 'Em preparo' },
    { value: 'saiu_entrega', label: 'Saiu para entrega' },
    { value: 'entregue', label: 'Entregue' },
    { value: 'cancelado', label: 'Cancelado' },
  ];

  protected readonly paymentOptions: { value: PedidoPaymentMethod; label: string }[] = [
    { value: 'dinheiro', label: 'Dinheiro' },
    { value: 'pix', label: 'Pix' },
    { value: 'credito', label: 'Cartão de crédito' },
    { value: 'debito', label: 'Cartão de débito' },
    { value: 'outro', label: 'Outro' },
  ];

  protected get pedidos(): Pedido[] {
    return this.pedidosService.getPedidos();
  }

  protected get clientes(): Cliente[] {
    return this.clientesService.getClientes();
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
    const normalizedSearch = this.productSearch.trim().toLowerCase();

    return this.activeProducts.filter((produto) => {
      const matchesCategory = this.activeCategory === 'Todos' || produto.categoria === this.activeCategory;
      const matchesSearch = !normalizedSearch || produto.nome.toLowerCase().includes(normalizedSearch);
      return matchesCategory && matchesSearch;
    });
  }

  protected get filteredPedidos(): Pedido[] {
    const normalized = this.search.trim().toLowerCase();

    if (!normalized) {
      return this.pedidos;
    }

    return this.pedidos.filter((pedido) => {
      const searchBase = [
        pedido.codigo,
        pedido.clienteNome,
        pedido.telefone,
        pedido.enderecoEntrega,
        pedido.numero,
        pedido.bairro,
        pedido.cidade,
        this.getStatusLabel(pedido.status),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return searchBase.includes(normalized);
    });
  }

  protected get totalAtivo(): number {
    return this.pedidosService
      .getPedidosAtivos()
      .reduce((total, pedido) => total + pedido.total, 0);
  }

  protected get canSave(): boolean {
    return Boolean(this.form.clienteId) && Boolean(this.form.enderecoEntrega.trim()) && this.items.length > 0;
  }

  protected get selectedClienteLabel(): string {
    const cliente = this.clientes.find((currentCliente) => currentCliente.id === this.form.clienteId);
    return cliente?.nome || 'Cliente ainda não selecionado';
  }

  protected openCreateModal(): void {
    this.feedbackMessage = '';
    this.errorMessage = '';
    this.editingPedido = null;
    this.detailsPedido = null;
    this.form = this.createEmptyForm();
    this.items = [];
    this.productSearch = '';
    this.activeCategory = 'Todos';
    this.initializeProductQuantities();
    this.pedidoModalOpen = true;
  }

  protected openEditModal(pedido: Pedido): void {
    if (!this.canEdit(pedido)) {
      this.feedbackMessage = 'Apenas pedidos abertos ou em preparo podem ser editados.';
      return;
    }

    this.feedbackMessage = '';
    this.errorMessage = '';
    this.detailsPedido = null;
    this.editingPedido = pedido;
    this.form = {
      clienteId: pedido.clienteId ?? '',
      clienteNome: pedido.clienteNome,
      telefone: pedido.telefone ?? '',
      enderecoEntrega: pedido.enderecoEntrega,
      numero: pedido.numero ?? '',
      complemento: pedido.complemento ?? '',
      bairro: pedido.bairro ?? '',
      cidade: pedido.cidade ?? '',
      observacoesEntrega: pedido.observacoesEntrega ?? '',
      formaPagamento: pedido.formaPagamento ?? '',
      trocoPara: pedido.trocoPara ?? null,
      observacoesPedido: pedido.observacoesPedido ?? '',
    };
    this.items = pedido.itens.map((item) => ({ ...item }));
    this.productSearch = '';
    this.activeCategory = 'Todos';
    this.initializeProductQuantities();
    this.pedidoModalOpen = true;
  }

  protected closePedidoModal(): void {
    this.pedidoModalOpen = false;
    this.editingPedido = null;
    this.errorMessage = '';
  }

  protected savePedido(): void {
    this.errorMessage = '';
    const selectedCliente = this.clientes.find((cliente) => cliente.id === this.form.clienteId);

    if (!selectedCliente) {
      this.errorMessage = 'Selecione um cliente para o pedido.';
      return;
    }

    if (!this.form.enderecoEntrega.trim()) {
      this.errorMessage = 'Informe o endereço de entrega.';
      return;
    }

    if (this.items.length === 0) {
      this.errorMessage = 'Adicione pelo menos um item ao pedido.';
      return;
    }

    const invalidItem = this.items.find((item) => item.quantidade <= 0);
    if (invalidItem) {
      this.errorMessage = 'Todos os itens precisam ter quantidade maior que zero.';
      return;
    }

    const payload: PedidoPayload = {
      clienteId: selectedCliente.id,
      clienteNome: selectedCliente.nome,
      telefone: this.form.telefone.trim() || undefined,
      enderecoEntrega: this.form.enderecoEntrega.trim(),
      numero: this.form.numero.trim() || undefined,
      complemento: this.form.complemento.trim() || undefined,
      bairro: this.form.bairro.trim() || undefined,
      cidade: this.form.cidade.trim() || undefined,
      observacoesEntrega: this.form.observacoesEntrega.trim() || undefined,
      itens: this.items,
      formaPagamento: this.form.formaPagamento || undefined,
      trocoPara: this.form.formaPagamento === 'dinheiro' && this.form.trocoPara ? this.form.trocoPara : undefined,
      observacoesPedido: this.form.observacoesPedido.trim() || undefined,
    };

    const pedido = this.editingPedido
      ? this.pedidosService.updatePedido(this.editingPedido.id, payload)
      : this.pedidosService.createPedido(payload);

    if (!pedido) {
      this.errorMessage = 'Não foi possível encontrar o pedido para edição.';
      return;
    }

    this.feedbackMessage = this.editingPedido
      ? `Pedido ${pedido.codigo} atualizado com sucesso.`
      : `Pedido ${pedido.codigo} criado com sucesso.`;

    this.closePedidoModal();
  }

  protected openDetails(pedido: Pedido): void {
    this.detailsPedido = pedido;
  }

  protected closeDetails(): void {
    this.detailsPedido = null;
  }

  protected onClienteChange(clienteId: string): void {
    this.errorMessage = '';
    const cliente = this.clientes.find((currentCliente) => currentCliente.id === clienteId);

    if (!cliente) {
      this.form.clienteNome = '';
      return;
    }

    this.form.clienteNome = cliente.nome;

    if (!this.form.enderecoEntrega.trim() && cliente.endereco) {
      this.form.enderecoEntrega = cliente.endereco;
    }
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

  protected changeItemQuantity(itemToChange: ItemPedido, nextQuantity: number): void {
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

  protected removeItem(itemToRemove: ItemPedido): void {
    this.items = this.items.filter((item) => item.id !== itemToRemove.id);
  }

  protected clearPedido(): void {
    this.items = [];
    this.errorMessage = '';
  }

  protected getTotal(): number {
    return this.items.reduce((total, item) => total + item.subtotal, 0);
  }

  protected totalByStatus(status: PedidoStatus): number {
    return this.pedidos.filter((pedido) => pedido.status === status).length;
  }

  protected canEdit(pedido: Pedido): boolean {
    return ['aberto', 'em_preparo'].includes(pedido.status);
  }

  protected changeStatus(pedido: Pedido, status: string): void {
    const nextStatus = status as PedidoStatus;
    this.pedidosService.updateStatus(pedido.id, nextStatus);
    this.feedbackMessage = `Pedido ${pedido.codigo} marcado como ${this.getStatusLabel(nextStatus).toLowerCase()}.`;
  }

  protected cancelPedido(pedido: Pedido): void {
    this.pedidosService.updateStatus(pedido.id, 'cancelado');
    this.feedbackMessage = `Pedido ${pedido.codigo} cancelado.`;
  }

  protected markAsDelivered(pedido: Pedido): void {
    this.pedidosService.updateStatus(pedido.id, 'entregue');
    this.feedbackMessage = `Pedido ${pedido.codigo} marcado como entregue.`;
  }

  protected getItemsCount(pedido: Pedido): number {
    return pedido.itens.reduce((total, item) => total + item.quantidade, 0);
  }

  protected getStatusLabel(status: PedidoStatus): string {
    return this.statusOptions.find((option) => option.value === status)?.label ?? status;
  }

  protected getPaymentLabel(payment?: PedidoPaymentMethod): string {
    if (!payment) {
      return '-';
    }

    return this.paymentOptions.find((option) => option.value === payment)?.label ?? payment;
  }

  protected formatAddress(pedido: Pedido): string {
    return [
      pedido.enderecoEntrega,
      pedido.numero,
      pedido.complemento,
      pedido.bairro,
      pedido.cidade,
    ]
      .filter(Boolean)
      .join(', ');
  }

  protected formatCurrency(value: number): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  }

  protected formatDateTime(value: string): string {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(value));
  }

  private initializeProductQuantities(): void {
    this.productQuantities = this.activeProducts.reduce<Record<string, number>>((quantities, produto) => {
      quantities[produto.id] = 1;
      return quantities;
    }, {});
  }

  private createEmptyForm(): PedidoFormModel {
    return {
      clienteId: '',
      clienteNome: '',
      telefone: '',
      enderecoEntrega: '',
      numero: '',
      complemento: '',
      bairro: '',
      cidade: '',
      observacoesEntrega: '',
      formaPagamento: '',
      trocoPara: null,
      observacoesPedido: '',
    };
  }
}
