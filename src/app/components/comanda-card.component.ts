import { CurrencyPipe } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MapaMesaCard } from '../models/app-data';

@Component({
  selector: 'app-comanda-card',
  standalone: true,
  imports: [CurrencyPipe],
  template: `
    <button
      class="comanda-card"
      [class.occupied]="card.status === 'ocupada'"
      [class.free]="card.status === 'livre'"
      [class.reserved]="card.status === 'reservada'"
      [class.inactive]="card.status === 'inativa'"
      type="button"
      [disabled]="card.status === 'inativa'"
      [attr.aria-label]="ariaLabel"
      (click)="selected.emit(card)"
    >
      <span class="comanda-label">Mesa</span>
      <span class="comanda-number">{{ displayNumber }}</span>
      <span class="comanda-status">{{ statusLabel }}</span>
      @if (card.status === 'ocupada') {
        @if (card.mesaLiberacaoPendente) {
          <span class="comanda-count">Todas pagas</span>
          <strong class="comanda-total">Aguardando liberação</strong>
        } @else {
          <span class="comanda-count">{{ card.totalComandas }} comanda{{ card.totalComandas === 1 ? '' : 's' }}</span>
          <strong class="comanda-total">
            Total {{ card.total | currency: 'BRL':'symbol':'1.2-2':'pt-BR' }}
          </strong>
        }
      }
    </button>
  `,
})
export class ComandaCardComponent {
  @Input({ required: true }) card!: MapaMesaCard;
  @Output() selected = new EventEmitter<MapaMesaCard>();

  protected get displayNumber(): string {
    return String(this.card.mesa.numero).padStart(2, '0');
  }

  protected get statusLabel(): string {
    const labels = {
      livre: 'LIVRE',
      ocupada: 'OCUPADA',
      reservada: 'RESERVADA',
      inativa: 'INATIVA',
    };

    return labels[this.card.status];
  }

  protected get ariaLabel(): string {
    const comandas = this.card.totalComandas ? `, ${this.card.totalComandas} comanda${this.card.totalComandas === 1 ? '' : 's'} no ciclo atual` : '';
    const liberacao = this.card.mesaLiberacaoPendente ? ', todas pagas e aguardando liberação' : '';
    return `Mesa ${this.displayNumber} ${this.statusLabel.toLowerCase()}${comandas}${liberacao}`;
  }
}
