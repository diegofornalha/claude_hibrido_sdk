import { inject } from '@angular/core';
import { CanActivateFn, CanMatchFn, Router, ActivatedRouteSnapshot, Route, UrlSegment } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * CanMatch que verifica se o primeiro segmento é um número (userId válido)
 * Isso evita que rotas como /dashboard sejam capturadas pela rota :userId
 */
export const userRouteMatch: CanMatchFn = (route: Route, segments: UrlSegment[]) => {
  if (segments.length === 0) return false;

  const firstSegment = segments[0].path;
  const isNumeric = /^\d+$/.test(firstSegment);

  return isNumeric;
};

/**
 * Guard que valida se o userId na URL corresponde ao usuário logado.
 * Redireciona para a URL correta se não corresponder.
 *
 * Exemplo: Se user 3 tentar acessar /2/chat, redireciona para /3/chat
 */
export const userRouteGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const urlUserId = Number(route.paramMap.get('userId'));
  const currentUser = authService.user();

  if (!currentUser) {
    // Não logado - redireciona para login
    router.navigate(['/login']);
    return false;
  }

  const loggedUserId = currentUser.user_id;

  if (urlUserId !== loggedUserId) {
    // userId na URL não corresponde ao usuário logado
    // Construir a URL correta mantendo os children paths
    const childPath = route.firstChild?.url?.map(s => s.path).join('/') || 'dashboard';
    const fullPath = `/${loggedUserId}/${childPath}`;

    router.navigateByUrl(fullPath);
    return false;
  }

  return true;
};

/**
 * Guard que redireciona rotas antigas (sem userId) para as novas (com userId)
 * Exemplo: /chat -> /2/chat (se user 2 está logado)
 */
export const redirectToUserRoute: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const currentUser = authService.user();

  if (!currentUser) {
    router.navigate(['/login']);
    return false;
  }

  // Pegar o path atual e adicionar o userId
  const currentPath = route.url.map(s => s.path).join('/');
  const newPath = `/${currentUser.user_id}/${currentPath}`;

  router.navigateByUrl(newPath);
  return false;
};
