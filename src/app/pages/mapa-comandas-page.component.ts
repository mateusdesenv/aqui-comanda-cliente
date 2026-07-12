import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ComandaCardComponent } from '../components/comanda-card.component';
import { ComandaDetailModalComponent } from '../components/comanda-detail-modal.component';
import { QuickComandaModalComponent } from '../components/quick-comanda-modal.component';
import { IconComponent } from '../components/icon.component';
import { StatCardComponent } from '../components/stat-card.component';
import { Comanda, MapaMesaCard, Mesa, ResumoComandas } from '../models/app-data';
import { ComandasService } from '../services/comandas.service';
import { CaixaService } from '../services/caixa.service';
import { MesasService } from '../services/mesas.service';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-mapa-comandas-page',
  standalone: true,
  imports: [
    FormsModule,
    RouterLink,
    IconComponent,
    StatCardComponent,
    ComandaCardComponent,
    ComandaDetailModalComponent,
    QuickComandaModalComponent,
  ],
  template: `
    <div class="page-stack">
      <section class="page-head">
        <div>
          <h1>Mapa de Comandas</h1>
          <p>Visualize rapidamente as mesas livres, ocupadas e reservadas.</p>
        </div>

        <label class="page-search" aria-label="Buscar mesa pelo número ou nome">
          <app-icon name="search" [size]="24" />
          <input
            type="search"
            placeholder="Buscar mesa pelo número ou nome"
            [(ngModel)]="search"
          />
        </label>
      </section>

      @if (feedbackMessage) {
        <section class="map-feedback">{{ feedbackMessage }}</section>
      }

      <section class="stats-grid summary-cards-scroll" aria-label="Resumo das mesas">
        <app-stat-card icon="check" label="Livres" [value]="resumo.livres" [helper]="getLivreHelper()" variant="green" />
        <app-stat-card icon="users" label="Ocupadas" [value]="resumo.ocupadas" [helper]="getOcupadaHelper()" variant="amber" />
        <app-stat-card icon="dollar" label="Total em consumo" [value]="formatCurrency(resumo.totalEmConsumo)" helper="Valor total nas ocupadas" variant="dark" />
        <app-stat-card icon="commandMap" label="Total de mesas" [value]="resumo.totalMesas" helper="Mesas ativas" variant="neutral" />
      </section>

      @if (cards.length > 0) {
        <section class="comandas-grid" aria-label="Grade de mesas">
          @for (card of filteredCards; track card.mesa.id) {
            <app-comanda-card [card]="card" (selected)="openMesaModal($event)" />
          }
        </section>
      } @else {
        <section class="empty-state empty-map-state">
          <strong>Nenhuma mesa cadastrada</strong>
          <span>Cadastre mesas para que elas apareçam no mapa de comandas.</span>
          <a routerLink="/mesas">Cadastrar mesa</a>
        </section>
      }

      @if (cards.length > 0 && filteredCards.length === 0) {
        <section class="empty-state">
          <strong>Nenhuma mesa encontrada</strong>
          <span>Confira o número ou nome digitado e tente novamente.</span>
        </section>
      }

      @if (quickComandas.length > 0) {
        <section class="quick-comandas-panel" aria-label="Comandas rápidas abertas">
          <div class="quick-comandas-head">
            <div>
              <h2>Comandas rápidas abertas</h2>
              <span>{{ quickComandas.length }} comandas rápidas sem mesa vinculada</span>
            </div>
          </div>

          <div class="quick-comandas-list">
            @for (comanda of quickComandas; track comanda.id) {
              <article class="quick-comanda-card">
                <div>
                  <strong [class.registered-client-name]="isRegisteredClienteComanda(comanda)">{{ comanda.clienteNome || 'Cliente não informado' }}</strong>
                  <small>{{ comanda.itens.length }} itens lançados · sem mesa</small>
                </div>
                <span>{{ formatCurrency(comanda.total) }}</span>
                <div class="quick-comanda-actions">
                  @if (canWriteMapa) {
                    <button class="quick-comanda-edit-button" type="button" (click)="editQuickComanda(comanda)">Editar</button>
                    <button class="quick-comanda-close-button" type="button" (click)="openQuickFinishConfirmation(comanda)">Finalizar</button>
                  } @else {
                    <span class="readonly-chip">Somente leitura</span>
                  }
                </div>
              </article>
            }
          </div>
        </section>
      }

      @if (canWriteMapa) {
        <button
          class="floating-comanda-button"
          type="button"
          aria-label="Criar nova comanda"
          (click)="openQuickComandaModal()"
        >
          <app-icon name="receipt" [size]="22" />
          <span>Criar nova comanda</span>
        </button>
      }

      @if (selectedMesa) {
        <app-comanda-detail-modal
          [mesa]="selectedMesa"
          [canWrite]="canWriteMapa"
          (close)="closeComandaModal()"
          (createForMesa)="openQuickComandaModalForMesa($event)"
        />
      }

      @if (quickComandaModalOpen) {
        <app-quick-comanda-modal
          [editingComanda]="editingQuickComanda"
          [initialMesaId]="quickComandaInitialMesaId"
          (close)="closeQuickComandaModal()"
          (saved)="handleQuickComandaSaved($event)"
        />
      }

      @if (quickFinishCandidate) {
        <section class="confirmation-dialog" role="dialog" aria-modal="true" aria-labelledby="quick-finish-title">
          <div class="confirmation-card">
            <h3 id="quick-finish-title">Finalizar comanda rápida</h3>
            <p>Confirme o encerramento. Depois de paga, esta comanda rápida sai da lista de abertas e não poderá receber novos itens.</p>

            <div class="confirmation-summary">
              <span>Cliente</span>
              <strong [class.registered-client-name]="isRegisteredClienteComanda(quickFinishCandidate)">{{ quickFinishCandidate.clienteNome || 'Cliente não informado' }}</strong>

              <span>Tipo</span>
              <strong>Comanda rápida sem mesa</strong>

              <span>Total final</span>
              <strong>{{ formatCurrency(quickFinishCandidate.total) }}</strong>
            </div>

            <div class="confirmation-items">
              @for (item of quickFinishCandidate.itens; track item.id) {
                <div>
                  <span>{{ item.quantidade }}x {{ item.nome }}</span>
                  <strong>{{ formatCurrency(item.subtotal) }}</strong>
                </div>
              }
            </div>

            <div class="confirmation-actions">
              <button class="modal-secondary-action" type="button" (click)="cancelQuickFinishConfirmation()">Cancelar</button>
              <button class="modal-primary-action" type="button" (click)="confirmQuickFinishComanda()">Encerrar e marcar como paga</button>
            </div>
          </div>
        </section>
      }
    </div>
  `,
})
export class MapaComandasPageComponent {
  private readonly comandasService = inject(ComandasService);
  private readonly caixaService = inject(CaixaService);
  private readonly mesasService = inject(MesasService);
  private readonly authService = inject(AuthService);

