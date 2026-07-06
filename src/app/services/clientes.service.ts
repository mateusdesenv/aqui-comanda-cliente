import { Injectable, inject, signal } from '@angular/core';
import { lastValueFrom } from 'rxjs';
import { ApiClientService } from '../core/api/api-client.service';
import { mapApiEntity, mapApiList } from '../core/api/api-mappers';
import { Cliente } from '../models/app-data';

export interface ClientePayload {
  nome: string;
  cpf: string;
  dataNascimento: string;
  endereco?: string;
  cep?: string;
}

@Injectable({ providedIn: 'root' })
export class ClientesService {
  private readonly api = inject(ApiClientService);

  readonly clientes = signal<Cliente[]>([]);

  constructor() {
    void this.reload().catch(() => undefined);
  }

  getClientes(): Cliente[] {
    return this.clientes();
  }

  clearData(): void {
    this.clientes.set([]);
  }

  createCliente(payload: ClientePayload): Cliente {
    const now = new Date().toISOString();
    const cliente: Cliente = {
      ...payload,
      id: this.createId(),
      createdAt: now,
      updatedAt: now,
    };

    this.clientes.set(this.sortByName([...this.clientes(), cliente]));
    void lastValueFrom(this.api.post<Cliente>('/clientes', payload)).then((created) => {
      this.clientes.set(this.sortByName([...this.clientes().filter((item) => item.id !== cliente.id), this.mapCliente(created)]));
    });
    return cliente;
  }

  updateCliente(id: string, payload: ClientePayload): Cliente | null {
    const updatedAt = new Date().toISOString();
    let updatedCliente: Cliente | null = null;

    const clientes = this.clientes().map((cliente) => {
      if (cliente.id !== id) {
        return cliente;
      }

      updatedCliente = { ...cliente, ...payload, updatedAt };
      return updatedCliente;
    });

    this.clientes.set(this.sortByName(clientes));
    void lastValueFrom(this.api.put<Cliente>(`/clientes/${id}`, payload)).then((updated) => {
      this.clientes.set(this.sortByName(this.clientes().map((cliente) => (cliente.id === id ? this.mapCliente(updated) : cliente))));
    });
    return updatedCliente;
  }

  deleteCliente(id: string): void {
    this.clientes.set(this.clientes().filter((cliente) => cliente.id !== id));
    void lastValueFrom(this.api.delete(`/clientes/${id}`));
  }

  async reload(): Promise<void> {
    const clientes = await lastValueFrom(this.api.list<Cliente>('/clientes', { limit: 500 }));
    this.clientes.set(this.sortByName(mapApiList(clientes).map((cliente) => this.mapCliente(cliente))));
  }

  private sortByName(clientes: Cliente[]): Cliente[] {
    return [...clientes].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  }

  private createId(): string {
    return `cliente-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  private mapCliente(cliente: Cliente): Cliente {
    return {
      ...mapApiEntity(cliente),
      cpf: cliente.cpf ?? (cliente as Cliente & { documento?: string }).documento ?? '',
      dataNascimento: cliente.dataNascimento ?? '',
      createdAt: cliente.createdAt ?? new Date().toISOString(),
      updatedAt: cliente.updatedAt ?? cliente.createdAt ?? new Date().toISOString(),
    };
  }
}
