import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/guards/auth.guard';
import { roleGuard, redirectByRoleGuard } from './core/guards/role.guard';
import { userRouteGuard, userRouteMatch, redirectToUserRoute } from './core/guards/user-route.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full'
  },
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login').then(m => m.Login),
    canActivate: [redirectByRoleGuard]
  },
  {
    path: 'register',
    loadComponent: () => import('./pages/register/register').then(m => m.Register),
    canActivate: [redirectByRoleGuard]
  },

  // =============================================================================
  // USER ROUTES (com userId na URL: /:userId/...)
  // =============================================================================
  {
    path: ':userId',
    canMatch: [userRouteMatch],
    canActivate: [userRouteGuard],
    children: [
      {
        path: 'dashboard',
        loadComponent: () => import('./pages/dashboard/dashboard').then(m => m.Dashboard),
        canActivate: [roleGuard(['mentorado'])]
      },
      {
        path: 'profile',
        loadComponent: () => import('./pages/profile/profile').then(m => m.Profile)
      },
      {
        path: 'chat',
        loadComponent: () => import('./pages/chat/chat').then(m => m.Chat),
        canActivate: [roleGuard(['mentorado', 'mentor', 'admin'])]
      },
      {
        path: 'chat/:sessionId',
        loadComponent: () => import('./pages/chat/chat').then(m => m.Chat),
        canActivate: [roleGuard(['mentorado', 'mentor', 'admin'])]
      },
      {
        path: 'CRM',
        loadComponent: () => import('./pages/CRM/CRM').then(m => m.CRM),
        canActivate: [roleGuard(['mentorado', 'mentor', 'admin'])]
      },
      {
        path: 'CRM/recents',
        loadComponent: () => import('./pages/CRM/CRM-recents').then(m => m.CRMRecents),
        canActivate: [roleGuard(['mentorado', 'mentor', 'admin'])]
      },
      {
        path: 'CRM/:sessionId',
        loadComponent: () => import('./pages/CRM/CRM').then(m => m.CRM),
        canActivate: [roleGuard(['mentorado', 'mentor', 'admin'])]
      },
      {
        path: 'llm-config',
        loadComponent: () => import('./pages/admin/llm-config/llm-config').then(m => m.LLMConfigComponent)
      },
      {
        path: 'diagnosis',
        children: [
          {
            path: 'result/:id',
            loadComponent: () => import('./pages/mentorado/diagnosis-result/diagnosis-result').then(m => m.DiagnosisResult),
            canActivate: [roleGuard(['mentorado', 'mentor', 'admin'])]
          },
          {
            path: 'history',
            loadComponent: () => import('./pages/mentorado/diagnosis-history/diagnosis-history').then(m => m.DiagnosisHistory),
            canActivate: [roleGuard(['mentorado'])]
          },
          {
            path: '',
            redirectTo: '../chat',
            pathMatch: 'full'
          }
        ]
      },
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      }
    ]
  },

  // =============================================================================
  // LEGACY ROUTES (redirecionam para novas rotas com userId)
  // =============================================================================
  {
    path: 'dashboard',
    loadComponent: () => import('./pages/dashboard/dashboard').then(m => m.Dashboard),
    canActivate: [redirectToUserRoute]
  },
  {
    path: 'profile',
    loadComponent: () => import('./pages/profile/profile').then(m => m.Profile),
    canActivate: [redirectToUserRoute]
  },
  {
    path: 'chat',
    loadComponent: () => import('./pages/chat/chat').then(m => m.Chat),
    canActivate: [redirectToUserRoute]
  },
  {
    path: 'llm-config',
    loadComponent: () => import('./pages/admin/llm-config/llm-config').then(m => m.LLMConfigComponent),
    canActivate: [redirectToUserRoute]
  },

  // MENTOR ROUTES
  {
    path: 'mentor',
    children: [
      {
        path: 'dashboard',
        loadComponent: () => import('./pages/mentor/mentor-dashboard/mentor-dashboard').then(m => m.MentorDashboard),
        canActivate: [roleGuard(['mentor'])]
      },
      {
        path: 'mentorados',
        loadComponent: () => import('./pages/mentor/mentorados-list/mentorados-list').then(m => m.MentoradosList),
        canActivate: [roleGuard(['mentor'])]
      },
      {
        path: 'mentorados/:id',
        loadComponent: () => import('./pages/mentor/mentorado-detail/mentorado-detail').then(m => m.MentoradoDetail),
        canActivate: [roleGuard(['mentor'])]
      },
      {
        path: 'invite',
        loadComponent: () => import('./pages/mentor/invite-code/invite-code').then(m => m.InviteCode),
        canActivate: [roleGuard(['mentor'])]
      },
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      }
    ]
  },

  // ADMIN ROUTES
  {
    path: 'admin',
    children: [
      {
        path: 'dashboard',
        loadComponent: () => import('./pages/admin/admin-dashboard/admin-dashboard').then(m => m.AdminDashboard),
        canActivate: [roleGuard(['admin'])]
      },
      {
        path: 'mentors',
        loadComponent: () => import('./pages/admin/mentors-list/mentors-list').then(m => m.MentorsList),
        canActivate: [roleGuard(['admin'])]
      },
      {
        path: 'mentors/new',
        loadComponent: () => import('./pages/admin/mentor-create/mentor-create').then(m => m.MentorCreate),
        canActivate: [roleGuard(['admin'])]
      },
      // =============================================================
      // NIVEIS - Gestao Unificada de Usuarios por Nivel
      // =============================================================
      {
        path: 'niveis',
        loadComponent: () => import('./pages/admin/niveis/niveis').then(m => m.Niveis),
        canActivate: [roleGuard(['admin'])]
      },
      {
        path: 'niveis/:level',
        loadComponent: () => import('./pages/admin/niveis/nivel-list').then(m => m.NivelList),
        canActivate: [roleGuard(['admin'])]
      },
      {
        path: 'niveis/:level/:id',
        loadComponent: () => import('./pages/admin/niveis/nivel-detail').then(m => m.NivelDetail),
        canActivate: [roleGuard(['admin'])]
      },

      // =============================================================
      // LEGACY ROUTES - Redirecionam para /admin/niveis
      // =============================================================
      {
        path: 'mentorados',
        redirectTo: 'niveis/4',
        pathMatch: 'full'
      },
      {
        path: 'mentorados/:id',
        loadComponent: () => import('./pages/admin/mentorado-detail/mentorado-detail').then(m => m.MentoradoDetail),
        canActivate: [roleGuard(['admin'])]
      },
      {
        path: 'leads',
        redirectTo: 'niveis/5',
        pathMatch: 'full'
      },
      {
        path: 'leads/:id',
        loadComponent: () => import('./pages/admin/lead-detail/lead-detail').then(m => m.LeadDetail),
        canActivate: [roleGuard(['admin'])]
      },
      {
        path: 'chat',
        loadComponent: () => import('./pages/admin/admin-chat/admin-chat').then(m => m.AdminChat),
        canActivate: [roleGuard(['admin'])]
      },
      {
        path: 'chat/:sessionId',
        loadComponent: () => import('./pages/admin/admin-chat/admin-chat').then(m => m.AdminChat),
        canActivate: [roleGuard(['admin'])]
      },
      {
        path: 'config',
        loadComponent: () => import('./pages/admin/system-config/system-config').then(m => m.SystemConfig),
        canActivate: [roleGuard(['admin'])]
      },
      {
        path: 'llm-config',
        loadComponent: () => import('./pages/admin/llm-config/llm-config').then(m => m.LLMConfigComponent),
        canActivate: [roleGuard(['admin'])]
      },
      {
        path: 'core-tools',
        loadComponent: () => import('./pages/admin/core-tools-config/core-tools-config').then(m => m.CoreToolsConfig),
        canActivate: [roleGuard(['admin'])]
      },
      {
        path: 'crm-tools',
        loadComponent: () => import('./pages/admin/crm-tools-config/crm-tools-config').then(m => m.CrmToolsConfig),
        canActivate: [roleGuard(['admin'])]
      },
      {
        path: 'settings',
        loadComponent: () => import('./pages/admin-settings/organization/organization').then(m => m.OrganizationSettings),
        canActivate: [roleGuard(['admin'])]
      },
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      }
    ]
  },

  // LEAD - Aguardando aprovacao
  {
    path: 'aguardando-aprovacao',
    loadComponent: () => import('./pages/aguardando-aprovacao/aguardando-aprovacao').then(m => m.AguardandoAprovacao),
    canActivate: [authGuard]
  },

  // FALLBACK
  {
    path: '**',
    redirectTo: 'login'
  }
];
