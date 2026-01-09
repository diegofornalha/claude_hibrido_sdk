import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError, from } from 'rxjs';
import { AuthService, AuthResponse } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const token = authService.getToken();

  // Injetar token (exceto no endpoint de refresh)
  if (token && !req.url.includes('/api/auth/refresh')) {
    req = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
  }

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      // Se 401 e temos refresh token, tentar renovar
      if (error.status === 401 && authService.getRefreshToken() && !req.url.includes('/api/auth/')) {
        return from(authService['http'].post<AuthResponse>(`${authService['baseUrl']}/api/auth/refresh`, {
          refresh_token: authService.getRefreshToken()
        })).pipe(
          switchMap(response => {
            // Salvar novo access token
            if (typeof window !== 'undefined') {
              localStorage.setItem('access_token', response.token);
            }
            authService['token'].set(response.token);
            authService['scheduleTokenRefresh']();

            // Retry da requisição original com novo token
            const retryReq = req.clone({
              setHeaders: { Authorization: `Bearer ${response.token}` }
            });
            return next(retryReq);
          }),
          catchError(refreshError => {
            // Se refresh falhar, fazer logout
            authService.logout();
            router.navigate(['/login']);
            return throwError(() => refreshError);
          })
        );
      }

      // Outros erros 401: fazer logout
      if (error.status === 401) {
        authService.logout();
        router.navigate(['/login']);
      }

      return throwError(() => error);
    })
  );
};
