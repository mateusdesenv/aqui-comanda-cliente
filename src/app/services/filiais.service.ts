import { Injectable, signal } from '@angular/core';
import { EnderecoFilial, Filial } from '../models/app-data';
import { LocalStorageRepository } from './local-storage.repository';

export interface FilialPayload {
  nome: string;
  descricao?: string;
  endereco: EnderecoFilial;
  colaboradoresIds: string[];
  ativa: boolean;
}

@Injectable({ providedIn: 'root' })
export class FiliaisService {
  private readonly repository = new LocalStorageRepository<Filial[]>('aqui-comanda:filiais', []);

  readonly filiais = signal<Filial[]>(this.normalizeFiliais(this.repository.read()));

  constructor() {
    this.persist();
  }

  getFiliais(): Filial[] {
    return this.filiais();
  }

  getFilialById(id: string): Filial | null {
    return this.filiais().find((filial) => filial.id === id) ?? null;
  }

  createFilial(payload: FilialPayload): Filial {
    const now = new Date().toISOString();
    const filial: Filial = {
      id: this.createId(),
      nome: payload.nome.trim(),
      descricao: payload.descricao?.trim() || undefined,
      endereco: this.normalizeEndereco(payload.endereco),
      colaboradoresIds: this.normalizeColaboradoresIds(payload.colaboradoresIds),
      ativa: payload.ativa,
      criadaEm: now,
      atualizadaEm: now,
    };

    this.filiais.set(this.sortByName([...this.filiais(), filial]));
    this.persist();
    return filial;
  }

  updateFilial(id: string, payload: FilialPayload): Filial | null {
    let updatedFilial: Filial | null = null;

    this.filiais.set(
      this.sortByName(
        this.filiais().map((filial) => {
          if (filial.id !== id) {
            return filial;
          }

          updatedFilial = {
            ...filial,
            nome: payload.nome.trim(),
            descricao: payload.descricao?.trim() || undefined,
            endereco: this.normalizeEndereco(payload.endereco),
            colaboradoresIds: this.normalizeColaboradoresIds(payload.colaboradoresIds),
            ativa: payload.ativa,
            atualizadaEm: new Date().toISOString(),
          };

          return updatedFilial;
        }),
      ),
    );

    this.persist();
    return updatedFilial;
  }

  toggleAtiva(id: string): Filial | null {
    let updatedFilial: Filial | null = null;

    this.filiais.set(
      this.sortByName(
        this.filiais().map((filial) => {
          if (filial.id !== id) {
            return filial;
          }

          updatedFilial = {
            ...filial,
            ativa: !filial.ativa,
            atualizadaEm: new Date().toISOString(),
          };

          return updatedFilial;
        }),
      ),
    );

    this.persist();
    return updatedFilial;
  }

  deleteFilial(id: string): void {
    this.filiais.set(this.filiais().filter((filial) => filial.id !== id));
    this.persist();
  }

  private normalizeFiliais(filiais: Filial[]): Filial[] {
    return this.sortByName(
      filiais.map((filial) => ({
        ...filial,
        nome: filial.nome ?? 'Filial sem nome',
        descricao: filial.descricao ?? undefined,
        endereco: this.normalizeEndereco(filial.endereco ?? ({} as EnderecoFilial)),
        colaboradoresIds: this.normalizeColaboradoresIds(filial.colaboradoresIds ?? []),
        ativa: filial.ativa ?? true,
        criadaEm: filial.criadaEm ?? new Date().toISOString(),
        atualizadaEm: filial.atualizadaEm ?? filial.criadaEm ?? new Date().toISOString(),
      })),
    );
  }

  private normalizeEndereco(endereco: EnderecoFilial): EnderecoFilial {
    return {
      rua: endereco.rua?.trim() ?? '',
      numero: endereco.numero?.trim() ?? '',
      complemento: endereco.complemento?.trim() || undefined,
      bairro: endereco.bairro?.trim() ?? '',
      cidade: endereco.cidade?.trim() ?? '',
      estado: endereco.estado?.trim().toUpperCase() ?? '',
      cep: endereco.cep?.trim() || undefined,
    };
  }

  private normalizeColaboradoresIds(colaboradoresIds: string[]): string[] {
    return Array.from(new Set((colaboradoresIds ?? []).filter(Boolean)));
  }

  private persist(): void {
    this.repository.write(this.filiais());
  }

  private createId(): string {
    return `filial-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  private sortByName(filiais: Filial[]): Filial[] {
    return [...filiais].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  }
}
