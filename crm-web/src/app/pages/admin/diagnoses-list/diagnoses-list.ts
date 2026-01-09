import { Component, inject, signal, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink, Router } from '@angular/router';
import { CommonModule, DatePipe } from '@angular/common';
import { AdminService, DiagnosisSummary } from '../../../core/services/admin.service';
import { SkeletonComponent } from '../../../core/components/skeleton.component';

@Component({
  selector: 'app-diagnoses-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterLink, DatePipe, SkeletonComponent],
  template: `
    <div class="min-h-screen bg-gray-50 p-6">
      <div class="max-w-7xl mx-auto">
        <!-- Header -->
        <div class="bg-gradient-to-r from-purple-600 to-purple-700 rounded-2xl shadow-lg p-8 mb-6 text-white">
          <div class="flex items-center justify-between">
            <div>
              <h1 class="text-3xl font-bold mb-2">Diagnósticos</h1>
              <p class="text-purple-100">Todos os diagnósticos realizados na plataforma</p>
            </div>
            <a
              routerLink="/admin/dashboard"
              class="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition flex items-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clip-rule="evenodd"/>
              </svg>
              <span>Voltar</span>
            </a>
          </div>
        </div>

        @if (error()) {
          <div class="bg-white rounded-2xl shadow-lg p-8">
            <div class="bg-red-50 text-red-600 p-4 rounded-lg">{{ error() }}</div>
          </div>
        }

        @defer {
          <!-- Stats Summary -->
          <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div class="bg-white rounded-xl shadow p-4">
              <div class="text-gray-500 text-sm">Total</div>
              <div class="text-2xl font-bold text-purple-600">{{ diagnoses().length }}</div>
            </div>
            <div class="bg-white rounded-xl shadow p-4">
              <div class="text-gray-500 text-sm">Score Médio</div>
              <div class="text-2xl font-bold text-blue-600">{{ averageScore() | number:'1.0-0' }}%</div>
            </div>
            <div class="bg-white rounded-xl shadow p-4">
              <div class="text-gray-500 text-sm">Iniciantes</div>
              <div class="text-2xl font-bold text-orange-600">{{ countByProfile('iniciante') }}</div>
            </div>
            <div class="bg-white rounded-xl shadow p-4">
              <div class="text-gray-500 text-sm">Avançados</div>
              <div class="text-2xl font-bold text-green-600">{{ countByProfile('avancado') }}</div>
            </div>
          </div>

          <!-- Diagnoses Table -->
          <div class="bg-white rounded-2xl shadow-lg overflow-hidden">
            @if (diagnoses().length === 0) {
              <div class="p-12 text-center text-gray-500">
                <div class="text-5xl mb-4">📊</div>
                <p class="text-lg">Nenhum diagnóstico encontrado</p>
                <p class="text-sm mt-2">Os diagnósticos aparecerão aqui quando os mentorados completarem a avaliação com a Nanda.</p>
              </div>
            } @else {
              <table class="min-w-full divide-y divide-gray-200">
                <thead class="bg-gray-50">
                  <tr>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mentorado</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mentor</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Score</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Perfil</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                  </tr>
                </thead>
                <tbody class="bg-white divide-y divide-gray-200">
                  @for (diagnosis of diagnoses(); track diagnosis.assessment_id) {
                    <tr class="hover:bg-gray-50">
                      <td class="px-6 py-4 whitespace-nowrap">
                        <div class="font-medium text-gray-900">{{ diagnosis.client_name }}</div>
                        <div class="text-sm text-gray-500">{{ diagnosis.client_email }}</div>
                      </td>
                      <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {{ diagnosis.mentor_name || '—' }}
                      </td>
                      <td class="px-6 py-4 whitespace-nowrap">
                        <div class="flex items-center">
                          <div class="w-16 bg-gray-200 rounded-full h-2 mr-2">
                            <div
                              class="h-2 rounded-full"
                              [class]="getScoreColor(diagnosis.overall_score)"
                              [style.width.%]="diagnosis.overall_score"
                            ></div>
                          </div>
                          <span class="text-sm font-medium text-gray-900">{{ diagnosis.overall_score | number:'1.0-0' }}%</span>
                        </div>
                      </td>
                      <td class="px-6 py-4 whitespace-nowrap">
                        <span
                          class="px-2 py-1 text-xs font-medium rounded-full"
                          [class]="getProfileBadge(diagnosis.profile_type)"
                        >
                          {{ getProfileLabel(diagnosis.profile_type) }}
                        </span>
                      </td>
                      <td class="px-6 py-4 whitespace-nowrap">
                        <span
                          class="px-2 py-1 text-xs font-medium rounded-full"
                          [class]="getStatusBadge(diagnosis.status)"
                        >
                          {{ getStatusLabel(diagnosis.status) }}
                        </span>
                      </td>
                      <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {{ diagnosis.completed_at | date:'dd/MM/yyyy HH:mm' }}
                      </td>
                      <td class="px-6 py-4 whitespace-nowrap text-sm">
                        <a
                          [routerLink]="['/diagnosis/result', diagnosis.assessment_id]"
                          class="text-purple-600 hover:text-purple-800 font-medium"
                        >
                          Ver Detalhes
                        </a>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            }
          </div>
        } @placeholder {
          <!-- Stats Summary Skeleton -->
          <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <app-skeleton variant="stats" />
            <app-skeleton variant="stats" />
            <app-skeleton variant="stats" />
            <app-skeleton variant="stats" />
          </div>

          <!-- Table Skeleton -->
          <div class="bg-white rounded-2xl shadow-lg p-8">
            <app-skeleton variant="card" class="h-96" />
          </div>
        }
      </div>
    </div>
  `
})
export class DiagnosesList implements OnInit {
  private readonly adminService = inject(AdminService);
  private readonly router = inject(Router);

  readonly error = signal<string | null>(null);
  readonly diagnoses = signal<DiagnosisSummary[]>([]);

  ngOnInit(): void {
    this.loadDiagnoses();
  }

  private loadDiagnoses(): void {
    this.error.set(null);

    this.adminService.listAllDiagnoses().subscribe({
      next: (data) => {
        this.diagnoses.set(data);
      },
      error: () => {
        this.error.set('Erro ao carregar diagnósticos');
      }
    });
  }

  averageScore(): number {
    const list = this.diagnoses();
    if (list.length === 0) return 0;
    const sum = list.reduce((acc, d) => acc + (d.overall_score || 0), 0);
    return sum / list.length;
  }

  countByProfile(profile: string): number {
    return this.diagnoses().filter(d => d.profile_type === profile).length;
  }

  getScoreColor(score: number): string {
    if (score >= 75) return 'bg-green-500';
    if (score >= 50) return 'bg-yellow-500';
    return 'bg-red-500';
  }

  getProfileBadge(profile: string): string {
    switch (profile) {
      case 'avancado': return 'bg-green-100 text-green-800';
      case 'intermediario': return 'bg-blue-100 text-blue-800';
      default: return 'bg-orange-100 text-orange-800';
    }
  }

  getProfileLabel(profile: string): string {
    switch (profile) {
      case 'avancado': return 'Avançado';
      case 'intermediario': return 'Intermediário';
      default: return 'Iniciante';
    }
  }

  getStatusBadge(status: string): string {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'reviewed': return 'bg-blue-100 text-blue-800';
      default: return 'bg-yellow-100 text-yellow-800';
    }
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'completed': return 'Concluído';
      case 'reviewed': return 'Revisado';
      default: return 'Em Progresso';
    }
  }
}
