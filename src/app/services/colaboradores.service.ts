import { Injectable, inject, signal } from '@angular/core';
import { lastValueFrom } from 'rxjs';
import { ApiClientService } from '../core/api/api-client.service';
import { mapApiEntity, mapApiList } from '../core/api/api-mappers';
import { Colaborador, NivelAcesso, PermissaoTela, TelaSistema, telasSistema } from '../models/app-data';

export interface ColaboradorPayload {
  nome: string;
  usuario: string;
  senha?: string;
  nivel: NivelAcesso;
  ativo: boolean;
  permissoes: PermissaoTela[];
}

@Injectable({ providedIn: 'root' })
export class ColaboradoresService {
  private readonly api = inject(ApiClientService);

  readonly colaboradores = signal<Colaborador[]>([]);

  constructor() {
    void this.reload().catch(() => undefined);
  }

  getColaboradores(): Colaborador[] {
    return this.colaboradores();
  }

  getColaboradorById(id: string): Colaborador | null {
    return this.colaboradores().find((colaborador) => colaborador.id === id) ?? null;
  }

  authenticate(usuario: string, senha: string): Colaborador | null {
    const normalizedUsuario = usuario.trim().toLowerCase();

    return (
      this.colaboradores().find(
        (colaborador) =>
          colaborador.ativo &&
          colaborador.usuario.trim().toLowerCase() === normalizedUsuario &&
          colaborador.senha === senha,
      ) ?? null
    );
  }

  hasUsuario(usuario: string, ignoreId?: string): boolean {
    const normalizedUsuario = usuario.trim().toLowerCase();

    return this.colaboradores().some(
      (colaborador) =>
        colaborador.id !== ignoreId && colaborador.usuario.trim().toLowerCase() === normalizedUsuario,
    );
  }

  createColaborador(payload: ColaboradorPayload): Colaborador {
    const now = new Date().toISOString();
    const colaborador: Colaborador = {
      id: this.createId(),
      nome: payload.nome,
      usuario: payload.usuario,
      senha: payload.senha ?? '',
      nivel: payload.nivel,
      ativo: payload.ativo,
      permissoes: this.normalizePermissoes(payload.permissoes, payload.nivel),
      criadoEm: now,
      atualizadoEm: now,
    };

    this.colaboradores.set(this.sortByName([...this.colaboradores(), colaborador]));
    void lastValueFrom(this.api.post<Colaborador>('/colaboradores', this.toApiPayload(payload))).then((created) => {
      this.colaboradores.set(this.sortByName([...this.colaboradores().filter((item) => item.id !== colaborador.id), this.mapColaborador(created)]));
    });
    return colaborador;
  }

  updateColaborador(id: string, payload: ColaboradorPayload): Colaborador | null {
    let updatedColaborador: Colaborador | null = null;

    this.colaboradores.set(
      this.sortByName(
        this.colaboradores().map((colaborador) => {
          if (colaborador.id !== id) {
            return colaborador;
          }

          updatedColaborador = {
            ...colaborador,
            nome: payload.nome,
            usuario: payload.usuario,
            senha: payload.senha ? payload.senha : colaborador.senha,
            nivel: payload.nivel,
            ativo: payload.ativo,
            permissoes: this.normalizePermissoes(payload.permissoes, payload.nivel),
            atualizadoEm: new Date().toISOString(),
          };

          return updatedColaborador;
        }),
      ),
    );

    void lastValueFrom(this.api.put<Colaborador>(`/colaboradores/${id}`, this.toApiPayload(payload))).then((updated) => {
      this.colaboradores.set(this.sortByName(this.colaboradores().map((colaborador) => (colaborador.id === id ? this.mapColaborador(updated) : colaborador))));
    });
    return updatedColaborador;
  }

  toggleAtivo(id: string): Colaborador | null {
    let updatedColaborador: Colaborador | null = null;

    this.colaboradores.set(
      this.sortByName(
        this.colaboradores().map((colaborador) => {
          if (colaborador.id !== id) {
            return colaborador;
          }

          updatedColaborador = {
            ...colaborador,
            ativo: !colaborador.ativo,
            atualizadoEm: new Date().toISOString(),
          };

          return updatedColaborador;
        }),
      ),
    );

    void lastValueFrom(this.api.patch<Colaborador>(`/colaboradores/${id}/status`, { ativo: (updatedColaborador as Colaborador | null)?.ativo })).then((updated) => {
      this.colaboradores.set(this.sortByName(this.colaboradores().map((colaborador) => (colaborador.id === id ? this.mapColaborador(updated) : colaborador))));
    });
    return updatedColaborador;
  }

  deleteColaborador(id: string): void {
    this.colaboradores.set(this.colaboradores().filter((colaborador) => colaborador.id !== id));
    void lastValueFrom(this.api.delete(`/colaboradores/${id}`));
  }

  createReadOnlyPermissoes(): PermissaoTela[] {
    return telasSistema.map(({ tela }) => ({ tela, leitura: tela === 'mapa', escrita: false }));
  }

  createFullPermissoes(): PermissaoTela[] {
    return telasSistema.map(({ tela }) => ({ tela, leitura: true, escrita: true }));
  }

  normalizePermissoes(permissoes: PermissaoTela[], nivel: NivelAcesso): PermissaoTela[] {
    if (nivel === 'admin') {
      return this.createFullPermissoes();
    }

    return telasSistema.map(({ tela }) => {
      const currentPermissao = permissoes.find((permissao) => permissao.tela === tela);
      const leitura = Boolean(currentPermissao?.leitura);
      const escrita = leitura && Boolean(currentPermissao?.escrita);

      return {
        tela,
        leitura,
        escrita,
      };
    });
  }

  private normalizeColaboradores(colaboradores: Colaborador[]): Colaborador[] {
    return this.sortByName(
      colaboradores.map((colaborador) => ({
        ...mapApiEntity(colaborador),
        usuario: colaborador.usuario ?? (colaborador as Colaborador & { email?: string }).email ?? '',
        senha: colaborador.senha ?? '',
        nivel: colaborador.nivel ?? (colaborador as Colaborador & { role?: NivelAcesso }).role ?? 'colaborador',
        ativo: colaborador.ativo ?? true,
        permissoes: this.normalizePermissoes(colaborador.permissoes ?? [], colaborador.nivel ?? 'colaborador'),
        criadoEm: colaborador.criadoEm ?? new Date().toISOString(),
      })),
    );
  }

  private createId(): string {
    return `colaborador-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  private sortByName(colaboradores: Colaborador[]): Colaborador[] {
    return [...colaboradores].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  }

  async reload(): Promise<void> {
    const colaboradores = await lastValueFrom(this.api.list<Colaborador>('/colaboradores', { limit: 500 }));
    this.colaboradores.set(this.normalizeColaboradores(mapApiList(colaboradores)));
  }

  private mapColaborador(colaborador: Colaborador): Colaborador {
    return this.normalizeColaboradores([colaborador])[0];
  }

  private toApiPayload(payload: ColaboradorPayload): Record<string, unknown> {
    return {
      nome: payload.nome,
      usuario: payload.usuario,
      email: payload.usuario,
      role: payload.nivel,
      nivel: payload.nivel,
      ativo: payload.ativo,
      permissoes: this.normalizePermissoes(payload.permissoes, payload.nivel),
    };
  }
}
