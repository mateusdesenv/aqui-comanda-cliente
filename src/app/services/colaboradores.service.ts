import { Injectable, signal } from '@angular/core';
import { Colaborador, NivelAcesso, PermissaoTela, TelaSistema, telasSistema } from '../models/app-data';
import { LocalStorageRepository } from './local-storage.repository';

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
  private readonly repository = new LocalStorageRepository<Colaborador[]>(
    'aqui-comanda:colaboradores',
    [],
  );

  readonly colaboradores = signal<Colaborador[]>(this.normalizeColaboradores(this.repository.read()));

  constructor() {
    if (this.colaboradores().length === 0) {
      this.colaboradores.set([this.createDefaultAdmin()]);
    }

    this.persist();
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
    this.persist();
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

    this.persist();
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

    this.persist();
    return updatedColaborador;
  }

  deleteColaborador(id: string): void {
    this.colaboradores.set(this.colaboradores().filter((colaborador) => colaborador.id !== id));
    this.persist();
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
        ...colaborador,
        nivel: colaborador.nivel ?? 'colaborador',
        ativo: colaborador.ativo ?? true,
        permissoes: this.normalizePermissoes(colaborador.permissoes ?? [], colaborador.nivel ?? 'colaborador'),
        criadoEm: colaborador.criadoEm ?? new Date().toISOString(),
      })),
    );
  }

  private createDefaultAdmin(): Colaborador {
    const now = new Date().toISOString();

    return {
      id: 'admin-default',
      nome: 'Administrador',
      usuario: 'admin',
      senha: 'admin',
      nivel: 'admin',
      ativo: true,
      permissoes: this.createFullPermissoes(),
      criadoEm: now,
      atualizadoEm: now,
    };
  }

  private persist(): void {
    this.repository.write(this.colaboradores());
  }

  private createId(): string {
    return `colaborador-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  private sortByName(colaboradores: Colaborador[]): Colaborador[] {
    return [...colaboradores].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  }
}