  protected get canWriteMapa(): boolean {
    return this.authService.canWrite('mapa');
  }

  protected search = '';
  protected feedbackMessage = '';
  protected selectedMesa: Mesa | null = null;
  protected quickComandaModalOpen = false;
  protected editingQuickComanda: Comanda | null = null;
  protected quickComandaInitialMesaId = '';
  protected quickFinishCandidate: Comanda | null = null;

  protected get cards(): MapaMesaCard[] {
    return this.comandasService.getCardsForMesas(this.mesasService.mesas());
  }

  protected get resumo(): ResumoComandas {
    return this.comandasService.getResumoForMesas(this.mesasService.mesas());
  }

  protected get quickComandas(): Comanda[] {
    return this.comandasService.getQuickComandas();
  }

  protected get filteredCards(): MapaMesaCard[] {
    const normalized = this.search.trim().toLowerCase();

    if (!normalized) {
      return this.cards;
    }

    const onlyNumbers = normalized.replace(/\D/g, '');

    return this.cards.filter((card) => {
      const mesaNumber = String(card.mesa.numero);
      const paddedNumber = mesaNumber.padStart(2, '0');
      const mesaName = (card.mesa.nome ?? '').toLowerCase();

      return (
        (onlyNumbers.length > 0 &&
          (mesaNumber.includes(onlyNumbers) || paddedNumber.includes(onlyNumbers))) ||
        mesaName.includes(normalized)
      );
    });
  }

