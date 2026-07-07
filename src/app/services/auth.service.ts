import { Injectable, computed, inject, signal } from '@angular/core';
import {
  AuthError,
  GoogleAuthProvider,
  User,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithCustomToken,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
} from 'firebase/auth';
import { lastValueFrom } from 'rxjs';
import { ApiClientService } from '../core/api/api-client.service';
import { firebaseAuth } from '../config/firebase';
import { Colaborador, NivelAcesso, PermissaoTela, TelaSistema, telasSistema } from '../models/app-data';
import { CaixaService } from './caixa.service';
import { ColaboradoresService } from './colaboradores.service';
import { ComandasService } from './comandas.service';
import { ClientesService } from './clientes.service';
import { FiliaisService } from './filiais.service';
import { MenuOrderService } from './menu-order.service';
import { MesasService } from './mesas.service';
import { PedidosService } from './pedidos.service';
import { ProdutosService } from './produtos.service';
import { StockEntriesService } from './stock-entries.service';
import { UiSettingsService } from './ui-settings.service';

export interface AuthenticatedUser {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
  providerId: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly api = inject(ApiClientService);
  private readonly colaboradoresService = inject(ColaboradoresService);
  private readonly caixaService = inject(CaixaService);
  private readonly comandasService = inject(ComandasService);
  private readonly clientesService = inject(ClientesService);
  private readonly filiaisService = inject(FiliaisService);
  private readonly menuOrderService = inject(MenuOrderService);
  private readonly mesasService = inject(MesasService);
  private readonly pedidosService = inject(PedidosService);
  private readonly produtosService = inject(ProdutosService);
  private readonly stockEntriesService = inject(StockEntriesService);
  private readonly uiSettingsService = inject(UiSettingsService);
  private readonly auth = firebaseAuth;
  private readonly provider = new GoogleAuthProvider();
  private readonly currentFirebaseUser = signal<User | null>(this.auth.currentUser);
  private readonly currentMembership = signal<Colaborador | null>(null);
  private readonly authReady = signal(false);
  private readonly authReadyPromise: Promise<void>;
  private loadedTenantDataForUid: string | null = null;

  readonly user = computed<AuthenticatedUser | null>(() => {
    const user = this.currentFirebaseUser();

    return user ? this.mapFirebaseUser(user) : null;
  });

  readonly isAuthReady = computed(() => this.authReady());
  readonly isLoadingAuth = computed(() => !this.authReady());
  readonly isAuthenticated = computed(() => Boolean(this.currentFirebaseUser()));

  readonly currentUser = computed<Colaborador | null>(() => this.currentMembership());

  constructor() {
    this.authReadyPromise = new Promise((resolve) => {
      let resolved = false;
      const resolveOnce = () => {
        if (!resolved) {
          resolved = true;
          resolve();
        }
      };

      onAuthStateChanged(this.auth, async (user) => {
        const previousUid = this.currentFirebaseUser()?.uid;
        if (!user || previousUid !== user.uid) {
          this.clearTenantData();
        }
        this.currentFirebaseUser.set(user);

        try {
          this.currentMembership.set(user ? await this.loadApiProfile() : null);
          if (user) {
            await this.reloadTenantData();
          }
        } catch (error) {
          console.warn('Não foi possível carregar o perfil da API.', error);
          this.currentMembership.set(null);
        } finally {
          this.authReady.set(true);
          resolveOnce();
        }
      });
    });
  }

  waitUntilReady(): Promise<void> {
    return this.authReadyPromise;
  }

  async loginWithEmail(email: string, password: string): Promise<AuthenticatedUser> {
    const credential = await signInWithEmailAndPassword(this.auth, email.trim(), password);
    return this.activateAuthenticatedUser(credential.user);
  }

  async loginWithCpf(cpf: string, password: string): Promise<AuthenticatedUser> {
    const response = await lastValueFrom(this.api.post<{ customToken: string }>('/auth/manual-login', { cpf, senha: password }));
    const credential = await signInWithCustomToken(this.auth, response.customToken);
    return this.activateAuthenticatedUser(credential.user);
  }

