import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { TelaSistema } from '../models/app-data';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  authService.refreshCurrentUser();

  if (authService.isAuthenticated()) {
    return true;
  }

  return router.createUrlTree(['/login']);
};

export const permissionGuard: CanActivateFn = (route) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const tela = route.data?.['tela'] as TelaSistema | undefined;

  if (!tela || authService.canRead(tela)) {
    return true;
  }

  const fallbackPath = authService.getFirstAllowedPath();
  return router.createUrlTree([fallbackPath === route.routeConfig?.path ? '/login' : fallbackPath]);
};
