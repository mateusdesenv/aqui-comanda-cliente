import { Injectable, computed, inject, signal } from '@angular/core';
import {
  AuthError,
  GoogleAuthProvider,
  User,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
} from 'firebase/auth';
import { lastValueFrom } from 'rxjs';
import { ApiClientService } from '../core/api/api-client.service';
import { firebaseAuth } from '../config/firebase';
import { Colaborador, NivelAcesso, PermissaoTela, TelaSistema, telasSistema } from '../models/app-data';
import { ColaboradoresService } from './colaboradores.service';

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
  private readonly auth = firebaseAuth;
  private readonly provider = new GoogleAuthProvider();
  private readonly currentFirebaseUser = signal<User | null>(this.auth.currentUser);
  private readonly currentMembership = signal<Colaborador | null>(null);
  private readonly isAuthReady = signal(false);
  private readonly authReadyPromise: Promise<void>;

  readonly user = computed<AuthenticatedUser | null>(() => {
    const user = this.currentFirebaseUser();

    return user ? this.mapFirebaseUser(user) : null;
  });

  readonly isLoadingAuth = computed(() => !this.isAuthReady());
  readonly isAuthenticated = computed(() => Boolean(this.currentFirebaseUser()));

  readonly currentUser = computed<Colaborador | null>(() => this.currentMembership());

  constructor() {
    this.authReadyPromise = new Promise((resolve) => {
      onAuthStateChanged(this.auth, async (user) => {
        this.currentFirebaseUser.set(user);
        this.currentMembership.set(user ? await this.loadApiProfile() : null);
        this.isAuthReady.set(true);
        resolve();
      });
    });
  }

  waitUntilReady(): Promise<void> {
    return this.authReadyPromise;
  }

  async loginWithEmail(email: string, password: string): Promise<AuthenticatedUser> {
    const credential = await signInWithEmailAndPassword(this.auth, email.trim(), password);
    this.currentFirebaseUser.set(credential.user);
    this.currentMembership.set(await this.loadApiProfile());
    return this.mapFirebaseUser(credential.user);
  }

  async registerWithEmail(name: string, email: string, password: string): Promise<AuthenticatedUser> {
    const credential = await createUserWithEmailAndPassword(this.auth, email.trim(), password);

    if (name.trim()) {
      await updateProfile(credential.user, { displayName: name.trim() });
    }

    this.currentFirebaseUser.set(this.auth.currentUser ?? credential.user);
    this.currentMembership.set(await this.loadApiProfile());
    return this.mapFirebaseUser(this.auth.currentUser ?? credential.user);
  }

  async loginWithGoogle(): Promise<AuthenticatedUser> {
    const credential = await signInWithPopup(this.auth, this.provider);
    this.currentFirebaseUser.set(credential.user);
    this.currentMembership.set(await this.loadApiProfile());
    return this.mapFirebaseUser(credential.user);
  }

  async logout(): Promise<void> {
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
      this.currentFirebaseUser.set(user);
      this.currentMembership.set(user ? await this.loadApiProfile() : null);
      callback(user ? this.mapFirebaseUser(user) : null);
    });
  }

  login(email: string, password: string): Promise<AuthenticatedUser> {
    return this.loginWithEmail(email, password);
  }

  register(name: string, email: string, password: string): Promise<AuthenticatedUser> {
    return this.registerWithEmail(name, email, password);
  }

  refreshCurrentUser(): void {
    const firebaseUser = this.currentFirebaseUser();

    if (!firebaseUser) {
      this.currentMembership.set(null);
      return;
    }

    void this.loadApiProfile().then((profile) => this.currentMembership.set(profile));
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
