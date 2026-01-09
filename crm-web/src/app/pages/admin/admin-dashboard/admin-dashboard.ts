import { Component, inject, signal, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AdminService, AdminStats } from '../../../core/services/admin.service';
import { AuthService } from '../../../core/services/auth.service';
import { SkeletonComponent } from '../../../core/components/skeleton.component';

@Component({
  selector: 'app-admin-dashboard',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterLink, SkeletonComponent],
  template: `
    <div class="min-h-screen bg-gray-50 p-6">
      <div class="max-w-7xl mx-auto">
        <!-- Header -->
        <div class="bg-gradient-to-r from-purple-600 to-purple-700 rounded-2xl shadow-lg p-4 md:p-8 mb-6 text-white">
          <div class="flex items-center justify-between">
            <div>
              <h1 class="text-2xl md:text-3xl font-bold">/admin</h1>
            </div>
            <div class="flex items-center gap-2">
              <a
                routerLink="/profile"
                class="px-2 py-1.5 md:px-4 md:py-2 bg-white/20 hover:bg-white/30 rounded-lg transition text-sm md:text-base"
              >
                Perfil
              </a>
              <button
                (click)="logout()"
                class="px-2 py-1.5 md:px-4 md:py-2 bg-white/20 hover:bg-white/30 rounded-lg transition text-sm md:text-base"
              >
                Sair
              </button>
            </div>
          </div>
        </div>

        @if (error()) {
          <div class="bg-white rounded-2xl shadow-lg p-8">
            <div class="bg-red-50 text-red-600 p-4 rounded-lg">{{ error() }}</div>
          </div>
        }

        @defer {
          <!-- Quick Actions -->
          <div class="bg-white rounded-2xl shadow-lg p-8">
            <h2 class="text-xl font-bold text-gray-900 mb-4">Gerenciamento</h2>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <a
                routerLink="/admin/chat"
                class="flex items-center gap-4 p-4 border-2 border-emerald-200 rounded-lg hover:border-emerald-500 hover:bg-emerald-50 transition"
              >
                <div class="text-3xl">&#128172;</div>
                <div>
                  <div class="font-semibold text-gray-900">Chat Admin</div>
                  <div class="text-sm text-gray-500">Gerencie via chat com IA</div>
                </div>
              </a>

              <a
                routerLink="/admin/niveis"
                class="flex items-center gap-4 p-4 border-2 border-purple-200 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition"
              >
                <div class="text-3xl">&#128101;</div>
                <div>
                  <div class="font-semibold text-gray-900">Niveis</div>
                  <div class="text-sm text-gray-500">Gestao de usuarios por nivel</div>
                </div>
              </a>

              <a
                routerLink="/admin/config"
                class="flex items-center gap-4 p-4 border-2 border-gray-200 rounded-lg hover:border-gray-500 hover:bg-gray-100 transition"
              >
                <div class="text-3xl">&#9881;&#65039;</div>
                <div>
                  <div class="font-semibold text-gray-900">Configuracoes</div>
                  <div class="text-sm text-gray-500">IA, Flywheel e Ferramentas</div>
                </div>
              </a>

            </div>
          </div>
        } @placeholder {
          <!-- Quick Actions Skeleton -->
          <div class="bg-white rounded-2xl shadow-lg p-8">
            <app-skeleton variant="text" class="w-48 mb-4" />
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <app-skeleton variant="card" />
              <app-skeleton variant="card" />
              <app-skeleton variant="card" />
              <app-skeleton variant="card" />
            </div>
          </div>
        }
      </div>
    </div>
  `
})
export class AdminDashboard implements OnInit {
  private readonly adminService = inject(AdminService);
  readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly error = signal<string | null>(null);
  readonly stats = signal<AdminStats | null>(null);

  ngOnInit(): void {
    this.loadStats();
  }

  private loadStats(): void {
    this.error.set(null);

    this.adminService.getGlobalStats().subscribe({
      next: (stats) => {
        this.stats.set(stats);
      },
      error: () => {
        this.error.set('Erro ao carregar estatísticas');
      }
    });
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  currentMonth(): string {
    const months = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    return months[new Date().getMonth()];
  }
}