  protected formatCurrency(value: number): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  }

  protected openMesaModal(card: MapaMesaCard): void {
    this.feedbackMessage = '';

    if (card.status === 'inativa') {
      this.feedbackMessage = 'Mesa inativa não pode abrir comanda.';
      return;
    }

    this.selectedMesa = card.mesa;
  }

  protected closeComandaModal(): void {
    this.selectedMesa = null;
  }

  protected openQuickComandaModal(): void {
    if (!this.ensureCanWrite()) {
      return;
    }

    this.feedbackMessage = '';
    this.editingQuickComanda = null;
    this.quickComandaInitialMesaId = '';
    this.quickComandaModalOpen = true;
  }

  protected openQuickComandaModalForMesa(mesa: Mesa): void {
    if (!this.ensureCanWrite()) {
      return;
    }

    this.feedbackMessage = '';
    this.editingQuickComanda = null;
    this.quickComandaInitialMesaId = mesa.id;
    this.quickComandaModalOpen = true;
  }

  protected editQuickComanda(comanda: Comanda): void {
    if (!this.ensureCanWrite()) {
      return;
    }

    this.feedbackMessage = '';
    this.editingQuickComanda = comanda;
    this.quickComandaInitialMesaId = '';
    this.quickComandaModalOpen = true;
  }

  protected openQuickFinishConfirmation(comanda: Comanda): void {
    if (!this.ensureCanWrite()) {
      return;
    }

    this.feedbackMessage = '';
    this.quickFinishCandidate = comanda;
  }

  protected cancelQuickFinishConfirmation(): void {
    this.quickFinishCandidate = null;
  }

  protected async confirmQuickFinishComanda(): Promise<void> {
    if (!this.quickFinishCandidate || !this.ensureCanWrite()) {
      return;
    }

    if (!this.caixaService.hasCaixaAberto()) {
      this.quickFinishCandidate = null;
      this.feedbackMessage = 'Abra o caixa antes de registrar pagamentos.';
      return;
    }

    const clienteNome = this.quickFinishCandidate.clienteNome ?? 'cliente';
    const candidateId = this.quickFinishCandidate.id;
    this.quickFinishCandidate = null;

    let finalized: Comanda | null = null;
    try {
      finalized = await this.comandasService.finalizeComandaById(candidateId);
    } catch (error) {
      this.feedbackMessage =
        error instanceof Error ? error.message : 'Não foi possível registrar a comanda no caixa.';
      return;
    }

    if (!finalized) {
      this.feedbackMessage = 'Não foi possível finalizar a comanda rápida. Verifique se ela ainda está aberta e possui itens.';
      return;
    }

    this.feedbackMessage = `Comanda rápida de ${clienteNome} finalizada, marcada como paga e registrada no caixa.`;
  }

  protected closeQuickComandaModal(): void {
    this.quickComandaModalOpen = false;
    this.editingQuickComanda = null;
    this.quickComandaInitialMesaId = '';
  }

  protected handleQuickComandaSaved(comanda: Comanda): void {
    const wasEditing = Boolean(this.editingQuickComanda);
    this.quickComandaModalOpen = false;
    this.editingQuickComanda = null;
    this.quickComandaInitialMesaId = '';

    if (comanda.mesaId) {
      this.feedbackMessage = `Comanda ${wasEditing ? 'atualizada' : 'criada'} para ${comanda.clienteNome ?? 'cliente selecionado'} e vinculada à ${this.getMesaLabel(comanda.mesaId)}.`;
      return;
    }

    this.feedbackMessage = `Comanda rápida ${wasEditing ? 'atualizada' : 'criada'} para ${comanda.clienteNome ?? 'cliente selecionado'}.`;
  }

  protected closeQuickComanda(comanda: Comanda): void {
    this.openQuickFinishConfirmation(comanda);
  }

  protected getMesaLabel(mesaId: string): string {
    const mesa = this.mesasService.getMesas().find((currentMesa) => currentMesa.id === mesaId);

    if (!mesa) {
      return 'mesa selecionada';
    }

    return `Mesa ${String(mesa.numero).padStart(2, '0')}`;
  }

  protected isRegisteredClienteComanda(comanda: Comanda | null): boolean {
    return Boolean(comanda?.clienteId);
  }


  protected getLivreHelper(): string {
    return `${this.getPercent(this.resumo.livres)}% das mesas ativas`;
  }

  protected getOcupadaHelper(): string {
    return `${this.getPercent(this.resumo.ocupadas)}% das mesas ativas`;
  }

  private ensureCanWrite(): boolean {
    if (this.canWriteMapa) {
      return true;
    }

    this.feedbackMessage = 'Você não tem permissão de escrita no Mapa de Comandas.';
    return false;
  }

  private getPercent(value: number): number {
    if (this.resumo.totalMesas === 0) {
      return 0;
    }

    return Math.round((value / this.resumo.totalMesas) * 100);
  }
}