  async registerWithEmail(name: string, email: string, password: string): Promise<AuthenticatedUser> {
    const credential = await createUserWithEmailAndPassword(this.auth, email.trim(), password);

    if (name.trim()) {
      await updateProfile(credential.user, { displayName: name.trim() });
    }

    return this.activateAuthenticatedUser(this.auth.currentUser ?? credential.user);
  }

  async loginWithGoogle(): Promise<AuthenticatedUser> {
    const credential = await signInWithPopup(this.auth, this.provider);
    return this.activateAuthenticatedUser(credential.user);
  }

  async logout(): Promise<void> {
    this.clearTenantData();
    await signOut(this.auth);
    this.currentFirebaseUser.set(null);
    this.currentMembership.set(null);
  }

  async resetPassword(email: string): Promise<void> {
    await sendPasswordResetEmail(this.auth, email.trim());
  }

  getCurrentUser(): AuthenticatedUser | null {
    return this.user();
  }

  onAuthStateChange(callback: (user: AuthenticatedUser | null) => void): () => void {
    return onAuthStateChanged(this.auth, async (user) => {
      const previousUid = this.currentFirebaseUser()?.uid;
      if (!user || previousUid !== user.uid) {
        this.clearTenantData();
      }
      this.currentFirebaseUser.set(user);

      try {
        this.currentMembership.set(user ? await this.loadApiProfile() : null);
        if (user) {
          await this.reloadTenantData();
        }
      } catch (error) {
        console.warn('Não foi possível atualizar o perfil da API.', error);
        this.currentMembership.set(null);
      }

      callback(user ? this.mapFirebaseUser(user) : null);
    });
  }

  login(email: string, password: string): Promise<AuthenticatedUser> {
    return this.loginWithEmail(email, password);
  }

  register(name: string, email: string, password: string): Promise<AuthenticatedUser> {
    return this.registerWithEmail(name, email, password);
  }

