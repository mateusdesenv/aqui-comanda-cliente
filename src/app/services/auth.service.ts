import { Injectable, computed, inject, signal } from '@angular/core';
import { Colaborador, TelaSistema, telasSistema } from '../models/app-data';
import { ColaboradoresService } from './colaboradores.service';

const SESSION_KEY = 'aqui-comanda:sessao';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly colaboradoresService = inject(ColaboradoresService);
  private readonly currentUserId = signal<string | null>(this.readSession());

  readonly currentUser = computed<Colaborador | null>(() => {
    const id = this.currentUserId();
    return id ? this.colaboradoresService.getColaboradorById(id) : null;
  });

  readonly isAuthenticated = computed(() => Boolean(this.currentUser()));

  login(usuario: string, senha: string): boolean {
    const colaborador = this.colaboradoresService.authenticate(usuario, senha);

    if (!colaborador) {
      return false;
    }

    this.currentUserId.set(colaborador.id);
    this.writeSession(colaborador.id);
    return true;
  }

  logout(): void {
    this.currentUserId.set(null);

    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(SESSION_KEY);
    }
  }

  refreshCurrentUser(): void {
    const currentUser = this.currentUser();

    if (!currentUser || !currentUser.ativo) {
      this.logout();
    }
  }

  canRead(tela: TelaSistema): boolean {
    const user = this.currentUser();

    if (!user || !user.ativo) {
      return false;
    }

    if (user.nivel === 'admin') {
      return true;
    }

    if (tela === 'colaboradores') {
      return false;
    }

    return Boolean(user.permissoes.find((permissao) => permissao.tela === tela)?.leitura);
  }

  canWrite(tela: TelaSistema): boolean {
    const user = this.currentUser();

    if (!user || !user.ativo) {
      return false;
    }

    if (user.nivel === 'admin') {
      return true;
    }

    if (tela === 'colaboradores') {
      return false;
    }

    return Boolean(user.permissoes.find((permissao) => permissao.tela === tela)?.escrita);
  }

  getFirstAllowedPath(): string {
    const firstTela = telasSistema.find(({ tela }) => this.canRead(tela));
    return firstTela?.path ?? '/login';
  }

  private readSession(): string | null {
    if (typeof localStorage === 'undefined') {
      return null;
    }

    try {
      const storedSession = localStorage.getItem(SESSION_KEY);
      if (!storedSession) {
        return null;
      }

      return (JSON.parse(storedSession) as { colaboradorId?: string }).colaboradorId ?? null;
    } catch {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }
  }

  private writeSession(colaboradorId: string): void {
    if (typeof localStorage === 'undefined') {
      return;
    }

    localStorage.setItem(SESSION_KEY, JSON.stringify({ colaboradorId }));
  }
}
