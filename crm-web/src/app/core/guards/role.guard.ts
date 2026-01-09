import { inject } from '@angular/core';
import { Router, CanActivateFn, ActivatedRouteSnapshot } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Guard que verifica se o usuário tem o role necessário para acessar a rota.
 * Uso: canActivate: [roleGuard(['admin', 'mentor'])]
 */
export function roleGuard(allowedRoles: Array<'admin' | 'mentor' | 'mentorado' | 'lead'>): CanActivateFn {
  return (route: ActivatedRouteSnapshot) => {
    const authService = inject(AuthService);
    const router = inject(Router);

    // Primeiro verifica se está autenticado
    if (!authService.isAuthenticated()) {
      router.navigate(['/login']);
      return false;
    }

    const userRole = authService.userRole();
    const userId = authService.user()?.user_id;

    // Verifica se o role do usuário está na lista permitida
    if (userRole && allowedRoles.includes(userRole)) {
      return true;
    }

    // Se não tem permissão, redireciona para o dashboard apropriado
    router.navigate([getDashboardByRole(userRole, userId)]);
    return false;
  };
}

/**
 * Retorna o caminho do dashboard apropriado para cada role
 */
function getDashboardByRole(role: string | null, userId?: number): string {
  switch (role) {
    case 'admin':
      return '/admin/dashboard';
    case 'mentor':
      return '/mentor/dashboard';
    case 'mentorado':
      return userId ? `/${userId}/dashboard` : '/login';
    case 'lead':
      // Leads vão para uma página pública ou de aguardo
      return '/aguardando-aprovacao';
    default:
      return '/login';
  }
}

/**
 * Guard que redireciona usuários autenticados para o dashboard correto baseado no role
 */
export const redirectByRoleGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isAuthenticated()) {
    return true;
  }

  const userRole = authService.userRole();
  const userId = authService.user()?.user_id;
  router.navigate([getDashboardByRole(userRole, userId)]);
  return false;
};
