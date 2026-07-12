import { Injectable, inject, signal } from '@angular/core';
import { lastValueFrom } from 'rxjs';
import { ApiClientService } from '../core/api/api-client.service';
import { ApiBackedState } from '../core/api/api-backed-state';
import { mapApiEntity, mapApiList } from '../core/api/api-mappers';
import { EnderecoFilial, Filial } from '../models/app-data';

export interface FilialPayload {
  nome: string;
  descricao?: string;
  endereco: EnderecoFilial;
  colaboradoresIds: string[];
  ativa: boolean;
}

@Injectable({ providedIn: 'root' })
export class FiliaisService extends ApiBackedState {
  private readonly api = inject(ApiClientService);

  readonly filiais = signal<Filial[]>([]);


  reloadFromApi(): void {
    void this.reload().catch(() => undefined);
  }

  hasFilialCadastrada(): boolean {
    return this.filiais().some((filial) => filial.ativa);
  }

  hasQualquerFilial(): boolean {
    return this.filiais().length > 0;
  }

  getFiliais(): Filial[] {
    return this.filiais();
  }

  clearData(): void {
    super.clearLoadState();
    this.filiais.set([]);
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
    void lastValueFrom(this.api.post<Filial>('/filiais', payload)).then((created) => {
      this.filiais.set(this.sortByName([...this.filiais().filter((item) => item.id !== filial.id), this.mapFilial(created)]));
    }).catch(() => this.reload().catch(() => undefined));
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

    void lastValueFrom(this.api.put<Filial>(`/filiais/${id}`, payload)).then((updated) => {
      this.filiais.set(this.sortByName(this.filiais().map((filial) => (filial.id === id ? this.mapFilial(updated) : filial))));
    }).catch(() => this.reload().catch(() => undefined));
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

    void lastValueFrom(this.api.patch<Filial>(`/filiais/${id}/status`, { ativa: (updatedFilial as Filial | null)?.ativa })).then((updated) => {
      this.filiais.set(this.sortByName(this.filiais().map((filial) => (filial.id === id ? this.mapFilial(updated) : filial))));
    }).catch(() => this.reload().catch(() => undefined));
    return updatedFilial;
  }

  deleteFilial(id: string): void {
    this.filiais.set(this.filiais().filter((filial) => filial.id !== id));
    void lastValueFrom(this.api.delete(`/filiais/${id}`)).catch(() => this.reload().catch(() => undefined));
  }

  private normalizeFiliais(filiais: Filial[]): Filial[] {
    return this.sortByName(
      filiais.map((filial) => ({
        ...mapApiEntity(filial),
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

  private createId(): string {
    return `filial-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  private sortByName(filiais: Filial[]): Filial[] {
    return [...filiais].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  }

  protected override async loadFromApi(): Promise<void> {
    const filiais = await lastValueFrom(this.api.list<Filial>('/filiais', { limit: 99 }));
    this.filiais.set(this.normalizeFiliais(mapApiList(filiais)));
  }

  private mapFilial(filial: Filial): Filial {
    return this.normalizeFiliais([filial])[0];
  }
}