  async refreshCurrentUser(options: { reloadTenantData?: boolean } = {}): Promise<void> {
    const firebaseUser = this.currentFirebaseUser();

    if (!firebaseUser) {
      this.currentMembership.set(null);
      return;
    }

    try {
      this.currentMembership.set(await this.loadApiProfile());
      if (options.reloadTenantData) {
        await this.reloadTenantData();
      }
    } catch (error) {
      console.warn('Não foi possível recarregar o perfil da API.', error);
      this.currentMembership.set(null);
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

  getFriendlyErrorMessage(error: unknown): string {
    if (typeof error === 'object' && error !== null && 'error' in error) {
      const apiMessage = (error as { error?: { message?: string } }).error?.message;
      if (apiMessage) return apiMessage;
    }

    const code = this.isAuthError(error) ? error.code : '';

    const messages: Record<string, string> = {
      'auth/invalid-email': 'E-mail inválido.',
      'auth/missing-email': 'Informe o e-mail.',
      'auth/missing-password': 'Informe a senha.',
      'auth/invalid-credential': 'E-mail ou senha incorretos.',
      'auth/user-not-found': 'Usuário não encontrado.',
      'auth/wrong-password': 'Senha incorreta.',
      'auth/email-already-in-use': 'Este e-mail já está em uso.',
      'auth/weak-password': 'A senha deve ter pelo menos 6 caracteres.',
      'auth/popup-closed-by-user': 'Login cancelado.',
      'auth/cancelled-popup-request': 'Login cancelado.',
      'auth/popup-blocked': 'O navegador bloqueou a janela de login.',
      'auth/network-request-failed': 'Falha de conexão. Verifique sua internet e tente novamente.',
      'auth/too-many-requests': 'Muitas tentativas. Aguarde um momento e tente novamente.',
    };

    return messages[code] ?? 'Erro ao autenticar. Tente novamente.';
  }

  private mapFirebaseUser(user: User): AuthenticatedUser {
    return {
      uid: user.uid,
      displayName: user.displayName,
      email: user.email,
      photoURL: user.photoURL,
      providerId: user.providerData[0]?.providerId ?? user.providerId,
    };
  }

  private isAuthError(error: unknown): error is AuthError {
    return typeof error === 'object' && error !== null && 'code' in error;
  }

  private async activateAuthenticatedUser(user: User): Promise<AuthenticatedUser> {
    this.clearTenantData();
    const activeUser = await this.waitForFirebaseCurrentUser(user.uid);
    await activeUser.getIdToken(true);
    this.currentFirebaseUser.set(activeUser);
    this.currentMembership.set(await this.loadApiProfile());
    await this.reloadTenantData();
    return this.mapFirebaseUser(activeUser);
  }

  private async waitForFirebaseCurrentUser(uid: string): Promise<User> {
    if (this.auth.currentUser?.uid === uid) {
      return this.auth.currentUser;
    }

    return new Promise<User>((resolve, reject) => {
      const timeout = window.setTimeout(() => {
        unsubscribe();
        reject(new Error('Não foi possível confirmar a sessão Firebase atual.'));
      }, 5000);

      const unsubscribe = onAuthStateChanged(this.auth, (currentUser) => {
        if (currentUser?.uid === uid) {
          window.clearTimeout(timeout);
          unsubscribe();
          resolve(currentUser);
        }
      });
    });
  }

  private clearTenantData(): void {
    this.loadedTenantDataForUid = null;
    this.caixaService.clearData();
    this.comandasService.clearData();
    this.clientesService.clearData();
    this.colaboradoresService.clearData();
    this.filiaisService.clearData();
    this.menuOrderService.clearData();
    this.mesasService.clearData();
    this.pedidosService.clearData();
    this.produtosService.clearData();
    this.stockEntriesService.clearData();
    this.uiSettingsService.clearData();
  }

  private async reloadTenantData(): Promise<void> {
    const uid = this.currentFirebaseUser()?.uid;

    if (uid && this.loadedTenantDataForUid === uid) {
      return;
    }

    await this.filiaisService.ensureLoaded();

    await Promise.all([
      this.caixaService.ensureLoaded().catch(() => undefined),
      this.comandasService.ensureLoaded().catch(() => undefined),
      this.clientesService.ensureLoaded().catch(() => undefined),
      this.colaboradoresService.ensureLoaded().catch(() => undefined),
      this.menuOrderService.ensureLoaded().catch(() => undefined),
      this.mesasService.ensureLoaded().catch(() => undefined),
      this.pedidosService.ensureLoaded().catch(() => undefined),
      this.produtosService.ensureLoaded().catch(() => undefined),
      this.stockEntriesService.ensureLoaded().catch(() => undefined),
      this.uiSettingsService.ensureLoaded().catch(() => undefined),
    ]);

    this.loadedTenantDataForUid = uid ?? null;
  }

  private async loadApiProfile(): Promise<Colaborador | null> {
    const profile = await lastValueFrom(this.api.get<Record<string, any>>('/auth/me'));
    const nivel = (profile['role'] ?? profile['nivel'] ?? 'colaborador') as NivelAcesso;
    const permissoes = (profile['permissoes'] ?? []) as PermissaoTela[];

    return {
      id: String(profile['membershipId'] ?? profile['id'] ?? profile['uid']),
      nome: String(profile['name'] ?? profile['nome'] ?? profile['email'] ?? 'Usuário'),
      usuario: String(profile['email'] ?? profile['usuario'] ?? profile['uid']),
      senha: '',
      nivel,
      ativo: true,
      permissoes: this.colaboradoresService.normalizePermissoes(permissoes, nivel),
      criadoEm: new Date().toISOString(),
      atualizadoEm: new Date().toISOString(),
    };
  }
}
