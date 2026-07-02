import { Injectable, signal } from '@angular/core';
import { Cliente } from '../models/app-data';
import { LocalStorageRepository } from './local-storage.repository';

export interface ClientePayload {
  nome: string;
  cpf: string;
  dataNascimento: string;
  endereco?: string;
  cep?: string;
}

@Injectable({ providedIn: 'root' })
export class ClientesService {
  private readonly repository = new LocalStorageRepository<Cliente[]>(
    'aqui-comanda:clientes',
    [],
  );

  readonly clientes = signal<Cliente[]>(this.sortByName(this.repository.read()));

  constructor() {
    this.persist();
  }

  getClientes(): Cliente[] {
    return this.clientes();
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
    this.persist();
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
    this.persist();
    return updatedCliente;
  }

  deleteCliente(id: string): void {
    this.clientes.set(this.clientes().filter((cliente) => cliente.id !== id));
    this.persist();
  }

  private persist(): void {
    this.repository.write(this.clientes());
  }

  private sortByName(clientes: Cliente[]): Cliente[] {
    return [...clientes].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  }

  private createId(): string {
    return `cliente-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }
}
