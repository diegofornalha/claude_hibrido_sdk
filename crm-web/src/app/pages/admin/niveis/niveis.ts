import { Component, inject, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NivelService, LevelConfig } from '../../../core/services/nivel.service';
import { SkeletonComponent } from '../../../core/components/skeleton.component';

@Component({
  selector: 'app-niveis',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, SkeletonComponent],
  template: `
    <div class="min-h-screen bg-gray-50 p-6">
      <div class="max-w-7xl mx-auto">
        <!-- Header -->
        <div class="flex items-center justify-between mb-6">
          <div>
            <div class="flex items-center gap-2 text-sm text-gray-500 mb-2">
              <a routerLink="/admin/dashboard" class="hover:text-purple-600">Admin</a>
              <span>/</span>
              <span class="text-gray-900">Niveis</span>
            </div>
            <h1 class="text-2xl font-bold text-gray-900">Gestao de Usuarios por Nivel</h1>
            <p class="text-gray-500 mt-1">Visualize e gerencie usuarios de todos os niveis de acesso</p>
          </div>
        </div>

        @if (nivelService.loading()) {
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            @for (i of [1, 2, 3, 4, 5, 6]; track i) {
              <app-skeleton variant="card" class="h-32" />
            }
          </div>
        } @else {
          <!-- Level Cards Grid (dinamico do backend) -->
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            @for (config of nivelService.levelConfigs(); track config.level) {
              <a
                [routerLink]="['/admin/niveis', config.level]"
                class="block bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden group"
              >
                <div class="p-6">
                  <div class="flex items-start justify-between">
                    <div class="flex items-center gap-3">
                      <div [class]="'w-12 h-12 rounded-lg flex items-center justify-center ' + config.bgColor">
                        <span class="text-2xl">{{ config.icon }}</span>
                      </div>
                      <div>
                        <div class="flex items-center gap-2">
                          <span class="text-xs font-medium text-gray-400">Nivel {{ config.level }}</span>
                        </div>
                        <h3 [class]="'font-semibold ' + config.color">{{ config.label }}</h3>
                        <p class="text-xs text-gray-500 mt-0.5">{{ config.description }}</p>
                      </div>
                    </div>
                  </div>

                  <div class="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
                    <div>
                      <span class="text-2xl font-bold text-gray-900">{{ getCountForLevel(config.level) }}</span>
                      <span class="text-sm text-gray-500 ml-1">{{ getCountForLevel(config.level) === 1 ? 'usuario' : 'usuarios' }}</span>
                    </div>
                    <span class="text-gray-400 group-hover:text-gray-600 group-hover:translate-x-1 transition-all">
                      &rarr;
                    </span>
                  </div>
                </div>
              </a>
            }
          </div>

          <!-- Total Summary -->
          <div class="mt-6 bg-white rounded-xl shadow-sm p-6">
            <div class="flex items-center justify-between">
              <div>
                <h3 class="text-lg font-semibold text-gray-900">Total de Usuarios</h3>
                <p class="text-sm text-gray-500">Todos os niveis combinados</p>
              </div>
              <div class="text-right">
                <span class="text-3xl font-bold text-gray-900">{{ nivelService.totalUsers() }}</span>
                <p class="text-sm text-gray-500">usuarios ativos</p>
              </div>
            </div>
          </div>

          <!-- Quick Stats by Category -->
          <div class="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div class="bg-purple-50 rounded-xl p-4">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <span class="text-xl">👑</span>
                </div>
                <div>
                  <p class="text-sm text-purple-600">Administradores</p>
                  <p class="text-xl font-bold text-purple-700">{{ getAdminCount() }}</p>
                </div>
              </div>
            </div>

            <div class="bg-blue-50 rounded-xl p-4">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <span class="text-xl">⭐</span>
                </div>
                <div>
                  <p class="text-sm text-blue-600">Mentores</p>
                  <p class="text-xl font-bold text-blue-700">{{ getMentorCount() }}</p>
                </div>
              </div>
            </div>

            <div class="bg-emerald-50 rounded-xl p-4">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                  <span class="text-xl">👤</span>
                </div>
                <div>
                  <p class="text-sm text-emerald-600">Mentorados + Leads</p>
                  <p class="text-xl font-bold text-emerald-700">{{ getMentoradoLeadCount() }}</p>
                </div>
              </div>
            </div>
          </div>
        }
      </div>
    </div>
  `
})
export class Niveis implements OnInit {
  readonly nivelService = inject(NivelService);

  ngOnInit(): void {
    this.nivelService.getLevelCounts().subscribe();
  }

  getCountForLevel(level: number): number {
    const counts = this.nivelService.levelCounts();
    const found = counts.find(c => c.level === level);
    return found?.count || 0;
  }

  getAdminCount(): number {
    return this.getCountForLevel(0) + this.getCountForLevel(1);
  }

  getMentorCount(): number {
    return this.getCountForLevel(2) + this.getCountForLevel(3);
  }

  getMentoradoLeadCount(): number {
    // Soma todos os niveis >= 4 (mentorados, leads, e niveis extras)
    const counts = this.nivelService.levelCounts();
    return counts
      .filter(c => c.level >= 4)
      .reduce((sum, c) => sum + c.count, 0);
  }
}
