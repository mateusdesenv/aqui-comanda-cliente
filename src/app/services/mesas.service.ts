import { Injectable, inject, signal } from '@angular/core';
import { lastValueFrom } from 'rxjs';
import { ApiClientService } from '../core/api/api-client.service';
import { mapApiEntity, mapApiList } from '../core/api/api-mappers';
import { Mesa, MesaStatus } from '../models/app-data';

export interface MesaPayload {
  numero: number;
  nome?: string;
  status: MesaStatus;
  capacidade?: number;
  observacao?: string;
}

@Injectable({ providedIn: 'root' })
export class MesasService {
  private readonly api = inject(ApiClientService);

  readonly mesas = signal<Mesa[]>([]);

  constructor() {
    void this.reload().catch(() => undefined);
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
    void lastValueFrom(this.api.post<Mesa>('/mesas', payload)).then((created) => {
      this.mesas.set(this.sortMesas([...this.mesas().filter((item) => item.id !== mesa.id), this.mapMesa(created)]));
    });
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
    void lastValueFrom(this.api.put<Mesa>(`/mesas/${id}`, payload)).then((updated) => {
      this.mesas.set(this.sortMesas(this.mesas().map((mesa) => (mesa.id === id ? this.mapMesa(updated) : mesa))));
    });
    return updatedMesa;
  }

  deleteMesa(id: string): void {
    this.mesas.set(this.mesas().filter((mesa) => mesa.id !== id));
    void lastValueFrom(this.api.delete(`/mesas/${id}`));
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

  async reload(): Promise<void> {
    const mesas = await lastValueFrom(this.api.list<Mesa>('/mesas', { limit: 500 }));
    this.mesas.set(this.sortMesas(this.normalizeMesas(mapApiList(mesas).map((mesa) => this.mapMesa(mesa)))));
  }

  private mapMesa(mesa: Mesa): Mesa {
    return {
      ...mapApiEntity(mesa),
      numero: Number(mesa.numero) || 0,
      status: mesa.status ?? 'livre',
      createdAt: mesa.createdAt ?? new Date().toISOString(),
      updatedAt: mesa.updatedAt ?? mesa.createdAt ?? new Date().toISOString(),
    };
  }
}
