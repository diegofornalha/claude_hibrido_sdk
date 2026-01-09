import { Component, inject, signal, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MentorService } from '../../../core/services/mentor.service';
import { SkeletonComponent } from '../../../core/components/skeleton.component';

@Component({
  selector: 'app-mentor-dashboard',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterLink, SkeletonComponent],
  template: `
    <div class="min-h-screen bg-gray-50 p-6">
      <div class="max-w-6xl mx-auto">
        <!-- Header -->
        <div class="bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl shadow-lg p-8 mb-6 text-white">
          <h1 class="text-3xl font-bold mb-2">Dashboard do Mentor</h1>
          <p class="text-blue-100">Acompanhe o progresso dos seus mentorados</p>
        </div>

        <!-- Error -->
        @if (error()) {
          <div class="bg-white rounded-2xl shadow-lg p-8">
            <div class="bg-red-50 text-red-600 p-4 rounded-lg">{{ error() }}</div>
          </div>
        }

        <!-- Stats -->
        @defer {
          <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div class="bg-white rounded-xl shadow-lg p-6">
              <div class="text-gray-500 text-sm font-medium mb-2">Total de Mentorados</div>
              <div class="text-4xl font-bold text-blue-600">{{ stats()!.total_mentorados || 0 }}</div>
            </div>

            <div class="bg-white rounded-xl shadow-lg p-6">
              <div class="text-gray-500 text-sm font-medium mb-2">Diagnósticos Completos</div>
              <div class="text-4xl font-bold text-green-600">{{ stats()!.total_assessments || 0 }}</div>
            </div>

            <div class="bg-white rounded-xl shadow-lg p-6">
              <div class="text-gray-500 text-sm font-medium mb-2">Média Geral</div>
              <div class="text-4xl font-bold text-purple-600">
                {{ stats()!.average_score ? stats()!.average_score.toFixed(1) : '—' }}
              </div>
            </div>
          </div>

          <!-- Quick Actions -->
          <div class="bg-white rounded-2xl shadow-lg p-8 mb-6">
            <h2 class="text-xl font-bold text-gray-900 mb-4">Ações Rápidas</h2>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <a
                routerLink="/mentor/mentorados"
                class="flex items-center gap-4 p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition"
              >
                <div class="text-3xl">👥</div>
                <div>
                  <div class="font-semibold text-gray-900">Ver Mentorados</div>
                  <div class="text-sm text-gray-500">Lista completa com diagnósticos</div>
                </div>
              </a>

              <a
                routerLink="/mentor/invite"
                class="flex items-center gap-4 p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition"
              >
                <div class="text-3xl">🔗</div>
                <div>
                  <div class="font-semibold text-gray-900">Código de Convite</div>
                  <div class="text-sm text-gray-500">Compartilhe com novos alunos</div>
                </div>
              </a>
            </div>
          </div>
        } @placeholder {
          <!-- Stats Skeleton -->
          <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <app-skeleton variant="stats" />
            <app-skeleton variant="stats" />
            <app-skeleton variant="stats" />
          </div>

          <!-- Quick Actions Skeleton -->
          <div class="bg-white rounded-2xl shadow-lg p-8">
            <app-skeleton variant="text" class="w-48 mb-4" />
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <app-skeleton variant="card" />
              <app-skeleton variant="card" />
            </div>
          </div>
        }
      </div>
    </div>
  `
})
export class MentorDashboard implements OnInit {
  private readonly mentorService = inject(MentorService);

  readonly error = signal<string | null>(null);
  readonly stats = signal<any>(null);

  ngOnInit(): void {
    this.loadStats();
  }

  private loadStats(): void {
    this.error.set(null);

    this.mentorService.getMyStats().subscribe({
      next: (stats) => {
        this.stats.set(stats);
      },
      error: () => {
        this.error.set('Erro ao carregar estatísticas');
      }
    });
  }
}
