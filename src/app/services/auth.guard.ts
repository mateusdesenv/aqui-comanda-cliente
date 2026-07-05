import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { TelaSistema } from '../models/app-data';
import { AuthService } from './auth.service';
import { FiliaisService } from './filiais.service';

const SETUP_FILIAIS_PATH = '/configuracoes/filiais';

export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  authService.refreshCurrentUser();

  if (authService.isAuthenticated()) {
    return true;
  }

  return router.createUrlTree(['/login']);
};

export const permissionGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const filiaisService = inject(FiliaisService);
  const router = inject(Router);
  const tela = route.data?.['tela'] as TelaSistema | undefined;
  const isFiliaisSetupRoute = state.url.startsWith(SETUP_FILIAIS_PATH);
  const hasFilialCadastrada = filiaisService.hasFilialCadastrada();

  if (!hasFilialCadastrada && isFiliaisSetupRoute) {
    return true;
  }

  if (tela && !authService.canRead(tela)) {
    const fallbackPath = authService.getFirstAllowedPath();
    return router.createUrlTree([fallbackPath === route.routeConfig?.path ? '/login' : fallbackPath]);
  }

  if (!hasFilialCadastrada && tela !== 'configuracoes') {
    return router.createUrlTree([SETUP_FILIAIS_PATH], {
      queryParams: { setup: 'filial-obrigatoria' },
    });
  }

  return true;
};
