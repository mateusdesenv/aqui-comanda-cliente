import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Mesa, MesaStatus } from '../models/app-data';
import { MesaPayload, MesasService } from '../services/mesas.service';

interface MesaFormModel {
  numero: number | null;
  nome: string;
  status: MesaStatus;
  capacidade: number | null;
  observacao: string;
}

@Component({
  selector: 'app-mesas-page',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="page-stack management-page">
      <section class="page-head">
        <div>
          <h1>Mesas</h1>
          <p>Cadastre e organize as mesas do estabelecimento.</p>
        </div>
      </section>

      <section class="management-grid">
        <form class="management-form-card" (ngSubmit)="saveMesa()">
          <div class="form-card-head">
            <h2>{{ editingMesaId ? 'Editar mesa' : 'Nova mesa' }}</h2>
            @if (editingMesaId) {
              <button class="ghost-button" type="button" (click)="resetForm()">Cancelar edição</button>
            }
          </div>

          <label>
            Número da mesa
            <input
              type="number"
              name="numero"
              min="1"
              required
              [(ngModel)]="form.numero"
            />
          </label>

          <label>
            Nome ou identificação
            <input
              type="text"
              name="nome"
              placeholder="Ex.: Varanda, Mesa 04"
              [(ngModel)]="form.nome"
            />
          </label>

          <label>
            Status
            <select name="status" [(ngModel)]="form.status">
              @for (status of statusOptions; track status) {
                <option [value]="status">{{ getStatusLabel(status) }}</option>
              }
            </select>
          </label>

          <label>
            Capacidade
            <input
              type="number"
              name="capacidade"
              min="1"
              placeholder="Ex.: 4"
              [(ngModel)]="form.capacidade"
            />
          </label>

          <label>
            Observação
            <textarea
              name="observacao"
              rows="4"
              placeholder="Ex.: próxima ao balcão, reserva recorrente..."
              [(ngModel)]="form.observacao"
            ></textarea>
          </label>

          @if (errorMessage) {
            <div class="form-feedback">{{ errorMessage }}</div>
          }

          <button class="primary-action-button" type="submit">
            {{ editingMesaId ? 'Salvar alterações' : 'Cadastrar mesa' }}
          </button>
        </form>

        <section class="management-list-card">
          <div class="list-card-head">
            <div>
              <h2>Mesas cadastradas</h2>
              <span>{{ mesas.length }} mesas no sistema</span>
            </div>
          </div>

          <div class="management-table mesa-table">
            <div class="management-table-head">
              <span>Número</span>
              <span>Nome</span>
              <span>Status</span>
              <span>Capacidade</span>
              <span>Observação</span>
              <span>Ações</span>
            </div>

            @for (mesa of mesas; track mesa.id) {
              <div class="management-table-row">
                <strong>{{ mesa.numero }}</strong>
                <span>{{ mesa.nome || 'Mesa ' + mesa.numero }}</span>
                <span class="status-chip {{ mesa.status }}">{{ getStatusLabel(mesa.status) }}</span>
                <span>{{ mesa.capacidade || '-' }}</span>
                <span>{{ mesa.observacao || '-' }}</span>
                <div class="row-actions">
                  <button type="button" (click)="editMesa(mesa)">Editar</button>
                  <button class="danger" type="button" (click)="deleteMesa(mesa)">Excluir</button>
                </div>
              </div>
            } @empty {
              <div class="management-empty-state">
                <strong>Nenhuma mesa cadastrada</strong>
                <span>Use o formulário ao lado para criar a primeira mesa.</span>
              </div>
            }
          </div>
        </section>
      </section>
    </div>
  `,
})
export class MesasPageComponent {
  private readonly mesasService = inject(MesasService);

  protected readonly statusOptions: MesaStatus[] = ['livre', 'reservada', 'inativa'];
  protected mesas = this.mesasService.getMesas();
  protected editingMesaId: string | null = null;
  protected errorMessage = '';
  protected form: MesaFormModel = this.createEmptyForm();

  protected saveMesa(): void {
    this.errorMessage = '';

    if (!this.form.numero || this.form.numero < 1) {
      this.errorMessage = 'Informe um número de mesa válido.';
      return;
    }

    const numeroAlreadyExists = this.mesas.some(
      (mesa) => mesa.numero === this.form.numero && mesa.id !== this.editingMesaId,
    );

    if (numeroAlreadyExists) {
      this.errorMessage = 'Já existe uma mesa cadastrada com esse número.';
      return;
    }

    const payload: MesaPayload = {
      numero: this.form.numero,
      nome: this.form.nome.trim() || undefined,
      status: this.form.status,
      capacidade: this.form.capacidade || undefined,
      observacao: this.form.observacao.trim() || undefined,
    };

    if (this.editingMesaId) {
      this.mesasService.updateMesa(this.editingMesaId, payload);
    } else {
      this.mesasService.createMesa(payload);
    }

    this.refreshMesas();
    this.resetForm();
  }

  protected editMesa(mesa: Mesa): void {
    this.errorMessage = '';
    this.editingMesaId = mesa.id;
    this.form = {
      numero: mesa.numero,
      nome: mesa.nome ?? '',
      status: mesa.status,
      capacidade: mesa.capacidade ?? null,
      observacao: mesa.observacao ?? '',
    };
  }

  protected deleteMesa(mesa: Mesa): void {
    if (this.editingMesaId === mesa.id) {
      this.resetForm();
    }

    this.mesasService.deleteMesa(mesa.id);
    this.refreshMesas();
  }

  protected resetForm(): void {
    this.editingMesaId = null;
    this.errorMessage = '';
    this.form = this.createEmptyForm();
  }

  protected getStatusLabel(status: MesaStatus): string {
    const labels: Record<MesaStatus, string> = {
      livre: 'Livre',
      reservada: 'Reservada',
      inativa: 'Inativa',
    };

    return labels[status];
  }

  private refreshMesas(): void {
    this.mesas = this.mesasService.getMesas();
  }

  private createEmptyForm(): MesaFormModel {
    return {
      numero: null,
      nome: '',
      status: 'livre',
      capacidade: null,
      observacao: '',
    };
  }
}
