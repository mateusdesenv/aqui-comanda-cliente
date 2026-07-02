import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ComandaCardComponent } from '../components/comanda-card.component';
import { ComandaDetailModalComponent } from '../components/comanda-detail-modal.component';
import { IconComponent } from '../components/icon.component';
import { StatCardComponent } from '../components/stat-card.component';
import { MapaMesaCard, Mesa, ResumoComandas } from '../models/app-data';
import { ComandasService } from '../services/comandas.service';
import { MesasService } from '../services/mesas.service';

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

      <section class="stats-grid" aria-label="Resumo das mesas">
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

      @if (selectedMesa) {
        <app-comanda-detail-modal
          [mesa]="selectedMesa"
          (close)="closeComandaModal()"
        />
      }
    </div>
  `,
})
export class MapaComandasPageComponent {
  private readonly comandasService = inject(ComandasService);
  private readonly mesasService = inject(MesasService);

  protected search = '';
  protected feedbackMessage = '';
  protected selectedMesa: Mesa | null = null;

  protected get cards(): MapaMesaCard[] {
    return this.comandasService.getCardsForMesas(this.mesasService.mesas());
  }

  protected get resumo(): ResumoComandas {
    return this.comandasService.getResumoForMesas(this.mesasService.mesas());
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

  protected getLivreHelper(): string {
    return `${this.getPercent(this.resumo.livres)}% das mesas ativas`;
  }

  protected getOcupadaHelper(): string {
    return `${this.getPercent(this.resumo.ocupadas)}% das mesas ativas`;
  }

  private getPercent(value: number): number {
    if (this.resumo.totalMesas === 0) {
      return 0;
    }

    return Math.round((value / this.resumo.totalMesas) * 100);
  }
}
