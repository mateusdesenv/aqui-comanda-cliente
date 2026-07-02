import { Injectable, signal } from '@angular/core';
import { Mesa, MesaStatus } from '../models/app-data';
import { LocalStorageRepository } from './local-storage.repository';

export interface MesaPayload {
  numero: number;
  nome?: string;
  status: MesaStatus;
  capacidade?: number;
  observacao?: string;
}

@Injectable({ providedIn: 'root' })
export class MesasService {
  private readonly repository = new LocalStorageRepository<Mesa[]>(
    'aqui-comanda:mesas',
    this.createDefaultMesas(),
  );

  readonly mesas = signal<Mesa[]>(this.sortMesas(this.normalizeMesas(this.repository.read())));

  constructor() {
    this.persist();
  }

  getMesas(): Mesa[] {
    return this.mesas();
  }

  createMesa(payload: MesaPayload): Mesa {
    const now = new Date().toISOString();
    const mesa: Mesa = {
      ...payload,
      id: this.createId(),
      createdAt: now,
      updatedAt: now,
    };

    this.mesas.set(this.sortMesas([...this.mesas(), mesa]));
    this.persist();
    return mesa;
  }

  updateMesa(id: string, payload: MesaPayload): Mesa | null {
    const updatedAt = new Date().toISOString();
    let updatedMesa: Mesa | null = null;

    const mesas = this.mesas().map((mesa) => {
      if (mesa.id !== id) {
        return mesa;
      }

      updatedMesa = { ...mesa, ...payload, updatedAt };
      return updatedMesa;
    });

    this.mesas.set(this.sortMesas(mesas));
    this.persist();
    return updatedMesa;
  }

  deleteMesa(id: string): void {
    this.mesas.set(this.mesas().filter((mesa) => mesa.id !== id));
    this.persist();
  }

  private persist(): void {
    this.repository.write(this.mesas());
  }

  private normalizeMesas(mesas: Mesa[]): Mesa[] {
    return mesas.map((mesa) => ({
      ...mesa,
      status: mesa.status === 'inativa' || mesa.status === 'reservada' ? mesa.status : 'livre',
    }));
  }

  private sortMesas(mesas: Mesa[]): Mesa[] {
    return [...mesas].sort((a, b) => a.numero - b.numero);
  }

  private createId(): string {
    return `mesa-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  private createDefaultMesas(): Mesa[] {
    const now = new Date().toISOString();

    return [
      {
        id: 'mesa-01',
        numero: 1,
        nome: 'Mesa 01',
        status: 'livre',
        capacidade: 4,
        observacao: 'Próxima ao balcão.',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'mesa-02',
        numero: 2,
        nome: 'Mesa 02',
        status: 'livre',
        capacidade: 4,
        observacao: 'Atendimento em andamento.',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'mesa-03',
        numero: 3,
        nome: 'Área externa',
        status: 'reservada',
        capacidade: 6,
        observacao: 'Reserva para 20h.',
        createdAt: now,
        updatedAt: now,
      },
    ];
  }
}
