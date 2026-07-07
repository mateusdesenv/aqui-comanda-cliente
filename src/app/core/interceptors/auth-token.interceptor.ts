import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { from, throwError } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { firebaseAuth } from '../../config/firebase';

export class ApiAuthTokenMissingError extends Error {
  constructor() {
    super('Firebase user ainda não está disponível para chamada protegida da API.');
    this.name = 'ApiAuthTokenMissingError';
  }
}

export const authTokenInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const user = firebaseAuth.currentUser;
  const apiBaseUrl = environment.apiUrl.replace(/\/$/, '');
  const isApiRequest = req.url.startsWith(apiBaseUrl);
  const isPublicApiRequest = isApiRequest && req.url === `${apiBaseUrl}/auth/manual-login`;

  if (isApiRequest && !isPublicApiRequest && !user) {
    return throwError(() => new ApiAuthTokenMissingError());
  }

  const request$ = isApiRequest && user
    ? from(user.getIdToken()).pipe(
        switchMap((token) =>
          next(
            req.clone({
              setHeaders: {
                Authorization: `Bearer ${token}`,
              },
            }),
          ),
        ),
      )
    : next(req);

  return request$.pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse && error.status === 401 && !router.url.startsWith('/login')) {
        void router.navigateByUrl('/login');
      }

      return throwError(() => error);
    }),
  );
};
