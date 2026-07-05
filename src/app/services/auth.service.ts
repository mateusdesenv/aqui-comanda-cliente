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
import { firebaseAuth } from '../config/firebase';
import { Colaborador, TelaSistema, telasSistema } from '../models/app-data';
import { ColaboradoresService } from './colaboradores.service';

const AUTH_PROFILE_MAP_KEY = 'aqui-comanda:firebase-colaboradores';

export interface AuthenticatedUser {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
  providerId: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly colaboradoresService = inject(ColaboradoresService);
  private readonly auth = firebaseAuth;
  private readonly provider = new GoogleAuthProvider();
  private readonly currentFirebaseUser = signal<User | null>(this.auth.currentUser);
  private readonly currentUserId = signal<string | null>(null);
  private readonly isAuthReady = signal(false);
  private readonly authReadyPromise: Promise<void>;

  readonly user = computed<AuthenticatedUser | null>(() => {
    const user = this.currentFirebaseUser();

    return user ? this.mapFirebaseUser(user) : null;
  });

  readonly isLoadingAuth = computed(() => !this.isAuthReady());
  readonly isAuthenticated = computed(() => Boolean(this.currentFirebaseUser()));

  readonly currentUser = computed<Colaborador | null>(() => {
    const id = this.currentUserId();
    return id ? this.colaboradoresService.getColaboradorById(id) : null;
  });

  constructor() {
    this.authReadyPromise = new Promise((resolve) => {
      onAuthStateChanged(this.auth, (user) => {
        this.currentFirebaseUser.set(user);
        this.currentUserId.set(user ? this.ensureColaboradorForFirebaseUser(user) : null);
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
    this.currentUserId.set(this.ensureColaboradorForFirebaseUser(credential.user));
    return this.mapFirebaseUser(credential.user);
  }

  async registerWithEmail(name: string, email: string, password: string): Promise<AuthenticatedUser> {
    const credential = await createUserWithEmailAndPassword(this.auth, email.trim(), password);

    if (name.trim()) {
      await updateProfile(credential.user, { displayName: name.trim() });
    }

    this.currentFirebaseUser.set(this.auth.currentUser ?? credential.user);
    this.currentUserId.set(this.ensureColaboradorForFirebaseUser(this.auth.currentUser ?? credential.user, name));
    return this.mapFirebaseUser(this.auth.currentUser ?? credential.user);
  }

  async loginWithGoogle(): Promise<AuthenticatedUser> {
    const credential = await signInWithPopup(this.auth, this.provider);
    this.currentFirebaseUser.set(credential.user);
    this.currentUserId.set(this.ensureColaboradorForFirebaseUser(credential.user));
    return this.mapFirebaseUser(credential.user);
  }

  async logout(): Promise<void> {
    await signOut(this.auth);
    this.currentFirebaseUser.set(null);
    this.currentUserId.set(null);
  }

  async resetPassword(email: string): Promise<void> {
    await sendPasswordResetEmail(this.auth, email.trim());
  }

  getCurrentUser(): AuthenticatedUser | null {
    return this.user();
  }

  onAuthStateChange(callback: (user: AuthenticatedUser | null) => void): () => void {
    return onAuthStateChanged(this.auth, (user) => {
      this.currentFirebaseUser.set(user);
      this.currentUserId.set(user ? this.ensureColaboradorForFirebaseUser(user) : null);
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
      this.currentUserId.set(null);
      return;
    }

    const colaboradorId = this.ensureColaboradorForFirebaseUser(firebaseUser);
    const currentUser = this.colaboradoresService.getColaboradorById(colaboradorId);

    if (!currentUser || !currentUser.ativo) {
      this.currentUserId.set(null);
      void this.logout();
      return;
    }

    this.currentUserId.set(colaboradorId);
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

  private ensureColaboradorForFirebaseUser(user: User, fallbackName?: string): string {
    const storedMap = this.readProfileMap();
    const storedId = storedMap[user.uid];

    if (storedId && this.colaboradoresService.getColaboradorById(storedId)) {
      return storedId;
    }

    const email = user.email?.trim().toLowerCase();
    const existingColaborador = this.colaboradoresService
      .getColaboradores()
      .find((colaborador) => colaborador.usuario.trim().toLowerCase() === email);

    if (existingColaborador) {
      this.writeProfileMap({ ...storedMap, [user.uid]: existingColaborador.id });
      return existingColaborador.id;
    }

    const colaborador = this.colaboradoresService.createColaborador({
      nome: fallbackName?.trim() || user.displayName || email || 'Usuário Firebase',
      usuario: email || user.uid,
      nivel: 'admin',
      ativo: true,
      permissoes: this.colaboradoresService.createFullPermissoes(),
    });

    this.writeProfileMap({ ...storedMap, [user.uid]: colaborador.id });
    return colaborador.id;
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

  private readProfileMap(): Record<string, string> {
    if (typeof localStorage === 'undefined') {
      return {};
    }

    try {
      return JSON.parse(localStorage.getItem(AUTH_PROFILE_MAP_KEY) ?? '{}') as Record<string, string>;
    } catch {
      localStorage.removeItem(AUTH_PROFILE_MAP_KEY);
      return {};
    }
  }

  private writeProfileMap(profileMap: Record<string, string>): void {
    if (typeof localStorage === 'undefined') {
      return;
    }

    localStorage.setItem(AUTH_PROFILE_MAP_KEY, JSON.stringify(profileMap));
  }
}
